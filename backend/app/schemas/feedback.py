"""Pydantic schemas for Feedback API requests/responses."""

import uuid
from datetime import datetime
from typing import TypedDict

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BadgeInfo(TypedDict):
    """Type definition for badge information."""

    slug: str
    label: str
    icon: str


class EmojiInfo(TypedDict):
    """Type definition for emoji reaction information."""

    slug: str
    emoji: str


class FeedbackCreate(BaseModel):
    """Schema for creating feedback on a student assignment."""

    feedback_text: str = Field(..., min_length=1, max_length=1000)
    is_draft: bool = Field(default=False)
    badges: list[str] | None = Field(default=None, max_length=6)
    emoji_reaction: str | None = Field(default=None)

    @field_validator("feedback_text")
    @classmethod
    def validate_feedback_not_empty(cls, v: str) -> str:
        """Validate feedback text is not empty or whitespace."""
        if not v.strip():
            raise ValueError("Feedback text cannot be empty")
        return v

    @field_validator("badges")
    @classmethod
    def validate_badges(cls, v: list[str] | None) -> list[str] | None:
        """Validate badges are from predefined list."""
        if v is None:
            return v
        # Import here to avoid circular imports
        from app.core.feedback_constants import MAX_BADGES_PER_FEEDBACK, VALID_BADGE_SLUGS

        if len(v) > MAX_BADGES_PER_FEEDBACK:
            raise ValueError(f"Maximum {MAX_BADGES_PER_FEEDBACK} badges allowed")
        invalid_badges = [b for b in v if b not in VALID_BADGE_SLUGS]
        if invalid_badges:
            raise ValueError(f"Invalid badge(s): {', '.join(invalid_badges)}")
        return v

    @field_validator("emoji_reaction")
    @classmethod
    def validate_emoji_reaction(cls, v: str | None) -> str | None:
        """Validate emoji reaction is from available list."""
        if v is None:
            return v
        from app.core.feedback_constants import VALID_EMOJI_SLUGS

        if v not in VALID_EMOJI_SLUGS:
            raise ValueError(f"Invalid emoji reaction: {v}")
        return v


class FeedbackUpdate(BaseModel):
    """Schema for updating feedback."""

    feedback_text: str | None = Field(None, min_length=1, max_length=1000)
    is_draft: bool | None = None
    badges: list[str] | None = Field(default=None, max_length=6)
    emoji_reaction: str | None = Field(default=None)

    @field_validator("feedback_text")
    @classmethod
    def validate_feedback_not_empty(cls, v: str | None) -> str | None:
        """Validate feedback text is not empty or whitespace if provided."""
        if v is not None and not v.strip():
            raise ValueError("Feedback text cannot be empty")
        return v

    @field_validator("badges")
    @classmethod
    def validate_badges(cls, v: list[str] | None) -> list[str] | None:
        """Validate badges are from predefined list."""
        if v is None:
            return v
        from app.core.feedback_constants import MAX_BADGES_PER_FEEDBACK, VALID_BADGE_SLUGS

        if len(v) > MAX_BADGES_PER_FEEDBACK:
            raise ValueError(f"Maximum {MAX_BADGES_PER_FEEDBACK} badges allowed")
        invalid_badges = [b for b in v if b not in VALID_BADGE_SLUGS]
        if invalid_badges:
            raise ValueError(f"Invalid badge(s): {', '.join(invalid_badges)}")
        return v

    @field_validator("emoji_reaction")
    @classmethod
    def validate_emoji_reaction(cls, v: str | None) -> str | None:
        """Validate emoji reaction is from available list."""
        if v is None:
            return v
        from app.core.feedback_constants import VALID_EMOJI_SLUGS

        if v not in VALID_EMOJI_SLUGS:
            raise ValueError(f"Invalid emoji reaction: {v}")
        return v


class FeedbackPublic(BaseModel):
    """Schema for feedback API response with related entity names."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    assignment_student_id: uuid.UUID
    teacher_id: uuid.UUID
    feedback_text: str | None
    badges: list[str]
    emoji_reactions: list[str]
    is_draft: bool
    created_at: datetime
    updated_at: datetime
    # Related entity info
    assignment_id: uuid.UUID
    assignment_name: str
    student_id: uuid.UUID
    student_name: str
    student_user_id: uuid.UUID
    teacher_name: str
    teacher_user_id: uuid.UUID
    score: float | None


class FeedbackStudentView(BaseModel):
    """Schema for feedback as viewed by a student (hides draft status)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    feedback_text: str | None
    badges: list[str]
    emoji_reactions: list[str]
    created_at: datetime
    updated_at: datetime
    teacher_name: str
    teacher_user_id: uuid.UUID
    assignment_name: str
    assignment_id: uuid.UUID


class FeedbackOptionsResponse(BaseModel):
    """Response schema for available feedback options (badges and emoji)."""

    badges: list[BadgeInfo]
    emoji_reactions: list[EmojiInfo]


class StudentBadgeCountsResponse(BaseModel):
    """Response schema for student badge counts (Story 6.5, AC: 9, 14)."""

    badge_counts: dict[str, int]
    total: int
    this_month: dict[str, int]
    this_month_total: int
