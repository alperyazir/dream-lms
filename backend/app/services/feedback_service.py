"""Feedback service for teacher feedback on student assignments - Story 6.4, 6.5."""

import uuid
from datetime import UTC, datetime

import bleach
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.feedback_constants import BADGE_LABELS
from app.models import (
    Assignment,
    AssignmentStudent,
    Feedback,
    NotificationType,
    Student,
    Teacher,
    User,
)
from app.schemas.feedback import FeedbackPublic, FeedbackStudentView
from app.services.notification_service import create_notification

# HTML sanitization settings for XSS protection (same as message_service)
ALLOWED_TAGS = ["p", "br", "strong", "em", "ul", "ol", "li", "b", "i"]
ALLOWED_ATTRS: dict = {}


def sanitize_feedback_text(text: str) -> str:
    """
    Sanitize feedback text to prevent XSS attacks.

    Args:
        text: Raw feedback text from teacher input

    Returns:
        Sanitized HTML-safe feedback text
    """
    return bleach.clean(text, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, strip=True)


async def get_assignment_student_with_context(
    db: AsyncSession,
    assignment_id: uuid.UUID,
    student_id: uuid.UUID,
) -> tuple[AssignmentStudent | None, Assignment | None, Student | None, User | None]:
    """
    Get assignment student record with related assignment and student context.

    Args:
        db: Database session
        assignment_id: UUID of the assignment
        student_id: UUID of the student (students.id, not user_id)

    Returns:
        Tuple of (AssignmentStudent, Assignment, Student, Student's User) or None values
    """
    # First get the student record
    student_query = select(Student).where(Student.id == student_id)
    student_result = await db.execute(student_query)
    student = student_result.scalar_one_or_none()

    if not student:
        return None, None, None, None

    # Get assignment
    assignment_query = select(Assignment).where(Assignment.id == assignment_id)
    assignment_result = await db.execute(assignment_query)
    assignment = assignment_result.scalar_one_or_none()

    if not assignment:
        return None, None, student, None

    # Get assignment student record
    as_query = select(AssignmentStudent).where(
        AssignmentStudent.assignment_id == assignment_id,
        AssignmentStudent.student_id == student_id,
    )
    as_result = await db.execute(as_query)
    assignment_student = as_result.scalar_one_or_none()

    # Get student's user record
    user_query = select(User).where(User.id == student.user_id)
    user_result = await db.execute(user_query)
    student_user = user_result.scalar_one_or_none()

    return assignment_student, assignment, student, student_user


async def create_feedback(
    db: AsyncSession,
    assignment_student_id: uuid.UUID,
    teacher_id: uuid.UUID,
    feedback_text: str,
    is_draft: bool = False,
    badges: list[str] | None = None,
    emoji_reaction: str | None = None,
) -> Feedback:
    """
    Create new feedback for a student assignment.

    Args:
        db: Database session
        assignment_student_id: UUID of the assignment_student junction record
        teacher_id: UUID of the teacher (teachers.id)
        feedback_text: Feedback text content
        is_draft: Whether to save as draft (not visible to student)
        badges: List of badge slugs to award (Story 6.5)
        emoji_reaction: Single emoji reaction slug (Story 6.5)

    Returns:
        Created Feedback object
    """
    # Sanitize feedback text for XSS protection
    sanitized_text = sanitize_feedback_text(feedback_text)

    # Store emoji_reaction as single-item array (model uses array for flexibility)
    emoji_reactions = [emoji_reaction] if emoji_reaction else []

    feedback = Feedback(
        assignment_student_id=assignment_student_id,
        teacher_id=teacher_id,
        feedback_text=sanitized_text,
        is_draft=is_draft,
        badges=badges or [],
        emoji_reactions=emoji_reactions,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)

    # Send notification if not a draft
    if not is_draft:
        await _send_feedback_notification(db, feedback, new_badges=badges or [])

    return feedback


async def update_feedback(
    db: AsyncSession,
    feedback_id: uuid.UUID,
    teacher_id: uuid.UUID,
    feedback_text: str | None = None,
    is_draft: bool | None = None,
    badges: list[str] | None = None,
    emoji_reaction: str | None = None,
) -> Feedback | None:
    """
    Update existing feedback.

    Args:
        db: Database session
        feedback_id: UUID of the feedback to update
        teacher_id: UUID of the teacher (for authorization)
        feedback_text: New feedback text (optional)
        is_draft: New draft status (optional)
        badges: New list of badge slugs (optional, Story 6.5)
        emoji_reaction: New emoji reaction slug (optional, Story 6.5)

    Returns:
        Updated Feedback or None if not found/not authorized
    """
    query = select(Feedback).where(
        Feedback.id == feedback_id,
        Feedback.teacher_id == teacher_id,
    )
    result = await db.execute(query)
    feedback = result.scalar_one_or_none()

    if not feedback:
        return None

    was_draft = feedback.is_draft
    old_badges = set(feedback.badges or [])

    # Update fields
    if feedback_text is not None:
        feedback.feedback_text = sanitize_feedback_text(feedback_text)

    if is_draft is not None:
        feedback.is_draft = is_draft

    # Update badges if provided (AC: 13 - can remove by passing empty array)
    if badges is not None:
        feedback.badges = badges

    # Update emoji_reaction if provided
    if emoji_reaction is not None:
        feedback.emoji_reactions = [emoji_reaction]
    elif emoji_reaction == "":
        # Allow clearing emoji by passing empty string
        feedback.emoji_reactions = []

    feedback.updated_at = datetime.now(UTC)

    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)

    # Determine newly awarded badges
    new_badges = list(set(feedback.badges or []) - old_badges)

    # Send notification if changing from draft to published
    if was_draft and is_draft is False:
        await _send_feedback_notification(db, feedback, new_badges=new_badges)

    return feedback


