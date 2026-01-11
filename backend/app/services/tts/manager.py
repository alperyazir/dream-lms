"""
TTS Manager with Automatic Fallback.

Orchestrates TTS provider selection and handles automatic fallback
when the primary provider fails. Integrates with audio cache.
"""

import logging
import time

from app.services.tts.base import (
    AudioGenerationOptions,
    AudioResult,
    BatchAudioItem,
    BatchAudioResult,
    TTSProvider,
    TTSProviderType,
)
from app.services.tts.cache import AudioCache, get_audio_cache
from app.services.tts.config import TTSSettings, get_tts_settings
from app.services.tts.exceptions import (
    AllTTSProvidersFailedError,
    TTSProviderError,
    TTSRateLimitError,
    TTSTimeoutError,
)

logger = logging.getLogger(__name__)


class TTSManager:
    """
    Manages TTS providers with automatic fallback.

    This class orchestrates provider selection and handles fallback
    to alternative providers when the primary fails.
    Integrates with audio cache for improved performance.
    """

    def __init__(
        self,
        settings: TTSSettings | None = None,
        providers: dict[TTSProviderType, TTSProvider] | None = None,
        cache: AudioCache | None = None,
    ) -> None:
        """
        Initialize the TTS Manager.

        Args:
            settings: TTS settings. If None, loads from environment.
            providers: Pre-configured providers. If None, initializes empty.
            cache: Audio cache instance. If None, uses global cache.
        """
        self._settings = settings or get_tts_settings()
        self._providers: dict[TTSProviderType, TTSProvider] = providers or {}
        self._cache = cache if cache is not None else (
            get_audio_cache(self._settings.TTS_CACHE_TTL_HOURS)
            if self._settings.TTS_CACHE_ENABLED
            else None
        )

    @property
    def settings(self) -> TTSSettings:
        """Get the TTS settings."""
        return self._settings

    @property
    def cache(self) -> AudioCache | None:
        """Get the audio cache instance."""
        return self._cache

    @property
    def primary_provider(self) -> TTSProvider | None:
        """Get the primary provider instance."""
        provider_type = self._settings.get_primary_provider_type()
        return self._providers.get(provider_type)

    @property
    def fallback_provider(self) -> TTSProvider | None:
        """Get the fallback provider instance."""
        provider_type = self._settings.get_fallback_provider_type()
        if provider_type:
            return self._providers.get(provider_type)
        return None

    def register_provider(
        self,
        provider_type: TTSProviderType,
        provider: TTSProvider,
    ) -> None:
        """
        Register a provider instance.

        Args:
            provider_type: The type of provider being registered.
            provider: The provider instance.
        """
        self._providers[provider_type] = provider
        logger.info(f"Registered TTS provider: {provider_type.value}")

    def get_provider(self, provider_type: TTSProviderType) -> TTSProvider | None:
        """
        Get a specific provider by type.

        Args:
            provider_type: The type of provider to retrieve.

        Returns:
            The provider instance or None if not registered.
        """
        return self._providers.get(provider_type)

    def get_available_providers(self) -> list[TTSProvider]:
        """
        Get list of available providers in priority order.

        Returns:
            List of available provider instances.
        """
        providers = []

        # Add primary provider first
        if self.primary_provider and self.primary_provider.is_available():
            providers.append(self.primary_provider)

        # Add fallback provider if different from primary
        if (
            self.fallback_provider
            and self.fallback_provider.is_available()
            and self.fallback_provider != self.primary_provider
        ):
            providers.append(self.fallback_provider)

        return providers

    async def generate_audio(
        self,
        text: str,
        options: AudioGenerationOptions | None = None,
    ) -> AudioResult:
        """
        Generate audio using available providers with automatic fallback.

        Checks cache first if enabled. Falls back to alternative providers
        if primary fails.

        Args:
            text: The text to convert to speech.
            options: Optional generation options.

        Returns:
            AudioResult with generated audio and metadata.

        Raises:
            AllTTSProvidersFailedError: If all providers fail.
            TTSProviderError: If no providers are available.
        """
        if not self._settings.TTS_ENABLED:
            raise TTSProviderError(
                "TTS generation is disabled. Set TTS_ENABLED=true to enable."
            )

        providers = self.get_available_providers()
        if not providers:
            raise TTSProviderError(
                "No TTS providers available. Check provider configuration."
            )

        options = options or AudioGenerationOptions()

        # Normalize voice for cache key consistency
        # Use provided voice or "default" when none specified
        voice_for_cache = options.voice or "default"

        # Check cache first
        if self._cache is not None:
            cache_key = self._cache.get_cache_key(
                text=text,
                language=options.language,
                voice=voice_for_cache,
                format=options.format,
            )
            cached_audio = self._cache.get(cache_key)
            if cached_audio is not None:
                logger.info(f"Cache hit for text: {text[:30]}...")
                return AudioResult(
                    audio_data=cached_audio,
                    format=options.format,
                    duration_ms=0,  # Unknown from cache
                    voice_used=voice_for_cache,
                    provider="cache",
                    latency_ms=0,
                    cached=True,
                )

        errors: list[tuple[str, TTSProviderError]] = []

        for provider in providers:
            try:
                logger.info(f"Attempting TTS generation with provider: {provider.get_name()}")
                start_time = time.time()
                result = await provider.generate_audio(text, options)
                latency_ms = int((time.time() - start_time) * 1000)

                # Update latency if not set by provider
                if result.latency_ms == 0:
                    result = AudioResult(
                        audio_data=result.audio_data,
                        format=result.format,
                        duration_ms=result.duration_ms,
                        voice_used=result.voice_used,
                        provider=result.provider,
                        latency_ms=latency_ms,
                        cached=False,
                    )

                logger.info(
                    f"TTS generation successful with {provider.get_name()}: "
                    f"{len(result.audio_data)} bytes, {result.latency_ms}ms"
                )

                # Store in cache using same key as lookup
                if self._cache is not None:
                    cache_key = self._cache.get_cache_key(
                        text=text,
                        language=options.language,
                        voice=voice_for_cache,
                        format=result.format,
                    )
                    self._cache.set(cache_key, result.audio_data)

                return result

            except TTSRateLimitError as e:
                logger.warning(
                    f"Rate limit hit for {provider.get_name()}: {e.message}. "
                    f"Retry after: {e.retry_after_seconds}s"
                )
                errors.append((provider.get_name(), e))

            except TTSTimeoutError as e:
                logger.warning(f"Timeout for {provider.get_name()}: {e.message}")
                errors.append((provider.get_name(), e))

            except TTSProviderError as e:
                logger.warning(f"Provider {provider.get_name()} failed: {e.message}")
                errors.append((provider.get_name(), e))

        # All providers failed
        raise AllTTSProvidersFailedError(
            "All configured TTS providers failed",
            provider_errors=errors,
        )

    async def generate_audio_batch(
        self,
        items: list[BatchAudioItem],
    ) -> BatchAudioResult:
        """
        Generate audio for multiple texts with automatic fallback.

        Args:
            items: List of text and options pairs.

        Returns:
            BatchAudioResult with all generated audio.

        Raises:
            AllTTSProvidersFailedError: If all providers fail.
            TTSProviderError: If no providers are available.
        """
        if not self._settings.TTS_ENABLED:
            raise TTSProviderError(
                "TTS generation is disabled. Set TTS_ENABLED=true to enable."
            )

        providers = self.get_available_providers()
        if not providers:
            raise TTSProviderError(
                "No TTS providers available. Check provider configuration."
            )

        if not items:
            return BatchAudioResult(
                results=[],
                total_duration_ms=0,
                total_latency_ms=0,
                provider="none",
                success_count=0,
                failure_count=0,
            )

        errors: list[tuple[str, TTSProviderError]] = []
        start_time = time.time()

        for provider in providers:
            try:
                logger.info(
                    f"Attempting batch TTS generation with provider: {provider.get_name()} "
                    f"({len(items)} items)"
                )
                result = await provider.generate_audio_batch(items)
                total_latency = int((time.time() - start_time) * 1000)

                # Update total latency if not set
                if result.total_latency_ms == 0:
                    result = BatchAudioResult(
                        results=result.results,
                        total_duration_ms=result.total_duration_ms,
                        total_latency_ms=total_latency,
                        provider=result.provider,
                        success_count=result.success_count,
                        failure_count=result.failure_count,
                    )

                logger.info(
                    f"Batch TTS generation successful with {provider.get_name()}: "
                    f"{result.success_count}/{len(items)} items, {result.total_latency_ms}ms"
                )

                # Cache successful results
                if self._cache is not None:
                    for i, audio_result in enumerate(result.results):
                        if audio_result.audio_data:
                            item = items[i]
                            cache_key = self._cache.get_cache_key(
                                text=item.text,
                                language=item.options.language,
                                voice=audio_result.voice_used,
                                format=audio_result.format,
                            )
                            self._cache.set(cache_key, audio_result.audio_data)

                return result

            except TTSRateLimitError as e:
                logger.warning(
                    f"Rate limit hit for {provider.get_name()}: {e.message}. "
                    f"Retry after: {e.retry_after_seconds}s"
                )
                errors.append((provider.get_name(), e))

            except TTSTimeoutError as e:
                logger.warning(f"Timeout for {provider.get_name()}: {e.message}")
                errors.append((provider.get_name(), e))

            except TTSProviderError as e:
                logger.warning(f"Provider {provider.get_name()} failed: {e.message}")
                errors.append((provider.get_name(), e))

        # All providers failed
        raise AllTTSProvidersFailedError(
            "All configured TTS providers failed for batch generation",
            provider_errors=errors,
        )

    def is_available(self) -> bool:
        """
        Check if at least one provider is available.

        Returns:
            True if TTS is enabled and at least one provider is available.
        """
        if not self._settings.TTS_ENABLED:
            return False
        return len(self.get_available_providers()) > 0


