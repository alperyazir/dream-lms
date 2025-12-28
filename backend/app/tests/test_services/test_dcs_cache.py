"""
Tests for DCS Cache Module.

Story 24.1: LMS Caching Infrastructure
"""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from app.services.dcs_cache import (
    CacheEntry,
    CacheKeys,
    DCSCache,
    get_dcs_cache,
    reset_dcs_cache,
)


class TestCacheEntry:
    """Tests for CacheEntry class."""

    def test_cache_entry_stores_value(self) -> None:
        """Test that CacheEntry correctly stores the value."""
        entry = CacheEntry(value="test_data", ttl_seconds=300)
        assert entry.value == "test_data"

    def test_cache_entry_not_expired_within_ttl(self) -> None:
        """Test that entry is not expired within TTL."""
        entry = CacheEntry(value="test_data", ttl_seconds=300)
        assert entry.is_expired is False

    def test_cache_entry_expired_after_ttl(self) -> None:
        """Test that entry is expired after TTL."""
        entry = CacheEntry(value="test_data", ttl_seconds=0)
        # Entry with 0 second TTL should be immediately expired
        assert entry.is_expired is True

    def test_cache_entry_stores_complex_data(self) -> None:
        """Test that CacheEntry can store complex data structures."""
        data = {"publishers": [{"id": "1", "name": "Test"}], "count": 1}
        entry = CacheEntry(value=data, ttl_seconds=300)
        assert entry.value == data
        assert entry.value["publishers"][0]["name"] == "Test"


