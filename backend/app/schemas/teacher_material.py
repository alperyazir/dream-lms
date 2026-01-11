"""
Teacher Material AI Processing Schemas for Story 27.15.

Defines request/response schemas for teacher material processing and
AI-generated content management.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models import MaterialType


# =============================================================================
# Text Extraction Schemas
# =============================================================================


class TextExtractionResult(BaseModel):
    """Result of text extraction from uploaded material."""

    extracted_text: str
    word_count: int
    language: str | None = None  # ISO language code (e.g., 'en', 'tr')
    source_type: Literal["pdf", "text"] = "text"


class PDFUploadRequest(BaseModel):
    """Request for PDF upload with extraction."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)


class TextMaterialCreate(BaseModel):
    """Create material from pasted text."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    text: str = Field(min_length=1, max_length=100000)  # ~100KB max


# =============================================================================
# Material Response Schemas
# =============================================================================


class TeacherMaterialResponse(BaseModel):
    """Teacher material response with AI processing fields."""

    id: uuid.UUID
    teacher_id: uuid.UUID
    name: str
    description: str | None = None
    type: MaterialType
    source_type: Literal["pdf", "text", "other"]  # Derived from type

    # File info (for PDFs)
    original_filename: str | None = None
    file_size: int | None = None
    mime_type: str | None = None

    # AI Processing fields
    extracted_text: str | None = None
    word_count: int | None = None
    language: str | None = None

    # Timestamps
    created_at: datetime
    updated_at: datetime

    # Computed fields
    download_url: str | None = None
    is_processable: bool = False  # True if has extracted_text for AI

    @classmethod
    def from_material(cls, material: "TeacherMaterial") -> "TeacherMaterialResponse":
        """Create response from TeacherMaterial model."""
        from app.models import TeacherMaterial

        # Determine source type from material type
        source_type: Literal["pdf", "text", "other"]
        if material.type == MaterialType.document and material.mime_type == "application/pdf":
            source_type = "pdf"
        elif material.type == MaterialType.text_note:
            source_type = "text"
        else:
            source_type = "other"

        # Generate download URL for file types
        download_url = None
        if material.type not in [MaterialType.url, MaterialType.text_note]:
            download_url = f"/api/v1/materials/{material.id}/download"

        return cls(
            id=material.id,
            teacher_id=material.teacher_id,
            name=material.name,
            description=None,  # Not stored in current model
            type=material.type,
            source_type=source_type,
            original_filename=material.original_filename,
            file_size=material.file_size,
            mime_type=material.mime_type,
            extracted_text=material.extracted_text,
            word_count=material.word_count,
            language=material.language,
            created_at=material.created_at,
            updated_at=material.updated_at,
            download_url=download_url,
            is_processable=bool(material.extracted_text),
        )


class TeacherMaterialListResponse(BaseModel):
    """List of teacher materials."""

    materials: list[TeacherMaterialResponse]
    total_count: int


class TeacherMaterialUploadResponse(BaseModel):
    """Response after material upload with text extraction."""

    material: TeacherMaterialResponse
    extraction: TextExtractionResult | None = None  # Included if text was extracted


# =============================================================================
# Generated Content Schemas
# =============================================================================


class TeacherGeneratedContentCreate(BaseModel):
    """Create generated content from AI activity generation."""

    teacher_id: uuid.UUID
    material_id: uuid.UUID | None = None
    book_id: int | None = None
    activity_type: str = Field(max_length=50)
    title: str = Field(max_length=255)
    content: dict


class TeacherGeneratedContentResponse(BaseModel):
    """Response for teacher's generated AI content."""

    id: uuid.UUID
    teacher_id: uuid.UUID
    material_id: uuid.UUID | None = None
    book_id: int | None = None
    activity_type: str
    title: str
    content: dict
    is_used: bool
    assignment_id: uuid.UUID | None = None
    created_at: datetime

    # Enriched fields (optional, populated when fetching with details)
    material_name: str | None = None  # Name of source material
    book_name: str | None = None  # Name of source book


class TeacherGeneratedContentListResponse(BaseModel):
    """List of generated content."""

    items: list[TeacherGeneratedContentResponse]
    total_count: int


# =============================================================================
# Source Selection Schemas (for AI Generation)
# =============================================================================


class MaterialSourceSelection(BaseModel):
    """Source selection for AI content generation."""

    source_type: Literal["book", "material"] = "book"
    book_id: int | None = None
    material_id: uuid.UUID | None = None

    def validate_source(self) -> bool:
        """Validate that appropriate source is provided."""
        if self.source_type == "book":
            return self.book_id is not None
        else:
            return self.material_id is not None


class MaterialPreview(BaseModel):
    """Preview of material text for AI generation."""

    id: uuid.UUID
    name: str
    extracted_text: str
    word_count: int
    language: str | None = None
    truncated: bool = False  # True if text was truncated for preview
