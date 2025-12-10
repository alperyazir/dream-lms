"""
Material API schemas for Story 13.1 - Teacher Storage Infrastructure.

Defines request/response schemas for teacher materials management.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models import MaterialType

# =============================================================================
# Request Schemas
# =============================================================================


class TextNoteCreate(BaseModel):
    """Create a text note."""

    name: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=51200)  # 50KB

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return v.strip()


class TextNoteUpdate(BaseModel):
    """Update a text note."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = Field(default=None, min_length=1, max_length=51200)


class UrlLinkCreate(BaseModel):
    """Create a URL link."""

    name: str = Field(min_length=1, max_length=255)
    url: str = Field(max_length=2000)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Basic URL validation."""
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class MaterialUpdate(BaseModel):
    """Update material metadata (name only)."""

    name: str = Field(min_length=1, max_length=255)


# =============================================================================
# Response Schemas
# =============================================================================


class MaterialResponse(BaseModel):
    """Material response schema."""

    id: uuid.UUID
    name: str
    type: MaterialType
    file_size: int | None = None
    mime_type: str | None = None
    original_filename: str | None = None
    url: str | None = None  # For URL type
    text_content: str | None = None  # For text_note type
    created_at: datetime
    updated_at: datetime
    download_url: str | None = None  # Computed field for file downloads


class StorageQuotaResponse(BaseModel):
    """Storage quota information."""

    used_bytes: int
    quota_bytes: int
    used_percentage: float
    is_warning: bool  # True if > 80%
    is_full: bool  # True if >= 100%

    @property
    def available_bytes(self) -> int:
        """Calculate available bytes remaining."""
        return max(0, self.quota_bytes - self.used_bytes)


class MaterialListResponse(BaseModel):
    """List of materials with quota info."""

    materials: list[MaterialResponse]
    total_count: int
    quota: StorageQuotaResponse


class UploadResponse(BaseModel):
    """Response after file upload."""

    material: MaterialResponse
    quota: StorageQuotaResponse


class MaterialPublicResponse(BaseModel):
    """Public material info for student view (attached to assignments)."""

    id: uuid.UUID
    name: str
    type: MaterialType
    file_size: int | None = None
    mime_type: str | None = None
    url: str | None = None  # For URL type
    text_content: str | None = None  # For text_note type


class PresignedUrlResponse(BaseModel):
    """Presigned URL for direct file access."""

    url: str
    expires_in_seconds: int
    content_type: str | None = None
