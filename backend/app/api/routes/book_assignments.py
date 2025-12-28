"""Book Assignment API endpoints - Story 9.4.

Restored for admin/supervisor use after Epic 25 publisher role deprecation.
"""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import AsyncSessionDep, require_role
from app.models import (
    BookAssignment,
    BookAssignmentCreate,
    BookAssignmentListResponse,
    BookAssignmentPublic,
    BookAssignmentResponse,
    BulkBookAssignmentCreate,
    School,
    Teacher,
    User,
    UserRole,
)
from app.services import book_assignment_service
from app.services.book_service_v2 import get_book_service

router = APIRouter(prefix="/book-assignments", tags=["book-assignments"])


@router.post(
    "",
    response_model=BookAssignmentPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create book assignment",
    description="DEPRECATED: Assign a book to a school or teacher. Publisher only.",
)
async def create_book_assignment(
    *,
    db: AsyncSessionDep,
    assignment_in: BookAssignmentCreate,
    current_user: User = require_role(UserRole.publisher),
) -> Any:
    """
    DEPRECATED: Publisher role is deprecated - publishers managed in Dream Central Storage.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Publisher role is deprecated. Publishers are now managed in Dream Central Storage."
    )


@router.post(
    "/bulk",
    response_model=list[BookAssignmentPublic],
    status_code=status.HTTP_201_CREATED,
    summary="Create bulk book assignments",
    description="Assign a book to multiple teachers. Admin/Supervisor/Publisher.",
)
async def create_bulk_book_assignments(
    *,
    db: AsyncSessionDep,
    bulk_in: BulkBookAssignmentCreate,
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher),
) -> list[BookAssignmentPublic]:
    """
    Create bulk book assignments for multiple teachers.

    Admin/Supervisor can assign any book to any teachers in any school.
    Publisher can only assign books to teachers in their schools.
    """
    # Validate publisher permissions
    if current_user.role == UserRole.publisher:
        if current_user.dcs_publisher_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Publisher account not linked to DCS publisher"
            )

        # Verify the school belongs to this publisher
        school_result = await db.execute(
            select(School).where(School.id == bulk_in.school_id)
        )
        school = school_result.scalar_one_or_none()

        if not school:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )

        if school.dcs_publisher_id != current_user.dcs_publisher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot assign books to teachers in schools not managed by your publisher"
            )

        # If specific teachers provided, verify they belong to publisher's schools
        if bulk_in.teacher_ids:
            for teacher_id in bulk_in.teacher_ids:
                teacher_result = await db.execute(
                    select(Teacher).where(Teacher.id == teacher_id)
                )
                teacher = teacher_result.scalar_one_or_none()

                if not teacher:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Teacher {teacher_id} not found"
                    )

                # Verify teacher's school belongs to this publisher
                teacher_school_result = await db.execute(
                    select(School).where(School.id == teacher.school_id)
                )
                teacher_school = teacher_school_result.scalar_one_or_none()

                if not teacher_school or teacher_school.dcs_publisher_id != current_user.dcs_publisher_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Cannot assign to teacher {teacher_id} - not in your publisher's schools"
                    )

    assignments = await book_assignment_service.create_bulk_assignments(
        db=db,
        book_id=bulk_in.book_id,
        school_id=bulk_in.school_id,
        assigned_by=current_user.id,
        teacher_ids=bulk_in.teacher_ids if bulk_in.teacher_ids else None,
        assign_to_all=bulk_in.assign_to_all if hasattr(bulk_in, 'assign_to_all') else False,
    )

    # Convert to BookAssignmentPublic, mapping dcs_book_id to book_id
    return [
        BookAssignmentPublic(
            id=a.id,
            book_id=a.dcs_book_id,
            school_id=a.school_id,
            teacher_id=a.teacher_id,
            assigned_by=a.assigned_by,
            assigned_at=a.assigned_at,
        )
        for a in assignments
    ]


@router.get(
    "",
    response_model=BookAssignmentListResponse,
    summary="List book assignments",
    description="DEPRECATED: List all book assignments for the publisher's books. Publisher only.",
)
async def list_book_assignments(
    *,
    db: AsyncSessionDep,
    current_user: User = require_role(UserRole.publisher),
    book_id: uuid.UUID | None = None,
    school_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    DEPRECATED: Publisher role is deprecated - publishers managed in Dream Central Storage.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Publisher role is deprecated. Publishers are now managed in Dream Central Storage."
    )


@router.delete(
    "/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete book assignment",
    description="Remove a book assignment. Admin/Supervisor/Publisher.",
)
async def delete_book_assignment(
    *,
    db: AsyncSessionDep,
    assignment_id: uuid.UUID,
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher),
) -> None:
    """
    Delete a book assignment.

    Admin/Supervisor can remove any book assignment.
    Publisher can only remove assignments for teachers in their schools.
    """
    # Find the assignment
    result = await db.execute(
        select(BookAssignment).where(BookAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book assignment not found",
        )

    # Validate publisher permissions
    if current_user.role == UserRole.publisher:
        if current_user.dcs_publisher_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Publisher account not linked to DCS publisher"
            )

        # Verify the assignment's school belongs to this publisher
        school_result = await db.execute(
            select(School).where(School.id == assignment.school_id)
        )
        school = school_result.scalar_one_or_none()

        if not school or school.dcs_publisher_id != current_user.dcs_publisher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete assignments for teachers not in your publisher's schools"
            )

    # Delete the assignment
    await db.delete(assignment)
    await db.commit()

    return None


@router.get(
    "/book/{book_id}",
    response_model=list[BookAssignmentResponse],
    summary="Get assignments for a book",
    description="Get all assignments for a book. Admin/Supervisor see all, Publishers see their schools only.",
)
async def get_book_assignments(
    *,
    db: AsyncSessionDep,
    book_id: int,
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher),
) -> list[BookAssignmentResponse]:
    """
    Get all assignments for a specific book.

    - Admin/Supervisor: See all assignments
    - Publisher: See assignments for their schools only

    Returns list of assignments with complete book, school, and teacher information.
    """
    # Get book service
    book_service = get_book_service()

    # Fetch book data from DCS
    book = await book_service.get_book(book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID {book_id} not found",
        )

    # Get assignments for this book
    assignments = await book_assignment_service.get_existing_assignments_for_book(
        db=db,
        book_id=book_id,
    )

    # Filter for publishers - only show assignments for their schools
    if current_user.role == UserRole.publisher:
        if current_user.dcs_publisher_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Publisher account not linked to DCS publisher"
            )

        # Get publisher's school IDs
        publisher_schools = await db.execute(
            select(School.id).where(School.dcs_publisher_id == current_user.dcs_publisher_id)
        )
        school_ids = set(publisher_schools.scalars().all())

        # Filter assignments to publisher's schools only
        assignments = [a for a in assignments if a.school_id in school_ids]

    # Build response with complete information
    result = []
    for assignment in assignments:
        teacher_name = None
        teacher_email = None
        school_name = None

        # Load teacher info
        if assignment.teacher_id:
            teacher_result = await db.execute(
                select(Teacher)
                .options(selectinload(Teacher.user))
                .where(Teacher.id == assignment.teacher_id)
            )
            teacher = teacher_result.scalar_one_or_none()
            if teacher and teacher.user:
                teacher_name = teacher.user.full_name
                teacher_email = teacher.user.email

        # Load school info
        if assignment.school_id:
            school_result = await db.execute(
                select(School).where(School.id == assignment.school_id)
            )
            school = school_result.scalar_one_or_none()
            if school:
                school_name = school.name

        result.append(
            BookAssignmentResponse(
                id=assignment.id,
                book_id=assignment.dcs_book_id,
                book_title=book.title,
                book_cover_url=book.cover_url,
                school_id=assignment.school_id,
                school_name=school_name,
                teacher_id=assignment.teacher_id,
                teacher_name=teacher_name,
                teacher_email=teacher_email,
                assigned_by=assignment.assigned_by,
                assigned_at=assignment.assigned_at,
            )
        )

    return result
