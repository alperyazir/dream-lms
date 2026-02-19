"""
Writing Fill-in-the-Blank Schemas.

Epic 30 - Story 30.7: Writing Skill — Fill-Blank Format
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


WritingFBDifficulty = Literal["auto", "easy", "medium", "hard"]


class WritingFillBlankRequest(BaseModel):
    """Request to generate a writing fill-blank activity."""

    book_id: int
    module_ids: list[int] = Field(min_length=1)
    item_count: int = Field(default=10, ge=5, le=20)
    difficulty: WritingFBDifficulty = Field(default="auto")
    language: str | None = Field(default=None)


class WritingFillBlankItem(BaseModel):
    """A single writing fill-blank item."""

    item_id: str
    context: str = Field(description="Writing scenario/context prompt.")
    sentence: str = Field(description="Sentence with _______ for the blank.")
    correct_answer: str
    acceptable_answers: list[str] = Field(
        description="All valid answers (3-5 options).",
    )
    difficulty: str


class WritingFillBlankItemPublic(BaseModel):
    """Public version — excludes correct_answer and acceptable_answers."""

    item_id: str
    context: str
    sentence: str
    difficulty: str


class WritingFillBlankActivity(BaseModel):
    """Complete writing fill-blank activity."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    items: list[WritingFillBlankItem]
    total_items: int
    difficulty: str
    language: str
    created_at: datetime


class WritingFillBlankActivityPublic(BaseModel):
    """Public version — no correct answers."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    items: list[WritingFillBlankItemPublic]
    total_items: int
    difficulty: str
    language: str
    created_at: datetime
