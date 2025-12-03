"""Pydantic schemas for Notification API requests/responses."""

import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NotificationType(str, Enum):
    """Enum for notification types."""

    assignment_created = "assignment_created"
    deadline_approaching = "deadline_approaching"
    feedback_received = "feedback_received"
    message_received = "message_received"
    student_completed = "student_completed"
    past_due = "past_due"
    material_shared = "material_shared"
    system_announcement = "system_announcement"


class NotificationBase(BaseModel):
    """Base schema for notification data."""

    title: str = Field(..., min_length=1, max_length=500)
    message: str = Field(..., min_length=1)
    link: str | None = Field(None, max_length=500)

    @field_validator("title")
    @classmethod
    def validate_title_not_empty(cls, v: str) -> str:
        """Validate title is not empty or whitespace."""
        if not v.strip():
            raise ValueError("Title cannot be empty")
        return v


class NotificationCreate(NotificationBase):
    """Schema for creating a notification (service layer usage)."""

    user_id: uuid.UUID
    type: NotificationType


class NotificationResponse(BaseModel):
    """Schema for notification API response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    type: NotificationType
    title: str
    message: str
    link: str | None
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    """Schema for paginated notification list response."""

    notifications: list[NotificationResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


class UnreadCountResponse(BaseModel):
    """Schema for unread notification count response."""

    count: int


class MarkAllReadResponse(BaseModel):
    """Schema for mark all as read response."""

    marked_count: int
