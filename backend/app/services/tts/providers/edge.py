"""
Edge TTS Provider Implementation.

Implements the TTSProvider interface using Microsoft Edge TTS (free).
Supports Turkish and English languages with neural voices.
"""

import asyncio
import base64
import logging
import time
from typing import ClassVar

import edge_tts
from pydantic import BaseModel

from app.services.tts.base import (
    AudioFormat,
    AudioGenerationOptions,
    AudioResult,
    BatchAudioItem,
    BatchAudioResult,
    TTSProvider,
    Voice,
)
from app.services.tts.exceptions import (
    TTSAudioGenerationError,
    TTSConnectionError,
    TTSUnsupportedLanguageError,
)

logger = logging.getLogger(__name__)


class WordTimestamp(BaseModel):
    """A single word with its start/end time in seconds."""

    word: str
    start: float
    end: float


class PassageAudioResult(BaseModel):
    """Result of passage-level audio generation with word timestamps."""

    audio_base64: str
    word_timestamps: list[WordTimestamp]
    duration_seconds: float
    voice_id: str
    latency_ms: int


# Curated voices for natural reading narration
READING_VOICES: list[dict[str, str]] = [
    {"id": "en-US-JennyNeural", "name": "Jenny", "gender": "female", "accent": "US"},
    {"id": "en-US-AriaNeural", "name": "Aria", "gender": "female", "accent": "US"},
    {"id": "en-US-GuyNeural", "name": "Guy", "gender": "male", "accent": "US"},
    {"id": "en-GB-SoniaNeural", "name": "Sonia", "gender": "female", "accent": "GB"},
    {"id": "en-GB-RyanNeural", "name": "Ryan", "gender": "male", "accent": "GB"},
]

DEFAULT_READING_RATE = "-10%"