async def get_feedback_by_assignment_student(
    db: AsyncSession,
    assignment_student_id: uuid.UUID,
) -> Feedback | None:
    """
    Get feedback by assignment_student_id.

    Args:
        db: Database session
        assignment_student_id: UUID of the assignment_student junction record

    Returns:
        Feedback or None if not found
    """
    query = select(Feedback).where(
        Feedback.assignment_student_id == assignment_student_id
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_feedback_for_student_view(
    db: AsyncSession,
    assignment_id: uuid.UUID,
    student_id: uuid.UUID,
) -> FeedbackStudentView | None:
    """
    Get feedback for a student's view of their assignment.
    Only returns published feedback (not drafts).

    Args:
        db: Database session
        assignment_id: UUID of the assignment
        student_id: UUID of the student (students.id)

    Returns:
        FeedbackStudentView or None if not found or is draft
    """
    # Get assignment student record
    as_query = select(AssignmentStudent).where(
        AssignmentStudent.assignment_id == assignment_id,
        AssignmentStudent.student_id == student_id,
    )
    as_result = await db.execute(as_query)
    assignment_student = as_result.scalar_one_or_none()

    if not assignment_student:
        return None

    # Get feedback (only published)
    feedback_query = select(Feedback).where(
        Feedback.assignment_student_id == assignment_student.id,
        Feedback.is_draft == False,  # noqa: E712
    )
    feedback_result = await db.execute(feedback_query)
    feedback = feedback_result.scalar_one_or_none()

    if not feedback:
        return None

    # Get teacher info
    teacher_query = select(Teacher, User).join(User, Teacher.user_id == User.id).where(
        Teacher.id == feedback.teacher_id
    )
    teacher_result = await db.execute(teacher_query)
    teacher_row = teacher_result.first()

    if not teacher_row:
        return None

    teacher, teacher_user = teacher_row

    # Get assignment info
    assignment_query = select(Assignment).where(Assignment.id == assignment_id)
    assignment_result = await db.execute(assignment_query)
    assignment = assignment_result.scalar_one_or_none()

    if not assignment:
        return None

    return FeedbackStudentView(
        id=feedback.id,
        feedback_text=feedback.feedback_text,
        badges=feedback.badges or [],
        emoji_reactions=feedback.emoji_reactions or [],
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
        teacher_name=teacher_user.full_name or teacher_user.email.split("@")[0],
        teacher_user_id=teacher_user.id,
        assignment_name=assignment.name,
        assignment_id=assignment.id,
    )


async def get_feedback_public(
    db: AsyncSession,
    feedback: Feedback,
) -> FeedbackPublic | None:
    """
    Build FeedbackPublic response from a Feedback object.

    Args:
        db: Database session
        feedback: Feedback object

    Returns:
        FeedbackPublic or None if related data not found
    """
    # Get assignment student with eager loading context
    as_query = select(AssignmentStudent).where(
        AssignmentStudent.id == feedback.assignment_student_id
    )
    as_result = await db.execute(as_query)
    assignment_student = as_result.scalar_one_or_none()

    if not assignment_student:
        return None

    # Get assignment
    assignment_query = select(Assignment).where(
        Assignment.id == assignment_student.assignment_id
    )
    assignment_result = await db.execute(assignment_query)
    assignment = assignment_result.scalar_one_or_none()

    if not assignment:
        return None

    # Get student and user
    student_query = select(Student, User).join(User, Student.user_id == User.id).where(
        Student.id == assignment_student.student_id
    )
    student_result = await db.execute(student_query)
    student_row = student_result.first()

    if not student_row:
        return None

    student, student_user = student_row

    # Get teacher and user
    teacher_query = select(Teacher, User).join(User, Teacher.user_id == User.id).where(
        Teacher.id == feedback.teacher_id
    )
    teacher_result = await db.execute(teacher_query)
    teacher_row = teacher_result.first()

    if not teacher_row:
        return None

    teacher, teacher_user = teacher_row

    return FeedbackPublic(
        id=feedback.id,
        assignment_student_id=feedback.assignment_student_id,
        teacher_id=feedback.teacher_id,
        feedback_text=feedback.feedback_text,
        badges=feedback.badges or [],
        emoji_reactions=feedback.emoji_reactions or [],
        is_draft=feedback.is_draft,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
        assignment_id=assignment.id,
        assignment_name=assignment.name,
        student_id=student.id,
        student_name=student_user.full_name or student_user.email.split("@")[0],
        student_user_id=student_user.id,
        teacher_name=teacher_user.full_name or teacher_user.email.split("@")[0],
        teacher_user_id=teacher_user.id,
        score=assignment_student.score,
    )


async def _send_feedback_notification(
    db: AsyncSession,
    feedback: Feedback,
    new_badges: list[str] | None = None,
) -> None:
    """
    Send notification to student when feedback is published.

    Args:
        db: Database session
        feedback: Feedback object
        new_badges: List of newly awarded badge slugs (Story 6.5, AC: 11)
    """
    # Get assignment student
    as_query = select(AssignmentStudent).where(
        AssignmentStudent.id == feedback.assignment_student_id
    )
    as_result = await db.execute(as_query)
    assignment_student = as_result.scalar_one_or_none()

    if not assignment_student:
        return

    # Get student's user_id
    student_query = select(Student).where(Student.id == assignment_student.student_id)
    student_result = await db.execute(student_query)
    student = student_result.scalar_one_or_none()

    if not student:
        return

    # Get assignment name
    assignment_query = select(Assignment).where(
        Assignment.id == assignment_student.assignment_id
    )
    assignment_result = await db.execute(assignment_query)
    assignment = assignment_result.scalar_one_or_none()

    if not assignment:
        return

    # Build notification message (AC: 11 - include badge names)
    if new_badges:
        badge_names = [BADGE_LABELS.get(b, b) for b in new_badges]
        if len(badge_names) == 1:
            message = f"You earned '{badge_names[0]}' badge on {assignment.name}!"
        else:
            # Join with "and" for the last item
            formatted_badges = ", ".join(f"'{b}'" for b in badge_names[:-1])
            formatted_badges += f" and '{badge_names[-1]}'"
            message = f"You earned {formatted_badges} badges on {assignment.name}!"
        title = "Badge Earned!"
    else:
        message = f"You have received feedback on {assignment.name}"
        title = "Feedback Received"

    # Create notification
    await create_notification(
        db=db,
        user_id=student.user_id,
        notification_type=NotificationType.feedback_received,
        title=title,
        message=message,
        link=f"/student/assignments/{assignment.id}",
    )


async def get_student_badge_counts(
    db: AsyncSession,
    student_id: uuid.UUID,
    this_month_only: bool = False,
) -> dict:
    """
    Get badge counts for a student across all their feedback.

    Args:
        db: Database session
        student_id: UUID of the student (students.id)
        this_month_only: If True, only count badges from current month

    Returns:
        Dictionary with badge counts by type, total, and this_month counts
    """
    from collections import Counter

    from app.core.feedback_constants import VALID_BADGE_SLUGS

    # Get all assignment_student records for this student
    as_query = select(AssignmentStudent.id).where(
        AssignmentStudent.student_id == student_id
    )
    as_result = await db.execute(as_query)
    assignment_student_ids = [row[0] for row in as_result.all()]

    if not assignment_student_ids:
        # Return zero counts for all badge types
        return {
            "badge_counts": {slug: 0 for slug in VALID_BADGE_SLUGS},
            "total": 0,
            "this_month": {slug: 0 for slug in VALID_BADGE_SLUGS},
            "this_month_total": 0,
        }

    # Get all published feedback for this student
    feedback_query = select(Feedback).where(
        Feedback.assignment_student_id.in_(assignment_student_ids),
        Feedback.is_draft == False,  # noqa: E712
    )
    feedback_result = await db.execute(feedback_query)
    feedback_records = feedback_result.scalars().all()

    # Count all badges
    all_badges: list[str] = []
    this_month_badges: list[str] = []
    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    for fb in feedback_records:
        if fb.badges:
            all_badges.extend(fb.badges)
            # Check if created this month
            if fb.created_at and fb.created_at >= month_start:
                this_month_badges.extend(fb.badges)

    # Count by badge type
    badge_counts = Counter(all_badges)
    this_month_counts = Counter(this_month_badges)

    # Ensure all badge types are present (with 0 if not earned)
    result_counts = {slug: badge_counts.get(slug, 0) for slug in VALID_BADGE_SLUGS}
    result_this_month = {slug: this_month_counts.get(slug, 0) for slug in VALID_BADGE_SLUGS}

    return {
        "badge_counts": result_counts,
        "total": sum(result_counts.values()),
        "this_month": result_this_month,
        "this_month_total": sum(result_this_month.values()),
    }
