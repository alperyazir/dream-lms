"""
Class Management Routes.

Allows teachers to create and manage classes and assign students to them.
"""

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.api.deps import AsyncSessionDep, require_role
from app.models import (
    Class,
    ClassCreateByTeacher,
    ClassDetailResponse,
    ClassResponse,
    ClassStudent,
    ClassStudentAdd,
    ClassUpdate,
    Student,
    StudentInClass,
    Teacher,
    User,
    UserRole,
)
from app.schemas.analytics import ClassAnalyticsResponse, ClassPeriodType
from app.schemas.benchmarks import BenchmarkPeriod, ClassBenchmarkResponse
from app.services.analytics_service import get_class_analytics
from app.services.benchmark_service import get_class_benchmarks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/classes", tags=["classes"])


async def _get_teacher_from_user(session: AsyncSession, user: User) -> Teacher:
    """
    Get Teacher record from User.

    Args:
        session: Database session
        user: Current authenticated user

    Returns:
        Teacher record

    Raises:
        HTTPException: If teacher record not found
    """
    result = await session.execute(select(Teacher).where(Teacher.user_id == user.id))
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    return teacher


async def _verify_class_ownership(
    session: AsyncSession,
    class_id: uuid.UUID,
    teacher_id: uuid.UUID
) -> Class:
    """
    Verify that a class belongs to the given teacher.

    Args:
        session: Database session
        class_id: UUID of the class
        teacher_id: UUID of the teacher

    Returns:
        Class object if ownership verified

    Raises:
        HTTPException: 404 if class not found or not owned by teacher
    """
    result = await session.execute(
        select(Class).where(
            Class.id == class_id,
            Class.teacher_id == teacher_id
        )
    )
    class_obj = result.scalar_one_or_none()

    if not class_obj:
        # Return 404 to not expose existence of other teachers' classes
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    return class_obj


async def _verify_student_ownership(
    session: AsyncSession,
    student_id: uuid.UUID,
    teacher_id: uuid.UUID
) -> Student:
    """
    Verify that a student was created by the given teacher.

    Args:
        session: Database session
        student_id: UUID of the student
        teacher_id: UUID of the teacher

    Returns:
        Student object if ownership verified

    Raises:
        HTTPException: If student not found or not created by teacher
    """
    # Get student
    result = await session.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student {student_id} not found"
        )

    # Get student's user to check school affiliation via teacher
    result = await session.execute(select(User).where(User.id == student.user_id))
    student_user = result.scalar_one_or_none()

    if not student_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student user record not found"
        )

    # Verify teacher has access to this student by checking school relationship
    # Students belong to a school through their class enrollments
    # A teacher can only add students who are enrolled in classes at their school
    result = await session.execute(select(Teacher).where(Teacher.id == teacher_id))
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found"
        )

    # Check if student is enrolled in any class at the teacher's school
    result = await session.execute(
        select(ClassStudent)
        .join(Class, ClassStudent.class_id == Class.id)
        .where(
            ClassStudent.student_id == student_id,
            Class.school_id == teacher.school_id
        )
    )
    student_in_school = result.first()

    if not student_in_school:
        # Student not enrolled in any class at this teacher's school
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"  # Don't expose that student exists at different school
        )

    return student


