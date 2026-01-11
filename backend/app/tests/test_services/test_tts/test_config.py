"""Tests for TTS configuration."""

import os
from unittest.mock import patch

import pytest

from app.services.tts.base import TTSProviderType
from app.services.tts.config import TTSSettings, get_tts_settings, reset_tts_settings


class TestTTSSettings:
    """Tests for TTSSettings model."""

    def setup_method(self) -> None:
        """Reset settings cache before each test."""
        reset_tts_settings()

    def test_default_values(self) -> None:
        """Test TTSSettings has sensible defaults."""
        settings = TTSSettings()

        assert settings.TTS_ENABLED is True
        assert settings.TTS_PRIMARY_PROVIDER == "edge"
        assert settings.TTS_FALLBACK_PROVIDER == "azure"
        assert settings.TTS_DEFAULT_LANGUAGE == "en"
        assert settings.TTS_DEFAULT_FORMAT == "mp3"
        assert settings.TTS_CACHE_ENABLED is True
        assert settings.TTS_CACHE_TTL_HOURS == 24
        assert settings.TTS_REQUEST_TIMEOUT == 30
        assert settings.TTS_MAX_RETRIES == 3
        assert settings.AZURE_TTS_KEY is None
        assert settings.AZURE_TTS_REGION == "turkeycentral"
        assert settings.GOOGLE_TTS_KEY is None

    def test_env_variable_override(self) -> None:
        """Test settings can be overridden via environment variables."""
        env_vars = {
            "TTS_ENABLED": "false",
            "TTS_PRIMARY_PROVIDER": "azure",
            "TTS_FALLBACK_PROVIDER": "edge",
            "TTS_DEFAULT_LANGUAGE": "tr",
            "TTS_DEFAULT_FORMAT": "wav",
            "TTS_CACHE_ENABLED": "false",
            "TTS_CACHE_TTL_HOURS": "48",
            "TTS_REQUEST_TIMEOUT": "60",
            "TTS_MAX_RETRIES": "5",
            "AZURE_TTS_KEY": "test-azure-key",
            "AZURE_TTS_REGION": "westeurope",
        }

        with patch.dict(os.environ, env_vars, clear=False):
            settings = TTSSettings()

            assert settings.TTS_ENABLED is False
            assert settings.TTS_PRIMARY_PROVIDER == "azure"
            assert settings.TTS_FALLBACK_PROVIDER == "edge"
            assert settings.TTS_DEFAULT_LANGUAGE == "tr"
            assert settings.TTS_DEFAULT_FORMAT == "wav"
            assert settings.TTS_CACHE_ENABLED is False
            assert settings.TTS_CACHE_TTL_HOURS == 48
            assert settings.TTS_REQUEST_TIMEOUT == 60
            assert settings.TTS_MAX_RETRIES == 5
            assert settings.AZURE_TTS_KEY == "test-azure-key"
            assert settings.AZURE_TTS_REGION == "westeurope"

    def test_ttl_hours_validation(self) -> None:
        """Test TTS_CACHE_TTL_HOURS validation."""
        # Valid values
        TTSSettings(TTS_CACHE_TTL_HOURS=1)
        TTSSettings(TTS_CACHE_TTL_HOURS=720)

        # Invalid values
        with pytest.raises(ValueError):
            TTSSettings(TTS_CACHE_TTL_HOURS=0)
        with pytest.raises(ValueError):
            TTSSettings(TTS_CACHE_TTL_HOURS=721)

    def test_timeout_validation(self) -> None:
        """Test TTS_REQUEST_TIMEOUT validation."""
        # Valid values
        TTSSettings(TTS_REQUEST_TIMEOUT=5)
        TTSSettings(TTS_REQUEST_TIMEOUT=120)

        # Invalid values
        with pytest.raises(ValueError):
            TTSSettings(TTS_REQUEST_TIMEOUT=4)
        with pytest.raises(ValueError):
            TTSSettings(TTS_REQUEST_TIMEOUT=121)

    def test_max_retries_validation(self) -> None:
        """Test TTS_MAX_RETRIES validation."""
        # Valid values
        TTSSettings(TTS_MAX_RETRIES=0)
        TTSSettings(TTS_MAX_RETRIES=10)

        # Invalid values
        with pytest.raises(ValueError):
            TTSSettings(TTS_MAX_RETRIES=-1)
        with pytest.raises(ValueError):
            TTSSettings(TTS_MAX_RETRIES=11)


