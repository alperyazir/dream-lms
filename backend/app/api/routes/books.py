"""Book API endpoints."""

import logging
import re
import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import func, select

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
from app.schemas.book import (
    ActivityCoords,
    ActivityMarker,
    BookPagesDetailResponse,
    BookPagesResponse,
    BookSyncResponse,
    ModuleInfo,
    ModulePagesDetail,
    ModulePages,
    PageActivityResponse,
    PageDetail,
    PageInfo,
)
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


# --- Story 8.2: Page-Based Activity Selection ---


async def _get_publisher_id_for_user(session: AsyncSession, user: User) -> uuid.UUID | None:
    """
    Get the publisher_id for access control based on user role.

    Returns None for admin (has access to all), or the publisher_id for publisher/teacher.
    """
    if user.role == UserRole.admin:
        return None
    elif user.role == UserRole.publisher:
        from app.models import Publisher
        result = await session.execute(
            select(Publisher).where(Publisher.user_id == user.id)
        )
        publisher = result.scalar_one_or_none()
        if not publisher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Publisher record not found for this user"
            )
        return publisher.id
    elif user.role == UserRole.teacher:
        teacher = await _get_teacher_from_user(session, user)
        if not teacher.school or not teacher.school.publisher_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher's school has no publisher assigned"
            )
        return teacher.school.publisher_id
    return None


def _extract_page_image_paths(config_json: dict) -> dict[tuple[str, int], str]:
    """
    Extract page image paths from config.json.

    Returns a dict mapping (module_name, page_number) -> asset_path for thumbnails.
    The image_path in config.json can vary:
    - ./books/BookName/images/HB/modules/M1/pages/08.png -> images/HB/modules/M1/pages/08.png
    - ./books/BookName/images/units/M1/07.png -> images/units/M1/07.png
    We extract the relative asset path starting from "images/".

    Config structure: { "books": [{ "modules": [...] }] }
    """
    page_paths: dict[tuple[str, int], str] = {}

    # Handle the "books" wrapper in config.json structure
    books = config_json.get("books", [])
    if books and isinstance(books, list) and len(books) > 0:
        modules = books[0].get("modules", [])
    else:
        # Fallback: try direct modules key (for backwards compatibility)
        modules = config_json.get("modules", [])

    for module in modules:
        module_name = module.get("name", "")
        pages = module.get("pages", [])
        for page in pages:
            page_number = page.get("page_number")
            image_path = page.get("image_path", "")

            if page_number is not None and image_path:
                # Extract asset path from full path
                # ./books/BookName/images/... -> images/...
                # Find "images/" and take everything from there
                if "/images/" in image_path:
                    asset_path = "images/" + image_path.split("/images/", 1)[1]
                else:
                    # Fallback: just use the path as-is after ./books/BookName/
                    parts = image_path.split("/", 3)
                    asset_path = parts[3] if len(parts) > 3 else image_path

                page_paths[(module_name, page_number)] = asset_path
                # Also store with just page_number as key for fallback lookup
                # This handles cases where module names might not match exactly
                page_paths[("", page_number)] = asset_path

    return page_paths


def _extract_all_pages_from_config(config_json: dict, book_id: uuid.UUID) -> tuple[list[dict], list[ModuleInfo]]:
    """
    Extract ALL pages from config.json (not just pages with activities).

    Returns:
        - List of page dicts: {module_name, page_number, image_url}
        - List of ModuleInfo for navigation shortcuts
    """
    all_pages: list[dict] = []
    module_infos: list[ModuleInfo] = []

    # Handle the "books" wrapper in config.json structure
    books = config_json.get("books", [])
    if books and isinstance(books, list) and len(books) > 0:
        modules = books[0].get("modules", [])
    else:
        # Fallback: try direct modules key (for backwards compatibility)
        modules = config_json.get("modules", [])

    page_index = 0  # Track position in flat list

    for module in modules:
        module_name = module.get("name", "")
        pages = module.get("pages", [])
        first_page_index = page_index

        for page in pages:
            page_number = page.get("page_number")
            image_path = page.get("image_path", "")

            if page_number is not None:
                # Extract asset path from full path
                # ./books/BookName/images/... -> images/...
                if image_path and "/images/" in image_path:
                    asset_path = "images/" + image_path.split("/images/", 1)[1]
                elif image_path:
                    # Fallback: just use the path as-is after ./books/BookName/
                    parts = image_path.split("/", 3)
                    asset_path = parts[3] if len(parts) > 3 else image_path
                else:
                    asset_path = None

                if asset_path:
                    image_url = f"/api/v1/books/{book_id}/assets/{asset_path}"
                else:
                    # Generate fallback URL
                    module_folder = _module_name_to_folder(module_name)
                    image_url = f"/api/v1/books/{book_id}/assets/images/HB/modules/{module_folder}/pages/{page_number:02d}.png"

                all_pages.append({
                    "module_name": module_name,
                    "page_number": page_number,
                    "image_url": image_url
                })
                page_index += 1

        # Add module info for navigation shortcuts
        page_count = page_index - first_page_index
        if page_count > 0:
            module_infos.append(ModuleInfo(
                name=module_name,
                first_page_index=first_page_index,
                page_count=page_count
            ))

    return all_pages, module_infos


