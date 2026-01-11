"""
LLM Provider Configuration.

Configuration settings for LLM providers with environment variable support.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Self

from app.services.llm.base import LLMProviderType


class LLMSettings(BaseSettings):
    """
    LLM provider configuration settings.

    Loaded from environment variables with sensible defaults.
    """

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_ignore_empty=True,
        extra="ignore",
    )

    # Provider API Keys
    DEEPSEEK_API_KEY: str | None = Field(
        default=None,
        description="DeepSeek API key for primary LLM provider.",
    )
    GEMINI_API_KEY: str | None = Field(
        default=None,
        description="Google Gemini API key for fallback provider.",
    )
    OPENAI_API_KEY: str | None = Field(
        default=None,
        description="OpenAI API key for premium provider (optional).",
    )

    # Provider Selection
    LLM_PRIMARY_PROVIDER: Literal["deepseek", "gemini", "openai"] = Field(
        default="deepseek",
        description="Primary LLM provider to use.",
    )
    LLM_FALLBACK_PROVIDER: Literal["deepseek", "gemini", "openai"] | None = Field(
        default="gemini",
        description="Fallback provider when primary fails.",
    )

    # Feature Flags
    AI_GENERATION_ENABLED: bool = Field(
        default=True,
        description="Enable/disable AI generation features.",
    )

    # Rate Limiting
    AI_MAX_QUESTIONS_PER_REQUEST: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Maximum questions per generation request.",
    )
    AI_DAILY_LIMIT_PER_TEACHER: int = Field(
        default=10,
        ge=1,
        le=10000,
        description="Maximum AI generations per teacher per day.",
    )

    # Timeouts (in seconds)
    LLM_REQUEST_TIMEOUT: int = Field(
        default=60,
        ge=5,
        le=300,
        description="Timeout for LLM API requests in seconds.",
    )

    # Retry Configuration
    LLM_MAX_RETRIES: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Maximum retries on transient errors.",
    )
    LLM_RETRY_DELAY: float = Field(
        default=1.0,
        ge=0.1,
        le=30.0,
        description="Initial delay between retries in seconds.",
    )

    @model_validator(mode="after")
    def validate_provider_keys(self) -> Self:
        """
        Validate that configured providers have API keys.

        Raises:
            ValueError: If a configured provider is missing its API key.
        """
        if not self.AI_GENERATION_ENABLED:
            return self

        provider_keys = {
            "deepseek": self.DEEPSEEK_API_KEY,
            "gemini": self.GEMINI_API_KEY,
            "openai": self.OPENAI_API_KEY,
        }

        # Check primary provider
        primary_key = provider_keys.get(self.LLM_PRIMARY_PROVIDER)
        if not primary_key:
            raise ValueError(
                f"Primary LLM provider '{self.LLM_PRIMARY_PROVIDER}' is configured "
                f"but {self.LLM_PRIMARY_PROVIDER.upper()}_API_KEY is not set."
            )

        # Check fallback provider (if configured)
        if self.LLM_FALLBACK_PROVIDER:
            fallback_key = provider_keys.get(self.LLM_FALLBACK_PROVIDER)
            if not fallback_key:
                raise ValueError(
                    f"Fallback LLM provider '{self.LLM_FALLBACK_PROVIDER}' is configured "
                    f"but {self.LLM_FALLBACK_PROVIDER.upper()}_API_KEY is not set."
                )

        return self

    def get_primary_provider_type(self) -> LLMProviderType:
        """Get the primary provider type enum."""
        return LLMProviderType(self.LLM_PRIMARY_PROVIDER)

    def get_fallback_provider_type(self) -> LLMProviderType | None:
        """Get the fallback provider type enum, or None if not configured."""
        if self.LLM_FALLBACK_PROVIDER:
            return LLMProviderType(self.LLM_FALLBACK_PROVIDER)
        return None

    def get_api_key(self, provider: LLMProviderType) -> str | None:
        """Get API key for a specific provider."""
        keys = {
            LLMProviderType.DEEPSEEK: self.DEEPSEEK_API_KEY,
            LLMProviderType.GEMINI: self.GEMINI_API_KEY,
            LLMProviderType.OPENAI: self.OPENAI_API_KEY,
        }
        return keys.get(provider)


@lru_cache
def get_llm_settings() -> LLMSettings:
    """
    Get cached LLM settings instance.

    Returns:
        LLMSettings instance loaded from environment.
    """
    return LLMSettings()  # type: ignore


# Convenience accessor
llm_settings = get_llm_settings
