import logging
import uuid
from typing import Any

import httpx
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlmodel import SQLModel, func, select

from app import crud
from app.api.deps import (
    AdminOrSupervisor,
    AsyncSessionDep,
    SessionDep,
    can_delete_user,
    require_role,
)
from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    Assignment,
    AssignmentStudent,
    BulkImportErrorDetail,
    BulkImportResponse,
    DashboardStats,
    NotificationType,
    PasswordResetResponse,
    School,
    SchoolCreate,
    SchoolPublic,
    SchoolUpdate,
    Student,
    StudentCreate,
    StudentCreateAPI,
    StudentPublic,
    StudentUpdate,
    Teacher,
    TeacherCreate,
    TeacherCreateAPI,
    TeacherPublic,
    TeacherUpdate,
    User,
    UserCreationResponse,
    UserPublic,
    UserRole,
    UserUpdate,
)
from app.schemas import (
    AssignmentListResponse,
    AssignmentWithTeacher,
)
from app.schemas.benchmarks import (
    AdminBenchmarkOverview,
    BenchmarkSettingsResponse,
    BenchmarkSettingsUpdate,
)
from app.schemas.publisher import (
    PublisherAccountCreate,
    PublisherAccountCreationResponse,
    PublisherAccountListResponse,
    PublisherAccountPublic,
    PublisherAccountUpdate,
    PublisherPublic,
)
from app.services import notification_service
from app.services.benchmark_service import get_admin_benchmark_overview
from app.services.bulk_import import validate_bulk_import
from app.services.dcs_cache import get_dcs_cache
from app.services.publisher_service_v2 import get_publisher_service
from app.services.webhook_registration import webhook_registration_service
from app.utils import (
    generate_new_account_email,
    generate_password_reset_by_admin_email,
    generate_temp_password,
    generate_username,
    parse_excel_file,
    send_email,
    validate_excel_headers,
    validate_file_size,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post(
    "/publishers",
    status_code=status.HTTP_410_GONE,
    summary="Create new publisher (deprecated)",
    description="Publisher creation is disabled. Publishers are managed in Dream Central Storage.",
)
def create_publisher(
    *,
    current_user: User = AdminOrSupervisor
) -> Any:
    """
    Publisher creation disabled - publishers are managed in Dream Central Storage.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Publisher creation is disabled. Publishers are managed in Dream Central Storage."
    )


@router.post(
    "/schools",
    response_model=SchoolPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create new school",
    description="Creates a new school linked to a publisher. Admin only.",
)
async def create_school(
    *,
    session: SessionDep,
    school_in: SchoolCreate,
    current_user: User = AdminOrSupervisor
) -> Any:
    """
    Create a new school.

    - **name**: School name
    - **dcs_publisher_id**: ID of the publisher in Dream Central Storage
    - **address**: Optional school address
    - **contact_info**: Optional contact information

    Returns the created school record.
    """
    # Validate publisher exists in DCS
    publisher_service = get_publisher_service()
    publisher = await publisher_service.get_publisher(school_in.dcs_publisher_id)
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Publisher {school_in.dcs_publisher_id} not found in Dream Central Storage"
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
    description="Retrieve all publishers from Dream Central Storage. Admin only.",
)
async def list_publishers(
    *,
    current_user: User = AdminOrSupervisor
) -> Any:
    """
    List all publishers from Dream Central Storage.

    Publishers are fetched directly from DCS and cached.
    Returns list of publishers.
    """
    service = get_publisher_service()
    return await service.list_publishers()


@router.put(
    "/publishers/{publisher_id}",
    status_code=status.HTTP_410_GONE,
    summary="Update a publisher (deprecated)",
    description="Publisher updates are disabled. Publishers are managed in Dream Central Storage.",
)
def update_publisher(
    *,
    publisher_id: int,
    current_user: User = AdminOrSupervisor
) -> Any:
    """
    Publisher updates disabled - publishers are managed in Dream Central Storage.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Publisher updates are disabled. Publishers are managed in Dream Central Storage."
    )


class LogoUploadResponse(SQLModel):
    """Response for logo upload"""
    logo_url: str
    message: str = "Logo uploaded successfully"


# Create static logos directory if it doesn't exist
import os

LOGOS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "logos")
os.makedirs(LOGOS_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg"}
MAX_LOGO_SIZE = 2 * 1024 * 1024  # 2MB


@router.post(
    "/publishers/{publisher_id}/logo",
    response_model=LogoUploadResponse,
    summary="Upload publisher logo",
    description="Upload a logo image for a publisher (max 2MB, PNG/JPEG). Admin only.",
)
async def upload_publisher_logo(
    *,
    session: SessionDep,
    publisher_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = AdminOrSupervisor
) -> LogoUploadResponse:
    """
    Upload a logo for a publisher (deprecated).

    Publisher logos are now managed in Dream Central Storage.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Publisher logo uploads are disabled. Publishers are managed in Dream Central Storage."
    )

    # Validate content type [AC: 17]
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: PNG, JPEG. Got: {file.content_type}"
        )

    # Read file content
    content = await file.read()

    # Validate file size [AC: 17]
    if len(content) > MAX_LOGO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is 2MB. Got: {len(content) / (1024 * 1024):.2f}MB"
        )

    # Generate unique filename
    file_extension = ".png" if file.content_type == "image/png" else ".jpg"
    filename = f"{publisher_id}{file_extension}"
    filepath = os.path.join(LOGOS_DIR, filename)

    # Save file
    with open(filepath, "wb") as f:
        f.write(content)

    # Update publisher with logo URL
    logo_url = f"/static/logos/{filename}"
    publisher.logo_url = logo_url
    from datetime import UTC, datetime
    publisher.updated_at = datetime.now(UTC)

    session.add(publisher)
    session.commit()
    session.refresh(publisher)

    logger.info(
        f"Logo uploaded for publisher {publisher.name} (ID: {publisher.id}) by admin {current_user.email}"
    )

    return LogoUploadResponse(
        logo_url=logo_url,
        message="Logo uploaded successfully"
    )


@router.delete(
    "/publishers/{publisher_id}/logo",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete publisher logo",
    description="Delete a publisher's logo. Admin only.",
)
def delete_publisher_logo(
    *,
    session: SessionDep,
    publisher_id: uuid.UUID,
    current_user: User = AdminOrSupervisor
) -> None:
    """Delete a publisher's logo (deprecated)."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Publisher logo management is disabled. Publishers are managed in Dream Central Storage."
    )

    if publisher.logo_url:
        # Try to delete the file
        filename = publisher.logo_url.split("/")[-1]
        filepath = os.path.join(LOGOS_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)

    publisher.logo_url = None
    from datetime import UTC, datetime
    publisher.updated_at = datetime.now(UTC)

    session.add(publisher)
    session.commit()


