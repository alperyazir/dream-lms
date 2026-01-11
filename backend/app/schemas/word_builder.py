"""
Word Builder Schemas.

Pydantic models for spelling practice activities with letter arrangement.
Students spell vocabulary words by clicking letters from a scrambled letter bank.

Story 27.14: Word Builder (Spelling Activity)
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class WordBuilderRequest(BaseModel):
    """
    Request to generate a word builder activity.

    Attributes:
        book_id: ID of the book to fetch vocabulary from.
        module_ids: Optional list of specific module IDs. If None, uses all modules.
        word_count: Number of words in the activity (1-15).
        cefr_levels: Optional list of CEFR levels to filter vocabulary.
        hint_type: Type of hint to show (definition, audio, or both).
    """

    book_id: int
    module_ids: list[int] | None = Field(
        default=None,
        description="Specific modules to use. If None, uses all modules.",
    )
    word_count: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Number of words (1-50).",
    )
    cefr_levels: list[str] | None = Field(
        default=None,
        description="Optional CEFR levels to filter (e.g., ['A1', 'A2']).",
    )
    hint_type: Literal["definition", "audio", "both"] = Field(
        default="both",
        description="Type of hint: definition text, audio pronunciation, or both.",
    )


class WordBuilderItem(BaseModel):
    """
    A single word item in the activity.

    Contains the correct word and scrambled letters.

    Attributes:
        item_id: Unique identifier for this word.
        correct_word: The correct word spelling.
        letters: Scrambled letters for the student to arrange.
        definition: Definition text as hint.
        audio_url: Audio URL for pronunciation (after correct spelling).
        vocabulary_id: ID of the vocabulary entry from DCS.
        cefr_level: CEFR level of the word.
    """

    item_id: str
    correct_word: str
    letters: list[str]  # Scrambled letters
    definition: str
    audio_url: str | None = None
    vocabulary_id: str
    cefr_level: str


class WordBuilderActivity(BaseModel):
    """
    A complete word builder activity.

    This is the full activity representation stored internally,
    including the correct words.

    Attributes:
        activity_id: Unique identifier for the activity.
        book_id: ID of the book the activity is generated from.
        module_ids: List of module IDs used for the activity.
        words: List of word items with correct answers.
        hint_type: Type of hint shown to students.
        created_at: When the activity was generated.
    """

    activity_id: str
    book_id: int
    module_ids: list[int]
    words: list[WordBuilderItem]
    hint_type: str
    created_at: datetime


class WordBuilderItemPublic(BaseModel):
    """
    Public version of a word item without the correct answer.

    Attributes:
        item_id: Unique identifier for this word.
        letters: Scrambled letters for the student to arrange.
        definition: Definition text as hint.
        audio_url: Audio URL (may be withheld until correct).
        letter_count: Number of letters in the word.
    """

    item_id: str
    letters: list[str]
    definition: str
    audio_url: str | None = None  # For hint_type "audio" or "both"
    letter_count: int


class WordBuilderActivityPublic(BaseModel):
    """
    Public version of activity without correct word strings.

    Returned to students when they access an activity for taking.
    The correct_word field is omitted from items.

    Attributes:
        activity_id: Unique identifier for the activity.
        book_id: ID of the book the activity is generated from.
        module_ids: List of module IDs used for the activity.
        words: List of word items (letters only, no correct word).
        hint_type: Type of hint shown to students.
        created_at: When the activity was generated.
        word_count: Total number of words.
    """

    activity_id: str
    book_id: int
    module_ids: list[int]
    words: list[WordBuilderItemPublic]
    hint_type: str
    created_at: datetime
    word_count: int


class WordBuilderSubmission(BaseModel):
    """
    Student's submission of word spellings.

    Maps word item IDs to the student's spelled word and attempt count.

    Attributes:
        answers: Dictionary mapping item_id to spelled word string.
        attempts: Dictionary mapping item_id to number of attempts.
    """

    answers: dict[str, str] = Field(
        description="Map of item_id to spelled word string.",
    )
    attempts: dict[str, int] = Field(
        default_factory=dict,
        description="Map of item_id to attempt count.",
    )


class WordResult(BaseModel):
    """
    Result for a single word after submission.

    Attributes:
        item_id: ID of the word item.
        submitted_word: The student's submitted spelling.
        correct_word: The correct word spelling.
        is_correct: Whether the submission was correct.
        attempts: Number of attempts the student made.
        points: Points earned for this word (based on attempts).
        audio_url: Audio URL for the correct word (for review).
        definition: Definition of the word (for review).
    """

    item_id: str
    submitted_word: str
    correct_word: str
    is_correct: bool
    attempts: int
    points: int
    audio_url: str | None = None
    definition: str


class WordBuilderResult(BaseModel):
    """
    Complete results of a submitted word builder activity.

    Returned after a student submits their answers, revealing
    the correct words and calculating the score.

    Attributes:
        activity_id: ID of the activity.
        student_id: ID of the student who submitted.
        score: Total points earned.
        max_score: Maximum possible score (word_count * 100).
        percentage: Score as a percentage (0-100).
        correct_count: Number of words spelled correctly.
        total: Total number of words.
        word_results: Detailed results for each word.
        perfect_words: Number of words correct on first try.
        average_attempts: Average attempts per word.
        submitted_at: When the activity was submitted.
    """

    activity_id: str
    student_id: str
    score: int = Field(ge=0)
    max_score: int = Field(ge=1)
    percentage: float = Field(ge=0, le=100)
    correct_count: int = Field(ge=0)
    total: int = Field(ge=1)
    word_results: list[WordResult]
    perfect_words: int = Field(ge=0)
    average_attempts: float = Field(ge=0)
    submitted_at: datetime
