"""
Book Media Streaming Routes.

Provides streaming access to audio/video from Dream Central Storage
with HTTP Range support for seeking.
"""

import logging
import mimetypes
import re
import uuid
from collections.abc import AsyncGenerator
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, status
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app.api.deps import get_db
from app.api.routes.book_assets import _check_book_access, _validate_asset_path
from app.core import security
from app.core.config import settings
from app.models import TokenPayload, User
from app.services.dream_storage_client import (
    DreamStorageError,
    DreamStorageNotFoundError,
    get_dream_storage_client,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/books", tags=["book-media"])

# OAuth2 scheme for header-based auth (auto_error=False to allow fallback to query param)
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False,
)


def get_media_user(
    session: Annotated[Session, Depends(get_db)],
    header_token: Annotated[str | None, Depends(oauth2_scheme)] = None,
    query_token: Annotated[str | None, Query(alias="token")] = None,
) -> User:
    """
    Authenticate user for media streaming.

    Supports both header-based auth (Authorization: Bearer xxx) and
    query param auth (?token=xxx) for HTML5 media elements.
    """
    # Try header token first, then query param
    token = header_token or query_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    # Convert string UUID to UUID object
    user_id = uuid.UUID(token_data.sub) if isinstance(token_data.sub, str) else token_data.sub
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user

# Media MIME types
MEDIA_MIME_TYPES = {
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".srt": "text/plain",
    ".vtt": "text/vtt",
}


def _get_media_content_type(asset_path: str) -> str:
    """Get MIME type for media files."""
    for ext, mime_type in MEDIA_MIME_TYPES.items():
        if asset_path.lower().endswith(ext):
            return mime_type

    # Fallback to mimetypes
    content_type, _ = mimetypes.guess_type(asset_path)
    return content_type or "application/octet-stream"


def _parse_range_header(range_header: str, file_size: int) -> tuple[int, int]:
    """
    Parse HTTP Range header.

    Args:
        range_header: Range header value (e.g., "bytes=0-1023")
        file_size: Total file size in bytes

    Returns:
        Tuple of (start, end) byte positions

    Raises:
        HTTPException: If range is invalid
    """
    range_match = re.match(r"bytes=(\d*)-(\d*)", range_header)
    if not range_match:
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail="Invalid Range header format",
            headers={"Content-Range": f"bytes */{file_size}"},
        )

    range_start, range_end = range_match.groups()

    # Handle different range formats
    if range_start and range_end:
        # bytes=0-1023
        start = int(range_start)
        end = int(range_end)
    elif range_start:
        # bytes=1024- (from start to end of file)
        start = int(range_start)
        end = file_size - 1
    elif range_end:
        # bytes=-500 (last 500 bytes)
        start = file_size - int(range_end)
        end = file_size - 1
    else:
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail="Invalid Range header",
            headers={"Content-Range": f"bytes */{file_size}"},
        )

    # Validate range
    if start < 0 or end >= file_size or start > end:
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail="Range Not Satisfiable",
            headers={"Content-Range": f"bytes */{file_size}"},
        )

    return start, end


@router.get(
    "/{book_id}/media/{asset_path:path}",
    summary="Stream media file",
    description="Stream audio/video from Dream Central Storage with Range support",
)
async def stream_media(
    book_id: Annotated[int, Path(description="DCS Book ID")],
    asset_path: Annotated[
        str,
        Path(description="Relative path to media (e.g., 'audio/08.mp3', 'videos/intro.mp4')"),
    ],
    current_user: Annotated[User, Depends(get_media_user)],
    db: Annotated[Session, Depends(get_db)],
    range_header: Annotated[str | None, Header(alias="Range")] = None,
) -> StreamingResponse:
    """
    Stream media files with HTTP Range support for seeking.

    **Authentication:**
    - Header: `Authorization: Bearer <token>` (for fetch/axios requests)
    - Query param: `?token=<token>` (for HTML5 video/audio elements)

    **Supported formats:**
    - Audio: mp3, ogg, wav, m4a, aac
    - Video: mp4, webm
    - Subtitles: srt, vtt

    **Range request examples:**
    - `Range: bytes=0-1023` - First 1024 bytes
    - `Range: bytes=1024-` - From byte 1024 to end
    - `Range: bytes=-500` - Last 500 bytes
    """
    # Validate asset path
    _validate_asset_path(asset_path)

    # Check book access
    book = await _check_book_access(book_id, current_user, db)

    logger.info(f"Streaming media: book_id={book_id}, publisher={book.publisher_name}, book_name={book.name}, asset_path={asset_path}, range_header={range_header}")

    # Get DCS client
    client = await get_dream_storage_client()

    try:
        # Get file metadata (size) first
        file_size = await client.get_asset_size(
            publisher=book.publisher_name,
            book_name=book.name,
            asset_path=asset_path,
        )
        logger.info(f"Media file size: {file_size} bytes")
    except DreamStorageNotFoundError:
        logger.warning(f"Media not found: book_id={book_id}, publisher={book.publisher_name}, book_name={book.name}, asset_path={asset_path}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
    except DreamStorageError as e:
        logger.error(f"DCS error getting media size: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Storage error"
        )

    # Determine content type
    content_type = _get_media_content_type(asset_path)

    # Parse range if provided
    start = 0
    end = file_size - 1
    is_range_request = False

    if range_header:
        is_range_request = True
        start, end = _parse_range_header(range_header, file_size)

    content_length = end - start + 1

    # Create streaming generator
    async def stream_generator() -> AsyncGenerator[bytes, None]:
        try:
            async for chunk in client.stream_asset(
                publisher=book.publisher_name,
                book_name=book.name,
                asset_path=asset_path,
                start=start,
                end=end,
            ):
                yield chunk
        except DreamStorageError as e:
            logger.error(f"Error streaming media: {e}")
            raise

    # Build response headers
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Cache-Control": "max-age=86400",  # 24 hours
    }

    if is_range_request:
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
        logger.debug(f"Streaming range {start}-{end}/{file_size} for {asset_path}")
        return StreamingResponse(
            stream_generator(),
            status_code=status.HTTP_206_PARTIAL_CONTENT,
            media_type=content_type,
            headers=headers,
        )
    else:
        logger.debug(f"Streaming full file {asset_path} ({file_size} bytes)")
        return StreamingResponse(
            stream_generator(),
            status_code=status.HTTP_200_OK,
            media_type=content_type,
            headers=headers,
        )
