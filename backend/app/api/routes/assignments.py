"""Assignment API endpoints - Stories 3.7, 5.3."""

import logging
import uuid
from datetime import UTC, datetime
from typing import Annotated

import jwt
from collections.abc import AsyncGenerator
from fastapi import Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRouter
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.api.deps import AsyncSessionDep, require_role
from app.core import security
from app.core.config import settings
from app.core.rate_limit import limiter
from app.models import (
    Activity,
    Assignment,
    AssignmentActivity,
    AssignmentPublishStatus,
    AssignmentStatus,
    AssignmentStudent,
    AssignmentStudentActivity,
    AssignmentStudentActivityStatus,
    Book,
    BookAccess,
    Class,
    ClassStudent,
    NotificationType,
    Student,
    Teacher,
    TeacherMaterial,
    TokenPayload,
    User,
    UserRole,
)
from app.schemas.analytics import (
    AssignmentDetailedResultsResponse,
    StudentAnswersResponse,
)
from app.schemas.assignment import (
    ActivityAnalyticsItem,
    ActivityInfo,
    ActivityPreviewResponse,
    ActivityProgressInfo,
    ActivityProgressSaveRequest,
    ActivityProgressSaveResponse,
    ActivityScoreItem,
    ActivityStartResponse,
    ActivityWithConfig,
    AdditionalResources,
    AdditionalResourcesResponse,
    AssignmentCreate,
    AssignmentListItem,
    AssignmentPreviewResponse,
    AssignmentResponse,
    AssignmentSaveProgressRequest,
    AssignmentSaveProgressResponse,
    AssignmentSubmissionResponse,
    AssignmentSubmitRequest,
    AssignmentUpdate,
    BulkAssignmentCreatedItem,
    BulkAssignmentCreateResponse,
    CalendarAssignmentItem,
    CalendarAssignmentsResponse,
    MultiActivityAnalyticsResponse,
    MultiActivityStartResponse,
    MultiActivitySubmitRequest,
    MultiActivitySubmitResponse,
    PerActivityScore,
    StudentActivityScore,
    StudentAssignmentResultResponse,
    TeacherMaterialResourceResponse,
)
from app.schemas.feedback import (
    FeedbackCreate,
    FeedbackPublic,
    FeedbackStudentView,
    FeedbackUpdate,
)
from app.services import book_assignment_service, feedback_service, notification_service
from app.services.dream_storage_client import (
    DreamCentralStorageClient,
    DreamStorageError,
    DreamStorageNotFoundError,
    get_dream_storage_client,
)
from app.services.analytics_service import (
    get_assignment_detailed_results,
    get_student_assignment_answers,
)

router = APIRouter(prefix="/assignments", tags=["assignments"])
logger = logging.getLogger(__name__)

# OAuth2 scheme for header-based auth (auto_error=False to allow fallback to query param)
_media_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False,
)


async def _verify_activity_access(
    session: AsyncSessionDep, activity_id: uuid.UUID, teacher: Teacher
) -> Activity:
    """
    Verify teacher has access to activity through BookAccess.

    Args:
        session: Database session
        activity_id: Activity ID to verify access for
        teacher: Teacher object (with school relationship loaded)

    Returns:
        Activity object if access verified

    Raises:
        HTTPException(404): Activity not found or no access
    """
    # Query Activity → Book → BookAccess
    result = await session.execute(
        select(Activity)
        .join(Book, Activity.book_id == Book.id)
        .join(BookAccess, Book.id == BookAccess.book_id)
        .where(
            Activity.id == activity_id,
            BookAccess.publisher_id == teacher.school.publisher_id,
        )
    )
    activity = result.scalar_one_or_none()

    if not activity:
        # Don't expose whether activity exists - security best practice
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )

    return activity


async def _verify_activities_access(
    session: AsyncSessionDep, activity_ids: list[uuid.UUID], teacher: Teacher
) -> list[Activity]:
    """
    Verify teacher has access to all activities through BookAssignment (Story 9.4).

    Args:
        session: Database session
        activity_ids: List of Activity IDs to verify access for
        teacher: Teacher object (with school relationship loaded)

    Returns:
        List of Activity objects if all access verified (in same order as input)

    Raises:
        HTTPException(404): Any activity not found
        HTTPException(403): Teacher doesn't have access to the book
    """
    if not activity_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one activity must be provided",
        )

    # Query all activities
    result = await session.execute(
        select(Activity).where(Activity.id.in_(activity_ids))
    )
    activities = result.scalars().all()

    # Verify all requested activities were found
    found_ids = {activity.id for activity in activities}
    missing_ids = set(activity_ids) - found_ids

    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more activities not found",
        )

    # Get unique book IDs from activities and verify teacher has access to each
    book_ids = {activity.book_id for activity in activities}
    for book_id in book_ids:
        has_access = await book_assignment_service.check_teacher_book_access(
            db=session,
            teacher_id=teacher.id,
            book_id=book_id,
        )
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to one or more of the selected books",
            )

    # Return activities in original order
    activity_map = {a.id: a for a in activities}
    return [activity_map[aid] for aid in activity_ids]


async def _get_target_students(
    session: AsyncSessionDep,
    student_ids: list[uuid.UUID] | None,
    class_ids: list[uuid.UUID] | None,
    teacher_id: uuid.UUID,
) -> list[Student]:
    """
    Get target students for assignment, expanding classes and validating ownership.

    Args:
        session: Database session
        student_ids: List of student IDs (optional)
        class_ids: List of class IDs (optional)
        teacher_id: Teacher ID for ownership validation

    Returns:
        List of unique Student objects

    Raises:
        HTTPException(403): Some students/classes don't belong to teacher
    """
    all_student_ids: set[uuid.UUID] = set()

    # Add direct student IDs
    if student_ids:
        all_student_ids.update(student_ids)

    # Expand class IDs to student IDs
    if class_ids:
        # Verify all classes belong to teacher
        result = await session.execute(
            select(Class).where(
                Class.id.in_(class_ids),
                Class.teacher_id == teacher_id,
            )
        )
        classes = result.scalars().all()

        if len(classes) != len(class_ids):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Some classes do not belong to you",
            )

        # Get students from classes
        result = await session.execute(
            select(ClassStudent.student_id).where(ClassStudent.class_id.in_(class_ids))
        )
        class_student_ids = result.scalars().all()
        all_student_ids.update(class_student_ids)

    # Verify all students belong to teacher (through their class enrollments)
    if all_student_ids:
        result = await session.execute(
            select(Student)
            .join(ClassStudent, Student.id == ClassStudent.student_id)
            .join(Class, ClassStudent.class_id == Class.id)
            .where(
                Student.id.in_(all_student_ids),
                Class.teacher_id == teacher_id,
            )
            .distinct()
        )
        students = result.scalars().all()

        if len(students) != len(all_student_ids):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Some students do not belong to your classes",
            )

        return list(students)

    return []


def _validate_due_date(due_date: datetime | None) -> None:
    """
    Validate due date is in the future if provided.

    Args:
        due_date: Due date to validate (optional)

    Raises:
        HTTPException(400): Due date is in the past
    """
    if due_date is not None and due_date < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Due date must be in the future",
        )


async def _validate_and_denormalize_teacher_materials(
    session: AsyncSessionDep,
    resources: AdditionalResources | None,
    teacher_id: uuid.UUID,
) -> AdditionalResources | None:
    """
    Validate teacher materials belong to the teacher and denormalize data.

    Story 13.3: Teacher Materials Assignment Integration.

    Args:
        session: Database session
        resources: Resources to validate
        teacher_id: Teacher's ID for ownership check

    Returns:
        Updated resources with denormalized material data

    Raises:
        HTTPException(404): Material not found or doesn't belong to teacher
    """
    if not resources or not resources.teacher_materials:
        return resources

    for mat_ref in resources.teacher_materials:
        # Fetch the actual material
        result = await session.execute(
            select(TeacherMaterial).where(
                TeacherMaterial.id == mat_ref.material_id,
                TeacherMaterial.teacher_id == teacher_id,
            )
        )
        material = result.scalar_one_or_none()

        if not material:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Material {mat_ref.material_id} not found or access denied",
            )

        # Update denormalized fields from actual material
        mat_ref.name = material.name
        mat_ref.material_type = material.type.value

    return resources


async def _enrich_resources(
    session: AsyncSessionDep,
    resources_dict: dict | None,
) -> AdditionalResourcesResponse | None:
    """
    Enrich resource references with current data and availability status.

    Story 13.3: Teacher Materials Assignment Integration.

    Args:
        session: Database session
        resources_dict: Raw resources dict from assignment

    Returns:
        Enriched resources response with availability status and download URLs
    """
    if not resources_dict:
        return None

    try:
        resources = AdditionalResources.model_validate(resources_dict)
    except Exception:
        # Invalid resources data - return empty
        return AdditionalResourcesResponse(videos=[], teacher_materials=[])

    enriched_materials: list[TeacherMaterialResourceResponse] = []

    for mat_ref in resources.teacher_materials:
        # Try to fetch current material data
        result = await session.execute(
            select(TeacherMaterial).where(TeacherMaterial.id == mat_ref.material_id)
        )
        material = result.scalar_one_or_none()

        if material:
            # Material exists - use current data
            enriched_materials.append(
                TeacherMaterialResourceResponse(
                    type="teacher_material",
                    material_id=mat_ref.material_id,
                    name=material.name,  # Use current name
                    material_type=material.type.value,
                    is_available=True,
                    file_size=material.file_size,
                    mime_type=material.mime_type,
                    url=material.url,
                    text_content=material.text_content,
                    download_url=f"/api/v1/teachers/materials/{material.id}/download"
                    if material.storage_path
                    else None,
                )
            )
        else:
            # Material was deleted - use cached/denormalized data
            enriched_materials.append(
                TeacherMaterialResourceResponse(
                    type="teacher_material",
                    material_id=mat_ref.material_id,
                    name=mat_ref.name,  # Use cached name
                    material_type=mat_ref.material_type,
                    is_available=False,
                )
            )

    return AdditionalResourcesResponse(
        videos=resources.videos,
        teacher_materials=enriched_materials,
    )


@router.get(
    "/",
    response_model=list[AssignmentListItem],
    summary="List teacher's assignments",
    description="Get all assignments created by the current teacher with enriched data",
)
async def list_assignments(
    *,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.teacher),
) -> list[AssignmentListItem]:
    """
    List all assignments for the current teacher with enriched data.

    Returns assignments with:
    - Book and activity information
    - Student completion statistics
    - Sorted by created_at descending (newest first)
    """
    # Get Teacher record
    result = await session.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user",
        )

    # Get all assignments for this teacher with joins to get book and activity info
    result = await session.execute(
        select(Assignment, Book, Activity)
        .join(Book, Assignment.book_id == Book.id)
        .join(Activity, Assignment.activity_id == Activity.id)
        .options(selectinload(Assignment.assignment_students))
        .where(Assignment.teacher_id == teacher.id)
        .order_by(Assignment.created_at.desc())
    )
    assignments_data = result.all()

    # Build response with enriched data
    assignment_list = []
    for assignment, book, activity in assignments_data:
        # Use pre-loaded assignment_students relationship (no N+1 query)
        assignment_students = assignment.assignment_students

        # Count by status
        total_students = len(assignment_students)
        not_started = sum(
            1 for s in assignment_students if s.status == AssignmentStatus.not_started
        )
        in_progress = sum(
            1 for s in assignment_students if s.status == AssignmentStatus.in_progress
        )
        completed = sum(
            1 for s in assignment_students if s.status == AssignmentStatus.completed
        )

        assignment_list.append(
            AssignmentListItem(
                id=assignment.id,
                name=assignment.name,
                instructions=assignment.instructions,
                due_date=assignment.due_date,
                time_limit_minutes=assignment.time_limit_minutes,
                created_at=assignment.created_at,
                book_id=book.id,
                book_title=book.title,
                activity_id=activity.id,
                activity_title=activity.title,
                activity_type=activity.activity_type,
                total_students=total_students,
                not_started=not_started,
                in_progress=in_progress,
                completed=completed,
            )
        )

    logger.info(f"Listed {len(assignment_list)} assignments for teacher_id={teacher.id}")

    return assignment_list


