"""
LLM Provider Service.

Abstracted LLM service layer supporting multiple providers
with automatic fallback, rate limiting, and usage tracking.
"""

from app.services.llm.base import (
    GenerationOptions,
    GenerationResult,
    LLMProvider,
    LLMProviderType,
    TokenUsage,
)
from app.services.llm.config import LLMSettings, get_llm_settings, llm_settings
from app.services.llm.exceptions import (
    AllProvidersFailedError,
    LLMAuthenticationError,
    LLMConnectionError,
    LLMContentFilterError,
    LLMModelNotFoundError,
    LLMProviderError,
    LLMQuotaExceededError,
    LLMRateLimitError,
    LLMResponseError,
    LLMTimeoutError,
    RateLimitExceededError,
)
from app.services.llm.logging import (
    LLMLogger,
    LLMRequestLog,
    generate_request_id,
    get_llm_logger,
    hash_prompt,
    reset_llm_logger,
)
from app.services.llm.manager import (
    LLMManager,
    create_default_manager,
    get_llm_manager,
    reset_llm_manager,
)
from app.services.llm.providers import DeepSeekProvider, GeminiProvider
from app.services.llm.rate_limiter import (
    RateLimiter,
    get_rate_limiter,
    reset_rate_limiter,
)

__all__ = [
    # Base classes and types
    "LLMProvider",
    "LLMProviderType",
    "GenerationOptions",
    "GenerationResult",
    "TokenUsage",
    # Configuration
    "LLMSettings",
    "get_llm_settings",
    "llm_settings",
    # Manager
    "LLMManager",
    "create_default_manager",
    "get_llm_manager",
    "reset_llm_manager",
    # Logging
    "LLMLogger",
    "LLMRequestLog",
    "generate_request_id",
    "get_llm_logger",
    "hash_prompt",
    "reset_llm_logger",
    # Rate Limiting
    "RateLimiter",
    "get_rate_limiter",
    "reset_rate_limiter",
    # Providers
    "DeepSeekProvider",
    "GeminiProvider",
    # Exceptions
    "LLMProviderError",
    "LLMConnectionError",
    "LLMAuthenticationError",
    "LLMRateLimitError",
    "LLMTimeoutError",
    "LLMResponseError",
    "LLMContentFilterError",
    "LLMQuotaExceededError",
    "LLMModelNotFoundError",
    "AllProvidersFailedError",
    "RateLimitExceededError",
]