@router.post(
    "",
    response_model=ClassResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new class",
    description="Creates a new class owned by the authenticated teacher."
)
async def create_class(
    *,
    session: AsyncSessionDep,
    class_in: ClassCreateByTeacher,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Create a new class.

    - **name**: Class name (required, max 255 characters)
    - **grade_level**: Grade level (optional, max 50 characters)
    - **subject**: Subject name (optional, max 100 characters)
    - **academic_year**: Academic year (optional, max 20 characters, e.g. "2024-2025")

    Returns newly created class with student_count = 0.
    """
    # Get Teacher record
    teacher = await _get_teacher_from_user(session, current_user)

    # Create class with auto-populated foreign keys
    class_obj = Class(
        name=class_in.name,
        grade_level=class_in.grade_level,
        subject=class_in.subject,
        academic_year=class_in.academic_year,
        is_active=class_in.is_active,
        teacher_id=teacher.id,
        school_id=teacher.school_id
    )

    session.add(class_obj)
    await session.commit()
    await session.refresh(class_obj)

    # Return with student_count = 0
    return ClassResponse(**class_obj.model_dump(), student_count=0)


@router.get(
    "",
    response_model=list[ClassResponse],
    summary="List teacher's classes",
    description="Returns all active classes owned by the authenticated teacher."
)
async def list_classes(
    *,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.teacher),
    skip: int = 0,
    limit: int = 20
) -> Any:
    """
    List all classes for the current teacher.

    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum records to return (default: 20, max: 100)

    Returns classes with student counts. Only includes active classes.
    """
    # Validate pagination parameters
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skip parameter must be non-negative"
        )

    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit parameter must be between 1 and 100"
        )

    # Get Teacher record
    teacher = await _get_teacher_from_user(session, current_user)

    # Query classes with student count using single SQL query with LEFT JOIN
    # This avoids N+1 query problem
    result = await session.execute(
        select(
            Class,
            func.count(ClassStudent.id).label("student_count")
        )
        .outerjoin(ClassStudent, Class.id == ClassStudent.class_id)
        .where(Class.teacher_id == teacher.id, Class.is_active == True)
        .group_by(Class.id)
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()

    # Build response with student counts
    response_classes = [
        ClassResponse(**class_obj.model_dump(), student_count=student_count)
        for class_obj, student_count in rows
    ]

    return response_classes


@router.get(
    "/{class_id}",
    response_model=ClassDetailResponse,
    summary="Get class details",
    description="Returns detailed class information including enrolled students."
)
async def get_class_detail(
    *,
    session: AsyncSessionDep,
    class_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Get detailed information about a specific class.

    Includes enrolled students with their user details.
    """
    # Get Teacher record
    teacher = await _get_teacher_from_user(session, current_user)

    # Verify ownership and get class
    class_obj = await _verify_class_ownership(session, class_id, teacher.id)

    # Get enrolled students
    result = await session.execute(
        select(ClassStudent, Student, User)
        .join(Student, ClassStudent.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .where(ClassStudent.class_id == class_id)
    )
    enrollments = result.all()

    # Build enrolled students list
    enrolled_students = []
    for _, student, user in enrollments:
        enrolled_students.append(
            StudentInClass(
                id=student.id,
                email=user.email,
                full_name=user.full_name,
                grade=student.grade_level
            )
        )

    return ClassDetailResponse(
        **class_obj.model_dump(),
        student_count=len(enrolled_students),
        enrolled_students=enrolled_students
    )


@router.put(
    "/{class_id}",
    response_model=ClassResponse,
    summary="Update class",
    description="Updates class details (name, grade, subject, academic year)."
)
async def update_class(
    *,
    session: AsyncSessionDep,
    class_id: uuid.UUID,
    class_in: ClassUpdate,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Update class information.

    Only the following fields can be updated:
    - name
    - grade_level
    - subject
    - academic_year
    - is_active
    """
    # Get Teacher record
    teacher = await _get_teacher_from_user(session, current_user)

    # Verify ownership and get class
    class_obj = await _verify_class_ownership(session, class_id, teacher.id)

    # Update fields
    update_data = class_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(class_obj, field, value)

    # Update timestamp
    class_obj.updated_at = datetime.now(UTC)

    session.add(class_obj)
    await session.commit()
    await session.refresh(class_obj)

    # Get student count
    count_result = await session.execute(
        select(func.count(ClassStudent.id))
        .where(ClassStudent.class_id == class_obj.id)
    )
    student_count = count_result.scalar_one()

    return ClassResponse(**class_obj.model_dump(), student_count=student_count)


@router.delete(
    "/{class_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Archive class",
    description="Archives a class (soft delete). Marks as inactive."
)
async def archive_class(
    *,
    session: AsyncSessionDep,
    class_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher)
) -> None:
    """
    Archive a class (soft delete).

    Sets is_active = False. Student enrollments are preserved.
    """
    # Get Teacher record
    teacher = await _get_teacher_from_user(session, current_user)

    # Verify ownership and get class
    class_obj = await _verify_class_ownership(session, class_id, teacher.id)

    # Soft delete
    class_obj.is_active = False
    session.add(class_obj)
    await session.commit()


@router.post(
    "/{class_id}/students",
    status_code=status.HTTP_201_CREATED,
    summary="Add students to class",
    description="Enrolls multiple students in a class. Students must belong to the teacher."
)
async def add_students_to_class(
    *,
    session: AsyncSessionDep,
    class_id: uuid.UUID,
    students_in: ClassStudentAdd,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Add students to a class.

    - **student_ids**: List of student UUIDs to enroll

    Validates that all students belong to the teacher's school.
    Idempotent: if student already enrolled, skips without error.
    """
    # Get Teacher record
    teacher = await _get_teacher_from_user(session, current_user)

    # Verify ownership and get class
    class_obj = await _verify_class_ownership(session, class_id, teacher.id)

    # Verify all students belong to teacher and create enrollments
    enrolled_count = 0
    skipped_count = 0

    for student_id in students_in.student_ids:
        # Verify student ownership
        await _verify_student_ownership(session, student_id, teacher.id)

        # Check if already enrolled
        result = await session.execute(
            select(ClassStudent).where(
                ClassStudent.class_id == class_id,
                ClassStudent.student_id == student_id
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            skipped_count += 1
            continue

        # Create enrollment
        enrollment = ClassStudent(
            class_id=class_id,
            student_id=student_id
        )
        session.add(enrollment)
        enrolled_count += 1

    await session.commit()

    return {
        "message": f"Enrolled {enrolled_count} student(s), {skipped_count} already enrolled",
        "enrolled_count": enrolled_count,
        "skipped_count": skipped_count
    }


@router.delete(
    "/{class_id}/students/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove student from class",
    description="Removes a student from a class enrollment."
)
async def remove_student_from_class(
    *,
    session: AsyncSessionDep,
    class_id: uuid.UUID,
    student_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher)
) -> None:
    """
    Remove a student from a class.

    Deletes the enrollment record from class_students table.
    """
    # Get Teacher record
    teacher = await _get_teacher_from_user(session, current_user)

    # Verify ownership and get class
    await _verify_class_ownership(session, class_id, teacher.id)

    # Find enrollment
    result = await session.execute(
        select(ClassStudent).where(
            ClassStudent.class_id == class_id,
            ClassStudent.student_id == student_id
        )
    )
    enrollment = result.scalar_one_or_none()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not enrolled in this class"
        )

    # Delete enrollment
    await session.delete(enrollment)
    await session.commit()


@router.get(
    "/{class_id}/analytics",
    response_model=ClassAnalyticsResponse,
    summary="Get class analytics",
    description="Returns aggregated performance analytics for a class."
)
async def get_class_analytics_endpoint(
    *,
    session: AsyncSessionDep,
    class_id: uuid.UUID,
    period: ClassPeriodType = "monthly",
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Get comprehensive analytics for a class.

    - **class_id**: UUID of the class
    - **period**: Time period filter (weekly, monthly, semester, ytd)

    Returns aggregated metrics including:
    - Class summary (avg score, completion rate, totals)
    - Score distribution histogram
    - Top performing students leaderboard
    - Struggling students alerts
    - Per-assignment performance metrics
    - Performance by activity type
    - Trend analysis vs previous period
    """
    # Get Teacher record
    teacher = await _get_teacher_from_user(session, current_user)

    # Verify ownership and get class
    class_obj = await _verify_class_ownership(session, class_id, teacher.id)

    # Get class analytics
    analytics = await get_class_analytics(class_id, period, session)

    return analytics


@router.get(
    "/{class_id}/benchmarks",
    response_model=ClassBenchmarkResponse,
    summary="Get class benchmarks",
    description="Returns performance benchmarks comparing class against school/publisher averages."
)
async def get_class_benchmarks_endpoint(
    *,
    session: AsyncSessionDep,
    class_id: uuid.UUID,
    period: BenchmarkPeriod = "monthly",
    current_user: User = require_role(UserRole.teacher)
) -> ClassBenchmarkResponse:
    """
    Get benchmark comparison data for a class.

    [Source: Story 5.7 AC: 7, 8]

    - **class_id**: UUID of the class
    - **period**: Time period filter (weekly, monthly, semester, all)

    Returns benchmark comparison including:
    - Class metrics (avg score, completion rate)
    - School benchmark (if >= 5 classes and enabled)
    - Publisher benchmark (if >= 5 classes and enabled)
    - Activity type benchmarks
    - Comparison over time (trend chart data)
    - Encouraging/constructive message based on performance

    Note: Benchmarks require minimum 5 classes for privacy.
    Returns 403 if benchmarking is disabled by school/publisher.
    """
    # Get Teacher record
    teacher = await _get_teacher_from_user(session, current_user)

    # Verify ownership and get class
    await _verify_class_ownership(session, class_id, teacher.id)

    try:
        # Get class benchmarks
        benchmarks = await get_class_benchmarks(class_id, period, session)

        # Check if benchmarking is disabled
        if not benchmarks.benchmarking_enabled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=benchmarks.disabled_reason or "Benchmarking is disabled"
            )

        return benchmarks
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