@router.get(
    "/admin/all",
    response_model=list[AssignmentListItem],
    summary="List all assignments (Admin only)",
    description="Get all assignments in the system with enriched data - admin access only",
)
async def list_all_assignments_admin(
    *,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.admin),
) -> list[AssignmentListItem]:
    """
    List all assignments in the system (admin only) with enriched data.

    Returns assignments with:
    - Book and activity information
    - Student completion statistics
    - Teacher information
    - Sorted by created_at descending (newest first)
    """
    # Get all assignments with joins to get book, activity, and teacher info
    result = await session.execute(
        select(Assignment, Book, Activity, Teacher, User)
        .join(Book, Assignment.book_id == Book.id)
        .join(Activity, Assignment.activity_id == Activity.id)
        .join(Teacher, Assignment.teacher_id == Teacher.id)
        .join(User, Teacher.user_id == User.id)
        .options(selectinload(Assignment.assignment_students))
        .order_by(Assignment.created_at.desc())
    )
    assignments_data = result.all()

    # Build response with enriched data
    assignment_list = []
    for assignment, book, activity, teacher, teacher_user in assignments_data:
        # Use pre-loaded assignment_students relationship (no N+1 query)
        assignment_students = assignment.assignment_students

        # Count by status
        total_students = len(assignment_students)
        not_started = sum(
            1 for as_ in assignment_students if as_.status == AssignmentStatus.not_started
        )
        in_progress = sum(
            1 for as_ in assignment_students if as_.status == AssignmentStatus.in_progress
        )
        completed = sum(
            1 for as_ in assignment_students if as_.status == AssignmentStatus.completed
        )

        assignment_list.append(
            AssignmentListItem(
                id=assignment.id,
                name=assignment.name,
                instructions=assignment.instructions,
                due_date=assignment.due_date,
                time_limit_minutes=assignment.time_limit_minutes,
                created_at=assignment.created_at,
                book_id=book.id,
                book_title=book.title,
                activity_id=activity.id,
                activity_title=activity.title,
                activity_type=activity.activity_type,
                total_students=total_students,
                not_started=not_started,
                in_progress=in_progress,
                completed=completed,
                teacher_name=teacher_user.full_name or "",  # Add teacher name for admin view
            )
        )

    logger.info(f"Admin listed {len(assignment_list)} assignments")

    return assignment_list


@router.get(
    "/calendar",
    response_model=CalendarAssignmentsResponse,
    summary="Get assignments for calendar view",
    description="Get assignments within a date range for calendar display. Teachers see all their assignments, including scheduled ones.",
)
async def get_calendar_assignments(
    *,
    session: AsyncSessionDep,
    start_date: datetime = Query(..., description="Start date for range (inclusive)"),
    end_date: datetime = Query(..., description="End date for range (inclusive)"),
    class_id: uuid.UUID | None = Query(None, description="Filter by class ID"),
    status_filter: AssignmentPublishStatus | None = Query(None, alias="status", description="Filter by status"),
    book_id: uuid.UUID | None = Query(None, description="Filter by book ID"),
    current_user: User = require_role(UserRole.teacher),
) -> CalendarAssignmentsResponse:
    """
    Get assignments for calendar view.

    **Query Parameters:**
    - start_date: Start of date range (required)
    - end_date: End of date range (required)
    - class_id: Optional filter by class
    - status: Optional filter by assignment status (draft, scheduled, published, archived)
    - book_id: Optional filter by book

    **Returns:**
    Assignments grouped by date within the specified range.
    Teachers see all their assignments regardless of status.
    """
    from collections import defaultdict

    from sqlalchemy import func as sql_func

    # Get Teacher record for current user
    result = await session.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user",
        )

    # Subquery to count activities per assignment
    activity_count_subq = (
        select(
            AssignmentActivity.assignment_id,
            sql_func.count(AssignmentActivity.activity_id).label("activity_count")
        )
        .group_by(AssignmentActivity.assignment_id)
        .subquery()
    )

    # Base query for teacher's assignments within date range
    # Show assignments based on due_date, scheduled_publish_date, OR created_at falling in range
    # This ensures all assignments appear on the calendar even without explicit dates
    query = (
        select(
            Assignment,
            Book,
            sql_func.coalesce(activity_count_subq.c.activity_count, 1).label("activity_count")
        )
        .join(Book, Assignment.book_id == Book.id)
        .outerjoin(
            activity_count_subq,
            activity_count_subq.c.assignment_id == Assignment.id
        )
        .where(Assignment.teacher_id == teacher.id)
        .where(
            # Include if due_date, scheduled_publish_date, OR created_at falls in range
            (
                (Assignment.due_date >= start_date) & (Assignment.due_date <= end_date)
            ) | (
                (Assignment.scheduled_publish_date >= start_date) & (Assignment.scheduled_publish_date <= end_date)
            ) | (
                (Assignment.created_at >= start_date) & (Assignment.created_at <= end_date)
            )
        )
    )

    # Apply optional filters
    if status_filter:
        query = query.where(Assignment.status == status_filter)

    if book_id:
        query = query.where(Assignment.book_id == book_id)

    # Execute query
    result = await session.execute(query)
    rows = result.all()

    # Get class names for each assignment
    assignment_class_map: dict[uuid.UUID, list[str]] = defaultdict(list)
    if rows:
        assignment_ids = [row[0].id for row in rows]

        # Query class names via AssignmentStudent → Student → ClassStudent → Class
        class_query = await session.execute(
            select(
                AssignmentStudent.assignment_id,
                Class.name
            )
            .join(Student, AssignmentStudent.student_id == Student.id)
            .join(ClassStudent, ClassStudent.student_id == Student.id)
            .join(Class, ClassStudent.class_id == Class.id)
            .where(AssignmentStudent.assignment_id.in_(assignment_ids))
            .distinct()
        )
        for assignment_id, class_name in class_query.all():
            if class_name not in assignment_class_map[assignment_id]:
                assignment_class_map[assignment_id].append(class_name)

    # Filter by class if specified
    if class_id:
        # Get student IDs in this class
        class_student_result = await session.execute(
            select(ClassStudent.student_id).where(ClassStudent.class_id == class_id)
        )
        class_student_ids = [row[0] for row in class_student_result.all()]

        # Filter assignments that have students from this class
        filtered_assignment_ids = set()
        for assignment_id in assignment_class_map.keys():
            assignment_students_result = await session.execute(
                select(AssignmentStudent.student_id)
                .where(AssignmentStudent.assignment_id == assignment_id)
                .where(AssignmentStudent.student_id.in_(class_student_ids))
            )
            if assignment_students_result.first():
                filtered_assignment_ids.add(assignment_id)

        rows = [row for row in rows if row[0].id in filtered_assignment_ids]

    # Group assignments by date (priority: due_date > scheduled_publish_date > created_at)
    assignments_by_date: dict[str, list[CalendarAssignmentItem]] = defaultdict(list)

    for row in rows:
        assignment = row[0]
        book = row[1]
        activity_count = row[2]

        # Use due_date as primary, scheduled_publish_date as secondary, created_at as fallback
        calendar_date = assignment.due_date or assignment.scheduled_publish_date or assignment.created_at
        date_key = calendar_date.strftime("%Y-%m-%d")

        calendar_item = CalendarAssignmentItem(
            id=assignment.id,
            name=assignment.name,
            due_date=assignment.due_date,
            scheduled_publish_date=assignment.scheduled_publish_date,
            status=assignment.status,
            activity_count=activity_count,
            class_names=assignment_class_map.get(assignment.id, []),
            book_id=book.id,
            book_title=book.title,
        )
        assignments_by_date[date_key].append(calendar_item)

    # Sort assignments within each day
    for date_key in assignments_by_date:
        assignments_by_date[date_key].sort(key=lambda a: a.due_date or a.scheduled_publish_date or datetime.min.replace(tzinfo=UTC))

    total_assignments = sum(len(items) for items in assignments_by_date.values())

    logger.info(
        f"Calendar query: teacher_id={teacher.id}, "
        f"range={start_date.date()}-{end_date.date()}, "
        f"assignments={total_assignments}"
    )

    return CalendarAssignmentsResponse(
        start_date=start_date.strftime("%Y-%m-%d"),
        end_date=end_date.strftime("%Y-%m-%d"),
        total_assignments=total_assignments,
        assignments_by_date=dict(assignments_by_date),
    )


@router.post(
    "/",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new assignment",
    description="Creates a new assignment and assigns it to specified students/classes. Supports single or multi-activity assignments.",
)
async def create_assignment(
    *,
    session: AsyncSessionDep,
    assignment_in: AssignmentCreate,
    current_user: User = require_role(UserRole.teacher),
) -> AssignmentResponse:
    """
    Create a new assignment.

    **Workflow:**
    1. Validate teacher has access to all activities through BookAccess
    2. Validate all selected students/classes belong to teacher
    3. Validate due_date is in future (if provided)
    4. Create Assignment record
    5. Create AssignmentActivity records for each activity
    6. Create AssignmentStudent records for all target students
    7. Create AssignmentStudentActivity records for each student × activity

    **Request Body:**
    - **activity_id**: UUID of single activity (legacy, backward compatible)
    - **activity_ids**: List of activity UUIDs for multi-activity assignment
    - **book_id**: UUID of book containing activities
    - **name**: Assignment name (max 500 chars)
    - **instructions**: Optional special instructions
    - **due_date**: Optional deadline (must be in future)
    - **time_limit_minutes**: Optional time limit (must be > 0)
    - **student_ids**: List of student UUIDs (required if no class_ids)
    - **class_ids**: List of class UUIDs (required if no student_ids)

    **Returns:**
    Assignment object with student_count and activities list
    """
    # Get Teacher record for current user
    result = await session.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user",
        )

    # Load school relationship for publisher_id access
    await session.refresh(teacher, ["school"])

    # Get activity IDs (handles both single and multi-activity)
    activity_ids = assignment_in.get_activity_ids()

    # Validate teacher has access to all activities
    activities = await _verify_activities_access(session, activity_ids, teacher)

    # Validate due_date is in future (Pydantic also validates, but double-check)
    _validate_due_date(assignment_in.due_date)

    # Get target students (validates ownership)
    students = await _get_target_students(
        session,
        assignment_in.student_ids,
        assignment_in.class_ids,
        teacher.id,
    )

    if not students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid students selected for assignment",
        )

    # Story 13.3: Validate and denormalize teacher materials
    validated_resources = await _validate_and_denormalize_teacher_materials(
        session, assignment_in.resources, teacher.id
    )

    # Create Assignment record
    now = datetime.now(UTC)
    # Keep activity_id for backward compatibility (set to first activity if multi)
    first_activity_id = activity_ids[0] if activity_ids else None

    # Determine assignment status based on scheduled_publish_date
    if (
        assignment_in.scheduled_publish_date is not None
        and assignment_in.scheduled_publish_date > now
    ):
        assignment_status = AssignmentPublishStatus.scheduled
    else:
        assignment_status = AssignmentPublishStatus.published

    assignment = Assignment(
        teacher_id=teacher.id,
        activity_id=first_activity_id,  # Backward compatible - first activity
        book_id=assignment_in.book_id,
        name=assignment_in.name,
        instructions=assignment_in.instructions,
        due_date=assignment_in.due_date,
        time_limit_minutes=assignment_in.time_limit_minutes,
        scheduled_publish_date=assignment_in.scheduled_publish_date,
        status=assignment_status,
        video_path=assignment_in.video_path,  # Story 10.3: Video attachment (deprecated)
        resources=validated_resources.model_dump(mode="json") if validated_resources else None,  # Story 10.3+/13.3: Additional resources
        created_at=now,
        updated_at=now,
    )
    session.add(assignment)
    await session.flush()  # Get assignment.id for related records

    # Create AssignmentActivity records for each activity (junction table)
    for order_index, activity in enumerate(activities):
        assignment_activity = AssignmentActivity(
            assignment_id=assignment.id,
            activity_id=activity.id,
            order_index=order_index,
        )
        session.add(assignment_activity)

    # Create AssignmentStudent and AssignmentStudentActivity records
    for student in students:
        assignment_student = AssignmentStudent(
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.not_started,
            score=None,
            answers_json=None,
            progress_json=None,
            started_at=None,
            completed_at=None,
            time_spent_minutes=0,
            last_saved_at=None,
        )
        session.add(assignment_student)
        await session.flush()  # Get assignment_student.id

        # Create per-activity progress records
        for activity in activities:
            activity_progress = AssignmentStudentActivity(
                assignment_student_id=assignment_student.id,
                activity_id=activity.id,
                status=AssignmentStudentActivityStatus.not_started,
                score=None,
                max_score=100.0,  # Default max score
                response_data=None,
                started_at=None,
                completed_at=None,
            )
            session.add(activity_progress)

    # Commit transaction
    await session.commit()
    await session.refresh(assignment)

    # Create notifications for all assigned students (only for published assignments)
    if assignment_status == AssignmentPublishStatus.published:
        for student in students:
            # Get the user_id for the student
            student_user_id = student.user_id
            if student_user_id:
                await notification_service.create_notification(
                    db=session,
                    user_id=student_user_id,
                    notification_type=NotificationType.assignment_created,
                    title=f"New Assignment: {assignment.name}",
                    message=f"You have been assigned '{assignment.name}'. "
                    + (f"Due: {assignment.due_date.strftime('%b %d, %Y')}" if assignment.due_date else "No due date"),
                    link=f"/student/assignments/{assignment.id}",
                )

    # Build response with activities info
    activities_info = [
        ActivityInfo(
            id=activity.id,
            title=activity.title,
            activity_type=activity.activity_type.value,
            order_index=idx,
        )
        for idx, activity in enumerate(activities)
    ]

    assignment_response = AssignmentResponse(
        id=assignment.id,
        teacher_id=assignment.teacher_id,
        book_id=assignment.book_id,
        name=assignment.name,
        instructions=assignment.instructions,
        due_date=assignment.due_date,
        time_limit_minutes=assignment.time_limit_minutes,
        scheduled_publish_date=assignment.scheduled_publish_date,
        status=assignment.status,
        video_path=assignment.video_path,  # Story 10.3
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
        student_count=len(students),
        activity_id=first_activity_id,
        activities=activities_info,
        activity_count=len(activities),
    )

    logger.info(
        f"Assignment created: id={assignment.id}, teacher_id={teacher.id}, "
        f"activities={len(activities)}, students={len(students)}"
    )

    return assignment_response


