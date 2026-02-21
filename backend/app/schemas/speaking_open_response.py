"""
Speaking Open Response Schemas.

Open-ended speaking prompts. Teacher scores manually.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


SpeakingORDifficulty = Literal["auto", "easy", "medium", "hard"]


class SpeakingOpenResponseRequest(BaseModel):
    """Request to generate a speaking open response activity."""

    book_id: int
    module_ids: list[int] = Field(min_length=1)
    item_count: int = Field(default=3, ge=1, le=10)
    difficulty: SpeakingORDifficulty = Field(default="auto")
    language: str | None = Field(default=None)


class SpeakingOpenResponseItem(BaseModel):
    """A single speaking open response item."""

    item_id: str
    prompt: str = Field(description="The speaking prompt.")
    context: str = Field(description="Background context for the prompt.")
    max_seconds: int = Field(description="Maximum recording time in seconds.")
    difficulty: str
    grading_rubric: list[str] = Field(
        default_factory=list,
        description="Criteria for teacher grading.",
    )


class SpeakingOpenResponseActivity(BaseModel):
    """Complete speaking open response activity."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    items: list[SpeakingOpenResponseItem]
    total_items: int
    difficulty: str
    language: str
    requires_manual_grading: bool = True
    created_at: datetime


class SpeakingOpenResponseActivityPublic(BaseModel):
    """Public version — same fields (no hidden data for this format)."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    items: list[SpeakingOpenResponseItem]
    total_items: int
    difficulty: str
    language: str
    requires_manual_grading: bool = True
    created_at: datetime
