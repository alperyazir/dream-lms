"""Book Assignment API endpoints - Story 9.4."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import AsyncSessionDep, require_role
from app.models import (
    Book,
    BookAssignment,
    BookAssignmentCreate,
    BookAssignmentListResponse,
    BookAssignmentPublic,
    BookAssignmentResponse,
    BulkBookAssignmentCreate,
    Publisher,
    School,
    Teacher,
    User,
    UserRole,
)
from app.services import book_assignment_service

router = APIRouter(prefix="/book-assignments", tags=["book-assignments"])


@router.post(
    "",
    response_model=BookAssignmentPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create book assignment",
    description="Assign a book to a school or teacher. Publisher only.",
)
async def create_book_assignment(
    *,
    db: AsyncSessionDep,
    assignment_in: BookAssignmentCreate,
    current_user: User = require_role(UserRole.publisher),
) -> Any:
    """
    Create a new book assignment.

    - Publisher can assign books they own to schools/teachers
    - Assignment can be at school level (all teachers get access) or individual teacher
    """
    # Get publisher record
    result = await db.execute(
        select(Publisher).where(Publisher.user_id == current_user.id)
    )
    publisher = result.scalar_one_or_none()
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher record not found",
        )

    # Verify publisher owns the book
    book_result = await db.execute(
        select(Book).where(Book.id == assignment_in.book_id)
    )
    book = book_result.scalar_one_or_none()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    if book.publisher_id != publisher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only assign books you own",
        )

    # Verify school belongs to publisher (if school_id provided)
    if assignment_in.school_id:
        school_result = await db.execute(
            select(School).where(School.id == assignment_in.school_id)
        )
        school = school_result.scalar_one_or_none()
        if not school:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found",
            )
        if school.publisher_id != publisher.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="School does not belong to your organization",
            )

    # Verify teacher belongs to school (if teacher_id provided)
    if assignment_in.teacher_id:
        teacher_result = await db.execute(
            select(Teacher).where(Teacher.id == assignment_in.teacher_id)
        )
        teacher = teacher_result.scalar_one_or_none()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found",
            )
        # If school_id is provided, verify teacher is in that school
        if assignment_in.school_id and teacher.school_id != assignment_in.school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Teacher does not belong to the specified school",
            )

    # Check for duplicate assignment
    existing_query = select(BookAssignment).where(
        BookAssignment.book_id == assignment_in.book_id
    )
    if assignment_in.school_id:
        existing_query = existing_query.where(
            BookAssignment.school_id == assignment_in.school_id
        )
    else:
        existing_query = existing_query.where(BookAssignment.school_id.is_(None))

    if assignment_in.teacher_id:
        existing_query = existing_query.where(
            BookAssignment.teacher_id == assignment_in.teacher_id
        )
    else:
        existing_query = existing_query.where(BookAssignment.teacher_id.is_(None))

    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This assignment already exists",
        )

    # Create assignment
    assignment = await book_assignment_service.create_assignment(
        db=db,
        book_id=assignment_in.book_id,
        assigned_by=current_user.id,
        school_id=assignment_in.school_id,
        teacher_id=assignment_in.teacher_id,
    )

    return assignment


@router.post(
    "/bulk",
    response_model=list[BookAssignmentPublic],
    status_code=status.HTTP_201_CREATED,
    summary="Create bulk book assignments",
    description="Assign a book to multiple teachers or entire school. Publisher only.",
)
async def create_bulk_book_assignments(
    *,
    db: AsyncSessionDep,
    bulk_in: BulkBookAssignmentCreate,
    current_user: User = require_role(UserRole.publisher),
) -> Any:
    """
    Create multiple book assignments at once.

    - Assign to entire school (all teachers get access)
    - Or assign to specific list of teachers
    """
    # Get publisher record
    result = await db.execute(
        select(Publisher).where(Publisher.user_id == current_user.id)
    )
    publisher = result.scalar_one_or_none()
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher record not found",
        )

    # Verify publisher owns the book
    book_result = await db.execute(
        select(Book).where(Book.id == bulk_in.book_id)
    )
    book = book_result.scalar_one_or_none()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    if book.publisher_id != publisher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only assign books you own",
        )

    # Verify school belongs to publisher
    school_result = await db.execute(
        select(School).where(School.id == bulk_in.school_id)
    )
    school = school_result.scalar_one_or_none()
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found",
        )
    if school.publisher_id != publisher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="School does not belong to your organization",
        )

    # Verify all teachers belong to the school (if teacher_ids provided)
    if bulk_in.teacher_ids:
        for teacher_id in bulk_in.teacher_ids:
            teacher_result = await db.execute(
                select(Teacher).where(Teacher.id == teacher_id)
            )
            teacher = teacher_result.scalar_one_or_none()
            if not teacher:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Teacher {teacher_id} not found",
                )
            if teacher.school_id != bulk_in.school_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Teacher {teacher_id} does not belong to the specified school",
                )

    # Create assignments
    assignments = await book_assignment_service.create_bulk_assignments(
        db=db,
        book_id=bulk_in.book_id,
        school_id=bulk_in.school_id,
        assigned_by=current_user.id,
        teacher_ids=bulk_in.teacher_ids,
        assign_to_all=bulk_in.assign_to_all_teachers,
    )

    return assignments


@router.get(
    "",
    response_model=BookAssignmentListResponse,
    summary="List book assignments",
    description="List all book assignments for the publisher's books. Publisher only.",
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
    List book assignments with optional filters.

    - Filter by book_id to see all assignments for a specific book
    - Filter by school_id to see all assignments for a specific school
    """
    # Get publisher record
    result = await db.execute(
        select(Publisher).where(Publisher.user_id == current_user.id)
    )
    publisher = result.scalar_one_or_none()
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher record not found",
        )

    assignments, total = await book_assignment_service.get_publisher_assignments(
        db=db,
        publisher_id=publisher.id,
        book_id=book_id,
        school_id=school_id,
        skip=skip,
        limit=limit,
    )

    return BookAssignmentListResponse(
        items=assignments,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.delete(
    "/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete book assignment",
    description="Remove a book assignment. Publisher only.",
)
async def delete_book_assignment(
    *,
    db: AsyncSessionDep,
    assignment_id: uuid.UUID,
    current_user: User = require_role(UserRole.publisher),
) -> None:
    """
    Delete a book assignment (revoke access).

    Publisher can only delete assignments for their own books.
    """
    # Get publisher record
    result = await db.execute(
        select(Publisher).where(Publisher.user_id == current_user.id)
    )
    publisher = result.scalar_one_or_none()
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher record not found",
        )

    deleted = await book_assignment_service.delete_assignment(
        db=db,
        assignment_id=assignment_id,
        publisher_id=publisher.id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found or you don't have permission to delete it",
        )


@router.get(
    "/book/{book_id}",
    response_model=list[BookAssignmentResponse],
    summary="Get assignments for a book",
    description="Get all assignments for a specific book. Publisher only.",
)
async def get_book_assignments(
    *,
    db: AsyncSessionDep,
    book_id: uuid.UUID,
    current_user: User = require_role(UserRole.publisher),
) -> Any:
    """
    Get all assignments for a specific book.

    Returns list of schools/teachers that have access to the book.
    """
    # Get publisher record
    result = await db.execute(
        select(Publisher).where(Publisher.user_id == current_user.id)
    )
    publisher = result.scalar_one_or_none()
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher record not found",
        )

    # Verify publisher owns the book
    book_result = await db.execute(
        select(Book).where(Book.id == book_id)
    )
    book = book_result.scalar_one_or_none()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    if book.publisher_id != publisher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view assignments for books you own",
        )

    assignments, _ = await book_assignment_service.get_publisher_assignments(
        db=db,
        publisher_id=publisher.id,
        book_id=book_id,
        skip=0,
        limit=1000,  # Get all assignments for the book
    )

    return assignments
