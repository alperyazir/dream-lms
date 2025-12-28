"""
Publisher schemas for API responses.

Publishers are fetched from Dream Central Storage (DCS) API.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class PublisherPublic(BaseModel):
    """Publisher data for API responses - sourced from DCS."""

    id: int  # DCS ID (integer from DCS)
    name: str
    contact_email: str | None = None
    logo_url: str | None = None

    class Config:
        from_attributes = True


class PublisherProfile(BaseModel):
    """Publisher profile combining DCS and LMS data."""

    id: int  # DCS publisher ID
    name: str
    contact_email: str | None = None
    logo_url: str | None = None
    user_id: uuid.UUID  # LMS user ID
    user_email: str | None = None
    user_full_name: str | None = None


class PublisherStats(BaseModel):
    """Publisher organization statistics."""

    schools_count: int
    teachers_count: int
    books_count: int


class SchoolWithCounts(BaseModel):
    """School response with aggregated counts for publisher views."""

    id: uuid.UUID
    name: str
    address: str | None = None
    contact_info: str | None = None
    benchmarking_enabled: bool = False
    dcs_publisher_id: int
    created_at: datetime
    updated_at: datetime
    # Aggregated counts
    teacher_count: int = 0
    student_count: int = 0
    book_count: int = 0

    class Config:
        from_attributes = True


class TeacherWithCounts(BaseModel):
    """Teacher response with aggregated counts and school name for publisher views."""

    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_username: str
    user_full_name: str
    school_id: uuid.UUID
    school_name: str | None = None
    subject_specialization: str | None = None
    created_at: datetime
    updated_at: datetime
    # Aggregated counts
    books_assigned: int = 0
    classroom_count: int = 0

    class Config:
        from_attributes = True


# Publisher Account Schemas (for User accounts linked to DCS publishers)


class PublisherAccountCreate(BaseModel):
    """Create a publisher user account linked to a DCS publisher."""

    dcs_publisher_id: int = Field(description="DCS Publisher ID to link")
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=50,
        description="Username (auto-generated from full_name if not provided)"
    )
    email: EmailStr
    full_name: str = Field(max_length=255)


class PublisherAccountUpdate(BaseModel):
    """Update a publisher user account."""

    dcs_publisher_id: int | None = None
    username: str | None = Field(default=None, min_length=3, max_length=50)
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


class PublisherAccountPublic(BaseModel):
    """Publisher account response with DCS enrichment."""

    id: uuid.UUID
    username: str
    email: str | None
    full_name: str | None
    dcs_publisher_id: int | None
    dcs_publisher_name: str | None = None  # Enriched from DCS
    is_active: bool
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class PublisherAccountListResponse(BaseModel):
    """Response for listing publisher accounts."""

    data: list[PublisherAccountPublic]
    count: int


class PublisherAccountCreationResponse(BaseModel):
    """Response for creating a publisher user account.

    Different from UserCreationResponse because publishers don't have a role_record.
    """

    user: "UserPublic"
    temporary_password: str | None = None
    password_emailed: bool = False
    message: str = ""


# Avoid circular import
from app.models import UserPublic  # noqa: E402

PublisherAccountCreationResponse.model_rebuild()
