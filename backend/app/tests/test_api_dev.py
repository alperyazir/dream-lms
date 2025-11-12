"""Tests for development API endpoints."""

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import User, UserRole


def test_quick_login_users_returns_grouped_by_role(
    client: TestClient, session: Session
) -> None:
    """Test endpoint returns users grouped by role."""
    # Create test users for each role
    users_data = [
        ("admin1", "admin1@test.com", UserRole.admin),
        ("pub1", "pub1@test.com", UserRole.publisher),
        ("pub2", "pub2@test.com", UserRole.publisher),
        ("teacher1", "teacher1@test.com", UserRole.teacher),
        ("teacher2", "teacher2@test.com", UserRole.teacher),
        ("student1", "student1@test.com", UserRole.student),
        ("student2", "student2@test.com", UserRole.student),
        ("student3", "student3@test.com", UserRole.student),
    ]

    for username, email, role in users_data:
        user = User(
            id=uuid.uuid4(),
            email=email,
            username=username,
            hashed_password=get_password_hash("password"),
            role=role,
            full_name=f"{username} User",
        )
        session.add(user)
    session.commit()

    response = client.get(f"{settings.API_V1_STR}/dev/quick-login-users")

    assert response.status_code == 200
    data = response.json()

    # Verify all roles present in response
    assert "admin" in data
    assert "publisher" in data
    assert "teacher" in data
    assert "student" in data

    # Verify correct counts
    assert len(data["admin"]) == 1
    assert len(data["publisher"]) == 2
    assert len(data["teacher"]) == 2
    assert len(data["student"]) == 3

    # Verify structure of returned user objects
    assert data["admin"][0]["username"] == "admin1"
    assert data["admin"][0]["email"] == "admin1@test.com"


def test_quick_login_users_limits_to_5_per_role(
    client: TestClient, session: Session
) -> None:
    """Test endpoint limits to 5 users per role."""
    # Create 7 students (more than limit of 5)
    for i in range(7):
        user = User(
            id=uuid.uuid4(),
            email=f"student{i}@test.com",
            username=f"student{i}",
            hashed_password=get_password_hash("password"),
            role=UserRole.student,
            full_name=f"Student {i}",
        )
        session.add(user)
    session.commit()

    response = client.get(f"{settings.API_V1_STR}/dev/quick-login-users")

    assert response.status_code == 200
    data = response.json()

    # Should return only 5 students (limit)
    assert len(data["student"]) == 5


def test_quick_login_users_returns_users_for_role(
    client: TestClient, session: Session
) -> None:
    """Test endpoint returns users for a specific role."""
    # Create multiple teachers
    usernames = ["teacher1", "teacher2", "teacher3"]
    for username in usernames:
        user = User(
            id=uuid.uuid4(),
            email=f"{username}@test.com",
            username=username,
            hashed_password=get_password_hash("password"),
            role=UserRole.teacher,
            full_name=f"{username} User",
        )
        session.add(user)
    session.commit()

    response = client.get(f"{settings.API_V1_STR}/dev/quick-login-users")

    assert response.status_code == 200
    data = response.json()

    # Should return all 3 teachers
    teachers = data["teacher"]
    assert len(teachers) == 3
    teacher_usernames = {t["username"] for t in teachers}
    assert teacher_usernames == {"teacher1", "teacher2", "teacher3"}


def test_quick_login_users_returns_empty_arrays_for_roles_with_no_users(
    client: TestClient, session: Session
) -> None:
    """Test endpoint returns empty arrays for roles with no users."""
    # Create only one admin user (no publishers, teachers, students)
    user = User(
        id=uuid.uuid4(),
        email="admin@test.com",
        username="admin",
        hashed_password=get_password_hash("password"),
        role=UserRole.admin,
        full_name="Admin User",
    )
    session.add(user)
    session.commit()

    response = client.get(f"{settings.API_V1_STR}/dev/quick-login-users")

    assert response.status_code == 200
    data = response.json()

    # Admin should have 1 user
    assert len(data["admin"]) == 1

    # Other roles should have empty arrays
    assert len(data["publisher"]) == 0
    assert len(data["teacher"]) == 0
    assert len(data["student"]) == 0


def test_quick_login_users_returns_404_in_production(client: TestClient) -> None:
    """Test endpoint returns 404 in production environment."""
    with patch.object(settings, "ENVIRONMENT", "production"):
        response = client.get(f"{settings.API_V1_STR}/dev/quick-login-users")

        assert response.status_code == 404
        assert response.json()["detail"] == "Not found"
