"""Book API endpoints."""

import logging
import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select, func

from app.api.deps import AsyncSessionDep, get_current_active_superuser, require_role
from app.models import (
    Activity,
    ActivityResponse,
    Book,
    BookAccess,
    BookListResponse,
    BookResponse,
    BookStatus,
    Teacher,
    User,
    UserRole,
)
from app.schemas.book import BookSyncResponse
from app.services.book_service import sync_all_books

router = APIRouter()
logger = logging.getLogger(__name__)


async def run_book_sync(db: AsyncSessionDep) -> None:
    """
    Background task for book synchronization.

    Args:
        db: Async database session
    """
    try:
        result = await sync_all_books(db)
        logger.info(f"Book sync complete: {result}")
    except Exception as e:
        logger.error(f"Book sync failed: {e}", exc_info=True)


@router.post(
    "/sync",
    response_model=BookSyncResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Sync books from Dream Central Storage",
    description="Triggers synchronization of book catalog from Dream Central Storage (admin only)",
)
async def trigger_book_sync(
    background_tasks: BackgroundTasks,
    db: AsyncSessionDep,
    current_user: User = Depends(get_current_active_superuser),
) -> BookSyncResponse:
    """
    Admin-only endpoint to sync books from Dream Central Storage.

    This endpoint triggers a background sync operation and returns immediately.

    Args:
        background_tasks: FastAPI background tasks manager
        db: Database session dependency
        current_user: Current authenticated admin user

    Returns:
        BookSyncResponse: Sync operation status (returns immediately, sync runs in background)
    """
    logger.info(f"Book sync triggered by user {current_user.email}")

    # Start background sync
    background_tasks.add_task(run_book_sync, db)

    return BookSyncResponse(
        success=True,
        books_synced=0,
        books_created=0,
        books_updated=0,
        activities_created=0,
        errors=[],
        message="Book sync started in background",
    )


# --- Book Catalog Endpoints (Story 3.6) ---


