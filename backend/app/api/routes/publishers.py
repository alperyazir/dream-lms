import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select

from app import crud
from app.api.deps import SessionDep, require_role
from app.models import (
    DashboardStats,
    Publisher,
    School,
    SchoolCreate,
    SchoolCreateByPublisher,
    SchoolPublic,
    Teacher,
    TeacherCreate,
    TeacherCreateAPI,
    TeacherPublic,
    User,
    UserCreationResponse,
    UserPublic,
    UserRole,
)
from app.utils import generate_temp_password, generate_username

router = APIRouter(prefix="/publishers", tags=["publishers"])


@router.get(
    "/me/schools",
    response_model=list[SchoolPublic],
    summary="List my schools",
    description="Retrieve schools assigned to authenticated publisher. Publisher only.",
)
def list_my_schools(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.publisher)
) -> Any:
    """
    List all schools belonging to the authenticated publisher.

    Returns list of schools.
    """
    # Get Publisher record for current user
    statement = select(Publisher).where(Publisher.user_id == current_user.id)
    publisher = session.exec(statement).first()

    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher record not found for this user"
        )

    # Get ALL publishers with the same organization name
    same_org_publishers = session.exec(
        select(Publisher).where(Publisher.name == publisher.name)
    ).all()

    publisher_ids = [p.id for p in same_org_publishers]

    # Query schools belonging to ANY publisher in the same organization
    schools_statement = select(School).where(School.publisher_id.in_(publisher_ids))
    schools = session.exec(schools_statement).all()

    return [SchoolPublic.model_validate(s) for s in schools]


@router.post(
    "/me/schools",
    response_model=SchoolPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create new school",
    description="Creates a new school for the publisher's organization. Publisher only.",
)
def create_school(
    *,
    session: SessionDep,
    school_in: SchoolCreateByPublisher,
    current_user: User = require_role(UserRole.publisher)
) -> Any:
    """
    Create a new school for the publisher's organization.

    - **name**: School name
    - **address**: Optional school address
    - **contact_info**: Optional contact information

    Note: publisher_id will be set automatically to the current publisher's ID.

    Returns the created school record.
    """
    # Get Publisher record for current user
    statement = select(Publisher).where(Publisher.user_id == current_user.id)
    publisher = session.exec(statement).first()

    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher record not found for this user"
        )

    # Add publisher_id to school data
    school_data = school_in.model_dump()
    school_data['publisher_id'] = publisher.id

    # Create school
    db_school = School.model_validate(school_data)
    session.add(db_school)
    session.commit()
    session.refresh(db_school)

    return SchoolPublic.model_validate(db_school)


@router.post(
    "/me/teachers",
    response_model=UserCreationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new teacher",
    description="Creates a new teacher user linked to publisher's school. Publisher only.",
)
def create_teacher(
    *,
    session: SessionDep,
    teacher_in: TeacherCreateAPI,
    current_user: User = require_role(UserRole.publisher)
) -> Any:
    """
    Create a new teacher for one of the publisher's schools.

    - **username**: Username for user account (3-50 characters, alphanumeric, underscore, or hyphen)
    - **user_email**: Email for user account
    - **full_name**: Full name for user account
    - **school_id**: ID of the school (must belong to this publisher)
    - **subject_specialization**: Optional subject specialization

    Returns user, temp_password, and teacher record.
    """
    # Get Publisher record for current user
    publisher_statement = select(Publisher).where(Publisher.user_id == current_user.id)
    publisher = session.exec(publisher_statement).first()

    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher record not found for this user"
        )

    # Validate school exists and belongs to this publisher
    school = session.get(School, teacher_in.school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )

    if school.publisher_id != publisher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create teacher in another publisher's school"
        )

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
    "/me/teachers",
    response_model=list[TeacherPublic],
    summary="List my organization's teachers",
    description="Retrieve all teachers from schools belonging to the publisher's organization. Publisher only.",
)
def list_my_teachers(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.publisher)
) -> Any:
    """
    List all teachers belonging to schools of the authenticated publisher's organization.

    Returns list of teachers with their user information.
    """
    # Get Publisher record for current user
    statement = select(Publisher).where(Publisher.user_id == current_user.id)
    publisher = session.exec(statement).first()

    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher record not found for this user"
        )

    # Get ALL publishers with the same organization name
    same_org_publishers = session.exec(
        select(Publisher).where(Publisher.name == publisher.name)
    ).all()

    publisher_ids = [p.id for p in same_org_publishers]

    # Get all schools belonging to the organization
    schools = session.exec(
        select(School).where(School.publisher_id.in_(publisher_ids))
    ).all()

    school_ids = [s.id for s in schools]

    # Query teachers belonging to these schools
    teachers = session.exec(
        select(Teacher).where(Teacher.school_id.in_(school_ids))
    ).all()

    # Build response with user information
    result = []
    for teacher in teachers:
        user = session.get(User, teacher.user_id)
        if user:
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
            result.append(teacher_data)

    return result


@router.get(
    "/me/stats",
    response_model=DashboardStats,
    summary="Get my organization's dashboard stats",
    description="Retrieve statistics for the publisher's organization. Publisher only.",
)
def get_my_stats(
    *,
    session: SessionDep,
    current_user: User = require_role(UserRole.publisher)
) -> DashboardStats:
    """
    Get dashboard statistics for the authenticated publisher's organization.

    Returns counts for schools, books, and teachers.
    """
    # Get Publisher record for current user
    statement = select(Publisher).where(Publisher.user_id == current_user.id)
    publisher = session.exec(statement).first()

    if not publisher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher record not found for this user"
        )

    # Get ALL publishers with the same organization name
    same_org_publishers = session.exec(
        select(Publisher).where(Publisher.name == publisher.name)
    ).all()

    publisher_ids = [p.id for p in same_org_publishers]

    # Count schools
    from sqlmodel import func
    total_schools = session.exec(
        select(func.count(School.id)).where(School.publisher_id.in_(publisher_ids))
    ).one()

    # Get all schools for teacher count
    schools = session.exec(
        select(School).where(School.publisher_id.in_(publisher_ids))
    ).all()

    school_ids = [s.id for s in schools]

    # Count teachers
    teachers_created = session.exec(
        select(func.count(Teacher.id)).where(Teacher.school_id.in_(school_ids))
    ).one() if school_ids else 0

    # TODO: Implement book counting when book functionality is ready
    total_books = 0

    return DashboardStats(
        total_users=0,  # Not applicable for publisher dashboard
        total_publishers=0,  # Not applicable
        total_teachers=teachers_created,
        total_students=0,  # Not applicable
        active_schools=total_schools,
    )
