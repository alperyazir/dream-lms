"""Scheduled task endpoints for automated jobs - Story 6.2."""

import logging
from typing import Annotated

from fastapi import Header, HTTPException, status
from fastapi.routing import APIRouter
from pydantic import BaseModel

from app.api.deps import AsyncSessionDep, require_role
from app.core.config import settings
from app.models import User, UserRole
from app.services.assignment_scheduler import publish_scheduled_assignments
from app.services.deadline_reminder_service import (
    check_approaching_deadlines,
    check_past_due_assignments,
)

router = APIRouter(prefix="/admin/tasks", tags=["scheduled-tasks"])

logger = logging.getLogger(__name__)


class DeadlineCheckResponse(BaseModel):
    """Response model for deadline check tasks."""

    success: bool
    deadline_reminders_sent: int
    deadline_students_notified: int
    deadline_assignments_processed: int
    past_due_notifications_sent: int
    past_due_students_notified: int
    past_due_assignments_processed: int
    message: str


async def verify_scheduler_access(
    x_scheduler_key: Annotated[str | None, Header()] = None,
    current_user: User | None = None,
) -> bool:
    """
    Verify the request has valid scheduler access.

    Access is granted if:
    1. A valid scheduler API key is provided in X-Scheduler-Key header, OR
    2. The request is from an authenticated admin user

    Args:
        x_scheduler_key: Optional scheduler API key from header
        current_user: Optional authenticated user

    Returns:
        True if access is granted

    Raises:
        HTTPException 403 if access is denied
    """
    # Check scheduler key if configured
    if settings.SCHEDULER_API_KEY and x_scheduler_key == settings.SCHEDULER_API_KEY:
        return True

    # Check if admin user
    if current_user and current_user.role == UserRole.admin:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Scheduler access denied. Provide valid X-Scheduler-Key header or admin credentials.",
    )


@router.post(
    "/deadline-reminders",
    response_model=DeadlineCheckResponse,
    summary="Run deadline reminder checks",
    description="Checks for approaching deadlines and past-due assignments, sending notifications as needed. "
    "Should be called daily by external scheduler (e.g., at 8 AM).",
)
async def run_deadline_reminders(
    *,
    session: AsyncSessionDep,
    x_scheduler_key: Annotated[str | None, Header()] = None,
    current_user: User = require_role(UserRole.admin),
) -> DeadlineCheckResponse:
    """
    Run deadline reminder checks and send notifications.

    This endpoint is designed to be called by an external scheduler (cron, AWS Lambda,
    GitHub Actions, etc.) at a regular interval (typically 8 AM daily).

    **Checks performed:**
    1. Approaching deadlines (assignments due within 24 hours)
    2. Past-due assignments (assignments that became overdue 24-48 hours ago)

    **Authorization:**
    Requires either:
    - Valid X-Scheduler-Key header (configured via SCHEDULER_API_KEY env var)
    - Authenticated admin user

    **Returns:**
    Summary of notifications sent for both check types
    """
    logger.info("Starting scheduled deadline reminder checks")

    # Run approaching deadline check
    try:
        deadline_result = await check_approaching_deadlines(session)
        logger.info(
            f"Deadline check complete: {deadline_result.notifications_sent} sent"
        )
    except Exception as e:
        logger.error(f"Error in approaching deadline check: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check approaching deadlines: {str(e)}",
        )

    # Run past-due check
    try:
        past_due_result = await check_past_due_assignments(session)
        logger.info(
            f"Past-due check complete: {past_due_result.notifications_sent} sent"
        )
    except Exception as e:
        logger.error(f"Error in past-due check: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check past-due assignments: {str(e)}",
        )

    total_notifications = (
        deadline_result.notifications_sent + past_due_result.notifications_sent
    )

    return DeadlineCheckResponse(
        success=True,
        deadline_reminders_sent=deadline_result.notifications_sent,
        deadline_students_notified=deadline_result.students_notified,
        deadline_assignments_processed=deadline_result.assignments_processed,
        past_due_notifications_sent=past_due_result.notifications_sent,
        past_due_students_notified=past_due_result.students_notified,
        past_due_assignments_processed=past_due_result.assignments_processed,
        message=f"Sent {total_notifications} notifications total",
    )


