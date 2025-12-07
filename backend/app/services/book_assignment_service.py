"""Book Assignment Service for managing book access to schools/teachers - Story 9.4."""

import uuid
from datetime import UTC, datetime

from sqlmodel import or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    Book,
    BookAssignment,
    BookAssignmentResponse,
    Publisher,
    School,
    Teacher,
    User,
)


async def create_assignment(
    db: AsyncSession,
    book_id: uuid.UUID,
    assigned_by: uuid.UUID,
    school_id: uuid.UUID | None = None,
    teacher_id: uuid.UUID | None = None,
) -> BookAssignment:
    """
    Create a single book assignment.

    Args:
        db: Database session
        book_id: UUID of the book to assign
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
        book_id=book_id,
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
    book_id: uuid.UUID,
    school_id: uuid.UUID,
    assigned_by: uuid.UUID,
    teacher_ids: list[uuid.UUID] | None = None,
    assign_to_all: bool = False,
) -> list[BookAssignment]:
    """
    Create multiple book assignments in bulk.

    Args:
        db: Database session
        book_id: UUID of the book to assign
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
            book_id=book_id,
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
                book_id=book_id,
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
    book_id: uuid.UUID | None = None,
    school_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[BookAssignmentResponse], int]:
    """
    Get book assignments for a publisher with optional filters.

    Args:
        db: Database session
        publisher_id: UUID of the publisher
        book_id: Optional filter by book
        school_id: Optional filter by school
        skip: Pagination offset
        limit: Pagination limit

    Returns:
        Tuple of (list of BookAssignmentResponse, total count)
    """
    # Get publisher's user_id for assigned_by filter
    publisher_result = await db.execute(
        select(Publisher).where(Publisher.id == publisher_id)
    )
    publisher = publisher_result.scalar_one_or_none()
    if not publisher:
        return [], 0

    # Base query - get books owned by this publisher
    book_ids_query = select(Book.id).where(Book.publisher_id == publisher_id)
    book_ids_result = await db.execute(book_ids_query)
    publisher_book_ids = [row[0] for row in book_ids_result.fetchall()]

    if not publisher_book_ids:
        return [], 0

    # Build assignment query
    query = select(BookAssignment).where(
        BookAssignment.book_id.in_(publisher_book_ids)
    )

    if book_id:
        query = query.where(BookAssignment.book_id == book_id)
    if school_id:
        query = query.where(BookAssignment.school_id == school_id)

    # Get total count
    count_query = select(BookAssignment).where(
        BookAssignment.book_id.in_(publisher_book_ids)
    )
    if book_id:
        count_query = count_query.where(BookAssignment.book_id == book_id)
    if school_id:
        count_query = count_query.where(BookAssignment.school_id == school_id)

    count_result = await db.execute(count_query)
    total = len(count_result.fetchall())

    # Get paginated results
    query = query.offset(skip).limit(limit).order_by(BookAssignment.assigned_at.desc())
    result = await db.execute(query)
    assignments = result.scalars().all()

    # Build response with related entity info
    responses = []
    for assignment in assignments:
        # Get book info
        book_result = await db.execute(
            select(Book).where(Book.id == assignment.book_id)
        )
        book = book_result.scalar_one_or_none()

        # Get school info if applicable
        school_name = None
        if assignment.school_id:
            school_result = await db.execute(
                select(School).where(School.id == assignment.school_id)
            )
            school = school_result.scalar_one_or_none()
            school_name = school.name if school else None

        # Get teacher info if applicable
        teacher_name = None
        teacher_email = None
        if assignment.teacher_id:
            teacher_result = await db.execute(
                select(Teacher, User)
                .join(User, Teacher.user_id == User.id)
                .where(Teacher.id == assignment.teacher_id)
            )
            teacher_row = teacher_result.first()
            if teacher_row:
                teacher, user = teacher_row
                teacher_name = user.full_name
                teacher_email = user.email

        # Get assigner info
        assigner_result = await db.execute(
            select(User).where(User.id == assignment.assigned_by)
        )
        assigner = assigner_result.scalar_one_or_none()

        responses.append(
            BookAssignmentResponse(
                id=assignment.id,
                book_id=assignment.book_id,
                book_title=book.title if book else "Unknown",
                book_cover_url=book.cover_image_url if book else None,
                school_id=assignment.school_id,
                school_name=school_name,
                teacher_id=assignment.teacher_id,
                teacher_name=teacher_name,
                teacher_email=teacher_email,
                assigned_by=assignment.assigned_by,
                assigned_by_name=assigner.full_name if assigner else None,
                assigned_at=assignment.assigned_at,
            )
        )

    return responses, total


async def delete_assignment(
    db: AsyncSession,
    assignment_id: uuid.UUID,
    publisher_id: uuid.UUID,
) -> bool:
    """
    Delete a book assignment.

    Args:
        db: Database session
        assignment_id: UUID of the assignment to delete
        publisher_id: UUID of the publisher (for ownership validation)

    Returns:
        True if deleted, False if not found or not authorized
    """
    # Get the assignment
    result = await db.execute(
        select(BookAssignment).where(BookAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        return False

    # Verify publisher owns the book
    book_result = await db.execute(
        select(Book).where(Book.id == assignment.book_id)
    )
    book = book_result.scalar_one_or_none()

    if not book or book.publisher_id != publisher_id:
        return False

    await db.delete(assignment)
    await db.commit()
    return True


async def check_teacher_book_access(
    db: AsyncSession,
    teacher_id: uuid.UUID,
    book_id: uuid.UUID,
) -> bool:
    """
    Check if a teacher has access to a specific book.

    Args:
        db: Database session
        teacher_id: UUID of the teacher
        book_id: UUID of the book

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
            BookAssignment.book_id == book_id,
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
) -> list[uuid.UUID]:
    """
    Get list of book IDs that a teacher has access to.

    Args:
        db: Database session
        teacher_id: UUID of the teacher

    Returns:
        List of accessible book UUIDs
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
        select(BookAssignment.book_id).where(
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
    book_id: uuid.UUID,
    school_id: uuid.UUID | None = None,
) -> list[BookAssignment]:
    """
    Get existing assignments for a book, optionally filtered by school.

    Args:
        db: Database session
        book_id: UUID of the book
        school_id: Optional school filter

    Returns:
        List of existing BookAssignment objects
    """
    query = select(BookAssignment).where(BookAssignment.book_id == book_id)
    if school_id:
        query = query.where(BookAssignment.school_id == school_id)

    result = await db.execute(query)
    return list(result.scalars().all())
