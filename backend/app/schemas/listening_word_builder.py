"""
Listening Word Builder Schemas.

Pydantic models for listening word builder activities where students
hear a word via TTS audio and arrange scrambled letters to spell it.

Epic 30 - Listening Skill: Word Builder Format
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ListeningWBDifficulty = Literal["auto", "easy", "medium", "hard"]


class ListeningWordBuilderRequest(BaseModel):
    """Request to generate a listening word builder activity."""

    book_id: int
    module_ids: list[int] = Field(min_length=1)
    word_count: int = Field(default=10, ge=3, le=20)
    difficulty: ListeningWBDifficulty = Field(default="auto")
    language: str | None = Field(default=None)


class ListeningWordBuilderItem(BaseModel):
    """A single listening word builder item."""

    item_id: str
    correct_word: str = Field(
        description="Correct word (spoken in audio). For teacher review only.",
    )
    letters: list[str] = Field(
        description="Scrambled letters for student to reorder.",
    )
    letter_count: int = Field(description="Number of letters in the word.")
    definition: str = Field(
        default="", description="Word definition (optional hint).",
    )
    audio_url: str | None = Field(
        default=None, description="URL to TTS audio of the word.",
    )
    audio_status: Literal["pending", "ready", "failed"] = Field(default="pending")
    difficulty: str = Field(description="Difficulty level (easy, medium, hard).")


class ListeningWordBuilderItemPublic(BaseModel):
    """Public version -- omits correct_word."""

    item_id: str
    letters: list[str] = Field(default_factory=list)
    letter_count: int
    definition: str = ""
    audio_url: str | None = None
    audio_status: str = "ready"
    difficulty: str


class ListeningWordBuilderActivity(BaseModel):
    """A complete listening word builder activity."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    words: list[ListeningWordBuilderItem]
    total_items: int
    difficulty: str
    language: str
    created_at: datetime


class ListeningWordBuilderActivityPublic(BaseModel):
    """Public version -- no answers."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    words: list[ListeningWordBuilderItemPublic]
    total_items: int
    difficulty: str
    language: str
    created_at: datetime
