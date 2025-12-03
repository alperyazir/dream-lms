"""
Unit tests for Notification Service (Story 6.1).

Tests cover:
- create_notification - creates valid notifications
- get_user_notifications - filtering and pagination
- mark_as_read - updates is_read flag
- mark_all_as_read - marks all user notifications
- get_unread_count - returns correct count
- cleanup_old_notifications - removes old records
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification, NotificationType, User, UserRole
from app.services import notification_service


@pytest_asyncio.fixture(name="test_user")
async def test_user_fixture(async_session: AsyncSession) -> User:
    """Create a test user for notification tests."""
    user = User(
        id=uuid.uuid4(),
        email="testuser@example.com",
        username="testuser",
        hashed_password="dummy_hash",
        role=UserRole.student,
        is_active=True,
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest_asyncio.fixture(name="other_user")
async def other_user_fixture(async_session: AsyncSession) -> User:
    """Create another test user for authorization tests."""
    user = User(
        id=uuid.uuid4(),
        email="otheruser@example.com",
        username="otheruser",
        hashed_password="dummy_hash",
        role=UserRole.student,
        is_active=True,
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


# Tests for create_notification


@pytest.mark.asyncio
async def test_create_notification_success(async_session: AsyncSession, test_user: User):
    """Test notification creation with all fields."""
    notification = await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="New Assignment",
        message="You have a new math assignment",
        link="/assignments/123",
    )

    assert notification is not None
    assert notification.id is not None
    assert notification.user_id == test_user.id
    assert notification.type == NotificationType.assignment_created
    assert notification.title == "New Assignment"
    assert notification.message == "You have a new math assignment"
    assert notification.link == "/assignments/123"
    assert notification.is_read is False
    assert notification.created_at is not None


@pytest.mark.asyncio
async def test_create_notification_without_link(async_session: AsyncSession, test_user: User):
    """Test notification creation without optional link."""
    notification = await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.system_announcement,
        title="System Update",
        message="The system will be down for maintenance",
    )

    assert notification is not None
    assert notification.link is None


@pytest.mark.asyncio
async def test_create_notification_truncates_long_title(async_session: AsyncSession, test_user: User):
    """Test that long titles are truncated to 500 chars."""
    long_title = "A" * 600

    notification = await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.system_announcement,
        title=long_title,
        message="Test message",
    )

    assert len(notification.title) == 500


# Tests for get_user_notifications


@pytest.mark.asyncio
async def test_get_user_notifications_basic(async_session: AsyncSession, test_user: User):
    """Test fetching user notifications."""
    # Create some notifications
    for i in range(3):
        await notification_service.create_notification(
            db=async_session,
            user_id=test_user.id,
            notification_type=NotificationType.assignment_created,
            title=f"Notification {i}",
            message=f"Message {i}",
        )

    notifications, total = await notification_service.get_user_notifications(
        db=async_session,
        user_id=test_user.id,
    )

    assert len(notifications) == 3
    assert total == 3


@pytest.mark.asyncio
async def test_get_user_notifications_unread_only(async_session: AsyncSession, test_user: User):
    """Test filtering by unread status."""
    # Create read and unread notifications
    n1 = await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="Unread 1",
        message="Message 1",
    )
    n2 = await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="Read 1",
        message="Message 2",
    )

    # Mark one as read
    await notification_service.mark_as_read(async_session, n2.id, test_user.id)

    notifications, total = await notification_service.get_user_notifications(
        db=async_session,
        user_id=test_user.id,
        unread_only=True,
    )

    assert len(notifications) == 1
    assert total == 1
    assert notifications[0].title == "Unread 1"


@pytest.mark.asyncio
async def test_get_user_notifications_by_type(async_session: AsyncSession, test_user: User):
    """Test filtering by notification type."""
    await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="Assignment",
        message="Assignment message",
    )
    await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.deadline_approaching,
        title="Deadline",
        message="Deadline message",
    )

    notifications, total = await notification_service.get_user_notifications(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.deadline_approaching,
    )

    assert len(notifications) == 1
    assert total == 1
    assert notifications[0].type == NotificationType.deadline_approaching


@pytest.mark.asyncio
async def test_get_user_notifications_pagination(async_session: AsyncSession, test_user: User):
    """Test pagination of notifications."""
    # Create 5 notifications
    for i in range(5):
        await notification_service.create_notification(
            db=async_session,
            user_id=test_user.id,
            notification_type=NotificationType.assignment_created,
            title=f"Notification {i}",
            message=f"Message {i}",
        )

    # Get first page
    page1, total = await notification_service.get_user_notifications(
        db=async_session,
        user_id=test_user.id,
        limit=2,
        offset=0,
    )

    assert len(page1) == 2
    assert total == 5

    # Get second page
    page2, _ = await notification_service.get_user_notifications(
        db=async_session,
        user_id=test_user.id,
        limit=2,
        offset=2,
    )

    assert len(page2) == 2


@pytest.mark.asyncio
async def test_get_user_notifications_only_own(
    async_session: AsyncSession, test_user: User, other_user: User
):
    """Test that users only see their own notifications."""
    # Create notification for test_user
    await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="Test User Notification",
        message="For test user",
    )
    # Create notification for other_user
    await notification_service.create_notification(
        db=async_session,
        user_id=other_user.id,
        notification_type=NotificationType.assignment_created,
        title="Other User Notification",
        message="For other user",
    )

    notifications, total = await notification_service.get_user_notifications(
        db=async_session,
        user_id=test_user.id,
    )

    assert len(notifications) == 1
    assert total == 1
    assert notifications[0].title == "Test User Notification"


# Tests for mark_as_read


@pytest.mark.asyncio
async def test_mark_as_read_success(async_session: AsyncSession, test_user: User):
    """Test marking notification as read."""
    notification = await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="Test",
        message="Test message",
    )

    assert notification.is_read is False

    updated = await notification_service.mark_as_read(
        async_session, notification.id, test_user.id
    )

    assert updated is not None
    assert updated.is_read is True


@pytest.mark.asyncio
async def test_mark_as_read_wrong_user(
    async_session: AsyncSession, test_user: User, other_user: User
):
    """Test that users cannot mark other users' notifications as read."""
    notification = await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="Test",
        message="Test message",
    )

    # Try to mark as read with different user
    result = await notification_service.mark_as_read(
        async_session, notification.id, other_user.id
    )

    assert result is None


