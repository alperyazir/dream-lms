"""
TTS Provider Base Classes and Types.

Abstract base class for TTS providers with Pydantic models
for request options and response data.
"""

from abc import ABC, abstractmethod
from enum import Enum

from pydantic import BaseModel, Field


class TTSProviderType(str, Enum):
    """Supported TTS provider types."""

    EDGE = "edge"
    AZURE = "azure"
    GOOGLE = "google"


class AudioFormat(str, Enum):
    """Supported audio output formats."""

    MP3 = "mp3"
    WAV = "wav"
    OGG = "ogg"


class Voice(BaseModel):
    """Voice configuration for TTS generation."""

    id: str = Field(
        description="Provider-specific voice ID.",
    )
    name: str = Field(
        description="Human-readable voice name.",
    )
    language: str = Field(
        description="BCP-47 language code (e.g., 'en-US', 'tr-TR').",
    )
    gender: str = Field(
        description="Voice gender: 'male', 'female', or 'neutral'.",
    )
    style: str | None = Field(
        default=None,
        description="Voice style (e.g., 'neural', 'standard').",
    )


class AudioGenerationOptions(BaseModel):
    """Options for audio generation requests."""

    language: str = Field(
        default="en",
        description="Language code for the text (e.g., 'en', 'tr').",
    )
    voice: str | None = Field(
        default=None,
        description="Specific voice ID to use. If None, provider selects default.",
    )
    format: AudioFormat = Field(
        default=AudioFormat.MP3,
        description="Output audio format.",
    )
    rate: float = Field(
        default=1.0,
        ge=0.5,
        le=2.0,
        description="Speech rate multiplier (0.5 = half speed, 2.0 = double speed).",
    )
    pitch: float = Field(
        default=1.0,
        ge=0.5,
        le=2.0,
        description="Pitch adjustment (0.5 = lower, 2.0 = higher).",
    )


class AudioResult(BaseModel):
    """Result of an audio generation request."""

    audio_data: bytes = Field(
        description="Generated audio data.",
    )
    format: AudioFormat = Field(
        description="Audio format of the generated data.",
    )
    duration_ms: int = Field(
        ge=0,
        description="Duration of the audio in milliseconds.",
    )
    voice_used: str = Field(
        description="Voice ID that was used for generation.",
    )
    provider: str = Field(
        description="Provider that generated the audio.",
    )
    latency_ms: int = Field(
        ge=0,
        description="Request latency in milliseconds.",
    )
    cached: bool = Field(
        default=False,
        description="Whether the result was served from cache.",
    )

    model_config = {"arbitrary_types_allowed": True}


class BatchAudioItem(BaseModel):
    """Single item in a batch audio generation request."""

    text: str = Field(
        description="Text to convert to speech.",
    )
    options: AudioGenerationOptions = Field(
        default_factory=AudioGenerationOptions,
        description="Options for this specific item.",
    )


class BatchAudioResult(BaseModel):
    """Result of a batch audio generation request."""

    results: list[AudioResult] = Field(
        description="List of audio results for each input.",
    )
    total_duration_ms: int = Field(
        ge=0,
        description="Total duration of all audio in milliseconds.",
    )
    total_latency_ms: int = Field(
        ge=0,
        description="Total time to generate all audio.",
    )
    provider: str = Field(
        description="Provider that generated the audio.",
    )
    success_count: int = Field(
        ge=0,
        description="Number of successfully generated items.",
    )
    failure_count: int = Field(
        ge=0,
        description="Number of failed items.",
    )


class TTSProvider(ABC):
    """
    Abstract base class for TTS providers.

    All TTS provider implementations must inherit from this class
    and implement the abstract methods.
    """

    @abstractmethod
    async def generate_audio(
        self,
        text: str,
        options: AudioGenerationOptions | None = None,
    ) -> AudioResult:
        """
        Generate audio from text.

        Args:
            text: The text to convert to speech.
            options: Optional generation options.

        Returns:
            AudioResult with generated audio and metadata.

        Raises:
            TTSProviderError: On any provider error.
        """
        pass

    @abstractmethod
    async def generate_audio_batch(
        self,
        items: list[BatchAudioItem],
    ) -> BatchAudioResult:
        """
        Generate audio for multiple texts.

        Args:
            items: List of text and options pairs.

        Returns:
            BatchAudioResult with all generated audio.

        Raises:
            TTSProviderError: On any provider error.
        """
        pass

    @abstractmethod
    def get_name(self) -> str:
        """
        Return provider name for logging and identification.

        Returns:
            Provider name (e.g., "edge", "azure").
        """
        pass

    @abstractmethod
    def get_available_voices(self, language: str) -> list[Voice]:
        """
        Get available voices for a language.

        Args:
            language: Language code (e.g., 'en', 'tr', 'en-US').

        Returns:
            List of available Voice objects for the language.
        """
        pass

    @abstractmethod
    def get_supported_languages(self) -> list[str]:
        """
        Get list of supported language codes.

        Returns:
            List of BCP-47 language codes supported by this provider.
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if provider is configured and available.

        Returns:
            True if provider has valid configuration and is usable.
        """
        pass

    @abstractmethod
    def supports_language(self, language: str) -> bool:
        """
        Check if a specific language is supported.

        Args:
            language: Language code to check.

        Returns:
            True if the language is supported.
        """
        pass
