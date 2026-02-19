"""
Grammar Fill-in-the-Blank Generation Service.

Epic 30 - Story 30.6: Grammar Skill — Fill-in-the-Blank Format
"""

import logging
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.grammar_fill_blank import (
    GRAMMAR_TOPICS,
    GrammarFillBlankActivity,
    GrammarFillBlankItem,
    GrammarFillBlankRequest,
)
from app.services.ai_generation.context_helpers import get_metadata_context
from app.services.ai_generation.prompts.grammar_fill_blank_prompts import (
    GRAMMAR_FB_JSON_SCHEMA,
    GRAMMAR_FB_SYSTEM_PROMPT,
    build_grammar_fill_blank_prompt,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError
from app.services.llm import LLMManager

logger = logging.getLogger(__name__)

_DIFFICULTY_TO_CEFR = {"easy": "A1", "medium": "A2", "hard": "B1"}


class GrammarFillBlankError(Exception):
    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class GrammarFillBlankService:
    """Service for generating grammar fill-blank activities."""

    def __init__(
        self,
        dcs_client: DCSAIServiceClient,
        llm_manager: LLMManager,
    ) -> None:
        self._dcs_client = dcs_client
        self._llm_manager = llm_manager

    async def generate_activity(
        self, request: GrammarFillBlankRequest
    ) -> GrammarFillBlankActivity:
        logger.info(
            f"Generating grammar fill-blank: book_id={request.book_id}, "
            f"modules={request.module_ids}, mode={request.mode}"
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

        user_prompt = build_grammar_fill_blank_prompt(
            item_count=request.item_count,
            difficulty=difficulty,
            language=language,
            topics=ctx.topics,
            module_title=ctx.primary_module_title,
            cefr_level=cefr_level,
            mode=request.mode,
            include_hints=request.include_hints,
            context_text=None,
        )

        try:
            response = await self._llm_manager.generate_structured(
                prompt=f"{GRAMMAR_FB_SYSTEM_PROMPT}\n\n{user_prompt}",
                schema=GRAMMAR_FB_JSON_SCHEMA,
            )
            raw_items = response.get("items", [])
            logger.info(f"LLM returned {len(raw_items)} grammar fill-blank items")
        except Exception as e:
            raise GrammarFillBlankError(
                message=f"Failed to generate grammar fill-blank: {str(e)}",
                original_error=e,
            ) from e

        if not raw_items:
            raise GrammarFillBlankError("LLM returned no items.")

        activity_id = str(uuid4())
        items: list[GrammarFillBlankItem] = []

        for raw in raw_items[: request.item_count]:
            sentence = raw.get("sentence", "")
            correct = raw.get("correct_answer", "")
            if not sentence or not correct:
                continue

            grammar_topic = raw.get("grammar_topic", "present_simple")
            if grammar_topic not in GRAMMAR_TOPICS:
                grammar_topic = "present_simple"

            word_bank = None
            if request.mode == "word_bank":
                wb = raw.get("word_bank", [])
                if isinstance(wb, list) and len(wb) >= 2:
                    # Ensure correct answer is in word_bank
                    if correct not in wb:
                        wb = [correct] + wb[:3]
                    word_bank = wb[:4]
                else:
                    word_bank = [correct, f"not_{correct}", f"un{correct}", f"{correct}s"]

            items.append(
                GrammarFillBlankItem(
                    item_id=str(uuid4()),
                    sentence=sentence,
                    correct_answer=correct,
                    word_bank=word_bank,
                    grammar_topic=grammar_topic,
                    grammar_hint=raw.get("grammar_hint") if request.include_hints else None,
                    difficulty=raw.get("difficulty", cefr_level),
                )
            )

        if not items:
            raise GrammarFillBlankError("No valid items could be generated.")

        return GrammarFillBlankActivity(
            activity_id=activity_id,
            book_id=request.book_id,
            module_ids=request.module_ids,
            mode=request.mode,
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
