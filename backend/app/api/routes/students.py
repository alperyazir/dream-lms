"""Student API endpoints - Story 3.9, 5.1, 5.5."""

import logging
import uuid

from fastapi import HTTPException, Query, status
from fastapi.routing import APIRouter
from sqlmodel import select

from app.api.deps import AsyncSessionDep, SessionDep, require_role
from app.models import (
    Activity,
    Assignment,
    AssignmentStudent,
    Book,
    Class,
    ClassStudent,
    Student,
    Teacher,
    User,
    UserRole,
)
from app.schemas.analytics import (
    PeriodType,
    StudentAnalyticsResponse,
    StudentProgressPeriod,
    StudentProgressResponse,
)
from app.schemas.assignment import StudentAssignmentResponse
from app.services import analytics_service

router = APIRouter(prefix="/students", tags=["students"])
logger = logging.getLogger(__name__)


@router.get(
    "/me/assignments",
    response_model=list[StudentAssignmentResponse],
    summary="Get student's assignments",
)
def get_student_assignments(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.student),
    status_filter: str | None = Query(None, alias="status"),
) -> list[StudentAssignmentResponse]:
    """
    Get all assignments for authenticated student.

    Query parameters:
        status: Filter by assignment status (not_started, in_progress, completed)

    Returns:
        List of assignments with enriched data (book, activity, progress)
    """
    # Get Student record from authenticated user
    result = session.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found"
        )

    # Build query: AssignmentStudent → Assignment → Book → Activity
    query = (
        select(AssignmentStudent, Assignment, Book, Activity)
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .join(Book, Assignment.book_id == Book.id)
        .join(Activity, Assignment.activity_id == Activity.id)
        .where(AssignmentStudent.student_id == student.id)
    )

    # Apply optional status filter
    if status_filter:
        # Validate status filter
        valid_statuses = ["not_started", "in_progress", "completed"]
        if status_filter not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter. Must be one of: {valid_statuses}"
            )
        query = query.where(AssignmentStudent.status == status_filter)

    # Execute query
    result = session.execute(query)
    rows = result.all()

    # Map results to StudentAssignmentResponse
    assignments = []
    for assignment_student, assignment, book, activity in rows:
        response = StudentAssignmentResponse(
            # Assignment fields
            assignment_id=assignment.id,
            assignment_name=assignment.name,
            instructions=assignment.instructions,
            due_date=assignment.due_date,
            time_limit_minutes=assignment.time_limit_minutes,
            created_at=assignment.created_at,

            # Book fields
            book_id=book.id,
            book_title=book.title,
            book_cover_url=book.cover_image_url,

            # Activity fields
            activity_id=activity.id,
            activity_title=activity.title,
            activity_type=activity.activity_type,

            # Student-specific fields
            status=assignment_student.status,
            score=assignment_student.score,
            started_at=assignment_student.started_at,
            completed_at=assignment_student.completed_at,
            time_spent_minutes=assignment_student.time_spent_minutes or 0,
        )
        assignments.append(response)

    return assignments


@router.get(
    "/me/progress",
    response_model=StudentProgressResponse,
    summary="Get student's own progress data",
)
async def get_student_progress(
    *,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.student),
    period: StudentProgressPeriod = Query(
        default="this_month",
        description="Time period for progress data"
    ),
) -> StudentProgressResponse:
    """
    Get comprehensive progress data for the authenticated student.

    This endpoint is student-facing and provides encouraging, achievement-focused
    analytics designed for student motivation.

    Query parameters:
        period: Time period for data filtering
            - 'this_week': Current week (Monday to today)
            - 'this_month': Current month (default)
            - 'all_time': All completed work

    Returns:
        Complete progress data including:
        - Summary stats (avg score, streak, improvement trend)
        - Score trend over time (for chart display)
        - Activity type breakdown with user-friendly labels
        - Recent assignments (last 5)
        - Achievements/badges earned
        - Study time statistics
        - Personalized improvement tips
    """
    # Get Student record from authenticated user
    result = await session.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found"
        )

    # Call analytics service
    try:
        progress = await analytics_service.get_student_progress(
            student_id=student.id,
            period=period,
            session=session,
        )
        return progress
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get(
    "/{student_id}/analytics",
    response_model=StudentAnalyticsResponse,
    summary="Get student performance analytics",
)
async def get_student_analytics(
    *,
    session: AsyncSessionDep,
    student_id: uuid.UUID,
    period: PeriodType = Query(default="30d", description="Time period for analytics"),
    current_user: User = require_role(UserRole.teacher),
) -> StudentAnalyticsResponse:
    """
    Get comprehensive performance analytics for a student.

    **Authorization:** Teacher must have access to student via their classes.

    Query parameters:
        period: Time period for data filtering
            - '7d': Last 7 days
            - '30d': Last 30 days (default)
            - '3m': Last 3 months
            - 'all': All time

    Returns:
        Complete analytics including:
        - Summary metrics (avg score, completion rate, streak)
        - Recent activity (last 10 assignments)
        - Performance trend over time
        - Activity type breakdown
        - Assignment status summary
        - Time analytics
    """
    # Get teacher record
    teacher_result = await session.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = teacher_result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found"
        )

    # Verify teacher has access to student via their classes
    # Check if student is in any of the teacher's classes
    access_check = await session.execute(
        select(ClassStudent.id)
        .join(Class, ClassStudent.class_id == Class.id)
        .where(
            Class.teacher_id == teacher.id,
            ClassStudent.student_id == student_id,
        )
        .limit(1)
    )
    has_access = access_check.scalar_one_or_none() is not None

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this student's data"
        )

    # Call analytics service
    try:
        analytics = await analytics_service.get_student_analytics(
            student_id=student_id,
            period=period,
            session=session,
        )
        return analytics
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