@router.delete(
    "/publishers/{publisher_id}",
    status_code=status.HTTP_410_GONE,
    summary="Delete a publisher (deprecated)",
    description="Publisher deletion is disabled. Publishers are managed in Dream Central Storage.",
)
def delete_publisher(
    *,
    publisher_id: int,
    current_user: User = AdminOrSupervisor
) -> None:
    """
    Publisher deletion disabled - publishers are managed in Dream Central Storage.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Publisher deletion is disabled. Publishers are managed in Dream Central Storage."
    )


@router.get(
    "/schools",
    response_model=list[SchoolPublic],
    summary="List all schools",
    description="Retrieve all schools with optional publisher filter. Admin only.",
)
def list_schools(
    *,
    session: SessionDep,
    current_user: User = AdminOrSupervisor,
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


@router.put(
    "/schools/{school_id}",
    response_model=SchoolPublic,
    summary="Update a school",
    description="Update a school by ID. Admin only.",
)
async def update_school(
    *,
    session: SessionDep,
    school_id: uuid.UUID,
    school_in: SchoolUpdate,
    current_user: User = AdminOrSupervisor
) -> Any:
    """
    Update a school by ID.

    - **school_id**: ID of the school to update
    - **name**: Optional new school name
    - **address**: Optional new school address
    - **contact_info**: Optional new contact information
    - **dcs_publisher_id**: Optional new publisher ID (from Dream Central Storage)

    Returns the updated school record.
    """
    # Get the school
    school = session.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )

    # Update school fields
    update_data = school_in.model_dump(exclude_unset=True)

    # If dcs_publisher_id is being updated, validate it exists in DCS
    if 'dcs_publisher_id' in update_data:
        publisher_service = get_publisher_service()
        publisher = await publisher_service.get_publisher(update_data['dcs_publisher_id'])
        if not publisher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Publisher {update_data['dcs_publisher_id']} not found in Dream Central Storage"
            )

    for field, value in update_data.items():
        setattr(school, field, value)

    # Update timestamp
    from datetime import UTC, datetime
    school.updated_at = datetime.now(UTC)

    session.add(school)
    session.commit()
    session.refresh(school)

    return SchoolPublic.model_validate(school)


@router.delete(
    "/schools/{school_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a school",
    description="Delete a school by ID. Admin only.",
)
def delete_school(
    *,
    session: SessionDep,
    school_id: uuid.UUID,
    current_user: User = AdminOrSupervisor
) -> None:
    """
    Delete a school by ID.

    - **school_id**: ID of the school to delete

    Returns 204 No Content on success.

    **Permissions:**
    - Admin: can delete any school
    - Supervisor: can delete any school
    """
    # Get the school
    school = session.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )

    logger.info(
        f"School deletion: {current_user.role.value} {current_user.username} "
        f"deleted school {school.name} (ID: {school.id})"
    )

    # Delete the school
    session.delete(school)
    session.commit()


@router.post(
    "/teachers",
    response_model=UserCreationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new teacher",
    description="Creates a new teacher user and Teacher record. Admin OR Publisher.",
)
def create_teacher(
    *,
    session: SessionDep,
    teacher_in: TeacherCreateAPI,
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher)
) -> Any:
    """
    Create a new teacher with user account.

    **Permissions:** Admin OR Publisher

    - **username**: Username for user account (3-50 characters, alphanumeric, underscore, or hyphen)
    - **user_email**: Email for user account
    - **full_name**: Full name for user account
    - **school_id**: ID of the school (must belong to this publisher if Publisher role)
    - **subject_specialization**: Optional subject specialization

    Returns user, temp_password, and teacher record.
    """
    # Check if user email already exists
    existing_user = crud.get_user_by_email(session=session, email=teacher_in.user_email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Check if username already exists
    existing_username = crud.get_user_by_username(session=session, username=teacher_in.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username already exists"
        )

    # Validate school exists
    school = session.get(School, teacher_in.school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )

    # Publisher role is deprecated
    if current_user.role == UserRole.publisher:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Publisher role is deprecated. Publishers are managed in Dream Central Storage."
        )

    # Generate secure temporary password
    temp_password = generate_temp_password()

    # Create Teacher record data
    teacher_create = TeacherCreate(
        user_id=uuid.uuid4(),  # Placeholder, will be replaced in crud
        school_id=teacher_in.school_id,
        subject_specialization=teacher_in.subject_specialization
    )

    # Create user and teacher atomically
    user, teacher = crud.create_teacher(
        session=session,
        email=teacher_in.user_email,
        username=teacher_in.username,
        password=temp_password,
        full_name=teacher_in.full_name,
        teacher_create=teacher_create
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
                full_name=teacher_in.full_name
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
        message = "Please share the temporary password securely with the user"

    # Build teacher response with user information
    teacher_data = TeacherPublic(
        id=teacher.id,
        subject_specialization=teacher.subject_specialization,
        user_id=teacher.user_id,
        user_email=user.email,
        user_username=user.username,
        user_full_name=user.full_name or "",
        school_id=teacher.school_id,
        created_at=teacher.created_at,
        updated_at=teacher.updated_at
    )

    return UserCreationResponse(
        user=UserPublic.model_validate(user),
        role_record=teacher_data,
        temporary_password=temp_password_for_response,
        password_emailed=password_emailed,
        message=message
    )


@router.get(
    "/teachers",
    response_model=list[TeacherPublic],
    summary="List all teachers",
    description="Retrieve all teachers with optional school filter. Admin only.",
)
def list_teachers(
    *,
    session: SessionDep,
    current_user: User = AdminOrSupervisor,
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

    # Build response with user information
    result = []
    for t in teachers:
        user = session.get(User, t.user_id)
        teacher_data = TeacherPublic(
            id=t.id,
            subject_specialization=t.subject_specialization,
            user_id=t.user_id,
            user_email=user.email if user else "",
            user_username=user.username if user else "",
            user_full_name=(user.full_name or "") if user else "",
            school_id=t.school_id,
            created_at=t.created_at,
            updated_at=t.updated_at
        )
        result.append(teacher_data)
    return result


@router.put(
    "/teachers/{teacher_id}",
    response_model=TeacherPublic,
    summary="Update a teacher",
    description="Update a teacher by ID. Admin only.",
)
def update_teacher(
    *,
    session: SessionDep,
    teacher_id: uuid.UUID,
    teacher_in: TeacherUpdate,
    current_user: User = AdminOrSupervisor
) -> Any:
    """
    Update a teacher by ID.

    - **teacher_id**: ID of the teacher to update
    - **school_id**: Optional new school ID
    - **subject_specialization**: Optional new subject specialization
    - **user_email**: Optional new user email
    - **user_full_name**: Optional new user full name

    Returns the updated teacher record.
    """
    # Get the teacher
    teacher = session.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found"
        )

    # Get the associated user
    user = session.get(User, teacher.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user not found"
        )

    # Update data
    update_data = teacher_in.model_dump(exclude_unset=True)

    # Separate user fields from teacher fields
    user_fields = {}
    teacher_fields = {}

    for field, value in update_data.items():
        if field in ['user_email', 'user_full_name', 'user_username']:
            # Map to user model field names
            if field == 'user_email':
                user_fields['email'] = value
            elif field == 'user_full_name':
                user_fields['full_name'] = value
            elif field == 'user_username':
                user_fields['username'] = value
        else:
            teacher_fields[field] = value

    # Check if new email already exists for another user
    if 'email' in user_fields and user_fields['email'] != user.email:
        existing_user = crud.get_user_by_email(session=session, email=user_fields['email'])
        if existing_user and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

    # Check if new username already exists for another user [Story 9.2 AC: 14]
    if 'username' in user_fields and user_fields['username'] != user.username:
        existing_user = session.exec(
            select(User).where(User.username == user_fields['username'])
        ).first()
        if existing_user and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )

    # If school_id is being updated, validate it exists
    if 'school_id' in teacher_fields:
        school = session.get(School, teacher_fields['school_id'])
        if not school:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="School not found"
            )

    # Update user fields
    for field, value in user_fields.items():
        setattr(user, field, value)

    # Update teacher fields
    for field, value in teacher_fields.items():
        setattr(teacher, field, value)

    # Update timestamp
    from datetime import UTC, datetime
    teacher.updated_at = datetime.now(UTC)

    session.add(user)
    session.add(teacher)
    session.commit()
    session.refresh(teacher)
    session.refresh(user)

    # Build response with user information
    return TeacherPublic(
        id=teacher.id,
        subject_specialization=teacher.subject_specialization,
        user_id=teacher.user_id,
        user_email=user.email,
        user_username=user.username,
        user_full_name=user.full_name or "",
        school_id=teacher.school_id,
        created_at=teacher.created_at,
        updated_at=teacher.updated_at
    )


@router.delete(
    "/teachers/{teacher_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a teacher",
    description="Delete a teacher by ID. Admin/Supervisor/Publisher.",
)
def delete_teacher(
    *,
    session: SessionDep,
    teacher_id: uuid.UUID,
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher)
) -> None:
    """
    Delete a teacher by ID.

    - **teacher_id**: ID of the teacher to delete

    Returns 204 No Content on success.

    **Permissions:**
    - Admin: can delete any teacher
    - Supervisor: can delete teachers
    - Publisher: can delete teachers in their schools only
    """
    # Get the teacher
    teacher = session.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found"
        )

    # Get the associated user
    user = session.get(User, teacher.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user not found"
        )

    # Check self-deletion
    if user.id == current_user.id:
        logger.warning(
            f"Deletion blocked (self-deletion): {current_user.role.value} {current_user.username} "
            f"attempted to delete themselves (teacher ID: {teacher_id})"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot delete your own account"
        )

    # Publisher-specific validation
    if current_user.role == UserRole.publisher:
        if current_user.dcs_publisher_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Publisher account not linked to DCS publisher"
            )

        # Verify the teacher's school belongs to this publisher
        if not teacher.school_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete teacher without school assignment"
            )

        school = session.get(School, teacher.school_id)
        if not school or school.dcs_publisher_id != current_user.dcs_publisher_id:
            logger.warning(
                f"Deletion blocked (publisher permission): {current_user.username} "
                f"attempted to delete teacher {user.username} from school not in their publisher"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete teachers from schools not managed by your publisher"
            )

    # Check hierarchical permission (for admin/supervisor)
    if current_user.role in [UserRole.admin, UserRole.supervisor]:
        if not can_delete_user(current_user, user):
            logger.warning(
                f"Deletion blocked (permission): {current_user.role.value} {current_user.username} "
                f"attempted to delete {user.role.value} {user.username} (ID: {user.id})"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Supervisors cannot delete {user.role.value} users"
            )

    logger.info(
        f"User deletion: {current_user.role.value} {current_user.username} "
        f"deleted teacher {user.username} (ID: {user.id})"
    )

    # Delete the user (will cascade to teacher via database ondelete CASCADE)
    session.delete(user)
    session.commit()


@router.post(
    "/students",
    response_model=UserCreationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new student",
    description="Creates a new student user and Student record. Admin, Publisher, OR Teacher.",
)
def create_student(
    *,
    session: SessionDep,
    student_in: StudentCreateAPI,
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher, UserRole.teacher)
) -> Any:
    """
    Create a new student with user account.

    **Permissions:** Admin, Publisher, OR Teacher

    - **username**: Username for user account (3-50 characters, alphanumeric, underscore, or hyphen)
    - **user_email**: Email for user account
    - **full_name**: Full name for user account
    - **grade_level**: Optional grade level
    - **parent_email**: Optional parent email

    Returns user, temp_password, and student record.
    """
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
        student_create=student_create
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
        message = "Please share the temporary password securely with the user"

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


@router.get(
    "/students",
    response_model=list[StudentPublic],
    summary="List all students",
    description="Retrieve all students with pagination. Admin only.",
)
def list_students(
    *,
    session: SessionDep,
    current_user: User = AdminOrSupervisor,
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

    # Build response with user information
    result = []
    for s in students:
        user = session.get(User, s.user_id)

        # Get teacher name if student is bound to a teacher
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
            user_full_name=(user.full_name or "") if user else "",
            created_by_teacher_id=s.created_by_teacher_id,
            created_by_teacher_name=teacher_name,
            created_at=s.created_at,
            updated_at=s.updated_at
        )
        result.append(student_data)
    return result


@router.put(
    "/students/{student_id}",
    response_model=StudentPublic,
    summary="Update a student",
    description="Update a student by ID. Admin only.",
)
def update_student(
    *,
    session: SessionDep,
    student_id: uuid.UUID,
    student_in: StudentUpdate,
    current_user: User = AdminOrSupervisor
) -> Any:
    """
    Update a student by ID.

    - **student_id**: ID of the student to update
    - **user_email**: Optional new user email
    - **user_full_name**: Optional new user full name
    - **grade_level**: Optional new grade level
    - **parent_email**: Optional new parent email

    Returns the updated student record.
    """
    # Get the student
    student = session.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    # Get the associated user
    user = session.get(User, student.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user not found"
        )

    # Update data
    update_data = student_in.model_dump(exclude_unset=True)

    # Separate user fields from student fields
    user_fields = {}
    student_fields = {}

    for field, value in update_data.items():
        if field in ['user_email', 'user_full_name', 'user_username']:
            # Map to user model field names
            if field == 'user_email':
                user_fields['email'] = value
            elif field == 'user_full_name':
                user_fields['full_name'] = value
            elif field == 'user_username':
                user_fields['username'] = value
        else:
            student_fields[field] = value

    # Check if new email already exists for another user
    if 'email' in user_fields and user_fields['email'] != user.email:
        existing_user = crud.get_user_by_email(session=session, email=user_fields['email'])
        if existing_user and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

    # Check if new username already exists for another user [Story 9.2 AC: 14]
    if 'username' in user_fields and user_fields['username'] != user.username:
        existing_user = session.exec(
            select(User).where(User.username == user_fields['username'])
        ).first()
        if existing_user and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )

    # Update user fields
    for field, value in user_fields.items():
        setattr(user, field, value)

    # Update student fields
    for field, value in student_fields.items():
        setattr(student, field, value)

    # Update timestamp
    from datetime import UTC, datetime
    student.updated_at = datetime.now(UTC)

    session.add(user)
    session.add(student)
    session.commit()
    session.refresh(student)
    session.refresh(user)

    # Build response with user information
    return StudentPublic(
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


@router.delete(
    "/students/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a student",
    description="Delete a student by ID. Admin only.",
)
def delete_student(
    *,
    session: SessionDep,
    student_id: uuid.UUID,
    current_user: User = AdminOrSupervisor
) -> None:
    """
    Delete a student by ID.

    - **student_id**: ID of the student to delete

    Returns 204 No Content on success.

    **Permissions:**
    - Admin: can delete any student
    - Supervisor: can delete students
    """
    # Get the student
    student = session.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    # Get the associated user
    user = session.get(User, student.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user not found"
        )

    # Check self-deletion
    if user.id == current_user.id:
        logger.warning(
            f"Deletion blocked (self-deletion): {current_user.role.value} {current_user.username} "
            f"attempted to delete themselves (student ID: {student_id})"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot delete your own account"
        )

    # Check hierarchical permission
    if not can_delete_user(current_user, user):
        logger.warning(
            f"Deletion blocked (permission): {current_user.role.value} {current_user.username} "
            f"attempted to delete {user.role.value} {user.username} (ID: {user.id})"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Supervisors cannot delete {user.role.value} users"
        )

    logger.info(
        f"User deletion: {current_user.role.value} {current_user.username} "
        f"deleted student {user.username} (ID: {user.id})"
    )

    # Delete the user (will cascade to student via database ondelete CASCADE)
    session.delete(user)
    session.commit()


class BulkDeleteRequest(SQLModel):
    """Request body for bulk delete operations."""
    ids: list[uuid.UUID]


class BulkDeleteResponse(SQLModel):
    """Response for bulk delete operations."""
    deleted_count: int
    failed_count: int
    errors: list[str] = []


@router.post(
    "/students/bulk-delete",
    response_model=BulkDeleteResponse,
    summary="Bulk delete students",
    description="Delete multiple students by IDs. Admin only.",
)
def bulk_delete_students(
    *,
    session: SessionDep,
    request: BulkDeleteRequest,
    current_user: User = AdminOrSupervisor
) -> BulkDeleteResponse:
    """
    Delete multiple students by their IDs.

    - **ids**: List of student IDs to delete

    Returns count of successfully deleted and failed deletions.

    **Permissions:**
    - Admin: can delete any students
    - Supervisor: can delete students
    """
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

            user = session.get(User, student.user_id)
            if not user:
                failed_count += 1
                errors.append(f"User for student {student_id} not found")
                continue

            # Check self-deletion
            if user.id == current_user.id:
                failed_count += 1
                errors.append(f"Cannot delete your own account (student {student_id})")
                continue

            # Check hierarchical permission
            if not can_delete_user(current_user, user):
                failed_count += 1
                errors.append(f"Cannot delete {user.role.value} user (student {student_id})")
                continue

            session.delete(user)
            deleted_count += 1

            logger.info(
                f"Bulk deletion: {current_user.role.value} {current_user.username} "
                f"deleted student {user.username} (ID: {user.id})"
            )
        except Exception as e:
            failed_count += 1
            errors.append(f"Failed to delete student {student_id}: {str(e)}")

    session.commit()

    return BulkDeleteResponse(
        deleted_count=deleted_count,
        failed_count=failed_count,
        errors=errors
    )


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
    current_user: User = AdminOrSupervisor
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

            # Generate unique username
            username = generate_username(full_name, session)

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
                username=username,
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
    current_user: User = AdminOrSupervisor
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

            # Generate unique username
            username = generate_username(full_name, session)

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
                username=username,
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
    current_user: User = AdminOrSupervisor
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


# ============================================================================
# Dashboard Statistics
# ============================================================================


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    session: SessionDep,
    current_user: User = AdminOrSupervisor
) -> DashboardStats:
    """
    Get dashboard statistics for admin.
    Returns counts for users, publishers, teachers, students, and schools.
    """
    # Count total users
    total_users = session.exec(select(func.count(User.id))).one()

    # Count publishers from DCS
    publisher_service = get_publisher_service()
    publishers = await publisher_service.list_publishers()
    total_publishers = len(publishers)

    # Count teachers
    total_teachers = session.exec(select(func.count(Teacher.id))).one()

    # Count students
    total_students = session.exec(select(func.count(Student.id))).one()

    # Count schools (all schools are considered "active" for now)
    active_schools = session.exec(select(func.count(School.id))).one()

    return DashboardStats(
        total_users=total_users,
        total_publishers=total_publishers,
        total_teachers=total_teachers,
        total_students=total_students,
        active_schools=active_schools,
    )


# ============================================================================
# User Management
# ============================================================================


@router.patch(
    "/users/{user_id}",
    response_model=UserPublic,
    summary="Edit user",
    description="Update a user's profile information. Admin only.",
)
def admin_update_user(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    user_in: UserUpdate,
    current_user: User = AdminOrSupervisor
) -> UserPublic:
    """
    Update a user's information.

    [Source: Story 9.2 AC: 10, 11, 13]

    - **user_id**: ID of the user to update
    - **full_name**: Optional new full name
    - **email**: Optional new email (validated for format and uniqueness)
    - **username**: Optional new username (validated for format and uniqueness)

    Returns the updated user data.
    """
    # Get the user
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Validate email uniqueness if changing
    if user_in.email and user_in.email != db_user.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )

    # Validate username uniqueness if changing
    if user_in.username and user_in.username != db_user.username:
        existing_user = session.exec(
            select(User).where(User.username == user_in.username)
        ).first()
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this username already exists"
            )

    # Update user fields
    db_user = crud.update_user(session=session, db_user=db_user, user_in=user_in)

    logger.info(
        f"User {db_user.email} (ID: {db_user.id}) updated by admin {current_user.email}"
    )

    return UserPublic.model_validate(db_user)


# ============================================================================
# Password Reset
# ============================================================================


async def _is_user_under_publisher(
    session: AsyncSessionDep,
    publisher_user: User,
    target_user: User
) -> bool:
    """
    Check if target user is a teacher or student under the publisher's schools.

    [Source: Story 11.2 - Publisher permission helper]

    **DEPRECATED:** Publisher role is deprecated. This function always returns False.
    Publishers are now managed in Dream Central Storage.

    Args:
        session: Async database session
        publisher_user: The publisher's User record
        target_user: The user being checked

    Returns:
        Always False (Publisher role deprecated)
    """
    # Publisher role is deprecated - publishers are managed in DCS
    return False


@router.post(
    "/users/{user_id}/reset-password",
    response_model=PasswordResetResponse,
    summary="Reset user password",
    description=(
        "Reset a user's password. Admin can reset any user. "
        "Publisher can reset their teachers/students only."
    ),
)
async def reset_user_password(
    *,
    session: AsyncSessionDep,
    user_id: uuid.UUID,
    current_user: User = require_role(UserRole.admin, UserRole.supervisor, UserRole.publisher)
) -> PasswordResetResponse:
    """
    Reset a user's password.

    [Source: Story 11.2 - Secure password reset]

    - **user_id**: ID of the user whose password to reset

    Generates a secure random password (12+ chars with mixed case, numbers,
    symbols).

    - If user has email and emails are enabled: sends password via email
    - If user has no email or emails disabled: returns password once

    Sets must_change_password = True so user must change password on next login.
    Creates a notification for the user that their password was reset.

    **Permissions:**
    - Admin: can reset any user's password (except other admins)
    - Publisher: can only reset passwords for their own teachers/students
    """
    # Get the user
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Cannot reset admin or supervisor password via this endpoint (must use different mechanism)
    if user.role == UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot reset admin password via this endpoint"
        )

    # Permission check based on current user's role
    if current_user.role == UserRole.admin:
        pass  # Admin can reset anyone (except other admins, already checked)
    elif current_user.role == UserRole.supervisor:
        # Supervisor cannot reset admin or other supervisor passwords
        if user.role == UserRole.supervisor:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Supervisors cannot reset other supervisor passwords"
            )
        # Supervisor can reset publisher, teacher, student passwords
    elif current_user.role == UserRole.publisher:
        # Publisher can only reset their teachers/students
        if not await _is_user_under_publisher(session, current_user, user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to reset this user's password"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin, supervisor, or publisher can reset passwords"
        )

    # Generate new secure password
    new_password = generate_temp_password(length=12)

    # Hash and update password
    user.hashed_password = get_password_hash(new_password)
    # Force password change on next login
    user.must_change_password = True

    session.add(user)
    await session.commit()
    await session.refresh(user)

    # Log the password reset action
    logger.info(
        f"Password reset for user {user.username} (ID: {user.id}) "
        f"by {current_user.role} {current_user.username}"
    )

    # Create notification for user
    await notification_service.create_notification(
        db=session,
        user_id=user.id,
        notification_type=NotificationType.password_reset,
        title="Password Reset",
        message=(
            "Your password was reset by an administrator. "
            "Please change your password after logging in."
        ),
        link="/settings",
    )

    # Handle password delivery based on email availability
    password_emailed = False
    temp_password_for_response = None

    if user.email and settings.emails_enabled:
        # Send password via email - secure path (Story 11.2)
        email_data = generate_password_reset_by_admin_email(
            email_to=user.email,
            username=user.username,
            password=new_password
        )
        send_email(
            email_to=user.email,
            subject=email_data.subject,
            html_content=email_data.html_content
        )
        password_emailed = True
        message = f"Password reset successfully. New password sent to {user.email}"
    else:
        # No email or emails disabled - return password for manual sharing
        temp_password_for_response = new_password
        message = (
            "Password reset successfully. "
            "Please share the temporary password securely with the user."
        )

    return PasswordResetResponse(
        success=True,
        message=message,
        password_emailed=password_emailed,
        temporary_password=temp_password_for_response
    )


@router.get(
    "/cache/stats",
    summary="Get DCS cache statistics",
    description="Returns cache hit/miss statistics for monitoring. Admin only.",
)
def get_cache_stats(
    _: User = require_role(UserRole.admin),
) -> dict[str, Any]:
    """
    Get DCS cache statistics for monitoring.

    [Source: Story 24.1 - LMS Caching Infrastructure]

    Returns:
    - entries: Current number of cached items
    - hits: Total cache hits since startup
    - misses: Total cache misses since startup
    - hit_rate: Cache hit rate (0.0 to 1.0)
    """
    cache = get_dcs_cache()
    return cache.stats()


@router.post(
    "/cache/clear",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear DCS cache",
    description="Clears all cached DCS data. Admin only. Use with caution.",
)
async def clear_cache(
    _: User = require_role(UserRole.admin),
) -> None:
    """
    Clear all DCS cache entries.

    [Source: Story 24.1 - LMS Caching Infrastructure]

    This will force fresh data to be fetched from DCS on next access.
    Use with caution as it may temporarily increase DCS API load.
    """
    cache = get_dcs_cache()
    await cache.clear()
    logger.info("DCS cache cleared by admin")


@router.get("/test-dream-storage-connection")
async def test_dream_storage_connection(
    _: User = require_role(UserRole.admin),
) -> dict[str, Any]:
    """
    Test connection to Dream Central Storage API (admin only).

    Attempts to authenticate with Dream Central Storage and returns
    detailed connection status and error messages.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.DREAM_CENTRAL_STORAGE_URL}/auth/login",
                json={
                    "email": settings.DREAM_CENTRAL_STORAGE_EMAIL,
                    "password": settings.DREAM_CENTRAL_STORAGE_PASSWORD,
                },
            )

            if response.status_code == 200:
                return {
                    "status": "success",
                    "message": "Successfully connected to Dream Central Storage",
                    "url": settings.DREAM_CENTRAL_STORAGE_URL,
                    "details": {
                        "status_code": 200,
                        "authenticated": True,
                    },
                }
            else:
                return {
                    "status": "error",
                    "message": f"Authentication failed with status {response.status_code}",
                    "url": settings.DREAM_CENTRAL_STORAGE_URL,
                    "details": {
                        "status_code": response.status_code,
                        "response": response.text[:500],  # First 500 chars
                    },
                }

    except httpx.TimeoutException:
        logger.error("Dream Central Storage connection timeout")
        return {
            "status": "error",
            "message": "Connection timeout - Dream Central Storage is unreachable",
            "url": settings.DREAM_CENTRAL_STORAGE_URL,
            "details": {
                "error_type": "timeout",
            },
        }
    except Exception as e:
        logger.error(f"Dream Central Storage connection error: {e}")
        return {
            "status": "error",
            "message": f"Connection failed: {str(e)}",
            "url": settings.DREAM_CENTRAL_STORAGE_URL,
            "details": {
                "error_type": type(e).__name__,
                "error_message": str(e),
            },
        }


