"""
Tests for first login password change functionality (Story 11.3)
"""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models import User, UserRole


@pytest.fixture(name="user_must_change_password")
def user_must_change_password_fixture(session: Session) -> User:
    """Create a user that must change their password (first login)"""
    user = User(
        id=uuid.uuid4(),
        email="newuser@example.com",
        username="newuser",
        hashed_password=get_password_hash("TempPass123!"),
        role=UserRole.teacher,
        is_active=True,
        is_superuser=False,
        full_name="New User",
        must_change_password=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="user_normal")
def user_normal_fixture(session: Session) -> User:
    """Create a normal user that doesn't need to change password"""
    user = User(
        id=uuid.uuid4(),
        email="normaluser@example.com",
        username="normaluser",
        hashed_password=get_password_hash("NormalPass123!"),
        role=UserRole.teacher,
        is_active=True,
        is_superuser=False,
        full_name="Normal User",
        must_change_password=False,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


class TestLoginResponseIncludesMustChangePassword:
    """Test that login response includes must_change_password flag"""

    def test_login_returns_must_change_password_true(
        self, client: TestClient, user_must_change_password: User
    ):
        """Test login response includes must_change_password=true for new users"""
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "newuser", "password": "TempPass123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "must_change_password" in data
        assert data["must_change_password"] is True
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_returns_must_change_password_false(
        self, client: TestClient, user_normal: User
    ):
        """Test login response includes must_change_password=false for normal users"""
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "normaluser", "password": "NormalPass123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "must_change_password" in data
        assert data["must_change_password"] is False


class TestChangeInitialPasswordEndpoint:
    """Test the new change-initial-password endpoint"""

    def test_change_initial_password_success(
        self, client: TestClient, session: Session, user_must_change_password: User
    ):
        """Test successful password change clears must_change_password flag"""
        # First login to get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "newuser", "password": "TempPass123!"},
        )
        token = login_response.json()["access_token"]

        # Change password
        response = client.post(
            f"{settings.API_V1_STR}/users/me/change-initial-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "TempPass123!",
                "new_password": "NewSecure456!",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Password changed successfully"

        # Verify password was updated in database
        session.refresh(user_must_change_password)
        assert verify_password("NewSecure456!", user_must_change_password.hashed_password)

        # Verify must_change_password is now False
        assert user_must_change_password.must_change_password is False

    def test_change_initial_password_wrong_current_password(
        self, client: TestClient, user_must_change_password: User
    ):
        """Test that incorrect current password is rejected"""
        # First login to get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "newuser", "password": "TempPass123!"},
        )
        token = login_response.json()["access_token"]

        # Try to change password with wrong current password
        response = client.post(
            f"{settings.API_V1_STR}/users/me/change-initial-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "WrongPassword!",
                "new_password": "NewSecure456!",
            },
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Current password is incorrect"

    def test_change_initial_password_same_as_current(
        self, client: TestClient, user_must_change_password: User
    ):
        """Test that same password as current is rejected"""
        # First login to get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "newuser", "password": "TempPass123!"},
        )
        token = login_response.json()["access_token"]

        # Try to change password with same password
        response = client.post(
            f"{settings.API_V1_STR}/users/me/change-initial-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "TempPass123!",
                "new_password": "TempPass123!",
            },
        )
        assert response.status_code == 400
        assert "different" in response.json()["detail"].lower()

    def test_change_initial_password_too_short(
        self, client: TestClient, user_must_change_password: User
    ):
        """Test that new password must meet minimum length"""
        # First login to get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "newuser", "password": "TempPass123!"},
        )
        token = login_response.json()["access_token"]

        # Try to change password with too short new password
        response = client.post(
            f"{settings.API_V1_STR}/users/me/change-initial-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "TempPass123!",
                "new_password": "Short1!",
            },
        )
        assert response.status_code == 422  # Validation error

    def test_change_initial_password_for_normal_user(
        self, client: TestClient, session: Session, user_normal: User
    ):
        """Test that endpoint also works for normal users (clears flag even if already false)"""
        # First login to get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "normaluser", "password": "NormalPass123!"},
        )
        token = login_response.json()["access_token"]

        # Change password
        response = client.post(
            f"{settings.API_V1_STR}/users/me/change-initial-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "NormalPass123!",
                "new_password": "NewSecure456!",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Verify password was updated
        session.refresh(user_normal)
        assert verify_password("NewSecure456!", user_normal.hashed_password)
        assert user_normal.must_change_password is False


class TestExistingPasswordEndpointClearsFlag:
    """Test that existing update_password_me endpoint also clears must_change_password"""

    def test_existing_password_change_clears_flag(
        self, client: TestClient, session: Session, user_must_change_password: User
    ):
        """Test that using /me/password endpoint clears must_change_password flag"""
        # First login to get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "newuser", "password": "TempPass123!"},
        )
        token = login_response.json()["access_token"]

        # Change password using existing endpoint
        response = client.patch(
            f"{settings.API_V1_STR}/users/me/password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "TempPass123!",
                "new_password": "NewSecure456!",
            },
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Password updated successfully"

        # Verify must_change_password is now False
        session.refresh(user_must_change_password)
        assert user_must_change_password.must_change_password is False


class TestMeEndpointIncludesFlag:
    """Test that /me endpoint includes must_change_password field"""

    def test_me_endpoint_includes_must_change_password_true(
        self, client: TestClient, user_must_change_password: User
    ):
        """Test /me endpoint returns must_change_password=true"""
        # Login to get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "newuser", "password": "TempPass123!"},
        )
        token = login_response.json()["access_token"]

        # Get user info
        response = client.get(
            f"{settings.API_V1_STR}/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "must_change_password" in data
        assert data["must_change_password"] is True

    def test_me_endpoint_includes_must_change_password_false(
        self, client: TestClient, user_normal: User
    ):
        """Test /me endpoint returns must_change_password=false"""
        # Login to get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "normaluser", "password": "NormalPass123!"},
        )
        token = login_response.json()["access_token"]

        # Get user info
        response = client.get(
            f"{settings.API_V1_STR}/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "must_change_password" in data
        assert data["must_change_password"] is False


class TestTokenValidForPasswordChange:
    """Test that token is valid for password change endpoint even with must_change_password=true"""

    def test_token_valid_for_must_change_password_user(
        self, client: TestClient, user_must_change_password: User
    ):
        """Test that users with must_change_password can still access password change endpoint"""
        # Login to get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "newuser", "password": "TempPass123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Verify token works for password change endpoint
        response = client.post(
            f"{settings.API_V1_STR}/users/me/change-initial-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "TempPass123!",
                "new_password": "NewSecure456!",
            },
        )
        assert response.status_code == 200

    def test_token_valid_for_me_endpoint(
        self, client: TestClient, user_must_change_password: User
    ):
        """Test that users with must_change_password can access /me endpoint"""
        # Login to get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "newuser", "password": "TempPass123!"},
        )
        token = login_response.json()["access_token"]

        # Verify token works for /me endpoint
        response = client.get(
            f"{settings.API_V1_STR}/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
