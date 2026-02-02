"""Book API endpoints."""

import logging
import re
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import func, select

from app.api.deps import AsyncSessionDep, require_role
from app.models import (
    Activity,
    Teacher,
    User,
    UserRole,
)
from app.schemas.book import (
    ActivityCoords,
    ActivityMarker,
    ActivityResponse,
    AudioMarker,
    BookListResponse,
    BookPagesDetailResponse,
    BookPagesResponse,
    BookPublic,
    BookResponse,
    BookStructureResponse,
    BookSyncResponse,
    BookVideosResponse,
    BundleRequest,
    BundleResponse,
    FillAnswerMarker,
    ModuleInfo,
    ModulePages,
    ModuleWithActivities,
    PageActivityResponse,
    PageDetail,
    PageInfo,
    PageWithActivities,
    VideoInfo,
    VideoMarker,
)
from app.services import book_assignment_service
from app.services.book_service_v2 import get_book_service
from app.services.config_parser import parse_book_config, parse_video_sections
from app.services.dream_storage_client import get_dream_storage_client

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/sync",
    response_model=BookSyncResponse,
    status_code=status.HTTP_410_GONE,
    summary="[DEPRECATED] Sync books from Dream Central Storage",
    description="This endpoint is deprecated. Books are now fetched on-demand from DCS without sync.",
    deprecated=True,
)
async def trigger_book_sync() -> BookSyncResponse:
    """
    [DEPRECATED] Book sync endpoint is no longer needed.

    Books are now fetched on-demand from Dream Central Storage with caching.
    No sync operation is required.

    Returns:
        HTTP 410 Gone with deprecation message
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Book sync is deprecated. Books are now fetched on-demand from DCS with caching. No sync needed."
    )


@router.get("/{book_id}/cover")
async def get_book_cover(book_id: int) -> Any:
    """
    Get book cover image from DCS.

    Fetches the cover image directly from the fixed location:
    /storage/books/{publisher}/{book_name}/object?path=images/book_cover.png

    Args:
        book_id: DCS book ID

    Returns:
        Image response with cover content

    Raises:
        HTTPException: 404 if cover not found
    """
    from fastapi.responses import Response

    try:
        # Get book service to find book details
        book_service = get_book_service()
        book = await book_service.get_book(book_id)

        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )

        # Get DCS client and fetch cover from fixed path
        client = await get_dream_storage_client()

        # Book covers are always at: {book}/images/book_cover.png
        url = f"/storage/books/{book.publisher_name}/{book.name}/object"
        params = {"path": "images/book_cover.png"}

        try:
            response = await client._make_request("GET", url, params=params)

            # Get content type from response
            content_type = response.headers.get("content-type", "image/png")

            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
                }
            )
        except Exception as e:
            logger.error(f"Error fetching cover for book {book_id} from DCS: {e}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book cover not found"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_book_cover for book {book_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book cover not found"
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


async def _verify_book_exists(book_id: int) -> BookPublic:
    """
    Verify that a book exists in DCS.

    Args:
        book_id: DCS book ID (integer)

    Returns:
        BookPublic object if found

    Raises:
        HTTPException: 404 if book not found in DCS
    """
    book_service = get_book_service()
    book = await book_service.get_book(book_id)

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found in DCS"
        )

    return book


@router.get(
    "",
    response_model=BookListResponse,
    summary="List accessible books",
    description="Returns books accessible to the authenticated user from DCS (admin/supervisor/publisher see all, teacher sees assigned books)."
)
async def list_books(
    *,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher, UserRole.teacher),
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    activity_type: str | None = None
) -> Any:
    """
    List books accessible to the current user (fetched from DCS on-demand).

    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum records to return (default: 20, max: 100)
    - **search**: Search by title or publisher name
    - **activity_type**: Filter by activity type

    Access control:
    - Admin: Sees all books from DCS
    - Supervisor: Sees all books from DCS
    - Publisher: Sees all books from DCS (needed for book assignment)
    - Teacher: Sees only assigned books (via BookAssignment)
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

    # Get book service
    book_service = get_book_service()

    # Determine accessible books based on role
    if current_user.role == UserRole.teacher:
        # Teacher sees only books assigned to them via BookAssignment (Story 9.4)
        teacher = await _get_teacher_from_user(session, current_user)
        accessible_book_ids = await book_assignment_service.get_accessible_book_ids(
            db=session,
            teacher_id=teacher.id,
        )
        # If no books assigned, return empty list
        if not accessible_book_ids:
            return BookListResponse(
                items=[],
                total=0,
                skip=skip,
                limit=limit
            )

        # Fetch all books from DCS
        all_books = await book_service.list_books()

        # Filter to only accessible books
        books = [book for book in all_books if book.id in accessible_book_ids]
    else:
        # Admin/Supervisor/Publisher: Fetch all books from DCS
        books = await book_service.list_books()

    # Apply search filter (client-side since DCS doesn't support search)
    if search:
        search_lower = search.lower()
        books = [
            book for book in books
            if (book.title and search_lower in book.title.lower())
            or (book.publisher_name and search_lower in book.publisher_name.lower())
        ]

    # Apply activity type filter (requires checking activities in DB)
    if activity_type:
        # Get book IDs that have activities of this type
        result = await session.execute(
            select(Activity.dcs_book_id)
            .where(Activity.activity_type == activity_type)
            .distinct()
        )
        book_ids_with_type = {row[0] for row in result}
        books = [book for book in books if book.id in book_ids_with_type]

    # Calculate total before pagination
    total = len(books)

    # Apply pagination (client-side)
    books = books[skip:skip + limit]

    # Convert to BookResponse format
    response_items = [
        BookResponse(
            id=book.id,
            title=book.title,
            book_name=book.name,
            publisher_id=book.publisher_id,
            publisher_name=book.publisher_name,
            language=None,
            category=None,
            cover_image_url=book.cover_url,
            activity_count=book.activity_count,
            dream_storage_id=str(book.id)  # For backwards compatibility
        )
        for book in books
    ]

    return BookListResponse(
        items=response_items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get(
    "/{book_id}/activities",
    response_model=list[ActivityResponse],
    summary="Get book activities",
    description="Returns all activities for a specific book (admin/supervisor/publisher see all, teacher must have access)."
)
async def get_book_activities(
    *,
    session: AsyncSessionDep,
    book_id: int,  # Changed from UUID to int (DCS book ID)
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher, UserRole.teacher)
) -> Any:
    """
    Get all activities for a specific book.

    Access control:
    - Admin: Can see all book activities
    - Supervisor: Can see all book activities
    - Publisher: Can see all book activities (needed for book assignment)
    - Teacher: Must have access through BookAssignment

    Activities are returned ordered by order_index.
    """
    # Verify access based on role
    if current_user.role in [UserRole.admin, UserRole.supervisor, UserRole.publisher]:
        # Admin/Supervisor/Publisher has access to all books - just verify book exists in DCS
        await _verify_book_exists(book_id)
    elif current_user.role == UserRole.teacher:
        # Teacher must have access through book assignment (Story 9.4)
        teacher = await _get_teacher_from_user(session, current_user)
        has_access = await book_assignment_service.check_teacher_book_access(
            db=session,
            teacher_id=teacher.id,
            book_id=book_id,
        )
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )

    # Get activities for book (using dcs_book_id)
    result = await session.execute(
        select(Activity)
        .where(Activity.dcs_book_id == book_id)
        .order_by(Activity.order_index)
    )
    activities = result.scalars().all()

    # Build response
    return [
        ActivityResponse(
            id=activity.id,
            book_id=activity.dcs_book_id,
            activity_type=activity.activity_type,
            title=activity.title,
            config_json=activity.config_json or {},
            order_index=activity.order_index,
            module_name=activity.module_name,
            page_number=activity.page_number
        )
        for activity in activities
    ]