# Global manager instance (lazy initialization)
_manager: TTSManager | None = None


def get_tts_manager() -> TTSManager:
    """
    Get the global TTS manager instance.

    Returns:
        Configured TTSManager instance.
    """
    global _manager
    if _manager is None:
        _manager = TTSManager()
    return _manager


def reset_tts_manager() -> None:
    """Reset the global TTS manager instance (for testing)."""
    global _manager
    _manager = None


def create_default_manager(settings: TTSSettings | None = None) -> TTSManager:
    """
    Create a manager with default providers registered.

    This factory function creates a TTSManager and registers
    the available providers based on configuration.

    Args:
        settings: Optional TTS settings. If None, loads from environment.

    Returns:
        Configured TTSManager with providers registered.
    """
    settings = settings or get_tts_settings()
    manager = TTSManager(settings=settings)

    # Register Edge TTS provider (always available, no API key needed)
    if settings.is_provider_configured(TTSProviderType.EDGE):
        from app.services.tts.providers.edge import EdgeTTSProvider

        edge = EdgeTTSProvider()
        manager.register_provider(TTSProviderType.EDGE, edge)

    # Azure TTS provider (fallback when Edge TTS fails)
    if settings.is_provider_configured(TTSProviderType.AZURE):
        from app.services.tts.providers.azure import AzureTTSProvider

        azure = AzureTTSProvider(settings=settings)
        manager.register_provider(TTSProviderType.AZURE, azure)

    logger.info(
        f"Created TTS manager with {len(manager.get_available_providers())} providers"
    )
    return manager
