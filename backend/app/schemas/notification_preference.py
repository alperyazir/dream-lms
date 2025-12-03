"""Notification preference schemas - Story 6.8."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models import NotificationType

# =============================================================================
# Preference Response Schemas
# =============================================================================


class NotificationPreferenceResponse(BaseModel):
    """Response schema for a single notification preference."""

    notification_type: NotificationType
    enabled: bool
    email_enabled: bool
    label: str
    description: str

    model_config = {"from_attributes": True}


class NotificationPreferencesListResponse(BaseModel):
    """Response schema for all user notification preferences."""

    preferences: list[NotificationPreferenceResponse]
    global_mute: "GlobalMuteResponse | None" = None


# =============================================================================
# Preference Update Schemas
# =============================================================================


class NotificationPreferenceUpdate(BaseModel):
    """Schema for updating a single preference."""

    enabled: bool


class NotificationPreferencesBulkUpdate(BaseModel):
    """Schema for bulk updating preferences.

    Keys are notification type names, values are enabled status.
    Example: {"assignment_created": true, "deadline_approaching": false}
    """

    preferences: dict[str, bool] = Field(
        ...,
        description="Map of notification type to enabled status"
    )


class NotificationPreferencesBulkUpdateResponse(BaseModel):
    """Response for bulk preference update."""

    updated: list[str]
    preferences: list[NotificationPreferenceResponse]


# =============================================================================
# Global Mute Schemas
# =============================================================================


class GlobalMuteRequest(BaseModel):
    """Request schema for setting global mute."""

    hours: int = Field(..., ge=1, le=24, description="Number of hours to mute (max 24)")


class GlobalMuteResponse(BaseModel):
    """Response schema for global mute status."""

    muted_until: datetime
    remaining_hours: float = Field(..., description="Hours remaining until mute expires")

    model_config = {"from_attributes": True}


class GlobalMuteStatusResponse(BaseModel):
    """Response for mute status check."""

    is_muted: bool
    mute: GlobalMuteResponse | None = None


# =============================================================================
# Preference Labels and Descriptions
# =============================================================================


PREFERENCE_LABELS: dict[NotificationType, tuple[str, str]] = {
    NotificationType.assignment_created: (
        "New Assignments",
        "Notify when you're assigned new work"
    ),
    NotificationType.deadline_approaching: (
        "Deadline Reminders",
        "Notify when assignments are due soon"
    ),
    NotificationType.feedback_received: (
        "Feedback Received",
        "Notify when teachers provide feedback"
    ),
    NotificationType.message_received: (
        "New Messages",
        "Notify when you receive direct messages"
    ),
    NotificationType.student_completed: (
        "Student Completions",
        "Notify when students complete assignments"
    ),
    NotificationType.past_due: (
        "Past Due Alerts",
        "Notify when assignments are overdue"
    ),
    NotificationType.material_shared: (
        "Shared Materials",
        "Notify when teachers share new materials"
    ),
    NotificationType.system_announcement: (
        "System Announcements",
        "Important system updates and news"
    ),
}


def get_preference_label(notification_type: NotificationType) -> str:
    """Get the display label for a notification type."""
    return PREFERENCE_LABELS.get(notification_type, (notification_type.value, ""))[0]


def get_preference_description(notification_type: NotificationType) -> str:
    """Get the description for a notification type."""
    return PREFERENCE_LABELS.get(notification_type, ("", notification_type.value))[1]