@router.post(
    "/bulk",
    response_model=BulkAssignmentCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create bulk assignments (Time Planning mode)",
    description="Creates multiple assignments from date groups. Each date group becomes a separate assignment with its own scheduled publish date.",
)
async def create_bulk_assignments(
    *,
    session: AsyncSessionDep,
    assignment_in: AssignmentCreate,
    current_user: User = require_role(UserRole.teacher),
) -> BulkAssignmentCreateResponse:
    """
    Create multiple assignments using Time Planning mode.

    **Time Planning Mode:**
    Each date group in the request creates a separate assignment with:
    - scheduled_publish_date: When the assignment becomes visible to students
    - due_date: Optional deadline for that specific group
    - time_limit_minutes: Optional time limit for that group
    - activity_ids: Activities included in that assignment

    **Workflow:**
    1. Validate teacher has access to all activities in all groups
    2. Validate all selected students/classes belong to teacher
    3. For each date group:
       - Create Assignment with scheduled_publish_date from group.date
       - Set status to 'scheduled' if date is in future, 'published' if now/past
       - Create AssignmentActivity records for each activity
       - Create AssignmentStudent records for all target students
       - Create AssignmentStudentActivity records for each student × activity

    **Request Body:**
    - **date_groups**: List of date groups (required for Time Planning)
    - **book_id**: UUID of book containing activities
    - **name**: Base assignment name (date will be appended)
    - **instructions**: Optional special instructions
    - **student_ids**: List of student UUIDs (required if no class_ids)
    - **class_ids**: List of class UUIDs (required if no student_ids)

    **Returns:**
    BulkAssignmentCreateResponse with list of created assignments
    """
    # Validate date_groups is provided
    if not assignment_in.date_groups or len(assignment_in.date_groups) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_groups is required for bulk assignment creation",
        )

    # Get Teacher record for current user
    result = await session.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user",
        )

    # Load school relationship for publisher_id access
    await session.refresh(teacher, ["school"])

    # Collect all activity IDs from all date groups
    all_activity_ids: set[uuid.UUID] = set()
    for group in assignment_in.date_groups:
        all_activity_ids.update(group.activity_ids)

    # Validate teacher has access to all activities
    all_activities = await _verify_activities_access(
        session, list(all_activity_ids), teacher
    )
    activity_map = {a.id: a for a in all_activities}

    # Get target students (validates ownership)
    students = await _get_target_students(
        session,
        assignment_in.student_ids,
        assignment_in.class_ids,
        teacher.id,
    )

    if not students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid students selected for assignment",
        )

    now = datetime.now(UTC)
    created_assignments: list[BulkAssignmentCreatedItem] = []

    # Create one assignment per date group
    for group in assignment_in.date_groups:
        # Determine assignment status based on scheduled_publish_date
        if group.scheduled_publish_date > now:
            assignment_status = AssignmentPublishStatus.scheduled
        else:
            assignment_status = AssignmentPublishStatus.published

        # Get activities for this group in order
        group_activities = [activity_map[aid] for aid in group.activity_ids]
        first_activity_id = group.activity_ids[0] if group.activity_ids else None

        # Format name with date
        date_str = group.scheduled_publish_date.strftime("%b %d")
        assignment_name = f"{assignment_in.name} - {date_str}"

        # Create Assignment record
        assignment = Assignment(
            teacher_id=teacher.id,
            activity_id=first_activity_id,  # Backward compatible - first activity
            book_id=assignment_in.book_id,
            name=assignment_name,
            instructions=assignment_in.instructions,
            due_date=group.due_date,
            time_limit_minutes=group.time_limit_minutes,
            scheduled_publish_date=group.scheduled_publish_date,
            status=assignment_status,
            video_path=assignment_in.video_path,  # Story 10.3: Video attachment (deprecated)
            resources=assignment_in.resources.model_dump() if assignment_in.resources else None,  # Story 10.3+: Additional resources
            created_at=now,
            updated_at=now,
        )
        session.add(assignment)
        await session.flush()  # Get assignment.id

        # Create AssignmentActivity records for each activity
        for order_index, activity in enumerate(group_activities):
            assignment_activity = AssignmentActivity(
                assignment_id=assignment.id,
                activity_id=activity.id,
                order_index=order_index,
            )
            session.add(assignment_activity)

        # Create AssignmentStudent and AssignmentStudentActivity records
        for student in students:
            assignment_student = AssignmentStudent(
                assignment_id=assignment.id,
                student_id=student.id,
                status=AssignmentStatus.not_started,
                score=None,
                answers_json=None,
                progress_json=None,
                started_at=None,
                completed_at=None,
                time_spent_minutes=0,
                last_saved_at=None,
            )
            session.add(assignment_student)
            await session.flush()

            # Create per-activity progress records
            for activity in group_activities:
                activity_progress = AssignmentStudentActivity(
                    assignment_student_id=assignment_student.id,
                    activity_id=activity.id,
                    status=AssignmentStudentActivityStatus.not_started,
                    score=None,
                    max_score=100.0,
                    response_data=None,
                    started_at=None,
                    completed_at=None,
                )
                session.add(activity_progress)

        # Send notifications for published assignments
        if assignment_status == AssignmentPublishStatus.published:
            for student in students:
                if student.user_id:
                    await notification_service.create_notification(
                        db=session,
                        user_id=student.user_id,
                        notification_type=NotificationType.assignment_created,
                        title=f"New Assignment: {assignment_name}",
                        message=f"You have been assigned '{assignment_name}'. "
                        + (f"Due: {group.due_date.strftime('%b %d, %Y')}" if group.due_date else "No due date"),
                        link=f"/student/assignments/{assignment.id}",
                    )

        created_assignments.append(
            BulkAssignmentCreatedItem(
                id=assignment.id,
                name=assignment_name,
                scheduled_publish_date=group.scheduled_publish_date,
                due_date=group.due_date,
                status=assignment_status,
                activity_count=len(group_activities),
            )
        )

    # Commit all assignments
    await session.commit()

    logger.info(
        f"Bulk assignments created: teacher_id={teacher.id}, "
        f"count={len(created_assignments)}, students={len(students)}"
    )

    return BulkAssignmentCreateResponse(
        success=True,
        message=f"Successfully created {len(created_assignments)} assignments",
        total_created=len(created_assignments),
        assignments=created_assignments,
    )


@router.patch(
    "/{assignment_id}",
    response_model=AssignmentResponse,
    summary="Update assignment",
    description="Update editable fields of an assignment (teacher can only update their own assignments)",
)
async def update_assignment(
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    assignment_in: AssignmentUpdate,
    current_user: User = require_role(UserRole.teacher),
) -> Assignment:
    """
    Update an existing assignment.

    **Editable fields:**
    - name
    - instructions
    - due_date (must be in future if provided)
    - time_limit_minutes (must be > 0 if provided)
    - scheduled_publish_date
    - status
    - activity_ids (Story 9.8: modify activities - add/remove/reorder)

    **Activity modification rules (Story 9.8):**
    - All new activities must be from the same book as the assignment
    - At least one activity required
    - Shows warning if removing activities that have student progress (handled in frontend)

    **Immutable fields (cannot change after creation):**
    - teacher_id
    - book_id
    - student assignments (recipients)

    **Authorization:**
    Teachers can only update their own assignments.

    **Returns:**
    Updated assignment with student_count.
    """
    # Get Teacher record for current user with school for book access check
    result = await session.execute(
        select(Teacher)
        .options(selectinload(Teacher.school))
        .where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user",
        )

    # Get assignment and verify ownership
    result = await session.execute(
        select(Assignment).where(
            Assignment.id == assignment_id,
            Assignment.teacher_id == teacher.id,
        )
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        # Don't expose whether assignment exists - security best practice
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    # Update only provided fields (partial update)
    update_data = assignment_in.model_dump(exclude_unset=True)

    # Story 9.8: Handle activity_ids separately
    new_activity_ids = update_data.pop("activity_ids", None)

    # Story 13.3: Handle resources separately for validation
    new_resources = update_data.pop("resources", None)

    for field, value in update_data.items():
        setattr(assignment, field, value)

    # Story 13.3: Validate and save resources if provided
    if new_resources is not None:
        if new_resources:
            # Convert dict back to Pydantic model for validation
            resources_model = AdditionalResources.model_validate(new_resources)
            validated_resources = await _validate_and_denormalize_teacher_materials(
                session, resources_model, teacher.id
            )
            assignment.resources = validated_resources.model_dump(mode="json") if validated_resources else None
        else:
            # Clear resources if empty dict/None
            assignment.resources = None

    # Story 9.8: Update activities if provided
    if new_activity_ids is not None:
        # Verify all activities are from the same book
        result = await session.execute(
            select(Activity).where(Activity.id.in_(new_activity_ids))
        )
        new_activities = result.scalars().all()

        if len(new_activities) != len(new_activity_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more activities not found",
            )

        # Verify all activities belong to the same book as the assignment
        for activity in new_activities:
            if activity.book_id != assignment.book_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="All activities must be from the same book as the assignment",
                )

        # Remove existing assignment activities
        result = await session.execute(
            select(AssignmentActivity).where(
                AssignmentActivity.assignment_id == assignment.id
            )
        )
        old_assignment_activities = result.scalars().all()
        for aa in old_assignment_activities:
            await session.delete(aa)

        # Create new assignment activities with order
        activity_map = {a.id: a for a in new_activities}
        for order_idx, activity_id in enumerate(new_activity_ids):
            activity = activity_map[activity_id]
            assignment_activity = AssignmentActivity(
                assignment_id=assignment.id,
                activity_id=activity_id,
                order_index=order_idx,
            )
            session.add(assignment_activity)

        # Update legacy activity_id field to first activity for backward compatibility
        assignment.activity_id = new_activity_ids[0]

        logger.info(
            f"Assignment activities updated: assignment_id={assignment.id}, "
            f"activity_count={len(new_activity_ids)}"
        )

    # Update timestamp
    assignment.updated_at = datetime.now(UTC)

    # Commit transaction
    await session.commit()

    # Re-fetch assignment with assignment_activities and nested activity eagerly loaded
    # to avoid lazy load errors when accessing the activities property
    result = await session.execute(
        select(Assignment)
        .options(selectinload(Assignment.assignment_activities).selectinload(AssignmentActivity.activity))
        .where(Assignment.id == assignment.id)
    )
    assignment = result.scalar_one()

    # Count assigned students for response
    result = await session.execute(
        select(AssignmentStudent).where(AssignmentStudent.assignment_id == assignment.id)
    )
    student_count = len(result.scalars().all())

    assignment_response = AssignmentResponse.model_validate(assignment)
    assignment_response.student_count = student_count

    logger.info(
        f"Assignment updated: id={assignment.id}, teacher_id={teacher.id}, "
        f"fields={list(update_data.keys())}"
    )

    return assignment_response


