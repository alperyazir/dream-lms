import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import func, select

from app import crud
from app.api.deps import SessionDep, require_role
from app.models import (
    Assignment,
    Book,
    BulkImportErrorDetail,
    BulkImportResponse,
    DashboardStats,
    Publisher,
    PublisherCreate,
    PublisherCreateAPI,
    PublisherPublic,
    PublisherUpdate,
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
)
from app.services.bulk_import import validate_bulk_import
from app.utils import (
    generate_temp_password,
    generate_username,
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
    - **username**: Username for user account
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

    # Check if username already exists
    existing_username = crud.get_user_by_username(session=session, username=publisher_in.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username already exists"
        )

    # Generate secure temporary password
    initial_password = generate_temp_password()

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
        username=publisher_in.username,
        password=initial_password,
        full_name=publisher_in.full_name,
        publisher_create=publisher_create
    )

    # Build publisher response with user information
    publisher_data = PublisherPublic(
        id=publisher.id,
        name=publisher.name,
        contact_email=publisher.contact_email,
        user_id=publisher.user_id,
        user_email=user.email,
        user_username=user.username,
        user_full_name=user.full_name or "",
        user_initial_password=user.initial_password,
        created_at=publisher.created_at,
        updated_at=publisher.updated_at
    )

    return UserCreationResponse(
        user=UserPublic.model_validate(user),
        initial_password=initial_password,
        role_record=publisher_data
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
    from sqlmodel import col
    statement = select(Publisher).offset(skip).limit(limit)
    publishers = session.exec(statement).all()

    # Build response with user information
    result = []
    for p in publishers:
        user = session.get(User, p.user_id)
        publisher_data = PublisherPublic(
            id=p.id,
            name=p.name,
            contact_email=p.contact_email,
            user_id=p.user_id,
            user_email=user.email if user else "",
            user_username=user.username if user else "",
            user_full_name=user.full_name if user else "",
            user_initial_password=user.initial_password if user else None,
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        result.append(publisher_data)
    return result


@router.put(
    "/publishers/{publisher_id}",
    response_model=PublisherPublic,
    summary="Update a publisher",
    description="Update a publisher by ID. Admin only.",
)
def update_publisher(
    *,
    session: SessionDep,
    publisher_id: uuid.UUID,
    publisher_in: PublisherUpdate,
    current_user: User = require_role(UserRole.admin)
) -> Any:
    """
    Update a publisher by ID.

    - **publisher_id**: ID of the publisher to update
    - **name**: Optional new publisher name
    - **contact_email**: Optional new contact email
    - **user_email**: Optional new user email
    - **user_full_name**: Optional new user full name

    Returns the updated publisher record.
    """
    # Get the publisher
    publisher = session.get(Publisher, publisher_id)
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher not found"
        )

    # Get the associated user
    user = session.get(User, publisher.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user not found"
        )

    # Update data
    update_data = publisher_in.model_dump(exclude_unset=True)

    # Separate user fields from publisher fields
    user_fields = {}
    publisher_fields = {}

    for field, value in update_data.items():
        if field in ['user_email', 'user_full_name']:
            # Map to user model field names
            if field == 'user_email':
                user_fields['email'] = value
            elif field == 'user_full_name':
                user_fields['full_name'] = value
        else:
            publisher_fields[field] = value

    # Check if new email already exists for another user
    if 'email' in user_fields and user_fields['email'] != user.email:
        existing_user = crud.get_user_by_email(session=session, email=user_fields['email'])
        if existing_user and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

    # Update user fields
    for field, value in user_fields.items():
        setattr(user, field, value)

    # Update publisher fields
    for field, value in publisher_fields.items():
        setattr(publisher, field, value)

    # Update timestamp
    from datetime import UTC, datetime
    publisher.updated_at = datetime.now(UTC)

    session.add(user)
    session.add(publisher)
    session.commit()
    session.refresh(publisher)
    session.refresh(user)

    # Build response with user information
    return PublisherPublic(
        id=publisher.id,
        name=publisher.name,
        contact_email=publisher.contact_email,
        user_id=publisher.user_id,
        user_email=user.email,
        user_username=user.username,
        user_full_name=user.full_name or "",
        user_initial_password=user.initial_password,
        created_at=publisher.created_at,
        updated_at=publisher.updated_at
    )


@router.delete(
    "/publishers/{publisher_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a publisher",
    description="Delete a publisher by ID. Admin only.",
)
def delete_publisher(
    *,
    session: SessionDep,
    publisher_id: uuid.UUID,
    current_user: User = require_role(UserRole.admin)
) -> None:
    """
    Delete a publisher by ID.

    - **publisher_id**: ID of the publisher to delete

    Returns 204 No Content on success.
    """
    # Get the publisher
    publisher = session.get(Publisher, publisher_id)
    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher not found"
        )

    # Get the associated user
    user = session.get(User, publisher.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user not found"
        )

    # Delete the user (will cascade to publisher via database ondelete CASCADE)
    session.delete(user)
    session.commit()


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


