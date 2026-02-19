"""
Listening Fill-in-the-Blank Schemas.

Pydantic models for listening fill-blank activities where students
hear a complete sentence and fill in missing words from a word bank.

Epic 30 - Story 30.5: Listening Skill — Fill-in-the-Blank Format
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ListeningFBDifficulty = Literal["auto", "easy", "medium", "hard"]


class ListeningFillBlankRequest(BaseModel):
    """Request to generate a listening fill-blank activity."""

    book_id: int
    module_ids: list[int] = Field(min_length=1)
    item_count: int = Field(default=8, ge=5, le=15)
    difficulty: ListeningFBDifficulty = Field(default="auto")
    language: str | None = Field(default=None)


class ListeningFillBlankItem(BaseModel):
    """A single listening fill-blank item with multiple blanks and a word bank."""

    item_id: str
    full_sentence: str = Field(
        description="Complete sentence (spoken in audio). For teacher review only.",
    )
    display_sentence: str = Field(
        description="Sentence with _______ replacing each missing word.",
    )
    missing_words: list[str] = Field(
        description="Correct missing words, ordered by blank position in sentence.",
    )
    acceptable_answers: list[list[str]] = Field(
        default_factory=list,
        description="Per-blank list of acceptable answer variants.",
    )
    word_bank: list[str] = Field(
        default_factory=list,
        description="Shuffled list of correct words + distractors for tap-to-fill.",
    )
    audio_url: str | None = Field(
        default=None, description="URL to TTS audio of full_sentence.",
    )
    audio_status: Literal["pending", "ready", "failed"] = Field(default="pending")
    difficulty: str = Field(description="CEFR level (A1, A2, B1, B2).")


class ListeningFillBlankItemPublic(BaseModel):
    """Public version — excludes full_sentence and missing_words."""

    item_id: str
    display_sentence: str
    word_bank: list[str] = Field(default_factory=list)
    audio_url: str | None = None
    audio_status: str = "ready"
    difficulty: str


class ListeningFillBlankActivity(BaseModel):
    """A complete listening fill-blank activity."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    items: list[ListeningFillBlankItem]
    total_items: int
    difficulty: str
    language: str
    created_at: datetime


class ListeningFillBlankActivityPublic(BaseModel):
    """Public version — no answers, no full_sentence."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    items: list[ListeningFillBlankItemPublic]
    total_items: int
    difficulty: str
    language: str
    created_at: datetime