@router.delete(
    "/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete assignment",
    description="Delete an assignment (teacher can only delete their own assignments)",
)
async def delete_assignment(
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher),
) -> None:
    """
    Delete an existing assignment.

    **Cascade behavior:**
    Deleting an assignment will automatically delete all associated
    AssignmentStudent records due to cascade delete configuration.

    **Authorization:**
    Teachers can only delete their own assignments.

    **Returns:**
    204 No Content on success
    """
    # Get Teacher record for current user
    result = await session.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user",
        )

    # Get assignment and verify ownership
    result = await session.execute(
        select(Assignment).where(
            Assignment.id == assignment_id,
            Assignment.teacher_id == teacher.id,
        )
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        # Don't expose whether assignment exists - security best practice
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    # Delete assignment (cascade will remove AssignmentStudent records)
    await session.delete(assignment)
    await session.commit()

    logger.info(
        f"Assignment deleted: id={assignment_id}, teacher_id={teacher.id}"
    )

    # Return 204 No Content (FastAPI handles this automatically)


@router.get(
    "/{assignment_id}/start",
    response_model=ActivityStartResponse,
    summary="Start assignment",
    description="Start an assignment - marks as in_progress and returns full activity configuration",
)
async def start_assignment(
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    current_user: User = require_role(UserRole.student),
) -> ActivityStartResponse:
    """
    Start an assignment for the current student.

    **Workflow:**
    1. Verify assignment exists and is assigned to student
    2. Check assignment is not already completed (409 if completed)
    3. If status is 'not_started', update to 'in_progress' and set started_at
    4. Return full activity configuration with book and student progress data

    **Authorization:**
    Only students can start assignments assigned to them.

    **Returns:**
    ActivityStartResponse with assignment details, activity config, and student progress.

    **Status Codes:**
    - 200: Assignment started or resumed successfully
    - 404: Assignment not found or not assigned to student
    - 409: Assignment already completed
    """
    # Get Student record for current user
    result = await session.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found for this user",
        )

    # Query AssignmentStudent with joins to Assignment, Book, Activity
    result = await session.execute(
        select(AssignmentStudent, Assignment, Book, Activity)
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .join(Book, Assignment.book_id == Book.id)
        .join(Activity, Assignment.activity_id == Activity.id)
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.student_id == student.id,
        )
    )
    assignment_data = result.one_or_none()

    if not assignment_data:
        # Don't expose whether assignment exists - security best practice
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    assignment_student, assignment, book, activity = assignment_data

    # Check if assignment is published (students can't access scheduled assignments)
    if assignment.status != AssignmentPublishStatus.published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    # Check if assignment is already completed
    if assignment_student.status == AssignmentStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assignment already completed",
        )

    # If status is 'not_started', update to 'in_progress' and set started_at
    if assignment_student.status == AssignmentStatus.not_started:
        assignment_student.status = AssignmentStatus.in_progress
        assignment_student.started_at = datetime.now(UTC)
        await session.commit()
        await session.refresh(assignment_student)

    # Build response
    response = ActivityStartResponse(
        assignment_id=assignment.id,
        assignment_name=assignment.name,
        instructions=assignment.instructions,
        due_date=assignment.due_date,
        time_limit_minutes=assignment.time_limit_minutes,
        book_id=book.id,
        book_title=book.title,
        book_name=book.book_name,  # Story 4.2: For Dream Central Storage image URLs
        publisher_name=book.publisher_name,  # Story 4.2: For Dream Central Storage image URLs
        book_cover_url=book.cover_image_url,
        activity_id=activity.id,
        activity_title=activity.title,
        activity_type=activity.activity_type.value,
        config_json=activity.config_json,
        current_status=assignment_student.status.value,
        time_spent_minutes=assignment_student.time_spent_minutes,
        progress_json=assignment_student.progress_json,
    )

    logger.info(
        f"Assignment started: id={assignment.id}, student_id={student.id}, "
        f"status={assignment_student.status.value}"
    )

    return response


@router.get(
    "/{assignment_id}/start-multi",
    response_model=MultiActivityStartResponse,
    summary="Start multi-activity assignment",
    description="Start a multi-activity assignment - returns all activities with configs and progress",
)
async def start_multi_activity_assignment(
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    current_user: User = require_role(UserRole.student),
) -> MultiActivityStartResponse:
    """
    Start a multi-activity assignment for the current student.

    **Workflow:**
    1. Verify assignment exists and is assigned to student
    2. Check assignment is not already completed (409 if completed)
    3. Get all activities linked to this assignment via AssignmentActivity
    4. Initialize AssignmentStudentActivity records for each activity if not exist
    5. If status is 'not_started', update to 'in_progress' and set started_at
    6. Return all activities with their configs and per-activity progress

    **Authorization:**
    Only students can start assignments assigned to them.

    **Returns:**
    MultiActivityStartResponse with all activities, configs, and progress.

    **Status Codes:**
    - 200: Assignment started or resumed successfully
    - 404: Assignment not found or not assigned to student
    - 409: Assignment already completed
    """
    # Get Student record for current user
    result = await session.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found for this user",
        )

    # Get AssignmentStudent with Assignment and Book
    result = await session.execute(
        select(AssignmentStudent, Assignment, Book)
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .join(Book, Assignment.book_id == Book.id)
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.student_id == student.id,
        )
    )
    assignment_data = result.one_or_none()

    if not assignment_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    assignment_student, assignment, book = assignment_data

    # Check if assignment is published (students can't access scheduled assignments)
    if assignment.status != AssignmentPublishStatus.published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    # Check if assignment is already completed
    if assignment_student.status == AssignmentStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assignment already completed",
        )

    # Get all activities linked to this assignment via AssignmentActivity junction table
    result = await session.execute(
        select(AssignmentActivity, Activity)
        .join(Activity, AssignmentActivity.activity_id == Activity.id)
        .where(AssignmentActivity.assignment_id == assignment_id)
        .order_by(AssignmentActivity.order_index)
    )
    assignment_activities = result.all()

    if not assignment_activities:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No activities found for this assignment",
        )

    # Build activities list with configs
    activities: list[ActivityWithConfig] = []
    activity_ids: list[uuid.UUID] = []

    for aa, activity in assignment_activities:
        activities.append(
            ActivityWithConfig(
                id=activity.id,
                title=activity.title,
                activity_type=activity.activity_type.value,
                config_json=activity.config_json or {},
                order_index=aa.order_index,
            )
        )
        activity_ids.append(activity.id)

    # Get existing AssignmentStudentActivity records
    result = await session.execute(
        select(AssignmentStudentActivity).where(
            AssignmentStudentActivity.assignment_student_id == assignment_student.id,
            AssignmentStudentActivity.activity_id.in_(activity_ids),
        )
    )
    existing_progress = {ap.activity_id: ap for ap in result.scalars().all()}

    # Initialize missing AssignmentStudentActivity records
    activity_progress: list[ActivityProgressInfo] = []
    for activity in activities:
        if activity.id in existing_progress:
            ap = existing_progress[activity.id]
            activity_progress.append(
                ActivityProgressInfo(
                    id=ap.id,
                    activity_id=ap.activity_id,
                    status=ap.status.value,
                    score=ap.score,
                    max_score=ap.max_score,
                    response_data=ap.response_data,
                    started_at=ap.started_at,
                    completed_at=ap.completed_at,
                )
            )
        else:
            # Create new AssignmentStudentActivity record
            new_progress = AssignmentStudentActivity(
                assignment_student_id=assignment_student.id,
                activity_id=activity.id,
                status=AssignmentStudentActivityStatus.not_started,
                max_score=100.0,
            )
            session.add(new_progress)
            await session.flush()  # Get the ID

            activity_progress.append(
                ActivityProgressInfo(
                    id=new_progress.id,
                    activity_id=new_progress.activity_id,
                    status=new_progress.status.value,
                    score=None,
                    max_score=new_progress.max_score,
                    response_data=None,
                    started_at=None,
                    completed_at=None,
                )
            )

    # Update assignment status if not_started
    if assignment_student.status == AssignmentStatus.not_started:
        assignment_student.status = AssignmentStatus.in_progress
        assignment_student.started_at = datetime.now(UTC)

    await session.commit()
    await session.refresh(assignment_student)

    # Story 13.3: Enrich resources with availability status for students
    enriched_resources = await _enrich_resources(session, assignment.resources)

    # Build response
    response = MultiActivityStartResponse(
        assignment_id=assignment.id,
        assignment_name=assignment.name,
        instructions=assignment.instructions,
        due_date=assignment.due_date,
        time_limit_minutes=assignment.time_limit_minutes,
        book_id=book.id,
        book_title=book.title,
        book_name=book.book_name,
        publisher_name=book.publisher_name,
        book_cover_url=book.cover_image_url,
        activities=activities,
        activity_progress=activity_progress,
        total_activities=len(activities),
        current_status=assignment_student.status.value,
        time_spent_minutes=assignment_student.time_spent_minutes,
        started_at=assignment_student.started_at,
        video_path=assignment.video_path,  # Story 10.3: Video attachment
        resources=enriched_resources,  # Story 10.3+/13.3: Enriched resources with availability
    )

    logger.info(
        f"Multi-activity assignment started: id={assignment.id}, "
        f"student_id={student.id}, activities={len(activities)}"
    )

    return response


