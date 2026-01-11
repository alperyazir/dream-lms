"""
TTS Provider Exception Hierarchy.

Custom exceptions for handling TTS provider errors with proper typing
and context for debugging and fallback logic.
"""

from typing import Any


class TTSProviderError(Exception):
    """Base exception for all TTS provider errors."""

    def __init__(
        self,
        message: str,
        provider: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message
        self.provider = provider
        self.details = details or {}
        super().__init__(self.message)

    def __str__(self) -> str:
        if self.provider:
            return f"[{self.provider}] {self.message}"
        return self.message


class TTSConnectionError(TTSProviderError):
    """Raised when connection to the TTS provider fails."""

    pass


class TTSAuthenticationError(TTSProviderError):
    """Raised when API key is invalid or authentication fails."""

    pass


class TTSRateLimitError(TTSProviderError):
    """Raised when provider rate limit is exceeded."""

    def __init__(
        self,
        message: str,
        provider: str | None = None,
        retry_after_seconds: int | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, provider, details)
        self.retry_after_seconds = retry_after_seconds


class TTSTimeoutError(TTSProviderError):
    """Raised when request to provider times out."""

    pass


class TTSAudioGenerationError(TTSProviderError):
    """Raised when audio generation fails."""

    pass


class TTSUnsupportedLanguageError(TTSProviderError):
    """Raised when requested language is not supported by the provider."""

    def __init__(
        self,
        message: str,
        language: str,
        provider: str | None = None,
        supported_languages: list[str] | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, provider, details)
        self.language = language
        self.supported_languages = supported_languages or []


class AllTTSProvidersFailedError(TTSProviderError):
    """Raised when all configured TTS providers fail."""

    def __init__(
        self,
        message: str,
        provider_errors: list[tuple[str, TTSProviderError]],
    ) -> None:
        super().__init__(message)
        self.provider_errors = provider_errors

    def __str__(self) -> str:
        errors = ", ".join(
            f"{provider}: {error.message}" for provider, error in self.provider_errors
        )
        return f"{self.message} - Errors: [{errors}]"
