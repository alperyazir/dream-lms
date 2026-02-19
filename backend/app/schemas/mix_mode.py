"""
Mix Mode Schemas.

Epic 30 - Story 30.8: Mix Mode Generation
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SkillAllocation(BaseModel):
    """Allocation for one skill in mix mode."""

    skill_slug: str
    format_slug: str
    count: int
    skill_name: str = ""
    format_name: str = ""


class MixModeQuestion(BaseModel):
    """A single question in a mix mode activity, tagged with skill/format metadata."""

    question_id: str
    skill_slug: str
    format_slug: str
    question_data: dict[str, Any] = Field(
        description="The question content from the individual generator.",
    )


class MixModeActivity(BaseModel):
    """Complete mix mode activity with questions from multiple skills."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    is_mix_mode: bool = True
    skill_distribution: dict[str, dict[str, Any]] = Field(
        description="Per-skill allocation summary: {skill_slug: {count, format}}",
    )
    questions: list[MixModeQuestion]
    total_questions: int
    skills_covered: int
    difficulty: str
    language: str
    created_at: datetime


class MixModeActivityPublic(BaseModel):
    """Public version of mix mode activity (questions may have answers stripped)."""

    activity_id: str
    book_id: int
    module_ids: list[int]
    is_mix_mode: bool = True
    skill_distribution: dict[str, dict[str, Any]]
    questions: list[MixModeQuestion]
    total_questions: int
    skills_covered: int
    difficulty: str
    language: str
    created_at: datetime


class ContentAnalysisResult(BaseModel):
    """Result of analyzing module content for skill weights."""

    vocabulary_weight: float = 1.0
    grammar_weight: float = 1.0
    reading_weight: float = 1.0
    listening_weight: float = 1.0
    writing_weight: float = 1.0
