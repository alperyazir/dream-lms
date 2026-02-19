"""
Writing Sentence Builder Service.

Epic 30 - Story 30.7: Writing Skill — Sentence Builder Format

Generates expressive/compositional sentence-building activities.
Reuses the SentenceBuilderActivity schema but with writing-focused prompts.
"""

import logging
import random
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.sentence_builder import (
    SentenceBuilderActivity,
    SentenceBuilderItem,
)
from app.services.ai_generation.context_helpers import get_metadata_context
from app.services.ai_generation.prompts.writing_prompts import (
    WRITING_SB_JSON_SCHEMA,
    WRITING_SB_SYSTEM_PROMPT,
    build_writing_sentence_builder_prompt,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError
from app.services.llm import LLMManager

logger = logging.getLogger(__name__)

_DIFFICULTY_TO_CEFR = {"easy": "A1", "medium": "A2", "hard": "B1"}


class WritingSentenceBuilderError(Exception):
    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class WritingSentenceBuilderService:
    """Service for generating writing-focused sentence builder activities."""

    def __init__(
        self,
        dcs_client: DCSAIServiceClient,
        llm_manager: LLMManager,
    ) -> None:
        self._dcs_client = dcs_client
        self._llm_manager = llm_manager

    async def generate_activity(
        self,
        book_id: int,
        module_ids: list[int],
        sentence_count: int = 10,
        difficulty: str = "medium",
        language: str | None = None,
    ) -> SentenceBuilderActivity:
        logger.info(
            f"Generating writing sentence builder: book_id={book_id}, "
            f"modules={module_ids}, difficulty={difficulty}"
        )

        # Tier 1: Use metadata-only context (topics + vocab, no full text)
        try:
            ctx = await get_metadata_context(
                self._dcs_client, book_id, module_ids
            )
        except ValueError as e:
            raise DCSAIDataNotFoundError(
                message=str(e), book_id=book_id
            ) from e

        lang = language or ctx.language

        if difficulty == "auto":
            cefr_level = ctx.difficulty_level or "A2"
            difficulty = self._cefr_to_difficulty(cefr_level)
        else:
            cefr_level = _DIFFICULTY_TO_CEFR.get(difficulty, "A2")

        user_prompt = build_writing_sentence_builder_prompt(
            sentence_count=sentence_count,
            difficulty=difficulty,
            topics=ctx.topics,
            module_title=ctx.primary_module_title,
            cefr_level=cefr_level,
            context_text=None,
        )

        try:
            response = await self._llm_manager.generate_structured(
                prompt=f"{WRITING_SB_SYSTEM_PROMPT}\n\n{user_prompt}",
                schema=WRITING_SB_JSON_SCHEMA,
            )
            raw_sentences = response.get("sentences", [])
            logger.info(f"LLM returned {len(raw_sentences)} writing sentences")
        except Exception as e:
            raise WritingSentenceBuilderError(
                message=f"Failed to generate writing sentences: {str(e)}",
                original_error=e,
            ) from e

        if not raw_sentences:
            raise WritingSentenceBuilderError("LLM returned no sentences.")

        items: list[SentenceBuilderItem] = []
        for raw in raw_sentences[:sentence_count]:
            sentence = raw.get("sentence", "").strip()
            if not sentence:
                continue

            words = sentence.split()
            shuffled = self._shuffle_words(words)

            items.append(
                SentenceBuilderItem(
                    item_id=str(uuid4()),
                    correct_sentence=sentence,
                    words=shuffled,
                    word_count=len(words),
                    audio_url=None,
                    source_module_id=module_ids[0],
                    source_page=None,
                    difficulty=difficulty,
                )
            )

        if not items:
            raise WritingSentenceBuilderError("No valid sentences could be generated.")

        return SentenceBuilderActivity(
            activity_id=str(uuid4()),
            book_id=book_id,
            module_ids=module_ids,
            sentences=items,
            difficulty=difficulty,
            include_audio=False,
            created_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _shuffle_words(words: list[str]) -> list[str]:
        shuffled = words.copy()
        for _ in range(100):
            random.shuffle(shuffled)
            if shuffled != words:
                return shuffled
        if len(shuffled) >= 2:
            shuffled[0], shuffled[1] = shuffled[1], shuffled[0]
        return shuffled

    @staticmethod
    def _cefr_to_difficulty(cefr: str) -> str:
        cefr_upper = (cefr or "").upper()
        if cefr_upper in ("A1",):
            return "easy"
        if cefr_upper in ("A2", "B1"):
            return "medium"
        return "hard"
