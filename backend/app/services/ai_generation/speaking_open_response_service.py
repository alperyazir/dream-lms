"""
Speaking Open Response Generation Service.

Generates open-ended speaking prompts for teacher-graded activities.
"""

import logging
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.speaking_open_response import (
    SpeakingOpenResponseActivity,
    SpeakingOpenResponseItem,
    SpeakingOpenResponseRequest,
)
from app.services.ai_generation.context_helpers import get_metadata_context
from app.services.ai_generation.prompts.speaking_prompts import (
    SPEAKING_OR_JSON_SCHEMA,
    SPEAKING_OR_SYSTEM_PROMPT,
    build_speaking_open_response_prompt,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError
from app.services.llm import LLMManager

logger = logging.getLogger(__name__)

_DIFFICULTY_TO_CEFR = {"easy": "A1", "medium": "A2", "hard": "B1"}

_TIME_RANGES = {
    "easy": (15, 30),
    "medium": (30, 60),
    "hard": (60, 90),
}


class SpeakingOpenResponseError(Exception):
    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class SpeakingOpenResponseService:
    """Service for generating speaking open response activities."""

    def __init__(
        self,
        dcs_client: DCSAIServiceClient,
        llm_manager: LLMManager,
    ) -> None:
        self._dcs_client = dcs_client
        self._llm_manager = llm_manager

    async def generate_activity(
        self, request: SpeakingOpenResponseRequest
    ) -> SpeakingOpenResponseActivity:
        logger.info(
            f"Generating speaking open response: book_id={request.book_id}, "
            f"modules={request.module_ids}"
        )

        try:
            ctx = await get_metadata_context(
                self._dcs_client, request.book_id, request.module_ids
            )
        except ValueError as e:
            raise DCSAIDataNotFoundError(
                message=str(e), book_id=request.book_id
            ) from e

        language = request.language or ctx.language

        if request.difficulty == "auto":
            cefr_level = ctx.difficulty_level or "A2"
            difficulty = self._cefr_to_difficulty(cefr_level)
        else:
            difficulty = request.difficulty
            cefr_level = _DIFFICULTY_TO_CEFR.get(difficulty, "A2")

        user_prompt = build_speaking_open_response_prompt(
            item_count=request.item_count,
            difficulty=difficulty,
            language=language,
            topics=ctx.topics,
            module_title=ctx.primary_module_title,
            cefr_level=cefr_level,
            context_text=None,
        )

        try:
            response = await self._llm_manager.generate_structured(
                prompt=f"{SPEAKING_OR_SYSTEM_PROMPT}\n\n{user_prompt}",
                schema=SPEAKING_OR_JSON_SCHEMA,
            )
            raw_items = response.get("items", [])
            logger.info(f"LLM returned {len(raw_items)} speaking items")
        except Exception as e:
            raise SpeakingOpenResponseError(
                message=f"Failed to generate speaking prompts: {str(e)}",
                original_error=e,
            ) from e

        if not raw_items:
            raise SpeakingOpenResponseError("LLM returned no items.")

        activity_id = str(uuid4())
        items: list[SpeakingOpenResponseItem] = []
        min_time, max_time = _TIME_RANGES.get(difficulty, (30, 60))

        for raw in raw_items[: request.item_count]:
            prompt = raw.get("prompt", "")
            context = raw.get("context", "")
            if not prompt:
                continue

            max_seconds = raw.get("max_seconds", max_time)
            # Clamp to valid range
            max_seconds = max(min_time, min(max_time, max_seconds))

            grading_rubric = raw.get("grading_rubric", [])
            if not isinstance(grading_rubric, list):
                grading_rubric = []

            items.append(
                SpeakingOpenResponseItem(
                    item_id=str(uuid4()),
                    prompt=prompt,
                    context=context,
                    max_seconds=max_seconds,
                    difficulty=raw.get("difficulty", cefr_level),
                    grading_rubric=grading_rubric,
                )
            )

        if not items:
            raise SpeakingOpenResponseError("No valid items could be generated.")

        return SpeakingOpenResponseActivity(
            activity_id=activity_id,
            book_id=request.book_id,
            module_ids=request.module_ids,
            items=items,
            total_items=len(items),
            difficulty=difficulty,
            language=language,
            requires_manual_grading=True,
            created_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _cefr_to_difficulty(cefr: str) -> str:
        cefr_upper = (cefr or "").upper()
        if cefr_upper in ("A1",):
            return "easy"
        if cefr_upper in ("A2", "B1"):
            return "medium"
        return "hard"
