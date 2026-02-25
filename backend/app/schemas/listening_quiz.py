"""
Listening Quiz Schemas.

Pydantic models for AI-powered listening comprehension quizzes (Audio + MCQ).
Students listen to TTS-generated audio clips and answer multiple-choice questions.

Epic 30 - Story 30.4: Listening Skill — Quiz Format (Audio + MCQ)
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# Sub-skill types for listening questions
ListeningSubSkill = Literal["gist", "detail", "discrimination"]

# Valid difficulty levels (CEFR-aligned)
ListeningDifficulty = Literal["auto", "easy", "medium", "hard"]


class ListeningQuizRequest(BaseModel):
    """Request to generate a listening quiz activity."""

    book_id: int
    module_ids: list[int] = Field(
        min_length=1,
        description="At least one module ID required.",
    )
    question_count: int = Field(
        default=10,
        ge=5,
        le=20,
        description="Number of questions (5, 10, 15, or 20).",
    )
    difficulty: ListeningDifficulty = Field(
        default="auto",
        description="Difficulty level. 'auto' uses module's CEFR level.",
    )
    language: str | None = Field(
        default=None,
        description="Language code. Auto-detected if not provided.",
    )


class ListeningQuizQuestion(BaseModel):
    """A single listening quiz question with audio prompt and MCQ options."""

    question_id: str
    audio_text: str = Field(
        description="Text spoken in the audio. Stored for teacher review, NOT shown to students.",
    )
    audio_url: str | None = Field(
        default=None,
        description="URL to the TTS-generated audio clip.",
    )
    audio_status: Literal["pending", "ready", "failed"] = Field(
        default="pending",
        description="Status of audio generation.",
    )
    question_text: str = Field(
        description="The question displayed to the student (e.g., 'What time does the train depart?').",
    )
    options: list[str] = Field(min_length=4, max_length=4)
    correct_answer: str
    correct_index: int = Field(ge=0, le=3)
    explanation: str | None = Field(default=None)
    hint_enabled: bool = Field(
        default=False,
        description="When True, students can reveal the audio_text as a hint.",
    )
    sub_skill: ListeningSubSkill = Field(
        description="Listening sub-skill tested by this question.",
    )
    difficulty: str = Field(
        description="CEFR level for this question (e.g., 'A1', 'A2', 'B1').",
    )


class ListeningQuizQuestionPublic(BaseModel):
    """Public version of listening question — audio_text is EXCLUDED."""

    question_id: str
    audio_url: str | None = None
    audio_status: str = "ready"
    question_text: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    sub_skill: ListeningSubSkill
    difficulty: str


class ListeningQuizActivity(BaseModel):
    """A complete listening quiz activity with audio prompts and MCQ questions."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    questions: list[ListeningQuizQuestion]
    total_questions: int
    difficulty: str
    language: str
    created_at: datetime


class ListeningQuizActivityPublic(BaseModel):
    """Public version — no correct answers, no audio_text."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    questions: list[ListeningQuizQuestionPublic]
    total_questions: int
    difficulty: str
    language: str
    created_at: datetime
