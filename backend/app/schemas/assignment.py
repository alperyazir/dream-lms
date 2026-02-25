"""Pydantic schemas for Assignment API requests/responses."""

import json
import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    computed_field,
    field_validator,
    model_validator,
)

from app.models import AssignmentPublishStatus, AssignmentStatus

# --- Additional Resources Schemas ---


class ResourceType(str, Enum):
    """Types of additional resources that can be attached to assignments."""
    video = "video"
    teacher_material = "teacher_material"


class VideoResource(BaseModel):
    """Schema for a video resource attached to an assignment.

    Story 10.3+: Video with subtitle control for students.
    """
    type: Literal["video"] = "video"
    path: str  # Relative path like "video/1.mp4"
    name: str  # Display name
    subtitles_enabled: bool = True  # Whether students can see subtitles
    has_subtitles: bool = False  # Whether the video has subtitle files

    @field_validator("path")
    @classmethod
    def validate_path(cls, v: str) -> str:
        """Validate path is safe."""
        if ".." in v:
            raise ValueError("Invalid path: path traversal not allowed")
        if len(v) > 500:
            raise ValueError("Path must be 500 characters or less")
        return v


class TeacherMaterialResource(BaseModel):
    """Schema for a teacher-uploaded material attached to an assignment.

    Story 13.3: Teacher Materials Assignment Integration.
    Stores denormalized name/type for display even if material is deleted.
    """
    type: Literal["teacher_material"] = "teacher_material"
    material_id: uuid.UUID
    # Denormalized fields for display (cached from TeacherMaterial)
    name: str
    material_type: str  # document, image, audio, video, url, text_note


class TeacherMaterialResourceResponse(TeacherMaterialResource):
    """Response schema with availability status and enriched data.

    Used when returning assignment resources to include current material state.
    """
    is_available: bool = True
    file_size: int | None = None
    mime_type: str | None = None
    # For URLs
    url: str | None = None
    # For text notes
    text_content: str | None = None
    # Download URL (for files)
    download_url: str | None = None


class AdditionalResources(BaseModel):
    """Schema for additional resources attached to an assignment.

    Supports video resources and teacher-uploaded materials.
    """
    videos: list[VideoResource] = []
    teacher_materials: list[TeacherMaterialResource] = []


class AdditionalResourcesResponse(BaseModel):
    """Response schema with enriched material data and availability status."""
    videos: list[VideoResource] = []
    teacher_materials: list[TeacherMaterialResourceResponse] = []


class DateGroupCreate(BaseModel):
    """Schema for a date group in Time Planning mode.

    Each date group creates a separate assignment with its own publish date.
    """
    scheduled_publish_date: datetime  # When to publish/make visible
    due_date: datetime | None = None  # When due for this group
    time_limit_minutes: int | None = None
    activity_ids: list[uuid.UUID]

    @field_validator("scheduled_publish_date")
    @classmethod
    def validate_scheduled_date(cls, v: datetime) -> datetime:
        """Scheduled publish date can be in the future or now (for immediate publishing)."""
        return v

    @field_validator("activity_ids")
    @classmethod
    def validate_activity_ids_not_empty(cls, v: list[uuid.UUID]) -> list[uuid.UUID]:
        """Validate at least one activity is in the group."""
        if not v or len(v) == 0:
            raise ValueError("Each date group must have at least one activity")
        return v


