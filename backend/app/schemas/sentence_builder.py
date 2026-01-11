"""
Sentence Builder Schemas.

Pydantic models for Duolingo-style sentence building activities.
Students arrange jumbled words into correct sentence order.
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class SentenceBuilderRequest(BaseModel):
    """
    Request to generate a sentence builder activity.

    Attributes:
        book_id: ID of the book to extract sentences from.
        module_ids: Optional list of specific module IDs. If None, uses all modules.
        sentence_count: Number of sentences in the activity (1-10).
        difficulty: Difficulty level based on sentence length.
        include_audio: Whether to include audio for correct sentences.
    """

    book_id: int
    module_ids: list[int] | None = Field(
        default=None,
        description="Specific modules to use. If None, uses all modules.",
    )
    sentence_count: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Number of sentences (1-50).",
    )
    difficulty: Literal["easy", "medium", "hard"] = Field(
        default="medium",
        description="Difficulty: easy (4-6 words), medium (7-10 words), hard (11+ words).",
    )
    include_audio: bool = Field(
        default=True,
        description="Whether to include TTS audio for correct sentences.",
    )


class SentenceBuilderItem(BaseModel):
    """
    A single sentence item in the activity.

    Contains the correct sentence and shuffled word bank.

    Attributes:
        item_id: Unique identifier for this sentence.
        correct_sentence: The correct sentence as a string.
        words: Shuffled word bank for the student to arrange.
        word_count: Number of words in the sentence.
        audio_url: TTS audio URL for the correct sentence.
        source_module_id: ID of the module this sentence came from.
        source_page: Page number in the module (if available).
        difficulty: Difficulty level of this sentence.
    """

    item_id: str
    correct_sentence: str
    words: list[str]  # Shuffled word bank
    word_count: int
    audio_url: str | None = None
    source_module_id: int
    source_page: int | None = None
    difficulty: str


class SentenceBuilderActivity(BaseModel):
    """
    A complete sentence builder activity.

    This is the full activity representation stored internally,
    including the correct sentences.

    Attributes:
        activity_id: Unique identifier for the activity.
        book_id: ID of the book the activity is generated from.
        module_ids: List of module IDs used for the activity.
        sentences: List of sentence items with correct answers.
        difficulty: Difficulty level of the activity.
        include_audio: Whether audio is included.
        created_at: When the activity was generated.
    """

    activity_id: str
    book_id: int
    module_ids: list[int]
    sentences: list[SentenceBuilderItem]
    difficulty: str
    include_audio: bool
    created_at: datetime


class SentenceBuilderActivityPublic(BaseModel):
    """
    Public version of activity without correct sentence strings.

    Returned to students when they access an activity for taking.
    The correct_sentence field is omitted from items.

    Attributes:
        activity_id: Unique identifier for the activity.
        book_id: ID of the book the activity is generated from.
        module_ids: List of module IDs used for the activity.
        sentences: List of sentence items (words only, no correct sentence).
        difficulty: Difficulty level of the activity.
        include_audio: Whether audio is included.
        created_at: When the activity was generated.
        sentence_count: Total number of sentences.
    """

    activity_id: str
    book_id: int
    module_ids: list[int]
    sentences: list["SentenceBuilderItemPublic"]
    difficulty: str
    include_audio: bool
    created_at: datetime
    sentence_count: int


class SentenceBuilderItemPublic(BaseModel):
    """
    Public version of a sentence item without the correct answer.

    Attributes:
        item_id: Unique identifier for this sentence.
        words: Shuffled word bank for the student to arrange.
        word_count: Number of words in the sentence.
        difficulty: Difficulty level of this sentence.
    """

    item_id: str
    words: list[str]
    word_count: int
    difficulty: str


class SentenceBuilderSubmission(BaseModel):
    """
    Student's submission of sentence answers.

    Maps sentence item IDs to the student's word ordering.

    Attributes:
        answers: Dictionary mapping item_id to ordered list of words.
    """

    answers: dict[str, list[str]] = Field(
        description="Map of item_id to ordered list of words.",
    )


class SentenceResult(BaseModel):
    """
    Result for a single sentence after submission.

    Attributes:
        item_id: ID of the sentence item.
        submitted_words: The student's submitted word order.
        correct_sentence: The correct sentence.
        is_correct: Whether the submission was correct.
        audio_url: Audio URL for the correct sentence (if available).
    """

    item_id: str
    submitted_words: list[str]
    correct_sentence: str
    is_correct: bool
    audio_url: str | None = None


class SentenceBuilderResult(BaseModel):
    """
    Complete results of a submitted sentence builder activity.

    Returned after a student submits their answers, revealing
    the correct sentences and calculating the score.

    Attributes:
        activity_id: ID of the activity.
        student_id: ID of the student who submitted.
        score: Number of correct sentences.
        total: Total number of sentences.
        percentage: Score as a percentage (0-100).
        sentence_results: Detailed results for each sentence.
        submitted_at: When the activity was submitted.
        difficulty: Difficulty level of the activity.
    """

    activity_id: str
    student_id: UUID
    score: int = Field(ge=0)
    total: int = Field(ge=1)
    percentage: float = Field(ge=0, le=100)
    sentence_results: list[SentenceResult]
    submitted_at: datetime
    difficulty: str