@pytest.mark.asyncio
async def test_mark_as_read_nonexistent(async_session: AsyncSession, test_user: User):
    """Test marking nonexistent notification returns None."""
    result = await notification_service.mark_as_read(
        async_session, uuid.uuid4(), test_user.id
    )

    assert result is None


# Tests for mark_all_as_read


@pytest.mark.asyncio
async def test_mark_all_as_read_success(async_session: AsyncSession, test_user: User):
    """Test marking all notifications as read."""
    # Create unread notifications
    for i in range(3):
        await notification_service.create_notification(
            db=async_session,
            user_id=test_user.id,
            notification_type=NotificationType.assignment_created,
            title=f"Notification {i}",
            message=f"Message {i}",
        )

    count = await notification_service.mark_all_as_read(async_session, test_user.id)

    assert count == 3

    # Verify all are read
    unread_count = await notification_service.get_unread_count(async_session, test_user.id)
    assert unread_count == 0


@pytest.mark.asyncio
async def test_mark_all_as_read_only_own(
    async_session: AsyncSession, test_user: User, other_user: User
):
    """Test that mark all only affects own notifications."""
    # Create notifications for both users
    await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="Test User",
        message="Test",
    )
    await notification_service.create_notification(
        db=async_session,
        user_id=other_user.id,
        notification_type=NotificationType.assignment_created,
        title="Other User",
        message="Test",
    )

    # Mark all as read for test_user
    await notification_service.mark_all_as_read(async_session, test_user.id)

    # Other user's notification should still be unread
    other_unread = await notification_service.get_unread_count(async_session, other_user.id)
    assert other_unread == 1


# Tests for get_unread_count


