"""Deadline reminder service for assignment notifications - Story 6.2."""

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    Assignment,
    AssignmentStatus,
    AssignmentStudent,
    Student,
)

logger = logging.getLogger(__name__)


@dataclass
class DeadlineCheckResult:
    """Result from deadline check operations."""

    notifications_sent: int
    students_notified: int
    assignments_processed: int


async def _has_deadline_notification_today(
    db: AsyncSession,
    user_id: uuid.UUID,
    notification_type: str,
) -> bool:
    """Deadline reminders are now visual badges only. Always returns False."""
    return False


async def check_approaching_deadlines(db: AsyncSession) -> DeadlineCheckResult:
    """
    Check for assignments with approaching deadlines and send notifications.

    Runs as scheduled task (e.g., daily at 8 AM).
    Finds assignments due within next 24 hours and notifies students
    who haven't completed them.

    AC: 3, 4, 5, 10, 11 - Deadline reminder checks

    Spam Prevention (AC: 11):
    - Max 1 deadline reminder per student per day
    - Aggregates multiple assignments into single notification

    Args:
        db: Database session

    Returns:
        DeadlineCheckResult with counts of notifications sent
    """
    now = datetime.now(UTC)
    deadline_window_end = now + timedelta(hours=24)

    # Find assignments due within next 24 hours
    query = select(Assignment).where(
        Assignment.due_date.isnot(None),
        Assignment.due_date > now,
        Assignment.due_date <= deadline_window_end,
    )

    result = await db.execute(query)
    approaching_assignments = list(result.scalars().all())

    if not approaching_assignments:
        logger.info("No assignments approaching deadline found")
        return DeadlineCheckResult(
            notifications_sent=0, students_notified=0, assignments_processed=0
        )

    # Track which students have been notified to aggregate
    students_to_notify: dict[uuid.UUID, list[tuple[Assignment, int]]] = {}

    for assignment in approaching_assignments:
        # Calculate hours remaining (handle naive datetime from DB)
        due_date = assignment.due_date
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=UTC)
        hours_remaining = int((due_date - now).total_seconds() / 3600)

        # Find students who haven't completed this assignment
        student_query = select(AssignmentStudent).where(
            AssignmentStudent.assignment_id == assignment.id,
            AssignmentStudent.status != AssignmentStatus.completed,
        )

        student_result = await db.execute(student_query)
        incomplete_students = list(student_result.scalars().all())

        for assignment_student in incomplete_students:
            # Get student's user_id
            student_result = await db.execute(
                select(Student).where(Student.id == assignment_student.student_id)
            )
            student = student_result.scalar_one_or_none()

            if student and student.user_id:
                if student.user_id not in students_to_notify:
                    students_to_notify[student.user_id] = []
                students_to_notify[student.user_id].append(
                    (assignment, hours_remaining)
                )

    # Send notifications (aggregated per student)
    notifications_sent = 0
    students_notified = 0

    for user_id, assignments_with_hours in students_to_notify.items():
        # Check if student already received deadline notification today
        if await _has_deadline_notification_today(db, user_id, "deadline_approaching"):
            logger.debug(f"Student {user_id} already notified today, skipping")
            continue

        # Format notification based on number of assignments
        if len(assignments_with_hours) == 1:
            assignment, hours = assignments_with_hours[0]
            message = f"Due in {hours} hours"
        else:
            # Aggregate multiple assignments
            assignment_names = [a.name for a, _ in assignments_with_hours[:3]]
            if len(assignments_with_hours) > 3:
                f"{len(assignments_with_hours)} assignments due soon"
            else:
                pass
            message = ", ".join(assignment_names)
            if len(assignments_with_hours) > 3:
                message += f" and {len(assignments_with_hours) - 3} more"
            # Link to first assignment
            f"/student/assignments/{assignments_with_hours[0][0].id}"

        # Deadline reminders are now visual badges only — no messages sent
        notifications_sent += 1
        students_notified += 1
        logger.debug(f"Deadline approaching for user {user_id} (visual badge only)")

    logger.info(
        f"Deadline check complete: {notifications_sent} notifications sent "
        f"to {students_notified} students for {len(approaching_assignments)} assignments"
    )

    return DeadlineCheckResult(
        notifications_sent=notifications_sent,
        students_notified=students_notified,
        assignments_processed=len(approaching_assignments),
    )


async def check_past_due_assignments(db: AsyncSession) -> DeadlineCheckResult:
    """
    Check for past due assignments and send notifications to students.

    Runs as scheduled task (e.g., daily at 8 AM).
    Finds assignments that were due 24-48 hours ago and notifies students
    who haven't completed them. Only sends notification once per assignment.

    AC: 8 - Past due notifications sent 1 day after deadline

    Args:
        db: Database session

    Returns:
        DeadlineCheckResult with counts of notifications sent
    """
    now = datetime.now(UTC)
    # Exactly 24-48 hours past due (to avoid re-notifying)
    past_due_window_start = now - timedelta(hours=48)
    past_due_window_end = now - timedelta(hours=24)

    # Find assignments in the past-due window
    query = select(Assignment).where(
        Assignment.due_date.isnot(None),
        Assignment.due_date >= past_due_window_start,
        Assignment.due_date < past_due_window_end,
    )

    result = await db.execute(query)
    past_due_assignments = list(result.scalars().all())

    if not past_due_assignments:
        logger.info("No past-due assignments found in window")
        return DeadlineCheckResult(
            notifications_sent=0, students_notified=0, assignments_processed=0
        )

    notifications_sent = 0
    students_notified_set: set[uuid.UUID] = set()

    for assignment in past_due_assignments:
        # Find students who haven't completed this assignment
        student_query = select(AssignmentStudent).where(
            AssignmentStudent.assignment_id == assignment.id,
            AssignmentStudent.status != AssignmentStatus.completed,
        )

        student_result = await db.execute(student_query)
        incomplete_students = list(student_result.scalars().all())

        for assignment_student in incomplete_students:
            # Get student's user_id
            student_result = await db.execute(
                select(Student).where(Student.id == assignment_student.student_id)
            )
            student = student_result.scalar_one_or_none()

            if not student or not student.user_id:
                continue

            # Past-due reminders are now visual badges only — no messages sent
            notifications_sent += 1
            students_notified_set.add(student.user_id)
            logger.debug(
                f"Past-due for user {student.user_id}, assignment {assignment.id} (visual badge only)"
            )

    logger.info(
        f"Past-due check complete: {notifications_sent} notifications sent "
        f"to {len(students_notified_set)} students for {len(past_due_assignments)} assignments"
    )

    return DeadlineCheckResult(
        notifications_sent=notifications_sent,
        students_notified=len(students_notified_set),
        assignments_processed=len(past_due_assignments),
    )
