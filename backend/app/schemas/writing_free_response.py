"""
Writing Free Response Schemas.

Open-ended writing prompts. Teacher scores manually.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


WritingFRDifficulty = Literal["auto", "easy", "medium", "hard"]


class WritingFreeResponseRequest(BaseModel):
    """Request to generate a writing free response activity."""

    book_id: int
    module_ids: list[int] = Field(min_length=1)
    item_count: int = Field(default=5, ge=1, le=10)
    difficulty: WritingFRDifficulty = Field(default="auto")
    language: str | None = Field(default=None)


class WritingFreeResponseItem(BaseModel):
    """A single free response item."""

    item_id: str
    prompt: str = Field(description="The writing prompt.")
    context: str = Field(description="Background context for the prompt.")
    min_words: int = Field(description="Minimum word count.")
    max_words: int = Field(description="Maximum word count.")
    difficulty: str
    rubric_hints: list[str] = Field(
        default_factory=list,
        description="Hints for teacher grading.",
    )


class WritingFreeResponseItemPublic(BaseModel):
    """Public version — omits rubric_hints."""

    item_id: str
    prompt: str
    context: str
    min_words: int
    max_words: int
    difficulty: str


class WritingFreeResponseActivity(BaseModel):
    """Complete writing free response activity."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    items: list[WritingFreeResponseItem]
    total_items: int
    difficulty: str
    language: str
    requires_manual_grading: bool = True
    created_at: datetime


class WritingFreeResponseActivityPublic(BaseModel):
    """Public version — no rubric hints."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    items: list[WritingFreeResponseItemPublic]
    total_items: int
    difficulty: str
    language: str
    requires_manual_grading: bool = True
    created_at: datetime
