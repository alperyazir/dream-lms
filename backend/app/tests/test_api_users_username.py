"""
Integration tests for User API endpoints with username field
"""
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import User


def test_get_users_includes_username_field(
    client: TestClient, admin_token: str, admin_user: User
) -> None:
    """Test GET /api/v1/users/ includes username field in response."""
    # Act
    response = client.get(
        f"{settings.API_V1_STR}/users/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]) > 0

    # Check first user has username field
    first_user = data["data"][0]
    assert "username" in first_user
    assert "email" in first_user


def test_create_user_with_username_succeeds(
    client: TestClient, admin_token: str
) -> None:
    """Test POST /api/v1/users with username creates user successfully."""
    # Arrange
    user_data = {
        "email": "newuser@example.com",
        "username": "newuser123",
        "password": "password123",
        "full_name": "New User",
        "role": "student"
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/users/",
        json=user_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "newuser123"
    assert data["email"] == "newuser@example.com"
    assert data["role"] == "student"


def test_create_user_without_username_fails_validation(
    client: TestClient, admin_token: str
) -> None:
    """Test POST /api/v1/users without username fails with 422 (validation error)."""
    # Arrange
    user_data = {
        "email": "nouser@example.com",
        # Missing username field
        "password": "password123",
        "full_name": "No Username",
        "role": "student"
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/users/",
        json=user_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Assert
    assert response.status_code == 422  # Validation error
    error_data = response.json()
    assert "detail" in error_data


def test_create_user_with_duplicate_username_fails(
    client: TestClient, admin_token: str, admin_user: User
) -> None:
    """Test POST /api/v1/users with duplicate username fails with 400."""
    # Arrange - try to create user with existing username
    user_data = {
        "email": "different@example.com",
        "username": admin_user.username,  # Duplicate username
        "password": "password123",
        "full_name": "Duplicate Username",
        "role": "student"
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/users/",
        json=user_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Assert
    assert response.status_code == 400
    error_data = response.json()
    assert "Username already taken" in error_data["detail"]


def test_email_based_login_still_works(
    client: TestClient, admin_user: User
) -> None:
    """Test existing email-based login still works after migration (IV1)."""
    # Act
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": admin_user.email, "password": "adminpassword"}
    )

    # Assert
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"


def test_all_seeded_users_have_valid_usernames(
    session: Session, admin_user: User, publisher_user: User, teacher_user: User, student_user: User
) -> None:
    """Test all seeded users have valid usernames after init_db (IV2)."""
    # Arrange - users created by fixtures
    from sqlmodel import select

    from app.models import User

    # Act
    all_users = session.exec(select(User)).all()

    # Assert
    assert len(all_users) > 0, "Should have at least one user from fixtures"

    for user in all_users:
        # Check username exists
        assert user.username is not None, f"User {user.email} has no username"
        assert len(user.username) >= 3, f"User {user.email} username too short"
        assert len(user.username) <= 50, f"User {user.email} username too long"

        # Check username format (alphanumeric, underscore, hyphen only)
        import re
        assert re.match(r'^[a-zA-Z0-9_-]+$', user.username), \
            f"User {user.email} has invalid username format: {user.username}"


def test_get_user_me_includes_username(
    client: TestClient, admin_token: str
) -> None:
    """Test GET /api/v1/users/me includes username field."""
    # Act
    response = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Assert
    assert response.status_code == 200
    user_data = response.json()
    assert "username" in user_data
    assert "email" in user_data
    assert user_data["username"] is not None
