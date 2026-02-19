"""
Listening Word Builder Service.

Generates audio-first spelling activities. Students hear a word
via TTS and arrange scrambled letters to spell it.

Epic 30 - Listening Skill: Word Builder Format
"""

import asyncio
import logging
import random
from datetime import datetime, timezone
from urllib.parse import quote
from uuid import uuid4

from app.schemas.listening_word_builder import (
    ListeningWordBuilderActivity,
    ListeningWordBuilderItem,
    ListeningWordBuilderRequest,
)
from app.services.ai_generation.context_helpers import get_metadata_context
from app.services.ai_generation.prompts.listening_word_builder_prompts import (
    LISTENING_WB_JSON_SCHEMA,
    LISTENING_WB_SYSTEM_PROMPT,
    build_listening_word_builder_prompt,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError
from app.services.llm import LLMManager
from app.services.tts.base import AudioGenerationOptions
from app.services.tts.manager import TTSManager

logger = logging.getLogger(__name__)

_DIFFICULTY_TO_CEFR = {"easy": "A1", "medium": "A2", "hard": "B1"}


class ListeningWordBuilderError(Exception):
    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


def _scramble_letters(word: str) -> list[str]:
    """Scramble letters ensuring they are not in original order."""
    letters = list(word.lower())
    original = letters.copy()

    for _ in range(100):
        random.shuffle(letters)
        if letters != original:
            return letters

    if len(letters) >= 2:
        letters[0], letters[1] = letters[1], letters[0]

    return letters


class ListeningWordBuilderService:
    """Service for generating listening word builder activities."""

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
        self, request: ListeningWordBuilderRequest
    ) -> ListeningWordBuilderActivity:
        """Generate a listening word builder activity."""
        logger.info(
            f"Generating listening word builder: book_id={request.book_id}, "
            f"modules={request.module_ids}, count={request.word_count}"
        )

        # 1. Get metadata context
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
        user_prompt = build_listening_word_builder_prompt(
            word_count=request.word_count,
            difficulty=difficulty,
            language=language,
            topics=ctx.topics,
            module_title=ctx.primary_module_title,
            cefr_level=cefr_level,
        )

        try:
            response = await self._llm_manager.generate_structured(
                prompt=f"{LISTENING_WB_SYSTEM_PROMPT}\n\n{user_prompt}",
                schema=LISTENING_WB_JSON_SCHEMA,
            )
            raw_words = response.get("words", [])
            logger.info(f"LLM returned {len(raw_words)} words")
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise ListeningWordBuilderError(
                message=f"Failed to generate words: {str(e)}",
                original_error=e,
            ) from e

        if not raw_words:
            raise ListeningWordBuilderError("LLM returned no words. Please try again.")

        # 4. Build items with scrambled letters
        activity_id = str(uuid4())
        items: list[ListeningWordBuilderItem] = []

        for raw in raw_words[: request.word_count]:
            word = raw.get("word", "").strip().lower()
            definition = raw.get("definition", "").strip()
            if not word:
                continue

            letters = _scramble_letters(word)

            items.append(
                ListeningWordBuilderItem(
                    item_id=str(uuid4()),
                    correct_word=word,
                    letters=letters,
                    letter_count=len(letters),
                    definition=definition,
                    audio_url=None,
                    audio_status="pending",
                    difficulty=raw.get("difficulty", difficulty),
                )
            )

        if not items:
            raise ListeningWordBuilderError("No valid items could be generated.")

        # 5. Generate TTS audio
        if self._tts_manager:
            try:
                await self._generate_audio(items, language)
                ready = sum(1 for i in items if i.audio_status == "ready")
                logger.info(f"TTS audio generated for {ready}/{len(items)} items")
            except Exception as e:
                logger.warning(f"TTS audio generation failed (non-blocking): {e}")
        else:
            logger.info("No TTS manager -- audio will be generated on-demand")

        activity = ListeningWordBuilderActivity(
            activity_id=activity_id,
            book_id=request.book_id,
            module_ids=request.module_ids,
            words=items,
            total_items=len(items),
            difficulty=difficulty,
            language=language,
            created_at=datetime.now(timezone.utc),
        )

        logger.info(f"Listening word builder generated: id={activity_id}, items={len(items)}")
        return activity

    async def _generate_audio(
        self, items: list[ListeningWordBuilderItem], language: str
    ) -> None:
        """Generate TTS for each item's correct_word in parallel."""

        async def _gen_single(item: ListeningWordBuilderItem) -> None:
            options = AudioGenerationOptions(language=language)
            for attempt in range(2):
                try:
                    await self._tts_manager.generate_audio(item.correct_word, options)
                    item.audio_url = (
                        f"/api/v1/ai/tts/audio"
                        f"?text={quote(item.correct_word, safe='')}"
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