# --- Story 8.2: Page-Based Activity Selection ---


async def _verify_teacher_book_access(session: AsyncSession, user: User, book_id: int) -> BookPublic:
    """
    Verify that a teacher has access to a book via BookAssignment.

    Args:
        session: Database session
        user: Current authenticated user (must be teacher)
        book_id: DCS book ID (integer)

    Returns:
        BookPublic object if access verified

    Raises:
        HTTPException: 404 if book not found or teacher doesn't have access
    """
    teacher = await _get_teacher_from_user(session, user)
    has_access = await book_assignment_service.check_teacher_book_access(
        db=session,
        teacher_id=teacher.id,
        book_id=book_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found or not accessible"
        )

    # Get the book from DCS
    return await _verify_book_exists(book_id)


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


def _normalize_media_path(media_path: str) -> str:
    """
    Normalize a media path from config.json to API-compatible format.

    Config paths look like: "./books/SwitchtoCLIL/audio/08.mp3"
    We need: "audio/08.mp3"
    """
    if not media_path:
        return ""

    # Remove leading ./ or /
    clean_path = media_path
    if clean_path.startswith("./"):
        clean_path = clean_path[2:]
    if clean_path.startswith("/"):
        clean_path = clean_path[1:]

    # Remove books/{bookName}/ prefix if present
    # e.g., "books/SwitchtoCLIL/audio/08.mp3" -> "audio/08.mp3"
    parts = clean_path.split("/")
    if parts[0] == "books" and len(parts) > 2:
        clean_path = "/".join(parts[2:])

    return clean_path


