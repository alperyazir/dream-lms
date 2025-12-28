"""
Publisher Service v2 - DCS-backed publisher data.

Replaces local publisher database with direct DCS API calls
with caching for performance.
"""

import logging

from app.schemas.publisher import PublisherPublic
from app.services.dcs_cache import CacheKeys, get_dcs_cache
from app.services.dream_storage_client import get_dream_storage_client

logger = logging.getLogger(__name__)


class PublisherService:
    """Service for fetching publisher data from DCS."""

    def __init__(self) -> None:
        self.cache = get_dcs_cache()
        self.client = None

    async def _get_client(self):
        """Get or initialize DCS client."""
        if self.client is None:
            self.client = await get_dream_storage_client()
        return self.client

    async def list_publishers(self) -> list[PublisherPublic]:
        """
        Get all publishers from DCS.

        Returns cached data if available, otherwise fetches from DCS.
        Cache TTL: 10 minutes.
        """
        return await self.cache.get_or_fetch(
            CacheKeys.PUBLISHER_LIST, self._fetch_publishers, ttl=600  # 10 minutes
        )

    async def _fetch_publishers(self) -> list[PublisherPublic]:
        """Fetch publishers from DCS API."""
        client = await self._get_client()
        dcs_publishers = await client.list_publishers()
        logger.info(f"Fetched {len(dcs_publishers)} publishers from DCS")

        return [
            PublisherPublic(
                id=p.id,  # DCS ID is now the primary ID
                name=p.name,
                contact_email=p.contact_email,
                logo_url=f"/api/v1/publishers/{p.id}/logo",
            )
            for p in dcs_publishers
        ]

    async def get_publisher(self, publisher_id: int) -> PublisherPublic | None:
        """
        Get single publisher by DCS ID.

        Returns cached data if available, otherwise fetches from DCS.
        Cache TTL: 10 minutes.

        Args:
            publisher_id: Publisher ID in DCS

        Returns:
            Publisher data or None if not found
        """
        cache_key = CacheKeys.publisher_by_id(str(publisher_id))
        return await self.cache.get_or_fetch(
            cache_key, lambda: self._fetch_publisher(publisher_id), ttl=600
        )

    async def _fetch_publisher(self, publisher_id: int) -> PublisherPublic | None:
        """Fetch single publisher from DCS API."""
        client = await self._get_client()
        dcs_publisher = await client.get_publisher_by_id(publisher_id)

        if dcs_publisher is None:
            logger.warning(f"Publisher {publisher_id} not found in DCS")
            return None

        return PublisherPublic(
            id=dcs_publisher.id,
            name=dcs_publisher.name,
            contact_email=dcs_publisher.contact_email,
            logo_url=f"/api/v1/publishers/{dcs_publisher.id}/logo",
        )


# Singleton
_publisher_service: PublisherService | None = None


def get_publisher_service() -> PublisherService:
    """
    Get singleton publisher service instance.

    Returns:
        PublisherService singleton
    """
    global _publisher_service
    if _publisher_service is None:
        _publisher_service = PublisherService()
    return _publisher_service


def reset_publisher_service() -> None:
    """
    Reset singleton instance.

    Primarily for testing.
    """
    global _publisher_service
    _publisher_service = None