@router.get(
    "/{assignment_id}/materials/{material_id}/download",
    summary="Stream teacher material for viewing",
    description="Stream a teacher material attached to an assignment. Students can access materials attached to assignments they're assigned to. Teachers can access materials on their own assignments.",
)
async def download_assignment_material(
    *,
    session: AsyncSessionDep,
    dcs_client: DreamCentralStorageClient = Depends(get_dream_storage_client),
    assignment_id: uuid.UUID,
    material_id: uuid.UUID,
    header_token: Annotated[str | None, Depends(_media_oauth2_scheme)] = None,
    query_token: Annotated[str | None, Query(alias="token")] = None,
    range_header: Annotated[str | None, Header(alias="Range")] = None,
) -> StreamingResponse:
    """
    Stream a teacher material attached to an assignment for viewing.

    Story 13.3: Teacher Materials Assignment Integration.

    **Authentication:**
    - Header: `Authorization: Bearer <token>` (for fetch/axios requests)
    - Query param: `?token=<token>` (for HTML5 video/audio/img elements)

    **Authorization:**
    - Students: Must be assigned to the assignment, assignment must be published
    - Teachers: Must own the assignment
    - Material must be attached to the assignment
    - Material must still exist (is_available=true)

    **Returns:**
    Streaming file for inline viewing (video, audio, image, document)

    **Status Codes:**
    - 200: File stream
    - 400: Material type cannot be streamed (URL/text_note)
    - 401: Not authenticated
    - 403: Not authorized to access this assignment
    - 404: Assignment/material not found or not attached
    """
    # Authenticate user - support both header and query param token
    token = header_token or query_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    user_id = uuid.UUID(token_data.sub) if isinstance(token_data.sub, str) else token_data.sub
    current_user = await session.get(User, user_id)
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Verify user role
    if current_user.role not in [UserRole.student, UserRole.teacher]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    assignment = None

    if current_user.role == UserRole.student:
        # Get Student record
        result = await session.execute(
            select(Student).where(Student.user_id == current_user.id)
        )
        student = result.scalar_one_or_none()

        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student record not found",
            )

        # Verify student is assigned to this assignment
        result = await session.execute(
            select(AssignmentStudent, Assignment)
            .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
            .where(
                AssignmentStudent.assignment_id == assignment_id,
                AssignmentStudent.student_id == student.id,
            )
        )
        assignment_data = result.one_or_none()

        if not assignment_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found",
            )

        assignment_student, assignment = assignment_data

        # Verify assignment is published for students
        if assignment.status != AssignmentPublishStatus.published:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found",
            )
    else:
        # Teacher - verify they own the assignment
        result = await session.execute(
            select(Teacher).where(Teacher.user_id == current_user.id)
        )
        teacher = result.scalar_one_or_none()

        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher record not found",
            )

        result = await session.execute(
            select(Assignment).where(
                Assignment.id == assignment_id,
                Assignment.teacher_id == teacher.id,
            )
        )
        assignment = result.scalar_one_or_none()

        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found",
            )

    # Verify material is attached to this assignment
    if not assignment.resources:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not attached to this assignment",
        )

    try:
        resources = AdditionalResources.model_validate(assignment.resources)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not attached to this assignment",
        )

    # Check if material is in the attached materials
    material_attached = any(
        str(mat.material_id) == str(material_id)
        for mat in resources.teacher_materials
    )

    if not material_attached:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not attached to this assignment",
        )

    # Get the actual material
    result = await session.execute(
        select(TeacherMaterial).where(TeacherMaterial.id == material_id)
    )
    material = result.scalar_one_or_none()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material no longer available",
        )

    # URLs and text notes cannot be downloaded (they're accessed differently)
    from app.models import MaterialType
    if material.type in [MaterialType.url, MaterialType.text_note]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URLs and text notes cannot be downloaded",
        )

    if not material.storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material file not found",
        )

    # Get file size for Range support
    try:
        file_size = await dcs_client.get_teacher_material_size(
            teacher_id=str(material.teacher_id),
            storage_path=material.storage_path,
        )
    except DreamStorageNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage",
        )
    except DreamStorageError as e:
        logger.error(f"Failed to get material size: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to access file",
        )

    # Parse range if provided
    start = 0
    end = file_size - 1
    is_range_request = False

    if range_header:
        is_range_request = True
        # Parse "bytes=start-end" format
        try:
            range_spec = range_header.replace("bytes=", "")
            if range_spec.startswith("-"):
                # Last N bytes: bytes=-500
                suffix_length = int(range_spec[1:])
                start = max(0, file_size - suffix_length)
                end = file_size - 1
            elif range_spec.endswith("-"):
                # From start to end: bytes=1024-
                start = int(range_spec[:-1])
                end = file_size - 1
            else:
                # Specific range: bytes=0-1023
                range_parts = range_spec.split("-")
                start = int(range_parts[0])
                end = int(range_parts[1]) if range_parts[1] else file_size - 1

            # Validate range
            if start > end or start >= file_size:
                raise HTTPException(
                    status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                    detail="Invalid range",
                    headers={"Content-Range": f"bytes */{file_size}"},
                )
            end = min(end, file_size - 1)
        except (ValueError, IndexError):
            # Invalid range format, ignore and serve full file
            is_range_request = False
            start = 0
            end = file_size - 1

    content_length = end - start + 1

    # Create streaming generator
    async def stream_generator() -> AsyncGenerator[bytes, None]:
        try:
            async for chunk in dcs_client.stream_teacher_material(
                teacher_id=str(material.teacher_id),
                storage_path=material.storage_path,
                start=start,
                end=end,
            ):
                yield chunk
        except DreamStorageError as e:
            logger.error(f"Error streaming material: {e}")
            raise

    # Prepare filename for Content-Disposition (RFC 5987 for non-ASCII)
    filename = material.original_filename or material.name
    # ASCII fallback - replace non-ASCII chars
    ascii_filename = filename.encode("ascii", errors="replace").decode("ascii").replace("?", "_")
    ascii_filename = ascii_filename.replace('"', "'").replace("\n", " ")
    # UTF-8 encoded filename for modern browsers
    from urllib.parse import quote
    utf8_filename = quote(filename, safe="")

    logger.info(
        f"Material streamed: assignment_id={assignment_id}, "
        f"material_id={material_id}, user_id={current_user.id}, range={range_header}"
    )

    # Build response headers with RFC 5987 filename encoding
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Disposition": f"inline; filename=\"{ascii_filename}\"; filename*=UTF-8''{utf8_filename}",
        "Cache-Control": "max-age=86400",  # 24 hours
    }

    content_type = material.mime_type or "application/octet-stream"

    if is_range_request:
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
        return StreamingResponse(
            stream_generator(),
            status_code=status.HTTP_206_PARTIAL_CONTENT,
            media_type=content_type,
            headers=headers,
        )
    else:
        return StreamingResponse(
            stream_generator(),
            status_code=status.HTTP_200_OK,
            media_type=content_type,
            headers=headers,
        )


@router.patch(
    "/{assignment_id}/students/me/activities/{activity_id}",
    response_model=ActivityProgressSaveResponse,
    summary="Save per-activity progress",
    description="Save progress for a specific activity in a multi-activity assignment (Rate limited: 120 req/hour)",
)
@limiter.limit("120/hour")
async def save_activity_progress(
    request: Request,
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    activity_id: uuid.UUID,
    progress: ActivityProgressSaveRequest,
    current_user: User = require_role(UserRole.student),
) -> ActivityProgressSaveResponse:
    """
    Save progress for a specific activity within a multi-activity assignment.

    **Workflow:**
    1. Verify student is assigned to this assignment
    2. Verify activity belongs to this assignment
    3. Update AssignmentStudentActivity record with progress
    4. Set started_at on first save if null
    5. Calculate score if status is 'completed'

    **Authorization:**
    Only students can save progress for their assigned assignments.

    **Request Body:**
    - **response_data**: Activity-specific answer data
    - **time_spent_seconds**: Time spent on this activity
    - **status**: 'in_progress' or 'completed'
    - **score**: Required if status is 'completed'
    - **max_score**: Maximum possible score (default 100)

    **Returns:**
    ActivityProgressSaveResponse with save timestamp.

    **Status Codes:**
    - 200: Progress saved successfully
    - 404: Assignment/activity not found or not assigned
    - 400: Invalid status or assignment already completed
    - 429: Rate limit exceeded
    """
    # Get Student record for current user
    result = await session.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found for this user",
        )

    # Get AssignmentStudent record
    result = await session.execute(
        select(AssignmentStudent).where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.student_id == student.id,
        )
    )
    assignment_student = result.scalar_one_or_none()

    if not assignment_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found or not assigned to you",
        )

    # Check assignment is not already completed
    if assignment_student.status == AssignmentStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot save progress for completed assignment",
        )

    # Verify activity belongs to this assignment
    result = await session.execute(
        select(AssignmentActivity).where(
            AssignmentActivity.assignment_id == assignment_id,
            AssignmentActivity.activity_id == activity_id,
        )
    )
    assignment_activity = result.scalar_one_or_none()

    if not assignment_activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found in this assignment",
        )

    # Get or create AssignmentStudentActivity record
    result = await session.execute(
        select(AssignmentStudentActivity).where(
            AssignmentStudentActivity.assignment_student_id == assignment_student.id,
            AssignmentStudentActivity.activity_id == activity_id,
        )
    )
    activity_progress = result.scalar_one_or_none()

    if not activity_progress:
        # Create new record
        activity_progress = AssignmentStudentActivity(
            assignment_student_id=assignment_student.id,
            activity_id=activity_id,
            status=AssignmentStudentActivityStatus.not_started,
            max_score=progress.max_score,
        )
        session.add(activity_progress)

    # Check activity is not already completed (idempotent behavior)
    if activity_progress.status == AssignmentStudentActivityStatus.completed:
        # Already completed - return existing data
        return ActivityProgressSaveResponse(
            message="Activity already completed",
            activity_id=activity_id,
            status=activity_progress.status.value,
            score=activity_progress.score,
            last_saved_at=activity_progress.completed_at or datetime.now(UTC),
        )

    # Update progress fields
    activity_progress.response_data = progress.response_data
    activity_progress.max_score = progress.max_score

    # Set started_at on first save
    if activity_progress.started_at is None:
        activity_progress.started_at = datetime.now(UTC)

    # Update status
    if progress.status == "completed":
        activity_progress.status = AssignmentStudentActivityStatus.completed
        activity_progress.score = progress.score
        activity_progress.completed_at = datetime.now(UTC)
    else:
        activity_progress.status = AssignmentStudentActivityStatus.in_progress

    # Also ensure assignment is in_progress
    if assignment_student.status == AssignmentStatus.not_started:
        assignment_student.status = AssignmentStatus.in_progress
        assignment_student.started_at = datetime.now(UTC)

    try:
        await session.commit()
        await session.refresh(activity_progress)
        logger.info(
            f"Activity progress saved: assignment={assignment_id}, "
            f"activity={activity_id}, student={student.id}, status={progress.status}"
        )
    except Exception as e:
        await session.rollback()
        logger.error(f"Failed to save activity progress: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save progress",
        )

    return ActivityProgressSaveResponse(
        message="Progress saved successfully",
        activity_id=activity_id,
        status=activity_progress.status.value,
        score=activity_progress.score,
        last_saved_at=activity_progress.completed_at or activity_progress.started_at or datetime.now(UTC),
    )


