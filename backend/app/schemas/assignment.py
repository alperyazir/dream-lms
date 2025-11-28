"""Pydantic schemas for Assignment API requests/responses."""

import json
import uuid
from datetime import UTC, datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    computed_field,
    field_validator,
    model_validator,
)

from app.models import AssignmentStatus


class AssignmentCreate(BaseModel):
    """Schema for creating a new assignment."""

    activity_id: uuid.UUID
    book_id: uuid.UUID
    name: str
    instructions: str | None = None
    due_date: datetime | None = None
    time_limit_minutes: int | None = None
    student_ids: list[uuid.UUID] | None = None
    class_ids: list[uuid.UUID] | None = None

    @field_validator("name")
    @classmethod
    def validate_name_length(cls, v: str) -> str:
        """Validate name is within max length."""
        if len(v) > 500:
            raise ValueError("Name must be 500 characters or less")
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v

    @field_validator("due_date")
    @classmethod
    def validate_due_date_future(cls, v: datetime | None) -> datetime | None:
        """Validate due date is in the future if provided."""
        if v is not None and v < datetime.now(UTC):
            raise ValueError("Due date must be in the future")
        return v

    @field_validator("time_limit_minutes")
    @classmethod
    def validate_time_limit_positive(cls, v: int | None) -> int | None:
        """Validate time limit is positive if provided."""
        if v is not None and v <= 0:
            raise ValueError("Time limit must be greater than 0")
        return v

    @model_validator(mode="after")
    def validate_recipients(self) -> "AssignmentCreate":
        """Validate at least one of student_ids or class_ids is provided."""
        has_students = self.student_ids is not None and len(self.student_ids) > 0
        has_classes = self.class_ids is not None and len(self.class_ids) > 0

        if not has_students and not has_classes:
            raise ValueError("At least one student or class must be selected")

        return self


class AssignmentUpdate(BaseModel):
    """Schema for updating an existing assignment (partial update)."""

    name: str | None = None
    instructions: str | None = None
    due_date: datetime | None = None
    time_limit_minutes: int | None = None

    @field_validator("name")
    @classmethod
    def validate_name_length(cls, v: str | None) -> str | None:
        """Validate name is within max length if provided."""
        if v is not None:
            if len(v) > 500:
                raise ValueError("Name must be 500 characters or less")
            if not v.strip():
                raise ValueError("Name cannot be empty")
        return v

    @field_validator("due_date")
    @classmethod
    def validate_due_date_future(cls, v: datetime | None) -> datetime | None:
        """Validate due date is in the future if provided."""
        if v is not None and v < datetime.now(UTC):
            raise ValueError("Due date must be in the future")
        return v

    @field_validator("time_limit_minutes")
    @classmethod
    def validate_time_limit_positive(cls, v: int | None) -> int | None:
        """Validate time limit is positive if provided."""
        if v is not None and v <= 0:
            raise ValueError("Time limit must be greater than 0")
        return v


class AssignmentStudentResponse(BaseModel):
    """Assignment-student junction response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    assignment_id: uuid.UUID
    student_id: uuid.UUID
    status: AssignmentStatus
    score: int | None
    started_at: datetime | None
    completed_at: datetime | None


class AssignmentResponse(BaseModel):
    """Assignment response schema for API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    teacher_id: uuid.UUID
    activity_id: uuid.UUID
    book_id: uuid.UUID
    name: str
    instructions: str | None
    due_date: datetime | None
    time_limit_minutes: int | None
    created_at: datetime
    updated_at: datetime
    student_count: int = 0


class AssignmentListItem(BaseModel):
    """Assignment list item with enriched data for display."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    instructions: str | None
    due_date: datetime | None
    time_limit_minutes: int | None
    created_at: datetime

    # Enriched data
    book_id: uuid.UUID
    book_title: str
    activity_id: uuid.UUID
    activity_title: str
    activity_type: str

    # Student statistics
    total_students: int
    not_started: int
    in_progress: int
    completed: int

    # Teacher info (for admin view)
    teacher_name: str | None = None


class StudentAssignmentResponse(BaseModel):
    """Student-facing assignment response with enriched data."""

    model_config = ConfigDict(from_attributes=True)

    # Assignment fields
    assignment_id: uuid.UUID
    assignment_name: str
    instructions: str | None
    due_date: datetime | None
    time_limit_minutes: int | None
    created_at: datetime

    # Book fields
    book_id: uuid.UUID
    book_title: str
    book_cover_url: str | None

    # Activity fields
    activity_id: uuid.UUID
    activity_title: str
    activity_type: str

    # Student-specific fields from AssignmentStudent
    status: str
    score: int | None
    started_at: datetime | None
    completed_at: datetime | None
    time_spent_minutes: int

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of the allowed values."""
        allowed_statuses = ["not_started", "in_progress", "completed"]
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of {allowed_statuses}")
        return v

    @computed_field  # type: ignore[misc]
    @property
    def is_past_due(self) -> bool:
        """Calculate if assignment is past due."""
        if self.due_date is None:
            return False
        if self.status == "completed":
            return False
        # Ensure both datetimes are timezone-aware for comparison
        due_date_aware = self.due_date if self.due_date.tzinfo else self.due_date.replace(tzinfo=UTC)
        return due_date_aware < datetime.now(UTC)

    @computed_field  # type: ignore[misc]
    @property
    def days_until_due(self) -> int | None:
        """Calculate days until due date."""
        if self.due_date is None:
            return None
        # Ensure both datetimes are timezone-aware for comparison
        due_date_aware = self.due_date if self.due_date.tzinfo else self.due_date.replace(tzinfo=UTC)
        delta = due_date_aware - datetime.now(UTC)
        return delta.days


