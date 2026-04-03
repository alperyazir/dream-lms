"""Message service for direct messaging between teachers and students - Story 6.3."""

import logging
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

import bleach

if TYPE_CHECKING:
    from arq import ArqRedis
from sqlmodel import and_, case, func, or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    Class,
    ClassStudent,
    DirectMessage,
    Student,
    Teacher,
    User,
    UserRole,
)
from app.schemas.message import (
    ConversationPublic,
    MessagePublic,
    RecipientPublic,
)
from app.services.cache_events import invalidate_for_event
from app.services.publisher_service_v2 import get_publisher_service

# HTML sanitization settings for XSS protection
ALLOWED_TAGS = ["p", "br", "strong", "em", "ul", "ol", "li", "b", "i"]
ALLOWED_ATTRS: dict = {}


def sanitize_message_body(body: str) -> str:
    """
    Sanitize message body to prevent XSS attacks.

    Args:
        body: Raw message body from user input

    Returns:
        Sanitized HTML-safe message body
    """
    return bleach.clean(body, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, strip=True)


async def get_allowed_recipients(
    db: AsyncSession,
    user_id: uuid.UUID,
    user_role: UserRole,
) -> list[RecipientPublic]:
    """
    Get list of allowed recipients for a user based on their role.

    Communication paths:
    - Admin: Can message all teachers, publishers, and students
    - Supervisor: Can message all users (admin, publisher, teacher, student)
    - Publisher: Can message all admins and all teachers
    - Teacher: Can message only students in their classes
    - Student: Can message only teachers of their classes

    Args:
        db: Database session
        user_id: UUID of the current user
        user_role: Role of the current user

    Returns:
        List of allowed recipients
    """

    def _to_recipient(row: Any) -> RecipientPublic:
        name = row.full_name or "Unknown"
        return RecipientPublic(
            user_id=row.id,
            name=name,
            email=None,
            role=row.role.value,
            organization_name=None,
        )

    recipients: list[RecipientPublic] = []

    if user_role == UserRole.admin:
        # Admins can message all teachers, publishers, and students
        query = select(User.id, User.full_name, User.role, User.dcs_publisher_id).where(
            User.role.in_([UserRole.teacher, UserRole.publisher, UserRole.student]),
            User.id != user_id,
        )
        result = await db.execute(query)
        recipients = [_to_recipient(row) for row in result.all()]

    elif user_role == UserRole.supervisor:
        # Supervisors can message all users (admin, publisher, teacher, student)
        query = select(User.id, User.full_name, User.role, User.dcs_publisher_id).where(
            User.role.in_(
                [UserRole.admin, UserRole.publisher, UserRole.teacher, UserRole.student]
            ),
            User.id != user_id,
        )
        result = await db.execute(query)
        recipients = [_to_recipient(row) for row in result.all()]

    elif user_role == UserRole.publisher:
        # Publishers can message all admins and all teachers
        query = select(User.id, User.full_name, User.role, User.dcs_publisher_id).where(
            User.role.in_([UserRole.admin, UserRole.teacher]),
            User.id != user_id,
        )
        result = await db.execute(query)
        recipients = [_to_recipient(row) for row in result.all()]

    elif user_role == UserRole.teacher:
        # Get teacher's ID
        teacher_query = select(Teacher.id).where(Teacher.user_id == user_id)
        teacher_result = await db.execute(teacher_query)
        teacher_id = teacher_result.scalar_one_or_none()

        # Teachers can only message students in their classes
        # Filter by teacher_id first, then join to students
        if teacher_id:
            student_query = (
                select(
                    User.id,
                    User.full_name,
                    User.role,
                    User.dcs_publisher_id,
                )
                .join(Student, Student.user_id == User.id)
                .join(ClassStudent, ClassStudent.student_id == Student.id)
                .join(
                    Class,
                    and_(
                        Class.id == ClassStudent.class_id,
                        Class.teacher_id == teacher_id,
                    ),
                )
                .distinct()
            )
            student_result = await db.execute(student_query)
            recipients.extend([_to_recipient(row) for row in student_result.all()])

    elif user_role == UserRole.student:
        # Get student's ID
        student_query = select(Student.id).where(Student.user_id == user_id)
        student_result = await db.execute(student_query)
        student_id = student_result.scalar_one_or_none()

        if not student_id:
            return []

        # Students can only message teachers of their classes
        # Start from ClassStudent filtered by student_id to use index
        query = (
            select(User.id, User.full_name, User.role, User.dcs_publisher_id)
            .select_from(ClassStudent)
            .where(ClassStudent.student_id == student_id)
            .join(Class, Class.id == ClassStudent.class_id)
            .join(Teacher, Teacher.id == Class.teacher_id)
            .join(User, User.id == Teacher.user_id)
            .distinct()
        )
        result = await db.execute(query)
        recipients = [_to_recipient(row) for row in result.all()]

    # Enrich publisher recipients with organization names from DCS
    await _enrich_publisher_organization_names(db, recipients)

    return recipients


