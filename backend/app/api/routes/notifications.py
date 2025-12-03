"""Notification API endpoints - Story 6.1, 6.8."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import AsyncSessionDep, CurrentUser
from app.models import NotificationType
from app.schemas.notification import (
    MarkAllReadResponse,
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)
from app.schemas.notification_preference import (
    GlobalMuteRequest,
    GlobalMuteResponse,
    GlobalMuteStatusResponse,
    NotificationPreferenceResponse,
    NotificationPreferencesBulkUpdate,
    NotificationPreferencesBulkUpdateResponse,
    NotificationPreferencesListResponse,
    NotificationPreferenceUpdate,
    get_preference_description,
    get_preference_label,
)
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _calculate_remaining_hours(muted_until: datetime) -> float:
    """Calculate remaining hours, handling timezone-naive datetimes from database."""
    if muted_until.tzinfo is None:
        muted_until = muted_until.replace(tzinfo=UTC)
    return (muted_until - datetime.now(UTC)).total_seconds() / 3600


@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    unread_only: bool = Query(False, description="Filter to only unread notifications"),
    notification_type: NotificationType | None = Query(
        None, alias="type", description="Filter by notification type"
    ),
    limit: int = Query(20, ge=1, le=100, description="Number of notifications to return"),
    offset: int = Query(0, ge=0, description="Number of notifications to skip"),
) -> NotificationListResponse:
    """
    Get notifications for the current authenticated user.

    Supports filtering by read status and notification type.
    Returns paginated results with total count.
    """
    notifications, total = await notification_service.get_user_notifications(
        db=db,
        user_id=current_user.id,
        unread_only=unread_only,
        notification_type=notification_type,
        limit=limit,
        offset=offset,
    )

    return NotificationListResponse(
        notifications=[NotificationResponse.model_validate(n) for n in notifications],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(notifications) < total,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    db: AsyncSessionDep,
    current_user: CurrentUser,
) -> UnreadCountResponse:
    """
    Get count of unread notifications for the current user.

    Useful for displaying badge count on notification bell.
    """
    count = await notification_service.get_unread_count(
        db=db,
        user_id=current_user.id,
    )

    return UnreadCountResponse(count=count)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    notification_id: uuid.UUID,
) -> NotificationResponse:
    """
    Mark a specific notification as read.

    The notification must belong to the current user.
    Returns 404 if notification not found or doesn't belong to user.
    """
    notification = await notification_service.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id,
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return NotificationResponse.model_validate(notification)


@router.post("/mark-all-read", response_model=MarkAllReadResponse)
async def mark_all_notifications_as_read(
    db: AsyncSessionDep,
    current_user: CurrentUser,
) -> MarkAllReadResponse:
    """
    Mark all notifications as read for the current user.

    Returns the count of notifications that were marked as read.
    """
    marked_count = await notification_service.mark_all_as_read(
        db=db,
        user_id=current_user.id,
    )

    return MarkAllReadResponse(marked_count=marked_count)


# =============================================================================
# Notification Preference Endpoints (Story 6.8)
# =============================================================================


@router.get("/preferences", response_model=NotificationPreferencesListResponse)
async def get_notification_preferences(
    db: AsyncSessionDep,
    current_user: CurrentUser,
) -> NotificationPreferencesListResponse:
    """
    Get all notification preferences for the current user.

    Returns preferences filtered by user role, with labels and descriptions.
    Also includes global mute status if active.
    """
    preferences = await notification_service.get_user_preferences(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
    )

    # Get global mute status
    mute = await notification_service.get_global_mute(db, current_user.id)
    global_mute = None
    if mute:
        remaining = _calculate_remaining_hours(mute.muted_until)
        global_mute = GlobalMuteResponse(
            muted_until=mute.muted_until,
            remaining_hours=max(0, remaining),
        )

    return NotificationPreferencesListResponse(
        preferences=[
            NotificationPreferenceResponse(
                notification_type=p.notification_type,
                enabled=p.enabled,
                email_enabled=p.email_enabled,
                label=get_preference_label(p.notification_type),
                description=get_preference_description(p.notification_type),
            )
            for p in preferences
        ],
        global_mute=global_mute,
    )


@router.patch("/preferences", response_model=NotificationPreferencesBulkUpdateResponse)
async def update_notification_preferences(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    updates: NotificationPreferencesBulkUpdate,
) -> NotificationPreferencesBulkUpdateResponse:
    """
    Bulk update notification preferences.

    Accepts a dictionary mapping notification type names to enabled status.
    Only updates preferences applicable to the user's role.
    """
    updated_types = []

    for type_name, enabled in updates.preferences.items():
        try:
            notification_type = NotificationType(type_name)
        except ValueError:
            continue  # Skip invalid types

        result = await notification_service.update_preference(
            db=db,
            user_id=current_user.id,
            notification_type=notification_type,
            enabled=enabled,
            role=current_user.role,
        )

        if result:
            updated_types.append(type_name)

    # Get updated preferences
    preferences = await notification_service.get_user_preferences(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
    )

    return NotificationPreferencesBulkUpdateResponse(
        updated=updated_types,
        preferences=[
            NotificationPreferenceResponse(
                notification_type=p.notification_type,
                enabled=p.enabled,
                email_enabled=p.email_enabled,
                label=get_preference_label(p.notification_type),
                description=get_preference_description(p.notification_type),
            )
            for p in preferences
        ],
    )


@router.patch("/preferences/{notification_type}", response_model=NotificationPreferenceResponse)
async def update_single_preference(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    notification_type: NotificationType,
    update: NotificationPreferenceUpdate,
) -> NotificationPreferenceResponse:
    """
    Update a single notification preference.

    The notification type must be applicable to the user's role.
    """
    result = await notification_service.update_preference(
        db=db,
        user_id=current_user.id,
        notification_type=notification_type,
        enabled=update.enabled,
        role=current_user.role,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Notification type '{notification_type.value}' is not applicable to your role",
        )

    return NotificationPreferenceResponse(
        notification_type=result.notification_type,
        enabled=result.enabled,
        email_enabled=result.email_enabled,
        label=get_preference_label(result.notification_type),
        description=get_preference_description(result.notification_type),
    )


# =============================================================================
# Global Mute Endpoints (Story 6.8)
# =============================================================================


@router.post("/mute", response_model=GlobalMuteResponse)
async def set_global_mute(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    request: GlobalMuteRequest,
) -> GlobalMuteResponse:
    """
    Set global notification mute for a specified number of hours.

    Maximum mute duration is 24 hours.
    """
    mute = await notification_service.set_global_mute(
        db=db,
        user_id=current_user.id,
        hours=request.hours,
    )

    remaining = _calculate_remaining_hours(mute.muted_until)

    return GlobalMuteResponse(
        muted_until=mute.muted_until,
        remaining_hours=max(0, remaining),
    )


@router.delete("/mute", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_global_mute(
    db: AsyncSessionDep,
    current_user: CurrentUser,
) -> None:
    """
    Cancel global notification mute.

    Returns 204 No Content on success (even if no mute was active).
    """
    await notification_service.cancel_global_mute(
        db=db,
        user_id=current_user.id,
    )


@router.get("/mute", response_model=GlobalMuteStatusResponse)
async def get_mute_status(
    db: AsyncSessionDep,
    current_user: CurrentUser,
) -> GlobalMuteStatusResponse:
    """
    Get current global mute status.

    Returns is_muted=False if no mute is active or if mute has expired.
    """
    mute = await notification_service.get_global_mute(db, current_user.id)

    if not mute:
        return GlobalMuteStatusResponse(is_muted=False, mute=None)

    remaining = _calculate_remaining_hours(mute.muted_until)

    return GlobalMuteStatusResponse(
        is_muted=True,
        mute=GlobalMuteResponse(
            muted_until=mute.muted_until,
            remaining_hours=max(0, remaining),
        ),
    )