@pytest.mark.asyncio
async def test_get_unread_count_success(async_session: AsyncSession, test_user: User):
    """Test getting unread count."""
    # Create mix of read and unread
    n1 = await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="Unread 1",
        message="Message 1",
    )
    await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="Unread 2",
        message="Message 2",
    )
    n3 = await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="Read",
        message="Message 3",
    )

    # Mark one as read
    await notification_service.mark_as_read(async_session, n3.id, test_user.id)

    count = await notification_service.get_unread_count(async_session, test_user.id)

    assert count == 2


@pytest.mark.asyncio
async def test_get_unread_count_zero(async_session: AsyncSession, test_user: User):
    """Test unread count is zero when no notifications."""
    count = await notification_service.get_unread_count(async_session, test_user.id)

    assert count == 0


# Tests for cleanup_old_notifications


@pytest.mark.asyncio
async def test_cleanup_old_notifications_success(async_session: AsyncSession, test_user: User):
    """Test cleanup removes old notifications."""
    # Create an old notification by manually setting created_at
    old_notification = Notification(
        user_id=test_user.id,
        type=NotificationType.system_announcement,
        title="Old notification",
        message="This is old",
        is_read=False,
        created_at=datetime.now(UTC) - timedelta(days=35),
    )
    async_session.add(old_notification)
    await async_session.commit()

    # Create a recent notification
    await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="Recent",
        message="This is recent",
    )

    # Run cleanup with 30 day threshold
    deleted_count = await notification_service.cleanup_old_notifications(async_session, days=30)

    assert deleted_count == 1

    # Verify only recent notification remains
    notifications, total = await notification_service.get_user_notifications(
        async_session, test_user.id
    )
    assert total == 1
    assert notifications[0].title == "Recent"


@pytest.mark.asyncio
async def test_cleanup_old_notifications_none_to_delete(
    async_session: AsyncSession, test_user: User
):
    """Test cleanup when no old notifications exist."""
    await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="Recent",
        message="This is recent",
    )

    deleted_count = await notification_service.cleanup_old_notifications(async_session, days=30)

    assert deleted_count == 0


# Tests for get_notification_icon


def test_get_notification_icon_all_types():
    """Test icon mapping for all notification types."""
    expected_icons = {
        NotificationType.assignment_created: "FileText",
        NotificationType.deadline_approaching: "Clock",
        NotificationType.feedback_received: "MessageSquare",
        NotificationType.message_received: "Mail",
        NotificationType.student_completed: "CheckCircle",
        NotificationType.past_due: "AlertTriangle",
        NotificationType.material_shared: "Share2",
        NotificationType.system_announcement: "Bell",
    }

    for notification_type, expected_icon in expected_icons.items():
        icon = notification_service.get_notification_icon(notification_type)
        assert icon == expected_icon, f"Icon for {notification_type} should be {expected_icon}"


# =============================================================================
# Story 6.8 - Notification Preferences Tests
# =============================================================================