@router.post(
    "/{assignment_id}/students/me/submit-multi",
    response_model=MultiActivitySubmitResponse,
    summary="Submit multi-activity assignment",
    description="Submit a multi-activity assignment after completing all activities",
)
async def submit_multi_activity_assignment(
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    submission: MultiActivitySubmitRequest,
    current_user: User = require_role(UserRole.student),
) -> MultiActivitySubmitResponse:
    """
    Submit a multi-activity assignment.

    **Workflow:**
    1. Verify student is assigned to this assignment
    2. Check assignment is in 'in_progress' status
    3. Validate all activities are completed (unless force_submit=true)
    4. Calculate combined score from all activity scores
    5. Update AssignmentStudent with completion data
    6. Return combined score and per-activity breakdown

    **Force Submit:**
    Use force_submit=true for timer expiry - submits with current progress.

    **Authorization:**
    Only students can submit their assigned assignments.

    **Request Body:**
    - **force_submit**: Force submit even if not all activities completed
    - **total_time_spent_minutes**: Total time spent on assignment

    **Returns:**
    MultiActivitySubmitResponse with combined score and breakdown.

    **Status Codes:**
    - 200: Assignment submitted successfully
    - 404: Assignment not found or not assigned
    - 400: Not all activities completed (and force_submit=false)
    - 409: Assignment already completed
    """
    # Get Student record for current user
    result = await session.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found for this user",
        )

    # Get AssignmentStudent with eager load of activity_progress
    result = await session.execute(
        select(AssignmentStudent)
        .options(selectinload(AssignmentStudent.activity_progress))
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.student_id == student.id,
        )
    )
    assignment_student = result.scalar_one_or_none()

    if not assignment_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found or not assigned to you",
        )

    # Idempotent behavior: if already completed, return existing result
    if assignment_student.status == AssignmentStatus.completed:
        # Build per-activity scores from existing progress
        per_activity_scores = []
        for ap in assignment_student.activity_progress:
            # Need to get activity title
            result = await session.execute(
                select(Activity).where(Activity.id == ap.activity_id)
            )
            activity = result.scalar_one_or_none()
            per_activity_scores.append(
                PerActivityScore(
                    activity_id=ap.activity_id,
                    activity_title=activity.title if activity else None,
                    score=ap.score,
                    max_score=ap.max_score,
                    status=ap.status.value,
                )
            )

        return MultiActivitySubmitResponse(
            success=True,
            message="Assignment already submitted",
            assignment_id=assignment_id,
            combined_score=assignment_student.score or 0,
            per_activity_scores=per_activity_scores,
            completed_at=assignment_student.completed_at or datetime.now(UTC),
            total_activities=len(assignment_student.activity_progress),
            completed_activities=sum(
                1 for ap in assignment_student.activity_progress
                if ap.status == AssignmentStudentActivityStatus.completed
            ),
        )

    # Check assignment is in progress
    if assignment_student.status == AssignmentStatus.not_started:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment not started yet",
        )

    # Check if all activities are completed
    incomplete_activities = [
        ap for ap in assignment_student.activity_progress
        if ap.status != AssignmentStudentActivityStatus.completed
    ]

    if incomplete_activities and not submission.force_submit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not all activities completed. {len(incomplete_activities)} activities remaining.",
        )

    # Calculate combined score using the model's method
    combined_score = assignment_student.calculate_combined_score()
    if combined_score is None:
        combined_score = 0.0

    # Update assignment status
    assignment_student.status = AssignmentStatus.completed
    assignment_student.score = combined_score
    assignment_student.completed_at = datetime.now(UTC)
    assignment_student.time_spent_minutes = submission.total_time_spent_minutes

    # Consolidate all activity answers into answers_json for analytics/insights
    # This enables the insights service to analyze multi-activity assignments
    consolidated_answers = {}
    for ap in assignment_student.activity_progress:
        if ap.response_data:
            # Store answers keyed by activity_id
            consolidated_answers[str(ap.activity_id)] = {
                "answers": ap.response_data,
                "score": ap.score,
                "status": ap.status.value,
            }
    assignment_student.answers_json = consolidated_answers

    # Build per-activity scores response
    per_activity_scores = []
    for ap in assignment_student.activity_progress:
        result = await session.execute(
            select(Activity).where(Activity.id == ap.activity_id)
        )
        activity = result.scalar_one_or_none()
        per_activity_scores.append(
            PerActivityScore(
                activity_id=ap.activity_id,
                activity_title=activity.title if activity else None,
                score=ap.score,
                max_score=ap.max_score,
                status=ap.status.value,
            )
        )

    try:
        await session.commit()
        await session.refresh(assignment_student)
        logger.info(
            f"Multi-activity assignment submitted: id={assignment_id}, "
            f"student={student.id}, score={combined_score}, "
            f"force_submit={submission.force_submit}"
        )
    except Exception as e:
        await session.rollback()
        logger.error(f"Failed to submit multi-activity assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit assignment",
        )

    completed_count = sum(
        1 for ap in assignment_student.activity_progress
        if ap.status == AssignmentStudentActivityStatus.completed
    )

    return MultiActivitySubmitResponse(
        success=True,
        message="Assignment submitted successfully",
        assignment_id=assignment_id,
        combined_score=combined_score,
        per_activity_scores=per_activity_scores,
        completed_at=assignment_student.completed_at,
        total_activities=len(assignment_student.activity_progress),
        completed_activities=completed_count,
    )


@router.post(
    "/{assignment_id}/save-progress",
    response_model=AssignmentSaveProgressResponse,
    summary="Save assignment progress",
    description="Auto-save or manually save partial assignment progress (Rate limited: 120 req/hour)",
)
@limiter.limit("120/hour")
async def save_progress(
    request: Request,
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    progress: AssignmentSaveProgressRequest,
    current_user: User = require_role(UserRole.student),
) -> AssignmentSaveProgressResponse:
    """
    Save partial progress for an in-progress assignment.

    **Workflow:**
    1. Verify assignment exists and is assigned to student
    2. Check assignment is in 'in_progress' status
    3. Update AssignmentStudent.progress_json with partial answers
    4. Update time_spent_minutes and last_saved_at
    5. Return success response with timestamp

    **Authorization:**
    Only students can save progress for their assigned assignments.

    **Rate Limiting:**
    Limited to 120 requests per hour per IP to prevent abuse.
    (Story 4.8 QA Fix - Security improvement)

    **Request Body:**
    - **partial_answers_json**: Partial answers in activity-specific format
    - **time_spent_minutes**: Current time spent on activity

    **Returns:**
    AssignmentSaveProgressResponse with save timestamp.

    **Status Codes:**
    - 200: Progress saved successfully
    - 404: Assignment not found or not assigned to student
    - 400: Invalid status (not in_progress)
    - 403: Assignment doesn't belong to student
    - 401: Authentication required
    - 429: Rate limit exceeded (too many save requests)
    """
    # Get Student record for current user
    result = await session.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found for this user",
        )

    # Get AssignmentStudent record
    result = await session.execute(
        select(AssignmentStudent).where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.student_id == student.id,
        )
    )
    assignment_student = result.scalar_one_or_none()

    if not assignment_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found or not assigned to you",
        )

    # Validate status is in_progress (cannot save progress on completed assignments)
    if assignment_student.status != AssignmentStatus.in_progress:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot save progress for assignment with status: {assignment_student.status.value}",
        )

    # Update progress fields
    assignment_student.progress_json = progress.partial_answers_json
    assignment_student.time_spent_minutes = progress.time_spent_minutes
    assignment_student.last_saved_at = datetime.now(UTC)

    try:
        await session.commit()
        await session.refresh(assignment_student)
        logger.info(
            f"Progress saved for assignment {assignment_id} by student {student.id} "
            f"at {assignment_student.last_saved_at}"
        )
    except Exception as e:
        await session.rollback()
        logger.error(
            f"Failed to save progress for assignment {assignment_id}: {str(e)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save progress",
        )

    return AssignmentSaveProgressResponse(
        message="Progress saved successfully",
        last_saved_at=assignment_student.last_saved_at,
        time_spent_minutes=assignment_student.time_spent_minutes,
    )


@router.post(
    "/{assignment_id}/submit",
    response_model=AssignmentSubmissionResponse,
    summary="Submit completed assignment",
    description="Submit a completed assignment with answers and score",
)
async def submit_assignment(
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    submission: AssignmentSubmitRequest,
    current_user: User = require_role(UserRole.student),
) -> AssignmentSubmissionResponse:
    """
    Submit a completed assignment with answers and score.

    **Workflow:**
    1. Verify assignment exists and is assigned to student
    2. Check assignment is in 'in_progress' status
    3. Update AssignmentStudent with completion data
    4. Return success response

    **Idempotency:**
    If assignment is already completed, returns existing result without error.

    **Authorization:**
    Only students can submit their assigned assignments.

    **Request Body:**
    - **answers_json**: Student's answers in activity-specific format
    - **score**: Calculated score (0-100)
    - **time_spent_minutes**: Total time spent on activity
    - **completed_at**: Optional completion timestamp (defaults to now)

    **Returns:**
    AssignmentSubmissionResponse with success status and score.

    **Status Codes:**
    - 200: Assignment submitted successfully
    - 404: Assignment not found or not assigned to student
    - 400: Invalid status (not in_progress) or invalid score
    """
    # Get Student record for current user
    result = await session.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found for this user",
        )

    # Get AssignmentStudent record
    result = await session.execute(
        select(AssignmentStudent).where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.student_id == student.id,
        )
    )
    assignment_student = result.scalar_one_or_none()

    if not assignment_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found or not assigned to you",
        )

    # Idempotent behavior: if already completed, return existing result
    if assignment_student.status == AssignmentStatus.completed:
        logger.info(
            f"Duplicate submission attempt for assignment {assignment_id} "
            f"by student {student.id}"
        )
        return AssignmentSubmissionResponse(
            success=True,
            message="Assignment already submitted",
            score=assignment_student.score or 0,
            completed_at=assignment_student.completed_at or datetime.now(UTC),
            assignment_id=assignment_id,
        )

    # Validate status is in_progress
    if assignment_student.status != AssignmentStatus.in_progress:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit assignment with status: {assignment_student.status.value}",
        )

    # Update record with completion data
    assignment_student.status = AssignmentStatus.completed
    assignment_student.score = submission.score
    assignment_student.completed_at = submission.completed_at or datetime.now(UTC)
    assignment_student.time_spent_minutes = submission.time_spent_minutes
    assignment_student.answers_json = submission.answers_json
    assignment_student.progress_json = None  # Clear progress after submission

    try:
        await session.commit()
        await session.refresh(assignment_student)
        logger.info(
            f"Assignment {assignment_id} submitted by student {student.id} "
            f"with score {submission.score}"
        )
    except Exception as e:
        await session.rollback()
        logger.error(f"Failed to submit assignment {assignment_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save submission",
        )

    # Send notification to teacher about student completion (AC: 6, 7)
    try:
        # Get assignment with teacher relationship
        assignment_result = await session.execute(
            select(Assignment).where(Assignment.id == assignment_id)
        )
        assignment = assignment_result.scalar_one_or_none()

        if assignment:
            # Get teacher's user_id
            teacher_result = await session.execute(
                select(Teacher).where(Teacher.id == assignment.teacher_id)
            )
            teacher = teacher_result.scalar_one_or_none()

            # Get student's name from user relationship
            await session.refresh(student, ["user"])
            student_name = student.user.full_name if student.user else "A student"

            if teacher and teacher.user_id:
                await notification_service.create_notification(
                    db=session,
                    user_id=teacher.user_id,
                    notification_type=NotificationType.student_completed,
                    title=f"Student completed: {student_name} finished {assignment.name}",
                    message=f"Score: {submission.score}%",
                    link=f"/teacher/assignments/{assignment_id}",
                )
    except Exception as e:
        # Log but don't fail the submission if notification fails
        logger.warning(f"Failed to send completion notification: {str(e)}")

    return AssignmentSubmissionResponse(
        success=True,
        message="Assignment submitted successfully",
        score=assignment_student.score,
        completed_at=assignment_student.completed_at,
        assignment_id=assignment_id,
    )


# --- Assignment Analytics Endpoints (Story 5.3) ---


async def _verify_assignment_ownership(
    session: AsyncSessionDep, assignment_id: uuid.UUID, teacher_id: uuid.UUID
) -> Assignment:
    """
    Verify teacher owns the assignment.

    Args:
        session: Database session
        assignment_id: Assignment ID to verify
        teacher_id: Teacher ID to check ownership against

    Returns:
        Assignment if ownership verified

    Raises:
        HTTPException(404): Assignment not found or teacher doesn't own it
    """
    result = await session.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()

    if not assignment or assignment.teacher_id != teacher_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    return assignment