class AssignmentCreate(BaseModel):
    """Schema for creating a new assignment.

    Supports both single-activity (backward compatible) and multi-activity assignments.
    Provide either activity_id (single) OR activity_ids (multi) OR date_groups (Time Planning).

    Story 27.x: Also supports AI content assignments with source_type="ai_content" and content_id.
    """

    # Story 27.x: Source type - "book" (default) or "ai_content"
    source_type: Literal["book", "ai_content"] = "book"

    # For book assignments (required when source_type="book")
    book_id: int | None = None  # DCS book ID (changed from UUID in Epic 24)
    # Backward compatible: single activity (legacy)
    activity_id: uuid.UUID | None = None
    # Multi-activity: list of activities with order
    activity_ids: list[uuid.UUID] | None = None

    # Story 27.x: For AI content assignments (required when source_type="ai_content")
    # Accepts UUID (LMS record ID) or string (DCS content_id)
    content_id: str | None = None

    # Skill classification (Epic 30 - Story 30.2)
    skill_id: uuid.UUID | None = None
    format_id: uuid.UUID | None = None
    is_mix_mode: bool = False

    # Common fields
    name: str
    instructions: str | None = None
    due_date: datetime | None = None
    time_limit_minutes: int | None = None
    student_ids: list[uuid.UUID] | None = None
    class_ids: list[uuid.UUID] | None = None
    # Scheduling fields
    scheduled_publish_date: datetime | None = None
    # Time Planning mode: creates multiple assignments, one per date group
    date_groups: list[DateGroupCreate] | None = None
    # Story 10.3: Video attachment - stores relative path like "videos/chapter1.mp4"
    # DEPRECATED: Use resources.videos instead for new assignments
    video_path: str | None = None
    # Additional Resources: videos with subtitle control, extensible for future types
    resources: AdditionalResources | None = None

    @field_validator("scheduled_publish_date")
    @classmethod
    def validate_scheduled_publish_date(cls, v: datetime | None) -> datetime | None:
        """Validate scheduled publish date is in the future if provided."""
        if v is not None and v < datetime.now(UTC):
            raise ValueError("Scheduled publish date must be in the future")
        return v

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

    @field_validator("video_path")
    @classmethod
    def validate_video_path(cls, v: str | None) -> str | None:
        """Validate video_path is within max length and safe."""
        if v is not None:
            if len(v) > 500:
                raise ValueError("Video path must be 500 characters or less")
            if ".." in v:
                raise ValueError("Invalid video path: path traversal not allowed")
        return v

    @model_validator(mode="after")
    def validate_recipients(self) -> "AssignmentCreate":
        """Validate at least one of student_ids or class_ids is provided."""
        has_students = self.student_ids is not None and len(self.student_ids) > 0
        has_classes = self.class_ids is not None and len(self.class_ids) > 0

        if not has_students and not has_classes:
            raise ValueError("At least one student or class must be selected")

        return self

    @model_validator(mode="after")
    def validate_source_requirements(self) -> "AssignmentCreate":
        """Validate source-specific requirements."""
        # Story 27.x: AI content assignments
        if self.source_type == "ai_content":
            if self.content_id is None:
                raise ValueError("content_id is required for AI content assignments")
            # AI content doesn't use book_id, activity_id, activity_ids, or date_groups
            if self.book_id is not None:
                raise ValueError("book_id should not be provided for AI content assignments")
            if self.activity_id is not None or (self.activity_ids is not None and len(self.activity_ids) > 0):
                raise ValueError("activity_id/activity_ids should not be provided for AI content assignments")
            if self.date_groups is not None and len(self.date_groups) > 0:
                raise ValueError("date_groups should not be provided for AI content assignments")
            return self

        # Book assignments: require book_id and activity_id/activity_ids
        if self.book_id is None:
            raise ValueError("book_id is required for book assignments")

        has_single = self.activity_id is not None
        has_multi = self.activity_ids is not None and len(self.activity_ids) > 0
        has_date_groups = self.date_groups is not None and len(self.date_groups) > 0

        # Time Planning mode uses date_groups (each group has its own activities)
        if has_date_groups:
            # When using date_groups, don't require activity_id or activity_ids
            if has_single or has_multi:
                raise ValueError("Cannot provide activity_id or activity_ids with date_groups")
            return self

        # Standard mode: require activity_id or activity_ids
        if not has_single and not has_multi:
            raise ValueError("Either activity_id or activity_ids must be provided")
        if has_single and has_multi:
            raise ValueError("Cannot provide both activity_id and activity_ids")

        return self

    @model_validator(mode="after")
    def validate_publish_before_due(self) -> "AssignmentCreate":
        """Validate scheduled_publish_date is before or equal to due_date."""
        if (
            self.scheduled_publish_date is not None
            and self.due_date is not None
            and self.scheduled_publish_date > self.due_date
        ):
            raise ValueError("Scheduled publish date must be before or equal to due date")
        return self

    def get_activity_ids(self) -> list[uuid.UUID]:
        """Get list of activity IDs (handles both single and multi formats)."""
        if self.activity_ids:
            return self.activity_ids
        if self.activity_id:
            return [self.activity_id]
        return []


