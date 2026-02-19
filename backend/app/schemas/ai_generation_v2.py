"""Schemas for Skill-First AI Generation API V2 (Epic 30 - Story 30.3)."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class GenerationRequestV2(BaseModel):
    """V2 generation request using skill_slug + format_slug instead of activity_type.

    Teachers select a skill and format, and the system routes to the
    appropriate generator automatically.
    """

    source_type: Literal["book_module", "teacher_material"] = "book_module"

    # Book module source fields
    book_id: int | None = None
    module_ids: list[int] | None = None

    # Teacher material source fields
    material_text: str | None = None

    # Skill-first selection
    skill_slug: str = Field(
        description="Skill category slug: listening, reading, writing, vocabulary, grammar",
    )
    format_slug: str | None = Field(
        default=None,
        description="Activity format slug. Required unless skill_slug is 'mix'.",
    )

    # Generation parameters
    difficulty: Literal["easy", "medium", "hard", "auto"] = "auto"
    count: int = Field(default=10, ge=1, le=50, description="Number of items to generate")
    language: str | None = None
    include_audio: bool = True
    extra_config: dict[str, Any] | None = Field(
        default=None,
        description="Format-specific configuration (e.g., {mode: 'word_bank'} for fill-blank).",
    )

    @model_validator(mode="after")
    def validate_source_requirements(self) -> "GenerationRequestV2":
        """Validate source-specific requirements."""
        if self.source_type == "book_module":
            if self.book_id is None:
                raise ValueError("book_id is required for book_module source")
            if not self.module_ids or len(self.module_ids) == 0:
                raise ValueError("module_ids is required for book_module source")
        elif self.source_type == "teacher_material":
            if not self.material_text:
                raise ValueError("material_text is required for teacher_material source")
        return self

    @model_validator(mode="after")
    def validate_format_required(self) -> "GenerationRequestV2":
        """format_slug is required unless skill_slug is 'mix'."""
        if self.skill_slug != "mix" and not self.format_slug:
            raise ValueError("format_slug is required unless skill_slug is 'mix'")
        return self


class GenerationResponseV2(BaseModel):
    """V2 generation response with skill metadata embedded."""

    # Generated content
    content_id: str = Field(description="Unique ID for this generated content")
    activity_type: str = Field(description="Internal activity type (e.g., ai_quiz, vocabulary_quiz)")
    content: dict[str, Any] = Field(description="Generated activity content")

    # Skill metadata
    skill_id: uuid.UUID
    skill_slug: str
    skill_name: str
    format_id: uuid.UUID
    format_slug: str
    format_name: str

    # Generation metadata
    source_type: str
    book_id: int | None = None
    difficulty: str
    item_count: int
    created_at: datetime
