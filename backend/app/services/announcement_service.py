"""Announcement service for teacher announcements - Story 26.1."""

import uuid
from datetime import UTC, datetime

import bleach
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    Announcement,
    AnnouncementRead,
    AnnouncementRecipient,
    ClassStudent,
    Notification,
    NotificationType,
    Student,
    Teacher,
)
from app.services.notification_service import create_notification

# =============================================================================
# HTML Sanitization Configuration (Story 26.1 - Task 1.5)
# =============================================================================

ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li']
ALLOWED_ATTRS: dict[str, list[str]] = {}  # No attributes allowed


def sanitize_announcement_content(content: str) -> str:
    """
    Sanitize HTML content for announcements to prevent XSS attacks.

    Only allows whitelisted HTML tags and strips all JavaScript and
    dangerous attributes.

    Args:
        content: Raw HTML content from the rich text editor

    Returns:
        Sanitized HTML content safe for display

    Example:
        >>> sanitize_announcement_content("<script>alert('xss')</script><p>Hello</p>")
        "<p>Hello</p>"
    """
    return bleach.clean(
        content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        strip=True
    )


# =============================================================================
# Recipient Expansion Functions (Story 26.1 - Task 1.6)
# =============================================================================


async def get_recipient_students_from_classrooms(
    db: AsyncSession,
    teacher_id: uuid.UUID,
    classroom_ids: list[uuid.UUID]
) -> list[uuid.UUID]:
    """
    Get all student IDs from the specified classrooms.

    Only returns students from classrooms that belong to the teacher.

    Args:
        db: Database session
        teacher_id: UUID of the teacher
        classroom_ids: List of classroom IDs

    Returns:
        List of unique student UUIDs
    """
    if not classroom_ids:
        return []

    # Query students from selected classrooms
    # Only include classrooms that belong to this teacher
    query = (
        select(ClassStudent.student_id)
        .join(ClassStudent.class_obj)
        .where(
            ClassStudent.class_id.in_(classroom_ids),
            ClassStudent.class_obj.has(teacher_id=teacher_id)
        )
        .distinct()
    )

    result = await db.execute(query)
    student_ids = result.scalars().all()
    return list(student_ids)


async def validate_and_expand_recipients(
    db: AsyncSession,
    teacher_id: uuid.UUID,
    recipient_student_ids: list[uuid.UUID],
    recipient_classroom_ids: list[uuid.UUID]
) -> list[uuid.UUID]:
    """
    Validate and expand recipient lists into final student ID list.

    Combines individual student IDs with students from selected classrooms.
    Ensures no duplicates and validates students belong to teacher's classes.

    Args:
        db: Database session
        teacher_id: UUID of the teacher
        recipient_student_ids: List of individual student IDs
        recipient_classroom_ids: List of classroom IDs

    Returns:
        Deduplicated list of student UUIDs

    Raises:
        ValueError: If no recipients specified
    """
    # Get students from classrooms
    classroom_students = await get_recipient_students_from_classrooms(
        db, teacher_id, recipient_classroom_ids
    )

    # Combine and deduplicate
    all_student_ids = set(recipient_student_ids) | set(classroom_students)

    if not all_student_ids:
        raise ValueError("At least one recipient must be specified")

    # Validate that all students exist and belong to teacher's classes
    query = (
        select(Student.id)
        .join(ClassStudent)
        .join(ClassStudent.class_obj)
        .where(
            Student.id.in_(all_student_ids),
            ClassStudent.class_obj.has(teacher_id=teacher_id)
        )
        .distinct()
    )

    result = await db.execute(query)
    valid_student_ids = result.scalars().all()

    if len(valid_student_ids) != len(all_student_ids):
        raise ValueError("Some students do not belong to your classes")

    return list(valid_student_ids)


# =============================================================================
# Announcement CRUD Functions (Story 26.1 - Task 1.4)
# =============================================================================


