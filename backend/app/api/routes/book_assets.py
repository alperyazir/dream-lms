"""
Book Asset Proxy Routes.

Provides authenticated access to book assets (images, audio) from Dream Central Storage.
"""

import logging
import mimetypes
import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from sqlmodel import Session, select

from app.api.deps import get_current_user, get_db
from app.models import (
    Assignment,
    AssignmentStudent,
    Student,
    Teacher,
    User,
    UserRole,
)
from app.schemas.book import BookPublic
from app.services.book_service_v2 import get_book_service
from app.services.dream_storage_client import (
    DreamStorageError,
    DreamStorageNotFoundError,
    get_dream_storage_client,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/books", tags=["book-assets"])


def _validate_asset_path(asset_path: str) -> None:
    """
    Validate asset path to prevent path traversal attacks.

    Args:
        asset_path: Relative path to asset

    Raises:
        HTTPException(400): If path contains invalid characters or patterns
    """
    if ".." in asset_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid asset path: path traversal not allowed",
        )

    if asset_path.startswith("/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid asset path: absolute paths not allowed",
        )

    if "\x00" in asset_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid asset path: null bytes not allowed",
        )

    # Validate allowed characters (alphanumeric, /, ., -, _)
    if not re.match(r"^[a-zA-Z0-9/._-]+$", asset_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid asset path: contains invalid characters",
        )


def _get_content_type_from_path(asset_path: str) -> str:
    """
    Determine Content-Type from file extension.

    Args:
        asset_path: Path to asset file

    Returns:
        MIME type string (e.g., "image/png", "audio/mpeg")
    """
    content_type, _ = mimetypes.guess_type(asset_path)
    return content_type or "application/octet-stream"


async def _check_book_access(
    book_id: int, current_user: User, db: Session
) -> BookPublic:
    """
    Verify user has access to book.

    Note: Publisher role deprecated - publishers managed in Dream Central Storage.
    Book access for teachers/students is now managed through BookAssignment table.

    Args:
        book_id: Book ID to check access for
        current_user: Authenticated user
        db: Database session

    Returns:
        Book instance if access granted

    Raises:
        HTTPException(404): Book not found
        HTTPException(403): User doesn't have access to book
        HTTPException(410): Publisher role deprecated
    """
    # Fetch book from DCS
    book_service = get_book_service()
    book = await book_service.get_book(book_id)

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Book not found in DCS"
        )

    # Admin users can access any book
    if current_user.role == UserRole.admin:
        return book

    # Supervisor can access any book
    if current_user.role == UserRole.supervisor:
        return book

    if current_user.role == UserRole.publisher:
        # Publisher role deprecated
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Publisher role is deprecated. Publishers are now managed in Dream Central Storage."
        )

    elif current_user.role == UserRole.teacher:
        # Teacher - allow access to book assets if teacher exists
        # (BookAssignment access control handled at assignment endpoints)
        teacher = db.exec(
            select(Teacher).where(Teacher.user_id == current_user.id)
        ).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher record not found",
            )
        # Allow asset access for teachers (assignment validation happens elsewhere)
        return book

    elif current_user.role == UserRole.student:
        # Student user - check if they have an assignment for this book
        student = db.exec(
            select(Student).where(Student.user_id == current_user.id)
        ).first()

        if not student:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student record not found",
            )

        # Check if student has any assignment for activities in this book
        assignment_student = db.exec(
            select(AssignmentStudent)
            .join(Assignment, Assignment.id == AssignmentStudent.assignment_id)
            .where(
                AssignmentStudent.student_id == student.id,
                Assignment.dcs_book_id == book_id,
            )
        ).first()

        if not assignment_student:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this book",
            )

        # Student has valid assignment, allow access
        return book

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="User does not have access to this book",
    )


@router.get(
    "/{book_id}/assets/{asset_path:path}",
    response_class=Response,
    summary="Serve book asset",
    description="Proxy authenticated access to book assets from Dream Central Storage",
)
async def serve_book_asset(
    book_id: Annotated[int, Path(description="Book ID")],
    asset_path: Annotated[
        str,
        Path(
            description="Relative path to asset (e.g., 'images/M1/p7m5.jpg', 'audio/6a.mp3')"
        ),
    ],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    """
    Serve book assets from Dream Central Storage with authentication.

    Validates user access through publisher permissions before proxying
    the request to Dream Central Storage.

    **Common Asset Paths:**
    - Page images: `images/{module}/{page_number}.png`
    - Activity images: `images/{module}/p{page}m{index}.jpg`
    - Audio files: `audio/{page}{letter}.mp3`

    **Response Headers:**
    - `Content-Type`: Detected from file extension
    - `Cache-Control`: max-age=86400 (24 hours)
    """
    # Validate asset path for security
    _validate_asset_path(asset_path)

    # Check book access
    book = await _check_book_access(book_id, current_user, db)

    # Fetch asset from Dream Central Storage
    client = await get_dream_storage_client()

    try:
        asset_data = await client.download_asset(
            publisher=book.publisher_name,
            book_name=book.name,
            asset_path=asset_path,
        )
    except DreamStorageNotFoundError:
        logger.warning(
            f"Asset not found: book_id={book_id}, asset_path={asset_path}, user_id={current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found"
        )
    except DreamStorageError as e:
        logger.error(
            f"Dream Central Storage error: book_id={book_id}, asset_path={asset_path}, error={e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch asset from storage",
        )

    # Log successful access for auditing
    logger.info(
        f"Asset served: book_id={book_id}, asset_path={asset_path}, user_id={current_user.id}"
    )

    # Determine Content-Type
    content_type = _get_content_type_from_path(asset_path)

    # Return response with caching headers
    return Response(
        content=asset_data,
        media_type=content_type,
        headers={
            "Cache-Control": "max-age=86400",  # 24 hours
        },
    )


@router.get(
    "/{book_id}/page-image/{page_number}",
    response_class=Response,
    summary="Serve page image",
    description="Convenience endpoint for serving page images",
)
async def serve_page_image(
    book_id: Annotated[int, Path(description="Book ID")],
    page_number: Annotated[int, Path(description="Page number", ge=1)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    """
    Serve page image for a specific page number.

    This is a convenience endpoint that constructs the asset path
    using a common pattern: `images/M1/{page_number}.png`.

    For more control over the module or format, use the generic
    `/books/{book_id}/assets/{asset_path}` endpoint.
    """
    # Construct asset path using default module pattern
    # Note: Using "M1" as default module. For books with different structures,
    # clients should use the generic assets endpoint
    asset_path = f"images/M1/{page_number}.png"

    # Delegate to generic asset serving endpoint
    return await serve_book_asset(book_id, asset_path, current_user, db)
