"""
TTS Audio Cache Service.

In-memory cache for generated audio with TTL support.
Redis caching can be added in Phase 2 for persistence.
"""

import hashlib
import logging
import threading
import time
from typing import NamedTuple

from pydantic import BaseModel, Field

from app.services.tts.base import AudioFormat

logger = logging.getLogger(__name__)


class AudioCacheKey(BaseModel):
    """Cache key components for audio lookup."""

    text_hash: str = Field(
        description="SHA256 hash of normalized text.",
    )
    language: str = Field(
        description="Language code.",
    )
    voice: str = Field(
        description="Voice ID used for generation.",
    )
    format: AudioFormat = Field(
        description="Audio format.",
    )

    def to_string(self) -> str:
        """Convert to string key for dict lookup."""
        return f"{self.text_hash}:{self.language}:{self.voice}:{self.format.value}"

    @classmethod
    def from_string(cls, key_str: str) -> "AudioCacheKey":
        """Parse from string key."""
        parts = key_str.split(":")
        if len(parts) != 4:
            raise ValueError(f"Invalid cache key format: {key_str}")
        return cls(
            text_hash=parts[0],
            language=parts[1],
            voice=parts[2],
            format=AudioFormat(parts[3]),
        )


class CacheEntry(NamedTuple):
    """Internal cache entry with data and expiration."""

    audio_data: bytes
    expires_at: float


class AudioCache:
    """
    In-memory audio cache with TTL support.

    Thread-safe implementation using a lock for concurrent access.
    Automatically cleans up expired entries on access.
    """

    def __init__(self, default_ttl_hours: int = 24) -> None:
        """
        Initialize the audio cache.

        Args:
            default_ttl_hours: Default TTL for cache entries in hours.
        """
        self._cache: dict[str, CacheEntry] = {}
        self._lock = threading.Lock()
        self._default_ttl_seconds = default_ttl_hours * 3600
        self._hit_count = 0
        self._miss_count = 0

    @staticmethod
    def _hash_text(text: str) -> str:
        """
        Generate SHA256 hash of normalized text.

        Args:
            text: Text to hash.

        Returns:
            Hex digest of the hash.
        """
        normalized = text.strip().lower()
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def get_cache_key(
        self,
        text: str,
        language: str,
        voice: str,
        format: AudioFormat,
    ) -> AudioCacheKey:
        """
        Generate a cache key for the given parameters.

        Args:
            text: Text that was converted to speech.
            language: Language code.
            voice: Voice ID used.
            format: Audio format.

        Returns:
            AudioCacheKey for cache lookup.
        """
        return AudioCacheKey(
            text_hash=self._hash_text(text),
            language=language.lower(),
            voice=voice.lower(),
            format=format,
        )

    def get(self, key: AudioCacheKey) -> bytes | None:
        """
        Get audio data from cache.

        Args:
            key: Cache key to lookup.

        Returns:
            Audio data if found and not expired, None otherwise.
        """
        key_str = key.to_string()

        with self._lock:
            entry = self._cache.get(key_str)

            if entry is None:
                self._miss_count += 1
                logger.debug(f"Cache miss for key: {key_str[:50]}...")
                return None

            # Check expiration
            if time.time() > entry.expires_at:
                del self._cache[key_str]
                self._miss_count += 1
                logger.debug(f"Cache expired for key: {key_str[:50]}...")
                return None

            self._hit_count += 1
            logger.debug(f"Cache hit for key: {key_str[:50]}...")
            return entry.audio_data

    def set(
        self,
        key: AudioCacheKey,
        audio_data: bytes,
        ttl_seconds: int | None = None,
    ) -> None:
        """
        Store audio data in cache.

        Args:
            key: Cache key.
            audio_data: Audio data to store.
            ttl_seconds: Optional TTL override in seconds.
        """
        key_str = key.to_string()
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl_seconds
        expires_at = time.time() + ttl

        with self._lock:
            self._cache[key_str] = CacheEntry(
                audio_data=audio_data,
                expires_at=expires_at,
            )
            logger.debug(
                f"Cached audio for key: {key_str[:50]}... "
                f"(size: {len(audio_data)} bytes, ttl: {ttl}s)"
            )

    def delete(self, key: AudioCacheKey) -> bool:
        """
        Delete an entry from cache.

        Args:
            key: Cache key to delete.

        Returns:
            True if entry was deleted, False if not found.
        """
        key_str = key.to_string()

        with self._lock:
            if key_str in self._cache:
                del self._cache[key_str]
                logger.debug(f"Deleted cache entry: {key_str[:50]}...")
                return True
            return False

    def clear(self) -> int:
        """
        Clear all cache entries.

        Returns:
            Number of entries cleared.
        """
        with self._lock:
            count = len(self._cache)
            self._cache.clear()
            self._hit_count = 0
            self._miss_count = 0
            logger.info(f"Cleared {count} cache entries")
            return count

    def cleanup_expired(self) -> int:
        """
        Remove all expired entries from cache.

        Returns:
            Number of entries removed.
        """
        current_time = time.time()
        removed = 0

        with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items()
                if current_time > entry.expires_at
            ]
            for key in expired_keys:
                del self._cache[key]
                removed += 1

            if removed > 0:
                logger.info(f"Cleaned up {removed} expired cache entries")

        return removed

    @property
    def size(self) -> int:
        """Get current number of cache entries."""
        with self._lock:
            return len(self._cache)

    @property
    def hit_count(self) -> int:
        """Get total cache hits."""
        return self._hit_count

    @property
    def miss_count(self) -> int:
        """Get total cache misses."""
        return self._miss_count

    @property
    def hit_rate(self) -> float:
        """Get cache hit rate (0.0 to 1.0)."""
        total = self._hit_count + self._miss_count
        if total == 0:
            return 0.0
        return self._hit_count / total

    def get_stats(self) -> dict:
        """
        Get cache statistics.

        Returns:
            Dict with cache stats.
        """
        return {
            "size": self.size,
            "hit_count": self._hit_count,
            "miss_count": self._miss_count,
            "hit_rate": round(self.hit_rate, 4),
        }


# Global cache instance
_audio_cache: AudioCache | None = None


def get_audio_cache(ttl_hours: int = 24) -> AudioCache:
    """
    Get global audio cache instance.

    Args:
        ttl_hours: Default TTL for cache entries.

    Returns:
        AudioCache instance.
    """
    global _audio_cache
    if _audio_cache is None:
        _audio_cache = AudioCache(default_ttl_hours=ttl_hours)
    return _audio_cache


def reset_audio_cache() -> None:
    """Reset global audio cache instance (for testing)."""
    global _audio_cache
    if _audio_cache is not None:
        _audio_cache.clear()
    _audio_cache = None
