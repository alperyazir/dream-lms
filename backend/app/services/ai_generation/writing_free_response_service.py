"""
Writing Free Response Generation Service.

Generates open-ended writing prompts for teacher-graded activities.
"""

import logging
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.writing_free_response import (
    WritingFreeResponseActivity,
    WritingFreeResponseItem,
    WritingFreeResponseRequest,
)
from app.services.ai_generation.context_helpers import get_metadata_context
from app.services.ai_generation.prompts.writing_prompts import (
    WRITING_FR_JSON_SCHEMA,
    WRITING_FR_SYSTEM_PROMPT,
    build_writing_free_response_prompt,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError
from app.services.llm import LLMManager

logger = logging.getLogger(__name__)

_DIFFICULTY_TO_CEFR = {"easy": "A1", "medium": "A2", "hard": "B1"}


class WritingFreeResponseError(Exception):
    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class WritingFreeResponseService:
    """Service for generating writing free response activities."""

    def __init__(
        self,
        dcs_client: DCSAIServiceClient,
        llm_manager: LLMManager,
    ) -> None:
        self._dcs_client = dcs_client
        self._llm_manager = llm_manager

    async def generate_activity(
        self, request: WritingFreeResponseRequest
    ) -> WritingFreeResponseActivity:
        logger.info(
            f"Generating writing free response: book_id={request.book_id}, "
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

        user_prompt = build_writing_free_response_prompt(
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
                prompt=f"{WRITING_FR_SYSTEM_PROMPT}\n\n{user_prompt}",
                schema=WRITING_FR_JSON_SCHEMA,
            )
            raw_items = response.get("items", [])
            logger.info(f"LLM returned {len(raw_items)} free response items")
        except Exception as e:
            raise WritingFreeResponseError(
                message=f"Failed to generate free response: {str(e)}",
                original_error=e,
            ) from e

        if not raw_items:
            raise WritingFreeResponseError("LLM returned no items.")

        activity_id = str(uuid4())
        items: list[WritingFreeResponseItem] = []

        for raw in raw_items[: request.item_count]:
            prompt = raw.get("prompt", "")
            context = raw.get("context", "")
            if not prompt:
                continue

            min_words = raw.get("min_words", 30)
            max_words = raw.get("max_words", 80)
            rubric_hints = raw.get("rubric_hints", [])
            if not isinstance(rubric_hints, list):
                rubric_hints = []

            items.append(
                WritingFreeResponseItem(
                    item_id=str(uuid4()),
                    prompt=prompt,
                    context=context,
                    min_words=min_words,
                    max_words=max_words,
                    difficulty=raw.get("difficulty", cefr_level),
                    rubric_hints=rubric_hints,
                )
            )

        if not items:
            raise WritingFreeResponseError("No valid items could be generated.")

        return WritingFreeResponseActivity(
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
