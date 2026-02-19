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
from sqlmodel import func, select

from app.api.deps import AsyncSessionDep, require_role
from app.models import (
    Class,
    ClassCreateByTeacher,
    ClassDetailResponse,
    ClassResponse,
    ClassStudent,
    ClassStudentAdd,
    ClassUpdate,
    SkillCategory,
    Student,
    StudentInClass,
    StudentSkillScore,
    Teacher,
    User,
    UserRole,
)
from app.schemas.analytics import ClassAnalyticsResponse, ClassPeriodType
from app.schemas.skill import (
    ClassSkillHeatmapResponse,
    SkillCategoryPublic,
    StudentSkillCell,
    StudentSkillRow,
)
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
            detail="Student user record not found"
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


# =============================================================================
# Class Skill Heatmap (Story 30.15)
# =============================================================================


@router.get(
    "/{class_id}/skill-heatmap",
    response_model=ClassSkillHeatmapResponse,
    summary="Get class skill heatmap (Story 30.15)",
)
async def get_class_skill_heatmap(
    class_id: uuid.UUID,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.teacher, UserRole.admin, UserRole.supervisor),
) -> ClassSkillHeatmapResponse:
    """
    Get students x skills proficiency matrix for a class.

    Returns a heatmap-ready data structure with per-student, per-skill proficiency
    and class averages.
    """
    from sqlalchemy import distinct

    # Teacher access check
    if current_user.role == UserRole.teacher:
        teacher = await _get_teacher_from_user(session, current_user)
        cls = await _verify_class_ownership(session, class_id, teacher.id)
    else:
        result = await session.execute(select(Class).where(Class.id == class_id))
        cls = result.scalar_one_or_none()
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found"
            )

    # Get all active skills
    skills_result = await session.execute(
        select(SkillCategory).where(SkillCategory.is_active == True)
    )
    all_skills = skills_result.scalars().all()
    skill_columns = [
        SkillCategoryPublic(
            id=s.id, name=s.name, slug=s.slug, icon=s.icon,
            color=s.color, description=s.description, is_active=s.is_active,
        )
        for s in all_skills
    ]

    # Get students in class
    students_result = await session.execute(
        select(Student, User)
        .join(ClassStudent, ClassStudent.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .where(ClassStudent.class_id == class_id)
        .order_by(User.full_name)
    )
    class_students = students_result.all()

    if not class_students:
        return ClassSkillHeatmapResponse(
            class_id=class_id,
            class_name=cls.name,
            skill_columns=skill_columns,
            students=[],
            class_averages={s.slug: None for s in all_skills},
        )

    student_ids = [s.id for s, _ in class_students]

    # Get aggregated scores: student_id × skill_id
    scores_result = await session.execute(
        select(
            StudentSkillScore.student_id,
            StudentSkillScore.skill_id,
            func.sum(StudentSkillScore.attributed_score).label("total_score"),
            func.sum(StudentSkillScore.attributed_max_score).label("total_max"),
            func.count().label("data_points"),
        )
        .where(StudentSkillScore.student_id.in_(student_ids))
        .group_by(StudentSkillScore.student_id, StudentSkillScore.skill_id)
    )

    # Build lookup: (student_id, skill_id) → {score, max, dp}
    score_lookup: dict[tuple, dict] = {}
    for row in scores_result.all():
        score_lookup[(row.student_id, row.skill_id)] = {
            "total_score": float(row.total_score),
            "total_max": float(row.total_max),
            "data_points": int(row.data_points),
        }

    # Build student rows
    student_rows: list[StudentSkillRow] = []
    # For class averages
    skill_totals: dict[str, list[float]] = {s.slug: [] for s in all_skills}

    for student, user in class_students:
        skills_dict: dict[str, StudentSkillCell] = {}
        for skill in all_skills:
            data = score_lookup.get((student.id, skill.id))
            if data and data["data_points"] > 0:
                dp = data["data_points"]
                proficiency = (
                    (data["total_score"] / data["total_max"] * 100)
                    if data["total_max"] > 0 else None
                )
                if dp < 3:
                    confidence = "insufficient"
                    proficiency = None
                elif dp <= 5:
                    confidence = "low"
                elif dp <= 10:
                    confidence = "moderate"
                else:
                    confidence = "high"

                if proficiency is not None:
                    skill_totals[skill.slug].append(proficiency)
            else:
                dp = 0
                proficiency = None
                confidence = "insufficient"

            skills_dict[skill.slug] = StudentSkillCell(
                proficiency=round(proficiency, 1) if proficiency is not None else None,
                data_points=dp,
                confidence=confidence,
            )
        student_rows.append(StudentSkillRow(
            student_id=student.id,
            student_name=user.full_name,
            skills=skills_dict,
        ))

    # Class averages
    class_averages: dict[str, float | None] = {}
    for skill in all_skills:
        values = skill_totals[skill.slug]
        class_averages[skill.slug] = (
            round(sum(values) / len(values), 1) if values else None
        )

    return ClassSkillHeatmapResponse(
        class_id=class_id,
        class_name=cls.name,
        skill_columns=skill_columns,
        students=student_rows,
        class_averages=class_averages,
    )