@router.get(
    "/{assignment_id}/detailed-results",
    response_model=AssignmentDetailedResultsResponse,
    summary="Get detailed assignment results",
    description="Get detailed results for an assignment including completion stats, scores, and question-level analysis",
)
async def get_detailed_results(
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher),
) -> AssignmentDetailedResultsResponse:
    """
    Get detailed results for a specific assignment.

    **Includes:**
    - Completion overview (completed, in_progress, not_started, past_due counts)
    - Score statistics (average, median, highest, lowest)
    - Student results list (name, status, score, time spent, completion date)
    - Question-level analysis based on activity type

    **Authorization:**
    Teachers can only view results for their own assignments.

    **Returns:**
    AssignmentDetailedResultsResponse with comprehensive analytics.

    **Status Codes:**
    - 200: Results retrieved successfully
    - 404: Assignment not found or teacher doesn't own it
    """
    # Get Teacher record
    result = await session.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user",
        )

    try:
        detailed_results = await get_assignment_detailed_results(
            assignment_id=assignment_id,
            teacher_id=teacher.id,
            session=session,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    logger.info(
        f"Detailed results retrieved for assignment {assignment_id} by teacher {teacher.id}"
    )

    return detailed_results


@router.get(
    "/{assignment_id}/students/{student_id}/answers",
    response_model=StudentAnswersResponse,
    summary="Get student's answers for assignment",
    description="Get a specific student's full answers for an assignment",
)
async def get_student_answers(
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    student_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher),
) -> StudentAnswersResponse:
    """
    Get a specific student's full answers for an assignment.

    **Authorization:**
    Teachers can only view answers for students in their own assignments.

    **Returns:**
    StudentAnswersResponse with student info and full answers_json.

    **Status Codes:**
    - 200: Answers retrieved successfully
    - 404: Assignment or student submission not found
    """
    # Get Teacher record
    result = await session.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user",
        )

    try:
        student_answers = await get_student_assignment_answers(
            assignment_id=assignment_id,
            student_id=student_id,
            teacher_id=teacher.id,
            session=session,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment or student submission not found",
        )

    logger.info(
        f"Student answers retrieved for assignment {assignment_id}, "
        f"student {student_id} by teacher {teacher.id}"
    )

    return student_answers


# --- Multi-Activity Assignment Analytics Endpoints (Story 8.4) ---


@router.get(
    "/{assignment_id}/analytics",
    response_model=MultiActivityAnalyticsResponse,
    summary="Get multi-activity assignment analytics",
    description="Get per-activity analytics for a multi-activity assignment (teacher view)",
)
async def get_multi_activity_analytics(
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    expand_activity_id: uuid.UUID | None = None,
    current_user: User = require_role(UserRole.teacher),
) -> MultiActivityAnalyticsResponse:
    """
    Get per-activity analytics for a multi-activity assignment.

    **Includes:**
    - Per-activity class average scores
    - Per-activity completion rates
    - Optional: Per-student breakdown when expand_activity_id is provided

    **Query Parameters:**
    - **expand_activity_id**: Optional UUID to get per-student scores for a specific activity

    **Authorization:**
    Teachers can only view analytics for their own assignments.

    **Returns:**
    MultiActivityAnalyticsResponse with per-activity analytics.

    **Status Codes:**
    - 200: Analytics retrieved successfully
    - 404: Assignment not found or teacher doesn't own it
    """
    # Get Teacher record
    result = await session.execute(
        select(Teacher).where(Teacher.user_id == current_user.id)
    )
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user",
        )

    # Verify assignment ownership and get assignment data
    assignment = await _verify_assignment_ownership(session, assignment_id, teacher.id)

    # Get all activities for this assignment with their analytics
    result = await session.execute(
        select(AssignmentActivity, Activity)
        .join(Activity, AssignmentActivity.activity_id == Activity.id)
        .where(AssignmentActivity.assignment_id == assignment_id)
        .order_by(AssignmentActivity.order_index)
    )
    assignment_activities = result.all()

    if not assignment_activities:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No activities found for this assignment",
        )

    # Get total students count
    result = await session.execute(
        select(AssignmentStudent).where(
            AssignmentStudent.assignment_id == assignment_id
        )
    )
    all_assignment_students = result.scalars().all()
    total_students = len(all_assignment_students)

    # Count submitted (completed) students
    submitted_count = sum(
        1 for astu in all_assignment_students
        if astu.status == AssignmentStatus.completed
    )

    # Build per-activity analytics
    activities_analytics: list[ActivityAnalyticsItem] = []

    for aa, activity in assignment_activities:
        # Get all student progress for this activity
        result = await session.execute(
            select(AssignmentStudentActivity)
            .join(AssignmentStudent, AssignmentStudentActivity.assignment_student_id == AssignmentStudent.id)
            .where(
                AssignmentStudent.assignment_id == assignment_id,
                AssignmentStudentActivity.activity_id == activity.id,
            )
        )
        activity_progress_records = result.scalars().all()

        # Calculate completion stats
        completed_records = [
            ap for ap in activity_progress_records
            if ap.status == AssignmentStudentActivityStatus.completed
        ]
        completed_count = len(completed_records)
        total_assigned_count = len(activity_progress_records) if activity_progress_records else total_students

        # Calculate completion rate
        completion_rate = completed_count / total_assigned_count if total_assigned_count > 0 else 0.0

        # Calculate class average (only from completed activities with scores)
        scores = [ap.score for ap in completed_records if ap.score is not None]
        class_average_score = sum(scores) / len(scores) if scores else None

        activities_analytics.append(
            ActivityAnalyticsItem(
                activity_id=activity.id,
                activity_title=activity.title,
                page_number=activity.page_number,
                activity_type=activity.activity_type.value,
                class_average_score=round(class_average_score, 1) if class_average_score is not None else None,
                completion_rate=round(completion_rate, 2),
                completed_count=completed_count,
                total_assigned_count=total_assigned_count,
            )
        )

    # Handle expand_activity_id - get per-student scores for specific activity
    expanded_students: list[StudentActivityScore] | None = None

    if expand_activity_id:
        # Verify activity belongs to this assignment
        result = await session.execute(
            select(AssignmentActivity).where(
                AssignmentActivity.assignment_id == assignment_id,
                AssignmentActivity.activity_id == expand_activity_id,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Activity not found in this assignment",
            )

        # Get all student scores for this activity
        result = await session.execute(
            select(AssignmentStudentActivity, AssignmentStudent, Student, User)
            .join(AssignmentStudent, AssignmentStudentActivity.assignment_student_id == AssignmentStudent.id)
            .join(Student, AssignmentStudent.student_id == Student.id)
            .join(User, Student.user_id == User.id)
            .where(
                AssignmentStudent.assignment_id == assignment_id,
                AssignmentStudentActivity.activity_id == expand_activity_id,
            )
            .order_by(User.full_name)
        )
        student_records = result.all()

        expanded_students = []
        for ap, astu, student, user in student_records:
            # Calculate time spent in seconds (using completed_at - started_at if available)
            time_spent_seconds = 0
            if ap.started_at and ap.completed_at:
                time_spent_seconds = int((ap.completed_at - ap.started_at).total_seconds())

            expanded_students.append(
                StudentActivityScore(
                    student_id=student.id,
                    student_name=user.full_name or user.email,
                    status=ap.status.value,
                    score=ap.score,
                    max_score=ap.max_score,
                    time_spent_seconds=time_spent_seconds,
                    completed_at=ap.completed_at,
                )
            )

    logger.info(
        f"Multi-activity analytics retrieved for assignment {assignment_id} "
        f"by teacher {teacher.id}, activities={len(activities_analytics)}"
    )

    return MultiActivityAnalyticsResponse(
        assignment_id=assignment_id,
        assignment_name=assignment.name,
        total_students=total_students,
        submitted_count=submitted_count,
        activities=activities_analytics,
        expanded_students=expanded_students,
    )


@router.get(
    "/{assignment_id}/students/me/result",
    response_model=StudentAssignmentResultResponse,
    summary="Get student's assignment result",
    description="Get the student's score breakdown for a completed multi-activity assignment",
)
async def get_student_assignment_result(
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    current_user: User = require_role(UserRole.student),
) -> StudentAssignmentResultResponse:
    """
    Get the student's score breakdown for a completed assignment.

    **Includes:**
    - Total combined score
    - Per-activity score breakdown
    - Completion status per activity

    **Authorization:**
    Students can only view their own assignment results.

    **Returns:**
    StudentAssignmentResultResponse with score breakdown.

    **Status Codes:**
    - 200: Result retrieved successfully
    - 404: Assignment not found or not assigned to student
    """
    # Get Student record for current user
    result = await session.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found for this user",
        )

    # Get AssignmentStudent with Assignment
    result = await session.execute(
        select(AssignmentStudent, Assignment)
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.student_id == student.id,
        )
    )
    assignment_data = result.one_or_none()

    if not assignment_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found or not assigned to you",
        )

    assignment_student, assignment = assignment_data

    # Get per-activity progress with activity details
    result = await session.execute(
        select(AssignmentStudentActivity, Activity)
        .join(Activity, AssignmentStudentActivity.activity_id == Activity.id)
        .join(AssignmentActivity, (
            (AssignmentActivity.assignment_id == assignment_id) &
            (AssignmentActivity.activity_id == Activity.id)
        ))
        .where(
            AssignmentStudentActivity.assignment_student_id == assignment_student.id,
        )
        .order_by(AssignmentActivity.order_index)
    )
    activity_records = result.all()

    # Build per-activity score items
    activity_scores: list[ActivityScoreItem] = []
    completed_count = 0

    for ap, activity in activity_records:
        if ap.status == AssignmentStudentActivityStatus.completed:
            completed_count += 1

        activity_scores.append(
            ActivityScoreItem(
                activity_id=activity.id,
                activity_title=activity.title,
                activity_type=activity.activity_type.value,
                score=ap.score,
                max_score=ap.max_score,
                status=ap.status.value,
            )
        )

    logger.info(
        f"Student result retrieved for assignment {assignment_id} "
        f"by student {student.id}, activities={len(activity_scores)}"
    )

    return StudentAssignmentResultResponse(
        assignment_id=assignment_id,
        assignment_name=assignment.name,
        total_score=assignment_student.score,
        completed_at=assignment_student.completed_at,
        activity_scores=activity_scores,
        total_activities=len(activity_scores),
        completed_activities=completed_count,
    )


# =============================================================================
# Feedback Endpoints (Story 6.4)
# =============================================================================


@router.post(
    "/{assignment_id}/students/{student_id}/feedback",
    response_model=FeedbackPublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_or_update_feedback(
    assignment_id: uuid.UUID,
    student_id: uuid.UUID,
    feedback_data: FeedbackCreate,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.teacher),
) -> FeedbackPublic:
    """
    Create or update feedback for a student's assignment.

    Teachers can provide written feedback on completed student assignments.
    If feedback already exists, it will be updated.

    Args:
        assignment_id: UUID of the assignment
        student_id: UUID of the student (students.id, not user_id)
        feedback_data: Feedback content and draft status
        session: Database session
        current_user: Authenticated teacher

    Returns:
        Created or updated feedback

    Raises:
        HTTPException(403): Not the assignment owner
        HTTPException(404): Assignment or student assignment not found
    """
    # Get teacher record
    teacher_query = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher_result = await session.execute(teacher_query)
    teacher = teacher_result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can provide feedback",
        )

    # Verify teacher owns the assignment
    assignment_query = select(Assignment).where(
        Assignment.id == assignment_id,
        Assignment.teacher_id == teacher.id,
    )
    assignment_result = await session.execute(assignment_query)
    assignment = assignment_result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found or you don't own this assignment",
        )

    # Get assignment student record
    as_query = select(AssignmentStudent).where(
        AssignmentStudent.assignment_id == assignment_id,
        AssignmentStudent.student_id == student_id,
    )
    as_result = await session.execute(as_query)
    assignment_student = as_result.scalar_one_or_none()

    if not assignment_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student assignment not found",
        )

    # Check if feedback already exists
    existing_feedback = await feedback_service.get_feedback_by_assignment_student(
        session, assignment_student.id
    )

    if existing_feedback:
        # Update existing feedback
        updated_feedback = await feedback_service.update_feedback(
            db=session,
            feedback_id=existing_feedback.id,
            teacher_id=teacher.id,
            feedback_text=feedback_data.feedback_text,
            is_draft=feedback_data.is_draft,
            badges=feedback_data.badges,
            emoji_reaction=feedback_data.emoji_reaction,
        )
        if not updated_feedback:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update feedback",
            )
        feedback = updated_feedback
    else:
        # Create new feedback
        feedback = await feedback_service.create_feedback(
            db=session,
            assignment_student_id=assignment_student.id,
            teacher_id=teacher.id,
            feedback_text=feedback_data.feedback_text,
            is_draft=feedback_data.is_draft,
            badges=feedback_data.badges,
            emoji_reaction=feedback_data.emoji_reaction,
        )

    # Build and return public response
    feedback_public = await feedback_service.get_feedback_public(session, feedback)

    if not feedback_public:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to build feedback response",
        )

    logger.info(
        f"Feedback {'updated' if existing_feedback else 'created'} "
        f"for assignment {assignment_id}, student {student_id} "
        f"by teacher {teacher.id}, is_draft={feedback_data.is_draft}"
    )

    return feedback_public