@router.get(
    "/{book_id}/pages",
    response_model=BookPagesResponse,
    summary="Get book pages with activities",
    description="Returns pages grouped by module with activity counts and thumbnail URLs."
)
async def get_book_pages(
    *,
    session: AsyncSessionDep,
    book_id: uuid.UUID,
    current_user: User = require_role(UserRole.admin, UserRole.publisher, UserRole.teacher)
) -> BookPagesResponse:
    """
    Get pages for a book, grouped by module.

    Each page includes:
    - page_number: The page number
    - activity_count: Number of activities on that page
    - thumbnail_url: URL to fetch the page thumbnail image

    Access control:
    - Admin: Can see all book pages
    - Publisher: Must have access through BookAccess
    - Teacher: Must have access through their school's publisher
    """
    # Verify access and get book
    publisher_id = await _get_publisher_id_for_user(session, current_user)

    if publisher_id is not None:
        book = await _verify_book_access(session, book_id, publisher_id)
    else:
        # Admin - verify book exists and is not archived
        result = await session.execute(
            select(Book).where(Book.id == book_id, Book.status != BookStatus.archived)
        )
        book = result.scalar_one_or_none()
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )

    # Extract page image paths from config.json
    page_image_paths = _extract_page_image_paths(book.config_json or {})

    # Query activities grouped by module and page
    result = await session.execute(
        select(
            Activity.module_name,
            Activity.page_number,
            func.count(Activity.id).label("activity_count")
        )
        .where(Activity.book_id == book_id)
        .group_by(Activity.module_name, Activity.page_number)
        .order_by(Activity.module_name, Activity.page_number)
    )
    rows = result.all()

    # Organize by module
    modules_dict: dict[str, list[PageInfo]] = {}
    total_pages = 0
    total_activities = 0

    for row in rows:
        module_name = row.module_name
        page_number = row.page_number
        activity_count = row.activity_count

        # Get thumbnail URL from config.json image_path, or generate fallback
        # Try exact match first, then fallback to page_number only lookup
        asset_path = page_image_paths.get((module_name, page_number))
        if not asset_path:
            # Try fallback with empty module name (just page_number)
            asset_path = page_image_paths.get(("", page_number))

        if asset_path:
            thumbnail_url = f"/api/v1/books/{book_id}/assets/{asset_path}"
        else:
            # Last resort fallback: generate URL based on module/page pattern
            module_folder = _module_name_to_folder(module_name)
            thumbnail_url = f"/api/v1/books/{book_id}/assets/images/HB/modules/{module_folder}/pages/{page_number:02d}.png"

        page_info = PageInfo(
            page_number=page_number,
            activity_count=activity_count,
            thumbnail_url=thumbnail_url
        )

        if module_name not in modules_dict:
            modules_dict[module_name] = []
        modules_dict[module_name].append(page_info)

        total_pages += 1
        total_activities += activity_count

    # Build response
    modules = [
        ModulePages(name=name, pages=pages)
        for name, pages in modules_dict.items()
    ]

    return BookPagesResponse(
        book_id=book_id,
        modules=modules,
        total_pages=total_pages,
        total_activities=total_activities
    )


def _module_name_to_folder(module_name: str) -> str:
    """
    Convert module name to folder format for asset URLs.

    Examples:
    - "Module 3" -> "M3"
    - "Module 10" -> "M10"
    - "Intro" -> "Intro"
    - "M3" -> "M3"
    """
    # If already in short format, return as-is
    if module_name.startswith("M") and module_name[1:].isdigit():
        return module_name

    # Try to extract number from "Module X" pattern
    match = re.match(r"Module\s*(\d+)", module_name, re.IGNORECASE)
    if match:
        return f"M{match.group(1)}"

    # Return as-is for other formats
    return module_name


