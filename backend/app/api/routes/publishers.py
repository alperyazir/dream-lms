import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select

from app import crud
from app.api.deps import SessionDep, require_role
from app.models import (
    Publisher,
    School,
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
from app.utils import generate_temp_password

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

    # Query schools belonging to this publisher
    schools_statement = select(School).where(School.publisher_id == publisher.id)
    schools = session.exec(schools_statement).all()

    return [SchoolPublic.model_validate(s) for s in schools]


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

    # Generate temporary password
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
        password=temp_password,
        full_name=teacher_in.full_name,
        teacher_create=teacher_create
    )

    return UserCreationResponse(
        user=UserPublic.model_validate(user),
        temp_password=temp_password,
        role_record=TeacherPublic.model_validate(teacher)
    )
