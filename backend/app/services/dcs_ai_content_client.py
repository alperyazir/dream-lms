"""
DCS AI Content Client.

Provides methods for all 7 DCS AI content endpoints:
- CRUD for AI-generated content metadata
- Audio file upload (single + batch) and streaming URL generation
"""

import logging
from typing import TYPE_CHECKING

import httpx

from app.core.config import settings

if TYPE_CHECKING:
    from app.services.dream_storage_client import DreamCentralStorageClient

logger = logging.getLogger(__name__)


class DCSAIContentClient:
    """Client for DCS AI content endpoints."""

    def __init__(self, dcs_client: "DreamCentralStorageClient") -> None:
        self._dcs = dcs_client

    # ------------------------------------------------------------------
    # Content CRUD
    # ------------------------------------------------------------------

    async def create_content(self, book_id: int, payload: dict) -> dict:
        """POST /books/{book_id}/ai-content/ — create content entry.

        Returns: {"content_id": "...", "storage_path": "..."}
        """
        token = await self._dcs._get_valid_token()
        url = f"{settings.DREAM_CENTRAL_STORAGE_URL}/books/{book_id}/ai-content/"
        timeout = httpx.Timeout(connect=5.0, read=30.0, write=30.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )
            if not resp.is_success:
                logger.error(
                    f"DCS create_content failed ({resp.status_code}): {resp.text}"
                )
                resp.raise_for_status()
            return resp.json()

    async def list_content(self, book_id: int) -> list[dict]:
        """GET /books/{book_id}/ai-content/ — list all content for a book."""
        resp = await self._dcs._make_request(
            "GET", f"/books/{book_id}/ai-content/"
        )
        return resp.json()

    async def get_content(self, book_id: int, content_id: str) -> dict:
        """GET /books/{book_id}/ai-content/{content_id} — get content detail."""
        resp = await self._dcs._make_request(
            "GET", f"/books/{book_id}/ai-content/{content_id}"
        )
        return resp.json()

    async def delete_content(self, book_id: int, content_id: str) -> None:
        """DELETE /books/{book_id}/ai-content/{content_id} — delete content."""
        await self._dcs._make_request(
            "DELETE", f"/books/{book_id}/ai-content/{content_id}"
        )

    # ------------------------------------------------------------------
    # Audio file operations
    # ------------------------------------------------------------------

    async def upload_audio(
        self, book_id: int, content_id: str, filename: str, audio_data: bytes
    ) -> dict:
        """PUT /books/{book_id}/ai-content/{content_id}/audio/{filename} — upload single audio file."""
        token = await self._dcs._get_valid_token()
        url = (
            f"{settings.DREAM_CENTRAL_STORAGE_URL}"
            f"/books/{book_id}/ai-content/{content_id}/audio/{filename}"
        )

        timeout = httpx.Timeout(connect=5.0, read=60.0, write=60.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.put(
                url,
                files={"file": (filename, audio_data, "audio/mpeg")},
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            return resp.json()

    async def upload_audio_batch(
        self, book_id: int, content_id: str, files: list[tuple[str, bytes]]
    ) -> dict:
        """POST /books/{book_id}/ai-content/{content_id}/audio/batch — batch upload audio files.

        Args:
            files: list of (filename, audio_bytes) tuples.
        """
        token = await self._dcs._get_valid_token()
        url = (
            f"{settings.DREAM_CENTRAL_STORAGE_URL}"
            f"/books/{book_id}/ai-content/{content_id}/audio/batch"
        )

        # Build multipart with multiple 'files' fields
        multipart_files = [
            ("files", (fname, data, "audio/mpeg")) for fname, data in files
        ]

        timeout = httpx.Timeout(connect=5.0, read=120.0, write=120.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                url,
                files=multipart_files,
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            return resp.json()

    def get_audio_stream_url(
        self, book_id: int, content_id: str, filename: str
    ) -> str:
        """Build full DCS URL for GET /books/{book_id}/ai-content/{content_id}/audio/{filename}."""
        return (
            f"{settings.DREAM_CENTRAL_STORAGE_URL}"
            f"/books/{book_id}/ai-content/{content_id}/audio/{filename}"
        )

    async def stream_audio(
        self, book_id: int, content_id: str, filename: str
    ) -> bytes:
        """GET /books/{book_id}/ai-content/{content_id}/audio/{filename} — fetch audio bytes."""
        resp = await self._dcs._make_request(
            "GET",
            f"/books/{book_id}/ai-content/{content_id}/audio/{filename}",
            use_long_timeout=True,
        )
        return resp.content


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

_client: DCSAIContentClient | None = None


def get_dcs_ai_content_client(
    dcs_client: "DreamCentralStorageClient",
) -> DCSAIContentClient:
    """Get or create the singleton DCSAIContentClient."""
    global _client
    if _client is None:
        _client = DCSAIContentClient(dcs_client)
    return _client
