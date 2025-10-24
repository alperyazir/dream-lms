"""
Admin service layer for user management and system operations.
Handles admin-specific business logic including CRUD for publishers and schools.
"""

import secrets
import string
from math import ceil
from typing import List, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.models.publisher import Publisher
from app.models.school import School
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole


def generate_temporary_password() -> str:
    """
    Generate a secure temporary password that meets strength requirements:
    - 12 characters long
    - Mix of uppercase, lowercase, digits
    """
    # Ensure at least one of each required character type
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
    ]
    # Fill the rest with random mix
    password += [secrets.choice(string.ascii_letters + string.digits) for _ in range(9)]
    # Shuffle to randomize positions
    secrets.SystemRandom().shuffle(password)
    return "".join(password)


async def get_dashboard_stats(db: AsyncSession) -> dict:
    """
    Get system-wide dashboard statistics.

    Args:
        db: Async database session

    Returns:
        Dictionary with counts of publishers, schools, teachers, students
    """
    # Count publishers (only active users)
    publisher_stmt = (
        select(func.count(Publisher.id))
        .select_from(Publisher)
        .join(User, Publisher.user_id == User.id)
        .where(User.is_active.is_(True))
    )
    publisher_result = await db.execute(publisher_stmt)
    total_publishers = publisher_result.scalar() or 0

    # Count schools
    school_stmt = select(func.count(School.id))
    school_result = await db.execute(school_stmt)
    total_schools = school_result.scalar() or 0

    # Count teachers (only active users)
    teacher_stmt = (
        select(func.count(Teacher.id))
        .select_from(Teacher)
        .join(User, Teacher.user_id == User.id)
        .where(User.is_active.is_(True))
    )
    teacher_result = await db.execute(teacher_stmt)
    total_teachers = teacher_result.scalar() or 0

    # Count students (only active users)
    student_stmt = (
        select(func.count(Student.id))
        .select_from(Student)
        .join(User, Student.user_id == User.id)
        .where(User.is_active.is_(True))
    )
    student_result = await db.execute(student_stmt)
    total_students = student_result.scalar() or 0

    return {
        "total_publishers": total_publishers,
        "total_schools": total_schools,
        "total_teachers": total_teachers,
        "total_students": total_students,
    }


async def list_publishers(
    db: AsyncSession, page: int = 1, per_page: int = 20, search: Optional[str] = None
) -> Tuple[List[dict], dict]:
    """
    List publishers with pagination and optional search.

    Args:
        db: Async database session
        page: Page number (1-indexed)
        per_page: Number of items per page (max 100)
        search: Optional search term for name or email

    Returns:
        Tuple of (publishers list, pagination metadata)
    """
    # Enforce max page size
    per_page = min(per_page, 100)
    offset = (page - 1) * per_page

    # Build query with joins
    query = (
        select(Publisher, User)
        .join(User, Publisher.user_id == User.id)
        .order_by(Publisher.created_at.desc())
    )

    # Add search filter if provided
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Publisher.name.ilike(search_pattern),
                User.email.ilike(search_pattern),
            )
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = query.offset(offset).limit(per_page)
    result = await db.execute(query)
    rows = result.all()

    # Build response list
    publishers = []
    for publisher, user in rows:
        publishers.append(
            {
                "id": publisher.id,
                "user_id": publisher.user_id,
                "name": publisher.name,
                "contact_email": publisher.contact_email,
                "created_at": publisher.created_at,
                "updated_at": publisher.updated_at,
                "email": user.email,
                "is_active": user.is_active,
            }
        )

    # Build pagination metadata
    total_pages = ceil(total / per_page) if per_page > 0 else 0
    pagination = {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "next_page": page + 1 if page < total_pages else None,
        "prev_page": page - 1 if page > 1 else None,
    }

    return publishers, pagination


async def create_publisher(
    db: AsyncSession, name: str, contact_email: Optional[str] = None
) -> Tuple[Publisher, str]:
    """
    Create a new publisher with user account.

    Args:
        db: Async database session
        name: Publisher name
        contact_email: Optional contact email

    Returns:
        Tuple of (created Publisher object, temporary password)

    Raises:
        HTTPException: 409 if email already exists
    """
    # Use contact_email or generate one
    if not contact_email:
        # Generate email from name
        contact_email = f"{name.lower().replace(' ', '.')}@publisher.dreamlms.local"

    # Check if email already exists
    stmt = select(User).where(User.email == contact_email)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email {contact_email} already exists",
        )

    # Generate temporary password
    temp_password = generate_temporary_password()

    # Create User record
    user = User(
        email=contact_email,
        password_hash=hash_password(temp_password),
        role=UserRole.publisher,
        is_active=True,
    )
    db.add(user)
    await db.flush()  # Flush to get user.id

    # Create Publisher record
    publisher = Publisher(user_id=user.id, name=name, contact_email=contact_email)
    db.add(publisher)

    await db.commit()
    await db.refresh(publisher)

    return publisher, temp_password


