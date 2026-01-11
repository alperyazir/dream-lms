"""
LLM Provider Exception Hierarchy.

Custom exceptions for handling LLM provider errors with proper typing
and context for debugging and fallback logic.
"""

from typing import Any


class LLMProviderError(Exception):
    """Base exception for all LLM provider errors."""

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


class LLMConnectionError(LLMProviderError):
    """Raised when connection to the LLM provider fails."""

    pass


class LLMAuthenticationError(LLMProviderError):
    """Raised when API key is invalid or authentication fails."""

    pass


class LLMRateLimitError(LLMProviderError):
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


class LLMTimeoutError(LLMProviderError):
    """Raised when request to provider times out."""

    pass


class LLMResponseError(LLMProviderError):
    """Raised when provider returns an invalid or unexpected response."""

    pass


class LLMContentFilterError(LLMProviderError):
    """Raised when content is blocked by provider's safety filters."""

    pass


class LLMQuotaExceededError(LLMProviderError):
    """Raised when provider quota (tokens, requests) is exhausted."""

    pass


class LLMModelNotFoundError(LLMProviderError):
    """Raised when requested model is not available."""

    pass


class RateLimitExceededError(Exception):
    """Raised when internal rate limiting is exceeded (per-teacher limits)."""

    def __init__(
        self,
        message: str,
        limit_type: str,  # "daily" or "per_request"
        current_usage: int,
        max_allowed: int,
        reset_at: str | None = None,
    ) -> None:
        self.message = message
        self.limit_type = limit_type
        self.current_usage = current_usage
        self.max_allowed = max_allowed
        self.reset_at = reset_at
        super().__init__(self.message)


class AllProvidersFailedError(LLMProviderError):
    """Raised when all configured providers fail."""

    def __init__(
        self,
        message: str,
        provider_errors: list[tuple[str, LLMProviderError]],
    ) -> None:
        super().__init__(message)
        self.provider_errors = provider_errors

    def __str__(self) -> str:
        errors = ", ".join(
            f"{provider}: {error.message}" for provider, error in self.provider_errors
        )
        return f"{self.message} - Errors: [{errors}]"
