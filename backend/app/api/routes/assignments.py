"""Assignment API endpoints - Story 3.7."""

import logging
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, Request, status
from fastapi.routing import APIRouter
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.api.deps import AsyncSessionDep, require_role
from app.core.rate_limit import limiter
from app.models import (
    Activity,
    Assignment,
    AssignmentStatus,
    AssignmentStudent,
    Book,
    BookAccess,
    Class,
    ClassStudent,
    Student,
    Teacher,
    User,
    UserRole,
)
from app.schemas.assignment import (
    ActivityStartResponse,
    AssignmentCreate,
    AssignmentListItem,
    AssignmentResponse,
    AssignmentSaveProgressRequest,
    AssignmentSaveProgressResponse,
    AssignmentSubmissionResponse,
    AssignmentSubmitRequest,
    AssignmentUpdate,
)

router = APIRouter(prefix="/assignments", tags=["assignments"])
logger = logging.getLogger(__name__)


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


@router.post(
    "/",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new assignment",
    description="Creates a new assignment and assigns it to specified students/classes",
)
async def create_assignment(
    *,
    session: AsyncSessionDep,
    assignment_in: AssignmentCreate,
    current_user: User = require_role(UserRole.teacher),
) -> Assignment:
    """
    Create a new assignment.

    **Workflow:**
    1. Validate teacher has access to activity through BookAccess
    2. Validate all selected students/classes belong to teacher
    3. Validate due_date is in future (if provided)
    4. Create Assignment record
    5. Create AssignmentStudent records for all target students

    **Request Body:**
    - **activity_id**: UUID of activity to assign
    - **book_id**: UUID of book containing activity
    - **name**: Assignment name (max 500 chars)
    - **instructions**: Optional special instructions
    - **due_date**: Optional deadline (must be in future)
    - **time_limit_minutes**: Optional time limit (must be > 0)
    - **student_ids**: List of student UUIDs (required if no class_ids)
    - **class_ids**: List of class UUIDs (required if no student_ids)

    **Returns:**
    Assignment object with student_count
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

    # Validate teacher has access to activity (raises 404 if not)
    await _verify_activity_access(session, assignment_in.activity_id, teacher)

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

    # Create Assignment record
    now = datetime.now(UTC)
    assignment = Assignment(
        teacher_id=teacher.id,
        activity_id=assignment_in.activity_id,
        book_id=assignment_in.book_id,
        name=assignment_in.name,
        instructions=assignment_in.instructions,
        due_date=assignment_in.due_date,
        time_limit_minutes=assignment_in.time_limit_minutes,
        created_at=now,
        updated_at=now,
    )
    session.add(assignment)
    await session.flush()  # Get assignment.id for AssignmentStudent records

    # Create AssignmentStudent records
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

    # Commit transaction
    await session.commit()
    await session.refresh(assignment)

    # Compute student_count for response
    assignment_response = AssignmentResponse.model_validate(assignment)
    assignment_response.student_count = len(students)

    logger.info(
        f"Assignment created: id={assignment.id}, teacher_id={teacher.id}, "
        f"activity_id={assignment.activity_id}, students={len(students)}"
    )

    return assignment_response


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

    **Immutable fields (cannot change after creation):**
    - teacher_id
    - activity_id
    - book_id
    - student assignments

    **Authorization:**
    Teachers can only update their own assignments.

    **Returns:**
    Updated assignment with student_count.
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

    # Update only provided fields (partial update)
    update_data = assignment_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(assignment, field, value)

    # Update timestamp
    assignment.updated_at = datetime.now(UTC)

    # Commit transaction
    await session.commit()
    await session.refresh(assignment)

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

    return AssignmentSubmissionResponse(
        success=True,
        message="Assignment submitted successfully",
        score=assignment_student.score,
        completed_at=assignment_student.completed_at,
        assignment_id=assignment_id,
    )