@pytest_asyncio.fixture(name="teacher_user")
async def teacher_user_fixture(async_session: AsyncSession) -> User:
    """Create a test teacher user for preference tests."""
    user = User(
        id=uuid.uuid4(),
        email="teacher@example.com",
        username="teacher",
        hashed_password="dummy_hash",
        role=UserRole.teacher,
        is_active=True,
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


# Tests for get_user_preferences


@pytest.mark.asyncio
async def test_get_user_preferences_student_types(async_session: AsyncSession, test_user: User):
    """Test that student gets student-applicable notification types."""
    preferences = await notification_service.get_user_preferences(
        db=async_session,
        user_id=test_user.id,
        role=UserRole.student,
    )

    pref_types = {p.notification_type for p in preferences}

    # Student should have these types
    assert NotificationType.assignment_created in pref_types
    assert NotificationType.deadline_approaching in pref_types
    assert NotificationType.feedback_received in pref_types
    assert NotificationType.message_received in pref_types

    # Student should NOT have teacher types
    assert NotificationType.student_completed not in pref_types


@pytest.mark.asyncio
async def test_get_user_preferences_teacher_types(async_session: AsyncSession, teacher_user: User):
    """Test that teacher gets teacher-applicable notification types."""
    preferences = await notification_service.get_user_preferences(
        db=async_session,
        user_id=teacher_user.id,
        role=UserRole.teacher,
    )

    pref_types = {p.notification_type for p in preferences}

    # Teacher should have these types
    assert NotificationType.student_completed in pref_types
    assert NotificationType.message_received in pref_types
    assert NotificationType.system_announcement in pref_types

    # Teacher should NOT have student types
    assert NotificationType.assignment_created not in pref_types
    assert NotificationType.deadline_approaching not in pref_types


@pytest.mark.asyncio
async def test_get_user_preferences_default_enabled(async_session: AsyncSession, test_user: User):
    """Test that default preferences are all enabled."""
    preferences = await notification_service.get_user_preferences(
        db=async_session,
        user_id=test_user.id,
        role=UserRole.student,
    )

    for pref in preferences:
        assert pref.enabled is True
        assert pref.email_enabled is False


# Tests for update_preference


@pytest.mark.asyncio
async def test_update_preference_success(async_session: AsyncSession, test_user: User):
    """Test updating a notification preference."""
    # First, ensure preferences exist
    await notification_service.get_user_preferences(
        async_session, test_user.id, UserRole.student
    )

    # Update preference
    result = await notification_service.update_preference(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.deadline_approaching,
        enabled=False,
        role=UserRole.student,
    )

    assert result is not None
    assert result.enabled is False
    assert result.notification_type == NotificationType.deadline_approaching


@pytest.mark.asyncio
async def test_update_preference_invalid_type_for_role(
    async_session: AsyncSession, test_user: User
):
    """Test that updating a type not applicable to role returns None."""
    # Student shouldn't be able to update teacher-only type
    result = await notification_service.update_preference(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.student_completed,  # Teacher-only
        enabled=False,
        role=UserRole.student,
    )

    assert result is None


# Tests for is_notification_enabled


@pytest.mark.asyncio
async def test_is_notification_enabled_default_true(async_session: AsyncSession, test_user: User):
    """Test that notifications are enabled by default (no preference exists)."""
    enabled = await notification_service.is_notification_enabled(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
    )

    assert enabled is True


@pytest.mark.asyncio
async def test_is_notification_enabled_after_disable(async_session: AsyncSession, test_user: User):
    """Test that disabled preference returns False."""
    # Disable the preference
    await notification_service.update_preference(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.deadline_approaching,
        enabled=False,
        role=UserRole.student,
    )

    enabled = await notification_service.is_notification_enabled(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.deadline_approaching,
    )

    assert enabled is False


# Tests for create_notification with preferences


@pytest.mark.asyncio
async def test_create_notification_respects_disabled_preference(
    async_session: AsyncSession, test_user: User
):
    """Test that create_notification returns None when preference is disabled."""
    # Disable the preference
    await notification_service.update_preference(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.deadline_approaching,
        enabled=False,
        role=UserRole.student,
    )

    # Try to create notification
    notification = await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.deadline_approaching,
        title="Deadline approaching",
        message="Your assignment is due soon",
    )

    # Should return None (not created)
    assert notification is None


@pytest.mark.asyncio
async def test_create_notification_works_when_enabled(
    async_session: AsyncSession, test_user: User
):
    """Test that create_notification works when preference is enabled."""
    # Ensure preference is enabled (default)
    notification = await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="New assignment",
        message="You have a new assignment",
    )

    assert notification is not None
    assert notification.title == "New assignment"


# Tests for global mute


@pytest.mark.asyncio
async def test_set_global_mute_success(async_session: AsyncSession, test_user: User):
    """Test setting global mute."""
    mute = await notification_service.set_global_mute(
        db=async_session,
        user_id=test_user.id,
        hours=4,
    )

    assert mute is not None
    assert mute.user_id == test_user.id
    # Muted until should be approximately 4 hours from now
    expected = datetime.now(UTC) + timedelta(hours=4)
    # Handle timezone-naive datetimes from database
    muted_until = mute.muted_until
    if muted_until.tzinfo is None:
        muted_until = muted_until.replace(tzinfo=UTC)
    assert abs((muted_until - expected).total_seconds()) < 5