async def update_publisher(
    db: AsyncSession,
    publisher_id: UUID,
    name: Optional[str] = None,
    contact_email: Optional[str] = None,
) -> Publisher:
    """
    Update publisher details.

    Args:
        db: Async database session
        publisher_id: Publisher UUID
        name: Optional new name
        contact_email: Optional new contact email

    Returns:
        Updated Publisher object

    Raises:
        HTTPException: 404 if publisher not found
    """
    # Get publisher
    stmt = select(Publisher).where(Publisher.id == publisher_id)
    result = await db.execute(stmt)
    publisher = result.scalar_one_or_none()

    if not publisher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publisher not found")

    # Update fields if provided
    if name is not None:
        publisher.name = name
    if contact_email is not None:
        publisher.contact_email = contact_email

    await db.commit()
    await db.refresh(publisher)

    return publisher


async def soft_delete_publisher(db: AsyncSession, publisher_id: UUID) -> None:
    """
    Soft delete a publisher by setting user.is_active = False.

    Args:
        db: Async database session
        publisher_id: Publisher UUID

    Raises:
        HTTPException: 404 if publisher not found
    """
    # Get publisher with user
    stmt = (
        select(Publisher).options(selectinload(Publisher.user)).where(Publisher.id == publisher_id)
    )
    result = await db.execute(stmt)
    publisher = result.scalar_one_or_none()

    if not publisher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publisher not found")

    # Set user as inactive (soft delete)
    publisher.user.is_active = False

    await db.commit()


async def list_schools(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    publisher_id: Optional[UUID] = None,
) -> Tuple[List[dict], dict]:
    """
    List schools with pagination, search, and optional publisher filter.

    Args:
        db: Async database session
        page: Page number (1-indexed)
        per_page: Number of items per page (max 100)
        search: Optional search term for school name
        publisher_id: Optional filter by publisher ID

    Returns:
        Tuple of (schools list, pagination metadata)
    """
    # Enforce max page size
    per_page = min(per_page, 100)
    offset = (page - 1) * per_page

    # Build query with publisher join
    query = (
        select(School, Publisher)
        .join(Publisher, School.publisher_id == Publisher.id)
        .order_by(School.created_at.desc())
    )

    # Add search filter if provided
    if search:
        search_pattern = f"%{search}%"
        query = query.where(School.name.ilike(search_pattern))

    # Add publisher filter if provided
    if publisher_id:
        query = query.where(School.publisher_id == publisher_id)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = query.offset(offset).limit(per_page)
    result = await db.execute(query)
    rows = result.all()

    # Build response list
    schools = []
    for school, publisher in rows:
        schools.append(
            {
                "id": school.id,
                "name": school.name,
                "publisher_id": school.publisher_id,
                "address": school.address,
                "contact_info": school.contact_info,
                "created_at": school.created_at,
                "updated_at": school.updated_at,
                "publisher_name": publisher.name,
            }
        )

    # Build pagination metadata
    total_pages = ceil(total / per_page) if per_page > 0 else 0
    pagination = {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "next_page": page + 1 if page < total_pages else None,
        "prev_page": page - 1 if page > 1 else None,
    }

    return schools, pagination


async def create_school(
    db: AsyncSession,
    name: str,
    publisher_id: UUID,
    address: Optional[str] = None,
    contact_info: Optional[str] = None,
) -> School:
    """
    Create a new school.

    Args:
        db: Async database session
        name: School name
        publisher_id: Publisher UUID
        address: Optional address
        contact_info: Optional contact information

    Returns:
        Created School object

    Raises:
        HTTPException: 404 if publisher not found, 422 for validation errors
    """
    # Verify publisher exists
    stmt = select(Publisher).where(Publisher.id == publisher_id)
    result = await db.execute(stmt)
    publisher = result.scalar_one_or_none()

    if not publisher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publisher not found")

    # Create school
    school = School(
        name=name,
        publisher_id=publisher_id,
        address=address,
        contact_info=contact_info,
    )
    db.add(school)

    await db.commit()
    await db.refresh(school)

    return school


