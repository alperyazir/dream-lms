import logging
import uuid
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlmodel import SQLModel, select

from app import crud
from app.api.deps import AsyncSessionDep, SessionDep, require_role
from app.core.config import settings
from app.models import (
    BulkImportErrorDetail,
    BulkImportResponse,
    Class,
    ClassCreateByTeacher,
    ClassPublic,
    ClassResponse,
    ClassStudent,
    ClassUpdate,
    Student,
    StudentCreate,
    StudentCreateAPI,
    StudentPublic,
    StudentUpdate,
    Teacher,
    User,
    UserCreationResponse,
    UserPublic,
    UserRole,
)
from app.services.bulk_import import validate_bulk_import
from app.utils import (
    generate_new_account_email,
    generate_temp_password,
    generate_username,
    parse_excel_file,
    send_email,
    validate_excel_headers,
    validate_file_size,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teachers", tags=["teachers"])


@router.post(
    "/me/students",
    response_model=UserCreationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new student",
    description="Creates a new student user. Teacher only.",
)
def create_student(
    *,
    session: SessionDep,
    student_in: StudentCreateAPI,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Create a new student.

    - **username**: Username for user account (3-50 characters, alphanumeric, underscore, or hyphen)
    - **user_email**: Email for user account
    - **full_name**: Full name for user account
    - **grade_level**: Optional grade level
    - **parent_email**: Optional parent email

    Returns user, temp_password, and student record.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Check if user email already exists
    existing_user = crud.get_user_by_email(session=session, email=student_in.user_email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Check if username already exists
    existing_username = crud.get_user_by_username(session=session, username=student_in.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username already exists"
        )

    # Generate secure temporary password
    temp_password = generate_temp_password()

    # Create Student record data
    student_create = StudentCreate(
        user_id=uuid.uuid4(),  # Placeholder, will be replaced in crud
        grade_level=student_in.grade_level,
        parent_email=student_in.parent_email
    )

    # Create user and student atomically
    user, student = crud.create_student(
        session=session,
        email=student_in.user_email,
        username=student_in.username,
        password=temp_password,
        full_name=student_in.full_name,
        student_create=student_create,
        created_by_teacher_id=teacher.id
    )

    # Handle password delivery based on email availability
    password_emailed = False
    temp_password_for_response = None
    message = ""

    if user.email and settings.emails_enabled:
        try:
            # Send password via email - secure path
            email_data = generate_new_account_email(
                email_to=user.email,
                username=user.username,
                password=temp_password,
                full_name=student_in.full_name
            )
            send_email(
                email_to=user.email,
                subject=email_data.subject,
                html_content=email_data.html_content
            )
            password_emailed = True
            message = "Password sent via email"
        except Exception as e:
            logger.error(f"Failed to send welcome email to {user.email}: {e}")
            temp_password_for_response = temp_password
            message = "Email delivery failed. Please share the temporary password securely."
    else:
        # No email or emails disabled - return password once for manual communication
        temp_password_for_response = temp_password
        message = "Please share the temporary password securely with the student"

    # Build student response with user information
    student_data = StudentPublic(
        grade_level=student.grade_level,
        parent_email=student.parent_email,
        id=student.id,
        user_id=student.user_id,
        user_email=user.email,
        user_username=user.username,
        user_full_name=user.full_name or "",
        created_at=student.created_at,
        updated_at=student.updated_at
    )

    return UserCreationResponse(
        user=UserPublic.model_validate(user),
        role_record=student_data,
        temporary_password=temp_password_for_response,
        password_emailed=password_emailed,
        message=message
    )


@router.post(
    "/me/students/bulk-import",
    response_model=BulkImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk import students from Excel",
    description="Upload Excel file to create multiple student accounts. Teacher only.",
)
async def bulk_import_students(
    *,
    session: SessionDep,
    file: UploadFile = File(...),
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Bulk import students from Excel file.

    Expected Excel columns: First Name, Last Name, Email, Grade Level, Parent Email

    Returns BulkImportResponse with created count and credentials list.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Validate file extension
    if not file.filename or not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx, .xls) are supported"
        )

    # Validate file size (max 5MB)
    if not await validate_file_size(file, max_size_mb=5):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 5MB limit"
        )

    # Parse Excel file
    try:
        rows = await parse_excel_file(file)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Excel file contains no data rows"
        )

    # Extract headers from first row
    if rows:
        headers = list(rows[0].keys())
        headers = [h for h in headers if not h.startswith('_')]  # Remove internal fields

        # Validate headers
        required_headers = ["First Name", "Last Name", "Email", "Grade Level", "Parent Email"]
        if not validate_excel_headers(headers, required_headers):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns. Expected: {', '.join(required_headers)}"
            )

    # Validate all rows
    validation_result = validate_bulk_import(rows, UserRole.student, session)

    # If validation errors, return error response
    if validation_result.error_count > 0:
        error_details = [
            BulkImportErrorDetail(
                row_number=err.row_number,
                field=None,
                message="; ".join(err.errors)
            )
            for err in validation_result.errors
        ]

        return BulkImportResponse(
            success=False,
            total_rows=len(rows),
            created_count=0,
            error_count=validation_result.error_count,
            errors=error_details,
            credentials=None
        )

    # All validations passed - create students in transaction
    created_credentials: list[dict[str, str]] = []

    try:
        for row in rows:
            email = row.get('Email', '').strip()
            first_name = row.get('First Name', '').strip()
            last_name = row.get('Last Name', '').strip()
            full_name = f"{first_name} {last_name}"
            grade_level = row.get('Grade Level', '').strip() if row.get('Grade Level') else None
            parent_email = row.get('Parent Email', '').strip() if row.get('Parent Email') else None

            # Generate temporary password
            temp_password = generate_temp_password()

            # Generate unique username
            username = generate_username(full_name, session)

            # Create Student record data
            student_create = StudentCreate(
                user_id=uuid.uuid4(),  # Placeholder, will be replaced in crud
                grade_level=grade_level,
                parent_email=parent_email
            )

            # Create user and student atomically
            user, student = crud.create_student(
                session=session,
                email=email,
                username=username,
                password=temp_password,
                full_name=full_name,
                student_create=student_create,
                created_by_teacher_id=teacher.id
            )

            created_credentials.append({
                "email": email,
                "temp_password": temp_password,
                "full_name": full_name
            })

        session.commit()
        logger.info(f"Bulk import: Successfully created {len(created_credentials)} students")

    except Exception as e:
        session.rollback()
        logger.error(f"Bulk import failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk import failed: {str(e)}"
        )

    return BulkImportResponse(
        success=True,
        total_rows=len(rows),
        created_count=len(created_credentials),
        error_count=0,
        errors=[],
        credentials=created_credentials
    )