@router.post("/webhooks/register", status_code=status.HTTP_200_OK)
async def register_webhooks_manually(
    _: User = require_role(UserRole.admin),
    force_recreate: bool = False,
) -> dict[str, Any]:
    """
    Manually register webhooks with Dream Central Storage (admin only).

    This endpoint allows admins to manually register the webhook subscription
    if the automatic registration on startup failed or needs to be updated.

    - **force_recreate**: If True, delete existing subscription and create new one

    Returns registration status with subscription details.
    """
    logger.info(
        f"Admin webhook registration requested (force_recreate={force_recreate})"
    )

    result = await webhook_registration_service.register_webhook(
        force_recreate=force_recreate
    )

    if result["success"]:
        logger.info(f"✅ Admin webhook registration succeeded: {result['message']}")
    else:
        logger.warning(f"⚠️  Admin webhook registration failed: {result['message']}")

    return result


# --- Benchmark Overview Endpoint (Story 5.7) ---


@router.get(
    "/benchmarks/overview",
    response_model=AdminBenchmarkOverview,
    summary="Get system-wide benchmark overview",
    description="Returns aggregated benchmark statistics across all schools (admin/supervisor)."
)
async def get_benchmark_overview_endpoint(
    *,
    session: AsyncSessionDep,
    _: User = require_role(UserRole.admin, UserRole.supervisor)
) -> AdminBenchmarkOverview:
    """
    Get system-wide benchmark overview for admin dashboard.

    [Source: Story 5.7 AC: 12]

    Returns:
    - Total schools and schools with benchmarking enabled
    - Schools above/at/below average performance
    - System-wide average score
    - Activity type statistics across all schools
    - Per-school benchmark summaries
    """
    overview = await get_admin_benchmark_overview(session)
    return overview


