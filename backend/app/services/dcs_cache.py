"""
DCS Cache Module.

Provides an in-memory caching layer for DCS API responses to reduce
excessive API calls and improve performance.
"""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from typing import Any, Generic, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CacheEntry(Generic[T]):
    """Represents a single cache entry with TTL expiration."""

    def __init__(self, value: T, ttl_seconds: int) -> None:
        self.value = value
        self.expires_at = datetime.now(UTC) + timedelta(seconds=ttl_seconds)

    @property
    def is_expired(self) -> bool:
        """Check if this cache entry has expired."""
        return datetime.now(UTC) > self.expires_at


class DCSCache:
    """
    In-memory cache for DCS API responses.

    Provides thread-safe caching with configurable TTL, pattern-based
    invalidation, and cache statistics for monitoring.

    Example:
        cache = DCSCache(default_ttl=300)  # 5 minutes
        await cache.set("dcs:publishers:list", publishers)
        result = await cache.get("dcs:publishers:list")
    """

    def __init__(self, default_ttl: int = 300) -> None:
        """
        Initialize DCS cache.

        Args:
            default_ttl: Default time-to-live in seconds (default: 5 minutes)
        """
        self._cache: dict[str, CacheEntry[Any]] = {}
        self._default_ttl = default_ttl
        self._lock = asyncio.Lock()
        self._hits = 0
        self._misses = 0

    async def get(self, key: str) -> Any | None:
        """
        Get value from cache.

        Returns None if key is missing or expired.

        Args:
            key: Cache key to retrieve

        Returns:
            Cached value or None if not found/expired
        """
        entry = self._cache.get(key)
        if entry is None:
            self._misses += 1
            return None
        if entry.is_expired:
            async with self._lock:
                # Double-check after acquiring lock
                if key in self._cache and self._cache[key].is_expired:
                    del self._cache[key]
            self._misses += 1
            return None
        self._hits += 1
        return entry.value

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """
        Set value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Optional TTL in seconds (uses default if not provided)
        """
        async with self._lock:
            self._cache[key] = CacheEntry(value, ttl or self._default_ttl)

    async def invalidate(self, key: str) -> bool:
        """
        Invalidate specific cache entry.

        Args:
            key: Cache key to invalidate

        Returns:
            True if key was found and removed, False otherwise
        """
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                logger.info(f"Cache invalidated: {key}")
                return True
            return False

    async def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalidate all entries matching pattern (prefix match).

        Args:
            pattern: Prefix pattern to match against cache keys

        Returns:
            Number of entries invalidated
        """
        async with self._lock:
            keys_to_delete = [k for k in self._cache.keys() if k.startswith(pattern)]
            for key in keys_to_delete:
                del self._cache[key]
            if keys_to_delete:
                logger.info(
                    f"Cache invalidated {len(keys_to_delete)} entries matching: {pattern}"
                )
            return len(keys_to_delete)

    async def get_or_fetch(
        self,
        key: str,
        fetch_fn: Callable[[], Awaitable[T]],
        ttl: int | None = None,
    ) -> T:
        """
        Get from cache or fetch and cache.

        This is the primary method for cache-aside pattern. If the value
        exists in cache and hasn't expired, return it. Otherwise, call
        fetch_fn to get fresh data and cache it.

        Args:
            key: Cache key
            fetch_fn: Async function to call if cache miss
            ttl: Optional TTL for cached result

        Returns:
            Cached or freshly fetched value
        """
        value = await self.get(key)
        if value is not None:
            return value

        value = await fetch_fn()
        await self.set(key, value, ttl)
        return value

    def stats(self) -> dict[str, Any]:
        """
        Return cache statistics for monitoring.

        Returns:
            Dict containing entries count, hits, misses, and hit rate
        """
        total = self._hits + self._misses
        return {
            "entries": len(self._cache),
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": self._hits / total if total > 0 else 0.0,
        }

    async def clear(self) -> None:
        """Clear all cache entries."""
        async with self._lock:
            count = len(self._cache)
            self._cache.clear()
            logger.info(f"Cache cleared ({count} entries)")

    def reset_stats(self) -> None:
        """Reset cache statistics counters."""
        self._hits = 0
        self._misses = 0


# Cache key patterns for consistent naming
class CacheKeys:
    """
    Cache key patterns for DCS entities.

    Use these constants to ensure consistent cache key naming.
    """

    # Publisher keys
    PUBLISHER_LIST = "dcs:publishers:list"
    PUBLISHER_BY_ID = "dcs:publishers:id:{id}"
    PUBLISHER_LOGO = "dcs:publishers:logo:{id}"

    # Book keys
    BOOK_LIST = "dcs:books:list"
    BOOK_LIST_BY_PUBLISHER = "dcs:books:publisher:{publisher_id}"
    BOOK_BY_ID = "dcs:books:id:{id}"
    BOOK_CONFIG = "dcs:books:config:{id}"

    # AI Data keys (Story 27.7)
    AI_METADATA = "dcs:ai:metadata:{book_id}"
    AI_MODULES = "dcs:ai:modules:{book_id}"
    AI_MODULES_METADATA = "dcs:ai:modules:metadata:{book_id}"
    AI_MODULE_DETAIL = "dcs:ai:module:{book_id}:{module_id}"
    AI_VOCABULARY = "dcs:ai:vocabulary:{book_id}"
    AI_VOCABULARY_MODULE = "dcs:ai:vocabulary:{book_id}:{module_id}"
    AI_AUDIO_URL = "dcs:ai:audio:{book_id}:{lang}:{word}"

    # AI Data TTL constants (in seconds)
    AI_METADATA_TTL = 60  # 1 minute - may change during processing
    AI_MODULES_TTL = 300  # 5 minutes - relatively static
    AI_VOCABULARY_TTL = 300  # 5 minutes - relatively static
    AI_AUDIO_URL_TTL = 3600  # 1 hour - presigned URLs valid for 1 hour

    @staticmethod
    def publisher_by_id(publisher_id: str) -> str:
        """Get cache key for specific publisher."""
        return CacheKeys.PUBLISHER_BY_ID.format(id=publisher_id)

    @staticmethod
    def publisher_logo(publisher_id: str) -> str:
        """Get cache key for publisher logo."""
        return CacheKeys.PUBLISHER_LOGO.format(id=publisher_id)

    @staticmethod
    def book_by_id(book_id: str) -> str:
        """Get cache key for specific book."""
        return CacheKeys.BOOK_BY_ID.format(id=book_id)

    @staticmethod
    def book_config(book_id: str) -> str:
        """Get cache key for book config."""
        return CacheKeys.BOOK_CONFIG.format(id=book_id)

    @staticmethod
    def books_by_publisher(publisher_id: str) -> str:
        """Get cache key for books by publisher."""
        return CacheKeys.BOOK_LIST_BY_PUBLISHER.format(publisher_id=publisher_id)

    # AI Data key helpers
    @staticmethod
    def ai_metadata(book_id: int) -> str:
        """Get cache key for AI processing metadata."""
        return CacheKeys.AI_METADATA.format(book_id=book_id)

    @staticmethod
    def ai_modules(book_id: int) -> str:
        """Get cache key for AI module list."""
        return CacheKeys.AI_MODULES.format(book_id=book_id)

    @staticmethod
    def ai_modules_metadata(book_id: int) -> str:
        """Get cache key for AI modules metadata (includes topics, vocabulary counts)."""
        return CacheKeys.AI_MODULES_METADATA.format(book_id=book_id)

    @staticmethod
    def ai_module_detail(book_id: int, module_id: int) -> str:
        """Get cache key for AI module detail."""
        return CacheKeys.AI_MODULE_DETAIL.format(book_id=book_id, module_id=module_id)

    @staticmethod
    def ai_vocabulary(book_id: int, module_id: int | None = None) -> str:
        """Get cache key for AI vocabulary (with optional module filter)."""
        if module_id is not None:
            return CacheKeys.AI_VOCABULARY_MODULE.format(
                book_id=book_id, module_id=module_id
            )
        return CacheKeys.AI_VOCABULARY.format(book_id=book_id)

    @staticmethod
    def ai_audio_url(book_id: int, lang: str, word: str) -> str:
        """Get cache key for AI audio presigned URL."""
        return CacheKeys.AI_AUDIO_URL.format(book_id=book_id, lang=lang, word=word)


# Singleton instance
_dcs_cache: DCSCache | None = None


def get_dcs_cache() -> DCSCache:
    """
    Get singleton DCS cache instance.

    Uses lazy initialization to create the cache on first access.

    Returns:
        DCSCache singleton instance
    """
    global _dcs_cache
    if _dcs_cache is None:
        # Import here to avoid circular imports
        from app.core.config import settings

        _dcs_cache = DCSCache(default_ttl=settings.DCS_CACHE_DEFAULT_TTL)
    return _dcs_cache


def reset_dcs_cache() -> None:
    """
    Reset the singleton cache instance.

    Primarily used for testing to ensure clean state.
    """
    global _dcs_cache
    _dcs_cache = None