class TestDCSCache:
    """Tests for DCSCache class."""

    @pytest.fixture
    def cache(self) -> DCSCache:
        """Create a fresh cache instance for each test."""
        return DCSCache(default_ttl=300)

    @pytest.mark.asyncio
    async def test_get_returns_none_for_missing_key(self, cache: DCSCache) -> None:
        """Test that get returns None for non-existent key."""
        result = await cache.get("nonexistent_key")
        assert result is None

    @pytest.mark.asyncio
    async def test_set_and_get_value(self, cache: DCSCache) -> None:
        """Test setting and getting a value."""
        await cache.set("test_key", "test_value")
        result = await cache.get("test_key")
        assert result == "test_value"

    @pytest.mark.asyncio
    async def test_set_with_custom_ttl(self, cache: DCSCache) -> None:
        """Test setting a value with custom TTL."""
        await cache.set("test_key", "test_value", ttl=600)
        result = await cache.get("test_key")
        assert result == "test_value"

    @pytest.mark.asyncio
    async def test_get_expired_value_returns_none(self, cache: DCSCache) -> None:
        """Test that expired values return None."""
        # Use very short TTL and wait for expiration
        await cache.set("test_key", "test_value", ttl=1)
        # Wait for expiration
        await asyncio.sleep(1.1)
        result = await cache.get("test_key")
        assert result is None

    @pytest.mark.asyncio
    async def test_invalidate_existing_key(self, cache: DCSCache) -> None:
        """Test invalidating an existing key."""
        await cache.set("test_key", "test_value")
        result = await cache.invalidate("test_key")
        assert result is True
        assert await cache.get("test_key") is None

    @pytest.mark.asyncio
    async def test_invalidate_nonexistent_key(self, cache: DCSCache) -> None:
        """Test invalidating a non-existent key."""
        result = await cache.invalidate("nonexistent_key")
        assert result is False

    @pytest.mark.asyncio
    async def test_invalidate_pattern(self, cache: DCSCache) -> None:
        """Test invalidating keys by pattern (prefix match)."""
        # Set up multiple keys with common prefix
        await cache.set("dcs:publishers:id:1", "publisher1")
        await cache.set("dcs:publishers:id:2", "publisher2")
        await cache.set("dcs:publishers:list", "publishers_list")
        await cache.set("dcs:books:id:1", "book1")

        # Invalidate all publisher keys
        count = await cache.invalidate_pattern("dcs:publishers:")
        assert count == 3

        # Publisher keys should be gone
        assert await cache.get("dcs:publishers:id:1") is None
        assert await cache.get("dcs:publishers:id:2") is None
        assert await cache.get("dcs:publishers:list") is None

        # Book key should still exist
        assert await cache.get("dcs:books:id:1") == "book1"

    @pytest.mark.asyncio
    async def test_invalidate_pattern_no_matches(self, cache: DCSCache) -> None:
        """Test invalidating pattern with no matches."""
        await cache.set("dcs:publishers:id:1", "publisher1")
        count = await cache.invalidate_pattern("dcs:nonexistent:")
        assert count == 0

    @pytest.mark.asyncio
    async def test_get_or_fetch_cache_hit(self, cache: DCSCache) -> None:
        """Test get_or_fetch returns cached value without calling fetch function."""
        await cache.set("test_key", "cached_value")
        fetch_fn = AsyncMock(return_value="fresh_value")

        result = await cache.get_or_fetch("test_key", fetch_fn)

        assert result == "cached_value"
        fetch_fn.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_or_fetch_cache_miss(self, cache: DCSCache) -> None:
        """Test get_or_fetch calls fetch function on cache miss."""
        fetch_fn = AsyncMock(return_value="fresh_value")

        result = await cache.get_or_fetch("test_key", fetch_fn)

        assert result == "fresh_value"
        fetch_fn.assert_called_once()

        # Value should now be cached
        assert await cache.get("test_key") == "fresh_value"

    @pytest.mark.asyncio
    async def test_get_or_fetch_with_custom_ttl(self, cache: DCSCache) -> None:
        """Test get_or_fetch with custom TTL."""
        fetch_fn = AsyncMock(return_value="fresh_value")

        result = await cache.get_or_fetch("test_key", fetch_fn, ttl=600)

        assert result == "fresh_value"
        fetch_fn.assert_called_once()

    @pytest.mark.asyncio
    async def test_stats_initial(self, cache: DCSCache) -> None:
        """Test initial cache statistics."""
        stats = cache.stats()
        assert stats["entries"] == 0
        assert stats["hits"] == 0
        assert stats["misses"] == 0
        assert stats["hit_rate"] == 0.0

    @pytest.mark.asyncio
    async def test_stats_after_operations(self, cache: DCSCache) -> None:
        """Test cache statistics after various operations."""
        # Miss
        await cache.get("nonexistent")

        # Set and hit
        await cache.set("test_key", "test_value")
        await cache.get("test_key")
        await cache.get("test_key")

        stats = cache.stats()
        assert stats["entries"] == 1
        assert stats["hits"] == 2
        assert stats["misses"] == 1
        assert stats["hit_rate"] == pytest.approx(2 / 3)

    @pytest.mark.asyncio
    async def test_clear(self, cache: DCSCache) -> None:
        """Test clearing all cache entries."""
        await cache.set("key1", "value1")
        await cache.set("key2", "value2")
        await cache.set("key3", "value3")

        await cache.clear()

        assert await cache.get("key1") is None
        assert await cache.get("key2") is None
        assert await cache.get("key3") is None

        stats = cache.stats()
        assert stats["entries"] == 0

    def test_reset_stats(self, cache: DCSCache) -> None:
        """Test resetting cache statistics."""
        cache._hits = 10
        cache._misses = 5

        cache.reset_stats()

        assert cache._hits == 0
        assert cache._misses == 0

    @pytest.mark.asyncio
    async def test_concurrent_access(self, cache: DCSCache) -> None:
        """Test concurrent access to cache."""

        async def set_value(key: str, value: str) -> None:
            await cache.set(key, value)

        async def get_value(key: str) -> str | None:
            return await cache.get(key)

        # Run multiple concurrent operations
        await asyncio.gather(
            set_value("key1", "value1"),
            set_value("key2", "value2"),
            set_value("key3", "value3"),
        )

        # Verify all values are set correctly
        results = await asyncio.gather(
            get_value("key1"),
            get_value("key2"),
            get_value("key3"),
        )

        assert results == ["value1", "value2", "value3"]


