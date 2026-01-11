"""
Vocabulary Quiz Schemas.

Pydantic models for vocabulary quiz generation, submission, and results.
These schemas support the definition-based vocabulary quiz feature where
students are shown English definitions and must select the correct word.
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class VocabularyQuizGenerationRequest(BaseModel):
    """
    Request to generate a vocabulary quiz from book modules.

    Attributes:
        book_id: ID of the book to generate quiz from.
        module_ids: Optional list of specific module IDs. If None, uses all modules.
        quiz_length: Number of questions in the quiz (1-50, default 10).
        cefr_levels: Optional list of CEFR levels to filter vocabulary.
        include_audio: Whether to include audio URLs for word pronunciation.
        quiz_mode: Type of quiz (definition, synonym, antonym, or mixed).
    """

    book_id: int
    module_ids: list[int] | None = Field(
        default=None,
        description="Specific modules to use. If None, uses all modules.",
    )
    quiz_length: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Number of questions in the quiz (1-50).",
    )
    cefr_levels: list[str] | None = Field(
        default=None,
        description="CEFR levels to filter: A1, A2, B1, B2, C1",
    )
    include_audio: bool = Field(
        default=True,
        description="Whether to include audio URLs for pronunciation.",
    )
    quiz_mode: Literal["definition", "synonym", "antonym", "mixed"] = Field(
        default="mixed",
        description="Type of quiz: mixed (variety of definitions, synonyms, antonyms), definition, synonym, or antonym.",
    )


class VocabularyQuizQuestion(BaseModel):
    """
    A single question in a vocabulary quiz.

    Displays a prompt (definition, synonym, or antonym) and asks the student
    to select the correct word from multiple options.

    Attributes:
        question_id: Unique identifier for the question.
        definition: The prompt shown to the student (definition, synonym, or antonym).
        correct_answer: The correct word that matches the prompt.
        options: List of 4 word options including the correct answer.
        audio_url: Optional presigned URL for word pronunciation audio.
        vocabulary_id: Reference to the DCS vocabulary word ID.
        cefr_level: CEFR difficulty level of the word.
        question_type: Type of question (definition, synonym, antonym).
    """

    question_id: str
    definition: str  # This is the prompt (definition, synonym, or antonym)
    correct_answer: str
    options: list[str] = Field(min_length=4, max_length=4)
    audio_url: str | None = Field(default=None)
    vocabulary_id: str
    cefr_level: str
    question_type: Literal["definition", "synonym", "antonym"] = Field(
        default="definition",
        description="Type of question: definition, synonym, or antonym.",
    )


class VocabularyQuizQuestionPublic(BaseModel):
    """
    Public version of quiz question without the correct answer.

    Used when returning quiz questions to students before submission.
    The correct_answer field is omitted to prevent cheating.

    Attributes:
        question_id: Unique identifier for the question.
        definition: The prompt shown to the student (definition, synonym, or antonym).
        options: List of 4 word options.
        audio_url: Optional presigned URL for word pronunciation audio.
        cefr_level: CEFR difficulty level of the word.
        question_type: Type of question (definition, synonym, antonym).
    """

    question_id: str
    definition: str  # This is the prompt (definition, synonym, or antonym)
    options: list[str] = Field(min_length=4, max_length=4)
    audio_url: str | None = Field(default=None)
    cefr_level: str
    question_type: Literal["definition", "synonym", "antonym"] = Field(
        default="definition",
        description="Type of question: definition, synonym, or antonym.",
    )


class VocabularyQuiz(BaseModel):
    """
    A complete vocabulary quiz with all questions.

    This is the full quiz representation stored internally,
    including correct answers.

    Attributes:
        quiz_id: Unique identifier for the quiz.
        book_id: ID of the book the quiz is generated from.
        module_ids: List of module IDs used for the quiz.
        questions: List of quiz questions with answers.
        created_at: When the quiz was generated.
        quiz_length: Number of questions in the quiz.
        quiz_mode: Type of quiz (definition, synonym, antonym, or mixed).
    """

    quiz_id: str
    book_id: int
    module_ids: list[int]
    questions: list[VocabularyQuizQuestion]
    created_at: datetime
    quiz_length: int
    quiz_mode: Literal["definition", "synonym", "antonym", "mixed"] = Field(
        default="mixed",
        description="Type of quiz: mixed (variety), definition, synonym, or antonym.",
    )


class VocabularyQuizPublic(BaseModel):
    """
    Public version of quiz without correct answers.

    Returned to students when they access a quiz for taking.

    Attributes:
        quiz_id: Unique identifier for the quiz.
        book_id: ID of the book the quiz is generated from.
        module_ids: List of module IDs used for the quiz.
        questions: List of quiz questions without answers.
        created_at: When the quiz was generated.
        quiz_length: Number of questions in the quiz.
        quiz_mode: Type of quiz (definition, synonym, antonym, or mixed).
    """

    quiz_id: str
    book_id: int
    module_ids: list[int]
    questions: list[VocabularyQuizQuestionPublic]
    created_at: datetime
    quiz_length: int
    quiz_mode: Literal["definition", "synonym", "antonym", "mixed"] = Field(
        default="mixed",
        description="Type of quiz: mixed (variety), definition, synonym, or antonym.",
    )


class VocabularyQuizSubmission(BaseModel):
    """
    Student's submission of quiz answers.

    Maps question IDs to the selected answer words.

    Attributes:
        answers: Dictionary mapping question_id to selected word.
    """

    answers: dict[str, str] = Field(
        description="Map of question_id to selected answer word.",
    )


class QuestionResult(BaseModel):
    """
    Result for a single question after submission.

    Attributes:
        question_id: ID of the question.
        definition: The definition that was shown.
        correct_answer: The correct word.
        student_answer: The word the student selected.
        is_correct: Whether the student's answer was correct.
        audio_url: Audio URL for the word pronunciation.
    """

    question_id: str
    definition: str
    correct_answer: str
    student_answer: str | None
    is_correct: bool
    audio_url: str | None = Field(default=None)


class VocabularyQuizResult(BaseModel):
    """
    Complete results of a submitted vocabulary quiz.

    Returned after a student submits their answers, revealing
    the correct answers and calculating the score.

    Attributes:
        quiz_id: ID of the quiz.
        student_id: ID of the student who submitted.
        score: Number of correct answers.
        total: Total number of questions.
        percentage: Score as a percentage (0-100).
        question_results: Detailed results for each question.
        submitted_at: When the quiz was submitted.
    """

    quiz_id: str
    student_id: UUID
    score: int = Field(ge=0)
    total: int = Field(ge=1)
    percentage: float = Field(ge=0, le=100)
    question_results: list[QuestionResult]
    submitted_at: datetime
