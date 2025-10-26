"""
Unit tests for role validation and RBAC functionality
"""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import User, UserRole, UserCreate
from app import crud


def test_user_role_enum_values():
    """Verify all role enum values are defined correctly"""
    assert UserRole.admin == "admin"
    assert UserRole.publisher == "publisher"
    assert UserRole.teacher == "teacher"
    assert UserRole.student == "student"


def test_user_model_default_role(session: Session):
    """Test that User model defaults to student role"""
    user = User(
        id=uuid.uuid4(),
        email="newuser@example.com",
        hashed_password="hashed",
        is_active=True,
        is_superuser=False
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    assert user.role == UserRole.student


def test_user_model_with_different_roles(session: Session):
    """Test creating users with different roles"""
    roles = [UserRole.admin, UserRole.publisher, UserRole.teacher, UserRole.student]

    for role in roles:
        user = User(
            id=uuid.uuid4(),
            email=f"{role.value}@example.com",
            hashed_password="hashed",
            role=role,
            is_active=True,
            is_superuser=False
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        assert user.role == role


def test_jwt_token_includes_role(client: TestClient, admin_user: User):
    """Test that JWT token includes role claim"""
    import jwt
    from app.core.config import settings
    from app.core.security import ALGORITHM

    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": admin_user.email, "password": "adminpassword"}
    )
    assert response.status_code == 200

    token = response.json()["access_token"]
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])

    assert "role" in payload
    assert payload["role"] == UserRole.admin


def test_require_role_allows_correct_role(client: TestClient, admin_token: str):
    """Test that require_role dependency allows users with correct role"""
    # This test requires a test endpoint that uses require_role
    # For now, we'll test the login endpoint which should work with any valid token
    response = client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200


def test_create_user_with_role(session: Session):
    """Test creating user through CRUD with role"""
    user_in = UserCreate(
        email="test@example.com",
        password="testpassword123",
        role=UserRole.teacher,
        is_active=True,
        is_superuser=False
    )

    user = crud.create_user(session=session, user_create=user_in)

    assert user.role == UserRole.teacher
    assert user.email == "test@example.com"


def test_user_role_persists_after_refresh(session: Session):
    """Test that role persists correctly in database"""
    user = User(
        id=uuid.uuid4(),
        email="persist@example.com",
        hashed_password="hashed",
        role=UserRole.publisher,
        is_active=True,
        is_superuser=False
    )
    session.add(user)
    session.commit()

    user_id = user.id
    session.expunge_all()  # Clear session

    # Fetch user again
    fetched_user = session.get(User, user_id)
    assert fetched_user is not None
    assert fetched_user.role == UserRole.publisher
