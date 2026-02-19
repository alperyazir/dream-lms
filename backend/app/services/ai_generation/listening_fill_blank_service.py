"""
Listening Fill-in-the-Blank Generation Service.

Generates fill-blank activities where students hear a complete sentence
via TTS and fill in missing words from a word bank.

Epic 30 - Story 30.5: Listening Skill — Fill-in-the-Blank Format
"""

import asyncio
import logging
import random
from datetime import datetime, timezone
from urllib.parse import quote
from uuid import uuid4

from app.schemas.listening_fill_blank import (
    ListeningFillBlankActivity,
    ListeningFillBlankItem,
    ListeningFillBlankRequest,
)
from app.services.ai_generation.context_helpers import get_metadata_context
from app.services.ai_generation.prompts.listening_fill_blank_prompts import (
    LISTENING_FB_JSON_SCHEMA,
    LISTENING_FB_SYSTEM_PROMPT,
    build_listening_fill_blank_prompt,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError
from app.services.llm import LLMManager
from app.services.tts.base import AudioGenerationOptions
from app.services.tts.manager import TTSManager

logger = logging.getLogger(__name__)

_DIFFICULTY_TO_CEFR = {"easy": "A1", "medium": "A2", "hard": "B1"}


class ListeningFillBlankError(Exception):
    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class ListeningFillBlankService:
    """Service for generating listening fill-blank activities."""

    def __init__(
        self,
        dcs_client: DCSAIServiceClient,
        llm_manager: LLMManager,
        tts_manager: TTSManager | None = None,
    ) -> None:
        self._dcs_client = dcs_client
        self._llm_manager = llm_manager
        self._tts_manager = tts_manager

    async def generate_activity(
        self, request: ListeningFillBlankRequest
    ) -> ListeningFillBlankActivity:
        """Generate a listening fill-blank activity."""
        logger.info(
            f"Generating listening fill-blank: book_id={request.book_id}, "
            f"modules={request.module_ids}, count={request.item_count}"
        )

        # 1. Tier 1: Use metadata-only context (topics + vocab, no full text)
        try:
            ctx = await get_metadata_context(
                self._dcs_client, request.book_id, request.module_ids
            )
        except ValueError as e:
            raise DCSAIDataNotFoundError(
                message=str(e), book_id=request.book_id
            ) from e

        language = request.language or ctx.language

        # 2. Determine difficulty
        if request.difficulty == "auto":
            cefr_level = ctx.difficulty_level or "A2"
            difficulty = self._cefr_to_difficulty(cefr_level)
        else:
            difficulty = request.difficulty
            cefr_level = _DIFFICULTY_TO_CEFR.get(difficulty, "A2")

        # 3. LLM generation
        user_prompt = build_listening_fill_blank_prompt(
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
                prompt=f"{LISTENING_FB_SYSTEM_PROMPT}\n\n{user_prompt}",
                schema=LISTENING_FB_JSON_SCHEMA,
            )
            raw_items = response.get("items", [])
            logger.info(f"LLM returned {len(raw_items)} fill-blank items")
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise ListeningFillBlankError(
                message=f"Failed to generate fill-blank items: {str(e)}",
                original_error=e,
            ) from e

        if not raw_items:
            raise ListeningFillBlankError("LLM returned no items. Please try again.")

        # 4. Parse items and build word banks
        activity_id = str(uuid4())
        items: list[ListeningFillBlankItem] = []

        for raw in raw_items[: request.item_count]:
            full_sentence = raw.get("full_sentence", "")
            display_sentence = raw.get("display_sentence", "")
            missing_words = raw.get("missing_words", [])
            distractors = raw.get("distractors", [])

            if not full_sentence or not display_sentence or not missing_words:
                continue

            # Validate: number of blanks matches number of missing_words
            blank_count = display_sentence.count("_______")
            if blank_count != len(missing_words):
                logger.warning(
                    f"Skipping item: {blank_count} blanks but {len(missing_words)} missing_words"
                )
                continue

            # Build per-blank acceptable answers
            raw_acceptable = raw.get("acceptable_answers", [])
            acceptable_answers: list[list[str]] = []
            for i, word in enumerate(missing_words):
                if i < len(raw_acceptable) and isinstance(raw_acceptable[i], list):
                    variants = raw_acceptable[i]
                else:
                    variants = []
                # Always include the correct word itself
                if word.lower() not in [v.lower() for v in variants]:
                    variants.insert(0, word)
                acceptable_answers.append(variants)

            # Build shuffled word bank: correct words + distractors
            word_bank = list(missing_words) + list(distractors)
            random.shuffle(word_bank)

            items.append(
                ListeningFillBlankItem(
                    item_id=str(uuid4()),
                    full_sentence=full_sentence,
                    display_sentence=display_sentence,
                    missing_words=missing_words,
                    acceptable_answers=acceptable_answers,
                    word_bank=word_bank,
                    audio_url=None,
                    audio_status="pending",
                    difficulty=raw.get("difficulty", cefr_level),
                )
            )

        if not items:
            raise ListeningFillBlankError("No valid items could be generated.")

        # 5. Generate TTS audio for each item
        if self._tts_manager:
            try:
                await self._generate_audio(items, language)
                logger.info(f"TTS audio generated for {sum(1 for i in items if i.audio_status == 'ready')}/{len(items)} items")
            except Exception as e:
                logger.warning(f"TTS audio generation failed (non-blocking): {e}")
        else:
            logger.info("No TTS manager — audio will be generated on-demand")

        activity = ListeningFillBlankActivity(
            activity_id=activity_id,
            book_id=request.book_id,
            module_ids=request.module_ids,
            items=items,
            total_items=len(items),
            difficulty=difficulty,
            language=language,
            created_at=datetime.now(timezone.utc),
        )

        logger.info(f"Listening fill-blank generated: id={activity_id}, items={len(items)}")
        return activity

    async def _generate_audio(
        self, items: list[ListeningFillBlankItem], language: str
    ) -> None:
        """Generate TTS for each item's full_sentence in parallel."""

        async def _gen_single(item: ListeningFillBlankItem) -> None:
            options = AudioGenerationOptions(language=language)
            for attempt in range(2):
                try:
                    await self._tts_manager.generate_audio(item.full_sentence, options)
                    item.audio_url = (
                        f"/api/v1/ai/tts/audio"
                        f"?text={quote(item.full_sentence, safe='')}"
                        f"&lang={language}"
                    )
                    item.audio_status = "ready"
                    return
                except Exception as e:
                    if attempt >= 1:
                        logger.error(f"TTS failed for item {item.item_id}: {e}")
                        item.audio_url = None
                        item.audio_status = "failed"

        await asyncio.gather(*[_gen_single(i) for i in items], return_exceptions=True)

    @staticmethod
    def _cefr_to_difficulty(cefr: str) -> str:
        cefr_upper = (cefr or "").upper()
        if cefr_upper in ("A1",):
            return "easy"
        if cefr_upper in ("A2", "B1"):
            return "medium"
        return "hard"
