"""Book Assignment Service for managing book access to schools/teachers - Story 9.4."""

import uuid
from datetime import UTC, datetime

from sqlmodel import or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    BookAssignment,
    BookAssignmentResponse,
    Teacher,
)


async def create_assignment(
    db: AsyncSession,
    book_id: int,
    assigned_by: uuid.UUID,
    school_id: uuid.UUID | None = None,
    teacher_id: uuid.UUID | None = None,
) -> BookAssignment:
    """
    Create a single book assignment.

    Args:
        db: Database session
        book_id: DCS book ID (int)
        assigned_by: UUID of the user (publisher) creating the assignment
        school_id: Optional UUID of the school (for school-wide access)
        teacher_id: Optional UUID of the teacher (for individual teacher access)

    Returns:
        The created BookAssignment

    Raises:
        ValueError: If neither school_id nor teacher_id is provided
    """
    if school_id is None and teacher_id is None:
        raise ValueError("At least one of school_id or teacher_id must be provided")

    assignment = BookAssignment(
        dcs_book_id=book_id,
        school_id=school_id,
        teacher_id=teacher_id,
        assigned_by=assigned_by,
        assigned_at=datetime.now(UTC),
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def create_bulk_assignments(
    db: AsyncSession,
    book_id: int,
    school_id: uuid.UUID,
    assigned_by: uuid.UUID,
    teacher_ids: list[uuid.UUID] | None = None,
    assign_to_all: bool = False,
) -> list[BookAssignment]:
    """
    Create multiple book assignments in bulk.

    Args:
        db: Database session
        book_id: DCS book ID (int)
        school_id: UUID of the school
        assigned_by: UUID of the user creating the assignments
        teacher_ids: List of teacher UUIDs to assign to (if not assign_to_all)
        assign_to_all: If True, create school-level assignment (all teachers)

    Returns:
        List of created BookAssignment objects
    """
    assignments = []

    if assign_to_all:
        # School-level assignment - all teachers in school get access
        assignment = BookAssignment(
            dcs_book_id=book_id,
            school_id=school_id,
            teacher_id=None,
            assigned_by=assigned_by,
            assigned_at=datetime.now(UTC),
        )
        db.add(assignment)
        assignments.append(assignment)
    elif teacher_ids:
        # Individual teacher assignments
        for teacher_id in teacher_ids:
            assignment = BookAssignment(
                dcs_book_id=book_id,
                school_id=school_id,
                teacher_id=teacher_id,
                assigned_by=assigned_by,
                assigned_at=datetime.now(UTC),
            )
            db.add(assignment)
            assignments.append(assignment)

    await db.commit()
    for assignment in assignments:
        await db.refresh(assignment)

    return assignments


async def get_publisher_assignments(
    db: AsyncSession,
    publisher_id: uuid.UUID,
    book_id: int | None = None,
    school_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[BookAssignmentResponse], int]:
    """
    DEPRECATED: Publisher role is deprecated - publishers managed in Dream Central Storage.

    This function is no longer functional as the Publisher model has been removed.
    """
    # Publisher role deprecated - return empty results
    return [], 0


async def delete_assignment(
    db: AsyncSession,
    assignment_id: uuid.UUID,
    publisher_id: uuid.UUID,
) -> bool:
    """
    DEPRECATED: Publisher role is deprecated - publishers managed in Dream Central Storage.

    This function is no longer functional as the Publisher model has been removed.
    """
    # Publisher role deprecated - return False (not found)
    return False


async def check_teacher_book_access(
    db: AsyncSession,
    teacher_id: uuid.UUID,
    book_id: int,
) -> bool:
    """
    Check if a teacher has access to a specific book.

    Args:
        db: Database session
        teacher_id: UUID of the teacher
        book_id: DCS book ID (int)

    Returns:
        True if teacher has access, False otherwise
    """
    # Get teacher's school
    teacher_result = await db.execute(
        select(Teacher).where(Teacher.id == teacher_id)
    )
    teacher = teacher_result.scalar_one_or_none()

    if not teacher:
        return False

    # Check for direct teacher assignment OR school-level assignment
    result = await db.execute(
        select(BookAssignment).where(
            BookAssignment.dcs_book_id == book_id,
            or_(
                BookAssignment.teacher_id == teacher_id,
                # School-level assignment (teacher_id is NULL, school_id matches)
                (BookAssignment.school_id == teacher.school_id) & (BookAssignment.teacher_id.is_(None))
            )
        )
    )
    assignment = result.scalar_one_or_none()
    return assignment is not None


async def get_accessible_book_ids(
    db: AsyncSession,
    teacher_id: uuid.UUID,
) -> list[int]:
    """
    Get list of book IDs that a teacher has access to.

    Args:
        db: Database session
        teacher_id: UUID of the teacher

    Returns:
        List of accessible DCS book IDs (int)
    """
    # Get teacher's school
    teacher_result = await db.execute(
        select(Teacher).where(Teacher.id == teacher_id)
    )
    teacher = teacher_result.scalar_one_or_none()

    if not teacher:
        return []

    # Get books with direct teacher assignment OR school-level assignment
    result = await db.execute(
        select(BookAssignment.dcs_book_id).where(
            or_(
                BookAssignment.teacher_id == teacher_id,
                # School-level assignment
                (BookAssignment.school_id == teacher.school_id) & (BookAssignment.teacher_id.is_(None))
            )
        ).distinct()
    )

    return [row[0] for row in result.fetchall()]


async def get_existing_assignments_for_book(
    db: AsyncSession,
    book_id: int,
    school_id: uuid.UUID | None = None,
) -> list[BookAssignment]:
    """
    Get existing assignments for a book, optionally filtered by school.

    Args:
        db: Database session
        book_id: DCS book ID (int)
        school_id: Optional school filter

    Returns:
        List of existing BookAssignment objects
    """
    query = select(BookAssignment).where(BookAssignment.dcs_book_id == book_id)
    if school_id:
        query = query.where(BookAssignment.school_id == school_id)

    result = await db.execute(query)
    return list(result.scalars().all())