@pytest.mark.asyncio
async def test_set_global_mute_max_24_hours(async_session: AsyncSession, test_user: User):
    """Test that global mute is capped at 24 hours."""
    mute = await notification_service.set_global_mute(
        db=async_session,
        user_id=test_user.id,
        hours=48,  # Try to set 48 hours
    )

    # Should be capped at 24 hours
    max_expected = datetime.now(UTC) + timedelta(hours=24)
    # Handle timezone-naive datetimes from database
    muted_until = mute.muted_until
    if muted_until.tzinfo is None:
        muted_until = muted_until.replace(tzinfo=UTC)
    assert muted_until <= max_expected + timedelta(seconds=5)


@pytest.mark.asyncio
async def test_check_global_mute_active(async_session: AsyncSession, test_user: User):
    """Test checking active global mute."""
    await notification_service.set_global_mute(
        db=async_session,
        user_id=test_user.id,
        hours=1,
    )

    is_muted = await notification_service.check_global_mute(
        db=async_session,
        user_id=test_user.id,
    )

    assert is_muted is True


@pytest.mark.asyncio
async def test_check_global_mute_inactive(async_session: AsyncSession, test_user: User):
    """Test checking when no mute exists."""
    is_muted = await notification_service.check_global_mute(
        db=async_session,
        user_id=test_user.id,
    )

    assert is_muted is False


@pytest.mark.asyncio
async def test_global_mute_blocks_notifications(async_session: AsyncSession, test_user: User):
    """Test that global mute blocks all notification creation."""
    # Set global mute
    await notification_service.set_global_mute(
        db=async_session,
        user_id=test_user.id,
        hours=1,
    )

    # Try to create notification
    notification = await notification_service.create_notification(
        db=async_session,
        user_id=test_user.id,
        notification_type=NotificationType.assignment_created,
        title="New Assignment",
        message="You have a new assignment",
    )

    # Should return None (blocked by mute)
    assert notification is None


@pytest.mark.asyncio
async def test_cancel_global_mute(async_session: AsyncSession, test_user: User):
    """Test cancelling global mute."""
    # Set mute
    await notification_service.set_global_mute(
        db=async_session,
        user_id=test_user.id,
        hours=1,
    )

    # Cancel mute
    cancelled = await notification_service.cancel_global_mute(
        db=async_session,
        user_id=test_user.id,
    )

    assert cancelled is True

    # Verify mute is cancelled
    is_muted = await notification_service.check_global_mute(
        db=async_session,
        user_id=test_user.id,
    )

    assert is_muted is False


@pytest.mark.asyncio
async def test_cancel_global_mute_when_none(async_session: AsyncSession, test_user: User):
    """Test cancelling when no mute exists returns False."""
    cancelled = await notification_service.cancel_global_mute(
        db=async_session,
        user_id=test_user.id,
    )

    assert cancelled is False


# Tests for get_notification_types_for_role


def test_get_notification_types_for_student():
    """Test getting notification types for student role."""
    types = notification_service.get_notification_types_for_role(UserRole.student)

    assert NotificationType.assignment_created in types
    assert NotificationType.deadline_approaching in types
    assert NotificationType.feedback_received in types
    assert NotificationType.message_received in types
    assert NotificationType.student_completed not in types


def test_get_notification_types_for_teacher():
    """Test getting notification types for teacher role."""
    types = notification_service.get_notification_types_for_role(UserRole.teacher)

    assert NotificationType.student_completed in types
    assert NotificationType.message_received in types
    assert NotificationType.system_announcement in types
    assert NotificationType.assignment_created not in types


def test_get_notification_types_for_admin():
    """Test getting notification types for admin role."""
    types = notification_service.get_notification_types_for_role(UserRole.admin)

    assert NotificationType.system_announcement in types