@router.get(
    "/me/students",
    response_model=list[StudentPublic],
    summary="List my students",
    description="Retrieve students created by the current teacher or enrolled in their classes. Teacher only.",
)
def list_my_students(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    List students accessible to this teacher.

    Returns students that were either:
    - Created by this teacher, OR
    - Enrolled in any of this teacher's classes
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get students created by this teacher OR enrolled in teacher's classes
    # First, get all class IDs for this teacher
    teacher_class_ids = select(Class.id).where(Class.teacher_id == teacher.id)

    # Get student IDs enrolled in teacher's classes
    enrolled_student_ids = (
        select(ClassStudent.student_id)
        .where(ClassStudent.class_id.in_(teacher_class_ids))
    )

    # Get students: created by teacher OR enrolled in their classes
    students_statement = (
        select(Student)
        .where(
            (Student.created_by_teacher_id == teacher.id) |
            (Student.id.in_(enrolled_student_ids))
        )
        .distinct()
    )
    students = session.exec(students_statement).all()

    # Build response list with user information for each student
    result = []
    for s in students:
        user = session.get(User, s.user_id)
        # Get teacher name if created_by_teacher_id exists
        teacher_name = None
        if s.created_by_teacher_id:
            created_by_teacher = session.get(Teacher, s.created_by_teacher_id)
            if created_by_teacher:
                teacher_user = session.get(User, created_by_teacher.user_id)
                teacher_name = teacher_user.full_name if teacher_user else None

        student_data = StudentPublic(
            grade_level=s.grade_level,
            parent_email=s.parent_email,
            id=s.id,
            user_id=s.user_id,
            user_email=user.email if user else "",
            user_username=user.username if user else "",
            user_full_name=user.full_name if user and user.full_name else "",
            created_by_teacher_id=s.created_by_teacher_id,
            created_by_teacher_name=teacher_name,
            created_at=s.created_at,
            updated_at=s.updated_at
        )
        result.append(student_data)

    return result


@router.put(
    "/me/students/{student_id}",
    response_model=StudentPublic,
    summary="Update student",
    description="Update a student's information. Teacher only.",
)
def update_student(
    *,
    session: SessionDep,
    student_id: uuid.UUID,
    student_in: StudentUpdate,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Update a student.

    Teachers can update:
    - grade_level
    - parent_email

    Note: User information (name, email, username) cannot be changed through this endpoint.
    """
    # Get Teacher record
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get student
    student = session.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    # Verify student belongs to this teacher (created by them OR enrolled in their class)
    teacher_class_ids = session.exec(
        select(Class.id).where(Class.teacher_id == teacher.id)
    ).all()

    is_enrolled = session.exec(
        select(ClassStudent)
        .where(ClassStudent.student_id == student_id)
        .where(ClassStudent.class_id.in_(teacher_class_ids))
    ).first() is not None

    if student.created_by_teacher_id != teacher.id and not is_enrolled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update a student that is not in your classes"
        )

    # Update student fields (grade_level, parent_email)
    update_data = student_in.model_dump(exclude_unset=True)

    # Separate user fields from student fields
    user_fields = {}
    student_fields = {}

    for key, value in update_data.items():
        if key in ['user_email', 'user_username', 'user_full_name']:
            # Map to User model fields
            if key == 'user_email':
                user_fields['email'] = value
            elif key == 'user_username':
                user_fields['username'] = value
            elif key == 'user_full_name':
                user_fields['full_name'] = value
        else:
            student_fields[key] = value

    # Update student fields
    for key, value in student_fields.items():
        setattr(student, key, value)

    # Update user fields if any
    if user_fields:
        user = session.get(User, student.user_id)
        if user:
            # Check if username is being changed
            if 'username' in user_fields and user_fields['username'] != user.username:
                # Check if new username already exists
                existing_user = crud.get_user_by_username(session=session, username=user_fields['username'])
                if existing_user and existing_user.id != user.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Username already exists"
                    )

            # Check if email is being changed
            if 'email' in user_fields and user_fields['email'] != user.email:
                # Check if new email already exists
                existing_user = crud.get_user_by_email(session=session, email=user_fields['email'])
                if existing_user and existing_user.id != user.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already exists"
                    )

            for key, value in user_fields.items():
                setattr(user, key, value)
            session.add(user)

    session.add(student)
    session.commit()
    session.refresh(student)

    # Get updated user info for response
    user = session.get(User, student.user_id)

    return StudentPublic(
        grade_level=student.grade_level,
        parent_email=student.parent_email,
        id=student.id,
        user_id=student.user_id,
        user_email=user.email if user else "",
        user_username=user.username if user else "",
        user_full_name=user.full_name if user and user.full_name else "",
        created_at=student.created_at,
        updated_at=student.updated_at
    )


@router.delete(
    "/me/students/{student_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete student",
    description="Delete a student and remove from all classes. Teacher only.",
)
def delete_student(
    *,
    session: SessionDep,
    student_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Delete a student.

    This will:
    - Remove student from all classes
    - Delete the student record
    - Delete the associated user account
    """
    # Get Teacher record
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get student
    student = session.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    # Verify student belongs to this teacher (created by them OR enrolled in their class)
    teacher_class_ids = session.exec(
        select(Class.id).where(Class.teacher_id == teacher.id)
    ).all()

    is_enrolled = session.exec(
        select(ClassStudent)
        .where(ClassStudent.student_id == student_id)
        .where(ClassStudent.class_id.in_(teacher_class_ids))
    ).first() is not None

    if student.created_by_teacher_id != teacher.id and not is_enrolled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete a student that is not in your classes"
        )

    # Remove from all classes first
    class_students = session.exec(
        select(ClassStudent).where(ClassStudent.student_id == student_id)
    ).all()

    for cs in class_students:
        session.delete(cs)

    # Get user_id before deleting student
    user_id = student.user_id

    # Delete student
    session.delete(student)

    # Delete associated user
    user = session.get(User, user_id)
    if user:
        session.delete(user)

    session.commit()

    return {"message": "Student deleted successfully"}


class BulkDeleteRequest(SQLModel):
    """Request body for bulk delete operations."""
    ids: list[uuid.UUID]


class BulkDeleteResponse(SQLModel):
    """Response for bulk delete operations."""
    deleted_count: int
    failed_count: int
    errors: list[str] = []


@router.post(
    "/me/students/bulk-delete",
    response_model=BulkDeleteResponse,
    summary="Bulk delete students",
    description="Delete multiple students by IDs. Teacher only.",
)
def bulk_delete_students(
    *,
    session: SessionDep,
    request: BulkDeleteRequest,
    current_user: User = require_role(UserRole.teacher)
) -> BulkDeleteResponse:
    """
    Delete multiple students by their IDs.

    - **ids**: List of student IDs to delete

    Teachers can only delete students they created or students in their classes.
    Returns count of successfully deleted and failed deletions.
    """
    # Get Teacher record
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get teacher's class IDs for permission checking
    teacher_class_ids = session.exec(
        select(Class.id).where(Class.teacher_id == teacher.id)
    ).all()

    deleted_count = 0
    failed_count = 0
    errors: list[str] = []

    for student_id in request.ids:
        try:
            student = session.get(Student, student_id)
            if not student:
                failed_count += 1
                errors.append(f"Student {student_id} not found")
                continue

            # Check permission: created by teacher OR in teacher's class
            is_enrolled = session.exec(
                select(ClassStudent)
                .where(ClassStudent.student_id == student_id)
                .where(ClassStudent.class_id.in_(teacher_class_ids))
            ).first() is not None

            if student.created_by_teacher_id != teacher.id and not is_enrolled:
                failed_count += 1
                errors.append(f"No permission to delete student {student_id}")
                continue

            # Remove from all classes first
            class_students = session.exec(
                select(ClassStudent).where(ClassStudent.student_id == student_id)
            ).all()
            for cs in class_students:
                session.delete(cs)

            # Get user_id and delete
            user_id = student.user_id
            session.delete(student)

            user = session.get(User, user_id)
            if user:
                session.delete(user)

            deleted_count += 1
        except Exception as e:
            failed_count += 1
            errors.append(f"Failed to delete student {student_id}: {str(e)}")

    session.commit()

    return BulkDeleteResponse(
        deleted_count=deleted_count,
        failed_count=failed_count,
        errors=errors
    )


@router.get(
    "/me/classes",
    response_model=list[ClassResponse],
    summary="List my classes",
    description="Retrieve all classes taught by the authenticated teacher with student counts. Teacher only.",
)
def list_my_classes(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    List all classes taught by this teacher with student counts.

    Returns list of classes with student_count for each class.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get all classes for this teacher with student count using LEFT JOIN
    # This avoids N+1 query problem
    from sqlmodel import func

    classes_with_counts = session.exec(
        select(
            Class,
            func.count(ClassStudent.id).label("student_count")
        )
        .outerjoin(ClassStudent, Class.id == ClassStudent.class_id)
        .where(Class.teacher_id == teacher.id)
        .group_by(Class.id)
    ).all()

    # Build response with student counts
    response_classes = [
        ClassResponse(**class_obj.model_dump(), student_count=student_count)
        for class_obj, student_count in classes_with_counts
    ]

    return response_classes


@router.post(
    "/me/classes",
    response_model=ClassPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create new class",
    description="Creates a new class for the authenticated teacher. Teacher only.",
)
def create_class(
    *,
    session: SessionDep,
    class_in: ClassCreateByTeacher,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Create a new class.

    - **name**: Class name (e.g., "Math 101", "English Grade 5")
    - **grade_level**: Optional grade level (e.g., "5", "10")
    - **subject**: Optional subject (e.g., "Mathematics", "English")
    - **academic_year**: Optional academic year (e.g., "2024-2025")

    Note: teacher_id and school_id will be set automatically from the current teacher's record.

    Returns the created class record.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Add teacher_id and school_id to class data
    class_data = class_in.model_dump()
    class_data['teacher_id'] = teacher.id
    class_data['school_id'] = teacher.school_id

    # Create class
    db_class = Class.model_validate(class_data)
    session.add(db_class)
    session.commit()
    session.refresh(db_class)

    return ClassPublic.model_validate(db_class)


@router.get(
    "/me/classes/{class_id}",
    response_model=ClassPublic,
    summary="Get class details",
    description="Retrieve details of a specific class. Teacher only.",
)
def get_class_details(
    *,
    session: SessionDep,
    class_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Get details of a specific class including enrolled students.

    Returns class details.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get class
    db_class = session.get(Class, class_id)
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    # Verify class belongs to this teacher
    if db_class.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another teacher's class"
        )

    return ClassPublic.model_validate(db_class)


@router.put(
    "/me/classes/{class_id}",
    response_model=ClassPublic,
    summary="Update class",
    description="Update a class's details. Teacher only.",
)
def update_class(
    *,
    session: SessionDep,
    class_id: uuid.UUID,
    class_in: ClassUpdate,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Update a class.

    Only the teacher who owns the class can update it.

    Returns updated class.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get class
    db_class = session.get(Class, class_id)
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    # Verify class belongs to this teacher
    if db_class.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update another teacher's class"
        )

    # Update class
    update_data = class_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_class, key, value)

    session.add(db_class)
    session.commit()
    session.refresh(db_class)

    return ClassPublic.model_validate(db_class)


@router.post(
    "/me/classes/{class_id}/students",
    status_code=status.HTTP_201_CREATED,
    summary="Add students to class",
    description="Enroll one or more students in a class. Teacher only.",
)
def add_students_to_class(
    *,
    session: SessionDep,
    class_id: uuid.UUID,
    student_ids: list[uuid.UUID],
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Add students to a class.

    - **student_ids**: List of student IDs to enroll

    Returns success message with count of students added.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get class
    db_class = session.get(Class, class_id)
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    # Verify class belongs to this teacher
    if db_class.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot add students to another teacher's class"
        )

    added_count = 0
    for student_id in student_ids:
        # Check if student exists
        student = session.get(Student, student_id)
        if not student:
            continue  # Skip non-existent students

        # Check if already enrolled
        existing = session.exec(
            select(ClassStudent)
            .where(ClassStudent.class_id == class_id)
            .where(ClassStudent.student_id == student_id)
        ).first()

        if not existing:
            # Add student to class
            class_student = ClassStudent(
                class_id=class_id,
                student_id=student_id
            )
            session.add(class_student)
            added_count += 1

    session.commit()

    return {
        "message": f"Successfully added {added_count} student(s) to class",
        "added_count": added_count
    }


@router.delete(
    "/me/classes/{class_id}/students/{student_id}",
    summary="Remove student from class",
    description="Unenroll a student from a class. Teacher only.",
)
def remove_student_from_class(
    *,
    session: SessionDep,
    class_id: uuid.UUID,
    student_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Remove a student from a class.

    Returns success message.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get class
    db_class = session.get(Class, class_id)
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    # Verify class belongs to this teacher
    if db_class.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove students from another teacher's class"
        )

    # Find enrollment
    class_student = session.exec(
        select(ClassStudent)
        .where(ClassStudent.class_id == class_id)
        .where(ClassStudent.student_id == student_id)
    ).first()

    if not class_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not enrolled in this class"
        )

    # Remove enrollment
    session.delete(class_student)
    session.commit()

    return {"message": "Student removed from class successfully"}


@router.get(
    "/me/classes/{class_id}/students",
    response_model=list[StudentPublic],
    summary="Get students in class",
    description="Retrieve all students enrolled in a specific class. Teacher only.",
)
def get_class_students(
    *,
    session: SessionDep,
    class_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Get all students enrolled in a class.

    Returns list of students.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Get class
    db_class = session.get(Class, class_id)
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )

    # Verify class belongs to this teacher
    if db_class.teacher_id != teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another teacher's class"
        )

    # Get enrolled students
    students_statement = (
        select(Student)
        .join(ClassStudent, ClassStudent.student_id == Student.id)
        .where(ClassStudent.class_id == class_id)
    )
    students = session.exec(students_statement).all()

    # Build response
    result = []
    for s in students:
        user = session.get(User, s.user_id)
        student_data = StudentPublic(
            grade_level=s.grade_level,
            parent_email=s.parent_email,
            id=s.id,
            user_id=s.user_id,
            user_email=user.email if user else "",
            user_username=user.username if user else "",
            user_full_name=user.full_name if user and user.full_name else "",
            created_at=s.created_at,
            updated_at=s.updated_at
        )
        result.append(student_data)

    return result