class AssignmentUpdate(BaseModel):
    """Schema for updating an existing assignment (partial update).

    Story 9.8: Added activity_ids field to allow editing activities.
    Story 10.3: Added video_path field to allow attaching/removing video.
    """

    name: str | None = None
    instructions: str | None = None
    due_date: datetime | None = None
    time_limit_minutes: int | None = None
    scheduled_publish_date: datetime | None = None
    status: AssignmentPublishStatus | None = None
    # Story 9.8: Allow updating activities (add/remove/reorder)
    activity_ids: list[uuid.UUID] | None = None
    # Story 10.3: Video attachment - can set to null to remove video
    # DEPRECATED: Use resources.videos instead
    video_path: str | None = None
    # Additional Resources: videos with subtitle control
    resources: AdditionalResources | None = None

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

    @field_validator("scheduled_publish_date")
    @classmethod
    def validate_scheduled_publish_date(cls, v: datetime | None) -> datetime | None:
        """Validate scheduled publish date is in the future if provided."""
        if v is not None and v < datetime.now(UTC):
            raise ValueError("Scheduled publish date must be in the future")
        return v

    @field_validator("activity_ids")
    @classmethod
    def validate_activity_ids_not_empty(cls, v: list[uuid.UUID] | None) -> list[uuid.UUID] | None:
        """Validate activity_ids list is not empty if provided."""
        if v is not None and len(v) == 0:
            raise ValueError("Activity list cannot be empty - must have at least one activity")
        return v

    @field_validator("video_path")
    @classmethod
    def validate_video_path(cls, v: str | None) -> str | None:
        """Validate video_path is within max length and safe."""
        if v is not None:
            if len(v) > 500:
                raise ValueError("Video path must be 500 characters or less")
            if ".." in v:
                raise ValueError("Invalid video path: path traversal not allowed")
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