async def _get_teacher_from_user(session: AsyncSession, user: User) -> Teacher:
    """
    Get Teacher record from User with School relationship loaded.

    Args:
        session: Database session
        user: Current authenticated user

    Returns:
        Teacher record with school relationship loaded

    Raises:
        HTTPException: If teacher record not found
    """
    result = await session.execute(
        select(Teacher)
        .options(selectinload(Teacher.school))
        .where(Teacher.user_id == user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    return teacher


async def _verify_book_access(
    session: AsyncSession,
    book_id: uuid.UUID,
    publisher_id: uuid.UUID
) -> Book:
    """
    Verify that a book is accessible to the given publisher.

    Args:
        session: Database session
        book_id: UUID of the book
        publisher_id: UUID of the publisher

    Returns:
        Book object if access verified

    Raises:
        HTTPException: 404 if book not found or not accessible
    """
    # Query book with access check (exclude archived books)
    result = await session.execute(
        select(Book)
        .join(BookAccess, Book.id == BookAccess.book_id)
        .where(
            Book.id == book_id,
            BookAccess.publisher_id == publisher_id,
            Book.status != BookStatus.archived
        )
    )
    book = result.scalar_one_or_none()

    if not book:
        # Return 404 to not expose existence of other publishers' books
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )

    return book


@router.get(
    "",
    response_model=BookListResponse,
    summary="List accessible books",
    description="Returns books accessible to the authenticated user (admin sees all, publisher/teacher see their publisher's books)."
)
async def list_books(
    *,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.admin, UserRole.publisher, UserRole.teacher),
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    activity_type: str | None = None
) -> Any:
    """
    List books accessible to the current user.

    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum records to return (default: 20, max: 100)
    - **search**: Search by title or publisher name
    - **activity_type**: Filter by activity type

    Access control:
    - Admin: Sees all books
    - Publisher: Sees their publisher's books
    - Teacher: Sees their publisher's books (via school)
    """
    # Validate pagination parameters
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skip parameter must be non-negative"
        )

    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit parameter must be between 1 and 100"
        )

    # Determine publisher_id based on user role
    publisher_id = None

    if current_user.role == UserRole.admin:
        # Admin sees all books (no publisher filter)
        publisher_id = None
    elif current_user.role == UserRole.publisher:
        # Publisher sees their own books
        from app.models import Publisher
        result = await session.execute(
            select(Publisher).where(Publisher.user_id == current_user.id)
        )
        publisher = result.scalar_one_or_none()
        if not publisher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Publisher record not found for this user"
            )
        publisher_id = publisher.id
    elif current_user.role == UserRole.teacher:
        # Teacher sees books from their school's publisher
        teacher = await _get_teacher_from_user(session, current_user)
        if not teacher.school or not teacher.school.publisher_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher's school has no publisher assigned"
            )
        publisher_id = teacher.school.publisher_id

    # Build query: Books (using DCS activity count)
    query = select(Book)

    # Filter out archived books (books deleted from DCS)
    query = query.where(Book.status != BookStatus.archived)

    # Apply publisher filter if not admin
    if publisher_id is not None:
        query = query.join(BookAccess, Book.id == BookAccess.book_id).where(
            BookAccess.publisher_id == publisher_id
        )

    # Apply search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (Book.title.ilike(search_pattern)) |
            (Book.publisher_name.ilike(search_pattern))
        )

    # Apply activity type filter
    if activity_type:
        # Filter books that have at least one activity of this type
        query = query.where(
            Book.id.in_(
                select(Activity.book_id)
                .where(Activity.activity_type == activity_type)
            )
        )

    # Get total count before pagination
    count_result = await session.execute(
        select(func.count())
        .select_from(query.subquery())
    )
    total = count_result.scalar_one()

    # Apply pagination
    query = query.offset(skip).limit(limit)

    # Execute query
    result = await session.execute(query)
    books_data = result.scalars().all()

    # Build response with DCS activity counts
    books = [
        BookResponse(
            id=book.id,
            dream_storage_id=book.dream_storage_id,
            title=book.title,
            publisher_name=book.publisher_name,
            description=book.description,
            cover_image_url=book.cover_image_url,
            activity_count=book.dcs_activity_count or 0  # Use DCS count as source of truth
        )
        for book in books_data
    ]

    return BookListResponse(
        items=books,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get(
    "/{book_id}/activities",
    response_model=list[ActivityResponse],
    summary="Get book activities",
    description="Returns all activities for a specific book (admin sees all, publisher/teacher must have access)."
)
async def get_book_activities(
    *,
    session: AsyncSessionDep,
    book_id: uuid.UUID,
    current_user: User = require_role(UserRole.admin, UserRole.publisher, UserRole.teacher)
) -> Any:
    """
    Get all activities for a specific book.

    Access control:
    - Admin: Can see all book activities
    - Publisher: Must have access through BookAccess
    - Teacher: Must have access through their school's publisher

    Activities are returned ordered by order_index.
    """
    # Verify access based on role
    if current_user.role == UserRole.admin:
        # Admin has access to all books - just verify book exists and is not archived
        result = await session.execute(
            select(Book).where(Book.id == book_id, Book.status != BookStatus.archived)
        )
        book = result.scalar_one_or_none()
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )
    elif current_user.role == UserRole.publisher:
        # Publisher must have access through BookAccess
        from app.models import Publisher
        result = await session.execute(
            select(Publisher).where(Publisher.user_id == current_user.id)
        )
        publisher = result.scalar_one_or_none()
        if not publisher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Publisher record not found for this user"
            )
        await _verify_book_access(session, book_id, publisher.id)
    elif current_user.role == UserRole.teacher:
        # Teacher must have access through their school's publisher
        teacher = await _get_teacher_from_user(session, current_user)
        if not teacher.school or not teacher.school.publisher_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher's school has no publisher assigned"
            )
        await _verify_book_access(session, book_id, teacher.school.publisher_id)

    # Get activities for book
    result = await session.execute(
        select(Activity)
        .where(Activity.book_id == book_id)
        .order_by(Activity.order_index)
    )
    activities = result.scalars().all()

    # Build response
    return [
        ActivityResponse(
            id=activity.id,
            book_id=activity.book_id,
            activity_type=activity.activity_type,
            title=activity.title,
            config_json=activity.config_json,
            order_index=activity.order_index
        )
        for activity in activities
    ]
