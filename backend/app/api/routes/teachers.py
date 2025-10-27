import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import select

from app import crud
from app.api.deps import SessionDep, require_role
from app.models import (
    BulkImportErrorDetail,
    BulkImportResponse,
    Class,
    ClassStudent,
    Student,
    StudentCreate,
    StudentCreateAPI,
    StudentPublic,
    Teacher,
    User,
    UserCreationResponse,
    UserPublic,
    UserRole,
)
from app.services.bulk_import import validate_bulk_import
from app.utils import (
    generate_temp_password,
    parse_excel_file,
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

    # Generate temporary password
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
        password=temp_password,
        full_name=student_in.full_name,
        student_create=student_create
    )

    return UserCreationResponse(
        user=UserPublic.model_validate(user),
        temp_password=temp_password,
        role_record=StudentPublic.model_validate(student)
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
                password=temp_password,
                full_name=full_name,
                student_create=student_create
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
    description="Retrieve students enrolled in authenticated teacher's classes. Teacher only.",
)
def list_my_students(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.teacher)
) -> Any:
    """
    List all students enrolled in any of the teacher's classes.

    Returns distinct list of students.
    """
    # Get Teacher record for current user
    teacher_statement = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher = session.exec(teacher_statement).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user"
        )

    # Query students enrolled in this teacher's classes
    # Join ClassStudent -> Class -> Teacher
    students_statement = (
        select(Student)
        .join(ClassStudent, ClassStudent.student_id == Student.id)
        .join(Class, Class.id == ClassStudent.class_id)
        .where(Class.teacher_id == teacher.id)
        .distinct()
    )
    students = session.exec(students_statement).all()

    return [StudentPublic.model_validate(s) for s in students]
