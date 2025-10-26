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
from app.models import User, UserRole


# Test database with in-memory SQLite
@pytest.fixture(name="session", scope="function")
def session_fixture() -> Generator[Session, None, None]:
    """Create a fresh database session for each test"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        yield session
        # Clean up after test
        for table in reversed(SQLModel.metadata.sorted_tables):
            session.exec(delete(table))
        session.commit()


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