@router.post(
    "/approaching-deadlines",
    response_model=DeadlineCheckResponse,
    summary="Run approaching deadline check only",
    description="Checks for assignments due within 24 hours and sends reminders.",
)
async def run_approaching_deadlines_only(
    *,
    session: AsyncSessionDep,
    x_scheduler_key: Annotated[str | None, Header()] = None,
    current_user: User = require_role(UserRole.admin),
) -> DeadlineCheckResponse:
    """Run only the approaching deadline check."""
    logger.info("Starting approaching deadline check only")

    try:
        result = await check_approaching_deadlines(session)
    except Exception as e:
        logger.error(f"Error in approaching deadline check: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check approaching deadlines: {str(e)}",
        )

    return DeadlineCheckResponse(
        success=True,
        deadline_reminders_sent=result.notifications_sent,
        deadline_students_notified=result.students_notified,
        deadline_assignments_processed=result.assignments_processed,
        past_due_notifications_sent=0,
        past_due_students_notified=0,
        past_due_assignments_processed=0,
        message=f"Sent {result.notifications_sent} deadline reminders",
    )


@router.post(
    "/past-due",
    response_model=DeadlineCheckResponse,
    summary="Run past-due check only",
    description="Checks for assignments that became overdue 24-48 hours ago and sends notifications.",
)
async def run_past_due_only(
    *,
    session: AsyncSessionDep,
    x_scheduler_key: Annotated[str | None, Header()] = None,
    current_user: User = require_role(UserRole.admin),
) -> DeadlineCheckResponse:
    """Run only the past-due assignment check."""
    logger.info("Starting past-due check only")

    try:
        result = await check_past_due_assignments(session)
    except Exception as e:
        logger.error(f"Error in past-due check: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check past-due assignments: {str(e)}",
        )

    return DeadlineCheckResponse(
        success=True,
        deadline_reminders_sent=0,
        deadline_students_notified=0,
        deadline_assignments_processed=0,
        past_due_notifications_sent=result.notifications_sent,
        past_due_students_notified=result.students_notified,
        past_due_assignments_processed=result.assignments_processed,
        message=f"Sent {result.notifications_sent} past-due notifications",
    )


class PublishAssignmentsResponse(BaseModel):
    """Response model for publish scheduled assignments task."""

    success: bool
    assignments_published: int
    notifications_sent: int
    students_notified: int
    message: str


@router.post(
    "/publish-assignments",
    response_model=PublishAssignmentsResponse,
    summary="Publish scheduled assignments",
    description="Publishes assignments whose scheduled_publish_date has passed. "
    "Should be called periodically (e.g., every hour or once daily) by external scheduler.",
)
async def run_publish_scheduled_assignments(
    *,
    session: AsyncSessionDep,
    x_scheduler_key: Annotated[str | None, Header()] = None,
    current_user: User = require_role(UserRole.admin),
) -> PublishAssignmentsResponse:
    """
    Publish scheduled assignments.

    This endpoint queries all assignments with:
    - status = 'scheduled'
    - scheduled_publish_date <= now

    For each matching assignment:
    1. Updates status to 'published'
    2. Sends notifications to all assigned students

    **Authorization:**
    Requires either:
    - Valid X-Scheduler-Key header (configured via SCHEDULER_API_KEY env var)
    - Authenticated admin user

    **Returns:**
    Summary of published assignments and notifications sent
    """
    logger.info("Starting scheduled assignment publishing")

    try:
        result = await publish_scheduled_assignments(session)
    except Exception as e:
        logger.error(f"Error publishing scheduled assignments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish scheduled assignments: {str(e)}",
        )

    return PublishAssignmentsResponse(
        success=True,
        assignments_published=result.assignments_published,
        notifications_sent=result.notifications_sent,
        students_notified=result.students_notified,
        message=f"Published {result.assignments_published} assignments, "
        f"sent {result.notifications_sent} notifications",
    )