@router.patch(
    "/schools/{school_id}/settings",
    response_model=BenchmarkSettingsResponse,
    summary="Update school benchmark settings",
    description="Toggle benchmarking for a specific school (admin/supervisor)."
)
def update_school_benchmark_settings(
    *,
    session: SessionDep,
    school_id: uuid.UUID,
    settings_in: BenchmarkSettingsUpdate,
    _: User = require_role(UserRole.admin, UserRole.supervisor)
) -> BenchmarkSettingsResponse:
    """
    Update benchmark settings for a school.

    [Source: Story 5.7 AC: 9]

    - **school_id**: UUID of the school
    - **benchmarking_enabled**: Enable or disable benchmarking for this school

    When disabled, teachers in this school cannot see benchmark comparisons.
    """
    from datetime import UTC, datetime

    school = session.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )

    school.benchmarking_enabled = settings_in.benchmarking_enabled
    school.updated_at = datetime.now(UTC)

    session.add(school)
    session.commit()
    session.refresh(school)

    return BenchmarkSettingsResponse(
        entity_type="school",
        entity_id=str(school.id),
        benchmarking_enabled=school.benchmarking_enabled,
        updated_at=school.updated_at,
    )


@router.patch(
    "/publishers/{publisher_id}/settings",
    response_model=BenchmarkSettingsResponse,
    summary="Update publisher benchmark settings",
    description="Toggle benchmarking for a specific publisher (admin/supervisor)."
)
def update_publisher_benchmark_settings(
    *,
    session: SessionDep,
    publisher_id: uuid.UUID,
    settings_in: BenchmarkSettingsUpdate,
    _: User = require_role(UserRole.admin, UserRole.supervisor)
) -> BenchmarkSettingsResponse:
    """
    Update benchmark settings for a publisher (deprecated).

    Publisher benchmark settings are now managed in Dream Central Storage.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Publisher benchmark settings are now managed in Dream Central Storage."
    )


# =============================================================================
# Publisher Account CRUD Endpoints
# =============================================================================


@router.post(
    "/publisher-accounts",
    response_model=PublisherAccountCreationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create publisher user account",
    description="Creates a new user account with publisher role linked to a DCS publisher.",
)
async def create_publisher_account(
    *,
    session: SessionDep,
    account_in: PublisherAccountCreate,
    current_user: User = AdminOrSupervisor,
) -> PublisherAccountCreationResponse:
    """
    Create publisher user account.

    - Validates DCS publisher exists
    - Creates user with role=publisher
    - Sets dcs_publisher_id on user
    - Sends welcome email with credentials
    """
    # Check if user email already exists
    existing_user = crud.get_user_by_email(session=session, email=account_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Generate username from full_name if not provided
    from app.utils import generate_username_from_name
    username = account_in.username
    if not username:
        username = generate_username_from_name(
            full_name=account_in.full_name,
            session=session
        )
    else:
        # Check if provided username already exists
        existing_username = crud.get_user_by_username(session=session, username=username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this username already exists"
            )

    # Validate DCS publisher exists
    publisher_service = get_publisher_service()
    publisher = await publisher_service.get_publisher(account_in.dcs_publisher_id)
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"DCS Publisher ID {account_in.dcs_publisher_id} not found"
        )

    # Generate secure temporary password
    temp_password = generate_temp_password()

    # Create user with publisher role
    from app.models import UserCreate
    user_create = UserCreate(
        email=account_in.email,
        username=username,
        password=temp_password,
        full_name=account_in.full_name,
        role=UserRole.publisher,
        dcs_publisher_id=account_in.dcs_publisher_id,
    )
    user = crud.create_user(session=session, user_create=user_create)

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
                full_name=account_in.full_name
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
        message = "Please share the temporary password securely with the user"

    return PublisherAccountCreationResponse(
        user=UserPublic.model_validate(user),
        temporary_password=temp_password_for_response,
        password_emailed=password_emailed,
        message=message
    )


@router.get(
    "/publisher-accounts",
    response_model=PublisherAccountListResponse,
    summary="List all publisher user accounts",
    description="Returns all user accounts with role=publisher, enriched with DCS publisher names.",
)
async def list_publisher_accounts(
    *,
    session: SessionDep,
    current_user: User = AdminOrSupervisor,
    skip: int = 0,
    limit: int = 100,
) -> PublisherAccountListResponse:
    """
    List all publisher user accounts.

    Returns users with role=publisher, enriched with DCS publisher name.
    """
    # Query users with publisher role
    statement = (
        select(User)
        .where(User.role == UserRole.publisher)
        .offset(skip)
        .limit(limit)
    )
    result = session.exec(statement)
    users = result.all()

    # Count total
    count_statement = select(func.count()).select_from(User).where(User.role == UserRole.publisher)
    total = session.exec(count_statement).one()

    # Enrich with DCS publisher names
    publisher_service = get_publisher_service()
    accounts = []
    for user in users:
        dcs_publisher_name = None
        if user.dcs_publisher_id:
            publisher = await publisher_service.get_publisher(user.dcs_publisher_id)
            if publisher:
                dcs_publisher_name = publisher.name

        accounts.append(PublisherAccountPublic(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            dcs_publisher_id=user.dcs_publisher_id,
            dcs_publisher_name=dcs_publisher_name,
            is_active=user.is_active,
            created_at=None,  # User model may not have created_at
        ))

    return PublisherAccountListResponse(data=accounts, count=total)


@router.get(
    "/publisher-accounts/{user_id}",
    response_model=PublisherAccountPublic,
    summary="Get publisher user account",
    description="Returns a single publisher user account by ID.",
)
async def get_publisher_account(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    current_user: User = AdminOrSupervisor,
) -> PublisherAccountPublic:
    """
    Get a single publisher user account.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher account not found"
        )

    if user.role != UserRole.publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a publisher account"
        )

    # Enrich with DCS publisher name
    dcs_publisher_name = None
    if user.dcs_publisher_id:
        publisher_service = get_publisher_service()
        publisher = await publisher_service.get_publisher(user.dcs_publisher_id)
        if publisher:
            dcs_publisher_name = publisher.name

    return PublisherAccountPublic(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        dcs_publisher_id=user.dcs_publisher_id,
        dcs_publisher_name=dcs_publisher_name,
        is_active=user.is_active,
        created_at=None,
    )