async def update_school(
    db: AsyncSession,
    school_id: UUID,
    name: Optional[str] = None,
    publisher_id: Optional[UUID] = None,
    address: Optional[str] = None,
    contact_info: Optional[str] = None,
) -> School:
    """
    Update school details.

    Args:
        db: Async database session
        school_id: School UUID
        name: Optional new name
        publisher_id: Optional new publisher ID
        address: Optional new address
        contact_info: Optional new contact info

    Returns:
        Updated School object

    Raises:
        HTTPException: 404 if school or publisher not found
    """
    # Get school
    stmt = select(School).where(School.id == school_id)
    result = await db.execute(stmt)
    school = result.scalar_one_or_none()

    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")

    # If updating publisher_id, verify new publisher exists
    if publisher_id is not None:
        stmt = select(Publisher).where(Publisher.id == publisher_id)
        result = await db.execute(stmt)
        publisher = result.scalar_one_or_none()
        if not publisher:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publisher not found")
        school.publisher_id = publisher_id

    # Update fields if provided
    if name is not None:
        school.name = name
    if address is not None:
        school.address = address
    if contact_info is not None:
        school.contact_info = contact_info

    await db.commit()
    await db.refresh(school)

    return school


async def soft_delete_school(db: AsyncSession, school_id: UUID) -> None:
    """
    Soft delete a school (currently just deletes, but can be changed to soft delete).

    Args:
        db: Async database session
        school_id: School UUID

    Raises:
        HTTPException: 404 if school not found
    """
    # Get school
    stmt = select(School).where(School.id == school_id)
    result = await db.execute(stmt)
    school = result.scalar_one_or_none()

    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="School not found")

    # For now, just delete the school
    # Note: If we add is_active to School model, we can soft delete instead
    await db.delete(school)
    await db.commit()


async def list_teachers(
    db: AsyncSession, page: int = 1, per_page: int = 20, search: Optional[str] = None
) -> Tuple[List[dict], dict]:
    """
    List teachers with school and publisher information.

    Args:
        db: Async database session
        page: Page number (1-indexed)
        per_page: Number of items per page (max 100)
        search: Optional search term for teacher email or school name

    Returns:
        Tuple of (teachers list, pagination metadata)
    """
    # Enforce max page size
    per_page = min(per_page, 100)
    offset = (page - 1) * per_page

    # Build query with joins
    query = (
        select(Teacher, User, School, Publisher)
        .join(User, Teacher.user_id == User.id)
        .join(School, Teacher.school_id == School.id)
        .join(Publisher, School.publisher_id == Publisher.id)
        .order_by(Teacher.created_at.desc())
    )

    # Add search filter if provided
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(User.email.ilike(search_pattern), School.name.ilike(search_pattern))
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = query.offset(offset).limit(per_page)
    result = await db.execute(query)
    rows = result.all()

    # Build response list
    teachers = []
    for teacher, user, school, publisher in rows:
        teachers.append(
            {
                "id": teacher.id,
                "user_id": teacher.user_id,
                "email": user.email,
                "is_active": user.is_active,
                "school_id": school.id,
                "school_name": school.name,
                "publisher_id": publisher.id,
                "publisher_name": publisher.name,
                "subject_specialization": teacher.subject_specialization,
                "created_at": teacher.created_at,
            }
        )

    # Build pagination metadata
    total_pages = ceil(total / per_page) if per_page > 0 else 0
    pagination = {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "next_page": page + 1 if page < total_pages else None,
        "prev_page": page - 1 if page > 1 else None,
    }

    return teachers, pagination


async def list_students(
    db: AsyncSession, page: int = 1, per_page: int = 20, search: Optional[str] = None
) -> Tuple[List[dict], dict]:
    """
    List students with user information.

    Args:
        db: Async database session
        page: Page number (1-indexed)
        per_page: Number of items per page (max 100)
        search: Optional search term for student email

    Returns:
        Tuple of (students list, pagination metadata)
    """
    # Enforce max page size
    per_page = min(per_page, 100)
    offset = (page - 1) * per_page

    # Build query with user join
    query = (
        select(Student, User)
        .join(User, Student.user_id == User.id)
        .order_by(Student.created_at.desc())
    )

    # Add search filter if provided
    if search:
        search_pattern = f"%{search}%"
        query = query.where(User.email.ilike(search_pattern))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = query.offset(offset).limit(per_page)
    result = await db.execute(query)
    rows = result.all()

    # Build response list
    students = []
    for student, user in rows:
        students.append(
            {
                "id": student.id,
                "user_id": student.user_id,
                "email": user.email,
                "is_active": user.is_active,
                "grade_level": student.grade_level,
                "parent_email": student.parent_email,
                "created_at": student.created_at,
            }
        )

    # Build pagination metadata
    total_pages = ceil(total / per_page) if per_page > 0 else 0
    pagination = {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "next_page": page + 1 if page < total_pages else None,
        "prev_page": page - 1 if page > 1 else None,
    }

    return students, pagination
