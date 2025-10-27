"""
Test fixtures for pytest
"""
import uuid
from collections.abc import Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine, delete
from sqlmodel.pool import StaticPool

from app.core.config import settings
from app.core.db import init_db
from app.core.security import get_password_hash
from app.main import app
from app.models import Publisher, School, Student, Teacher, User, UserRole


# Test database with in-memory SQLite
@pytest.fixture(name="session", scope="function")
def session_fixture() -> Generator[Session, None, None]:
    """Create a fresh database session for each test"""
    from sqlalchemy import event

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Enable foreign key constraints for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        try:
            yield session
        except Exception:
            # Rollback on any exception during test
            session.rollback()
            raise
        finally:
            # Clean up after test
            try:
                for table in reversed(SQLModel.metadata.sorted_tables):
                    session.exec(delete(table))
                session.commit()
            except Exception:
                session.rollback()


@pytest.fixture(name="client")
def client_fixture(session: Session) -> Generator[TestClient, Any, None]:
    """Create a test client with database session override"""
    def get_session_override():
        return session

    from app.api.deps import get_db
    app.dependency_overrides[get_db] = get_session_override

    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="admin_user")
def admin_user_fixture(session: Session) -> User:
    """Create an admin user for testing"""
    user = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        hashed_password=get_password_hash("adminpassword"),
        role=UserRole.admin,
        is_active=True,
        is_superuser=True,
        full_name="Admin User"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="publisher_user")
def publisher_user_fixture(session: Session) -> User:
    """Create a publisher user for testing"""
    user = User(
        id=uuid.uuid4(),
        email="publisher@example.com",
        hashed_password=get_password_hash("publisherpassword"),
        role=UserRole.publisher,
        is_active=True,
        is_superuser=False,
        full_name="Publisher User"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="teacher_user")
def teacher_user_fixture(session: Session) -> User:
    """Create a teacher user for testing"""
    user = User(
        id=uuid.uuid4(),
        email="teacher@example.com",
        hashed_password=get_password_hash("teacherpassword"),
        role=UserRole.teacher,
        is_active=True,
        is_superuser=False,
        full_name="Teacher User"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="student_user")
def student_user_fixture(session: Session) -> User:
    """Create a student user for testing"""
    user = User(
        id=uuid.uuid4(),
        email="student@example.com",
        hashed_password=get_password_hash("studentpassword"),
        role=UserRole.student,
        is_active=True,
        is_superuser=False,
        full_name="Student User"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="admin_token")
def admin_token_fixture(client: TestClient, admin_user: User) -> str:
    """Get access token for admin user"""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": admin_user.email, "password": "adminpassword"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(name="publisher_token")
def publisher_token_fixture(client: TestClient, publisher_user: User) -> str:
    """Get access token for publisher user"""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": publisher_user.email, "password": "publisherpassword"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(name="teacher_token")
def teacher_token_fixture(client: TestClient, teacher_user: User) -> str:
    """Get access token for teacher user"""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": teacher_user.email, "password": "teacherpassword"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(name="student_token")
def student_token_fixture(client: TestClient, student_user: User) -> str:
    """Get access token for student user"""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": student_user.email, "password": "studentpassword"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


# Bulk import specific fixtures with complete role records


@pytest.fixture(name="publisher_user_with_record")
def publisher_user_with_record_fixture(session: Session) -> User:
    """Create a publisher user WITH Publisher record for bulk import testing"""
    user = User(
        id=uuid.uuid4(),
        email="publisher_bulk@example.com",
        hashed_password=get_password_hash("publisherpassword"),
        role=UserRole.publisher,
        is_active=True,
        is_superuser=False,
        full_name="Publisher Bulk User"
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Bulk Test Publisher",
        contact_email="contact@bulkpublisher.com"
    )
    session.add(publisher)
    session.commit()
    session.refresh(publisher)
    session.refresh(user)

    return user


@pytest.fixture(name="teacher_user_with_record")
def teacher_user_with_record_fixture(session: Session) -> User:
    """Create a teacher user WITH Teacher record for bulk import testing"""
    # Create publisher for school
    pub_user = User(
        id=uuid.uuid4(),
        email="pub_for_teacher_bulk@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher
    )
    session.add(pub_user)
    session.commit()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Publisher for Bulk Teacher"
    )
    session.add(publisher)
    session.commit()

    user = User(
        id=uuid.uuid4(),
        email="teacher_bulk@example.com",
        hashed_password=get_password_hash("teacherpassword"),
        role=UserRole.teacher,
        is_active=True,
        is_superuser=False,
        full_name="Teacher Bulk User"
    )
    session.add(user)
    session.commit()

    school = School(
        id=uuid.uuid4(),
        name="Bulk Test School",
        publisher_id=publisher.id
    )
    session.add(school)
    session.commit()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=user.id,
        school_id=school.id,
        subject_specialization="Bulk Test Subject"
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)
    session.refresh(user)

    return user
