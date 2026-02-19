"""
Listening Sentence Builder Schemas.

Pydantic models for listening sentence builder activities where students
hear a sentence via TTS audio and arrange shuffled words into correct order.

Epic 30 - Listening Skill: Sentence Builder Format
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ListeningSBDifficulty = Literal["auto", "easy", "medium", "hard"]


class ListeningSentenceBuilderRequest(BaseModel):
    """Request to generate a listening sentence builder activity."""

    book_id: int
    module_ids: list[int] = Field(min_length=1)
    sentence_count: int = Field(default=8, ge=3, le=15)
    difficulty: ListeningSBDifficulty = Field(default="auto")
    language: str | None = Field(default=None)


class ListeningSentenceBuilderItem(BaseModel):
    """A single listening sentence builder item."""

    item_id: str
    correct_sentence: str = Field(
        description="Complete sentence (spoken in audio). For teacher review only.",
    )
    words: list[str] = Field(
        description="Shuffled words for student to reorder.",
    )
    word_count: int = Field(description="Number of words in the sentence.")
    audio_url: str | None = Field(
        default=None, description="URL to TTS audio of the sentence.",
    )
    audio_status: Literal["pending", "ready", "failed"] = Field(default="pending")
    difficulty: str = Field(description="Difficulty level (easy, medium, hard).")


class ListeningSentenceBuilderItemPublic(BaseModel):
    """Public version -- omits correct_sentence."""

    item_id: str
    words: list[str] = Field(default_factory=list)
    word_count: int
    audio_url: str | None = None
    audio_status: str = "ready"
    difficulty: str


class ListeningSentenceBuilderActivity(BaseModel):
    """A complete listening sentence builder activity."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    sentences: list[ListeningSentenceBuilderItem]
    total_items: int
    difficulty: str
    language: str
    created_at: datetime


class ListeningSentenceBuilderActivityPublic(BaseModel):
    """Public version -- no answers."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    sentences: list[ListeningSentenceBuilderItemPublic]
    total_items: int
    difficulty: str
    language: str
    created_at: datetime
