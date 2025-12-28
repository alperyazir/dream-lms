"""
Integration tests for Notification API endpoints (Story 6.1).

Tests cover:
- GET /api/v1/notifications - paginated list with filtering
- GET /api/v1/notifications/unread-count - unread count
- PATCH /api/v1/notifications/{id}/read - mark as read
- POST /api/v1/notifications/mark-all-read - mark all as read
- Authorization (401 for unauthenticated, 404 for other user's notifications)
"""

import uuid
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import Notification, NotificationType, User


def create_notification(
    session: Session,
    user_id: uuid.UUID,
    title: str = "Test Notification",
    message: str = "Test message",
    notification_type: str = "assignment_created",
    is_read: bool = False,
    link: str | None = None,
) -> Notification:
    """Helper to create a notification in the database."""
    notification = Notification(
        id=uuid.uuid4(),
        user_id=user_id,
        type=NotificationType(notification_type),
        title=title,
        message=message,
        link=link,
        is_read=is_read,
        created_at=datetime.now(UTC),
    )
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


# Tests for GET /api/v1/notifications


def test_get_notifications_success(
    client: TestClient,
    session: Session,
    student_user: User,
    student_token: str,
):
    """Test getting notifications returns user's notifications."""
    # Create notifications for the user
    create_notification(session, student_user.id, "Notification 1")
    create_notification(session, student_user.id, "Notification 2")

    response = client.get(
        f"{settings.API_V1_STR}/notifications",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "notifications" in data
    assert len(data["notifications"]) == 2
    assert data["total"] == 2
    assert "has_more" in data


def test_get_notifications_pagination(
    client: TestClient,
    session: Session,
    student_user: User,
    student_token: str,
):
    """Test pagination of notifications."""
    # Create 5 notifications
    for i in range(5):
        create_notification(session, student_user.id, f"Notification {i}")

    # Get first page
    response = client.get(
        f"{settings.API_V1_STR}/notifications?limit=2&offset=0",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["notifications"]) == 2
    assert data["total"] == 5
    assert data["has_more"] is True

    # Get second page
    response = client.get(
        f"{settings.API_V1_STR}/notifications?limit=2&offset=2",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    data = response.json()
    assert len(data["notifications"]) == 2
    assert data["total"] == 5


def test_get_notifications_filter_unread(
    client: TestClient,
    session: Session,
    student_user: User,
    student_token: str,
):
    """Test filtering notifications by unread status."""
    create_notification(session, student_user.id, "Unread", is_read=False)
    create_notification(session, student_user.id, "Read", is_read=True)

    response = client.get(
        f"{settings.API_V1_STR}/notifications?unread_only=true",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["notifications"]) == 1
    assert data["notifications"][0]["title"] == "Unread"


def test_get_notifications_filter_by_type(
    client: TestClient,
    session: Session,
    student_user: User,
    student_token: str,
):
    """Test filtering notifications by type."""
    create_notification(
        session, student_user.id, "Assignment", notification_type="assignment_created"
    )
    create_notification(
        session, student_user.id, "Deadline", notification_type="deadline_approaching"
    )

    response = client.get(
        f"{settings.API_V1_STR}/notifications?type=deadline_approaching",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["notifications"]) == 1
    assert data["notifications"][0]["title"] == "Deadline"


def test_get_notifications_only_own(
    client: TestClient,
    session: Session,
    student_user: User,
    teacher_user: User,
    student_token: str,
):
    """Test that users only see their own notifications."""
    # Create notification for student
    create_notification(session, student_user.id, "Student notification")
    # Create notification for teacher
    create_notification(session, teacher_user.id, "Teacher notification")

    response = client.get(
        f"{settings.API_V1_STR}/notifications",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["notifications"]) == 1
    assert data["notifications"][0]["title"] == "Student notification"


def test_get_notifications_unauthorized(client: TestClient):
    """Test that unauthenticated requests return 401."""
    response = client.get(f"{settings.API_V1_STR}/notifications")

    assert response.status_code == 401


# Tests for GET /api/v1/notifications/unread-count


def test_get_unread_count_success(
    client: TestClient,
    session: Session,
    student_user: User,
    student_token: str,
):
    """Test getting unread count."""
    create_notification(session, student_user.id, "Unread 1", is_read=False)
    create_notification(session, student_user.id, "Unread 2", is_read=False)
    create_notification(session, student_user.id, "Read", is_read=True)

    response = client.get(
        f"{settings.API_V1_STR}/notifications/unread-count",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 2


def test_get_unread_count_zero(
    client: TestClient,
    session: Session,
    student_user: User,
    student_token: str,
):
    """Test unread count is zero when all are read."""
    create_notification(session, student_user.id, "Read", is_read=True)

    response = client.get(
        f"{settings.API_V1_STR}/notifications/unread-count",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 0


def test_get_unread_count_unauthorized(client: TestClient):
    """Test that unauthenticated requests return 401."""
    response = client.get(f"{settings.API_V1_STR}/notifications/unread-count")

    assert response.status_code == 401


# Tests for PATCH /api/v1/notifications/{id}/read


def test_mark_notification_as_read_success(
    client: TestClient,
    session: Session,
    student_user: User,
    student_token: str,
):
    """Test marking a notification as read."""
    notification = create_notification(
        session, student_user.id, "Test", is_read=False
    )

    response = client.patch(
        f"{settings.API_V1_STR}/notifications/{notification.id}/read",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_read"] is True
    assert data["id"] == str(notification.id)


def test_mark_notification_as_read_not_found(
    client: TestClient,
    student_token: str,
):
    """Test marking nonexistent notification returns 404."""
    fake_id = uuid.uuid4()

    response = client.patch(
        f"{settings.API_V1_STR}/notifications/{fake_id}/read",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 404


def test_mark_notification_as_read_other_user(
    client: TestClient,
    session: Session,
    student_user: User,
    teacher_user: User,
    student_token: str,
):
    """Test that users cannot mark other users' notifications as read."""
    # Create notification for teacher
    notification = create_notification(session, teacher_user.id, "Teacher notification")

    # Try to mark as read with student token
    response = client.patch(
        f"{settings.API_V1_STR}/notifications/{notification.id}/read",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 404


def test_mark_notification_as_read_unauthorized(client: TestClient, session: Session):
    """Test that unauthenticated requests return 401."""
    fake_id = uuid.uuid4()

    response = client.patch(f"{settings.API_V1_STR}/notifications/{fake_id}/read")

    assert response.status_code == 401


# Tests for POST /api/v1/notifications/mark-all-read


def test_mark_all_as_read_success(
    client: TestClient,
    session: Session,
    student_user: User,
    student_token: str,
):
    """Test marking all notifications as read."""
    create_notification(session, student_user.id, "Unread 1", is_read=False)
    create_notification(session, student_user.id, "Unread 2", is_read=False)
    create_notification(session, student_user.id, "Already read", is_read=True)

    response = client.post(
        f"{settings.API_V1_STR}/notifications/mark-all-read",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["marked_count"] == 2

    # Verify all are now read
    count_response = client.get(
        f"{settings.API_V1_STR}/notifications/unread-count",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert count_response.json()["count"] == 0


def test_mark_all_as_read_only_own(
    client: TestClient,
    session: Session,
    student_user: User,
    teacher_user: User,
    student_token: str,
    teacher_token: str,
):
    """Test that mark all only affects own notifications."""
    # Create notifications for both users
    create_notification(session, student_user.id, "Student", is_read=False)
    create_notification(session, teacher_user.id, "Teacher", is_read=False)

    # Mark all as read for student
    response = client.post(
        f"{settings.API_V1_STR}/notifications/mark-all-read",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    assert response.json()["marked_count"] == 1

    # Teacher's notification should still be unread
    teacher_count = client.get(
        f"{settings.API_V1_STR}/notifications/unread-count",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert teacher_count.json()["count"] == 1


def test_mark_all_as_read_unauthorized(client: TestClient):
    """Test that unauthenticated requests return 401."""
    response = client.post(f"{settings.API_V1_STR}/notifications/mark-all-read")

    assert response.status_code == 401


# =============================================================================
# Story 6.8 - Notification Preferences Integration Tests
# =============================================================================


# Tests for GET /api/v1/notifications/preferences


def test_get_preferences_student_types(
    client: TestClient,
    student_user: User,
    student_token: str,
):
    """Test that student preferences include student-applicable types."""
    response = client.get(
        f"{settings.API_V1_STR}/notifications/preferences",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "preferences" in data

    pref_types = [p["notification_type"] for p in data["preferences"]]

    # Student should have these types
    assert "assignment_created" in pref_types
    assert "deadline_approaching" in pref_types
    assert "feedback_received" in pref_types
    assert "message_received" in pref_types

    # Student should NOT have teacher-only types
    assert "student_completed" not in pref_types


def test_get_preferences_teacher_types(
    client: TestClient,
    teacher_user: User,
    teacher_token: str,
):
    """Test that teacher preferences include teacher-applicable types."""
    response = client.get(
        f"{settings.API_V1_STR}/notifications/preferences",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    pref_types = [p["notification_type"] for p in data["preferences"]]

    # Teacher should have these types
    assert "student_completed" in pref_types
    assert "message_received" in pref_types
    assert "system_announcement" in pref_types

    # Teacher should NOT have student-only types
    assert "assignment_created" not in pref_types


def test_get_preferences_includes_labels(
    client: TestClient,
    student_token: str,
):
    """Test that preferences include labels and descriptions."""
    response = client.get(
        f"{settings.API_V1_STR}/notifications/preferences",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    for pref in data["preferences"]:
        assert "label" in pref
        assert "description" in pref
        assert len(pref["label"]) > 0
        assert len(pref["description"]) > 0


def test_get_preferences_default_enabled(
    client: TestClient,
    student_token: str,
):
    """Test that default preferences are all enabled."""
    response = client.get(
        f"{settings.API_V1_STR}/notifications/preferences",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    for pref in data["preferences"]:
        assert pref["enabled"] is True
        assert pref["email_enabled"] is False


def test_get_preferences_unauthorized(client: TestClient):
    """Test that unauthenticated requests return 401."""
    response = client.get(f"{settings.API_V1_STR}/notifications/preferences")

    assert response.status_code == 401


# Tests for PATCH /api/v1/notifications/preferences


def test_update_preferences_bulk(
    client: TestClient,
    student_token: str,
):
    """Test bulk updating preferences."""
    response = client.patch(
        f"{settings.API_V1_STR}/notifications/preferences",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"preferences": {"deadline_approaching": False, "feedback_received": False}},
    )

    assert response.status_code == 200
    data = response.json()
    assert "updated" in data
    assert "deadline_approaching" in data["updated"]
    assert "feedback_received" in data["updated"]

    # Verify updated preferences
    prefs = {p["notification_type"]: p for p in data["preferences"]}
    assert prefs["deadline_approaching"]["enabled"] is False
    assert prefs["feedback_received"]["enabled"] is False


def test_update_preferences_invalid_type_ignored(
    client: TestClient,
    student_token: str,
):
    """Test that invalid notification types are ignored in bulk update."""
    response = client.patch(
        f"{settings.API_V1_STR}/notifications/preferences",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "preferences": {
                "deadline_approaching": False,
                "student_completed": False,  # Invalid for student
                "invalid_type": False,  # Not a valid type
            }
        },
    )

    assert response.status_code == 200
    data = response.json()
    # Only valid type for role should be updated
    assert "deadline_approaching" in data["updated"]
    assert "student_completed" not in data["updated"]
    assert "invalid_type" not in data["updated"]


def test_update_single_preference(
    client: TestClient,
    student_token: str,
):
    """Test updating a single preference."""
    response = client.patch(
        f"{settings.API_V1_STR}/notifications/preferences/deadline_approaching",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"enabled": False},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["notification_type"] == "deadline_approaching"
    assert data["enabled"] is False


def test_update_single_preference_invalid_type(
    client: TestClient,
    student_token: str,
):
    """Test updating invalid type for role returns 400."""
    response = client.patch(
        f"{settings.API_V1_STR}/notifications/preferences/student_completed",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"enabled": False},
    )

    assert response.status_code == 400
    assert "not applicable to your role" in response.json()["detail"]


def test_preferences_persist(
    client: TestClient,
    student_token: str,
):
    """Test that preferences persist across requests."""
    # Update preference
    client.patch(
        f"{settings.API_V1_STR}/notifications/preferences/deadline_approaching",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"enabled": False},
    )

    # Get preferences again
    response = client.get(
        f"{settings.API_V1_STR}/notifications/preferences",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    data = response.json()
    prefs = {p["notification_type"]: p for p in data["preferences"]}
    assert prefs["deadline_approaching"]["enabled"] is False


# Tests for Global Mute endpoints


def test_set_global_mute(
    client: TestClient,
    student_token: str,
):
    """Test setting global mute."""
    response = client.post(
        f"{settings.API_V1_STR}/notifications/mute",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"hours": 4},
    )

    assert response.status_code == 200
    data = response.json()
    assert "muted_until" in data
    assert "remaining_hours" in data
    assert data["remaining_hours"] > 3.9
    assert data["remaining_hours"] <= 4.0


def test_set_global_mute_max_24_hours(
    client: TestClient,
    student_token: str,
):
    """Test that mute rejects values over 24 hours."""
    response = client.post(
        f"{settings.API_V1_STR}/notifications/mute",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"hours": 48},  # Try to set 48 hours - should be rejected
    )

    # Schema validation rejects values > 24
    assert response.status_code == 422


def test_set_global_mute_exact_24_hours(
    client: TestClient,
    student_token: str,
):
    """Test that 24 hours is accepted as max value."""
    response = client.post(
        f"{settings.API_V1_STR}/notifications/mute",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"hours": 24},
    )

    assert response.status_code == 200
    data = response.json()
    # 24 hours should be accepted
    assert data["remaining_hours"] <= 24.0


def test_set_global_mute_min_1_hour(
    client: TestClient,
    student_token: str,
):
    """Test that mute must be at least 1 hour."""
    response = client.post(
        f"{settings.API_V1_STR}/notifications/mute",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"hours": 0},
    )

    assert response.status_code == 422  # Validation error


def test_get_mute_status_when_muted(
    client: TestClient,
    student_token: str,
):
    """Test getting mute status when muted."""
    # Set mute first
    client.post(
        f"{settings.API_V1_STR}/notifications/mute",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"hours": 1},
    )

    # Get status
    response = client.get(
        f"{settings.API_V1_STR}/notifications/mute",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_muted"] is True
    assert data["mute"] is not None
    assert "muted_until" in data["mute"]


def test_get_mute_status_when_not_muted(
    client: TestClient,
    student_token: str,
):
    """Test getting mute status when not muted."""
    response = client.get(
        f"{settings.API_V1_STR}/notifications/mute",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_muted"] is False
    assert data["mute"] is None


def test_cancel_global_mute(
    client: TestClient,
    student_token: str,
):
    """Test cancelling global mute."""
    # Set mute first
    client.post(
        f"{settings.API_V1_STR}/notifications/mute",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"hours": 1},
    )

    # Cancel mute
    response = client.delete(
        f"{settings.API_V1_STR}/notifications/mute",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 204

    # Verify mute is cancelled
    status_response = client.get(
        f"{settings.API_V1_STR}/notifications/mute",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert status_response.json()["is_muted"] is False


def test_global_mute_included_in_preferences(
    client: TestClient,
    student_token: str,
):
    """Test that global mute status is included in preferences response."""
    # Set mute
    client.post(
        f"{settings.API_V1_STR}/notifications/mute",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"hours": 1},
    )

    # Get preferences
    response = client.get(
        f"{settings.API_V1_STR}/notifications/preferences",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["global_mute"] is not None
    assert "muted_until" in data["global_mute"]


def test_mute_endpoints_unauthorized(client: TestClient):
    """Test that mute endpoints require authentication."""
    # POST mute
    response = client.post(
        f"{settings.API_V1_STR}/notifications/mute",
        json={"hours": 1},
    )
    assert response.status_code == 401

    # GET mute
    response = client.get(f"{settings.API_V1_STR}/notifications/mute")
    assert response.status_code == 401

    # DELETE mute
    response = client.delete(f"{settings.API_V1_STR}/notifications/mute")
    assert response.status_code == 401
