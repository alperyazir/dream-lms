"""Direct Message API endpoints - Story 6.3."""

import logging
import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import AsyncSessionDep, CurrentUser
from app.models import Class, ClassStudent, Student, User, UserRole
from app.schemas.message import (
    BroadcastCreate,
    BroadcastResponse,
    ConversationListResponse,
    MessageCreate,
    MessagePublic,
    MessageReadResponse,
    MessageThreadResponse,
    RecipientListResponse,
    UnreadMessagesCountResponse,
)
from app.services import message_service
from app.services.cache_events import invalidate_for_event
from app.services.redis_cache import cache_get, cache_invalidate_pattern, cache_set

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/messages", tags=["messages"])


# Roles allowed to use messaging
MESSAGING_ROLES = [UserRole.admin, UserRole.supervisor, UserRole.publisher, UserRole.teacher, UserRole.student]


@router.post("", response_model=MessagePublic, status_code=status.HTTP_201_CREATED)
async def send_message(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    message_data: MessageCreate,
) -> MessagePublic:
    """
    Send a new direct message to a recipient.

    Communication paths:
    - Teachers <-> Students (in their classes/assignments)
    - Teachers <-> Admins
    - Teachers <-> Publishers
    - Publishers <-> Admins
    """
    # Validate user can use messaging
    if current_user.role not in MESSAGING_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to use direct messaging",
        )

    # Prevent self-messaging
    if message_data.recipient_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send message to yourself",
        )

    # Validate recipient exists
    recipient_query = select(User).where(User.id == message_data.recipient_id)
    recipient_result = await db.execute(recipient_query)
    recipient = recipient_result.scalar_one_or_none()

    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient not found",
        )

    # Validate sender is allowed to message recipient (privacy controls)
    is_allowed = await message_service.validate_recipient(
        db=db,
        sender_id=current_user.id,
        sender_role=current_user.role,
        recipient_id=message_data.recipient_id,
    )

    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to message this user",
        )

    # Create the message
    message = await message_service.create_message(
        db=db,
        sender_id=current_user.id,
        recipient_id=message_data.recipient_id,
        body=message_data.body,
        subject=message_data.subject,
        parent_message_id=message_data.parent_message_id,
    )

    # Get names for response
    sender_name = current_user.full_name or (current_user.email.split("@")[0] if current_user.email else current_user.username or "Unknown")
    recipient_name = recipient.full_name or (recipient.email.split("@")[0] if recipient.email else recipient.username or "Unknown")

    await invalidate_for_event(
        "message_sent",
        sender_id=str(current_user.id),
        recipient_id=str(message_data.recipient_id),
    )

    return MessagePublic(
        id=message.id,
        sender_id=message.sender_id,
        sender_name=sender_name,
        sender_email=current_user.email,
        recipient_id=message.recipient_id,
        recipient_name=recipient_name,
        recipient_email=recipient.email,
        subject=message.subject,
        body=message.body,
        parent_message_id=message.parent_message_id,
        is_read=message.is_read,
        sent_at=message.sent_at,
    )


@router.post("/broadcast", response_model=BroadcastResponse, status_code=status.HTTP_201_CREATED)
async def broadcast_to_class(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    data: BroadcastCreate,
) -> BroadcastResponse:
    """
    Send a message to all students in a class.
    Only teachers who own the class can broadcast.
    """
    if current_user.role != UserRole.teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can broadcast messages to a class",
        )

    # Verify teacher owns this class
    from app.models import Teacher
    teacher_result = await db.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = teacher_result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")

    class_result = await db.execute(
        select(Class).where(Class.id == data.class_id, Class.teacher_id == teacher.id, Class.is_active == True)
    )
    cls = class_result.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found or not owned by you")

    # Get all students in the class
    students_result = await db.execute(
        select(Student)
        .join(ClassStudent, ClassStudent.student_id == Student.id)
        .where(ClassStudent.class_id == data.class_id)
    )
    students = students_result.scalars().all()

    if not students:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No students enrolled in this class")

    sent_count = 0
    for student in students:
        if not student.user_id:
            continue
        try:
            await message_service.create_message(
                db=db,
                sender_id=current_user.id,
                recipient_id=student.user_id,
                body=data.body,
            )
            sent_count += 1
        except Exception as e:
            logger.warning(f"Failed to send broadcast to student {student.id}: {e}")

    await db.commit()

    # Invalidate caches
    await invalidate_for_event("message_sent", sender_id=str(current_user.id))

    return BroadcastResponse(sent_count=sent_count, class_name=cls.name)


