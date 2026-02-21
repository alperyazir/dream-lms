"""
Vocabulary Matching Schemas.

Pydantic models for vocabulary matching activity generation.
Students see two columns (words and shuffled definitions) and
match each word to its correct definition.
"""

import random
from datetime import datetime
from uuid import uuid4

from pydantic import BaseModel, Field


class VocabularyMatchingRequest(BaseModel):
    """Request to generate a vocabulary matching activity."""

    book_id: int
    module_ids: list[int] | None = Field(
        default=None,
        description="Specific modules to use. If None, uses all modules.",
    )
    pair_count: int = Field(
        default=10,
        ge=2,
        le=20,
        description="Number of word-definition pairs (2-20).",
    )
    include_audio: bool = Field(
        default=True,
        description="Whether to include audio URLs for pronunciation.",
    )


class VocabularyMatchingPair(BaseModel):
    """A single word-definition pair in a matching activity."""

    pair_id: str = Field(default_factory=lambda: str(uuid4()))
    word: str
    definition: str
    audio_url: str | None = None
    cefr_level: str = ""


class VocabularyMatchingActivity(BaseModel):
    """Internal representation of a vocabulary matching activity (with answers)."""

    activity_id: str = Field(default_factory=lambda: str(uuid4()))
    book_id: int
    module_ids: list[int] = Field(default_factory=list)
    pairs: list[VocabularyMatchingPair]
    pair_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now())


class VocabularyMatchingWordPublic(BaseModel):
    """A word entry in the public (student-facing) matching activity."""

    pair_id: str
    word: str
    audio_url: str | None = None
    cefr_level: str = ""


class VocabularyMatchingDefinitionPublic(BaseModel):
    """A definition entry in the public matching activity (shuffled order)."""

    def_id: str  # Same as pair_id — used to check correctness
    definition: str


class VocabularyMatchingActivityPublic(BaseModel):
    """Student-facing matching activity — words and definitions are separate + shuffled."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    words: list[VocabularyMatchingWordPublic]
    definitions: list[VocabularyMatchingDefinitionPublic]
    pair_count: int
    created_at: datetime


def to_public(activity: VocabularyMatchingActivity) -> VocabularyMatchingActivityPublic:
    """Convert internal activity to public version with shuffled definitions."""
    words = [
        VocabularyMatchingWordPublic(
            pair_id=p.pair_id,
            word=p.word,
            audio_url=p.audio_url,
            cefr_level=p.cefr_level,
        )
        for p in activity.pairs
    ]

    definitions = [
        VocabularyMatchingDefinitionPublic(
            def_id=p.pair_id,
            definition=p.definition,
        )
        for p in activity.pairs
    ]
    random.shuffle(definitions)

    return VocabularyMatchingActivityPublic(
        activity_id=activity.activity_id,
        book_id=activity.book_id,
        module_ids=activity.module_ids,
        words=words,
        definitions=definitions,
        pair_count=activity.pair_count,
        created_at=activity.created_at,
    )