@router.put(
    "/schools/{school_id}",
    response_model=SchoolPublic,
    summary="Update a school",
    description="Update a school by ID. Admin only.",
)
def update_school(
    *,
    session: SessionDep,
    school_id: uuid.UUID,
    school_in: SchoolUpdate,
    current_user: User = require_role(UserRole.admin)
) -> Any:
    """
    Update a school by ID.

    - **school_id**: ID of the school to update
    - **name**: Optional new school name
    - **address**: Optional new school address
    - **contact_info**: Optional new contact information
    - **publisher_id**: Optional new publisher ID

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

    # If publisher_id is being updated, validate it exists
    if 'publisher_id' in update_data:
        publisher = session.get(Publisher, update_data['publisher_id'])
        if not publisher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Publisher not found"
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
    current_user: User = require_role(UserRole.admin)
) -> None:
    """
    Delete a school by ID.

    - **school_id**: ID of the school to delete

    Returns 204 No Content on success.
    """
    # Get the school
    school = session.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
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
    current_user: User = require_role(UserRole.admin, UserRole.publisher)
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

    # If current user is Publisher, verify school ownership
    if current_user.role == UserRole.publisher:
        publisher_statement = select(Publisher).where(Publisher.user_id == current_user.id)
        publisher = session.exec(publisher_statement).first()

        if not publisher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Publisher record not found for this user"
            )

        if school.publisher_id != publisher.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create teacher in another publisher's school"
            )

    # Generate secure temporary password
    initial_password = generate_temp_password()

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
        password=initial_password,
        full_name=teacher_in.full_name,
        teacher_create=teacher_create
    )

    # Build teacher response with user information
    teacher_data = TeacherPublic(
        id=teacher.id,
        subject_specialization=teacher.subject_specialization,
        user_id=teacher.user_id,
        user_email=user.email,
        user_username=user.username,
        user_full_name=user.full_name or "",
        user_initial_password=user.initial_password,
        school_id=teacher.school_id,
        created_at=teacher.created_at,
        updated_at=teacher.updated_at
    )

    return UserCreationResponse(
        user=UserPublic.model_validate(user),
        initial_password=initial_password,
        role_record=teacher_data
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
            user_full_name=user.full_name if user else "",
            user_initial_password=user.initial_password if user else None,
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
    current_user: User = require_role(UserRole.admin)
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
        if field in ['user_email', 'user_full_name']:
            # Map to user model field names
            if field == 'user_email':
                user_fields['email'] = value
            elif field == 'user_full_name':
                user_fields['full_name'] = value
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
        user_initial_password=user.initial_password,
        school_id=teacher.school_id,
        created_at=teacher.created_at,
        updated_at=teacher.updated_at
    )


@router.delete(
    "/teachers/{teacher_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a teacher",
    description="Delete a teacher by ID. Admin only.",
)
def delete_teacher(
    *,
    session: SessionDep,
    teacher_id: uuid.UUID,
    current_user: User = require_role(UserRole.admin)
) -> None:
    """
    Delete a teacher by ID.

    - **teacher_id**: ID of the teacher to delete

    Returns 204 No Content on success.
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
    current_user: User = require_role(UserRole.admin, UserRole.publisher, UserRole.teacher)
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
    initial_password = generate_temp_password()

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
        password=initial_password,
        full_name=student_in.full_name,
        student_create=student_create
    )

    # Build student response with user information
    student_data = StudentPublic(
        grade_level=student.grade_level,
        parent_email=student.parent_email,
        id=student.id,
        user_id=student.user_id,
        user_email=user.email,
        user_username=user.username,
        user_full_name=user.full_name or "",
        user_initial_password=user.initial_password,
        created_at=student.created_at,
        updated_at=student.updated_at
    )

    return UserCreationResponse(
        user=UserPublic.model_validate(user),
        initial_password=initial_password,
        role_record=student_data
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

    # Build response with user information
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
            user_full_name=user.full_name if user else "",
            user_initial_password=user.initial_password if user else None,
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
    current_user: User = require_role(UserRole.admin)
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
        if field in ['user_email', 'user_full_name']:
            # Map to user model field names
            if field == 'user_email':
                user_fields['email'] = value
            elif field == 'user_full_name':
                user_fields['full_name'] = value
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
        user_initial_password=user.initial_password,
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
    current_user: User = require_role(UserRole.admin)
) -> None:
    """
    Delete a student by ID.

    - **student_id**: ID of the student to delete

    Returns 204 No Content on success.
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

    # Delete the user (will cascade to student via database ondelete CASCADE)
    session.delete(user)
    session.commit()


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
def get_stats(
    session: SessionDep,
    current_user: User = require_role(UserRole.admin)
) -> DashboardStats:
    """
    Get dashboard statistics for admin.
    Returns counts for users, publishers, teachers, students, and schools.
    """
    # Count total users
    total_users = session.exec(select(func.count(User.id))).one()

    # Count publishers
    total_publishers = session.exec(select(func.count(Publisher.id))).one()

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
