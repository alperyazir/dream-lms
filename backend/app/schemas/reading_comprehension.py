"""
Reading Comprehension Schemas.

Pydantic models for AI-powered reading comprehension activities.
Uses ACTUAL book module content as passages and generates comprehension
questions (MCQ, True/False, Short Answer) about the passage.

Story 27.10: Reading Comprehension Generation
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# Valid question types - Only MCQ and True/False are supported
QUESTION_TYPES = ["mcq", "true_false"]
QuestionType = Literal["mcq", "true_false"]

# Valid difficulty levels
DIFFICULTY_LEVELS = ["auto", "easy", "medium", "hard"]
DifficultyLevel = Literal["auto", "easy", "medium", "hard"]


class ReadingComprehensionRequest(BaseModel):
    """
    Request to generate a reading comprehension activity.

    The LLM creates an ORIGINAL passage based on module topics/context,
    then generates comprehension questions about that passage.

    Attributes:
        book_id: ID of the book containing the module.
        module_id: ID of the module to use as context source.
        question_count: Number of questions to generate (1-10).
        question_types: Types of questions to generate.
        difficulty: Difficulty level. "auto" uses module's CEFR level.
        passage_length: Target word count for the AI-generated passage.
    """

    book_id: int
    module_id: int = Field(
        description="Module ID - used as context for passage generation.",
    )
    question_count: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Number of questions (1-50).",
    )
    question_types: list[QuestionType] = Field(
        default=["mcq", "true_false"],
        description="Types of questions to generate (MCQ and True/False only).",
    )
    difficulty: DifficultyLevel = Field(
        default="auto",
        description="Difficulty level. 'auto' uses module's CEFR level.",
    )
    passage_length: int = Field(
        default=200,
        ge=100,
        le=500,
        description="Target word count for the AI-generated passage (100-500).",
    )


class ReadingComprehensionQuestion(BaseModel):
    """
    A single comprehension question about the passage.

    Contains the question, answer options (for MCQ/True-False),
    correct answer, and a passage reference quote.

    Attributes:
        question_id: Unique identifier for the question.
        question_type: Type of question (mcq, true_false, short_answer).
        question_text: The question or statement text.
        options: Answer options (for MCQ/True-False, None for short_answer).
        correct_answer: The correct answer text.
        correct_index: Index of correct answer (for MCQ/True-False).
        explanation: Explanation of the correct answer.
        passage_reference: Quote from passage that supports the answer.
    """

    question_id: str
    question_type: QuestionType
    question_text: str
    options: list[str] | None = Field(
        default=None,
        description="Answer options for MCQ (4 options) or True/False (2 options).",
    )
    correct_answer: str
    correct_index: int | None = Field(
        default=None,
        description="Index of correct answer for MCQ/True-False.",
    )
    explanation: str
    passage_reference: str = Field(
        description="Quote from passage supporting the answer.",
    )


class ReadingComprehensionQuestionPublic(BaseModel):
    """
    Public version of question without correct answer.

    Used when returning questions to students before submission.

    Attributes:
        question_id: Unique identifier for the question.
        question_type: Type of question.
        question_text: The question or statement text.
        options: Answer options (for MCQ/True-False).
    """

    question_id: str
    question_type: QuestionType
    question_text: str
    options: list[str] | None = Field(default=None)


class ReadingComprehensionActivity(BaseModel):
    """
    A complete reading comprehension activity.

    Contains an AI-generated passage based on module topics/context
    and comprehension questions about that passage.

    Attributes:
        activity_id: Unique identifier for the activity.
        book_id: ID of the source book.
        module_id: ID of the source module.
        module_title: Title of the module.
        passage: AI-generated passage based on module topics.
        passage_pages: Page numbers from the source module.
        questions: List of comprehension questions.
        difficulty: Difficulty level of the activity.
        language: Language of the content.
        created_at: When the activity was generated.
    """

    activity_id: str
    book_id: int
    module_id: int
    module_title: str
    passage: str = Field(
        description="AI-generated passage based on module topics/context.",
    )
    passage_pages: list[int] = Field(default_factory=list)
    questions: list[ReadingComprehensionQuestion]
    difficulty: str
    language: str
    created_at: datetime


class ReadingComprehensionActivityPublic(BaseModel):
    """
    Public version of activity without correct answers.

    Returned to students when they access an activity.

    Attributes:
        activity_id: Unique identifier for the activity.
        book_id: ID of the source book.
        module_id: ID of the source module.
        module_title: Title of the module.
        passage: ACTUAL text from the module.
        passage_pages: Page numbers covered by the passage.
        questions: List of questions without answers.
        difficulty: Difficulty level.
        language: Language of the content.
        created_at: When the activity was generated.
        question_count: Number of questions.
    """

    activity_id: str
    book_id: int
    module_id: int
    module_title: str
    passage: str
    passage_pages: list[int] = Field(default_factory=list)
    questions: list[ReadingComprehensionQuestionPublic]
    difficulty: str
    language: str
    created_at: datetime
    question_count: int


class ReadingComprehensionAnswer(BaseModel):
    """
    A single answer in a submission.

    For MCQ/True-False: answer_index is used.
    For Short Answer: answer_text is used.

    Attributes:
        question_id: ID of the question being answered.
        answer_index: Selected option index (for MCQ/True-False).
        answer_text: Text answer (for short answer questions).
    """

    question_id: str
    answer_index: int | None = Field(
        default=None,
        description="Selected option index for MCQ/True-False.",
    )
    answer_text: str | None = Field(
        default=None,
        description="Text answer for short answer questions.",
    )


class ReadingComprehensionSubmission(BaseModel):
    """
    Student's submission of activity answers.

    Attributes:
        answers: List of answers for each question.
    """

    answers: list[ReadingComprehensionAnswer] = Field(
        description="List of answers for each question.",
    )


class ReadingComprehensionQuestionResult(BaseModel):
    """
    Result for a single question after submission.

    Attributes:
        question_id: ID of the question.
        question_type: Type of question.
        question_text: The question text.
        options: Answer options (if applicable).
        correct_answer: The correct answer.
        correct_index: Index of correct answer (if applicable).
        student_answer_index: Index selected by student (if applicable).
        student_answer_text: Text answer by student (if applicable).
        is_correct: Whether the answer was correct.
        similarity_score: Similarity score for short answers (0-1).
        explanation: Explanation of the correct answer.
        passage_reference: Quote from passage supporting the answer.
    """

    question_id: str
    question_type: QuestionType
    question_text: str
    options: list[str] | None = Field(default=None)
    correct_answer: str
    correct_index: int | None = Field(default=None)
    student_answer_index: int | None = Field(default=None)
    student_answer_text: str | None = Field(default=None)
    is_correct: bool
    similarity_score: float | None = Field(
        default=None,
        description="Similarity score for short answers (0-1).",
    )
    explanation: str
    passage_reference: str


class ReadingComprehensionResult(BaseModel):
    """
    Complete results of a submitted reading comprehension activity.

    Returned after a student submits their answers.

    Attributes:
        activity_id: ID of the activity.
        student_id: ID of the student who submitted.
        score: Number of correct answers.
        total: Total number of questions.
        percentage: Score as a percentage (0-100).
        question_results: Detailed results for each question.
        score_by_type: Score breakdown by question type.
        submitted_at: When the activity was submitted.
        difficulty: Difficulty level of the activity.
        passage: The passage text (for review).
        module_title: Title of the source module.
    """

    activity_id: str
    student_id: UUID
    score: int = Field(ge=0)
    total: int = Field(ge=1)
    percentage: float = Field(ge=0, le=100)
    question_results: list[ReadingComprehensionQuestionResult]
    score_by_type: dict[str, dict[str, int]] = Field(
        default_factory=dict,
        description="Score breakdown: {'mcq': {'correct': 2, 'total': 3}, ...}",
    )
    submitted_at: datetime
    difficulty: str
    passage: str
    module_title: str
