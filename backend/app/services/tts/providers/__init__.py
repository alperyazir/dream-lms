"""
TTS Provider Implementations.

Provider implementations:
- Edge TTS Provider (Story 27.5)
- Azure TTS Provider (Story 27.6)
"""

from app.services.tts.providers.edge import EdgeTTSProvider

__all__ = ["EdgeTTSProvider"]

try:
    from app.services.tts.providers.azure import AzureTTSProvider

    __all__.append("AzureTTSProvider")
except ImportError:
    AzureTTSProvider = None  # type: ignore[assignment,misc]