class EdgeTTSProvider(TTSProvider):
    """
    Edge TTS provider implementation.

    Uses Microsoft Edge's free TTS service via the edge-tts library.
    Supports multiple languages including Turkish and English.
    """

    # Voice definitions for supported languages
    VOICES: ClassVar[dict[str, list[Voice]]] = {
        "tr-TR": [
            Voice(
                id="tr-TR-AhmetNeural",
                name="Ahmet",
                language="tr-TR",
                gender="male",
                style="neural",
            ),
            Voice(
                id="tr-TR-EmelNeural",
                name="Emel",
                language="tr-TR",
                gender="female",
                style="neural",
            ),
        ],
        "en-US": [
            Voice(
                id="en-US-JennyNeural",
                name="Jenny",
                language="en-US",
                gender="female",
                style="neural",
            ),
            Voice(
                id="en-US-GuyNeural",
                name="Guy",
                language="en-US",
                gender="male",
                style="neural",
            ),
            Voice(
                id="en-US-AriaNeural",
                name="Aria",
                language="en-US",
                gender="female",
                style="neural",
            ),
        ],
        "en-GB": [
            Voice(
                id="en-GB-SoniaNeural",
                name="Sonia",
                language="en-GB",
                gender="female",
                style="neural",
            ),
            Voice(
                id="en-GB-RyanNeural",
                name="Ryan",
                language="en-GB",
                gender="male",
                style="neural",
            ),
        ],
    }

    # Default voices per language (short code)
    DEFAULT_VOICES: ClassVar[dict[str, str]] = {
        "tr": "tr-TR-EmelNeural",
        "tr-TR": "tr-TR-EmelNeural",
        "en": "en-US-JennyNeural",
        "en-US": "en-US-JennyNeural",
        "en-GB": "en-GB-SoniaNeural",
    }

    # Map short codes to full codes
    LANGUAGE_MAP: ClassVar[dict[str, str]] = {
        "tr": "tr-TR",
        "en": "en-US",
    }

    def __init__(self) -> None:
        """Initialize the Edge TTS provider."""
        logger.info("Initialized Edge TTS provider")

    def get_name(self) -> str:
        """
        Return provider name for logging and identification.

        Returns:
            Provider name: "edge".
        """
        return "edge"

    def is_available(self) -> bool:
        """
        Check if provider is configured and available.

        Edge TTS is always available as it requires no API key.

        Returns:
            Always True for Edge TTS.
        """
        return True

    def get_supported_languages(self) -> list[str]:
        """
        Get list of supported language codes.

        Returns:
            List of supported language codes (both short and full BCP-47).
        """
        return ["en", "en-US", "en-GB", "tr", "tr-TR"]

    def supports_language(self, language: str) -> bool:
        """
        Check if a specific language is supported.

        Args:
            language: Language code to check (e.g., 'en', 'tr-TR').

        Returns:
            True if the language is supported.
        """
        return language in self.get_supported_languages()

    def get_available_voices(self, language: str) -> list[Voice]:
        """
        Get available voices for a language.

        Args:
            language: Language code (e.g., 'en', 'tr', 'en-US', 'tr-TR').

        Returns:
            List of available Voice objects for the language.
        """
        # Normalize short codes to full codes
        full_code = self.LANGUAGE_MAP.get(language, language)

        # For generic "en", return both US and GB voices
        if language == "en":
            return self.VOICES.get("en-US", []) + self.VOICES.get("en-GB", [])

        return self.VOICES.get(full_code, [])

    def _get_default_voice(self, language: str) -> str:
        """
        Get the default voice ID for a language.

        Args:
            language: Language code.

        Returns:
            Default voice ID for the language.

        Raises:
            TTSUnsupportedLanguageError: If language is not supported.
        """
        if language in self.DEFAULT_VOICES:
            return self.DEFAULT_VOICES[language]

        raise TTSUnsupportedLanguageError(
            f"Language '{language}' is not supported by Edge TTS",
            language=language,
            supported_languages=self.get_supported_languages(),
        )

    def _convert_rate(self, rate: float) -> str:
        """
        Convert rate float (0.5-2.0) to edge-tts format.

        Args:
            rate: Rate multiplier (0.5 = half speed, 2.0 = double).

        Returns:
            Edge-tts rate string (e.g., "+20%", "-50%").
        """
        # rate: 1.0 = 0%, 0.5 = -50%, 2.0 = +100%
        rate_percent = int((rate - 1.0) * 100)
        return f"{rate_percent:+d}%"

    def _convert_pitch(self, pitch: float) -> str:
        """
        Convert pitch float (0.5-2.0) to edge-tts format.

        Args:
            pitch: Pitch adjustment (0.5 = lower, 2.0 = higher).

        Returns:
            Edge-tts pitch string (e.g., "+10Hz", "-20Hz").
        """
        # pitch: 1.0 = 0Hz, 0.5 = -50Hz, 2.0 = +50Hz
        pitch_hz = int((pitch - 1.0) * 100)
        return f"{pitch_hz:+d}Hz"

    async def generate_audio(
        self,
        text: str,
        options: AudioGenerationOptions | None = None,
    ) -> AudioResult:
        """
        Generate audio from text using Edge TTS.

        Args:
            text: The text to convert to speech.
            options: Optional generation options.

        Returns:
            AudioResult with generated audio and metadata.

        Raises:
            TTSAudioGenerationError: If audio generation fails.
            TTSConnectionError: If connection to Edge TTS fails.
            TTSUnsupportedLanguageError: If language is not supported.
        """
        options = options or AudioGenerationOptions()

        # Validate language
        if not self.supports_language(options.language):
            raise TTSUnsupportedLanguageError(
                f"Language '{options.language}' is not supported",
                language=options.language,
                supported_languages=self.get_supported_languages(),
            )

        # Get voice (use provided or default)
        voice = options.voice or self._get_default_voice(options.language)

        # Convert rate and pitch
        rate_str = self._convert_rate(options.rate)
        pitch_str = self._convert_pitch(options.pitch)

        start_time = time.time()

        try:
            # Create Edge TTS communicator
            communicate = edge_tts.Communicate(
                text,
                voice,
                rate=rate_str,
                pitch=pitch_str,
            )

            # Stream audio data
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]

            latency_ms = int((time.time() - start_time) * 1000)

            if not audio_data:
                raise TTSAudioGenerationError(
                    "Edge TTS returned empty audio data",
                    details={"text": text[:50], "voice": voice},
                )

            # Estimate duration (rough: ~150 words/minute for speech)
            # More accurate would require parsing audio headers
            word_count = len(text.split())
            estimated_duration_ms = int((word_count / 150) * 60 * 1000)

            logger.debug(
                f"Generated audio: {len(audio_data)} bytes, "
                f"voice={voice}, latency={latency_ms}ms"
            )

            return AudioResult(
                audio_data=audio_data,
                format=AudioFormat.MP3,  # Edge TTS outputs MP3
                duration_ms=estimated_duration_ms,
                voice_used=voice,
                provider=self.get_name(),
                latency_ms=latency_ms,
                cached=False,
            )

        except TTSUnsupportedLanguageError:
            raise
        except TTSAudioGenerationError:
            raise
        except Exception as e:
            # Check if it's a connection error
            error_str = str(e).lower()
            if "connection" in error_str or "timeout" in error_str:
                raise TTSConnectionError(
                    f"Failed to connect to Edge TTS: {e}",
                    details={"original_error": str(e)},
                ) from e

            raise TTSAudioGenerationError(
                f"Edge TTS generation failed: {e}",
                details={"text": text[:50], "voice": voice, "error": str(e)},
            ) from e

    async def generate_audio_batch(
        self,
        items: list[BatchAudioItem],
    ) -> BatchAudioResult:
        """
        Generate audio for multiple texts concurrently.

        Args:
            items: List of text and options pairs.

        Returns:
            BatchAudioResult with all generated audio.

        Raises:
            TTSAudioGenerationError: If all items fail.
        """
        if not items:
            return BatchAudioResult(
                results=[],
                total_duration_ms=0,
                total_latency_ms=0,
                provider=self.get_name(),
                success_count=0,
                failure_count=0,
            )

        start_time = time.time()

        # Generate audio for each item concurrently
        async def generate_single(item: BatchAudioItem) -> AudioResult | None:
            try:
                return await self.generate_audio(item.text, item.options)
            except Exception as e:
                logger.warning(f"Batch item failed: {e}")
                return None

        tasks = [generate_single(item) for item in items]
        results_or_none = await asyncio.gather(*tasks)

        # Separate successes and failures
        results: list[AudioResult] = []
        success_count = 0
        failure_count = 0
        total_duration_ms = 0

        for result in results_or_none:
            if result is not None:
                results.append(result)
                success_count += 1
                total_duration_ms += result.duration_ms
            else:
                failure_count += 1

        total_latency_ms = int((time.time() - start_time) * 1000)

        logger.info(
            f"Batch generation complete: {success_count}/{len(items)} succeeded, "
            f"latency={total_latency_ms}ms"
        )

        return BatchAudioResult(
            results=results,
            total_duration_ms=total_duration_ms,
            total_latency_ms=total_latency_ms,
            provider=self.get_name(),
            success_count=success_count,
            failure_count=failure_count,
        )

    @staticmethod
    def _attach_punctuation(
        text: str, word_timestamps: list[WordTimestamp]
    ) -> list[WordTimestamp]:
        """
        Walk through the original text and re-attach trailing punctuation
        to each word timestamp. Edge TTS WordBoundary events emit bare words
        (e.g. "Hello" instead of "Hello,"), so we recover punctuation here.
        """
        pos = 0
        result: list[WordTimestamp] = []

        for wt in word_timestamps:
            # Find this word in the remaining text
            idx = text.find(wt.word, pos)
            if idx == -1:
                # Try case-insensitive search
                idx = text.lower().find(wt.word.lower(), pos)

            if idx == -1:
                result.append(wt)
                continue

            word_end = idx + len(wt.word)

            # Capture trailing punctuation characters
            trailing = ""
            while word_end < len(text) and text[word_end] in '.,;:!?\'")-]}>…':
                trailing += text[word_end]
                word_end += 1

            if trailing:
                result.append(
                    WordTimestamp(
                        word=wt.word + trailing,
                        start=wt.start,
                        end=wt.end,
                    )
                )
            else:
                result.append(wt)

            pos = word_end

        return result

    async def generate_passage_audio(
        self,
        text: str,
        voice: str = "en-US-JennyNeural",
        rate: str = DEFAULT_READING_RATE,
    ) -> PassageAudioResult:
        """
        Generate narration audio for a passage with word-level timestamps.

        Uses Edge TTS WordBoundary events to produce timing data suitable
        for synchronized word highlighting in the UI.

        Args:
            text: The passage text to narrate.
            voice: Edge TTS voice name (e.g. 'en-US-JennyNeural').
            rate: Speech rate string (e.g. '-10%', '+0%').

        Returns:
            PassageAudioResult with base64 audio and word timestamps.
        """
        start_time = time.time()

        try:
            communicate = edge_tts.Communicate(
                text,
                voice,
                rate=rate,
                boundary="WordBoundary",
            )

            audio_chunks: list[bytes] = []
            word_timestamps: list[WordTimestamp] = []

            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    # offset and duration are in 100-nanosecond ticks
                    offset_sec = chunk["offset"] / 10_000_000
                    duration_sec = chunk["duration"] / 10_000_000
                    word_timestamps.append(
                        WordTimestamp(
                            word=chunk["text"],
                            start=round(offset_sec, 3),
                            end=round(offset_sec + duration_sec, 3),
                        )
                    )

            audio_data = b"".join(audio_chunks)
            latency_ms = int((time.time() - start_time) * 1000)

            if not audio_data:
                raise TTSAudioGenerationError(
                    "Edge TTS returned empty audio data for passage",
                    details={"text": text[:50], "voice": voice},
                )

            audio_b64 = base64.b64encode(audio_data).decode("utf-8")

            # Reattach punctuation from original text to word timestamps
            word_timestamps = self._attach_punctuation(text, word_timestamps)

            duration_seconds = 0.0
            if word_timestamps:
                duration_seconds = word_timestamps[-1].end

            logger.info(
                f"Passage audio generated: {len(audio_data)} bytes, "
                f"{len(word_timestamps)} words, voice={voice}, latency={latency_ms}ms"
            )

            return PassageAudioResult(
                audio_base64=audio_b64,
                word_timestamps=word_timestamps,
                duration_seconds=round(duration_seconds, 3),
                voice_id=voice,
                latency_ms=latency_ms,
            )

        except TTSAudioGenerationError:
            raise
        except Exception as e:
            error_str = str(e).lower()
            if "connection" in error_str or "timeout" in error_str:
                raise TTSConnectionError(
                    f"Failed to connect to Edge TTS: {e}",
                    details={"original_error": str(e)},
                ) from e

            raise TTSAudioGenerationError(
                f"Edge TTS passage generation failed: {e}",
                details={"text": text[:50], "voice": voice, "error": str(e)},
            ) from e
