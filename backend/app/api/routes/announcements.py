"""Announcement API endpoints - Story 26.1."""

import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import AsyncSessionDep, CurrentUser
from app.models import Student, Teacher, UserRole
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementDetail,
    AnnouncementListResponse,
    AnnouncementPublic,
    AnnouncementReadResponse,
    AnnouncementUpdate,
    StudentAnnouncementListResponse,
    StudentAnnouncementPublic,
)
from app.services import announcement_service
from sqlmodel import select

router = APIRouter(prefix="/announcements", tags=["announcements"])


async def require_student_role(current_user: CurrentUser) -> Student:
    """
    Verify current user is a student.

    Args:
        current_user: Current authenticated user

    Returns:
        Student object

    Raises:
        HTTPException: If user is not a student
    """
    if current_user.role != UserRole.student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this endpoint",
        )

    if not current_user.student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )

    return current_user.student


# =============================================================================
# Student-Facing Endpoints (Story 26.2) - Must be before /{announcement_id} routes
# =============================================================================


@router.get("/me", response_model=StudentAnnouncementListResponse)
async def get_my_announcements(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    limit: int = Query(20, ge=1, le=100, description="Maximum records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    filter: str = Query("all", regex="^(all|unread|read)$", description="Filter by read status"),
) -> StudentAnnouncementListResponse:
    """
    Get announcements for the current student.

    Supports filtering by read status and pagination.
    Returns announcements with read status and teacher information.
    """
    student = await require_student_role(current_user)

    announcements, total, unread_count = await announcement_service.get_student_announcements(
        db=db,
        student_id=student.id,
        limit=limit,
        offset=offset,
        filter_type=filter,
    )

    # Convert dict results to StudentAnnouncementPublic schemas
    announcement_publics = [
        StudentAnnouncementPublic(**announcement) for announcement in announcements
    ]

    return StudentAnnouncementListResponse(
        announcements=announcement_publics,
        total=total,
        unread_count=unread_count,
        limit=limit,
        offset=offset,
    )


async def require_teacher_role(current_user: CurrentUser) -> Teacher:
    """
    Verify current user is a teacher.

    Args:
        current_user: Current authenticated user

    Returns:
        Teacher object

    Raises:
        HTTPException: If user is not a teacher
    """
    if current_user.role != UserRole.teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can manage announcements",
        )

    if not current_user.teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile not found",
        )

    return current_user.teacher


@router.post("", response_model=AnnouncementPublic, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    announcement_data: AnnouncementCreate,
) -> AnnouncementPublic:
    """
    Create a new announcement and send to selected students/classrooms.

    Teachers can send announcements to:
    - Individual students from their classes
    - Entire classrooms they teach

    A notification is automatically created for each recipient.
    """
    teacher = await require_teacher_role(current_user)

    try:
        announcement = await announcement_service.create_announcement(
            db=db,
            teacher_id=teacher.id,
            title=announcement_data.title,
            content=announcement_data.content,
            recipient_student_ids=announcement_data.recipient_student_ids,
            recipient_classroom_ids=announcement_data.recipient_classroom_ids,
        )

        # Get recipient count
        recipient_count = await announcement_service.get_announcement_recipient_count(
            db=db,
            announcement_id=announcement.id
        )

        return AnnouncementPublic(
            id=announcement.id,
            teacher_id=announcement.teacher_id,
            title=announcement.title,
            content=announcement.content,
            recipient_count=recipient_count,
            read_count=0,  # New announcement, no reads yet
            created_at=announcement.created_at,
            updated_at=announcement.updated_at,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("", response_model=AnnouncementListResponse)
async def get_teacher_announcements(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum records to return"),
) -> AnnouncementListResponse:
    """
    Get paginated list of announcements created by the teacher.

    Returns non-deleted announcements ordered by creation date (newest first).
    """
    teacher = await require_teacher_role(current_user)

    announcements, total = await announcement_service.get_teacher_announcements(
        db=db,
        teacher_id=teacher.id,
        skip=skip,
        limit=limit,
    )

    # Build response with recipient counts
    announcement_publics = []
    for announcement in announcements:
        recipient_count = await announcement_service.get_announcement_recipient_count(
            db=db,
            announcement_id=announcement.id
        )

        announcement_publics.append(
            AnnouncementPublic(
                id=announcement.id,
                teacher_id=announcement.teacher_id,
                title=announcement.title,
                content=announcement.content,
                recipient_count=recipient_count,
                read_count=None,  # TODO: Implement read tracking in future story
                created_at=announcement.created_at,
                updated_at=announcement.updated_at,
            )
        )

    return AnnouncementListResponse(
        announcements=announcement_publics,
        total=total,
        limit=limit,
        offset=skip,
    )


@router.get("/{announcement_id}", response_model=AnnouncementDetail)
async def get_announcement_detail(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    announcement_id: uuid.UUID,
) -> AnnouncementDetail:
    """
    Get detailed information about a specific announcement.

    Includes recipient list.
    """
    teacher = await require_teacher_role(current_user)

    announcement = await announcement_service.get_announcement_by_id(
        db=db,
        announcement_id=announcement_id,
        teacher_id=teacher.id,
    )

    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found",
        )

    # Get recipient details
    recipient_count = await announcement_service.get_announcement_recipient_count(
        db=db,
        announcement_id=announcement.id
    )

    recipient_ids = await announcement_service.get_announcement_recipient_ids(
        db=db,
        announcement_id=announcement.id
    )

    return AnnouncementDetail(
        id=announcement.id,
        teacher_id=announcement.teacher_id,
        title=announcement.title,
        content=announcement.content,
        recipient_count=recipient_count,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at,
        recipient_ids=recipient_ids,
    )