async def _enrich_publisher_organization_names(
    db: AsyncSession,
    recipients: list[RecipientPublic],
) -> None:
    """
    Enrich publisher recipients with organization names from DCS.

    Modifies recipients in-place. Fetches all publishers concurrently.

    Args:
        db: Database session
        recipients: List of recipients to enrich
    """
    import asyncio

    publisher_service = get_publisher_service()

    # Find all publisher recipients
    publisher_recipient_ids = [r.user_id for r in recipients if r.role == "publisher"]

    if not publisher_recipient_ids:
        return

    # Fetch user data with dcs_publisher_id
    query = select(User.id, User.dcs_publisher_id).where(
        User.id.in_(publisher_recipient_ids)
    )
    result = await db.execute(query)
    user_publisher_map = {row.id: row.dcs_publisher_id for row in result.all()}

    # Batch-fetch all unique publisher names from DCS concurrently
    unique_dcs_ids = {pid for pid in user_publisher_map.values() if pid is not None}
    if not unique_dcs_ids:
        return

    logger = logging.getLogger(__name__)
    fetch_results = await asyncio.gather(
        *(publisher_service.get_publisher(pid) for pid in unique_dcs_ids),
        return_exceptions=True,
    )
    publisher_name_map: dict[int, str] = {}
    for dcs_id, result in zip(unique_dcs_ids, fetch_results, strict=False):
        if isinstance(result, BaseException):
            logger.warning(f"Failed to fetch publisher {dcs_id} name: {result}")
        elif result is not None:
            publisher_name_map[dcs_id] = result.name

    # Apply names to recipients
    for recipient in recipients:
        if recipient.role == "publisher":
            dcs_publisher_id = user_publisher_map.get(recipient.user_id)
            if dcs_publisher_id and dcs_publisher_id in publisher_name_map:
                recipient.organization_name = publisher_name_map[dcs_publisher_id]


async def validate_recipient(
    db: AsyncSession,
    sender_id: uuid.UUID,
    sender_role: UserRole,
    recipient_id: uuid.UUID,
) -> bool:
    """
    Validate that the sender is allowed to message the recipient.

    Args:
        db: Database session
        sender_id: UUID of the sender
        sender_role: Role of the sender
        recipient_id: UUID of the recipient

    Returns:
        True if messaging is allowed, False otherwise
    """
    allowed_recipients = await get_allowed_recipients(db, sender_id, sender_role)
    return any(r.user_id == recipient_id for r in allowed_recipients)


async def create_message(
    db: AsyncSession,
    sender_id: uuid.UUID,
    recipient_id: uuid.UUID,
    body: str,
    subject: str | None = None,
    parent_message_id: uuid.UUID | None = None,
) -> DirectMessage:
    """
    Create a new direct message and send notification to recipient.

    Args:
        db: Database session
        sender_id: UUID of the sender
        recipient_id: UUID of the recipient
        body: Message body (will be sanitized)
        subject: Optional message subject
        parent_message_id: Optional parent message ID for threading

    Returns:
        Created DirectMessage object
    """
    # Sanitize the message body for XSS protection
    sanitized_body = sanitize_message_body(body)

    message = DirectMessage(
        sender_id=sender_id,
        recipient_id=recipient_id,
        subject=subject[:500] if subject else None,
        body=sanitized_body,
        parent_message_id=parent_message_id,
        is_read=False,
        sent_at=datetime.now(UTC),
    )

    db.add(message)
    await db.commit()
    await db.refresh(message)

    # Invalidate message cache for both parties
    await invalidate_for_event(
        "message_sent",
        sender_id=str(sender_id),
        recipient_id=str(recipient_id),
    )

    return message


