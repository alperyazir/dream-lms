"""Direct Message API endpoints - Story 6.3."""

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import AsyncSessionDep, CurrentUser
from app.models import User, UserRole
from app.schemas.message import (
    ConversationListResponse,
    MessageCreate,
    MessagePublic,
    MessageReadResponse,
    MessageThreadResponse,
    RecipientListResponse,
    UnreadMessagesCountResponse,
)
from app.services import message_service

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
    sender_name = current_user.full_name or current_user.email.split("@")[0]
    recipient_name = recipient.full_name or recipient.email.split("@")[0]

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

    conversations, total, total_unread = await message_service.get_conversations(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )

    return ConversationListResponse(
        conversations=conversations,
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(conversations) < total,
        total_unread=total_unread,
    )


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
        participant_name=partner.full_name or partner.email.split("@")[0],
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

    return MessageReadResponse(id=message.id, is_read=message.is_read)


@router.get("/recipients", response_model=RecipientListResponse)
async def get_allowed_recipients(
    db: AsyncSessionDep,
    current_user: CurrentUser,
) -> RecipientListResponse:
    """
    Get list of users that the current user is allowed to message.

    - Admins: All teachers, all publishers
    - Publishers: All admins, all teachers
    - Teachers: Students in their classes, all admins, all publishers
    - Students: Teachers who have assigned them work
    """
    if current_user.role not in MESSAGING_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to use direct messaging",
        )

    recipients = await message_service.get_allowed_recipients(
        db=db,
        user_id=current_user.id,
        user_role=current_user.role,
    )

    return RecipientListResponse(
        recipients=recipients,
        total=len(recipients),
    )


@router.get("/unread-count", response_model=UnreadMessagesCountResponse)
async def get_unread_messages_count(
    db: AsyncSessionDep,
    current_user: CurrentUser,
) -> UnreadMessagesCountResponse:
    """
    Get count of unread messages for the current user.

    Useful for displaying badge count on navigation.
    """
    count = await message_service.get_unread_messages_count(
        db=db,
        user_id=current_user.id,
    )

    return UnreadMessagesCountResponse(count=count)