class ActivityInfo(BaseModel):
    """Minimal activity info for assignment response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str | None
    activity_type: str
    order_index: int = 0


class SkillInfoCompact(BaseModel):
    """Compact skill info for assignment responses."""
    id: uuid.UUID
    name: str
    slug: str
    icon: str
    color: str


class FormatInfoCompact(BaseModel):
    """Compact format info for assignment responses."""
    id: uuid.UUID
    name: str
    slug: str


class AssignmentResponse(BaseModel):
    """Assignment response schema for API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    teacher_id: uuid.UUID
    book_id: int  # DCS book ID (changed from UUID in Epic 24)
    name: str
    instructions: str | None
    due_date: datetime | None
    time_limit_minutes: int | None
    created_at: datetime
    updated_at: datetime
    student_count: int = 0
    # Backward compatible: keep activity_id for single-activity assignments
    activity_id: uuid.UUID | None = None
    # Multi-activity support
    activities: list[ActivityInfo] = []
    activity_count: int = 0
    # Scheduling fields
    scheduled_publish_date: datetime | None = None
    status: AssignmentPublishStatus = AssignmentPublishStatus.published
    # Story 10.3: Video attachment
    video_path: str | None = None
    # Skill classification (Epic 30 - Story 30.2)
    primary_skill: SkillInfoCompact | None = None
    activity_format: FormatInfoCompact | None = None
    is_mix_mode: bool = False


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
    book_id: int  # DCS book ID
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

    # Scheduling fields
    scheduled_publish_date: datetime | None = None
    status: AssignmentPublishStatus = AssignmentPublishStatus.published

    # Skill classification (Epic 30 - Story 30.2)
    skill_name: str | None = None
    skill_slug: str | None = None
    skill_color: str | None = None
    skill_icon: str | None = None
    format_name: str | None = None
    is_mix_mode: bool = False


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
    book_id: int  # DCS book ID
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

    # Multi-activity support (Story 8.3)
    activity_count: int = 1  # Number of activities in this assignment

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
    book_id: int  # DCS book ID
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
        MAX_PAYLOAD_SIZE_BYTES = 5 * 1024 * 1024  # 5MB (speaking audio stored as base64)

        # Serialize to JSON to get actual byte size
        try:
            payload_json = json.dumps(v, ensure_ascii=False)
            payload_size_bytes = len(payload_json.encode("utf-8"))

            if payload_size_bytes > MAX_PAYLOAD_SIZE_BYTES:
                raise ValueError(
                    f"Progress payload size ({payload_size_bytes} bytes) exceeds "
                    f"maximum allowed size ({MAX_PAYLOAD_SIZE_BYTES} bytes / 5MB). "
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


# =============================================================================
# Multi-Activity Assignment Schemas (Story 8.3)
# =============================================================================


class ActivityWithConfig(BaseModel):
    """Activity info with full config for multi-activity player."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str | None
    activity_type: str
    config_json: dict
    order_index: int = 0


class ActivityProgressInfo(BaseModel):
    """Per-activity progress info for multi-activity assignments."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    activity_id: uuid.UUID
    status: str  # not_started, in_progress, completed
    score: float | None
    max_score: float
    response_data: dict | None
    started_at: datetime | None
    completed_at: datetime | None


class MultiActivityStartResponse(BaseModel):
    """Response schema for starting a multi-activity assignment."""

    model_config = ConfigDict(from_attributes=True)

    # Assignment info
    assignment_id: uuid.UUID
    assignment_name: str
    instructions: str | None
    due_date: datetime | None
    time_limit_minutes: int | None

    # Book info
    book_id: int  # DCS book ID
    book_title: str
    book_name: str
    publisher_name: str
    book_cover_url: str | None

    # Multi-activity data
    activities: list[ActivityWithConfig]
    activity_progress: list[ActivityProgressInfo]
    total_activities: int

    # Assignment-level progress
    current_status: str
    time_spent_minutes: int
    started_at: datetime | None

    # Story 10.3: Video attachment (legacy, use resources instead)
    video_path: str | None = None
    # Additional Resources with subtitle control and teacher materials
    # Uses AdditionalResourcesResponse to include availability status for students
    resources: AdditionalResourcesResponse | None = None

    @computed_field  # type: ignore[misc]
    @property
    def completed_activities_count(self) -> int:
        """Count of completed activities."""
        return sum(1 for ap in self.activity_progress if ap.status == "completed")

    @computed_field  # type: ignore[misc]
    @property
    def all_activities_completed(self) -> bool:
        """Check if all activities are completed."""
        return self.completed_activities_count == self.total_activities


class ActivityProgressSaveRequest(BaseModel):
    """Request schema for saving per-activity progress."""

    response_data: dict
    time_spent_seconds: int = 0
    status: str = "in_progress"  # in_progress or completed
    score: float | None = None  # Required if status is completed
    max_score: float = 100.0

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of the allowed values."""
        allowed_statuses = ["in_progress", "completed"]
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of {allowed_statuses}")
        return v

    @field_validator("response_data")
    @classmethod
    def validate_payload_size(cls, v: dict) -> dict:
        """Validate response_data payload size to prevent DoS attacks."""
        MAX_PAYLOAD_SIZE_BYTES = 5 * 1024 * 1024  # 5MB (speaking audio stored as base64)

        try:
            payload_json = json.dumps(v, ensure_ascii=False)
            payload_size_bytes = len(payload_json.encode("utf-8"))

            if payload_size_bytes > MAX_PAYLOAD_SIZE_BYTES:
                raise ValueError(
                    f"Response data size ({payload_size_bytes} bytes) exceeds "
                    f"maximum allowed size ({MAX_PAYLOAD_SIZE_BYTES} bytes / 5MB)."
                )
        except (TypeError, ValueError) as e:
            if "exceeds maximum" in str(e):
                raise
            raise ValueError("Invalid JSON data in response_data") from e

        return v

    @model_validator(mode="after")
    def validate_score_on_complete(self) -> "ActivityProgressSaveRequest":
        """Validate score is provided when status is completed."""
        if self.status == "completed" and self.score is None:
            raise ValueError("Score is required when status is 'completed'")
        return self


class ActivityProgressSaveResponse(BaseModel):
    """Response schema for saving per-activity progress."""

    message: str
    activity_id: uuid.UUID
    status: str
    score: float | None
    last_saved_at: datetime


class SubmitActivityState(BaseModel):
    """Activity state data sent during multi-activity submission."""

    activity_index: int  # Index of the activity in the activities array
    score: float | None = None
    answers_json: dict | None = None  # Student's answers for the activity
    status: str = "completed"


class MultiActivitySubmitRequest(BaseModel):
    """Request schema for submitting a multi-activity assignment."""

    force_submit: bool = False  # Force submit even if not all activities completed (for timeout)
    total_time_spent_minutes: int = 0  # Deprecated: use total_time_spent_seconds
    total_time_spent_seconds: int | None = None  # Preferred: precise time in seconds
    # Activity states with scores and answers - required for Content Library assignments
    activity_states: list[SubmitActivityState] | None = None


class PerActivityScore(BaseModel):
    """Per-activity score info for submission response."""

    activity_id: uuid.UUID
    activity_title: str | None
    score: float | None
    max_score: float
    status: str


class MultiActivitySubmitResponse(BaseModel):
    """Response schema for multi-activity assignment submission."""

    success: bool
    message: str
    assignment_id: uuid.UUID
    combined_score: float
    per_activity_scores: list[PerActivityScore]
    completed_at: datetime
    total_activities: int
    completed_activities: int


# =============================================================================
# Multi-Activity Analytics Schemas (Story 8.4)
# =============================================================================


class StudentActivityScore(BaseModel):
    """Per-student score for a specific activity (used in expanded analytics view)."""

    model_config = ConfigDict(from_attributes=True)

    student_id: uuid.UUID
    student_name: str
    status: str  # not_started, in_progress, completed
    score: float | None
    max_score: float
    time_spent_seconds: int
    completed_at: datetime | None


class ActivityAnalyticsItem(BaseModel):
    """Analytics data for a single activity within a multi-activity assignment."""

    model_config = ConfigDict(from_attributes=True)

    activity_id: uuid.UUID
    activity_title: str | None
    page_number: int | None  # None for AI content assignments
    activity_type: str
    class_average_score: float | None  # None if no completions
    completion_rate: float  # 0.0 to 1.0
    completed_count: int
    total_assigned_count: int


class PerActivityBreakdown(BaseModel):
    """Expanded view showing all student scores for a specific activity."""

    model_config = ConfigDict(from_attributes=True)

    activity_id: uuid.UUID
    students: list[StudentActivityScore]


class MultiActivityAnalyticsResponse(BaseModel):
    """Response schema for multi-activity assignment analytics (teacher view)."""

    model_config = ConfigDict(from_attributes=True)

    assignment_id: uuid.UUID
    assignment_name: str
    total_students: int
    submitted_count: int  # Students who submitted (completed status)
    activities: list[ActivityAnalyticsItem]
    expanded_students: list[StudentActivityScore] | None = None  # Populated when expand_activity_id provided


class ActivityScoreItem(BaseModel):
    """Per-activity score item for student result view."""

    model_config = ConfigDict(from_attributes=True)

    activity_id: uuid.UUID
    activity_title: str | None
    activity_type: str
    score: float | None
    max_score: float
    status: str


class StudentAssignmentResultResponse(BaseModel):
    """Response schema for student viewing their completed assignment results."""

    model_config = ConfigDict(from_attributes=True)

    assignment_id: uuid.UUID
    assignment_name: str
    total_score: float | None
    completed_at: datetime | None
    activity_scores: list[ActivityScoreItem]
    total_activities: int
    completed_activities: int


class AssignmentResultDetailResponse(BaseModel):
    """
    Detailed assignment result with answers for review.

    Story 23.4: Used when students want to review their submitted answers
    with correct/incorrect marking.
    """

    model_config = ConfigDict(from_attributes=True)

    assignment_id: uuid.UUID
    assignment_name: str
    activity_id: uuid.UUID
    activity_title: str | None
    activity_type: str
    book_id: int  # DCS book ID
    book_name: str
    publisher_name: str
    config_json: dict  # Activity configuration (includes correct answers)
    answers_json: dict  # Student's submitted answers
    score: float
    total_points: float
    started_at: datetime | None  # When student started the assignment
    completed_at: datetime
    time_spent_minutes: int  # Deprecated: use time_spent_seconds
    time_spent_seconds: int  # Precise time in seconds


# --- Calendar Schemas (Story 9.6) ---


class CalendarAssignmentItem(BaseModel):
    """Assignment item for calendar view."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    due_date: datetime | None
    scheduled_publish_date: datetime | None
    status: AssignmentPublishStatus
    activity_count: int
    class_names: list[str] = []
    book_id: int  # DCS book ID
    book_title: str


class CalendarDateAssignments(BaseModel):
    """Assignments grouped by date for calendar view."""

    date: str  # ISO date string YYYY-MM-DD
    assignments: list[CalendarAssignmentItem]


class CalendarAssignmentsResponse(BaseModel):
    """Response schema for calendar assignments endpoint."""

    start_date: str
    end_date: str
    total_assignments: int
    assignments_by_date: dict[str, list[CalendarAssignmentItem]]


# --- Time Planning (Bulk Assignment Creation) Schemas ---


class BulkAssignmentCreatedItem(BaseModel):
    """Individual assignment created in bulk operation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    scheduled_publish_date: datetime | None
    due_date: datetime | None
    status: AssignmentPublishStatus
    activity_count: int


class BulkAssignmentCreateResponse(BaseModel):
    """Response schema for bulk assignment creation (Time Planning mode)."""

    success: bool
    message: str
    total_created: int
    assignments: list[BulkAssignmentCreatedItem]


# --- Student Calendar Schemas ---


class StudentCalendarAssignmentItem(BaseModel):
    """Assignment item for student calendar view."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    due_date: datetime | None
    book_id: int  # DCS book ID
    book_title: str
    book_cover_url: str | None
    activity_count: int
    status: str  # not_started, in_progress, completed


class StudentCalendarAssignmentsResponse(BaseModel):
    """Response schema for student calendar assignments endpoint."""

    start_date: str
    end_date: str
    total_assignments: int
    assignments_by_date: dict[str, list[StudentCalendarAssignmentItem]]


# =============================================================================
# Preview/Test Mode Schemas (Story 9.7)
# =============================================================================


class AssignmentPreviewResponse(BaseModel):
    """Response schema for teacher assignment preview/test mode.

    Similar to MultiActivityStartResponse but without student-specific data.
    Used for teachers to preview/test assignments before or after publishing.
    """

    model_config = ConfigDict(from_attributes=True)

    # Assignment info
    assignment_id: uuid.UUID
    assignment_name: str
    instructions: str | None
    due_date: datetime | None
    time_limit_minutes: int | None
    status: AssignmentPublishStatus

    # Book info
    book_id: int  # DCS book ID
    book_title: str
    book_name: str
    publisher_name: str
    book_cover_url: str | None

    # Multi-activity data
    activities: list[ActivityWithConfig]
    total_activities: int

    # Preview mode indicator
    is_preview: bool = True

    # Story 10.3: Video attachment (legacy, use resources instead)
    video_path: str | None = None
    # Additional Resources with subtitle control and teacher materials
    resources: AdditionalResourcesResponse | None = None


class AssignmentForEditResponse(BaseModel):
    """Response schema for editing an existing assignment.

    Extends preview response with recipient information needed for edit mode.
    Used when a teacher wants to edit an existing assignment.
    """

    model_config = ConfigDict(from_attributes=True)

    # Assignment info
    assignment_id: uuid.UUID
    assignment_name: str
    instructions: str | None
    due_date: datetime | None
    time_limit_minutes: int | None
    status: AssignmentPublishStatus

    # Book info
    book_id: int  # DCS book ID
    book_title: str
    book_name: str
    publisher_name: str
    book_cover_url: str | None

    # Multi-activity data
    activities: list[ActivityWithConfig]
    total_activities: int

    # Video attachment (legacy, use resources instead)
    video_path: str | None = None
    # Additional Resources with subtitle control and teacher materials
    resources: AdditionalResourcesResponse | None = None

    # Recipients (for edit mode) - Story 20.2
    class_ids: list[uuid.UUID]
    student_ids: list[uuid.UUID]

    # Time planning (for edit mode) - Story 20.2
    time_planning_enabled: bool = False
    scheduled_publish_date: datetime | None = None
    date_groups: list[dict] | None = None


class ActivityPreviewResponse(BaseModel):
    """Response schema for single activity preview.

    Returns activity data in student-view format for teacher preview.
    """

    model_config = ConfigDict(from_attributes=True)

    # Activity info
    activity_id: uuid.UUID
    activity_title: str | None
    activity_type: str
    config_json: dict

    # Book info (for image URL construction)
    book_id: int  # DCS book ID
    book_name: str
    publisher_name: str

    # Preview mode indicator
    is_preview: bool = True


# =============================================================================
# Admin Assignment Management Schemas (Story 20.1)
# =============================================================================


class AssignmentWithTeacher(BaseModel):
    """Assignment response with teacher information for admin view."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    teacher_id: uuid.UUID
    teacher_name: str
    teacher_email: str
    recipient_count: int = 0
    completed_count: int = 0
    due_date: datetime | None
    status: AssignmentPublishStatus
    created_at: datetime


class AssignmentListResponse(BaseModel):
    """Paginated response for assignment lists."""

    items: list[AssignmentWithTeacher]
    total: int
    skip: int
    limit: int