@router.put(
    "/publisher-accounts/{user_id}",
    response_model=PublisherAccountPublic,
    summary="Update publisher user account",
    description="Updates a publisher user account's details or DCS link.",
)
async def update_publisher_account(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    account_in: PublisherAccountUpdate,
    current_user: User = AdminOrSupervisor,
) -> PublisherAccountPublic:
    """
    Update a publisher user account.

    Can update dcs_publisher_id, username, email, full_name, is_active.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher account not found"
        )

    if user.role != UserRole.publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a publisher account"
        )

    # If updating dcs_publisher_id, validate it exists
    if account_in.dcs_publisher_id is not None:
        publisher_service = get_publisher_service()
        publisher = await publisher_service.get_publisher(account_in.dcs_publisher_id)
        if not publisher:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"DCS Publisher ID {account_in.dcs_publisher_id} not found"
            )

    # Check username uniqueness if changing
    if account_in.username and account_in.username != user.username:
        existing = crud.get_user_by_username(session=session, username=account_in.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

    # Check email uniqueness if changing
    if account_in.email and account_in.email != user.email:
        existing = crud.get_user_by_email(session=session, email=account_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    # Update user
    update_data = account_in.model_dump(exclude_unset=True)
    user.sqlmodel_update(update_data)
    session.add(user)
    session.commit()
    session.refresh(user)

    # Enrich with DCS publisher name
    dcs_publisher_name = None
    if user.dcs_publisher_id:
        publisher_service = get_publisher_service()
        publisher = await publisher_service.get_publisher(user.dcs_publisher_id)
        if publisher:
            dcs_publisher_name = publisher.name

    return PublisherAccountPublic(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        dcs_publisher_id=user.dcs_publisher_id,
        dcs_publisher_name=dcs_publisher_name,
        is_active=user.is_active,
        created_at=None,
    )


@router.delete(
    "/publisher-accounts/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete publisher user account",
    description="Deletes a publisher user account.",
)
def delete_publisher_account(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    current_user: User = AdminOrSupervisor,
) -> None:
    """
    Delete a publisher user account.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher account not found"
        )

    if user.role != UserRole.publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a publisher account"
        )

    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    session.delete(user)
    session.commit()