class StudentsForClassesRequest(SQLModel):
    """Request body for fetching students for multiple classes."""
    class_ids: list[uuid.UUID]


class ClassStudentsGroup(SQLModel):
    """Students grouped by class ID."""
    class_id: uuid.UUID
    students: list[StudentPublic]


@router.post(
    "/me/classes/students",
    response_model=list[ClassStudentsGroup],
    summary="Get students for multiple classes (Story 20.5)",
    description="Retrieve students for multiple classes at once. Returns students grouped by class ID. Teacher only.",
)
def get_students_for_classes(
    *,
    session: SessionDep,
    request: StudentsForClassesRequest,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    Get students for multiple classes at once.

    This endpoint is optimized for fetching students across multiple classes
    to avoid N+1 query problems when displaying selected recipients.

    - **class_ids**: List of class IDs to fetch students for

    Returns list of ClassStudentsGroup, each containing class_id and students list.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Verify all classes belong to this teacher
    classes_statement = select(Class).where(
        Class.id.in_(request.class_ids),
        Class.teacher_id == teacher.id
    )
    classes = session.exec(classes_statement).all()

    verified_class_ids = {c.id for c in classes}

    # If any requested class doesn't belong to teacher, raise error
    requested_class_ids = set(request.class_ids)
    if requested_class_ids != verified_class_ids:
        unauthorized_ids = requested_class_ids - verified_class_ids
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot access classes: {unauthorized_ids}"
        )

    # Fetch all students for these classes in a single query
    students_statement = (
        select(Student, ClassStudent.class_id, User)
        .join(ClassStudent, ClassStudent.student_id == Student.id)
        .join(User, User.id == Student.user_id)
        .where(ClassStudent.class_id.in_(request.class_ids))
        .order_by(ClassStudent.class_id, User.full_name)
    )
    results = session.exec(students_statement).all()

    # Group students by class_id
    students_by_class: dict[uuid.UUID, list[StudentPublic]] = {
        class_id: [] for class_id in request.class_ids
    }

    for student, class_id, user in results:
        student_data = StudentPublic(
            grade_level=student.grade_level,
            parent_email=student.parent_email,
            id=student.id,
            user_id=student.user_id,
            user_email=user.email if user else "",
            user_username=user.username if user else "",
            user_full_name=user.full_name if user and user.full_name else "",
            created_at=student.created_at,
            updated_at=student.updated_at
        )
        students_by_class[class_id].append(student_data)

    # Build response
    response = [
        ClassStudentsGroup(class_id=class_id, students=students)
        for class_id, students in students_by_class.items()
    ]

    return response


