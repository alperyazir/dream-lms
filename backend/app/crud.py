import uuid
from typing import Any

from fastapi import HTTPException
from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    Publisher,
    PublisherCreate,
    Student,
    StudentCreate,
    Teacher,
    TeacherCreate,
    User,
    UserCreate,
    UserRole,
    UserUpdate,
)


def create_user(*, session: Session, user_create: UserCreate) -> User:
    # Check email uniqueness
    existing_user_email = get_user_by_email(session=session, email=user_create.email)
    if existing_user_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check username uniqueness
    existing_user_username = get_user_by_username(session=session, username=user_create.username)
    if existing_user_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


def get_user_by_username(*, session: Session, username: str) -> User | None:
    """
    Retrieve user by username.

    Returns None if user not found.
    """
    statement = select(User).where(User.username == username)
    session_user = session.exec(statement).first()
    return session_user


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None
    return db_user


def authenticate_with_username_or_email(
    *, session: Session, identifier: str, password: str
) -> User | None:
    """
    Authenticate user with either username or email.

    Detects format based on presence of '@' character.
    If '@' present: treats as email
    If no '@': treats as username

    Args:
        session: Database session
        identifier: Username or email address
        password: User password

    Returns:
        User object if authentication successful, None otherwise
    """
    # Detect if identifier is email or username based on '@' character
    if "@" in identifier:
        db_user = get_user_by_email(session=session, email=identifier)
    else:
        db_user = get_user_by_username(session=session, username=identifier)

    if not db_user:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None
    return db_user


def create_publisher(
    *, session: Session, email: str, username: str, password: str, full_name: str, publisher_create: PublisherCreate
) -> tuple[User, Publisher]:
    """
    Create a new publisher user and associated publisher record atomically.

    Args:
        session: Database session
        email: User email address
        username: User username
        password: User password (will be hashed)
        full_name: User full name
        publisher_create: Publisher-specific data

    Returns:
        Tuple of (User, Publisher) records

    Raises:
        Exception: If transaction fails (rolls back automatically)
    """
    # Check email uniqueness
    existing_user_email = get_user_by_email(session=session, email=email)
    if existing_user_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check username uniqueness
    existing_user_username = get_user_by_username(session=session, username=username)
    if existing_user_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create User with publisher role
    user_create = UserCreate(
        email=email,
        username=username,
        password=password,
        full_name=full_name,
        role=UserRole.publisher,
        is_active=True,
        is_superuser=False
    )
    db_user = User.model_validate(
        user_create, update={
            "hashed_password": get_password_hash(password),
            "must_change_password": True  # New users must change password on first login
        }
    )
    session.add(db_user)
    session.flush()  # Get user.id without committing

    # Create Publisher record
    publisher_data = publisher_create.model_dump()
    publisher_data["user_id"] = db_user.id
    db_publisher = Publisher.model_validate(publisher_data)
    session.add(db_publisher)

    # Commit transaction
    session.commit()
    session.refresh(db_user)
    session.refresh(db_publisher)

    return db_user, db_publisher


def create_teacher(
    *, session: Session, email: str, username: str, password: str, full_name: str, teacher_create: TeacherCreate
) -> tuple[User, Teacher]:
    """
    Create a new teacher user and associated teacher record atomically.

    Args:
        session: Database session
        email: User email address
        username: User username
        password: User password (will be hashed)
        full_name: User full_name
        teacher_create: Teacher-specific data (includes school_id)

    Returns:
        Tuple of (User, Teacher) records

    Raises:
        Exception: If transaction fails (rolls back automatically)
    """
    # Check email uniqueness
    existing_user_email = get_user_by_email(session=session, email=email)
    if existing_user_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check username uniqueness
    existing_user_username = get_user_by_username(session=session, username=username)
    if existing_user_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create User with teacher role
    user_create = UserCreate(
        email=email,
        username=username,
        password=password,
        full_name=full_name,
        role=UserRole.teacher,
        is_active=True,
        is_superuser=False
    )
    db_user = User.model_validate(
        user_create, update={
            "hashed_password": get_password_hash(password),
            "must_change_password": True  # New users must change password on first login
        }
    )
    session.add(db_user)
    session.flush()  # Get user.id without committing

    # Create Teacher record
    teacher_data = teacher_create.model_dump()
    teacher_data["user_id"] = db_user.id
    db_teacher = Teacher.model_validate(teacher_data)
    session.add(db_teacher)

    # Commit transaction
    session.commit()
    session.refresh(db_user)
    session.refresh(db_teacher)

    return db_user, db_teacher


def create_student(
    *, session: Session, email: str | None, username: str, password: str, full_name: str, student_create: StudentCreate, created_by_teacher_id: uuid.UUID | None = None
) -> tuple[User, Student]:
    """
    Create a new student user and associated student record atomically.

    Args:
        session: Database session
        email: User email address (optional)
        username: User username
        password: User password (will be hashed)
        full_name: User full name
        student_create: Student-specific data (grade_level, parent_email)
        created_by_teacher_id: Optional ID of teacher who created this student

    Returns:
        Tuple of (User, Student) records

    Raises:
        Exception: If transaction fails (rolls back automatically)
    """
    # Check email uniqueness (only if email is provided)
    if email:
        existing_user_email = get_user_by_email(session=session, email=email)
        if existing_user_email:
            raise HTTPException(status_code=400, detail="Email already registered")

    # Check username uniqueness
    existing_user_username = get_user_by_username(session=session, username=username)
    if existing_user_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create User with student role
    user_create = UserCreate(
        email=email,
        username=username,
        password=password,
        full_name=full_name,
        role=UserRole.student,
        is_active=True,
        is_superuser=False
    )
    db_user = User.model_validate(
        user_create, update={
            "hashed_password": get_password_hash(password),
            "must_change_password": True  # New users must change password on first login
        }
    )
    session.add(db_user)
    session.flush()  # Get user.id without committing

    # Create Student record
    student_data = student_create.model_dump()
    student_data["user_id"] = db_user.id
    if created_by_teacher_id:
        student_data["created_by_teacher_id"] = created_by_teacher_id
    db_student = Student.model_validate(student_data)
    session.add(db_student)

    # Commit transaction
    session.commit()
    session.refresh(db_user)
    session.refresh(db_student)

    return db_user, db_student