def _extract_audio_video_fill_from_sections(sections: list, book_id: int, page_number: int) -> tuple[list[AudioMarker], list[VideoMarker], list[FillAnswerMarker]]:
    """
    Extract audio, video, and fill answer markers from page sections.

    Args:
        sections: List of sections from a page in config.json
        book_id: DCS book ID
        page_number: Page number for generating unique IDs

    Returns:
        Tuple of (audio_markers, video_markers, fill_answer_markers)
    """
    audio_markers: list[AudioMarker] = []
    video_markers: list[VideoMarker] = []
    fill_markers: list[FillAnswerMarker] = []
    audio_idx = 0
    video_idx = 0
    fill_idx = 0

    def build_media_url(media_path: str) -> str:
        """Build full API URL for media file."""
        normalized = _normalize_media_path(media_path)
        if normalized:
            return f"/api/v1/books/{book_id}/media/{normalized}"
        return ""

    for section_idx, section in enumerate(sections):
        section_type = section.get("type", "")

        # Extract standalone audio sections
        if section_type == "audio":
            audio_path = section.get("audio_path", "") or section.get("audio", "")
            if audio_path:
                coords = section.get("coords", {})
                audio_markers.append(AudioMarker(
                    id=f"audio-{page_number}-{audio_idx}",
                    src=build_media_url(audio_path),
                    x=coords.get("x", 50),
                    y=coords.get("y", 50),
                    width=coords.get("w", coords.get("width", 44)),
                    height=coords.get("h", coords.get("height", 44)),
                ))
                audio_idx += 1

        # Extract standalone video sections
        elif section_type == "video":
            video_path = section.get("video_path", "") or section.get("video", "")
            if video_path:
                coords = section.get("coords", {})
                video_url = build_media_url(video_path)
                # Check for subtitle file (same name with .srt extension)
                normalized_path = _normalize_media_path(video_path)
                subtitle_url = f"/api/v1/books/{book_id}/media/{normalized_path.rsplit('.', 1)[0]}.srt" if "." in normalized_path else None
                poster_path = section.get("poster", "")
                video_markers.append(VideoMarker(
                    id=f"video-{page_number}-{video_idx}",
                    src=video_url,
                    poster=build_media_url(poster_path) if poster_path else None,
                    subtitle_src=subtitle_url,
                    x=coords.get("x", 50),
                    y=coords.get("y", 50),
                    width=coords.get("w", coords.get("width", 44)),
                    height=coords.get("h", coords.get("height", 44)),
                ))
                video_idx += 1

        # Extract fill answer sections (type: "fill" with answer array)
        elif section_type == "fill":
            answers = section.get("answer", [])
            for answer in answers:
                answer_coords = answer.get("coords", {})
                answer_text = answer.get("text", "")
                if answer_coords and answer_text:
                    fill_markers.append(FillAnswerMarker(
                        id=f"fill-{page_number}-{section_idx}-{fill_idx}",
                        x=answer_coords.get("x", 0),
                        y=answer_coords.get("y", 0),
                        width=answer_coords.get("w", answer_coords.get("width", 50)),
                        height=answer_coords.get("h", answer_coords.get("height", 20)),
                        text=answer_text,
                    ))
                    fill_idx += 1

        # Note: audio_extra is handled by ActivityToolbar when activity opens,
        # not as a page-level audio marker

    return audio_markers, video_markers, fill_markers