@router.put("/{announcement_id}", response_model=AnnouncementPublic)
async def update_announcement(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    announcement_id: uuid.UUID,
    announcement_data: AnnouncementUpdate,
) -> AnnouncementPublic:
    """
    Update an existing announcement's title, content, and/or recipients.

    Recipients can be updated by providing new lists of student and classroom IDs.
    """
    teacher = await require_teacher_role(current_user)

    try:
        announcement = await announcement_service.update_announcement(
            db=db,
            announcement_id=announcement_id,
            teacher_id=teacher.id,
            title=announcement_data.title,
            content=announcement_data.content,
            recipient_student_ids=announcement_data.recipient_student_ids,
            recipient_classroom_ids=announcement_data.recipient_classroom_ids,
        )

        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found",
            )

        # Get recipient count
        recipient_count = await announcement_service.get_announcement_recipient_count(
            db=db,
            announcement_id=announcement.id
        )

        return AnnouncementPublic(
            id=announcement.id,
            teacher_id=announcement.teacher_id,
            title=announcement.title,
            content=announcement.content,
            recipient_count=recipient_count,
            read_count=None,
            created_at=announcement.created_at,
            updated_at=announcement.updated_at,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    announcement_id: uuid.UUID,
) -> None:
    """
    Soft delete an announcement.

    The announcement is marked as deleted but not removed from the database.
    """
    teacher = await require_teacher_role(current_user)

    deleted = await announcement_service.delete_announcement(
        db=db,
        announcement_id=announcement_id,
        teacher_id=teacher.id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found",
        )


@router.get("/{announcement_id}/student", response_model=StudentAnnouncementPublic)
async def get_announcement_as_student(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    announcement_id: uuid.UUID,
) -> StudentAnnouncementPublic:
    """
    Get announcement detail for a student.

    Returns announcement with read status for the current student.
    """
    from app.models import Announcement, AnnouncementRead, AnnouncementRecipient

    student = await require_student_role(current_user)

    # Verify student is a recipient and get announcement
    query = (
        select(Announcement)
        .join(AnnouncementRecipient, Announcement.id == AnnouncementRecipient.announcement_id)
        .where(
            Announcement.id == announcement_id,
            AnnouncementRecipient.student_id == student.id,
            Announcement.deleted_at.is_(None)
        )
    )

    result = await db.execute(query)
    announcement = result.scalar_one_or_none()

    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found or you are not a recipient",
        )

    # Get read status
    read_query = (
        select(AnnouncementRead)
        .where(
            AnnouncementRead.announcement_id == announcement_id,
            AnnouncementRead.student_id == student.id
        )
    )
    read_result = await db.execute(read_query)
    read_record = read_result.scalar_one_or_none()

    # Get teacher info
    teacher_query = select(Teacher).where(Teacher.id == announcement.teacher_id)
    teacher_result = await db.execute(teacher_query)
    teacher = teacher_result.scalar_one_or_none()

    return StudentAnnouncementPublic(
        id=announcement.id,
        teacher_id=announcement.teacher_id,
        teacher_name=f"{teacher.user.full_name}" if teacher and teacher.user else "Unknown",
        title=announcement.title,
        content=announcement.content,
        created_at=announcement.created_at,
        is_read=read_record is not None,
        read_at=read_record.read_at if read_record else None,
    )


@router.patch("/{announcement_id}/read", response_model=AnnouncementReadResponse)
async def mark_announcement_as_read(
    db: AsyncSessionDep,
    current_user: CurrentUser,
    announcement_id: uuid.UUID,
) -> AnnouncementReadResponse:
    """
    Mark announcement as read for the current student.

    Idempotent operation - can be called multiple times safely.
    """
    student = await require_student_role(current_user)

    try:
        read_record = await announcement_service.mark_announcement_as_read(
            db=db,
            announcement_id=announcement_id,
            student_id=student.id,
        )

        return AnnouncementReadResponse(
            announcement_id=read_record.announcement_id,
            is_read=True,
            read_at=read_record.read_at,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