# =============================================================================
# Assignment Management Endpoints (Story 20.1)
# =============================================================================


@router.get(
    "/assignments",
    response_model=AssignmentListResponse,
    summary="List all assignments (Admin only)",
    description="List all assignments across all teachers with filtering and pagination.",
)
def list_all_assignments(
    *,
    session: SessionDep,
    current_user: User = AdminOrSupervisor,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    teacher_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
) -> AssignmentListResponse:
    """
    List all assignments (Admin only).

    Supports filtering by:
    - teacher_id: Filter by specific teacher
    - status: Filter by assignment status (draft, published, scheduled)
    - search: Search by assignment name (case-insensitive)
    """
    # Story 20.1: Fix N+1 query problem by using subqueries for counts
    # Create subquery for recipient count
    recipient_count_subq = (
        select(
            AssignmentStudent.assignment_id,
            func.count().label("recipient_count")
        )
        .group_by(AssignmentStudent.assignment_id)
        .subquery()
    )

    # Create subquery for completed count
    completed_count_subq = (
        select(
            AssignmentStudent.assignment_id,
            func.count().label("completed_count")
        )
        .where(AssignmentStudent.status == "completed")
        .group_by(AssignmentStudent.assignment_id)
        .subquery()
    )

    # Build base query with teacher join and count subqueries
    query = (
        select(
            Assignment,
            User.full_name.label("teacher_name"),
            User.email.label("teacher_email"),
            func.coalesce(recipient_count_subq.c.recipient_count, 0).label("recipient_count"),
            func.coalesce(completed_count_subq.c.completed_count, 0).label("completed_count"),
        )
        .join(Teacher, Teacher.id == Assignment.teacher_id)
        .join(User, User.id == Teacher.user_id)
        .outerjoin(recipient_count_subq, recipient_count_subq.c.assignment_id == Assignment.id)
        .outerjoin(completed_count_subq, completed_count_subq.c.assignment_id == Assignment.id)
    )

    # Apply filters
    if teacher_id:
        query = query.where(Assignment.teacher_id == teacher_id)
    if status:
        query = query.where(Assignment.status == status)
    if search:
        query = query.where(Assignment.name.ilike(f"%{search}%"))

    # Get total count for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Get paginated results ordered by created_at desc
    results = session.exec(
        query.order_by(Assignment.created_at.desc()).offset(skip).limit(limit)
    ).all()

    # Build response items with enriched data (Story 20.1: counts now from query)
    items = []
    for assignment, teacher_name, teacher_email, recipient_count, completed_count in results:
        items.append(
            AssignmentWithTeacher(
                id=assignment.id,
                title=assignment.name,
                teacher_id=assignment.teacher_id,
                teacher_name=teacher_name,
                teacher_email=teacher_email,
                recipient_count=recipient_count,
                completed_count=completed_count,
                due_date=assignment.due_date,
                status=assignment.status,
                created_at=assignment.created_at,
            )
        )

    return AssignmentListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.delete(
    "/assignments/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete assignment (Admin only)",
    description="Delete an assignment and all related data including student submissions.",
)
def delete_assignment(
    *,
    session: SessionDep,
    assignment_id: uuid.UUID,
    current_user: User = AdminOrSupervisor,
) -> None:
    """
    Delete assignment and all related data (Admin only).

    Cascades to:
    - AssignmentStudent records (submissions)
    - AssignmentActivity records (multi-activity assignments)
    - Notifications related to the assignment
    """
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    # Delete assignment (cascade handles related records)
    session.delete(assignment)
    session.commit()

    logger.info(
        f"Admin {current_user.id} ({current_user.email}) deleted assignment {assignment_id} "
        f"(title: {assignment.name})"
    )
