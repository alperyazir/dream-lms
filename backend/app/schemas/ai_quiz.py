"""
AI Quiz Schemas.

Pydantic models for AI-powered MCQ quiz generation, submission, and results.
These schemas support the AI quiz feature where teachers can generate
comprehension quizzes from book module content using LLM-generated questions.
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AIQuizGenerationRequest(BaseModel):
    """
    Request to generate an AI-powered MCQ quiz from book modules.

    Attributes:
        source_type: Source type (book or material). Defaults to book.
        book_id: ID of the book to generate quiz from.
        module_ids: List of module IDs to use as source content (at least one).
        difficulty: Difficulty level affecting question complexity.
        question_count: Number of questions to generate (1-20).
        language: Language for questions. If None, auto-detected from modules.
        include_explanations: Whether to include explanations for correct answers.
    """

    model_config = ConfigDict(extra="ignore")

    source_type: Literal["book", "material"] = Field(
        default="book",
        description="Source type: book or material.",
    )
    book_id: int
    module_ids: list[int] = Field(
        min_length=1,
        description="At least one module ID required.",
    )
    difficulty: Literal["auto", "easy", "medium", "hard"] = Field(
        default="medium",
        description="Difficulty level: auto, easy, medium, or hard.",
    )
    question_count: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Number of questions (1-50).",
    )
    language: str | None = Field(
        default=None,
        description="Language code. Auto-detected if not provided.",
    )
    include_explanations: bool = Field(
        default=True,
        description="Whether to include explanations for correct answers.",
    )


class AIQuizQuestion(BaseModel):
    """
    A single MCQ question in an AI quiz.

    Contains the question text, options, correct answer, and optional
    explanation. Internal version with correct answer visible.

    Attributes:
        question_id: Unique identifier for the question.
        question_text: The question prompt.
        options: List of 4 answer options.
        correct_answer: The correct option text.
        correct_index: Index of correct answer (0-3).
        explanation: Explanation of why the answer is correct.
        source_module_id: Module ID the question is derived from.
        source_page: Page number reference (optional).
        difficulty: Difficulty level of the question.
    """

    question_id: str
    question_text: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct_answer: str
    correct_index: int = Field(ge=0, le=3)
    explanation: str | None = Field(default=None)
    source_module_id: int
    source_page: int | None = Field(default=None)
    difficulty: str


class AIQuizQuestionPublic(BaseModel):
    """
    Public version of quiz question without the correct answer.

    Used when returning quiz questions to students before submission.
    The correct_answer, correct_index, and explanation fields are omitted.

    Attributes:
        question_id: Unique identifier for the question.
        question_text: The question prompt.
        options: List of 4 answer options.
        source_module_id: Module ID the question is derived from.
        difficulty: Difficulty level of the question.
    """

    question_id: str
    question_text: str
    options: list[str] = Field(min_length=4, max_length=4)
    source_module_id: int
    difficulty: str


class AIQuiz(BaseModel):
    """
    A complete AI-generated quiz with all questions.

    This is the full quiz representation stored internally,
    including correct answers and explanations.

    Attributes:
        quiz_id: Unique identifier for the quiz.
        book_id: ID of the book the quiz is generated from.
        module_ids: List of module IDs used for the quiz.
        questions: List of quiz questions with answers.
        difficulty: Overall difficulty level of the quiz.
        language: Language of the quiz content.
        created_at: When the quiz was generated.
    """

    quiz_id: str
    book_id: int
    module_ids: list[int]
    questions: list[AIQuizQuestion]
    difficulty: str
    language: str
    created_at: datetime


class AIQuizPublic(BaseModel):
    """
    Public version of quiz without correct answers.

    Returned to students when they access a quiz for taking.

    Attributes:
        quiz_id: Unique identifier for the quiz.
        book_id: ID of the book the quiz is generated from.
        module_ids: List of module IDs used for the quiz.
        questions: List of quiz questions without answers.
        difficulty: Overall difficulty level of the quiz.
        language: Language of the quiz content.
        created_at: When the quiz was generated.
        question_count: Number of questions in the quiz.
    """

    quiz_id: str
    book_id: int
    module_ids: list[int]
    questions: list[AIQuizQuestionPublic]
    difficulty: str
    language: str
    created_at: datetime
    question_count: int


class AIQuizSubmission(BaseModel):
    """
    Student's submission of quiz answers.

    Maps question IDs to the selected answer index.

    Attributes:
        answers: Dictionary mapping question_id to selected option index (0-3).
    """

    answers: dict[str, int] = Field(
        description="Map of question_id to selected answer index (0-3).",
    )


class AIQuizQuestionResult(BaseModel):
    """
    Result for a single question after submission.

    Attributes:
        question_id: ID of the question.
        question_text: The question that was asked.
        options: All answer options.
        correct_answer: The correct answer text.
        correct_index: Index of the correct answer.
        student_answer_index: The index the student selected.
        student_answer: The answer text the student selected.
        is_correct: Whether the student's answer was correct.
        explanation: Explanation of the correct answer.
        source_module_id: Module the question came from.
    """

    question_id: str
    question_text: str
    options: list[str]
    correct_answer: str
    correct_index: int
    student_answer_index: int | None
    student_answer: str | None
    is_correct: bool
    explanation: str | None = Field(default=None)
    source_module_id: int


class AIQuizResult(BaseModel):
    """
    Complete results of a submitted AI quiz.

    Returned after a student submits their answers, revealing
    the correct answers, explanations, and calculating the score.

    Attributes:
        quiz_id: ID of the quiz.
        student_id: ID of the student who submitted.
        score: Number of correct answers.
        total: Total number of questions.
        percentage: Score as a percentage (0-100).
        question_results: Detailed results for each question.
        submitted_at: When the quiz was submitted.
        difficulty: Difficulty level of the quiz.
    """

    quiz_id: str
    student_id: UUID
    score: int = Field(ge=0)
    total: int = Field(ge=1)
    percentage: float = Field(ge=0, le=100)
    question_results: list[AIQuizQuestionResult]
    submitted_at: datetime
    difficulty: str


class RegenerateQuestionRequest(BaseModel):
    """
    Request to regenerate a single question in a quiz.

    Attributes:
        quiz_id: ID of the quiz containing the question.
        question_index: Zero-based index of the question to regenerate.
        context: Original generation context (difficulty, language, etc.).
    """

    quiz_id: str
    question_index: int = Field(ge=0, description="Zero-based index of the question")
    context: dict = Field(
        default_factory=dict,
        description="Original generation parameters (difficulty, language, etc.)",
    )


class SaveToLibraryRequest(BaseModel):
    """
    Request to save generated content to teacher's library.

    Attributes:
        quiz_id: ID of the quiz to save.
        activity_type: Type of activity (ai_quiz, vocabulary_quiz, reading, etc.).
        title: Title for the saved content.
        description: Optional description for the saved content.
        content: Optional full content data. If provided, used directly.
            If not provided, falls back to looking up from in-memory storage.
    """

    quiz_id: str
    activity_type: str = Field(max_length=50)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    content: dict | None = Field(
        default=None,
        description="Full content data. If provided, used directly instead of storage lookup."
    )
    # Skill classification (Epic 30 - Story 30.3)
    skill_id: UUID | None = Field(default=None, description="SkillCategory UUID from V2 generation")
    format_id: UUID | None = Field(default=None, description="ActivityFormat UUID from V2 generation")


class SaveToLibraryResponse(BaseModel):
    """
    Response after saving content to library.

    Attributes:
        content_id: ID of the saved content in teacher's library.
        title: Title of the saved content.
        activity_type: Type of activity.
        created_at: When the content was saved.
    """

    content_id: UUID
    title: str
    activity_type: str
    created_at: datetime


class CreateAssignmentRequest(BaseModel):
    """
    Request to create an assignment from generated content.

    Attributes:
        quiz_id: ID of the quiz to create assignment from.
        activity_type: Type of activity (ai_quiz, vocabulary_quiz, reading, etc.).
        title: Title for the assignment.
        description: Optional description for the assignment.
    """

    quiz_id: str
    activity_type: str = Field(max_length=50)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