@router.get("/conversations", response_model=ConversationListResponse)
async def get_conversations(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    limit: int = Query(20, ge=1, le=100, description="Number of conversations to return"),
    offset: int = Query(0, ge=0, description="Number of conversations to skip"),
) -> ConversationListResponse:
    """
    Get list of conversations for the current user.

    Returns conversations grouped by participant with last message preview
    and unread count.
    """
    if current_user.role not in MESSAGING_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to use direct messaging",
        )

    # Redis cache (20s TTL) — conversations list
    cache_key = f"user:{current_user.id}:conversations:{limit}:{offset}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return ConversationListResponse(**cached)

    conversations, total, total_unread = await message_service.get_conversations(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )

    result = ConversationListResponse(
        conversations=conversations,
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(conversations) < total,
        total_unread=total_unread,
    )
    await cache_set(cache_key, result.model_dump(), ttl=3600)
    return result


@router.get("/thread/{partner_id}", response_model=MessageThreadResponse)
async def get_message_thread(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    partner_id: uuid.UUID,
) -> MessageThreadResponse:
    """
    Get all messages in a conversation thread with a specific user.

    Messages are returned in chronological order (oldest first).
    Unread messages received by the current user are automatically marked as read.
    """
    if current_user.role not in MESSAGING_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to use direct messaging",
        )

    messages, partner = await message_service.get_thread(
        db=db,
        user_id=current_user.id,
        partner_id=partner_id,
        mark_as_read=True,
    )

    # Invalidate conversations and unread count cache so UI reflects read status
    await cache_invalidate_pattern(f"user:{current_user.id}:conversations:*")
    await cache_invalidate_pattern(f"user:{current_user.id}:unread_count")

    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Fetch organization name for publisher partners
    participant_organization_name = None
    if partner.role == UserRole.publisher and partner.dcs_publisher_id:
        from app.services.publisher_service_v2 import get_publisher_service
        publisher_service = get_publisher_service()
        try:
            publisher = await publisher_service.get_publisher(partner.dcs_publisher_id)
            if publisher:
                participant_organization_name = publisher.name
        except Exception:
            # Silently fail - organization name is optional
            pass

    return MessageThreadResponse(
        participant_id=partner.id,
        participant_name=partner.full_name or (partner.email.split("@")[0] if partner.email else partner.username or "Unknown"),
        participant_email=partner.email,
        participant_role=partner.role.value,
        participant_organization_name=participant_organization_name,
        messages=messages,
        total_messages=len(messages),
    )


@router.patch("/{message_id}/read", response_model=MessageReadResponse)
async def mark_message_as_read(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    message_id: uuid.UUID,
) -> MessageReadResponse:
    """
    Mark a specific message as read.

    Only the recipient of the message can mark it as read.
    """
    message = await message_service.mark_message_as_read(
        db=db,
        message_id=message_id,
        user_id=current_user.id,
    )

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or you are not the recipient",
        )

    await invalidate_for_event("message_read", user_id=str(current_user.id))

    return MessageReadResponse(id=message.id, is_read=message.is_read)


@router.get("/recipients", response_model=RecipientListResponse)
async def get_allowed_recipients(
    db: AsyncSessionDep,
    current_user: CurrentUser,
) -> RecipientListResponse:
    """
    Get list of users that the current user is allowed to message.

    - Admins: All teachers, publishers, and students
    - Supervisors: All users
    - Publishers: All admins and teachers
    - Teachers: Only students in their classes
    - Students: Only teachers of their classes
    """
    if current_user.role not in MESSAGING_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to use direct messaging",
        )

    # Cache recipients list (changes rarely — class enrollment, new users)
    cache_key = f"user:{current_user.id}:recipients"
    cached = await cache_get(cache_key)
    if cached is not None:
        return RecipientListResponse(**cached)

    recipients = await message_service.get_allowed_recipients(
        db=db,
        user_id=current_user.id,
        user_role=current_user.role,
    )

    result = RecipientListResponse(
        recipients=recipients,
        total=len(recipients),
    )
    await cache_set(cache_key, result.model_dump(), ttl=600)
    return result


@router.get("/unread-count", response_model=UnreadMessagesCountResponse)
async def get_unread_messages_count(
    db: AsyncSessionDep,
    current_user: CurrentUser,
) -> UnreadMessagesCountResponse:
    """
    Get count of unread messages for the current user.

    Useful for displaying badge count on navigation.
    """
    # Short TTL cache — polled frequently from navbar
    cache_key = f"user:{current_user.id}:unread_count"
    cached = await cache_get(cache_key)
    if cached is not None:
        return UnreadMessagesCountResponse(**cached)

    count = await message_service.get_unread_messages_count(
        db=db,
        user_id=current_user.id,
    )

    result = UnreadMessagesCountResponse(count=count)
    await cache_set(cache_key, result.model_dump(), ttl=30)
    return result
