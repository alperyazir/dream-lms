"""Assignment scheduling service - Story 9.6."""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.models import (
    Assignment,
    AssignmentPublishStatus,
    NotificationType,
)
from app.services import notification_service

logger = logging.getLogger(__name__)


@dataclass
class PublishResult:
    """Result of the publish_scheduled_assignments operation."""

    assignments_published: int
    notifications_sent: int
    students_notified: int


async def publish_scheduled_assignments(db: AsyncSession) -> PublishResult:
    """
    Publish scheduled assignments whose publish date has passed.

    This function:
    1. Queries assignments with status='scheduled' and scheduled_publish_date <= now
    2. Updates their status to 'published'
    3. Creates notifications for all assigned students

    Should be called periodically (e.g., every hour or once daily).

    Args:
        db: Database session

    Returns:
        PublishResult with counts of published assignments and notifications
    """
    now = datetime.now(UTC)
    assignments_published = 0
    notifications_sent = 0
    students_notified_set: set = set()

    # Query scheduled assignments that should be published
    result = await db.execute(
        select(Assignment)
        .where(Assignment.status == AssignmentPublishStatus.scheduled)
        .where(Assignment.scheduled_publish_date <= now)
        .options(selectinload(Assignment.assignment_students))
    )
    assignments = result.scalars().all()

    if not assignments:
        logger.info("No scheduled assignments ready to publish")
        return PublishResult(
            assignments_published=0, notifications_sent=0, students_notified=0
        )

    logger.info(f"Found {len(assignments)} scheduled assignments to publish")

    for assignment in assignments:
        # Update status to published
        assignment.status = AssignmentPublishStatus.published
        assignment.updated_at = now
        assignments_published += 1

        # Create notifications for assigned students
        from app.models import Student

        for assignment_student in assignment.assignment_students:
            # Load the student to get user_id
            student_query = await db.execute(
                select(Student).where(Student.id == assignment_student.student_id)
            )
            student = student_query.scalar_one_or_none()

            if student and student.user_id:
                try:
                    await notification_service.create_notification(
                        db=db,
                        user_id=student.user_id,
                        notification_type=NotificationType.assignment_created,
                        title=f"New Assignment: {assignment.name}",
                        message=f"You have been assigned '{assignment.name}'. "
                        + (
                            f"Due: {assignment.due_date.strftime('%b %d, %Y')}"
                            if assignment.due_date
                            else "No due date"
                        ),
                        link=f"/student/assignments/{assignment.id}",
                    )
                    notifications_sent += 1
                    students_notified_set.add(student.id)
                except Exception as e:
                    logger.error(
                        f"Failed to send notification to student {student.id}: {e}"
                    )

        logger.info(f"Published assignment {assignment.id}: {assignment.name}")

    await db.commit()

    logger.info(
        f"Scheduler complete: published {assignments_published} assignments, "
        f"sent {notifications_sent} notifications to {len(students_notified_set)} students"
    )

    return PublishResult(
        assignments_published=assignments_published,
        notifications_sent=notifications_sent,
        students_notified=len(students_notified_set),
    )
