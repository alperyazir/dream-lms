import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import func, select

from app import crud
from app.api.deps import SessionDep, require_role
from app.models import (
    BulkImportErrorDetail,
    BulkImportResponse,
    Publisher,
    PublisherCreate,
    PublisherCreateAPI,
    PublisherPublic,
    School,
    SchoolCreate,
    SchoolPublic,
    Student,
    StudentCreate,
    StudentPublic,
    Teacher,
    TeacherCreate,
    TeacherPublic,
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

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post(
    "/publishers",
    response_model=UserCreationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new publisher",
    description="Creates a new publisher user and Publisher record. Admin only.",
)
def create_publisher(
    *,
    session: SessionDep,
    publisher_in: PublisherCreateAPI,
    current_user: User = require_role(UserRole.admin)
) -> Any:
    """
    Create a new publisher with user account.

    - **name**: Publisher name
    - **contact_email**: Publisher contact email
    - **user_email**: Email for user account
    - **full_name**: Full name for user account

    Returns user, temp_password, and publisher record.
    """
    # Check if user email already exists
    existing_user = crud.get_user_by_email(session=session, email=publisher_in.user_email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Generate temporary password
    temp_password = generate_temp_password()

    # Create Publisher record data
    publisher_create = PublisherCreate(
        name=publisher_in.name,
        contact_email=publisher_in.contact_email,
        user_id=uuid.uuid4()  # Placeholder, will be replaced in crud
    )

    # Create user and publisher atomically
    user, publisher = crud.create_publisher(
        session=session,
        email=publisher_in.user_email,
        password=temp_password,
        full_name=publisher_in.full_name,
        publisher_create=publisher_create
    )

    return UserCreationResponse(
        user=UserPublic.model_validate(user),
        temp_password=temp_password,
        role_record=PublisherPublic.model_validate(publisher)
    )


@router.post(
    "/schools",
    response_model=SchoolPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create new school",
    description="Creates a new school linked to a publisher. Admin only.",
)
def create_school(
    *,
    session: SessionDep,
    school_in: SchoolCreate,
    current_user: User = require_role(UserRole.admin)
) -> Any:
    """
    Create a new school.

    - **name**: School name
    - **publisher_id**: ID of the publisher this school belongs to
    - **address**: Optional school address
    - **contact_info**: Optional contact information

    Returns the created school record.
    """
    # Validate publisher exists
    publisher = session.get(Publisher, school_in.publisher_id)
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher not found"
        )

    # Create school
    db_school = School.model_validate(school_in)
    session.add(db_school)
    session.commit()
    session.refresh(db_school)

    return SchoolPublic.model_validate(db_school)


@router.get(
    "/publishers",
    response_model=list[PublisherPublic],
    summary="List all publishers",
    description="Retrieve all publishers with pagination. Admin only.",
)
def list_publishers(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.admin),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    List all publishers with pagination.

    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum number of records to return (default: 100)

    Returns list of publishers.
    """
    statement = select(Publisher).offset(skip).limit(limit)
    publishers = session.exec(statement).all()
    return [PublisherPublic.model_validate(p) for p in publishers]


@router.get(
    "/schools",
    response_model=list[SchoolPublic],
    summary="List all schools",
    description="Retrieve all schools with optional publisher filter. Admin only.",
)
def list_schools(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.admin),
    publisher_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    List all schools with optional filtering.

    - **publisher_id**: Optional filter by publisher ID
    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum number of records to return (default: 100)

    Returns list of schools.
    """
    statement = select(School)
    if publisher_id:
        statement = statement.where(School.publisher_id == publisher_id)
    statement = statement.offset(skip).limit(limit)
    schools = session.exec(statement).all()
    return [SchoolPublic.model_validate(s) for s in schools]


@router.get(
    "/teachers",
    response_model=list[TeacherPublic],
    summary="List all teachers",
    description="Retrieve all teachers with optional school filter. Admin only.",
)
def list_teachers(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.admin),
    school_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    List all teachers with optional filtering.

    - **school_id**: Optional filter by school ID
    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum number of records to return (default: 100)

    Returns list of teachers.
    """
    statement = select(Teacher)
    if school_id:
        statement = statement.where(Teacher.school_id == school_id)
    statement = statement.offset(skip).limit(limit)
    teachers = session.exec(statement).all()
    return [TeacherPublic.model_validate(t) for t in teachers]


@router.get(
    "/students",
    response_model=list[StudentPublic],
    summary="List all students",
    description="Retrieve all students with pagination. Admin only.",
)
def list_students(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.admin),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    List all students with pagination.

    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum number of records to return (default: 100)

    Returns list of students.
    """
    statement = select(Student).offset(skip).limit(limit)
    students = session.exec(statement).all()
    return [StudentPublic.model_validate(s) for s in students]


@router.post(
    "/bulk-import/publishers",
    response_model=BulkImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk import publishers from Excel",
    description="Upload Excel file to create multiple publisher accounts. Admin only.",
)
async def bulk_import_publishers(
    *,
    session: SessionDep,
    file: UploadFile = File(...),
    current_user: User = require_role(UserRole.admin)
) -> Any:
    """
    Bulk import publishers from Excel file.

    Expected Excel columns: First Name, Last Name, Email, Company Name, Contact Email

    Returns BulkImportResponse with created count and credentials list.
    """
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

    # Extract and validate headers
    headers = list(rows[0].keys())
    headers = [h for h in headers if not h.startswith('_')]

    required_headers = ["First Name", "Last Name", "Email", "Company Name", "Contact Email"]
    if not validate_excel_headers(headers, required_headers):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns. Expected: {', '.join(required_headers)}"
        )

    # Validate all rows
    validation_result = validate_bulk_import(rows, UserRole.publisher, session)

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

    # All validations passed - create publishers in transaction
    created_credentials: list[dict[str, str]] = []

    try:
        for row in rows:
            email = row.get('Email', '').strip()
            first_name = row.get('First Name', '').strip()
            last_name = row.get('Last Name', '').strip()
            full_name = f"{first_name} {last_name}"
            company_name = row.get('Company Name', '').strip()
            contact_email = row.get('Contact Email', '').strip()

            # Generate temporary password
            temp_password = generate_temp_password()

            # Create Publisher record data
            publisher_create = PublisherCreate(
                user_id=uuid.uuid4(),  # Placeholder, will be replaced in crud
                name=company_name,
                contact_email=contact_email
            )

            # Create user and publisher atomically
            user, publisher = crud.create_publisher(
                session=session,
                email=email,
                password=temp_password,
                full_name=full_name,
                publisher_create=publisher_create
            )

            created_credentials.append({
                "email": email,
                "temp_password": temp_password,
                "full_name": full_name
            })

        session.commit()
        logger.info(f"Bulk import: Successfully created {len(created_credentials)} publishers")

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