class TestProviderTypeMethods:
    """Tests for provider type resolution methods."""

    def setup_method(self) -> None:
        """Reset settings cache before each test."""
        reset_tts_settings()

    def test_get_primary_provider_type(self) -> None:
        """Test get_primary_provider_type returns correct enum."""
        settings = TTSSettings(TTS_PRIMARY_PROVIDER="edge")
        assert settings.get_primary_provider_type() == TTSProviderType.EDGE

        settings = TTSSettings(TTS_PRIMARY_PROVIDER="azure")
        assert settings.get_primary_provider_type() == TTSProviderType.AZURE

        settings = TTSSettings(TTS_PRIMARY_PROVIDER="google")
        assert settings.get_primary_provider_type() == TTSProviderType.GOOGLE

    def test_get_fallback_provider_type(self) -> None:
        """Test get_fallback_provider_type returns correct enum."""
        settings = TTSSettings(TTS_FALLBACK_PROVIDER="azure")
        assert settings.get_fallback_provider_type() == TTSProviderType.AZURE

        settings = TTSSettings(TTS_FALLBACK_PROVIDER="edge")
        assert settings.get_fallback_provider_type() == TTSProviderType.EDGE

    def test_get_fallback_provider_type_none(self) -> None:
        """Test get_fallback_provider_type returns None when not set."""
        settings = TTSSettings(TTS_FALLBACK_PROVIDER=None)
        assert settings.get_fallback_provider_type() is None


class TestProviderConfigured:
    """Tests for is_provider_configured method."""

    def setup_method(self) -> None:
        """Reset settings cache before each test."""
        reset_tts_settings()

    def test_edge_always_configured(self) -> None:
        """Test Edge TTS is always configured (no API key needed)."""
        settings = TTSSettings()
        assert settings.is_provider_configured(TTSProviderType.EDGE) is True

    def test_azure_requires_key(self) -> None:
        """Test Azure requires AZURE_TTS_KEY."""
        settings = TTSSettings(AZURE_TTS_KEY=None)
        assert settings.is_provider_configured(TTSProviderType.AZURE) is False

        settings = TTSSettings(AZURE_TTS_KEY="test-key")
        assert settings.is_provider_configured(TTSProviderType.AZURE) is True

    def test_google_requires_key(self) -> None:
        """Test Google requires GOOGLE_TTS_KEY."""
        settings = TTSSettings(GOOGLE_TTS_KEY=None)
        assert settings.is_provider_configured(TTSProviderType.GOOGLE) is False

        settings = TTSSettings(GOOGLE_TTS_KEY="test-key")
        assert settings.is_provider_configured(TTSProviderType.GOOGLE) is True


class TestGetTTSSettings:
    """Tests for get_tts_settings function."""

    def setup_method(self) -> None:
        """Reset settings cache before each test."""
        reset_tts_settings()

    def test_returns_settings_instance(self) -> None:
        """Test get_tts_settings returns TTSSettings instance."""
        settings = get_tts_settings()
        assert isinstance(settings, TTSSettings)

    def test_caches_instance(self) -> None:
        """Test get_tts_settings returns same cached instance."""
        settings1 = get_tts_settings()
        settings2 = get_tts_settings()
        assert settings1 is settings2

    def test_reset_clears_cache(self) -> None:
        """Test reset_tts_settings clears the cache."""
        settings1 = get_tts_settings()
        reset_tts_settings()
        settings2 = get_tts_settings()

        # After reset, should be different instances
        # (though they may have same values)
        assert settings1 is not settings2