@router.get(
    "/{assignment_id}/students/{student_id}/feedback",
    response_model=FeedbackPublic | FeedbackStudentView | None,
)
async def get_feedback(
    assignment_id: uuid.UUID,
    student_id: uuid.UUID,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.teacher, UserRole.student),
) -> FeedbackPublic | FeedbackStudentView | None:
    """
    Get feedback for a student's assignment.

    Teachers see all feedback (including drafts).
    Students only see published feedback.

    Args:
        assignment_id: UUID of the assignment
        student_id: UUID of the student (students.id, not user_id)
        session: Database session
        current_user: Authenticated teacher or student

    Returns:
        Feedback (full for teachers, limited for students) or None if not found

    Raises:
        HTTPException(403): Student trying to view another student's feedback
        HTTPException(404): Assignment not found
    """
    # Verify assignment exists
    assignment_query = select(Assignment).where(Assignment.id == assignment_id)
    assignment_result = await session.execute(assignment_query)
    assignment = assignment_result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    if current_user.role == UserRole.teacher:
        # Teachers can view any feedback for assignments they own
        teacher_query = select(Teacher).where(Teacher.user_id == current_user.id)
        teacher_result = await session.execute(teacher_query)
        teacher = teacher_result.scalar_one_or_none()

        if not teacher or assignment.teacher_id != teacher.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view feedback for your own assignments",
            )

        # Get assignment student record
        as_query = select(AssignmentStudent).where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.student_id == student_id,
        )
        as_result = await session.execute(as_query)
        assignment_student = as_result.scalar_one_or_none()

        if not assignment_student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment or student not found",
            )

        feedback = await feedback_service.get_feedback_by_assignment_student(
            session, assignment_student.id
        )

        if not feedback:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Feedback not found",
            )

        return await feedback_service.get_feedback_public(session, feedback)

    else:  # Student
        # Students can only view their own feedback
        student_query = select(Student).where(Student.user_id == current_user.id)
        student_result = await session.execute(student_query)
        student = student_result.scalar_one_or_none()

        if not student or student.id != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own feedback",
            )

        # Get published feedback only
        result = await feedback_service.get_feedback_for_student_view(
            session, assignment_id, student_id
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Feedback not found",
            )

        return result


@router.get(
    "/{assignment_id}/my-feedback",
    response_model=FeedbackStudentView | None,
)
async def get_my_feedback(
    assignment_id: uuid.UUID,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.student),
) -> FeedbackStudentView | None:
    """
    Get the current student's feedback for an assignment.

    This is a convenience endpoint for students to get their own feedback
    without needing to know their student_id.

    Returns:
        FeedbackStudentView: Published feedback if available
        None: If no published feedback exists

    Raises:
        HTTPException 404: If assignment not found or student not enrolled
    """
    # Get the student record for the current user
    student_query = select(Student).where(Student.user_id == current_user.id)
    student_result = await session.execute(student_query)
    student = student_result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found",
        )

    # Get published feedback only
    result = await feedback_service.get_feedback_for_student_view(
        session, assignment_id, student.id
    )

    return result


@router.put(
    "/feedback/{feedback_id}",
    response_model=FeedbackPublic,
)
async def update_feedback(
    feedback_id: uuid.UUID,
    feedback_data: FeedbackUpdate,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.teacher),
) -> FeedbackPublic:
    """
    Update existing feedback.

    Args:
        feedback_id: UUID of the feedback to update
        feedback_data: Updated feedback content
        session: Database session
        current_user: Authenticated teacher

    Returns:
        Updated feedback

    Raises:
        HTTPException(403): Not the feedback owner
        HTTPException(404): Feedback not found
    """
    # Get teacher record
    teacher_query = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher_result = await session.execute(teacher_query)
    teacher = teacher_result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can update feedback",
        )

    # Update feedback
    updated_feedback = await feedback_service.update_feedback(
        db=session,
        feedback_id=feedback_id,
        teacher_id=teacher.id,
        feedback_text=feedback_data.feedback_text,
        is_draft=feedback_data.is_draft,
        badges=feedback_data.badges,
        emoji_reaction=feedback_data.emoji_reaction,
    )

    if not updated_feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found or you don't own this feedback",
        )

    # Build and return public response
    feedback_public = await feedback_service.get_feedback_public(session, updated_feedback)

    if not feedback_public:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to build feedback response",
        )

    logger.info(f"Feedback {feedback_id} updated by teacher {teacher.id}")

    return feedback_public


# =============================================================================
# Preview/Test Mode Endpoints (Story 9.7)
# =============================================================================


@router.get(
    "/{assignment_id}/preview",
    response_model=AssignmentPreviewResponse,
    summary="Preview assignment (teacher test mode)",
    description="Get assignment data for teacher preview/test mode. No student data created.",
)
async def preview_assignment(
    *,
    session: AsyncSessionDep,
    assignment_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher, UserRole.publisher, UserRole.admin),
) -> AssignmentPreviewResponse:
    """
    Get assignment data for teacher preview/test mode.

    **Purpose:**
    Allows teachers to preview and test an assignment before or after publishing.
    This is a read-only operation that doesn't create any student records.

    **Workflow:**
    1. Verify assignment exists
    2. Verify teacher owns the assignment OR is admin/publisher with book access
    3. Get all activities linked to this assignment
    4. Return assignment data in preview format

    **Authorization:**
    - Teachers: Can preview their own assignments
    - Publishers: Can preview assignments for books they published
    - Admins: Can preview any assignment

    **Returns:**
    AssignmentPreviewResponse with all activities and configs for preview mode.

    **Status Codes:**
    - 200: Preview data returned successfully
    - 403: Not authorized to preview this assignment
    - 404: Assignment not found
    """
    # Get assignment with book
    result = await session.execute(
        select(Assignment, Book)
        .join(Book, Assignment.book_id == Book.id)
        .where(Assignment.id == assignment_id)
    )
    assignment_data = result.one_or_none()

    if not assignment_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    assignment, book = assignment_data

    # Authorization check based on role
    if current_user.role == UserRole.teacher:
        # Teacher must own the assignment
        result = await session.execute(
            select(Teacher).where(Teacher.user_id == current_user.id)
        )
        teacher = result.scalar_one_or_none()

        if not teacher or assignment.teacher_id != teacher.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only preview your own assignments",
            )
    elif current_user.role == UserRole.publisher:
        # Publisher must have published the book
        if book.publisher_id != current_user.publisher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only preview assignments for your books",
            )
    # Admin can preview any assignment - no additional check needed

    # Get all activities linked to this assignment via AssignmentActivity junction table
    result = await session.execute(
        select(AssignmentActivity, Activity)
        .join(Activity, AssignmentActivity.activity_id == Activity.id)
        .where(AssignmentActivity.assignment_id == assignment_id)
        .order_by(AssignmentActivity.order_index)
    )
    assignment_activities = result.all()

    if not assignment_activities:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No activities found for this assignment",
        )

    # Build activities list with configs
    activities: list[ActivityWithConfig] = []
    for aa, activity in assignment_activities:
        activities.append(
            ActivityWithConfig(
                id=activity.id,
                title=activity.title,
                activity_type=activity.activity_type.value,
                config_json=activity.config_json or {},
                order_index=aa.order_index,
            )
        )

    # Story 13.3: Enrich resources with availability status for preview
    enriched_resources = await _enrich_resources(session, assignment.resources)

    # Build response
    response = AssignmentPreviewResponse(
        assignment_id=assignment.id,
        assignment_name=assignment.name,
        instructions=assignment.instructions,
        due_date=assignment.due_date,
        time_limit_minutes=assignment.time_limit_minutes,
        status=assignment.status,
        book_id=book.id,
        book_title=book.title,
        book_name=book.book_name,
        publisher_name=book.publisher_name,
        book_cover_url=book.cover_image_url,
        activities=activities,
        total_activities=len(activities),
        is_preview=True,
        video_path=assignment.video_path,  # Story 10.3: Include video attachment
        resources=enriched_resources,  # Story 13.3: Include teacher materials
    )

    logger.info(
        f"Assignment preview requested: id={assignment.id}, "
        f"user_id={current_user.id}, activities={len(activities)}"
    )

    return response


@router.get(
    "/activities/{activity_id}/preview",
    response_model=ActivityPreviewResponse,
    summary="Preview single activity",
    description="Get single activity data for teacher/publisher preview. No submission recorded.",
)
async def preview_activity(
    *,
    session: AsyncSessionDep,
    activity_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher, UserRole.publisher, UserRole.admin),
) -> ActivityPreviewResponse:
    """
    Get single activity data for preview.

    **Purpose:**
    Allows teachers and publishers to preview a single activity before adding it
    to an assignment. This is useful during assignment creation or when browsing
    book contents.

    **Workflow:**
    1. Verify activity exists
    2. Verify user has access to the book containing this activity
    3. Return activity data in preview format

    **Authorization:**
    - Teachers: Can preview activities from books they have access to
    - Publishers: Can preview activities from their own books
    - Admins: Can preview any activity

    **Returns:**
    ActivityPreviewResponse with activity config for preview mode.

    **Status Codes:**
    - 200: Activity preview data returned successfully
    - 403: Not authorized to preview this activity
    - 404: Activity not found
    """
    # Get activity with book
    result = await session.execute(
        select(Activity, Book)
        .join(Book, Activity.book_id == Book.id)
        .where(Activity.id == activity_id)
    )
    activity_data = result.one_or_none()

    if not activity_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )

    activity, book = activity_data

    # Authorization check based on role
    if current_user.role == UserRole.teacher:
        # Teacher must have book access through their school
        result = await session.execute(
            select(Teacher).where(Teacher.user_id == current_user.id)
        )
        teacher = result.scalar_one_or_none()

        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher record not found",
            )

        # Check book access
        result = await session.execute(
            select(BookAccess).where(
                BookAccess.book_id == book.id,
                BookAccess.school_id == teacher.school_id,
            )
        )
        book_access = result.scalar_one_or_none()

        if not book_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this book",
            )
    elif current_user.role == UserRole.publisher:
        # Publisher must have published the book
        if book.publisher_id != current_user.publisher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only preview activities from your own books",
            )
    # Admin can preview any activity - no additional check needed

    # Build response
    response = ActivityPreviewResponse(
        activity_id=activity.id,
        activity_title=activity.title,
        activity_type=activity.activity_type.value,
        config_json=activity.config_json or {},
        book_id=book.id,
        book_name=book.book_name,
        publisher_name=book.publisher_name,
        is_preview=True,
    )

    logger.info(
        f"Activity preview requested: id={activity.id}, "
        f"user_id={current_user.id}, type={activity.activity_type.value}"
    )

    return response
