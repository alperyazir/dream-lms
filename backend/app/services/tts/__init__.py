"""
TTS Service Module.

Provides abstracted TTS (Text-to-Speech) provider layer with
automatic fallback and audio caching support.
"""

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
from app.services.tts.cache import (
    AudioCache,
    AudioCacheKey,
    get_audio_cache,
    reset_audio_cache,
)
from app.services.tts.config import (
    TTSSettings,
    get_tts_settings,
    reset_tts_settings,
)
from app.services.tts.exceptions import (
    AllTTSProvidersFailedError,
    TTSAudioGenerationError,
    TTSAuthenticationError,
    TTSConnectionError,
    TTSProviderError,
    TTSRateLimitError,
    TTSTimeoutError,
    TTSUnsupportedLanguageError,
)
from app.services.tts.manager import (
    TTSManager,
    create_default_manager,
    get_tts_manager,
    reset_tts_manager,
)
from app.services.tts.providers import AzureTTSProvider, EdgeTTSProvider

__all__ = [
    # Base types and models
    "AudioFormat",
    "AudioGenerationOptions",
    "AudioResult",
    "BatchAudioItem",
    "BatchAudioResult",
    "TTSProvider",
    "TTSProviderType",
    "Voice",
    # Cache
    "AudioCache",
    "AudioCacheKey",
    "get_audio_cache",
    "reset_audio_cache",
    # Configuration
    "TTSSettings",
    "get_tts_settings",
    "reset_tts_settings",
    # Exceptions
    "AllTTSProvidersFailedError",
    "TTSAudioGenerationError",
    "TTSAuthenticationError",
    "TTSConnectionError",
    "TTSProviderError",
    "TTSRateLimitError",
    "TTSTimeoutError",
    "TTSUnsupportedLanguageError",
    # Manager
    "TTSManager",
    "create_default_manager",
    "get_tts_manager",
    "reset_tts_manager",
    # Providers
    "AzureTTSProvider",
    "EdgeTTSProvider",
]
