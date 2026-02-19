"""
Listening Sentence Builder Service.

Generates audio-first sentence ordering activities. Students hear a sentence
via TTS and arrange shuffled words into the correct order.

Epic 30 - Listening Skill: Sentence Builder Format
"""

import asyncio
import logging
import random
from datetime import datetime, timezone
from urllib.parse import quote
from uuid import uuid4

from app.schemas.listening_sentence_builder import (
    ListeningSentenceBuilderActivity,
    ListeningSentenceBuilderItem,
    ListeningSentenceBuilderRequest,
)
from app.services.ai_generation.context_helpers import get_metadata_context
from app.services.ai_generation.prompts.listening_sentence_builder_prompts import (
    LISTENING_SB_JSON_SCHEMA,
    LISTENING_SB_SYSTEM_PROMPT,
    build_listening_sentence_builder_prompt,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError
from app.services.llm import LLMManager
from app.services.tts.base import AudioGenerationOptions
from app.services.tts.manager import TTSManager

logger = logging.getLogger(__name__)

_DIFFICULTY_TO_CEFR = {"easy": "A1", "medium": "A2", "hard": "B1"}


class ListeningSentenceBuilderError(Exception):
    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


def _shuffle_words(sentence: str) -> list[str]:
    """Shuffle words ensuring they are not in original order."""
    words = sentence.split()
    original = words.copy()

    for _ in range(100):
        random.shuffle(words)
        if words != original:
            return words

    if len(words) >= 2:
        words[0], words[1] = words[1], words[0]

    return words


class ListeningSentenceBuilderService:
    """Service for generating listening sentence builder activities."""

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
        self, request: ListeningSentenceBuilderRequest
    ) -> ListeningSentenceBuilderActivity:
        """Generate a listening sentence builder activity."""
        logger.info(
            f"Generating listening sentence builder: book_id={request.book_id}, "
            f"modules={request.module_ids}, count={request.sentence_count}"
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
        user_prompt = build_listening_sentence_builder_prompt(
            sentence_count=request.sentence_count,
            difficulty=difficulty,
            language=language,
            topics=ctx.topics,
            module_title=ctx.primary_module_title,
            cefr_level=cefr_level,
        )

        try:
            response = await self._llm_manager.generate_structured(
                prompt=f"{LISTENING_SB_SYSTEM_PROMPT}\n\n{user_prompt}",
                schema=LISTENING_SB_JSON_SCHEMA,
            )
            raw_sentences = response.get("sentences", [])
            logger.info(f"LLM returned {len(raw_sentences)} sentences")
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise ListeningSentenceBuilderError(
                message=f"Failed to generate sentences: {str(e)}",
                original_error=e,
            ) from e

        if not raw_sentences:
            raise ListeningSentenceBuilderError("LLM returned no sentences. Please try again.")

        # 4. Build items with shuffled words
        activity_id = str(uuid4())
        items: list[ListeningSentenceBuilderItem] = []

        for raw in raw_sentences[: request.sentence_count]:
            sentence = raw.get("sentence", "").strip()
            if not sentence:
                continue

            words = _shuffle_words(sentence)

            items.append(
                ListeningSentenceBuilderItem(
                    item_id=str(uuid4()),
                    correct_sentence=sentence,
                    words=words,
                    word_count=len(words),
                    audio_url=None,
                    audio_status="pending",
                    difficulty=raw.get("difficulty", difficulty),
                )
            )

        if not items:
            raise ListeningSentenceBuilderError("No valid items could be generated.")

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

        activity = ListeningSentenceBuilderActivity(
            activity_id=activity_id,
            book_id=request.book_id,
            module_ids=request.module_ids,
            sentences=items,
            total_items=len(items),
            difficulty=difficulty,
            language=language,
            created_at=datetime.now(timezone.utc),
        )

        logger.info(f"Listening sentence builder generated: id={activity_id}, items={len(items)}")
        return activity

    async def _generate_audio(
        self, items: list[ListeningSentenceBuilderItem], language: str
    ) -> None:
        """Generate TTS for each item's correct_sentence in parallel."""

        async def _gen_single(item: ListeningSentenceBuilderItem) -> None:
            options = AudioGenerationOptions(language=language)
            for attempt in range(2):
                try:
                    await self._tts_manager.generate_audio(item.correct_sentence, options)
                    item.audio_url = (
                        f"/api/v1/ai/tts/audio"
                        f"?text={quote(item.correct_sentence, safe='')}"
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
