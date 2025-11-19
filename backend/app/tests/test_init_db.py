"""Unit tests for database initialization (init_db function)."""

from sqlmodel import Session, select

from app.core.db import init_db
from app.models import (
    Assignment,
    Book,
    Class,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


def test_init_db_creates_exactly_one_user(session: Session) -> None:
    """Test that init_db creates exactly one user (admin only)."""
    # Run init_db
    init_db(session)

    # Query all users
    users = session.exec(select(User)).all()

    # Assertions
    assert len(users) == 1, "init_db should create exactly one user"


def test_init_db_creates_admin_with_correct_username(session: Session) -> None:
    """Test that init_db creates user with username='admin'."""
    # Run init_db
    init_db(session)

    # Query the user
    user = session.exec(select(User)).first()

    # Assertions
    assert user is not None
    assert user.username == "admin", "Admin user should have username='admin'"


def test_init_db_creates_superuser(session: Session) -> None:
    """Test that init_db creates user with is_superuser=True."""
    # Run init_db
    init_db(session)

    # Query the user
    user = session.exec(select(User)).first()

    # Assertions
    assert user is not None
    assert user.is_superuser is True, "Admin user should be a superuser"


def test_init_db_creates_admin_role(session: Session) -> None:
    """Test that init_db creates user with role=UserRole.admin."""
    # Run init_db
    init_db(session)

    # Query the user
    user = session.exec(select(User)).first()

    # Assertions
    assert user is not None
    assert user.role == UserRole.admin, "Admin user should have role=admin"


def test_init_db_no_publishers_exist(session: Session) -> None:
    """Test that no publishers exist after init_db."""
    # Run init_db
    init_db(session)

    # Query all publishers
    publishers = session.exec(select(Publisher)).all()

    # Assertions
    assert len(publishers) == 0, "No publishers should exist after init_db"


def test_init_db_no_teachers_exist(session: Session) -> None:
    """Test that no teachers exist after init_db."""
    # Run init_db
    init_db(session)

    # Query all teachers
    teachers = session.exec(select(Teacher)).all()

    # Assertions
    assert len(teachers) == 0, "No teachers should exist after init_db"


def test_init_db_no_students_exist(session: Session) -> None:
    """Test that no students exist after init_db."""
    # Run init_db
    init_db(session)

    # Query all students
    students = session.exec(select(Student)).all()

    # Assertions
    assert len(students) == 0, "No students should exist after init_db"


def test_init_db_no_schools_exist(session: Session) -> None:
    """Test that no schools exist after init_db."""
    # Run init_db
    init_db(session)

    # Query all schools
    schools = session.exec(select(School)).all()

    # Assertions
    assert len(schools) == 0, "No schools should exist after init_db"


def test_init_db_no_classes_exist(session: Session) -> None:
    """Test that no classes exist after init_db."""
    # Run init_db
    init_db(session)

    # Query all classes
    classes = session.exec(select(Class)).all()

    # Assertions
    assert len(classes) == 0, "No classes should exist after init_db"


def test_init_db_no_books_exist(session: Session) -> None:
    """Test that no books exist after init_db."""
    # Run init_db
    init_db(session)

    # Query all books
    books = session.exec(select(Book)).all()

    # Assertions
    assert len(books) == 0, "No books should exist after init_db"


def test_init_db_no_assignments_exist(session: Session) -> None:
    """Test that no assignments exist after init_db."""
    # Run init_db
    init_db(session)

    # Query all assignments
    assignments = session.exec(select(Assignment)).all()

    # Assertions
    assert len(assignments) == 0, "No assignments should exist after init_db"


def test_init_db_is_idempotent(session: Session) -> None:
    """Test that init_db can be run multiple times safely (idempotent)."""
    # Run init_db first time
    init_db(session)

    # Query users after first run
    users_first = session.exec(select(User)).all()
    assert len(users_first) == 1

    # Run init_db second time
    init_db(session)

    # Query users after second run
    users_second = session.exec(select(User)).all()

    # Assertions
    assert len(users_second) == 1, "init_db should be idempotent (same result when run multiple times)"
    assert users_first[0].id == users_second[0].id, "Same admin user should exist after multiple runs"