# ============================================================================
# Teacher Insights Endpoints (Story 5.4) - DEPRECATED (Story 21.4)
# ============================================================================
# These endpoints have been removed. The Insights feature was experimental
# and has been replaced with student-specific analytics and reports.


@router.get(
    "/me/insights",
    deprecated=True,
    summary="Get teacher insights (DEPRECATED)",
    description="This endpoint has been removed. Use /teacher/analytics/{student_id} for student-specific insights.",
)
async def get_my_insights(
    *,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    DEPRECATED: This endpoint has been removed in Story 21.4.

    Please use student analytics (/teacher/analytics/{student_id})
    or assignment reports (/assignments/{id}/progress) instead.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="The Insights feature has been removed. Please use student analytics or assignment reports instead."
    )


@router.get(
    "/me/insights/{insight_id}",
    deprecated=True,
    summary="Get insight details (DEPRECATED)",
    description="This endpoint has been removed.",
)
async def get_insight_details(
    *,
    session: AsyncSessionDep,
    insight_id: str,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    DEPRECATED: This endpoint has been removed in Story 21.4.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="The Insights feature has been removed."
    )


@router.post(
    "/me/insights/{insight_id}/dismiss",
    deprecated=True,
    summary="Dismiss insight (DEPRECATED)",
    description="This endpoint has been removed.",
)
async def dismiss_insight_endpoint(
    *,
    session: AsyncSessionDep,
    insight_id: str,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    DEPRECATED: This endpoint has been removed in Story 21.4.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="The Insights feature has been removed."
    )
