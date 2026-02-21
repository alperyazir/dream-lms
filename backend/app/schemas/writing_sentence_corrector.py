"""
Writing Sentence Corrector Schemas.

Students see intentionally incorrect sentences and type the corrected version.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


WritingSCDifficulty = Literal["auto", "easy", "medium", "hard"]
WritingSCErrorType = Literal["word_order", "grammar", "spelling", "mixed"]


class WritingSentenceCorrectorRequest(BaseModel):
    """Request to generate a writing sentence corrector activity."""

    book_id: int
    module_ids: list[int] = Field(min_length=1)
    item_count: int = Field(default=10, ge=3, le=20)
    difficulty: WritingSCDifficulty = Field(default="auto")
    language: str | None = Field(default=None)


class WritingSentenceCorrectorItem(BaseModel):
    """A single sentence corrector item."""

    item_id: str
    context: str = Field(description="Scenario/context for the sentence.")
    incorrect_sentence: str = Field(description="The intentionally incorrect sentence.")
    correct_sentence: str = Field(description="The correct version of the sentence.")
    error_type: WritingSCErrorType = Field(description="Type of error introduced.")
    difficulty: str


class WritingSentenceCorrectorItemPublic(BaseModel):
    """Public version — omits correct_sentence."""

    item_id: str
    context: str
    incorrect_sentence: str
    error_type: str
    difficulty: str


class WritingSentenceCorrectorActivity(BaseModel):
    """Complete writing sentence corrector activity."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    items: list[WritingSentenceCorrectorItem]
    total_items: int
    difficulty: str
    language: str
    created_at: datetime


class WritingSentenceCorrectorActivityPublic(BaseModel):
    """Public version — no correct sentences."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    items: list[WritingSentenceCorrectorItemPublic]
    total_items: int
    difficulty: str
    language: str
    created_at: datetime
