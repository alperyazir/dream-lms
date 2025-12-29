"""Message service for direct messaging between teachers and students - Story 6.3."""

import logging
import uuid
from datetime import UTC, datetime

import bleach
from sqlmodel import and_, case, func, or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    Assignment,
    AssignmentStudent,
    Class,
    ClassStudent,
    DirectMessage,
    NotificationType,
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
from app.services.notification_service import create_notification
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
    - Teacher: Can message students in their classes + all admins + all publishers
    - Student: Can only message teachers who have assigned them work

    Args:
        db: Database session
        user_id: UUID of the current user
        user_role: Role of the current user

    Returns:
        List of allowed recipients
    """
    recipients: list[RecipientPublic] = []

    if user_role == UserRole.admin:
        # Admins can message all teachers, publishers, and students
        query = (
            select(User.id, User.full_name, User.email, User.role, User.dcs_publisher_id)
            .where(
                User.role.in_([UserRole.teacher, UserRole.publisher, UserRole.student]),
                User.id != user_id,  # Exclude self
            )
        )
        result = await db.execute(query)
        rows = result.all()
        recipients = [
            RecipientPublic(
                user_id=row.id,
                name=row.full_name or row.email.split("@")[0],
                email=row.email,
                role=row.role.value,
                organization_name=None,  # Will be populated below for publishers
            )
            for row in rows
            if row.email is not None  # Filter out users without email
        ]

    elif user_role == UserRole.supervisor:
        # Supervisors can message all users (admin, publisher, teacher, student)
        query = (
            select(User.id, User.full_name, User.email, User.role, User.dcs_publisher_id)
            .where(
                User.role.in_([UserRole.admin, UserRole.publisher, UserRole.teacher, UserRole.student]),
                User.id != user_id,  # Exclude self
            )
        )
        result = await db.execute(query)
        rows = result.all()
        recipients = [
            RecipientPublic(
                user_id=row.id,
                name=row.full_name or row.email.split("@")[0],
                email=row.email,
                role=row.role.value,
                organization_name=None,  # Will be populated below for publishers
            )
            for row in rows
            if row.email is not None  # Filter out users without email
        ]

    elif user_role == UserRole.publisher:
        # Publishers can message all admins and all teachers
        query = (
            select(User.id, User.full_name, User.email, User.role, User.dcs_publisher_id)
            .where(
                User.role.in_([UserRole.admin, UserRole.teacher]),
                User.id != user_id,  # Exclude self
            )
        )
        result = await db.execute(query)
        rows = result.all()
        recipients = [
            RecipientPublic(
                user_id=row.id,
                name=row.full_name or row.email.split("@")[0],
                email=row.email,
                role=row.role.value,
                organization_name=None,  # Will be populated below for publishers
            )
            for row in rows
            if row.email is not None  # Filter out users without email
        ]

    elif user_role == UserRole.teacher:
        # Get teacher's ID
        teacher_query = select(Teacher.id).where(Teacher.user_id == user_id)
        teacher_result = await db.execute(teacher_query)
        teacher_id = teacher_result.scalar_one_or_none()

        # Teachers can message students in their classes
        if teacher_id:
            student_query = (
                select(User.id, User.full_name, User.email, User.role, User.dcs_publisher_id)
                .join(Student, Student.user_id == User.id)
                .join(ClassStudent, ClassStudent.student_id == Student.id)
                .join(Class, Class.id == ClassStudent.class_id)
                .where(Class.teacher_id == teacher_id)
                .distinct()
            )
            student_result = await db.execute(student_query)
            student_rows = student_result.all()
            recipients.extend([
                RecipientPublic(
                    user_id=row.id,
                    name=row.full_name or row.email.split("@")[0],
                    email=row.email,
                    role=row.role.value,
                    organization_name=None,  # Will be populated below for publishers
                )
                for row in student_rows
                if row.email is not None  # Filter out users without email
            ])

        # Teachers can also message admins and publishers
        admin_pub_query = (
            select(User.id, User.full_name, User.email, User.role, User.dcs_publisher_id)
            .where(
                User.role.in_([UserRole.admin, UserRole.publisher]),
                User.id != user_id,  # Exclude self
            )
        )
        admin_pub_result = await db.execute(admin_pub_query)
        admin_pub_rows = admin_pub_result.all()
        recipients.extend([
            RecipientPublic(
                user_id=row.id,
                name=row.full_name or row.email.split("@")[0],
                email=row.email,
                role=row.role.value,
                organization_name=None,  # Will be populated below for publishers
            )
            for row in admin_pub_rows
            if row.email is not None  # Filter out users without email
        ])

    elif user_role == UserRole.student:
        # Get student's ID
        student_query = select(Student.id).where(Student.user_id == user_id)
        student_result = await db.execute(student_query)
        student_id = student_result.scalar_one_or_none()

        if not student_id:
            return []

        # Students can only message teachers who have assigned them work
        query = (
            select(User.id, User.full_name, User.email, User.role, User.dcs_publisher_id)
            .join(Teacher, Teacher.user_id == User.id)
            .join(Assignment, Assignment.teacher_id == Teacher.id)
            .join(AssignmentStudent, AssignmentStudent.assignment_id == Assignment.id)
            .where(AssignmentStudent.student_id == student_id)
            .distinct()
        )
        result = await db.execute(query)
        rows = result.all()
        recipients = [
            RecipientPublic(
                user_id=row.id,
                name=row.full_name or row.email.split("@")[0],
                email=row.email,
                role=row.role.value,
                organization_name=None,  # Will be populated below for publishers
            )
            for row in rows
            if row.email is not None  # Filter out users without email
        ]

    # Enrich publisher recipients with organization names from DCS
    await _enrich_publisher_organization_names(db, recipients)

    return recipients


async def _enrich_publisher_organization_names(
    db: AsyncSession,
    recipients: list[RecipientPublic],
) -> None:
    """
    Enrich publisher recipients with organization names from DCS.

    Modifies recipients in-place.

    Args:
        db: Database session
        recipients: List of recipients to enrich
    """
    publisher_service = get_publisher_service()

    # Find all publisher recipients
    publisher_recipient_ids = [
        r.user_id for r in recipients if r.role == "publisher"
    ]

    if not publisher_recipient_ids:
        return

    # Fetch user data with dcs_publisher_id
    query = select(User.id, User.dcs_publisher_id).where(
        User.id.in_(publisher_recipient_ids)
    )
    result = await db.execute(query)
    user_publisher_map = {row.id: row.dcs_publisher_id for row in result.all()}

    # Fetch publisher names from DCS for each unique dcs_publisher_id
    for recipient in recipients:
        if recipient.role == "publisher":
            dcs_publisher_id = user_publisher_map.get(recipient.user_id)
            if dcs_publisher_id:
                try:
                    publisher = await publisher_service.get_publisher(dcs_publisher_id)
                    if publisher:
                        recipient.organization_name = publisher.name
                except Exception as e:
                    # Log but don't fail - organization name is optional
                    logger = logging.getLogger(__name__)
                    logger.warning(
                        f"Failed to fetch publisher {dcs_publisher_id} name: {e}"
                    )


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

    # Get sender's name for notification
    sender_query = select(User).where(User.id == sender_id)
    sender_result = await db.execute(sender_query)
    sender = sender_result.scalar_one_or_none()
    sender_name = sender.full_name or sender.email.split("@")[0] if sender else "Someone"

    # Create notification for recipient
    await create_notification(
        db=db,
        user_id=recipient_id,
        notification_type=NotificationType.message_received,
        title="New Message",
        message=f"You have a new message from {sender_name}",
        link=f"/messaging?user={sender_id}",
    )

    return message


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
        )
        .where(
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
        )
        .group_by(messages_with_partner.c.partner_id)
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
            User.email,
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
            participant_name=row.full_name or row.email.split("@")[0],
            participant_email=row.email,
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
            m for m in messages
            if m.recipient_id == user_id and not m.is_read
        ]
        for msg in unread_messages:
            msg.is_read = True
            db.add(msg)

        if unread_messages:
            await db.commit()

    # Convert to response format
    message_responses = []
    for msg in messages:
        if msg.sender_id == user_id:
            sender_name = current_user.full_name or current_user.email.split("@")[0]
            sender_email = current_user.email
            recipient_name = partner.full_name or partner.email.split("@")[0]
            recipient_email = partner.email
        else:
            sender_name = partner.full_name or partner.email.split("@")[0]
            sender_email = partner.email
            recipient_name = current_user.full_name or current_user.email.split("@")[0]
            recipient_email = current_user.email

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
