"""Pydantic schemas for Direct Message API requests/responses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MessageCreate(BaseModel):
    """Schema for creating a new message."""

    recipient_id: uuid.UUID
    subject: str | None = Field(None, max_length=500)
    body: str = Field(..., min_length=1)
    parent_message_id: uuid.UUID | None = None

    @field_validator("body")
    @classmethod
    def validate_body_not_empty(cls, v: str) -> str:
        """Validate body is not empty or whitespace."""
        if not v.strip():
            raise ValueError("Message body cannot be empty")
        return v


class MessagePublic(BaseModel):
    """Schema for message API response with sender/recipient names."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    sender_email: str
    recipient_id: uuid.UUID
    recipient_name: str
    recipient_email: str
    subject: str | None
    body: str
    parent_message_id: uuid.UUID | None
    is_read: bool
    sent_at: datetime


class ConversationPublic(BaseModel):
    """Schema for a conversation (grouped messages with a participant)."""

    participant_id: uuid.UUID
    participant_name: str
    participant_email: str
    participant_role: str
    last_message_preview: str
    last_message_timestamp: datetime
    unread_count: int


class ConversationListResponse(BaseModel):
    """Schema for paginated conversation list response."""

    conversations: list[ConversationPublic]
    total: int
    limit: int
    offset: int
    has_more: bool
    total_unread: int


class MessageThreadResponse(BaseModel):
    """Schema for message thread response."""

    participant_id: uuid.UUID
    participant_name: str
    participant_email: str
    participant_role: str
    messages: list[MessagePublic]
    total_messages: int


class RecipientPublic(BaseModel):
    """Schema for an allowed recipient."""

    user_id: uuid.UUID
    name: str
    email: str
    role: str


class RecipientListResponse(BaseModel):
    """Schema for list of allowed recipients."""

    recipients: list[RecipientPublic]
    total: int


class MessageReadResponse(BaseModel):
    """Schema for message read status update response."""

    id: uuid.UUID
    is_read: bool


class UnreadMessagesCountResponse(BaseModel):
    """Schema for unread messages count response."""

    count: int
