"""
TTS Provider Configuration.

Configuration settings for TTS providers with environment variable support.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.services.tts.base import TTSProviderType


class TTSSettings(BaseSettings):
    """
    TTS provider configuration settings.

    Loaded from environment variables with sensible defaults.
    """

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_ignore_empty=True,
        extra="ignore",
    )

    # Feature Flag
    TTS_ENABLED: bool = Field(
        default=True,
        description="Enable/disable TTS generation features.",
    )

    # Provider Selection
    TTS_PRIMARY_PROVIDER: Literal["edge", "azure", "google"] = Field(
        default="edge",
        description="Primary TTS provider to use.",
    )
    TTS_FALLBACK_PROVIDER: Literal["edge", "azure", "google"] | None = Field(
        default="azure",
        description="Fallback provider when primary fails.",
    )

    # Default Settings
    TTS_DEFAULT_LANGUAGE: str = Field(
        default="en",
        description="Default language for TTS generation.",
    )
    TTS_DEFAULT_FORMAT: Literal["mp3", "wav", "ogg"] = Field(
        default="mp3",
        description="Default audio output format.",
    )

    # Cache Configuration
    TTS_CACHE_ENABLED: bool = Field(
        default=True,
        description="Enable/disable audio caching.",
    )
    TTS_CACHE_TTL_HOURS: int = Field(
        default=24,
        ge=1,
        le=720,  # Max 30 days
        description="Cache TTL in hours.",
    )

    # Request Configuration
    TTS_REQUEST_TIMEOUT: int = Field(
        default=30,
        ge=5,
        le=120,
        description="Timeout for TTS API requests in seconds.",
    )
    TTS_MAX_RETRIES: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Maximum retries on transient errors.",
    )

    # Azure TTS Configuration
    AZURE_TTS_KEY: str | None = Field(
        default=None,
        description="Azure Cognitive Services TTS API key.",
    )
    AZURE_TTS_REGION: str = Field(
        default="turkeycentral",
        description="Azure region for TTS service (turkeycentral for KVKK).",
    )

    # Google TTS Configuration (future)
    GOOGLE_TTS_KEY: str | None = Field(
        default=None,
        description="Google Cloud TTS API key.",
    )

    def get_primary_provider_type(self) -> TTSProviderType:
        """Get the primary provider type enum."""
        return TTSProviderType(self.TTS_PRIMARY_PROVIDER)

    def get_fallback_provider_type(self) -> TTSProviderType | None:
        """Get the fallback provider type enum, or None if not configured."""
        if self.TTS_FALLBACK_PROVIDER:
            return TTSProviderType(self.TTS_FALLBACK_PROVIDER)
        return None

    def is_provider_configured(self, provider: TTSProviderType) -> bool:
        """
        Check if a provider has required configuration.

        Args:
            provider: Provider type to check.

        Returns:
            True if provider is properly configured.
        """
        if provider == TTSProviderType.EDGE:
            # Edge TTS is free and requires no API key
            return True
        elif provider == TTSProviderType.AZURE:
            return bool(self.AZURE_TTS_KEY)
        elif provider == TTSProviderType.GOOGLE:
            return bool(self.GOOGLE_TTS_KEY)
        return False


@lru_cache
def get_tts_settings() -> TTSSettings:
    """
    Get cached TTS settings instance.

    Returns:
        TTSSettings instance loaded from environment.
    """
    return TTSSettings()  # type: ignore


def reset_tts_settings() -> None:
    """Reset the cached TTS settings (for testing)."""
    get_tts_settings.cache_clear()


# Convenience accessor
tts_settings = get_tts_settings