async def create_announcement(
    db: AsyncSession,
    teacher_id: uuid.UUID,
    title: str,
    content: str,
    recipient_student_ids: list[uuid.UUID],
    recipient_classroom_ids: list[uuid.UUID] | None = None
) -> Announcement:
    """
    Create a new announcement and send notifications to all recipients.

    Args:
        db: Database session
        teacher_id: UUID of the teacher creating the announcement
        title: Announcement title (max 200 chars)
        content: Rich text HTML content
        recipient_student_ids: List of individual student IDs
        recipient_classroom_ids: List of classroom IDs (optional)

    Returns:
        Created Announcement object with recipients

    Raises:
        ValueError: If validation fails or no recipients specified
    """
    # Sanitize content
    sanitized_content = sanitize_announcement_content(content)

    # Validate and expand recipients
    if recipient_classroom_ids is None:
        recipient_classroom_ids = []

    final_student_ids = await validate_and_expand_recipients(
        db, teacher_id, recipient_student_ids, recipient_classroom_ids
    )

    # Create announcement
    announcement = Announcement(
        teacher_id=teacher_id,
        title=title.strip(),
        content=sanitized_content,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )
    db.add(announcement)
    await db.flush()  # Get announcement ID

    # Create recipient records
    recipient_records = [
        AnnouncementRecipient(
            announcement_id=announcement.id,
            student_id=student_id,
            created_at=datetime.now(UTC)
        )
        for student_id in final_student_ids
    ]
    db.add_all(recipient_records)

    # Fetch students to get their user_ids for notifications
    students_query = select(Student).where(Student.id.in_(final_student_ids))
    students_result = await db.execute(students_query)
    students = students_result.scalars().all()

    # Create notifications for all recipients
    # Note: For >100 recipients, this should be done in background task
    # For now, doing it synchronously as specified in story
    for student in students:
        # Only create notification if student has a valid user_id
        if student.user_id:
            notification = Notification(
                user_id=student.user_id,
                type=NotificationType.announcement,
                title=f"New Announcement: {title}",
                message=f"You have received a new announcement from your teacher.",
                link=f"/student/announcements/{announcement.id}",
                is_read=False,
                created_at=datetime.now(UTC)
            )
            db.add(notification)

    await db.commit()
    await db.refresh(announcement)

    return announcement


