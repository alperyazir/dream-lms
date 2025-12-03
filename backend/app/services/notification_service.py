"""Notification service for in-app notifications - Story 6.1, 6.8."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    Notification,
    NotificationMute,
    NotificationPreference,
    NotificationType,
    UserRole,
)

# =============================================================================
# Role-Based Notification Types (Story 6.8 - Task 5)
# =============================================================================


ROLE_NOTIFICATION_TYPES: dict[UserRole, list[NotificationType]] = {
    UserRole.student: [
        NotificationType.assignment_created,
        NotificationType.deadline_approaching,
        NotificationType.feedback_received,
        NotificationType.message_received,
        NotificationType.material_shared,
        NotificationType.past_due,
    ],
    UserRole.teacher: [
        NotificationType.student_completed,
        NotificationType.message_received,
        NotificationType.system_announcement,
    ],
    UserRole.admin: [
        NotificationType.system_announcement,
    ],
    UserRole.publisher: [
        NotificationType.system_announcement,
    ],
}


def get_notification_types_for_role(role: UserRole) -> list[NotificationType]:
    """Get the notification types applicable to a user role."""
    return ROLE_NOTIFICATION_TYPES.get(role, [])


# =============================================================================
# Notification Preference Functions (Story 6.8)
# =============================================================================


async def get_user_preferences(
    db: AsyncSession,
    user_id: uuid.UUID,
    role: UserRole,
) -> list[NotificationPreference]:
    """
    Get all notification preferences for a user, filtered by role.

    If preferences don't exist, they are lazily initialized with defaults.

    Args:
        db: Database session
        user_id: UUID of the user
        role: User's role to filter applicable notification types

    Returns:
        List of NotificationPreference objects for the user's role
    """
    applicable_types = get_notification_types_for_role(role)

    # Get existing preferences
    query = select(NotificationPreference).where(
        NotificationPreference.user_id == user_id,
        NotificationPreference.notification_type.in_(applicable_types),
    )
    result = await db.execute(query)
    existing_prefs = {p.notification_type: p for p in result.scalars().all()}

    # Lazily initialize missing preferences
    preferences = []
    for ntype in applicable_types:
        if ntype in existing_prefs:
            preferences.append(existing_prefs[ntype])
        else:
            # Create default preference
            new_pref = NotificationPreference(
                user_id=user_id,
                notification_type=ntype,
                enabled=True,
                email_enabled=False,
            )
            db.add(new_pref)
            preferences.append(new_pref)

    # Commit any new preferences
    if len(preferences) > len(existing_prefs):
        await db.commit()
        # Refresh new preferences to get their IDs
        for pref in preferences:
            if pref.id is None:
                await db.refresh(pref)

    return preferences


async def update_preference(
    db: AsyncSession,
    user_id: uuid.UUID,
    notification_type: NotificationType,
    enabled: bool,
    role: UserRole,
) -> NotificationPreference | None:
    """
    Update a single notification preference.

    Args:
        db: Database session
        user_id: UUID of the user
        notification_type: Type of notification to update
        enabled: Whether the notification is enabled
        role: User's role (to validate the type is applicable)

    Returns:
        Updated NotificationPreference or None if type not applicable to role
    """
    # Validate notification type is applicable to role
    applicable_types = get_notification_types_for_role(role)
    if notification_type not in applicable_types:
        return None

    # Get or create preference
    query = select(NotificationPreference).where(
        NotificationPreference.user_id == user_id,
        NotificationPreference.notification_type == notification_type,
    )
    result = await db.execute(query)
    pref = result.scalar_one_or_none()

    if pref:
        pref.enabled = enabled
        db.add(pref)
    else:
        pref = NotificationPreference(
            user_id=user_id,
            notification_type=notification_type,
            enabled=enabled,
            email_enabled=False,
        )
        db.add(pref)

    await db.commit()
    await db.refresh(pref)
    return pref


async def initialize_default_preferences(
    db: AsyncSession,
    user_id: uuid.UUID,
    role: UserRole,
) -> list[NotificationPreference]:
    """
    Initialize all default notification preferences for a new user.

    Args:
        db: Database session
        user_id: UUID of the user
        role: User's role

    Returns:
        List of created NotificationPreference objects
    """
    applicable_types = get_notification_types_for_role(role)
    preferences = []

    for ntype in applicable_types:
        pref = NotificationPreference(
            user_id=user_id,
            notification_type=ntype,
            enabled=True,
            email_enabled=False,
        )
        db.add(pref)
        preferences.append(pref)

    if preferences:
        await db.commit()
        for pref in preferences:
            await db.refresh(pref)

    return preferences


async def is_notification_enabled(
    db: AsyncSession,
    user_id: uuid.UUID,
    notification_type: NotificationType,
) -> bool:
    """
    Check if a specific notification type is enabled for a user.

    Returns True if no preference exists (default is enabled).

    Args:
        db: Database session
        user_id: UUID of the user
        notification_type: Type of notification to check

    Returns:
        True if enabled, False otherwise
    """
    query = select(NotificationPreference.enabled).where(
        NotificationPreference.user_id == user_id,
        NotificationPreference.notification_type == notification_type,
    )
    result = await db.execute(query)
    enabled = result.scalar_one_or_none()

    # Default to enabled if no preference exists
    return enabled if enabled is not None else True


# =============================================================================
# Global Mute Functions (Story 6.8)
# =============================================================================


async def set_global_mute(
    db: AsyncSession,
    user_id: uuid.UUID,
    hours: int,
) -> NotificationMute:
    """
    Set global notification mute for a user.

    Args:
        db: Database session
        user_id: UUID of the user
        hours: Number of hours to mute (max 24)

    Returns:
        Created or updated NotificationMute object
    """
    # Ensure max 24 hours
    hours = min(hours, 24)
    muted_until = datetime.now(UTC) + timedelta(hours=hours)

    # Check for existing mute
    query = select(NotificationMute).where(NotificationMute.user_id == user_id)
    result = await db.execute(query)
    existing_mute = result.scalar_one_or_none()

    if existing_mute:
        existing_mute.muted_until = muted_until
        existing_mute.created_at = datetime.now(UTC)
        db.add(existing_mute)
        mute = existing_mute
    else:
        mute = NotificationMute(
            user_id=user_id,
            muted_until=muted_until,
            created_at=datetime.now(UTC),
        )
        db.add(mute)

    await db.commit()
    await db.refresh(mute)
    return mute


async def cancel_global_mute(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> bool:
    """
    Cancel global notification mute for a user.

    Args:
        db: Database session
        user_id: UUID of the user

    Returns:
        True if mute was cancelled, False if no mute existed
    """
    query = select(NotificationMute).where(NotificationMute.user_id == user_id)
    result = await db.execute(query)
    mute = result.scalar_one_or_none()

    if mute:
        await db.delete(mute)
        await db.commit()
        return True

    return False


async def get_global_mute(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> NotificationMute | None:
    """
    Get current global mute status for a user.

    Returns None if no mute or if mute has expired.

    Args:
        db: Database session
        user_id: UUID of the user

    Returns:
        NotificationMute if active, None otherwise
    """
    query = select(NotificationMute).where(NotificationMute.user_id == user_id)
    result = await db.execute(query)
    mute = result.scalar_one_or_none()

    if mute:
        # Check if expired - handle both timezone-aware and naive datetimes
        now = datetime.now(UTC)
        muted_until = mute.muted_until
        # Make comparison timezone-aware if muted_until is naive
        if muted_until.tzinfo is None:
            muted_until = muted_until.replace(tzinfo=UTC)
        if muted_until <= now:
            # Clean up expired mute
            await db.delete(mute)
            await db.commit()
            return None

    return mute


async def check_global_mute(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> bool:
    """
    Check if user has an active global mute.

    Args:
        db: Database session
        user_id: UUID of the user

    Returns:
        True if user is muted, False otherwise
    """
    mute = await get_global_mute(db, user_id)
    return mute is not None


# =============================================================================
# Notification Creation (Modified for Story 6.8)
# =============================================================================


async def create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    notification_type: NotificationType,
    title: str,
    message: str,
    link: str | None = None,
) -> Notification | None:
    """
    Create a new notification for a user if preferences allow.

    Respects user preferences and global mute settings.

    Args:
        db: Database session
        user_id: UUID of the user to notify
        notification_type: Type of notification
        title: Notification title (max 500 chars)
        message: Notification message text
        link: Optional URL to navigate to when clicked

    Returns:
        Created Notification object, or None if blocked by preferences/mute
    """
    # Check if user has muted all notifications
    if await check_global_mute(db, user_id):
        return None

    # Check if this notification type is enabled
    if not await is_notification_enabled(db, user_id, notification_type):
        return None

    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title[:500],  # Truncate if needed
        message=message,
        link=link[:500] if link else None,
        is_read=False,
        created_at=datetime.now(UTC),
    )

    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    return notification


# =============================================================================
# Notification Query Functions (Story 6.1)
# =============================================================================


async def get_user_notifications(
    db: AsyncSession,
    user_id: uuid.UUID,
    unread_only: bool = False,
    notification_type: NotificationType | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Notification], int]:
    """
    Get notifications for a user with optional filtering.

    Args:
        db: Database session
        user_id: UUID of the user
        unread_only: If True, only return unread notifications
        notification_type: Filter by specific notification type
        limit: Maximum number of notifications to return
        offset: Number of notifications to skip

    Returns:
        Tuple of (list of notifications, total count)
    """
    # Build base query
    query = select(Notification).where(Notification.user_id == user_id)

    # Apply filters
    if unread_only:
        query = query.where(Notification.is_read == False)  # noqa: E712

    if notification_type:
        query = query.where(Notification.type == notification_type)

    # Count total before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply ordering and pagination
    query = query.order_by(Notification.created_at.desc())
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    notifications = list(result.scalars().all())

    return notifications, total


async def mark_as_read(
    db: AsyncSession,
    notification_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Notification | None:
    """
    Mark a specific notification as read.

    Args:
        db: Database session
        notification_id: UUID of the notification
        user_id: UUID of the user (for authorization)

    Returns:
        Updated Notification or None if not found/not authorized
    """
    query = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    )

    result = await db.execute(query)
    notification = result.scalar_one_or_none()

    if notification:
        notification.is_read = True
        db.add(notification)
        await db.commit()
        await db.refresh(notification)

    return notification


async def mark_all_as_read(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> int:
    """
    Mark all notifications as read for a user.

    Args:
        db: Database session
        user_id: UUID of the user

    Returns:
        Number of notifications marked as read
    """
    # Get unread notifications
    query = select(Notification).where(
        Notification.user_id == user_id,
        Notification.is_read == False,  # noqa: E712
    )

    result = await db.execute(query)
    notifications = result.scalars().all()

    count = 0
    for notification in notifications:
        notification.is_read = True
        db.add(notification)
        count += 1

    if count > 0:
        await db.commit()

    return count


async def get_unread_count(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> int:
    """
    Get count of unread notifications for a user.

    Args:
        db: Database session
        user_id: UUID of the user

    Returns:
        Count of unread notifications
    """
    query = select(func.count(Notification.id)).where(
        Notification.user_id == user_id,
        Notification.is_read == False,  # noqa: E712
    )

    result = await db.execute(query)
    return result.scalar() or 0


async def cleanup_old_notifications(
    db: AsyncSession,
    days: int = 30,
) -> int:
    """
    Delete notifications older than specified days.

    Args:
        db: Database session
        days: Age threshold in days (default 30)

    Returns:
        Number of notifications deleted
    """
    cutoff_date = datetime.now(UTC) - timedelta(days=days)

    # Get old notifications to delete
    query = select(Notification).where(Notification.created_at < cutoff_date)

    result = await db.execute(query)
    notifications = result.scalars().all()

    count = len(notifications)
    for notification in notifications:
        await db.delete(notification)

    if count > 0:
        await db.commit()

    return count


# =============================================================================
# Utility Functions
# =============================================================================


# Notification type icon mapping utility
NOTIFICATION_TYPE_ICONS = {
    NotificationType.assignment_created: "FileText",
    NotificationType.deadline_approaching: "Clock",
    NotificationType.feedback_received: "MessageSquare",
    NotificationType.message_received: "Mail",
    NotificationType.student_completed: "CheckCircle",
    NotificationType.past_due: "AlertTriangle",
    NotificationType.material_shared: "Share2",
    NotificationType.system_announcement: "Bell",
}


def get_notification_icon(notification_type: NotificationType) -> str:
    """
    Get the icon name for a notification type.

    Args:
        notification_type: Type of notification

    Returns:
        Lucide React icon name
    """
    return NOTIFICATION_TYPE_ICONS.get(notification_type, "Bell")
