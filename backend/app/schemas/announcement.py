"""Pydantic schemas for Announcement API requests/responses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AnnouncementCreate(BaseModel):
    """Schema for creating a new announcement."""

    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    recipient_student_ids: list[uuid.UUID] = Field(default_factory=list)
    recipient_classroom_ids: list[uuid.UUID] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def validate_title_not_empty(cls, v: str) -> str:
        """Validate title is not empty or whitespace."""
        if not v.strip():
            raise ValueError("Title cannot be empty")
        return v

    @field_validator("content")
    @classmethod
    def validate_content_not_empty(cls, v: str) -> str:
        """Validate content is not empty or whitespace."""
        if not v.strip():
            raise ValueError("Content cannot be empty")
        return v


class AnnouncementUpdate(BaseModel):
    """Schema for updating an announcement."""

    title: str | None = Field(None, min_length=1, max_length=200)
    content: str | None = Field(None, min_length=1)
    recipient_student_ids: list[uuid.UUID] | None = None
    recipient_classroom_ids: list[uuid.UUID] | None = None

    @field_validator("title")
    @classmethod
    def validate_title_not_empty(cls, v: str | None) -> str | None:
        """Validate title is not empty or whitespace."""
        if v is not None and not v.strip():
            raise ValueError("Title cannot be empty")
        return v

    @field_validator("content")
    @classmethod
    def validate_content_not_empty(cls, v: str | None) -> str | None:
        """Validate content is not empty or whitespace."""
        if v is not None and not v.strip():
            raise ValueError("Content cannot be empty")
        return v


class AnnouncementPublic(BaseModel):
    """Schema for announcement API response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    teacher_id: uuid.UUID
    title: str
    content: str
    recipient_count: int
    read_count: int | None = None
    created_at: datetime
    updated_at: datetime


class AnnouncementDetail(BaseModel):
    """Schema for detailed announcement response with recipients."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    teacher_id: uuid.UUID
    title: str
    content: str
    recipient_count: int
    created_at: datetime
    updated_at: datetime
    recipient_ids: list[uuid.UUID]


class AnnouncementListResponse(BaseModel):
    """Schema for paginated announcement list response."""

    announcements: list[AnnouncementPublic]
    total: int
    limit: int
    offset: int


# Student-facing schemas (Story 26.2)


class StudentAnnouncementPublic(BaseModel):
    """Schema for student announcement view with read status."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    teacher_id: uuid.UUID
    teacher_name: str
    title: str
    content: str
    created_at: datetime
    is_read: bool
    read_at: datetime | None = None


class StudentAnnouncementListResponse(BaseModel):
    """Schema for student announcement list with pagination and read counts."""

    announcements: list[StudentAnnouncementPublic]
    total: int
    unread_count: int
    limit: int
    offset: int


class AnnouncementReadResponse(BaseModel):
    """Schema for mark-as-read response."""

    announcement_id: uuid.UUID
    is_read: bool
    read_at: datetime