async def get_teacher_announcements(
    db: AsyncSession,
    teacher_id: uuid.UUID,
    skip: int = 0,
    limit: int = 20
) -> tuple[list[Announcement], int]:
    """
    Get paginated list of announcements for a teacher.

    Only returns non-deleted announcements.

    Args:
        db: Database session
        teacher_id: UUID of the teacher
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return

    Returns:
        Tuple of (list of announcements, total count)
    """
    # Count total non-deleted announcements
    count_query = (
        select(func.count(Announcement.id))
        .where(
            Announcement.teacher_id == teacher_id,
            Announcement.deleted_at.is_(None)
        )
    )
    total = await db.execute(count_query)
    total_count = total.scalar() or 0

    # Get paginated announcements
    query = (
        select(Announcement)
        .where(
            Announcement.teacher_id == teacher_id,
            Announcement.deleted_at.is_(None)
        )
        .order_by(Announcement.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(query)
    announcements = result.scalars().all()

    return list(announcements), total_count


async def get_announcement_by_id(
    db: AsyncSession,
    announcement_id: uuid.UUID,
    teacher_id: uuid.UUID
) -> Announcement | None:
    """
    Get a specific announcement by ID.

    Only returns announcement if it belongs to the teacher and is not deleted.

    Args:
        db: Database session
        announcement_id: UUID of the announcement
        teacher_id: UUID of the teacher

    Returns:
        Announcement object or None if not found
    """
    query = (
        select(Announcement)
        .where(
            Announcement.id == announcement_id,
            Announcement.teacher_id == teacher_id,
            Announcement.deleted_at.is_(None)
        )
    )

    result = await db.execute(query)
    return result.scalar_one_or_none()


async def update_announcement(
    db: AsyncSession,
    announcement_id: uuid.UUID,
    teacher_id: uuid.UUID,
    title: str | None = None,
    content: str | None = None,
    recipient_student_ids: list[uuid.UUID] | None = None,
    recipient_classroom_ids: list[uuid.UUID] | None = None
) -> Announcement | None:
    """
    Update an existing announcement.

    Only updates if announcement belongs to teacher and is not deleted.

    Args:
        db: Database session
        announcement_id: UUID of the announcement
        teacher_id: UUID of the teacher
        title: New title (optional)
        content: New content (optional)
        recipient_student_ids: New list of student IDs (optional)
        recipient_classroom_ids: New list of classroom IDs (optional)

    Returns:
        Updated Announcement object or None if not found

    Raises:
        ValueError: If no fields provided for update
    """
    if all(x is None for x in [title, content, recipient_student_ids, recipient_classroom_ids]):
        raise ValueError("At least one field must be provided for update")

    announcement = await get_announcement_by_id(db, announcement_id, teacher_id)

    if not announcement:
        return None

    # Update basic fields
    if title is not None:
        announcement.title = title.strip()

    if content is not None:
        announcement.content = sanitize_announcement_content(content)

    announcement.updated_at = datetime.now(UTC)
    db.add(announcement)

    # Update recipients if provided
    if recipient_student_ids is not None or recipient_classroom_ids is not None:
        # Validate and expand new recipients
        final_student_ids = await validate_and_expand_recipients(
            db,
            teacher_id,
            recipient_student_ids if recipient_student_ids is not None else [],
            recipient_classroom_ids if recipient_classroom_ids is not None else []
        )

        # Delete existing recipients
        delete_query = select(AnnouncementRecipient).where(
            AnnouncementRecipient.announcement_id == announcement_id
        )
        result = await db.execute(delete_query)
        existing_recipients = result.scalars().all()
        for recipient in existing_recipients:
            await db.delete(recipient)

        # Create new recipient records
        new_recipients = [
            AnnouncementRecipient(
                announcement_id=announcement_id,
                student_id=student_id,
                created_at=datetime.now(UTC)
            )
            for student_id in final_student_ids
        ]
        db.add_all(new_recipients)

    # Send notifications to all current recipients about the update
    # Get current recipients
    recipients_query = (
        select(AnnouncementRecipient)
        .where(AnnouncementRecipient.announcement_id == announcement_id)
    )
    recipients_result = await db.execute(recipients_query)
    current_recipients = recipients_result.scalars().all()

    # Get student user_ids for notifications
    student_ids = [r.student_id for r in current_recipients]
    if student_ids:
        students_query = select(Student).where(Student.id.in_(student_ids))
        students_result = await db.execute(students_query)
        students = students_result.scalars().all()

        # Create update notifications for each student
        updated_title = title if title is not None else announcement.title
        for student in students:
            if student.user_id:
                notification = Notification(
                    user_id=student.user_id,
                    type=NotificationType.announcement,
                    title=f"Announcement Updated: {updated_title}",
                    message="An announcement from your teacher has been updated.",
                    link=f"/student/announcements",
                    is_read=False,
                    created_at=datetime.now(UTC)
                )
                db.add(notification)

    await db.commit()
    await db.refresh(announcement)

    return announcement


async def delete_announcement(
    db: AsyncSession,
    announcement_id: uuid.UUID,
    teacher_id: uuid.UUID
) -> bool:
    """
    Soft delete an announcement.

    Only deletes if announcement belongs to teacher and is not already deleted.

    Args:
        db: Database session
        announcement_id: UUID of the announcement
        teacher_id: UUID of the teacher

    Returns:
        True if deleted, False if not found
    """
    announcement = await get_announcement_by_id(db, announcement_id, teacher_id)

    if not announcement:
        return False

    announcement.deleted_at = datetime.now(UTC)
    db.add(announcement)
    await db.commit()

    return True


async def get_announcement_recipient_count(
    db: AsyncSession,
    announcement_id: uuid.UUID
) -> int:
    """
    Get the count of recipients for an announcement.

    Args:
        db: Database session
        announcement_id: UUID of the announcement

    Returns:
        Number of recipients
    """
    query = (
        select(func.count(AnnouncementRecipient.id))
        .where(AnnouncementRecipient.announcement_id == announcement_id)
    )

    result = await db.execute(query)
    return result.scalar() or 0


async def get_announcement_recipient_ids(
    db: AsyncSession,
    announcement_id: uuid.UUID
) -> list[uuid.UUID]:
    """
    Get the list of student IDs who are recipients of an announcement.

    Args:
        db: Database session
        announcement_id: UUID of the announcement

    Returns:
        List of student UUIDs
    """
    query = (
        select(AnnouncementRecipient.student_id)
        .where(AnnouncementRecipient.announcement_id == announcement_id)
    )

    result = await db.execute(query)
    return list(result.scalars().all())


# =============================================================================
# Student-Facing Functions (Story 26.2)
# =============================================================================


async def get_student_announcements(
    db: AsyncSession,
    student_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
    filter_type: str = "all"
) -> tuple[list[dict], int, int]:
    """
    Get announcements for a student with read status.

    Args:
        db: Database session
        student_id: UUID of the student
        limit: Maximum number of records to return
        offset: Number of records to skip
        filter_type: Filter type - "all", "unread", or "read"

    Returns:
        Tuple of (list of announcement dicts with read status, total count, unread count)
    """
    from sqlalchemy.orm import selectinload

    # Base query - get announcements for this student
    base_query = (
        select(Announcement)
        .join(AnnouncementRecipient, Announcement.id == AnnouncementRecipient.announcement_id)
        .where(
            AnnouncementRecipient.student_id == student_id,
            Announcement.deleted_at.is_(None)
        )
    )

    # Apply read/unread filter
    if filter_type == "unread":
        # Only announcements without read records for this student
        read_subquery = (
            select(AnnouncementRead.announcement_id)
            .where(AnnouncementRead.student_id == student_id)
        )
        base_query = base_query.where(Announcement.id.notin_(read_subquery))
    elif filter_type == "read":
        # Only announcements with read records for this student
        read_subquery = (
            select(AnnouncementRead.announcement_id)
            .where(AnnouncementRead.student_id == student_id)
        )
        base_query = base_query.where(Announcement.id.in_(read_subquery))

    # Count total matching announcements
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total_count = total_result.scalar() or 0

    # Get paginated announcements with teacher info (eager load teacher and user)
    from app.models import Teacher
    announcements_query = (
        base_query
        .options(selectinload(Announcement.teacher).selectinload(Teacher.user))
        .order_by(Announcement.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(announcements_query)
    announcements = result.scalars().all()

    # Get read status for all announcements
    announcement_ids = [a.id for a in announcements]
    read_query = (
        select(AnnouncementRead)
        .where(
            AnnouncementRead.announcement_id.in_(announcement_ids),
            AnnouncementRead.student_id == student_id
        )
    )
    read_result = await db.execute(read_query)
    read_records = {r.announcement_id: r for r in read_result.scalars().all()}

    # Get unread count (total unread, not just this page)
    unread_query = (
        select(func.count(Announcement.id))
        .join(AnnouncementRecipient, Announcement.id == AnnouncementRecipient.announcement_id)
        .where(
            AnnouncementRecipient.student_id == student_id,
            Announcement.deleted_at.is_(None)
        )
    )
    read_subquery = (
        select(AnnouncementRead.announcement_id)
        .where(AnnouncementRead.student_id == student_id)
    )
    unread_query = unread_query.where(Announcement.id.notin_(read_subquery))
    unread_result = await db.execute(unread_query)
    unread_count = unread_result.scalar() or 0

    # Build response with read status
    announcement_list = []
    for announcement in announcements:
        read_record = read_records.get(announcement.id)
        announcement_list.append({
            "id": announcement.id,
            "teacher_id": announcement.teacher_id,
            "teacher_name": f"{announcement.teacher.user.full_name}" if announcement.teacher and announcement.teacher.user else "Unknown",
            "title": announcement.title,
            "content": announcement.content,
            "created_at": announcement.created_at,
            "is_read": read_record is not None,
            "read_at": read_record.read_at if read_record else None
        })

    return announcement_list, total_count, unread_count


async def mark_announcement_as_read(
    db: AsyncSession,
    announcement_id: uuid.UUID,
    student_id: uuid.UUID
) -> AnnouncementRead:
    """
    Mark announcement as read for a student.

    Creates a read record if it doesn't exist. Idempotent operation.

    Args:
        db: Database session
        announcement_id: UUID of the announcement
        student_id: UUID of the student

    Returns:
        AnnouncementRead record

    Raises:
        ValueError: If announcement doesn't exist or student is not a recipient
    """
    # Verify announcement exists and student is a recipient
    verify_query = (
        select(AnnouncementRecipient)
        .where(
            AnnouncementRecipient.announcement_id == announcement_id,
            AnnouncementRecipient.student_id == student_id
        )
    )
    verify_result = await db.execute(verify_query)
    if not verify_result.scalar_one_or_none():
        raise ValueError("Announcement not found or student is not a recipient")

    # Check if already read
    existing_query = (
        select(AnnouncementRead)
        .where(
            AnnouncementRead.announcement_id == announcement_id,
            AnnouncementRead.student_id == student_id
        )
    )
    existing_result = await db.execute(existing_query)
    existing_read = existing_result.scalar_one_or_none()

    if existing_read:
        return existing_read

    # Create read record
    read_record = AnnouncementRead(
        announcement_id=announcement_id,
        student_id=student_id,
        read_at=datetime.now(UTC)
    )
    db.add(read_record)

    # Also mark the associated notification as read
    # First get the student's user_id
    student_query = select(Student).where(Student.id == student_id)
    student_result = await db.execute(student_query)
    student = student_result.scalar_one_or_none()

    if student and student.user_id:
        # Find and mark the notification as read
        notification_query = (
            select(Notification)
            .where(
                Notification.user_id == student.user_id,
                Notification.type == NotificationType.announcement,
                Notification.link.contains(str(announcement_id)),
                Notification.is_read == False
            )
        )
        notification_result = await db.execute(notification_query)
        notification = notification_result.scalar_one_or_none()

        if notification:
            notification.is_read = True

    await db.commit()
    await db.refresh(read_record)

    return read_record


async def get_unread_announcement_count(
    db: AsyncSession,
    student_id: uuid.UUID
) -> int:
    """
    Get count of unread announcements for a student.

    Args:
        db: Database session
        student_id: UUID of the student

    Returns:
        Number of unread announcements
    """
    # Count announcements where student is recipient but no read record exists
    query = (
        select(func.count(Announcement.id))
        .join(AnnouncementRecipient, Announcement.id == AnnouncementRecipient.announcement_id)
        .where(
            AnnouncementRecipient.student_id == student_id,
            Announcement.deleted_at.is_(None)
        )
    )

    # Exclude announcements with read records
    read_subquery = (
        select(AnnouncementRead.announcement_id)
        .where(AnnouncementRead.student_id == student_id)
    )
    query = query.where(Announcement.id.notin_(read_subquery))

    result = await db.execute(query)
    return result.scalar() or 0