@router.post(
    "/bulk-import/teachers",
    response_model=BulkImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk import teachers from Excel",
    description="Upload Excel file to create multiple teacher accounts. Admin only.",
)
async def bulk_import_teachers(
    *,
    session: SessionDep,
    file: UploadFile = File(...),
    current_user: User = require_role(UserRole.admin)
) -> Any:
    """
    Bulk import teachers from Excel file.

    Expected Excel columns: First Name, Last Name, Email, School ID, Subject Specialization

    Returns BulkImportResponse with created count and credentials list.
    """
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

    # Extract and validate headers
    headers = list(rows[0].keys())
    headers = [h for h in headers if not h.startswith('_')]

    required_headers = ["First Name", "Last Name", "Email", "School ID", "Subject Specialization"]
    if not validate_excel_headers(headers, required_headers):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns. Expected: {', '.join(required_headers)}"
        )

    # Validate all rows
    validation_result = validate_bulk_import(rows, UserRole.teacher, session)

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

    # All validations passed - create teachers in transaction
    created_credentials: list[dict[str, str]] = []

    try:
        for row in rows:
            email = row.get('Email', '').strip()
            first_name = row.get('First Name', '').strip()
            last_name = row.get('Last Name', '').strip()
            full_name = f"{first_name} {last_name}"
            school_id_str = row.get('School ID', '').strip()
            subject_specialization = row.get('Subject Specialization', '').strip() if row.get('Subject Specialization') else None

            # Convert school_id to UUID
            try:
                school_id = uuid.UUID(school_id_str)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid School ID format: {school_id_str}"
                )

            # Verify school exists
            school = session.get(School, school_id)
            if not school:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"School not found: {school_id}"
                )

            # Generate temporary password
            temp_password = generate_temp_password()

            # Create Teacher record data
            teacher_create = TeacherCreate(
                user_id=uuid.uuid4(),  # Placeholder, will be replaced in crud
                school_id=school_id,
                subject_specialization=subject_specialization
            )

            # Create user and teacher atomically
            user, teacher = crud.create_teacher(
                session=session,
                email=email,
                password=temp_password,
                full_name=full_name,
                teacher_create=teacher_create
            )

            created_credentials.append({
                "email": email,
                "temp_password": temp_password,
                "full_name": full_name
            })

        session.commit()
        logger.info(f"Bulk import: Successfully created {len(created_credentials)} teachers")

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


@router.post(
    "/bulk-import/students",
    response_model=BulkImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk import students from Excel",
    description="Upload Excel file to create multiple student accounts. Admin only.",
)
async def bulk_import_students(
    *,
    session: SessionDep,
    file: UploadFile = File(...),
    current_user: User = require_role(UserRole.admin)
) -> Any:
    """
    Bulk import students from Excel file.

    Expected Excel columns: First Name, Last Name, Email, Grade Level, Parent Email

    Returns BulkImportResponse with created count and credentials list.
    """
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

    # Extract and validate headers
    headers = list(rows[0].keys())
    headers = [h for h in headers if not h.startswith('_')]

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