class ActivityStartResponse(BaseModel):
    """Response schema for starting an assignment - returns full activity configuration."""

    model_config = ConfigDict(from_attributes=True)

    # Assignment info
    assignment_id: uuid.UUID
    assignment_name: str
    instructions: str | None
    due_date: datetime | None
    time_limit_minutes: int | None

    # Book info
    book_id: uuid.UUID
    book_title: str
    book_name: str  # Story 4.2: For Dream Central Storage image URLs
    publisher_name: str  # Story 4.2: For Dream Central Storage image URLs
    book_cover_url: str | None

    # Activity info
    activity_id: uuid.UUID
    activity_title: str
    activity_type: str
    config_json: dict

    # Student progress (if resuming)
    current_status: str
    time_spent_minutes: int
    progress_json: dict | None

    @field_validator("current_status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of the allowed values."""
        allowed_statuses = ["not_started", "in_progress", "completed"]
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of {allowed_statuses}")
        return v

    @computed_field  # type: ignore[misc]
    @property
    def has_saved_progress(self) -> bool:
        """Check if there is saved progress to resume from."""
        return self.progress_json is not None and len(self.progress_json) > 0


class AssignmentSubmitRequest(BaseModel):
    """Student submission payload for completing an assignment."""

    answers_json: dict
    score: float
    time_spent_minutes: int
    completed_at: datetime | None = None

    @field_validator("score")
    @classmethod
    def validate_score_range(cls, v: float) -> float:
        """Validate score is between 0 and 100."""
        if v < 0 or v > 100:
            raise ValueError("Score must be between 0 and 100")
        return v

    @field_validator("time_spent_minutes")
    @classmethod
    def validate_time_spent_positive(cls, v: int) -> int:
        """Validate time spent is non-negative."""
        if v < 0:
            raise ValueError("Time spent must be non-negative")
        return v


class AssignmentSubmissionResponse(BaseModel):
    """Response schema for assignment submission."""

    model_config = ConfigDict(from_attributes=True)

    success: bool
    message: str
    score: float
    completed_at: datetime
    assignment_id: uuid.UUID


class AssignmentSaveProgressRequest(BaseModel):
    """Request schema for saving assignment progress."""

    partial_answers_json: dict
    time_spent_minutes: int

    @field_validator("partial_answers_json")
    @classmethod
    def validate_payload_size(cls, v: dict) -> dict:
        """
        Validate partial_answers_json payload size to prevent DoS attacks.

        Story 4.8 QA Fix: Limit payload to 100KB to prevent abuse with large payloads.
        This protects the server from excessive memory usage and database bloat.
        """
        MAX_PAYLOAD_SIZE_BYTES = 100 * 1024  # 100KB

        # Serialize to JSON to get actual byte size
        try:
            payload_json = json.dumps(v, ensure_ascii=False)
            payload_size_bytes = len(payload_json.encode("utf-8"))

            if payload_size_bytes > MAX_PAYLOAD_SIZE_BYTES:
                raise ValueError(
                    f"Progress payload size ({payload_size_bytes} bytes) exceeds "
                    f"maximum allowed size ({MAX_PAYLOAD_SIZE_BYTES} bytes / 100KB). "
                    f"Please reduce the amount of data being saved."
                )
        except (TypeError, ValueError) as e:
            # If serialization fails, it's invalid JSON data
            if "exceeds maximum" in str(e):
                raise  # Re-raise our custom error
            raise ValueError("Invalid JSON data in partial_answers_json") from e

        return v

    @field_validator("time_spent_minutes")
    @classmethod
    def validate_time_spent_non_negative(cls, v: int) -> int:
        """Validate time spent is non-negative."""
        if v < 0:
            raise ValueError("Time spent must be non-negative")
        return v


class AssignmentSaveProgressResponse(BaseModel):
    """Response schema for saving assignment progress."""

    message: str
    last_saved_at: datetime
    time_spent_minutes: int
