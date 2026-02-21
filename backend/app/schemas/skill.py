"""Schemas for Skill Category and Activity Format (Epic 30 - Stories 30.1, 30.2)."""

import uuid

from pydantic import BaseModel
from sqlmodel import SQLModel


class SkillCategoryPublic(SQLModel):
    """Public schema for skill categories."""
    id: uuid.UUID
    name: str
    slug: str
    icon: str
    color: str
    description: str | None = None
    is_active: bool


class ActivityFormatPublic(SQLModel):
    """Public schema for activity formats."""
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    coming_soon: bool = False


class SkillWithFormatsResponse(SQLModel):
    """Skill category with its available activity formats."""
    skill: SkillCategoryPublic
    formats: list[ActivityFormatPublic]


# =============================================================================
# Mix Mode Per-Question Skill Schema (Story 30.2)
# =============================================================================


class MixModeQuestion(BaseModel):
    """Single question in a Mix mode assignment with skill tagging."""
    question_id: str
    skill_id: uuid.UUID
    skill_slug: str
    format_slug: str
    question_data: dict


class MixModeSkillDistribution(BaseModel):
    """Skill distribution summary for Mix mode content."""
    # skill_slug → question count
    distribution: dict[str, int]


class MixModeContent(BaseModel):
    """Validated structure for activity_content in Mix mode assignments.

    Used to validate/document the JSON stored in Assignment.activity_content
    when is_mix_mode=True.
    """
    questions: list[MixModeQuestion]
    skill_distribution: dict[str, int]


# =============================================================================
# Skill Breakdown Response (Story 30.13)
# =============================================================================


class SkillBreakdownItem(BaseModel):
    """Per-skill score breakdown for an assignment."""
    skill_id: uuid.UUID
    skill_name: str
    skill_slug: str
    skill_color: str
    average_score: float
    student_count: int
    min_score: float
    max_score: float
    is_weakest: bool


class AssignmentSkillBreakdownResponse(BaseModel):
    """Assignment skill breakdown with per-skill averages."""
    assignment_id: uuid.UUID
    primary_skill: SkillCategoryPublic | None
    activity_format: ActivityFormatPublic | None
    is_mix_mode: bool
    skill_breakdown: list[SkillBreakdownItem]


# =============================================================================
# Student Skill Profile (Story 30.14)
# =============================================================================

from typing import Literal


# =============================================================================
# Class Skill Heatmap (Story 30.15)
# =============================================================================


class StudentSkillCell(BaseModel):
    """Single cell in the class skill heatmap."""
    proficiency: float | None  # 0-100, None if no data
    data_points: int
    confidence: Literal["insufficient", "low", "moderate", "high"]


class StudentSkillRow(BaseModel):
    """One student row in the class skill heatmap."""
    student_id: uuid.UUID
    student_name: str
    skills: dict[str, StudentSkillCell]  # keyed by skill_slug


class ClassSkillHeatmapResponse(BaseModel):
    """Class skill heatmap with students x skills matrix."""
    class_id: uuid.UUID
    class_name: str
    skill_columns: list[SkillCategoryPublic]
    students: list[StudentSkillRow]
    class_averages: dict[str, float | None]  # skill_slug → avg proficiency


# =============================================================================
# Skill Trend Over Time (Story 30.16)
# =============================================================================


class SkillTrendPoint(BaseModel):
    """Single data point in a skill trend line."""
    date: str  # ISO date string
    score: float  # percentage 0-100
    assignment_name: str | None
    cefr_level: str | None


class SkillTrendLine(BaseModel):
    """Trend line for one skill."""
    skill_id: uuid.UUID
    skill_name: str
    skill_slug: str
    skill_color: str
    data_points: list[SkillTrendPoint]
    has_sufficient_data: bool  # >= 3 points


class StudentSkillTrendsResponse(BaseModel):
    """Student skill trends over time."""
    student_id: uuid.UUID
    period: str
    trends: list[SkillTrendLine]


class SkillProfileItem(BaseModel):
    """Per-skill proficiency data for a student."""
    skill_id: uuid.UUID
    skill_name: str
    skill_slug: str
    skill_color: str
    skill_icon: str
    proficiency: float | None  # 0-100, None if insufficient data
    data_points: int
    confidence: Literal["insufficient", "low", "moderate", "high"]
    trend: Literal["improving", "stable", "declining"] | None


class StudentSkillProfileResponse(BaseModel):
    """Complete student skill profile with per-skill proficiency."""
    student_id: uuid.UUID
    student_name: str
    skills: list[SkillProfileItem]
    total_ai_assignments_completed: int
