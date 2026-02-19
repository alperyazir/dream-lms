"""
Content Library Schemas.

Pydantic schemas for Content Library endpoints (Story 27.21).
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ContentCreator(BaseModel):
    """Content creator information."""

    id: UUID
    name: str


class ContentItemPublic(BaseModel):
    """Public content library item."""

    id: UUID
    activity_type: str = Field(description="Type of activity (ai_quiz, vocabulary_quiz, etc.)")
    title: str = Field(description="Activity title")
    source_type: str = Field(description="'book' or 'material'")
    book_id: int | None = Field(default=None, description="DCS book ID if book-based")
    book_title: str | None = Field(default=None, description="Book title if book-based")
    material_id: UUID | None = Field(default=None, description="Material ID if material-based")
    material_name: str | None = Field(default=None, description="Material name if material-based")
    item_count: int = Field(description="Number of questions/items in activity")
    created_at: datetime
    updated_at: datetime | None = None
    used_in_assignments: int = Field(default=0, description="Times used in assignments")
    is_shared: bool = Field(description="True if book-based (shared), False if material-based (private)")
    created_by: ContentCreator
    # Skill classification (Epic 30 - Story 30.3)
    skill_id: UUID | None = Field(default=None, description="SkillCategory ID if generated via V2")
    skill_name: str | None = Field(default=None, description="Skill category name")
    format_id: UUID | None = Field(default=None, description="ActivityFormat ID if generated via V2")
    format_name: str | None = Field(default=None, description="Activity format name")


class ContentItemDetail(ContentItemPublic):
    """Detailed content library item with full activity data."""

    content: dict[str, Any] = Field(description="Full activity data")


class LibraryFilters(BaseModel):
    """Filters for content library listing."""

    type: str | None = Field(default=None, description="Activity type filter")
    source_type: str | None = Field(default=None, description="'book' or 'material'")
    book_id: int | None = Field(default=None, description="Filter by book ID")
    date_from: datetime | None = Field(default=None, description="Created after this date")
    date_to: datetime | None = Field(default=None, description="Created before this date")
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")


class LibraryResponse(BaseModel):
    """Paginated library response."""

    items: list[ContentItemPublic]
    total: int
    page: int
    page_size: int
    has_more: bool


class DeleteContentResponse(BaseModel):
    """Response for content deletion."""

    message: str
    content_id: UUID


class UpdateContentRequest(BaseModel):
    """Request to update content in the library."""

    title: str | None = Field(default=None, description="New title for the content")
    content: dict[str, Any] | None = Field(default=None, description="Updated content data")


class UpdateContentResponse(BaseModel):
    """Response for content update."""

    message: str
    content_id: UUID
    updated_at: datetime


class AssignContentRequest(BaseModel):
    """Request to assign content to classes."""

    name: str = Field(description="Assignment name")
    instructions: str | None = Field(default=None, description="Assignment instructions")
    due_date: datetime | None = Field(default=None, description="Due date")
    time_limit_minutes: int | None = Field(default=None, ge=1, description="Time limit in minutes")
    class_ids: list[UUID] = Field(description="Class IDs to assign to")


class AssignContentResponse(BaseModel):
    """Response for content assignment."""

    message: str
    assignment_id: UUID
    student_count: int
