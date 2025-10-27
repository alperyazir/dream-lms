import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select

from app import crud
from app.api.deps import SessionDep, require_role
from app.models import (
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
from app.utils import generate_temp_password

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