def _extract_all_pages_from_config(config_json: dict, book_id: int) -> tuple[list[dict], list[ModuleInfo]]:
    """
    Extract ALL pages from config.json (not just pages with activities).

    Args:
        config_json: Book configuration JSON
        book_id: DCS book ID (integer)

    Returns:
        - List of page dicts: {module_name, page_number, image_url, audio, video}
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
            sections = page.get("sections", [])

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

                # Extract audio, video, and fill answers from sections
                audio_markers, video_markers, fill_markers = _extract_audio_video_fill_from_sections(sections, book_id, page_number)

                all_pages.append({
                    "module_name": module_name,
                    "page_number": page_number,
                    "image_url": image_url,
                    "audio": audio_markers,
                    "video": video_markers,
                    "fill_answers": fill_markers,
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
    book_id: int,  # Changed from UUID to int (DCS book ID)
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher, UserRole.teacher)
) -> BookPagesResponse:
    """
    Get pages for a book, grouped by module.

    Each page includes:
    - page_number: The page number
    - activity_count: Number of activities on that page
    - thumbnail_url: URL to fetch the page thumbnail image

    Access control:
    - Admin: Can see all book pages
    - Supervisor: Can see all book pages
    - Publisher: Can see all book pages (needed for book assignment)
    - Teacher: Must have access through BookAssignment (Story 9.4)
    """
    # Verify access based on role
    if current_user.role == UserRole.teacher:
        # Teacher access via BookAssignment (Story 9.4)
        await _verify_teacher_book_access(session, current_user, book_id)
    else:
        # Admin/Supervisor/Publisher - verify book exists in DCS
        await _verify_book_exists(book_id)

    # Get book config from DCS
    book_service = get_book_service()
    book_config = await book_service.get_book_config(book_id)
    if not book_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book configuration not found in DCS"
        )

    # Extract page image paths from config.json
    page_image_paths = _extract_page_image_paths(book_config)

    # Query activities grouped by module and page (using dcs_book_id)
    result = await session.execute(
        select(
            Activity.module_name,
            Activity.page_number,
            func.count(Activity.id).label("activity_count")
        )
        .where(Activity.dcs_book_id == book_id)
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
    book_id: int,  # Changed from UUID to int (DCS book ID)
    page_number: int,
    module_name: str | None = None,
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher, UserRole.teacher)
) -> list[PageActivityResponse]:
    """
    Get activities for a specific page in a book.

    - **page_number**: The page number to get activities for
    - **module_name**: Optional filter by module name (useful when same page number exists in multiple modules)

    Activities are ordered by section_index.

    Access control:
    - Admin: Can see all book activities
    - Supervisor: Can see all book activities
    - Publisher: Can see all book activities (needed for book assignment)
    - Teacher: Must have access through BookAssignment
    """
    # Verify access based on role
    if current_user.role == UserRole.teacher:
        await _verify_teacher_book_access(session, current_user, book_id)
    else:
        # Admin/Supervisor/Publisher - verify book exists in DCS
        await _verify_book_exists(book_id)

    # Build query (using dcs_book_id)
    query = select(Activity).where(
        Activity.dcs_book_id == book_id,
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
    book_id: int,  # Changed from UUID to int (DCS book ID)
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher, UserRole.teacher)
) -> BookPagesDetailResponse:
    """
    Get detailed page information for the enhanced page viewer.

    Returns pages with:
    - Full-size page images (not thumbnails)
    - Activity markers with coordinates for overlay display
    - Grouped by module

    Access control:
    - Admin: Can see all book pages
    - Supervisor: Can see all book pages
    - Publisher: Can see all book pages (needed for book assignment)
    - Teacher: Must have access through BookAssignment (Story 9.4)
    """
    # Verify access based on role
    if current_user.role == UserRole.teacher:
        # Teacher access via BookAssignment (Story 9.4)
        await _verify_teacher_book_access(session, current_user, book_id)
    else:
        # Admin/Supervisor/Publisher - verify book exists in DCS
        await _verify_book_exists(book_id)

    # Get book config from DCS
    book_service = get_book_service()
    book_config = await book_service.get_book_config(book_id)
    if not book_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book configuration not found in DCS"
        )

    # Extract ALL pages from config.json (not just pages with activities)
    all_pages, module_infos = _extract_all_pages_from_config(book_config, book_id)
    logger.info(f"Extracted {len(all_pages)} total pages from config.json across {len(module_infos)} modules")

    # Get all activities for this book with their coordinates (using dcs_book_id)
    result = await session.execute(
        select(Activity)
        .where(Activity.dcs_book_id == book_id)
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
        audio_markers = page_info.get("audio", [])
        video_markers = page_info.get("video", [])
        fill_markers = page_info.get("fill_answers", [])

        # Get activities for this page
        page_activities = activities_lookup.get((module_name, page_number), [])

        # Build activity markers
        activity_markers: list[ActivityMarker] = []
        for activity in page_activities:
            coords = _extract_activity_coords(activity.config_json or {})
            # Build enriched config with section_image_url and audio_extra_url
            config = dict(activity.config_json or {})
            # Convert section_path to full API URL if present
            if "section_path" in config and config["section_path"]:
                section_path = config["section_path"]
                # Remove leading ./ if present
                if section_path.startswith("./"):
                    section_path = section_path[2:]
                # Remove books/{book_name}/ prefix if present (assets endpoint adds this)
                if section_path.startswith("books/"):
                    # Format: books/{book_name}/images/... -> images/...
                    parts = section_path.split("/", 2)  # Split into ['books', 'book_name', 'rest']
                    if len(parts) >= 3:
                        section_path = parts[2]
                config["section_image_url"] = f"/api/v1/books/{book_id}/assets/{section_path}"

            # Convert audio_extra.path to full API URL if present
            if "audio_extra" in config and isinstance(config["audio_extra"], dict):
                audio_extra = config["audio_extra"]
                if "path" in audio_extra and audio_extra["path"]:
                    audio_path = audio_extra["path"]
                    # Remove leading ./ if present
                    if audio_path.startswith("./"):
                        audio_path = audio_path[2:]
                    # Remove books/{book_name}/ prefix if present
                    if audio_path.startswith("books/"):
                        parts = audio_path.split("/", 2)
                        if len(parts) >= 3:
                            audio_path = parts[2]
                    config["audio_extra"]["url"] = f"/api/v1/books/{book_id}/media/{audio_path}"
            activity_markers.append(ActivityMarker(
                id=activity.id,
                title=activity.title,
                activity_type=activity.activity_type,
                section_index=activity.section_index,
                coords=coords,
                config=config
            ))
            total_activities += 1

        pages_list.append(PageDetail(
            page_number=page_number,
            image_url=image_url,
            module_name=module_name,
            activities=activity_markers,
            audio=audio_markers,
            video=video_markers,
            fill_answers=fill_markers,
        ))

    return BookPagesDetailResponse(
        book_id=book_id,
        modules=module_infos,
        pages=pages_list,
        total_pages=len(pages_list),
        total_activities=total_activities
    )


# --- Story 9.5: Activity Selection Tabs ---

# Activity types that have implemented players (matches frontend SUPPORTED_ACTIVITY_TYPES)
SUPPORTED_ACTIVITY_TYPES = {
    "dragdroppicture",
    "dragdroppicturegroup",
    "matchTheWords",
    "circle",
    "markwithx",
    "puzzleFindWords",
}


@router.get(
    "/{book_id}/structure",
    response_model=BookStructureResponse,
    summary="Get book structure with modules and pages for activity selection",
    description="Returns book structure with modules and pages including activity IDs for bulk selection in assignment creation."
)
async def get_book_structure(
    *,
    session: AsyncSessionDep,
    book_id: int,  # Changed from UUID to int (DCS book ID)
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher, UserRole.teacher)
) -> BookStructureResponse:
    """
    Get book structure with modules and pages for activity selection tabs.

    Returns:
    - Modules with page ranges, activity counts, and activity IDs
    - Pages with activity counts and activity IDs
    - Used for "By Page" and "By Module" selection modes in assignment creation
    - Only includes supported activity types (excludes fillSentencesWithDots, fillpicture)

    Access control:
    - Admin: Can see all book structures
    - Supervisor: Can see all book structures
    - Publisher: Can see all book structures (needed for book assignment)
    - Teacher: Must have access through BookAssignment (Story 9.4)
    """
    # Verify access based on role
    if current_user.role == UserRole.teacher:
        await _verify_teacher_book_access(session, current_user, book_id)
    else:
        # Admin/Supervisor/Publisher - verify book exists in DCS
        await _verify_book_exists(book_id)

    # Get book config from DCS for page image paths
    book_service = get_book_service()
    book_config = await book_service.get_book_config(book_id)
    if not book_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book configuration not found in DCS"
        )

    # Extract page image paths from config.json for thumbnails
    page_image_paths = _extract_page_image_paths(book_config)

    # Get all activities for this book (only supported activity types, using dcs_book_id)
    result = await session.execute(
        select(Activity)
        .where(
            Activity.dcs_book_id == book_id,
            Activity.activity_type.in_(SUPPORTED_ACTIVITY_TYPES)
        )
        .order_by(Activity.module_name, Activity.page_number, Activity.section_index)
    )
    activities = result.scalars().all()

    # Build activity lookup by (module_name, page_number)
    # Structure: {(module_name, page_number): [activity_ids]}
    activities_by_page: dict[tuple[str, int], list[uuid.UUID]] = {}
    for activity in activities:
        key = (activity.module_name, activity.page_number)
        if key not in activities_by_page:
            activities_by_page[key] = []
        activities_by_page[key].append(activity.id)

    # Build module structure from activities
    # Group activities by module
    module_data: dict[str, dict] = {}
    for activity in activities:
        module_name = activity.module_name
        if module_name not in module_data:
            module_data[module_name] = {
                "name": module_name,
                "pages": {},
                "activity_ids": [],
                "page_numbers": []
            }
        module_data[module_name]["activity_ids"].append(activity.id)
        if activity.page_number not in module_data[module_name]["pages"]:
            module_data[module_name]["pages"][activity.page_number] = []
            module_data[module_name]["page_numbers"].append(activity.page_number)
        module_data[module_name]["pages"][activity.page_number].append(activity.id)

    # Build response
    modules: list[ModuleWithActivities] = []
    total_pages = 0
    total_activities = 0

    for module_name, data in module_data.items():
        page_numbers = sorted(data["page_numbers"])
        pages: list[PageWithActivities] = []

        for page_num in page_numbers:
            activity_ids = data["pages"][page_num]
            # Get thumbnail URL
            asset_path = page_image_paths.get((module_name, page_num))
            if not asset_path:
                asset_path = page_image_paths.get(("", page_num))
            if asset_path:
                thumbnail_url = f"/api/v1/books/{book_id}/assets/{asset_path}"
            else:
                module_folder = _module_name_to_folder(module_name)
                thumbnail_url = f"/api/v1/books/{book_id}/assets/images/HB/modules/{module_folder}/pages/{page_num:02d}.png"

            pages.append(PageWithActivities(
                page_number=page_num,
                thumbnail_url=thumbnail_url,
                activity_count=len(activity_ids),
                activity_ids=activity_ids
            ))
            total_pages += 1
            total_activities += len(activity_ids)

        modules.append(ModuleWithActivities(
            name=module_name,
            page_start=min(page_numbers) if page_numbers else 0,
            page_end=max(page_numbers) if page_numbers else 0,
            activity_count=len(data["activity_ids"]),
            activity_ids=data["activity_ids"],
            pages=pages
        ))

    return BookStructureResponse(
        book_id=book_id,
        modules=modules,
        total_pages=total_pages,
        total_activities=total_activities
    )


# --- Story 10.3: Video Attachment to Assignments ---


@router.get(
    "/{book_id}/videos",
    response_model=BookVideosResponse,
    summary="List available videos for a book",
    description="Returns available videos defined in the book's config.json."
)
async def list_book_videos(
    *,
    session: AsyncSessionDep,
    book_id: int,  # Changed from UUID to int (DCS book ID)
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher, UserRole.teacher)
) -> BookVideosResponse:
    """
    List available videos for a book from its config.json.

    Story 10.3: Video Attachment to Assignments

    Videos are defined as sections with type="video" in the book's config.json.
    Each video section has a title and video_path.

    Access control:
    - Admin: Can see all book videos
    - Supervisor: Can see all book videos
    - Publisher: Can see all book videos (needed for book assignment)
    - Teacher: Must have access through BookAssignment (Story 9.4)
    """
    # Verify access based on role
    if current_user.role == UserRole.teacher:
        await _verify_teacher_book_access(session, current_user, book_id)
    else:
        # Admin/Supervisor/Publisher - verify book exists in DCS
        await _verify_book_exists(book_id)

    # Get book from DCS to fetch publisher_name and book_name
    book_service = get_book_service()
    book = await book_service.get_book(book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found in DCS"
        )

    # Get Dream Storage client and fetch config.json
    dcs_client = await get_dream_storage_client()
    try:
        config_data = await dcs_client.get_book_config(
            publisher=book.publisher_name,
            book_name=book.name
        )
    except Exception as e:
        logger.error(f"Failed to fetch config.json for book {book_id}: {e}")
        # Return empty list on error rather than failing
        return BookVideosResponse(book_id=book_id, videos=[], total_count=0)

    # Parse video sections from config
    video_sections = parse_video_sections(config_data)

    # Get all files in the book to check for subtitles
    try:
        all_files = await dcs_client.list_book_contents(
            publisher=book.publisher_name,
            book_name=book.name
        )
    except Exception as e:
        logger.warning(f"Could not list book contents for subtitle detection: {e}")
        all_files = []

    # Build response - extract video info from parsed sections
    # Use a dict to deduplicate videos by path (same video might appear on multiple pages)
    unique_videos: dict[str, VideoInfo] = {}

    for video_section in video_sections:
        original_path = video_section.video_path
        video_path = original_path

        # Normalize path:
        # Config has paths like "./books/SwitchtoCLIL/video/1.mp4"
        # We need just "video/1.mp4" for the media endpoint
        # Remove leading "./" if present
        if video_path.startswith("./"):
            video_path = video_path[2:]

        # Remove "books/{book_name}/" prefix if present
        # Path format: "books/{publisher_or_book}/video/X.mp4"
        parts = video_path.split("/")
        if len(parts) >= 3 and parts[0] == "books":
            # Skip "books" and the book folder name, keep the rest
            video_path = "/".join(parts[2:])

        logger.info(f"Video path normalization: '{original_path}' -> '{video_path}'")

        if video_path not in unique_videos:
            # Extract filename from path
            video_name = video_path.split("/")[-1] if "/" in video_path else video_path

            # Use title from config if available, otherwise use filename
            display_name = video_section.title or video_name

            # Check if subtitle file exists (.srt with same base name)
            srt_path = video_path.rsplit(".", 1)[0] + ".srt"
            has_subtitles = srt_path in all_files

            # Fetch actual file size from DCS
            try:
                size_bytes = await dcs_client.get_asset_size(
                    publisher=book.publisher_name,
                    book_name=book.name,
                    asset_path=video_path
                )
            except Exception as e:
                logger.warning(f"Could not get size for {video_path}: {e}")
                size_bytes = 0

            unique_videos[video_path] = VideoInfo(
                path=video_path,
                name=display_name,
                size_bytes=size_bytes,
                has_subtitles=has_subtitles
            )

    # Filter out videos with 0 bytes (files that don't exist in DCS)
    videos = [v for v in unique_videos.values() if v.size_bytes > 0]

    return BookVideosResponse(
        book_id=book_id,
        videos=videos,
        total_count=len(videos)
    )


# --- Admin: Import Activities from DCS ---


@router.post(
    "/{book_id}/import-activities",
    response_model=dict,
    summary="Import activities from DCS config.json into local database",
    description="Admin-only endpoint to sync activities from DCS config.json to local Activity table."
)
async def import_book_activities(
    *,
    session: AsyncSessionDep,
    book_id: int,
    current_user: User = require_role(UserRole.admin)
) -> dict:
    """
    Import activities from DCS config.json into local Activity table.

    This endpoint:
    1. Fetches the book's config.json from DCS
    2. Parses activities using parse_book_config
    3. Creates Activity records in the database
    4. Only imports supported activity types

    Note: This deletes existing activities for the book before importing.
    """
    # Verify book exists in DCS
    book_service = get_book_service()
    book = await book_service.get_book(book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found in DCS"
        )

    # Get book config from DCS
    book_config = await book_service.get_book_config(book_id)
    if not book_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book configuration not found in DCS"
        )

    # Parse activities from config.json
    try:
        activity_data_list = parse_book_config(book_config)
    except Exception as e:
        logger.error(f"Failed to parse config.json for book {book_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse book configuration: {str(e)}"
        )

    # Filter for supported activity types only
    supported_activities = [
        a for a in activity_data_list
        if a.activity_type in SUPPORTED_ACTIVITY_TYPES
    ]

    # Delete existing activities for this book
    result = await session.execute(
        select(Activity).where(Activity.dcs_book_id == book_id)
    )
    existing_activities = result.scalars().all()
    for activity in existing_activities:
        await session.delete(activity)

    # Create new Activity records
    created_count = 0
    for activity_data in supported_activities:
        activity = Activity(
            dcs_book_id=book_id,
            module_name=activity_data.module_name,
            page_number=activity_data.page_number,
            section_index=activity_data.section_index,
            activity_type=activity_data.activity_type,
            title=activity_data.title,
            config_json=activity_data.config_json,
            order_index=activity_data.order_index,
        )
        session.add(activity)
        created_count += 1

    await session.commit()

    logger.info(f"Imported {created_count} activities for book {book_id} ({book.title})")

    return {
        "book_id": book_id,
        "book_title": book.title,
        "total_parsed": len(activity_data_list),
        "supported_imported": created_count,
        "unsupported_skipped": len(activity_data_list) - created_count,
    }


# --- Story 29.3: Book Bundle Download ---


VALID_PLATFORMS = {"mac", "win", "win7-8", "linux"}


@router.post(
    "/{book_id}/bundle",
    response_model=BundleResponse,
    summary="Request book bundle download URL",
    description="Generates a download URL for a standalone app bundle of the book for the specified platform."
)
async def request_book_bundle(
    *,
    session: AsyncSessionDep,
    book_id: int,
    bundle_request: BundleRequest,
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher, UserRole.teacher)
) -> BundleResponse:
    """
    Request a standalone app bundle download URL for a book.

    Story 29.3: Book Preview and Download Actions

    This endpoint calls DCS to generate a signed download URL for the book bundle.
    The bundle is a standalone application that can be run offline.

    Platforms:
    - mac: macOS application
    - win: Windows 10/11 application
    - win7-8: Windows 7/8 legacy application
    - linux: Linux application

    Access control:
    - Admin: Can download all books
    - Supervisor: Can download all books
    - Publisher: Can download all books
    - Teacher: Must have access through BookAssignment
    """
    # Validate platform
    if bundle_request.platform not in VALID_PLATFORMS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid platform: {bundle_request.platform}. Must be one of: {', '.join(VALID_PLATFORMS)}"
        )

    # Verify access based on role
    if current_user.role == UserRole.teacher:
        await _verify_teacher_book_access(session, current_user, book_id)
    else:
        # Admin/Supervisor/Publisher - verify book exists in DCS
        await _verify_book_exists(book_id)

    # Request bundle from DCS
    try:
        dcs_client = await get_dream_storage_client()
        bundle_data = await dcs_client.request_book_bundle(book_id, bundle_request.platform)

        return BundleResponse(
            download_url=bundle_data["download_url"],
            file_name=bundle_data["file_name"],
            file_size=bundle_data["file_size"],
            expires_at=bundle_data.get("expires_at"),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to request bundle for book {book_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL. Please try again later."
        )
