"""
Book Service V2 - DCS-First Architecture.

This service fetches book data directly from DCS without local sync.
All book data is cached with appropriate TTL to minimize DCS API calls.
"""

import logging
from typing import Any

from app.schemas.book import BookPublic
from app.services.dcs_cache import CacheKeys, get_dcs_cache
from app.services.dream_storage_client import get_dream_storage_client

logger = logging.getLogger(__name__)


class BookService:
    """Service for fetching book data from DCS with caching."""

    def __init__(self) -> None:
        self.cache = get_dcs_cache()
        self.client = None

    async def _get_client(self):
        """Get or initialize DCS client."""
        if self.client is None:
            self.client = await get_dream_storage_client()
        return self.client

    async def list_books(
        self,
        publisher_id: int | None = None
    ) -> list[BookPublic]:
        """
        Get books from DCS, optionally filtered by publisher.

        Args:
            publisher_id: Optional DCS publisher ID to filter by

        Returns:
            List of BookPublic objects
        """
        # Determine cache key based on filter
        if publisher_id:
            cache_key = CacheKeys.books_by_publisher(str(publisher_id))
        else:
            cache_key = CacheKeys.BOOK_LIST

        # Use cache-aside pattern
        return await self.cache.get_or_fetch(
            cache_key,
            lambda: self._fetch_books(publisher_id),
            ttl=600  # 10 minutes
        )

    async def _fetch_books(self, publisher_id: int | None = None) -> list[BookPublic]:
        """
        Fetch books from DCS and convert to BookPublic schema.

        Args:
            publisher_id: Optional DCS publisher ID to filter by

        Returns:
            List of BookPublic objects
        """
        client = await self._get_client()

        if publisher_id:
            # Use filtered endpoint
            dcs_books = await client.list_books(publisher_id=publisher_id)
        else:
            # Get all books
            dcs_books = await client.get_books()

        return [self._to_public(b) for b in dcs_books]

    async def get_book(self, book_id: int) -> BookPublic | None:
        """
        Get single book by DCS ID.

        Args:
            book_id: DCS book ID

        Returns:
            BookPublic object or None if not found
        """
        cache_key = CacheKeys.book_by_id(str(book_id))
        return await self.cache.get_or_fetch(
            cache_key,
            lambda: self._fetch_book(book_id),
            ttl=600  # 10 minutes
        )

    async def _fetch_book(self, book_id: int) -> BookPublic | None:
        """
        Fetch single book from DCS.

        Args:
            book_id: DCS book ID

        Returns:
            BookPublic object or None if not found
        """
        client = await self._get_client()
        dcs_book = await client.get_book_by_id(book_id)
        if dcs_book is None:
            return None
        return self._to_public(dcs_book)

    async def get_books_batch(self, book_ids: list[int]) -> dict[int, BookPublic]:
        """
        Get multiple books by ID in a single DCS call.

        Returns a dict mapping book_id -> BookPublic for found books.
        Falls back to individual fetches if batch endpoint is unavailable.
        """
        if not book_ids:
            return {}

        # Check cache first, collect misses
        result: dict[int, BookPublic] = {}
        missing_ids: list[int] = []

        for bid in book_ids:
            cache_key = CacheKeys.book_by_id(str(bid))
            cached = await self.cache.get(cache_key)
            if cached is not None:
                result[bid] = cached
            else:
                missing_ids.append(bid)

        if not missing_ids:
            return result

        # Fetch missing books via batch endpoint
        client = await self._get_client()
        try:
            dcs_books = await client.get_books_batch(missing_ids)
            for dcs_book in dcs_books:
                book_public = self._to_public(dcs_book)
                result[dcs_book.id] = book_public
                # Populate individual cache entries
                cache_key = CacheKeys.book_by_id(str(dcs_book.id))
                await self.cache.set(cache_key, book_public, ttl=600)
        except Exception as e:
            logger.warning(f"Batch book fetch failed, falling back to individual: {e}")
            import asyncio
            individual = await asyncio.gather(
                *(self.get_book(bid) for bid in missing_ids),
                return_exceptions=True,
            )
            for bid, book in zip(missing_ids, individual):
                if not isinstance(book, BaseException) and book is not None:
                    result[bid] = book

        return result

    async def get_book_config(self, book_id: int) -> dict[str, Any] | None:
        """
        Get book config.json from DCS storage.

        Args:
            book_id: DCS book ID

        Returns:
            Config dict or None if not found
        """
        cache_key = CacheKeys.book_config(str(book_id))
        return await self.cache.get_or_fetch(
            cache_key,
            lambda: self._fetch_book_config(book_id),
            ttl=3600  # 1 hour - config rarely changes
        )

    async def _fetch_book_config(self, book_id: int) -> dict[str, Any] | None:
        """
        Fetch book config from DCS.

        Args:
            book_id: DCS book ID

        Returns:
            Config dict or None if not found
        """
        client = await self._get_client()
        book = await client.get_book_by_id(book_id)
        if book is None:
            return None

        try:
            return await client.get_book_config(book.publisher, book.book_name)
        except Exception as e:
            logger.warning(f"Failed to fetch config for book {book_id}: {e}")
            return None

    def _to_public(self, dcs_book) -> BookPublic:
        """
        Convert DCS BookRead to BookPublic schema.

        Args:
            dcs_book: BookRead object from DCS client

        Returns:
            BookPublic schema object
        """
        return BookPublic(
            id=dcs_book.id,
            name=dcs_book.book_name,
            title=dcs_book.book_title,
            publisher_id=dcs_book.publisher_id,
            publisher_name=dcs_book.publisher,
            cover_url=f"/api/v1/books/{dcs_book.id}/cover",
            activity_count=dcs_book.activity_count or 0,
            created_at=None,  # DCS doesn't provide this
            updated_at=None,  # DCS doesn't provide this
        )


# Singleton instance
_book_service: BookService | None = None


def get_book_service() -> BookService:
    """
    Get singleton BookService instance.

    Returns:
        BookService singleton
    """
    global _book_service
    if _book_service is None:
        _book_service = BookService()
    return _book_service
