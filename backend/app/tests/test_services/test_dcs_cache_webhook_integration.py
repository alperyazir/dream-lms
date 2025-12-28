"""
Integration Tests for DCS Cache and Webhook Invalidation.

Story 24.1: LMS Caching Infrastructure

Tests that cache invalidation patterns work correctly for webhook events.
"""

import uuid

import pytest

from app.services.dcs_cache import CacheKeys, DCSCache, get_dcs_cache, reset_dcs_cache


@pytest.fixture
def fresh_cache() -> DCSCache:
    """Reset and return a fresh cache instance for each test."""
    reset_dcs_cache()
    return get_dcs_cache()


class TestWebhookCacheInvalidationPatterns:
    """Test cache invalidation patterns used by webhook handlers."""

    @pytest.mark.asyncio
    async def test_book_created_invalidation_pattern(
        self, fresh_cache: DCSCache
    ) -> None:
        """Test the cache invalidation pattern for book.created events."""
        # Setup: populate cache with book data
        await fresh_cache.set(CacheKeys.BOOK_LIST, ["book1", "book2"])
        await fresh_cache.set(CacheKeys.books_by_publisher("pub-1"), ["book1"])
        await fresh_cache.set(CacheKeys.books_by_publisher("pub-2"), ["book2"])

        # Simulate the invalidation pattern from webhook handler
        await fresh_cache.invalidate(CacheKeys.BOOK_LIST)
        await fresh_cache.invalidate_pattern("dcs:books:publisher:")

        # Verify caches were invalidated
        assert await fresh_cache.get(CacheKeys.BOOK_LIST) is None
        assert await fresh_cache.get(CacheKeys.books_by_publisher("pub-1")) is None
        assert await fresh_cache.get(CacheKeys.books_by_publisher("pub-2")) is None

    @pytest.mark.asyncio
    async def test_book_updated_invalidation_pattern(
        self, fresh_cache: DCSCache
    ) -> None:
        """Test the cache invalidation pattern for book.updated events."""
        book_id = str(uuid.uuid4())

        # Setup: populate cache with book data
        await fresh_cache.set(CacheKeys.book_by_id(book_id), {"id": book_id, "title": "Old Title"})
        await fresh_cache.set(CacheKeys.book_config(book_id), {"config": "data"})
        await fresh_cache.set(CacheKeys.BOOK_LIST, ["books"])

        # Other book should not be affected
        other_book_id = str(uuid.uuid4())
        await fresh_cache.set(CacheKeys.book_by_id(other_book_id), {"id": other_book_id})

        # Simulate the invalidation pattern from webhook handler
        await fresh_cache.invalidate(CacheKeys.book_by_id(book_id))
        await fresh_cache.invalidate(CacheKeys.book_config(book_id))
        await fresh_cache.invalidate(CacheKeys.BOOK_LIST)

        # Verify specific caches were invalidated
        assert await fresh_cache.get(CacheKeys.book_by_id(book_id)) is None
        assert await fresh_cache.get(CacheKeys.book_config(book_id)) is None
        assert await fresh_cache.get(CacheKeys.BOOK_LIST) is None

        # Other book should still be cached
        assert await fresh_cache.get(CacheKeys.book_by_id(other_book_id)) is not None

    @pytest.mark.asyncio
    async def test_book_deleted_invalidation_pattern(
        self, fresh_cache: DCSCache
    ) -> None:
        """Test the cache invalidation pattern for book.deleted events."""
        book_id = str(uuid.uuid4())

        # Setup: populate cache
        await fresh_cache.set(CacheKeys.book_by_id(book_id), {"id": book_id})
        await fresh_cache.set(CacheKeys.BOOK_LIST, ["books"])

        # Simulate the invalidation pattern from webhook handler
        await fresh_cache.invalidate_pattern(f"dcs:books:id:{book_id}")
        await fresh_cache.invalidate(CacheKeys.BOOK_LIST)

        # Verify caches were invalidated
        assert await fresh_cache.get(CacheKeys.book_by_id(book_id)) is None
        assert await fresh_cache.get(CacheKeys.BOOK_LIST) is None

    @pytest.mark.asyncio
    async def test_publisher_created_invalidation_pattern(
        self, fresh_cache: DCSCache
    ) -> None:
        """Test the cache invalidation pattern for publisher.created events."""
        # Setup: populate cache
        await fresh_cache.set(CacheKeys.PUBLISHER_LIST, ["pub1", "pub2"])

        # Simulate the invalidation pattern from webhook handler
        await fresh_cache.invalidate(CacheKeys.PUBLISHER_LIST)

        # Verify list cache was invalidated
        assert await fresh_cache.get(CacheKeys.PUBLISHER_LIST) is None

    @pytest.mark.asyncio
    async def test_publisher_updated_invalidation_pattern(
        self, fresh_cache: DCSCache
    ) -> None:
        """Test the cache invalidation pattern for publisher.updated events."""
        publisher_id = str(uuid.uuid4())

        # Setup: populate cache
        await fresh_cache.set(CacheKeys.publisher_by_id(publisher_id), {"id": publisher_id})
        await fresh_cache.set(CacheKeys.publisher_logo(publisher_id), "logo_url")
        await fresh_cache.set(CacheKeys.PUBLISHER_LIST, ["publishers"])

        # Other publisher should not be affected
        other_pub_id = str(uuid.uuid4())
        await fresh_cache.set(CacheKeys.publisher_by_id(other_pub_id), {"id": other_pub_id})

        # Simulate the invalidation pattern from webhook handler
        await fresh_cache.invalidate(CacheKeys.publisher_by_id(publisher_id))
        await fresh_cache.invalidate(CacheKeys.publisher_logo(publisher_id))
        await fresh_cache.invalidate(CacheKeys.PUBLISHER_LIST)

        # Verify specific caches were invalidated
        assert await fresh_cache.get(CacheKeys.publisher_by_id(publisher_id)) is None
        assert await fresh_cache.get(CacheKeys.publisher_logo(publisher_id)) is None
        assert await fresh_cache.get(CacheKeys.PUBLISHER_LIST) is None

        # Other publisher should still be cached
        assert await fresh_cache.get(CacheKeys.publisher_by_id(other_pub_id)) is not None

    @pytest.mark.asyncio
    async def test_publisher_deleted_invalidation_pattern(
        self, fresh_cache: DCSCache
    ) -> None:
        """Test the cache invalidation pattern for publisher.deleted events."""
        publisher_id = str(uuid.uuid4())

        # Setup: populate cache with publisher and their books
        await fresh_cache.set(CacheKeys.publisher_by_id(publisher_id), {"id": publisher_id})
        await fresh_cache.set(CacheKeys.publisher_logo(publisher_id), "logo_url")
        await fresh_cache.set(CacheKeys.PUBLISHER_LIST, ["publishers"])
        await fresh_cache.set(CacheKeys.books_by_publisher(publisher_id), ["book1", "book2"])

        # Simulate the invalidation pattern from webhook handler
        await fresh_cache.invalidate_pattern(f"dcs:publishers:id:{publisher_id}")
        await fresh_cache.invalidate_pattern(f"dcs:publishers:logo:{publisher_id}")
        await fresh_cache.invalidate(CacheKeys.PUBLISHER_LIST)
        await fresh_cache.invalidate_pattern(f"dcs:books:publisher:{publisher_id}")

        # Verify all related caches were invalidated
        assert await fresh_cache.get(CacheKeys.publisher_by_id(publisher_id)) is None
        assert await fresh_cache.get(CacheKeys.publisher_logo(publisher_id)) is None
        assert await fresh_cache.get(CacheKeys.PUBLISHER_LIST) is None
        assert await fresh_cache.get(CacheKeys.books_by_publisher(publisher_id)) is None


