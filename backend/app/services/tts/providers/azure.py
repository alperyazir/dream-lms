"""
Azure TTS Provider Implementation.

Implements the TTSProvider interface using Azure Cognitive Services TTS.
Supports Turkish and English languages with neural voices.
Used as fallback when Edge TTS fails.
"""

import asyncio
import html
import logging
import time
from typing import ClassVar

import azure.cognitiveservices.speech as speechsdk

from app.services.tts.base import (
    AudioFormat,
    AudioGenerationOptions,
    AudioResult,
    BatchAudioItem,
    BatchAudioResult,
    TTSProvider,
    Voice,
)
from app.services.tts.config import TTSSettings
from app.services.tts.exceptions import (
    TTSAudioGenerationError,
    TTSAuthenticationError,
    TTSConnectionError,
    TTSUnsupportedLanguageError,
)

logger = logging.getLogger(__name__)


class AzureTTSProvider(TTSProvider):
    """
    Azure Cognitive Services TTS provider implementation.

    Uses Azure Cognitive Services Speech SDK for high-quality neural TTS.
    Configured for Turkey region (turkeycentral) for KVKK compliance.
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

    def __init__(self, settings: TTSSettings) -> None:
        """
        Initialize the Azure TTS provider.

        Args:
            settings: TTS settings containing Azure API key and region.
        """
        self._settings = settings
        self._api_key = settings.AZURE_TTS_KEY
        self._region = settings.AZURE_TTS_REGION
        logger.info(
            f"Initialized Azure TTS provider (region: {self._region}, "
            f"available: {self.is_available()})"
        )

    def get_name(self) -> str:
        """
        Return provider name for logging and identification.

        Returns:
            Provider name: "azure".
        """
        return "azure"

    def is_available(self) -> bool:
        """
        Check if provider is configured and available.

        Azure TTS requires an API key to be configured.

        Returns:
            True if AZURE_TTS_KEY is configured.
        """
        return bool(self._api_key)

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
            f"Language '{language}' is not supported by Azure TTS",
            language=language,
            provider=self.get_name(),
            supported_languages=self.get_supported_languages(),
        )

    def _convert_rate(self, rate: float) -> str:
        """
        Convert rate float (0.5-2.0) to SSML prosody rate format.

        Args:
            rate: Rate multiplier (0.5 = half speed, 2.0 = double).

        Returns:
            SSML rate string (e.g., "+20%", "-50%", "default").
        """
        if rate == 1.0:
            return "default"
        rate_percent = int((rate - 1.0) * 100)
        return f"{rate_percent:+d}%"

    def _convert_pitch(self, pitch: float) -> str:
        """
        Convert pitch float (0.5-2.0) to SSML prosody pitch format.

        Args:
            pitch: Pitch adjustment (0.5 = lower, 2.0 = higher).

        Returns:
            SSML pitch string (e.g., "+10%", "-20%", "default").
        """
        if pitch == 1.0:
            return "default"
        # More conservative range for pitch
        pitch_percent = int((pitch - 1.0) * 50)
        return f"{pitch_percent:+d}%"

    def _build_ssml(
        self,
        text: str,
        voice: str,
        rate: str,
        pitch: str,
    ) -> str:
        """
        Build SSML markup for speech synthesis.

        Args:
            text: Text to synthesize (will be XML-escaped).
            voice: Voice ID.
            rate: Prosody rate value.
            pitch: Prosody pitch value.

        Returns:
            Complete SSML document.
        """
        # Get language from voice ID (e.g., "en-US-JennyNeural" -> "en-US")
        lang = "-".join(voice.split("-")[:2])

        # Escape special XML characters in text
        escaped_text = html.escape(text)

        # Build prosody attributes
        prosody_attrs = []
        if rate != "default":
            prosody_attrs.append(f'rate="{rate}"')
        if pitch != "default":
            prosody_attrs.append(f'pitch="{pitch}"')

        prosody_attr_str = " ".join(prosody_attrs)

        if prosody_attrs:
            return f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{lang}">
    <voice name="{voice}">
        <prosody {prosody_attr_str}>
            {escaped_text}
        </prosody>
    </voice>
</speak>"""
        else:
            return f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{lang}">
    <voice name="{voice}">
        {escaped_text}
    </voice>
