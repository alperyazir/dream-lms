"""Integration tests verifying signup endpoint removal."""

from starlette.testclient import TestClient

from app.core.config import settings
from app.models import User


def test_signup_endpoint_returns_404(client: TestClient) -> None:
    """Test that /signup endpoint no longer exists (IV1)"""
    # Arrange
    signup_data = {
        "email": "newuser@example.com",
        "password": "password123",
        "full_name": "New User",
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/signup", json=signup_data
    )

    # Assert
    assert response.status_code == 404


def test_existing_login_still_works(client: TestClient, admin_user: User) -> None:
    """Test that login functionality remains intact after signup removal (IV2)"""
    # Arrange
    login_data = {
        "username": admin_user.email,
        "password": "adminpassword",
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token", data=login_data
    )

    # Assert
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_hierarchical_user_creation_intact(
    client: TestClient, admin_token: str
) -> None:
    """Test that Admin can still create users (hierarchical creation) (IV3)"""
    # Arrange
    user_data = {
        "email": "hierarchical@example.com",
        "username": "hierarchical_user",
        "password": "testpass123",
        "full_name": "Hierarchical User",
    }

    # Act
    response = client.post(
        f"{settings.API_V1_STR}/users/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=user_data,
    )

    # Assert
    assert response.status_code == 200
    created_user = response.json()
    assert created_user["email"] == "hierarchical@example.com"
    assert created_user["full_name"] == "Hierarchical User"