async def create_system_message(
    db: AsyncSession,
    sender_id: uuid.UUID,
    recipient_id: uuid.UUID,
    body: str,
    subject: str | None = None,
    context_type: str | None = None,
    context_id: uuid.UUID | None = None,
    message_category: str | None = None,
) -> DirectMessage:
    """Create a system-generated message (no recipient validation, no notification)."""
    message = DirectMessage(
        sender_id=sender_id,
        recipient_id=recipient_id,
        subject=subject[:500] if subject else None,
        body=body,
        is_read=False,
        sent_at=datetime.now(UTC),
        is_system=True,
        context_type=context_type,
        context_id=context_id,
        message_category=message_category,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    await invalidate_for_event(
        "message_sent",
        sender_id=str(sender_id),
        recipient_id=str(recipient_id),
    )

    return message


async def create_system_messages_bulk(
    db: AsyncSession,
    sender_id: uuid.UUID,
    recipient_ids: list[uuid.UUID],
    body: str,
    subject: str | None = None,
    context_type: str | None = None,
    context_id: uuid.UUID | None = None,
    message_category: str | None = None,
) -> int:
    """Create system messages for multiple recipients in a single batch insert."""
    if not recipient_ids:
        return 0

    now = datetime.now(UTC)
    truncated_subject = subject[:500] if subject else None

    messages = [
        DirectMessage(
            sender_id=sender_id,
            recipient_id=rid,
            subject=truncated_subject,
            body=body,
            is_read=False,
            sent_at=now,
            is_system=True,
            context_type=context_type,
            context_id=context_id,
            message_category=message_category,
        )
        for rid in recipient_ids
    ]
    db.add_all(messages)
    await db.commit()

    # Invalidate cache for all recipients
    for rid in recipient_ids:
        await invalidate_for_event(
            "message_sent",
            sender_id=str(sender_id),
            recipient_id=str(rid),
        )

    return len(messages)


async def enqueue_system_message(
    arq_pool: "ArqRedis",
    sender_id: uuid.UUID,
    recipient_id: uuid.UUID,
    body: str,
    subject: str | None = None,
    context_type: str | None = None,
    context_id: uuid.UUID | None = None,
    message_category: str | None = None,
) -> None:
    """Enqueue a system message for background creation via arq worker."""
    await arq_pool.enqueue_job(
        "task_create_system_message",
        str(sender_id),
        str(recipient_id),
        body,
        subject=subject,
        context_type=context_type,
        context_id=str(context_id) if context_id else None,
        message_category=message_category,
    )


async def enqueue_system_messages_bulk(
    arq_pool: "ArqRedis",
    sender_id: uuid.UUID,
    recipient_ids: list[uuid.UUID],
    body: str,
    subject: str | None = None,
    context_type: str | None = None,
    context_id: uuid.UUID | None = None,
    message_category: str | None = None,
) -> None:
    """Enqueue bulk system messages for background creation via arq worker."""
    await arq_pool.enqueue_job(
        "task_create_system_messages_bulk",
        str(sender_id),
        [str(r) for r in recipient_ids],
        body,
        subject=subject,
        context_type=context_type,
        context_id=str(context_id) if context_id else None,
        message_category=message_category,
    )


async def get_conversations(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[ConversationPublic], int, int]:
    """
    Get list of conversations for a user, grouped by conversation partner.

    Args:
        db: Database session
        user_id: UUID of the current user
        limit: Maximum number of conversations to return
        offset: Number of conversations to skip

    Returns:
        Tuple of (list of conversations, total count, total unread count)
    """
    # Subquery to get the partner ID for each message
    partner_id_case = case(
        (DirectMessage.sender_id == user_id, DirectMessage.recipient_id),
        else_=DirectMessage.sender_id,
    )

    # Get all messages involving this user with partner info
    messages_with_partner = (
        select(
            partner_id_case.label("partner_id"),
            DirectMessage.body,
            DirectMessage.sent_at,
            DirectMessage.is_read,
            DirectMessage.sender_id,
        ).where(
            or_(
                DirectMessage.sender_id == user_id,
                DirectMessage.recipient_id == user_id,
            )
        )
    ).subquery()

    # Get latest message per partner
    latest_per_partner = (
        select(
            messages_with_partner.c.partner_id,
            func.max(messages_with_partner.c.sent_at).label("max_sent_at"),
        ).group_by(messages_with_partner.c.partner_id)
    ).subquery()

    # Get unread count per partner (messages received from partner that are unread)
    unread_counts = (
        select(
            DirectMessage.sender_id.label("partner_id"),
            func.count(DirectMessage.id).label("unread_count"),
        )
        .where(
            and_(
                DirectMessage.recipient_id == user_id,
                DirectMessage.is_read == False,  # noqa: E712
            )
        )
        .group_by(DirectMessage.sender_id)
    ).subquery()

    # Total unread count
    total_unread_query = select(func.count(DirectMessage.id)).where(
        and_(
            DirectMessage.recipient_id == user_id,
            DirectMessage.is_read == False,  # noqa: E712
        )
    )
    total_unread_result = await db.execute(total_unread_query)
    total_unread = total_unread_result.scalar() or 0

    # Count total unique conversation partners
    count_query = select(func.count(func.distinct(latest_per_partner.c.partner_id)))
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Main query: join with user info and latest message
    query = (
        select(
            latest_per_partner.c.partner_id,
            User.full_name,
            User.role,
            DirectMessage.body.label("last_message"),
            latest_per_partner.c.max_sent_at,
            func.coalesce(unread_counts.c.unread_count, 0).label("unread_count"),
        )
        .join(User, User.id == latest_per_partner.c.partner_id)
        .join(
            DirectMessage,
            and_(
                or_(
                    and_(
                        DirectMessage.sender_id == user_id,
                        DirectMessage.recipient_id == latest_per_partner.c.partner_id,
                    ),
                    and_(
                        DirectMessage.sender_id == latest_per_partner.c.partner_id,
                        DirectMessage.recipient_id == user_id,
                    ),
                ),
                DirectMessage.sent_at == latest_per_partner.c.max_sent_at,
            ),
        )
        .outerjoin(
            unread_counts,
            unread_counts.c.partner_id == latest_per_partner.c.partner_id,
        )
        .order_by(latest_per_partner.c.max_sent_at.desc())
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    conversations = [
        ConversationPublic(
            participant_id=row.partner_id,
            participant_name=row.full_name or "Unknown",
            participant_email=None,
            participant_role=row.role.value,
            last_message_preview=row.last_message[:100] if row.last_message else "",
            last_message_timestamp=row.max_sent_at,
            unread_count=row.unread_count,
        )
        for row in rows
    ]

    return conversations, total, total_unread


async def get_thread(
    db: AsyncSession,
    user_id: uuid.UUID,
    partner_id: uuid.UUID,
    mark_as_read: bool = True,
) -> tuple[list[MessagePublic], User | None]:
    """
    Get all messages in a conversation thread between two users.

    Args:
        db: Database session
        user_id: UUID of the current user
        partner_id: UUID of the conversation partner
        mark_as_read: Whether to mark received messages as read

    Returns:
        Tuple of (list of messages, partner User object)
    """
    # Get partner info
    partner_query = select(User).where(User.id == partner_id)
    partner_result = await db.execute(partner_query)
    partner = partner_result.scalar_one_or_none()

    if not partner:
        return [], None

    # Get current user info
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    current_user = user_result.scalar_one_or_none()

    if not current_user:
        return [], partner

    # Get all messages between the two users
    query = (
        select(DirectMessage)
        .where(
            or_(
                and_(
                    DirectMessage.sender_id == user_id,
                    DirectMessage.recipient_id == partner_id,
                ),
                and_(
                    DirectMessage.sender_id == partner_id,
                    DirectMessage.recipient_id == user_id,
                ),
            )
        )
        .order_by(DirectMessage.sent_at.asc())
    )

    result = await db.execute(query)
    messages = list(result.scalars().all())

    # Mark unread messages as read
    if mark_as_read:
        unread_messages = [
            m for m in messages if m.recipient_id == user_id and not m.is_read
        ]
        for msg in unread_messages:
            msg.is_read = True
            db.add(msg)

        if unread_messages:
            await db.commit()

    def _name(u: User) -> str:
        return u.full_name or u.username or "Unknown"

    # Convert to response format
    message_responses = []
    for msg in messages:
        if msg.sender_id == user_id:
            sender_name = _name(current_user)
            sender_email = None
            recipient_name = _name(partner)
            recipient_email = None
        else:
            sender_name = _name(partner)
            sender_email = None
            recipient_name = _name(current_user)
            recipient_email = None

        message_responses.append(
            MessagePublic(
                id=msg.id,
                sender_id=msg.sender_id,
                sender_name=sender_name,
                sender_email=sender_email,
                recipient_id=msg.recipient_id,
                recipient_name=recipient_name,
                recipient_email=recipient_email,
                subject=msg.subject,
                body=msg.body,
                parent_message_id=msg.parent_message_id,
                is_read=msg.is_read,
                sent_at=msg.sent_at,
                is_system=msg.is_system,
                context_type=msg.context_type,
                context_id=msg.context_id,
                message_category=msg.message_category,
            )
        )

    return message_responses, partner


async def mark_message_as_read(
    db: AsyncSession,
    message_id: uuid.UUID,
    user_id: uuid.UUID,
) -> DirectMessage | None:
    """
    Mark a specific message as read.

    Args:
        db: Database session
        message_id: UUID of the message
        user_id: UUID of the user (must be recipient)

    Returns:
        Updated DirectMessage or None if not found/not authorized
    """
    query = select(DirectMessage).where(
        DirectMessage.id == message_id,
        DirectMessage.recipient_id == user_id,
    )

    result = await db.execute(query)
    message = result.scalar_one_or_none()

    if message:
        message.is_read = True
        db.add(message)
        await db.commit()
        await db.refresh(message)

    return message


async def get_unread_messages_count(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> int:
    """
    Get count of unread messages for a user.

    Args:
        db: Database session
        user_id: UUID of the user

    Returns:
        Count of unread messages
    """
    query = select(func.count(DirectMessage.id)).where(
        DirectMessage.recipient_id == user_id,
        DirectMessage.is_read == False,  # noqa: E712
    )

    result = await db.execute(query)
    return result.scalar() or 0