class TestCacheStatsEndpoint:
    """Tests for cache stats admin endpoint."""

    @pytest.mark.asyncio
    async def test_cache_stats_reflect_operations(self, fresh_cache: DCSCache) -> None:
        """Test that cache stats accurately reflect operations."""
        # Initial stats
        stats = fresh_cache.stats()
        assert stats["entries"] == 0
        assert stats["hits"] == 0
        assert stats["misses"] == 0

        # Perform operations
        await fresh_cache.set("key1", "value1")
        await fresh_cache.get("key1")  # hit
        await fresh_cache.get("key1")  # hit
        await fresh_cache.get("nonexistent")  # miss

        stats = fresh_cache.stats()
        assert stats["entries"] == 1
        assert stats["hits"] == 2
        assert stats["misses"] == 1
        assert stats["hit_rate"] == pytest.approx(2 / 3)

    @pytest.mark.asyncio
    async def test_clear_resets_entries_but_not_stats(self, fresh_cache: DCSCache) -> None:
        """Test that clear removes entries but preserves stats."""
        await fresh_cache.set("key1", "value1")
        await fresh_cache.get("key1")  # hit

        await fresh_cache.clear()

        stats = fresh_cache.stats()
        assert stats["entries"] == 0  # Entries cleared
        assert stats["hits"] == 1  # Stats preserved


class TestCacheKeyConsistency:
    """Test that cache keys are consistent and well-formed."""

    def test_all_keys_have_dcs_prefix(self) -> None:
        """Verify all cache keys start with 'dcs:' prefix."""
        assert CacheKeys.PUBLISHER_LIST.startswith("dcs:")
        assert CacheKeys.BOOK_LIST.startswith("dcs:")
        assert CacheKeys.publisher_by_id("123").startswith("dcs:")
        assert CacheKeys.book_by_id("456").startswith("dcs:")
        assert CacheKeys.publisher_logo("123").startswith("dcs:")
        assert CacheKeys.book_config("456").startswith("dcs:")
        assert CacheKeys.books_by_publisher("789").startswith("dcs:")

    def test_keys_have_consistent_naming(self) -> None:
        """Verify cache keys follow consistent naming pattern."""
        # Publisher keys should have 'publishers' segment
        assert "publishers" in CacheKeys.PUBLISHER_LIST
        assert "publishers" in CacheKeys.publisher_by_id("123")
        assert "publishers" in CacheKeys.publisher_logo("123")

        # Book keys should have 'books' segment
        assert "books" in CacheKeys.BOOK_LIST
        assert "books" in CacheKeys.book_by_id("456")
        assert "books" in CacheKeys.book_config("456")
        assert "books" in CacheKeys.books_by_publisher("789")

    def test_id_keys_include_entity_id(self) -> None:
        """Verify ID-based keys correctly include the entity ID."""
        pub_id = "test-publisher-uuid"
        book_id = "test-book-uuid"

        assert pub_id in CacheKeys.publisher_by_id(pub_id)
        assert pub_id in CacheKeys.publisher_logo(pub_id)
        assert book_id in CacheKeys.book_by_id(book_id)
        assert book_id in CacheKeys.book_config(book_id)
        assert pub_id in CacheKeys.books_by_publisher(pub_id)
