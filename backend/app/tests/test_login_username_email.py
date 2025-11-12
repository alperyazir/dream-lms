import jwt
from starlette.testclient import TestClient

from app.core.config import settings
from app.models import User


def test_login_with_email_succeeds(client: TestClient, admin_user: User) -> None:
    """Test that users can log in with email (IV1)"""
    # Arrange
    login_data = {
        "username": admin_user.email,  # OAuth2 field name
        "password": "adminpassword",
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token", data=login_data
    )

    # Assert
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"


def test_login_with_username_succeeds(client: TestClient, admin_user: User) -> None:
    """Test that users can log in with username (IV2)"""
    # Arrange
    login_data = {
        "username": admin_user.username,  # Username from fixture
        "password": "adminpassword",
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token", data=login_data
    )

    # Assert
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"


def test_login_with_invalid_username_fails(client: TestClient) -> None:
    """Test that invalid username returns generic error (IV3)"""
    # Arrange
    login_data = {
        "username": "nonexistent",
        "password": "wrongpassword",
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token", data=login_data
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid credentials"


def test_login_with_invalid_email_fails(client: TestClient) -> None:
    """Test that invalid email returns generic error (IV3)"""
    # Arrange
    login_data = {
        "username": "nonexistent@example.com",
        "password": "wrongpassword",
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token", data=login_data
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid credentials"


def test_login_with_correct_username_wrong_password_fails(
    client: TestClient, admin_user: User
) -> None:
    """Test that correct username but wrong password fails with generic error"""
    # Arrange
    login_data = {
        "username": admin_user.username,
        "password": "wrongpassword",
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token", data=login_data
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid credentials"


def test_login_with_correct_email_wrong_password_fails(
    client: TestClient, admin_user: User
) -> None:
    """Test that correct email but wrong password fails with generic error"""
    # Arrange
    login_data = {
        "username": admin_user.email,
        "password": "wrongpassword",
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token", data=login_data
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid credentials"


def test_jwt_token_payload_unchanged(client: TestClient, admin_user: User) -> None:
    """Test that JWT token payload includes user_id and role (IV4)"""
    # Arrange
    login_data = {
        "username": admin_user.username,
        "password": "adminpassword",
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token", data=login_data
    )

    # Assert
    assert response.status_code == 200
    token_data = response.json()
    access_token = token_data["access_token"]

    # Decode token without verification to check payload structure
    decoded = jwt.decode(access_token, options={"verify_signature": False})

    # Verify payload contains expected fields
    assert "sub" in decoded  # user_id
    assert "role" in decoded
    assert decoded["role"] == "admin"
    assert "exp" in decoded  # expiration


def test_login_error_message_generic(client: TestClient) -> None:
    """
    Test that error message doesn't reveal whether username/email exists.
    Both invalid username and invalid email should return same generic error.
    """
    # Arrange - invalid username
    login_data_username = {
        "username": "nonexistent_user",
        "password": "anypassword",
    }

    # Act
    response_username = client.post(
        f"{settings.API_V1_STR}/login/access-token", data=login_data_username
    )

    # Arrange - invalid email
    login_data_email = {
        "username": "nonexistent@example.com",
        "password": "anypassword",
    }

    # Act
    response_email = client.post(
        f"{settings.API_V1_STR}/login/access-token", data=login_data_email
    )

    # Assert - both should return same generic error
    assert response_username.status_code == 400
    assert response_email.status_code == 400
    assert response_username.json()["detail"] == "Invalid credentials"
    assert response_email.json()["detail"] == "Invalid credentials"
    assert response_username.json()["detail"] == response_email.json()["detail"]
