"""
AI Content Proxy Routes.

Proxies DCS AI content endpoints through the LMS, keeping DCS
authentication internal.

Routes:
    GET  /api/v1/ai/content/{book_id}/{content_id}/audio/{filename}  — stream audio
    GET  /api/v1/ai/books/{book_id}/content                         — list content
    GET  /api/v1/ai/books/{book_id}/content/{content_id}            — get detail
    DELETE /api/v1/ai/books/{book_id}/content/{content_id}          — delete content
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.services.dcs_ai_content_client import DCSAIContentClient, get_dcs_ai_content_client
from app.services.dream_storage_client import DreamCentralStorageClient

logger = logging.getLogger(__name__)

# Audio proxy router (existing)
router = APIRouter(prefix="/ai/content", tags=["ai-content-proxy"])

# Book content router (new — list/detail/delete)
book_content_router = APIRouter(prefix="/ai/books", tags=["ai-content-proxy"])


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------

_dcs_storage: DreamCentralStorageClient | None = None


def _get_dcs_storage() -> DreamCentralStorageClient:
    global _dcs_storage
    if _dcs_storage is None:
        _dcs_storage = DreamCentralStorageClient()
    return _dcs_storage


def _get_ai_content_client(
    dcs: DreamCentralStorageClient = Depends(_get_dcs_storage),
) -> DCSAIContentClient:
    return get_dcs_ai_content_client(dcs)


AIContentClientDep = Annotated[DCSAIContentClient, Depends(_get_ai_content_client)]


# ---------------------------------------------------------------------------
# Audio proxy endpoint
# ---------------------------------------------------------------------------


@router.get(
    "/{book_id}/{content_id}/audio/{filename}",
    summary="Stream AI content audio from DCS",
    responses={200: {"content": {"audio/mpeg": {}}}},
)
async def stream_ai_content_audio(
    book_id: int,
    content_id: str,
    filename: str,
    ai_content_client: AIContentClientDep,
):
    """
    Proxy endpoint to stream AI-generated content audio from DCS.

    - **book_id**: DCS book ID
    - **content_id**: DCS content ID
    - **filename**: Audio filename (e.g. ``item_0.mp3``)
    """
    logger.info(
        f"AI content audio requested: book_id={book_id}, content_id={content_id}, "
        f"filename={filename}"
    )

    try:
        audio_bytes = await ai_content_client.stream_audio(
            book_id, content_id, filename
        )

        async def audio_stream():
            yield audio_bytes

        return StreamingResponse(
            audio_stream(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "public, max-age=86400",
            },
        )
    except Exception as e:
        logger.error(
            f"Failed to stream AI content audio: content_id={content_id}, "
            f"filename={filename}, error={e}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found.",
        )


# ---------------------------------------------------------------------------
# Book content CRUD proxy endpoints
# ---------------------------------------------------------------------------


@book_content_router.get(
    "/{book_id}/content",
    summary="List AI-generated content for a book",
)
async def list_book_content(
    book_id: int,
    ai_content_client: AIContentClientDep,
    activity_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    List all AI-generated content entries for a book from DCS.

    Returns paginated results with metadata.
    """
    try:
        all_items = await ai_content_client.list_content(book_id)
    except Exception as e:
        logger.error(f"Failed to list book content: book_id={book_id}, error={e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch content from storage.",
        )

    # Normalize: DCS may return a list or a dict with "results"
    if isinstance(all_items, dict):
        all_items = all_items.get("results", all_items.get("items", []))

    # Exclude internal-only entries (e.g. passage audio storage)
    _HIDDEN_TYPES = {"passage_audio"}
    all_items = [
        item for item in all_items
        if item.get("activity_type") not in _HIDDEN_TYPES
    ]

    # Filter by activity_type if provided
    if activity_type:
        all_items = [
            item for item in all_items
            if item.get("activity_type") == activity_type
        ]

    total = len(all_items)

    # Paginate
    start = (page - 1) * page_size
    end = start + page_size
    page_items = all_items[start:end]

    # Map to expected frontend shape
    items = []
    for item in page_items:
        items.append({
            "content_id": item.get("content_id") or item.get("id", ""),
            "activity_type": item.get("activity_type", ""),
            "title": item.get("title", "Untitled"),
            "item_count": item.get("item_count", 0),
            "has_audio": item.get("has_audio", False),
            "difficulty": item.get("difficulty"),
            "language": item.get("language"),
            "created_by_id": item.get("created_by_id"),
            "created_by_name": item.get("created_by_name"),
            "book_id": book_id,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": end < total,
        "book_id": book_id,
    }


@book_content_router.get(
    "/{book_id}/content/{content_id}",
    summary="Get AI-generated content detail",
)
async def get_book_content_detail(
    book_id: int,
    content_id: str,
    ai_content_client: AIContentClientDep,
):
    """Get detailed AI-generated content entry from DCS."""
    try:
        detail = await ai_content_client.get_content(book_id, content_id)
    except Exception as e:
        logger.error(
            f"Failed to get content detail: book_id={book_id}, "
            f"content_id={content_id}, error={e}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found.",
        )

    return {
        "content_id": detail.get("content_id") or detail.get("id", content_id),
        "activity_type": detail.get("activity_type", ""),
        "title": detail.get("title", "Untitled"),
        "item_count": detail.get("item_count", 0),
        "has_audio": detail.get("has_audio", False),
        "difficulty": detail.get("difficulty"),
        "language": detail.get("language"),
        "created_by_id": detail.get("created_by_id"),
        "created_by_name": detail.get("created_by_name"),
        "book_id": book_id,
        "content": detail.get("content", {}),
    }


@book_content_router.delete(
    "/{book_id}/content/{content_id}",
    summary="Delete AI-generated content",
)
async def delete_book_content(
    book_id: int,
    content_id: str,
    ai_content_client: AIContentClientDep,
):
    """Delete an AI-generated content entry from DCS."""
    try:
        await ai_content_client.delete_content(book_id, content_id)
    except Exception as e:
        logger.error(
            f"Failed to delete content: book_id={book_id}, "
            f"content_id={content_id}, error={e}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found.",
        )

    return {
        "message": "Content deleted successfully",
        "content_id": content_id,
    }