</speak>"""

    def _get_speech_config(self) -> speechsdk.SpeechConfig:
        """
        Create and configure Azure SpeechConfig.

        Returns:
            Configured SpeechConfig instance.

        Raises:
            TTSAuthenticationError: If API key is not configured.
        """
        if not self._api_key:
            raise TTSAuthenticationError(
                "Azure TTS API key is not configured",
                provider=self.get_name(),
            )

        speech_config = speechsdk.SpeechConfig(
            subscription=self._api_key,
            region=self._region,
        )

        # Set output format to MP3
        speech_config.set_speech_synthesis_output_format(
            speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
        )

        return speech_config

    async def generate_audio(
        self,
        text: str,
        options: AudioGenerationOptions | None = None,
    ) -> AudioResult:
        """
        Generate audio from text using Azure TTS.

        Args:
            text: The text to convert to speech.
            options: Optional generation options.

        Returns:
            AudioResult with generated audio and metadata.

        Raises:
            TTSAudioGenerationError: If audio generation fails.
            TTSConnectionError: If connection to Azure fails.
            TTSAuthenticationError: If API key is invalid.
            TTSUnsupportedLanguageError: If language is not supported.
        """
        options = options or AudioGenerationOptions()

        # Validate language
        if not self.supports_language(options.language):
            raise TTSUnsupportedLanguageError(
                f"Language '{options.language}' is not supported",
                language=options.language,
                provider=self.get_name(),
                supported_languages=self.get_supported_languages(),
            )

        # Get voice (use provided or default)
        voice = options.voice or self._get_default_voice(options.language)

        # Track character count for cost estimation
        char_count = len(text)

        start_time = time.time()

        try:
            # Create speech config
            speech_config = self._get_speech_config()

            # Set voice
            speech_config.speech_synthesis_voice_name = voice

            # Create synthesizer (output to stream)
            synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=speech_config,
                audio_config=None,  # Output to bytes
            )

            # Determine if we need SSML (rate or pitch modified)
            use_ssml = options.rate != 1.0 or options.pitch != 1.0

            if use_ssml:
                rate_str = self._convert_rate(options.rate)
                pitch_str = self._convert_pitch(options.pitch)
                ssml = self._build_ssml(text, voice, rate_str, pitch_str)

                # Run sync SDK call in thread to avoid blocking
                result = await asyncio.to_thread(
                    lambda: synthesizer.speak_ssml_async(ssml).get()
                )
            else:
                # Run sync SDK call in thread to avoid blocking
                result = await asyncio.to_thread(
                    lambda: synthesizer.speak_text_async(text).get()
                )

            latency_ms = int((time.time() - start_time) * 1000)

            # Handle result
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                audio_data = result.audio_data

                if not audio_data:
                    raise TTSAudioGenerationError(
                        "Azure TTS returned empty audio data",
                        provider=self.get_name(),
                        details={"text": text[:50], "voice": voice},
                    )

                # Calculate duration from audio_duration if available
                duration_ms = 0
                if result.audio_duration:
                    duration_ms = int(
                        result.audio_duration.total_seconds() * 1000
                    )

                logger.debug(
                    f"Generated audio: {len(audio_data)} bytes, "
                    f"voice={voice}, chars={char_count}, latency={latency_ms}ms"
                )

                return AudioResult(
                    audio_data=audio_data,
                    format=AudioFormat.MP3,
                    duration_ms=duration_ms,
                    voice_used=voice,
                    provider=self.get_name(),
                    latency_ms=latency_ms,
                    cached=False,
                )

            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation = result.cancellation_details
                error_details = str(cancellation.error_details)

                logger.error(
                    f"Azure TTS synthesis canceled: {cancellation.reason}, "
                    f"error: {error_details}"
                )

                # Map cancellation reasons to specific exceptions
                if cancellation.reason == speechsdk.CancellationReason.Error:
                    if "401" in error_details or "Unauthorized" in error_details:
                        raise TTSAuthenticationError(
                            "Azure TTS authentication failed: Invalid API key",
                            provider=self.get_name(),
                            details={"error": error_details},
                        )
                    elif (
                        "timeout" in error_details.lower()
                        or "connection" in error_details.lower()
                    ):
                        raise TTSConnectionError(
                            f"Azure TTS connection failed: {error_details}",
                            provider=self.get_name(),
                            details={"error": error_details},
                        )
                    else:
                        raise TTSAudioGenerationError(
                            f"Azure TTS synthesis failed: {error_details}",
                            provider=self.get_name(),
                            details={
                                "text": text[:50],
                                "voice": voice,
                                "error": error_details,
                            },
                        )

                raise TTSAudioGenerationError(
                    f"Azure TTS synthesis canceled: {cancellation.reason}",
                    provider=self.get_name(),
                    details={"text": text[:50], "voice": voice},
                )

            else:
                raise TTSAudioGenerationError(
                    f"Unexpected Azure TTS result: {result.reason}",
                    provider=self.get_name(),
                    details={"text": text[:50], "voice": voice},
                )

        except TTSUnsupportedLanguageError:
            raise
        except TTSAuthenticationError:
            raise
        except TTSConnectionError:
            raise
        except TTSAudioGenerationError:
            raise
        except Exception as e:
            error_str = str(e).lower()

            # Check for connection-related errors
            if "connection" in error_str or "timeout" in error_str:
                raise TTSConnectionError(
                    f"Failed to connect to Azure TTS: {e}",
                    provider=self.get_name(),
                    details={"original_error": str(e)},
                ) from e

            raise TTSAudioGenerationError(
                f"Azure TTS generation failed: {e}",
                provider=self.get_name(),
                details={"text": text[:50], "voice": voice, "error": str(e)},
            ) from e

    async def generate_audio_batch(
        self,
        items: list[BatchAudioItem],
    ) -> BatchAudioResult:
        """
        Generate audio for multiple texts sequentially.

        Processes items sequentially to avoid Azure rate limiting.

        Args:
            items: List of text and options pairs.

        Returns:
            BatchAudioResult with all generated audio.
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

        results: list[AudioResult] = []
        success_count = 0
        failure_count = 0
        total_duration_ms = 0
        total_chars = 0

        # Process items sequentially to avoid rate limiting
        for item in items:
            try:
                result = await self.generate_audio(item.text, item.options)
                results.append(result)
                success_count += 1
                total_duration_ms += result.duration_ms
                total_chars += len(item.text)
            except Exception as e:
                logger.warning(f"Batch item failed: {e}")
                failure_count += 1

        total_latency_ms = int((time.time() - start_time) * 1000)

        logger.info(
            f"Batch generation complete: {success_count}/{len(items)} succeeded, "
            f"chars={total_chars}, latency={total_latency_ms}ms"
        )

        return BatchAudioResult(
            results=results,
            total_duration_ms=total_duration_ms,
            total_latency_ms=total_latency_ms,
            provider=self.get_name(),
            success_count=success_count,
            failure_count=failure_count,
        )