class TestCacheKeys:
    """Tests for CacheKeys helper class."""

    def test_publisher_list_key(self) -> None:
        """Test publisher list cache key constant."""
        assert CacheKeys.PUBLISHER_LIST == "dcs:publishers:list"

    def test_publisher_by_id(self) -> None:
        """Test publisher_by_id key generation."""
        key = CacheKeys.publisher_by_id("uuid-123")
        assert key == "dcs:publishers:id:uuid-123"

    def test_publisher_logo(self) -> None:
        """Test publisher_logo key generation."""
        key = CacheKeys.publisher_logo("uuid-123")
        assert key == "dcs:publishers:logo:uuid-123"

    def test_book_list_key(self) -> None:
        """Test book list cache key constant."""
        assert CacheKeys.BOOK_LIST == "dcs:books:list"

    def test_book_by_id(self) -> None:
        """Test book_by_id key generation."""
        key = CacheKeys.book_by_id("book-uuid-456")
        assert key == "dcs:books:id:book-uuid-456"

    def test_book_config(self) -> None:
        """Test book_config key generation."""
        key = CacheKeys.book_config("book-uuid-456")
        assert key == "dcs:books:config:book-uuid-456"

    def test_books_by_publisher(self) -> None:
        """Test books_by_publisher key generation."""
        key = CacheKeys.books_by_publisher("publisher-uuid-789")
        assert key == "dcs:books:publisher:publisher-uuid-789"


class TestSingleton:
    """Tests for singleton cache instance."""

    def test_get_dcs_cache_returns_same_instance(self) -> None:
        """Test that get_dcs_cache returns the same instance."""
        reset_dcs_cache()  # Reset for clean test

        with patch("app.core.config.settings") as mock_settings:
            mock_settings.DCS_CACHE_DEFAULT_TTL = 300

            cache1 = get_dcs_cache()
            cache2 = get_dcs_cache()

            assert cache1 is cache2

        # Clean up
        reset_dcs_cache()

    def test_reset_dcs_cache(self) -> None:
        """Test that reset_dcs_cache creates a new instance."""
        with patch("app.core.config.settings") as mock_settings:
            mock_settings.DCS_CACHE_DEFAULT_TTL = 300

            cache1 = get_dcs_cache()
            reset_dcs_cache()
            cache2 = get_dcs_cache()

            assert cache1 is not cache2

        # Clean up
        reset_dcs_cache()


class TestCacheTTLExpiration:
    """Tests for TTL expiration behavior."""

    @pytest.mark.asyncio
    async def test_entry_expires_correctly(self) -> None:
        """Test that entries expire after their TTL."""
        cache = DCSCache(default_ttl=1)  # 1 second TTL

        await cache.set("test_key", "test_value")
        assert await cache.get("test_key") == "test_value"

        # Wait for expiration
        await asyncio.sleep(1.1)

        # Should be expired now
        result = await cache.get("test_key")
        assert result is None

    @pytest.mark.asyncio
    async def test_different_ttls_for_different_keys(self) -> None:
        """Test that different keys can have different TTLs."""
        cache = DCSCache(default_ttl=300)

        await cache.set("short_lived", "value1", ttl=1)
        await cache.set("long_lived", "value2", ttl=300)

        # Both should exist initially
        assert await cache.get("short_lived") == "value1"
        assert await cache.get("long_lived") == "value2"

        # Wait for short-lived to expire
        await asyncio.sleep(1.1)

        # Short-lived should be gone, long-lived should remain
        assert await cache.get("short_lived") is None
        assert await cache.get("long_lived") == "value2"
