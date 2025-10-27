import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import func, select

from app import crud
from app.api.deps import SessionDep, require_role
from app.models import (
    Publisher,
    PublisherCreate,
    PublisherCreateAPI,
    PublisherPublic,
    School,
    SchoolCreate,
    SchoolPublic,
    Student,
    StudentPublic,
    Teacher,
    TeacherPublic,
    User,
    UserCreationResponse,
    UserPublic,
    UserRole,
)
from app.utils import generate_temp_password

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
