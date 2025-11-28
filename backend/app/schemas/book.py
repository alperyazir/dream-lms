"""Pydantic schemas for Book API responses."""

import uuid
from datetime import datetime

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
