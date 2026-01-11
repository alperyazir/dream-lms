"""Tests for TTS Manager with fallback."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.tts.base import (
    AudioFormat,
    AudioGenerationOptions,
    AudioResult,
    BatchAudioItem,
    BatchAudioResult,
    TTSProvider,
    TTSProviderType,
    Voice,
)
from app.services.tts.cache import AudioCache, reset_audio_cache
from app.services.tts.config import TTSSettings, reset_tts_settings
from app.services.tts.exceptions import (
    AllTTSProvidersFailedError,
    TTSConnectionError,
    TTSProviderError,
    TTSRateLimitError,
    TTSTimeoutError,
)
from app.services.tts.manager import (
    TTSManager,
    create_default_manager,
    get_tts_manager,
    reset_tts_manager,
)


class MockTTSProvider(TTSProvider):
    """Mock TTS provider for testing."""

    def __init__(
        self,
        name: str = "mock",
        available: bool = True,
        fail_with: Exception | None = None,
    ):
        self._name = name
        self._available = available
        self._fail_with = fail_with
        self._generate_called = False
        self._batch_called = False

    async def generate_audio(
        self,
        text: str,
        options: AudioGenerationOptions | None = None,
    ) -> AudioResult:
        self._generate_called = True
        if self._fail_with:
            raise self._fail_with
        return AudioResult(
            audio_data=f"audio for: {text}".encode(),
            format=options.format if options else AudioFormat.MP3,
            duration_ms=len(text) * 100,
            voice_used=options.voice if options and options.voice else "default-voice",
            provider=self._name,
            latency_ms=50,
        )

    async def generate_audio_batch(
        self,
        items: list[BatchAudioItem],
    ) -> BatchAudioResult:
        self._batch_called = True
        if self._fail_with:
            raise self._fail_with

        results = []
        for item in items:
            result = await self.generate_audio(item.text, item.options)
            results.append(result)

        return BatchAudioResult(
            results=results,
            total_duration_ms=sum(r.duration_ms for r in results),
            total_latency_ms=len(items) * 50,
            provider=self._name,
            success_count=len(results),
            failure_count=0,
        )

    def get_name(self) -> str:
        return self._name

    def get_available_voices(self, language: str) -> list[Voice]:
        return [
            Voice(
                id=f"{language}-MockVoice",
                name="Mock Voice",
                language=language,
                gender="neutral",
            )
        ]

    def get_supported_languages(self) -> list[str]:
        return ["en", "tr", "de"]

    def is_available(self) -> bool:
        return self._available

    def supports_language(self, language: str) -> bool:
        return language in self.get_supported_languages()


class TestTTSManagerInit:
    """Tests for TTSManager initialization."""

    def setup_method(self) -> None:
        """Reset singletons before each test."""
        reset_tts_settings()
        reset_audio_cache()
        reset_tts_manager()

    def test_default_initialization(self) -> None:
        """Test manager initializes with default settings."""
        manager = TTSManager()

        assert manager.settings is not None
        assert manager.cache is not None
        assert len(manager.get_available_providers()) == 0

    def test_with_custom_settings(self) -> None:
        """Test manager with custom settings."""
        settings = TTSSettings(TTS_CACHE_ENABLED=False)
        manager = TTSManager(settings=settings)

        assert manager.settings.TTS_CACHE_ENABLED is False
        assert manager.cache is None

    def test_with_cache_disabled(self) -> None:
        """Test manager with cache disabled."""
        settings = TTSSettings(TTS_CACHE_ENABLED=False)
        manager = TTSManager(settings=settings)

        assert manager.cache is None

    def test_with_custom_cache(self) -> None:
        """Test manager with custom cache instance."""
        cache = AudioCache(default_ttl_hours=48)
        manager = TTSManager(cache=cache)

        assert manager.cache is cache


class TestProviderRegistration:
    """Tests for provider registration."""

    def setup_method(self) -> None:
        """Reset singletons before each test."""
        reset_tts_settings()
        reset_audio_cache()

    def test_register_provider(self) -> None:
        """Test registering a provider."""
        manager = TTSManager()
        provider = MockTTSProvider(name="edge")

        manager.register_provider(TTSProviderType.EDGE, provider)

        assert manager.get_provider(TTSProviderType.EDGE) is provider

    def test_get_provider_not_registered(self) -> None:
        """Test getting unregistered provider returns None."""
        manager = TTSManager()

        assert manager.get_provider(TTSProviderType.AZURE) is None

    def test_primary_provider(self) -> None:
        """Test primary_provider property."""
        settings = TTSSettings(TTS_PRIMARY_PROVIDER="edge")
        manager = TTSManager(settings=settings)
        provider = MockTTSProvider(name="edge")

        manager.register_provider(TTSProviderType.EDGE, provider)

        assert manager.primary_provider is provider

    def test_fallback_provider(self) -> None:
        """Test fallback_provider property."""
        settings = TTSSettings(TTS_FALLBACK_PROVIDER="azure")
        manager = TTSManager(settings=settings)
        provider = MockTTSProvider(name="azure")

        manager.register_provider(TTSProviderType.AZURE, provider)

        assert manager.fallback_provider is provider

    def test_fallback_provider_none(self) -> None:
        """Test fallback_provider is None when not configured."""
        settings = TTSSettings(TTS_FALLBACK_PROVIDER=None)
        manager = TTSManager(settings=settings)

        assert manager.fallback_provider is None


class TestGetAvailableProviders:
    """Tests for get_available_providers method."""

    def setup_method(self) -> None:
        """Reset singletons before each test."""
        reset_tts_settings()
        reset_audio_cache()

    def test_returns_available_in_order(self) -> None:
        """Test returns providers in priority order."""
        settings = TTSSettings(
            TTS_PRIMARY_PROVIDER="edge",
            TTS_FALLBACK_PROVIDER="azure",
        )
        manager = TTSManager(settings=settings)

        edge = MockTTSProvider(name="edge", available=True)
        azure = MockTTSProvider(name="azure", available=True)

        manager.register_provider(TTSProviderType.EDGE, edge)
        manager.register_provider(TTSProviderType.AZURE, azure)

        providers = manager.get_available_providers()

        assert len(providers) == 2
        assert providers[0].get_name() == "edge"
        assert providers[1].get_name() == "azure"

    def test_excludes_unavailable(self) -> None:
        """Test excludes unavailable providers."""
        settings = TTSSettings(
            TTS_PRIMARY_PROVIDER="edge",
            TTS_FALLBACK_PROVIDER="azure",
        )
        manager = TTSManager(settings=settings)

        edge = MockTTSProvider(name="edge", available=False)
        azure = MockTTSProvider(name="azure", available=True)

        manager.register_provider(TTSProviderType.EDGE, edge)
        manager.register_provider(TTSProviderType.AZURE, azure)

        providers = manager.get_available_providers()

        assert len(providers) == 1
        assert providers[0].get_name() == "azure"

    def test_empty_when_none_available(self) -> None:
        """Test returns empty list when no providers available."""
        manager = TTSManager()

        providers = manager.get_available_providers()

        assert len(providers) == 0


class TestGenerateAudio:
    """Tests for generate_audio method."""

    def setup_method(self) -> None:
        """Reset singletons before each test."""
        reset_tts_settings()
        reset_audio_cache()

    @pytest.mark.asyncio
    async def test_generate_audio_success(self) -> None:
        """Test successful audio generation."""
        settings = TTSSettings(TTS_PRIMARY_PROVIDER="edge", TTS_CACHE_ENABLED=False)
        manager = TTSManager(settings=settings)
        provider = MockTTSProvider(name="edge")
        manager.register_provider(TTSProviderType.EDGE, provider)

        result = await manager.generate_audio("Hello world")

        assert result.audio_data == b"audio for: Hello world"
        assert result.provider == "edge"
        assert provider._generate_called is True

    @pytest.mark.asyncio
    async def test_generate_audio_with_options(self) -> None:
        """Test audio generation with custom options."""
        settings = TTSSettings(TTS_PRIMARY_PROVIDER="edge", TTS_CACHE_ENABLED=False)
        manager = TTSManager(settings=settings)
        provider = MockTTSProvider(name="edge")
        manager.register_provider(TTSProviderType.EDGE, provider)

        options = AudioGenerationOptions(
            language="tr",
            voice="tr-voice",
            format=AudioFormat.WAV,
        )
        result = await manager.generate_audio("Merhaba", options)

        assert result.format == AudioFormat.WAV
        assert result.voice_used == "tr-voice"

    @pytest.mark.asyncio
    async def test_generate_audio_disabled(self) -> None:
        """Test error when TTS is disabled."""
        settings = TTSSettings(TTS_ENABLED=False)
        manager = TTSManager(settings=settings)

        with pytest.raises(TTSProviderError) as exc_info:
            await manager.generate_audio("Hello")

        assert "TTS generation is disabled" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_generate_audio_no_providers(self) -> None:
        """Test error when no providers available."""
        settings = TTSSettings(TTS_ENABLED=True)
        manager = TTSManager(settings=settings)

        with pytest.raises(TTSProviderError) as exc_info:
            await manager.generate_audio("Hello")

        assert "No TTS providers available" in str(exc_info.value)


class TestFallback:
    """Tests for provider fallback logic."""

    def setup_method(self) -> None:
        """Reset singletons before each test."""
        reset_tts_settings()
        reset_audio_cache()

    @pytest.mark.asyncio
    async def test_fallback_on_connection_error(self) -> None:
        """Test falls back when primary has connection error."""
        settings = TTSSettings(
            TTS_PRIMARY_PROVIDER="edge",
            TTS_FALLBACK_PROVIDER="azure",
            TTS_CACHE_ENABLED=False,
        )
        manager = TTSManager(settings=settings)

        edge = MockTTSProvider(
            name="edge",
            fail_with=TTSConnectionError("Network error", provider="edge"),
        )
        azure = MockTTSProvider(name="azure")

        manager.register_provider(TTSProviderType.EDGE, edge)
        manager.register_provider(TTSProviderType.AZURE, azure)

        result = await manager.generate_audio("Hello")

        assert result.provider == "azure"
        assert edge._generate_called is True
        assert azure._generate_called is True

    @pytest.mark.asyncio
    async def test_fallback_on_timeout(self) -> None:
        """Test falls back when primary times out."""
        settings = TTSSettings(
            TTS_PRIMARY_PROVIDER="edge",
            TTS_FALLBACK_PROVIDER="azure",
            TTS_CACHE_ENABLED=False,
        )
        manager = TTSManager(settings=settings)

        edge = MockTTSProvider(
            name="edge",
            fail_with=TTSTimeoutError("Timeout", provider="edge"),
        )
        azure = MockTTSProvider(name="azure")

        manager.register_provider(TTSProviderType.EDGE, edge)
        manager.register_provider(TTSProviderType.AZURE, azure)

        result = await manager.generate_audio("Hello")

        assert result.provider == "azure"

    @pytest.mark.asyncio
    async def test_fallback_on_rate_limit(self) -> None:
        """Test falls back when primary is rate limited."""
        settings = TTSSettings(
            TTS_PRIMARY_PROVIDER="edge",
            TTS_FALLBACK_PROVIDER="azure",
            TTS_CACHE_ENABLED=False,
        )
        manager = TTSManager(settings=settings)

        edge = MockTTSProvider(
            name="edge",
            fail_with=TTSRateLimitError("Rate limited", provider="edge", retry_after_seconds=60),
        )
        azure = MockTTSProvider(name="azure")

        manager.register_provider(TTSProviderType.EDGE, edge)
        manager.register_provider(TTSProviderType.AZURE, azure)

        result = await manager.generate_audio("Hello")

        assert result.provider == "azure"

    @pytest.mark.asyncio
    async def test_all_providers_fail(self) -> None:
        """Test AllTTSProvidersFailedError when all fail."""
        settings = TTSSettings(
            TTS_PRIMARY_PROVIDER="edge",
            TTS_FALLBACK_PROVIDER="azure",
            TTS_CACHE_ENABLED=False,
        )
        manager = TTSManager(settings=settings)

        edge = MockTTSProvider(
            name="edge",
            fail_with=TTSConnectionError("Edge failed", provider="edge"),
        )
        azure = MockTTSProvider(
            name="azure",
            fail_with=TTSTimeoutError("Azure failed", provider="azure"),
        )

        manager.register_provider(TTSProviderType.EDGE, edge)
        manager.register_provider(TTSProviderType.AZURE, azure)

        with pytest.raises(AllTTSProvidersFailedError) as exc_info:
            await manager.generate_audio("Hello")

        error = exc_info.value
        assert len(error.provider_errors) == 2
        assert "Edge failed" in str(error)
        assert "Azure failed" in str(error)


class TestCacheIntegration:
    """Tests for cache integration with manager."""

    def setup_method(self) -> None:
        """Reset singletons before each test."""
        reset_tts_settings()
        reset_audio_cache()

    @pytest.mark.asyncio
    async def test_cache_hit_returns_cached(self) -> None:
        """Test cache hit returns cached audio without calling provider."""
        settings = TTSSettings(TTS_PRIMARY_PROVIDER="edge", TTS_CACHE_ENABLED=True)
        cache = AudioCache()
        manager = TTSManager(settings=settings, cache=cache)
        provider = MockTTSProvider(name="edge")
        manager.register_provider(TTSProviderType.EDGE, provider)

        # First call - cache miss
        result1 = await manager.generate_audio("Hello")
        assert result1.cached is False
        assert provider._generate_called is True

        # Reset call tracking
        provider._generate_called = False

        # Second call - should hit cache
        result2 = await manager.generate_audio("Hello")
        assert result2.cached is True
        assert result2.provider == "cache"
        assert provider._generate_called is False  # Provider not called

    @pytest.mark.asyncio
    async def test_cache_stores_on_success(self) -> None:
        """Test successful generation stores result in cache."""
        settings = TTSSettings(TTS_PRIMARY_PROVIDER="edge", TTS_CACHE_ENABLED=True)
        cache = AudioCache()
        manager = TTSManager(settings=settings, cache=cache)
        provider = MockTTSProvider(name="edge")
        manager.register_provider(TTSProviderType.EDGE, provider)

        await manager.generate_audio("Hello")

        # Check cache has entry
        assert cache.size == 1

    @pytest.mark.asyncio
    async def test_no_cache_when_disabled(self) -> None:
        """Test no caching when TTS_CACHE_ENABLED=False."""
        settings = TTSSettings(TTS_PRIMARY_PROVIDER="edge", TTS_CACHE_ENABLED=False)
        manager = TTSManager(settings=settings)
        provider = MockTTSProvider(name="edge")
        manager.register_provider(TTSProviderType.EDGE, provider)

        # First call
        await manager.generate_audio("Hello")
        provider._generate_called = False

        # Second call - should still call provider (no cache)
        result = await manager.generate_audio("Hello")
        assert result.cached is False
        assert provider._generate_called is True


class TestGenerateAudioBatch:
    """Tests for generate_audio_batch method."""

    def setup_method(self) -> None:
        """Reset singletons before each test."""
        reset_tts_settings()
        reset_audio_cache()

    @pytest.mark.asyncio
    async def test_batch_generation_success(self) -> None:
        """Test successful batch generation."""
        settings = TTSSettings(TTS_PRIMARY_PROVIDER="edge", TTS_CACHE_ENABLED=False)
        manager = TTSManager(settings=settings)
        provider = MockTTSProvider(name="edge")
        manager.register_provider(TTSProviderType.EDGE, provider)

        items = [
            BatchAudioItem(text="Hello"),
            BatchAudioItem(text="World"),
            BatchAudioItem(text="Test"),
        ]

        result = await manager.generate_audio_batch(items)

        assert len(result.results) == 3
        assert result.success_count == 3
        assert result.failure_count == 0
        assert result.provider == "edge"
        assert provider._batch_called is True

    @pytest.mark.asyncio
    async def test_batch_empty_list(self) -> None:
        """Test batch generation with empty list."""
        settings = TTSSettings(TTS_PRIMARY_PROVIDER="edge", TTS_CACHE_ENABLED=False)
        manager = TTSManager(settings=settings)
        provider = MockTTSProvider(name="edge")
        manager.register_provider(TTSProviderType.EDGE, provider)

        result = await manager.generate_audio_batch([])

        assert len(result.results) == 0
        assert result.success_count == 0
        assert result.provider == "none"

    @pytest.mark.asyncio
    async def test_batch_fallback(self) -> None:
        """Test batch generation falls back on error."""
        settings = TTSSettings(
            TTS_PRIMARY_PROVIDER="edge",
            TTS_FALLBACK_PROVIDER="azure",
            TTS_CACHE_ENABLED=False,
        )
        manager = TTSManager(settings=settings)

        edge = MockTTSProvider(
            name="edge",
            fail_with=TTSConnectionError("Failed", provider="edge"),
        )
        azure = MockTTSProvider(name="azure")

        manager.register_provider(TTSProviderType.EDGE, edge)
        manager.register_provider(TTSProviderType.AZURE, azure)

        items = [BatchAudioItem(text="Hello")]
        result = await manager.generate_audio_batch(items)

        assert result.provider == "azure"


class TestIsAvailable:
    """Tests for is_available method."""

    def setup_method(self) -> None:
        """Reset singletons before each test."""
        reset_tts_settings()
        reset_audio_cache()

    def test_available_when_provider_registered(self) -> None:
        """Test is_available returns True with available provider."""
        settings = TTSSettings(TTS_PRIMARY_PROVIDER="edge")
        manager = TTSManager(settings=settings)
        provider = MockTTSProvider(name="edge", available=True)
        manager.register_provider(TTSProviderType.EDGE, provider)

        assert manager.is_available() is True

    def test_not_available_when_disabled(self) -> None:
        """Test is_available returns False when TTS disabled."""
        settings = TTSSettings(TTS_ENABLED=False)
        manager = TTSManager(settings=settings)

        assert manager.is_available() is False

    def test_not_available_when_no_providers(self) -> None:
        """Test is_available returns False without providers."""
        settings = TTSSettings(TTS_ENABLED=True)
        manager = TTSManager(settings=settings)

        assert manager.is_available() is False


class TestGlobalManager:
    """Tests for global manager accessor functions."""

    def setup_method(self) -> None:
        """Reset singletons before each test."""
        reset_tts_settings()
        reset_audio_cache()
        reset_tts_manager()

    def test_get_tts_manager(self) -> None:
        """Test get_tts_manager returns TTSManager instance."""
        manager = get_tts_manager()
        assert isinstance(manager, TTSManager)

    def test_get_tts_manager_singleton(self) -> None:
        """Test get_tts_manager returns same instance."""
        manager1 = get_tts_manager()
        manager2 = get_tts_manager()
        assert manager1 is manager2

    def test_reset_tts_manager(self) -> None:
        """Test reset_tts_manager clears singleton."""
        manager1 = get_tts_manager()
        reset_tts_manager()
        manager2 = get_tts_manager()
        assert manager1 is not manager2

    def test_create_default_manager(self) -> None:
        """Test create_default_manager creates manager."""
        manager = create_default_manager()
        assert isinstance(manager, TTSManager)

    def test_create_default_manager_with_settings(self) -> None:
        """Test create_default_manager with custom settings."""
        settings = TTSSettings(TTS_CACHE_TTL_HOURS=48)
        manager = create_default_manager(settings=settings)
        assert manager.settings.TTS_CACHE_TTL_HOURS == 48
