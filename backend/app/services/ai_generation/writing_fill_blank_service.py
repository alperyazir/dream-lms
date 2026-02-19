"""
Writing Fill-in-the-Blank Generation Service.

Epic 30 - Story 30.7: Writing Skill — Fill-Blank Format
"""

import logging
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.writing_fill_blank import (
    WritingFillBlankActivity,
    WritingFillBlankItem,
    WritingFillBlankRequest,
)
from app.services.ai_generation.context_helpers import get_metadata_context
from app.services.ai_generation.prompts.writing_prompts import (
    WRITING_FB_JSON_SCHEMA,
    WRITING_FB_SYSTEM_PROMPT,
    build_writing_fill_blank_prompt,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError
from app.services.llm import LLMManager

logger = logging.getLogger(__name__)

_DIFFICULTY_TO_CEFR = {"easy": "A1", "medium": "A2", "hard": "B1"}


class WritingFillBlankError(Exception):
    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class WritingFillBlankService:
    """Service for generating writing fill-blank activities."""

    def __init__(
        self,
        dcs_client: DCSAIServiceClient,
        llm_manager: LLMManager,
    ) -> None:
        self._dcs_client = dcs_client
        self._llm_manager = llm_manager

    async def generate_activity(
        self, request: WritingFillBlankRequest
    ) -> WritingFillBlankActivity:
        logger.info(
            f"Generating writing fill-blank: book_id={request.book_id}, "
            f"modules={request.module_ids}"
        )

        # Tier 1: Use metadata-only context (topics + vocab, no full text)
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

        user_prompt = build_writing_fill_blank_prompt(
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
                prompt=f"{WRITING_FB_SYSTEM_PROMPT}\n\n{user_prompt}",
                schema=WRITING_FB_JSON_SCHEMA,
            )
            raw_items = response.get("items", [])
            logger.info(f"LLM returned {len(raw_items)} writing fill-blank items")
        except Exception as e:
            raise WritingFillBlankError(
                message=f"Failed to generate writing fill-blank: {str(e)}",
                original_error=e,
            ) from e

        if not raw_items:
            raise WritingFillBlankError("LLM returned no items.")

        activity_id = str(uuid4())
        items: list[WritingFillBlankItem] = []

        for raw in raw_items[: request.item_count]:
            sentence = raw.get("sentence", "")
            correct = raw.get("correct_answer", "")
            context = raw.get("context", "")
            if not sentence or not correct:
                continue

            acceptable = raw.get("acceptable_answers", [])
            if not isinstance(acceptable, list) or len(acceptable) < 2:
                acceptable = [correct]
            # Ensure correct answer is in acceptable list
            if correct not in acceptable:
                acceptable = [correct] + acceptable

            items.append(
                WritingFillBlankItem(
                    item_id=str(uuid4()),
                    context=context,
                    sentence=sentence,
                    correct_answer=correct,
                    acceptable_answers=acceptable,
                    difficulty=raw.get("difficulty", cefr_level),
                )
            )

        if not items:
            raise WritingFillBlankError("No valid items could be generated.")

        return WritingFillBlankActivity(
            activity_id=activity_id,
            book_id=request.book_id,
            module_ids=request.module_ids,
            items=items,
            total_items=len(items),
            difficulty=difficulty,
            language=language,
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
