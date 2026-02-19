"""
Grammar Fill-in-the-Blank Schemas.

Epic 30 - Story 30.6: Grammar Skill — Fill-in-the-Blank Format
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


GrammarFBMode = Literal["word_bank", "free_type"]
GrammarFBDifficulty = Literal["auto", "easy", "medium", "hard"]

GRAMMAR_TOPICS = [
    "present_simple", "past_simple", "future_simple",
    "present_continuous", "past_continuous",
    "present_perfect", "past_perfect",
    "comparatives", "superlatives",
    "articles", "prepositions", "pronouns",
    "conditionals", "passive_voice",
    "reported_speech", "modals",
    "plurals", "possessives",
]


class GrammarFillBlankRequest(BaseModel):
    """Request to generate a grammar fill-blank activity."""

    book_id: int
    module_ids: list[int] = Field(min_length=1)
    item_count: int = Field(default=10, ge=5, le=20)
    difficulty: GrammarFBDifficulty = Field(default="auto")
    language: str | None = Field(default=None)
    mode: GrammarFBMode = Field(
        default="word_bank",
        description="word_bank: provides options; free_type: student types freely.",
    )
    include_hints: bool = Field(default=True)


class GrammarFillBlankItem(BaseModel):
    """A single grammar fill-blank item."""

    item_id: str
    sentence: str = Field(description="Sentence with _______ for the blank.")
    correct_answer: str
    word_bank: list[str] | None = Field(
        default=None,
        description="Distractor options (only for word_bank mode).",
    )
    grammar_topic: str = Field(description="Grammar topic slug (e.g., present_simple).")
    grammar_hint: str | None = Field(
        default=None, description="Optional hint for the student.",
    )
    difficulty: str


class GrammarFillBlankItemPublic(BaseModel):
    """Public version — excludes correct_answer."""

    item_id: str
    sentence: str
    word_bank: list[str] | None = None
    grammar_topic: str
    grammar_hint: str | None = None
    difficulty: str


class GrammarFillBlankActivity(BaseModel):
    """Complete grammar fill-blank activity."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    mode: GrammarFBMode
    items: list[GrammarFillBlankItem]
    total_items: int
    difficulty: str
    language: str
    created_at: datetime


class GrammarFillBlankActivityPublic(BaseModel):
    """Public version — no correct answers."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    mode: GrammarFBMode
    items: list[GrammarFillBlankItemPublic]
    total_items: int
    difficulty: str
    language: str
    created_at: datetime
