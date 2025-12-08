"""Pydantic schemas for Book API responses."""

import uuid

from pydantic import BaseModel, ConfigDict


class BookResponse(BaseModel):
    """Book response schema for API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    book_name: str
    publisher_name: str
    language: str | None
    category: str | None
    cover_image_url: str | None
    activity_count: int = 0


class BookListResponse(BaseModel):
    """List of books response schema."""

    books: list[BookResponse]
    total_count: int


class ActivityResponse(BaseModel):
    """Activity response schema for API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    book_id: uuid.UUID
    module_name: str
    page_number: int
    activity_type: str
    title: str | None


class ActivityDetailResponse(ActivityResponse):
    """Detailed activity response with full config."""

    config: dict  # Full config_json


class BookDetailResponse(BookResponse):
    """Detailed book response with activities."""

    activities: list[ActivityResponse]


class BookSyncResponse(BaseModel):
    """Book synchronization response schema."""

    success: bool
    books_synced: int
    books_created: int
    books_updated: int
    activities_created: int
    errors: list[str]
    message: str = "Book sync completed"


# --- Story 8.2: Page-Based Activity Selection ---


class PageInfo(BaseModel):
    """Information about a single page in a book module."""

    page_number: int
    activity_count: int
    thumbnail_url: str


class ModulePages(BaseModel):
    """A module with its pages containing activities."""

    name: str
    pages: list[PageInfo]


class BookPagesResponse(BaseModel):
    """Response for book pages endpoint."""

    book_id: uuid.UUID
    modules: list[ModulePages]
    total_pages: int
    total_activities: int


class PageActivityResponse(BaseModel):
    """Activity response for page-based selection."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str | None
    activity_type: str
    section_index: int
    order_index: int


# --- Story 8.2 Enhanced: Page Viewer with Activity Markers ---


class ActivityCoords(BaseModel):
    """Coordinates for an activity marker on a page."""

    x: int
    y: int
    w: int
    h: int


class ActivityMarker(BaseModel):
    """Activity marker with position and metadata for page viewer."""

    id: uuid.UUID
    title: str | None
    activity_type: str
    section_index: int
    coords: ActivityCoords | None


class PageDetail(BaseModel):
    """Detailed page information including image and activity markers."""

    page_number: int
    image_url: str
    module_name: str
    activities: list[ActivityMarker]


class ModuleInfo(BaseModel):
    """Module metadata for navigation shortcuts."""

    name: str
    first_page_index: int  # Index in the flat pages array
    page_count: int


class ModulePagesDetail(BaseModel):
    """Module with detailed page information for page viewer."""

    name: str
    pages: list[PageDetail]


class BookPagesDetailResponse(BaseModel):
    """Enhanced book pages response with activity coordinates for page viewer."""

    book_id: uuid.UUID
    modules: list[ModuleInfo]  # Module shortcuts for navigation
    pages: list[PageDetail]  # Flat list of ALL pages in order
    total_pages: int
    total_activities: int


# --- Story 9.5: Activity Selection Tabs ---


class PageWithActivities(BaseModel):
    """Page information with activity IDs for bulk selection."""

    page_number: int
    thumbnail_url: str
    activity_count: int
    activity_ids: list[uuid.UUID]


class ModuleWithActivities(BaseModel):
    """Module information with pages and activity IDs for bulk selection."""

    name: str
    page_start: int
    page_end: int
    activity_count: int
    activity_ids: list[uuid.UUID]
    pages: list[PageWithActivities]


class BookStructureResponse(BaseModel):
    """Book structure response with modules and pages for activity selection tabs."""

    book_id: uuid.UUID
    modules: list[ModuleWithActivities]
    total_pages: int
    total_activities: int


# --- Story 10.3: Video Attachment to Assignments ---


class VideoInfo(BaseModel):
    """Video file information from Dream Central Storage."""

    path: str  # Relative path like "videos/chapter1.mp4"
    name: str  # File name like "chapter1.mp4"
    size_bytes: int  # File size
    has_subtitles: bool  # True if .srt file exists


class BookVideosResponse(BaseModel):
    """Response for book videos endpoint."""

    book_id: uuid.UUID
    videos: list[VideoInfo]
    total_count: int