@router.get(
    "/{book_id}/pages/{page_number}/activities",
    response_model=list[PageActivityResponse],
    summary="Get activities on a specific page",
    description="Returns activities for a specific page, ordered by section_index."
)
async def get_page_activities(
    *,
    session: AsyncSessionDep,
    book_id: uuid.UUID,
    page_number: int,
    module_name: str | None = None,
    current_user: User = require_role(UserRole.admin, UserRole.publisher, UserRole.teacher)
) -> list[PageActivityResponse]:
    """
    Get activities for a specific page in a book.

    - **page_number**: The page number to get activities for
    - **module_name**: Optional filter by module name (useful when same page number exists in multiple modules)

    Activities are ordered by section_index.

    Access control:
    - Admin: Can see all book activities
    - Publisher: Must have access through BookAccess
    - Teacher: Must have access through their school's publisher
    """
    # Verify access
    publisher_id = await _get_publisher_id_for_user(session, current_user)

    if publisher_id is not None:
        await _verify_book_access(session, book_id, publisher_id)
    else:
        # Admin - verify book exists and is not archived
        result = await session.execute(
            select(Book).where(Book.id == book_id, Book.status != BookStatus.archived)
        )
        book = result.scalar_one_or_none()
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )

    # Build query
    query = select(Activity).where(
        Activity.book_id == book_id,
        Activity.page_number == page_number
    )

    # Apply module filter if provided
    if module_name:
        query = query.where(Activity.module_name == module_name)

    # Order by section_index
    query = query.order_by(Activity.section_index)

    result = await session.execute(query)
    activities = result.scalars().all()

    return [
        PageActivityResponse(
            id=activity.id,
            title=activity.title,
            activity_type=activity.activity_type,
            section_index=activity.section_index,
            order_index=activity.order_index
        )
        for activity in activities
    ]


# --- Story 8.2 Enhanced: Page Viewer with Activity Markers ---


def _extract_activity_coords(config_json: dict) -> ActivityCoords | None:
    """Extract activity coordinates from activity config_json."""
    coords = config_json.get("coords")
    if coords and all(k in coords for k in ("x", "y", "w", "h")):
        return ActivityCoords(
            x=coords["x"],
            y=coords["y"],
            w=coords["w"],
            h=coords["h"]
        )
    return None


@router.get(
    "/{book_id}/pages/detail",
    response_model=BookPagesDetailResponse,
    summary="Get detailed book pages with activity markers",
    description="Returns pages grouped by module with full-size images and activity coordinates for the page viewer."
)
async def get_book_pages_detail(
    *,
    session: AsyncSessionDep,
    book_id: uuid.UUID,
    current_user: User = require_role(UserRole.admin, UserRole.publisher, UserRole.teacher)
) -> BookPagesDetailResponse:
    """
    Get detailed page information for the enhanced page viewer.

    Returns pages with:
    - Full-size page images (not thumbnails)
    - Activity markers with coordinates for overlay display
    - Grouped by module

    Access control:
    - Admin: Can see all book pages
    - Publisher: Must have access through BookAccess
    - Teacher: Must have access through their school's publisher
    """
    # Verify access and get book
    publisher_id = await _get_publisher_id_for_user(session, current_user)

    if publisher_id is not None:
        book = await _verify_book_access(session, book_id, publisher_id)
    else:
        # Admin - verify book exists and is not archived
        result = await session.execute(
            select(Book).where(Book.id == book_id, Book.status != BookStatus.archived)
        )
        book = result.scalar_one_or_none()
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )

    # Extract ALL pages from config.json (not just pages with activities)
    all_pages, module_infos = _extract_all_pages_from_config(book.config_json or {}, book_id)
    logger.info(f"Extracted {len(all_pages)} total pages from config.json across {len(module_infos)} modules")

    # Get all activities for this book with their coordinates
    result = await session.execute(
        select(Activity)
        .where(Activity.book_id == book_id)
        .order_by(Activity.module_name, Activity.page_number, Activity.section_index)
    )
    activities = result.scalars().all()

    # Build activity lookup by (module_name, page_number)
    # Structure: {(module_name, page_number): [activities]}
    activities_lookup: dict[tuple[str, int], list[Activity]] = {}
    for activity in activities:
        key = (activity.module_name, activity.page_number)
        if key not in activities_lookup:
            activities_lookup[key] = []
        activities_lookup[key].append(activity)

    # Build flat list of PageDetail with activities
    pages_list: list[PageDetail] = []
    total_activities = 0

    for page_info in all_pages:
        module_name = page_info["module_name"]
        page_number = page_info["page_number"]
        image_url = page_info["image_url"]

        # Get activities for this page
        page_activities = activities_lookup.get((module_name, page_number), [])

        # Build activity markers
        activity_markers: list[ActivityMarker] = []
        for activity in page_activities:
            coords = _extract_activity_coords(activity.config_json or {})
            activity_markers.append(ActivityMarker(
                id=activity.id,
                title=activity.title,
                activity_type=activity.activity_type,
                section_index=activity.section_index,
                coords=coords
            ))
            total_activities += 1

        pages_list.append(PageDetail(
            page_number=page_number,
            image_url=image_url,
            module_name=module_name,
            activities=activity_markers
        ))

    return BookPagesDetailResponse(
        book_id=book_id,
        modules=module_infos,
        pages=pages_list,
        total_pages=len(pages_list),
        total_activities=total_activities
    )
