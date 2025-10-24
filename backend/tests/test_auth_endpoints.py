"""
Integration tests for authentication endpoints.
Tests login, refresh, logout, change-password, and protected endpoint access.
"""

import pytest

from app.core.security import create_access_token, hash_password
from app.db import get_db
from app.models.user import User, UserRole


@pytest.mark.asyncio
class TestLoginEndpoint:
    """Test POST /api/auth/login endpoint."""

    async def test_login_success(self, client, db_session):
        """Test login with valid credentials returns tokens."""
        # Create test user
        password = "TestPassword123"
        user = User(
            email="test@example.com",
            password_hash=hash_password(password),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        # Override get_db dependency to use test db_session
        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        # Login request
        response = await client.post(
            "/api/auth/login", json={"email": "test@example.com", "password": password}
        )

        # Cleanup override
        app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "Bearer"
        assert data["expires_in"] == 3600  # 60 minutes * 60 seconds

    async def test_login_invalid_credentials(self, client, db_session):
        """Test login with invalid credentials returns 401."""
        # Create test user
        user = User(
            email="test@example.com",
            password_hash=hash_password("CorrectPassword123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        # Override dependency
        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        # Login with wrong password
        response = await client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "WrongPassword"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    async def test_login_nonexistent_user(self, client, db_session):
        """Test login with non-existent user returns 401 without leaking info."""

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.post(
            "/api/auth/login",
            json={"email": "nonexistent@example.com", "password": "SomePassword123"},
        )

        app.dependency_overrides.clear()

        # Should return 401 without revealing user doesn't exist
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    async def test_login_inactive_user(self, client, db_session):
        """Test login with inactive user returns 401."""
        password = "TestPassword123"
        user = User(
            email="inactive@example.com",
            password_hash=hash_password(password),
            role=UserRole.admin,
            is_active=False,
        )
        db_session.add(user)
        await db_session.commit()

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.post(
            "/api/auth/login",
            json={"email": "inactive@example.com", "password": password},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 401


@pytest.mark.asyncio
class TestRefreshEndpoint:
    """Test POST /api/auth/refresh endpoint."""

    async def test_refresh_with_valid_token(self, client, db_session):
        """Test refresh endpoint with valid refresh token returns new access token."""
        from app.core.security import create_refresh_token

        payload = {"user_id": "123", "email": "test@example.com", "role": "admin"}
        refresh_token = create_refresh_token(payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})

        app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["refresh_token"] == refresh_token  # Same refresh token returned

    async def test_refresh_with_blacklisted_token(self, client, db_session):
        """Test refresh endpoint rejects blacklisted token."""
        from app.core.security import create_refresh_token
        from app.services.auth_service import logout_user

        payload = {"user_id": "123", "email": "test@example.com", "role": "admin"}
        refresh_token = create_refresh_token(payload)

        # Blacklist the token
        logout_user(refresh_token)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})

        app.dependency_overrides.clear()

        assert response.status_code == 401
        assert "revoked" in response.json()["detail"].lower()


@pytest.mark.asyncio
class TestLogoutEndpoint:
    """Test POST /api/auth/logout endpoint."""

    async def test_logout_success(self, client, db_session):
        """Test logout successfully blacklists refresh token."""
        from app.services.auth_service import is_token_blacklisted

        # Create user and get token
        user = User(
            email="test@example.com",
            password_hash=hash_password("TestPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        payload = {"user_id": str(user.id), "email": user.email, "role": "admin"}
        access_token = create_access_token(payload)
        refresh_token = "test_refresh_token_to_blacklist"

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        # Initially not blacklisted
        assert is_token_blacklisted(refresh_token) is False

        # Logout
        response = await client.post(
            "/api/auth/logout",
            json={"refresh_token": refresh_token},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 204

        # Now blacklisted
        assert is_token_blacklisted(refresh_token) is True


@pytest.mark.asyncio
class TestChangePasswordEndpoint:
    """Test POST /api/auth/change-password endpoint."""

    async def test_change_password_success(self, client, db_session):
        """Test change password with valid old password."""
        from app.core.security import verify_password

        old_password = "OldPassword123"
        new_password = "NewPassword456"

        # Create user
        user = User(
            email="test@example.com",
            password_hash=hash_password(old_password),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        # Get access token
        payload = {"user_id": str(user.id), "email": user.email, "role": "admin"}
        access_token = create_access_token(payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        # Change password
        response = await client.post(
            "/api/auth/change-password",
            json={"old_password": old_password, "new_password": new_password},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 204

        # Verify password was changed in database
        await db_session.refresh(user)
        assert verify_password(new_password, user.password_hash) is True
        assert verify_password(old_password, user.password_hash) is False

    async def test_change_password_wrong_old_password(self, client, db_session):
        """Test change password with incorrect old password returns 400."""
        old_password = "OldPassword123"
        user = User(
            email="test@example.com",
            password_hash=hash_password(old_password),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        payload = {"user_id": str(user.id), "email": user.email, "role": "admin"}
        access_token = create_access_token(payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        response = await client.post(
            "/api/auth/change-password",
            json={"old_password": "WrongPassword", "new_password": "NewPassword456"},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == 400
        assert "Incorrect password" in response.json()["detail"]


@pytest.mark.asyncio
class TestProtectedEndpoints:
    """Test protected endpoints with authentication and role-based access."""

    async def test_protected_endpoint_without_token(self, client):
        """Test protected endpoint rejects request without token."""
        # Try to access change-password without token
        response = await client.post(
            "/api/auth/change-password",
            json={"old_password": "old", "new_password": "NewPass123"},
        )

        assert response.status_code == 401

    async def test_protected_endpoint_with_invalid_token(self, client):
        """Test protected endpoint rejects request with invalid token."""
        response = await client.post(
            "/api/auth/change-password",
            json={"old_password": "old", "new_password": "NewPass123"},
            headers={"Authorization": "Bearer invalid.token.here"},
        )

        assert response.status_code == 401

    async def test_protected_endpoint_with_valid_token(self, client, db_session):
        """Test protected endpoint accepts request with valid token."""
        user = User(
            email="test@example.com",
            password_hash=hash_password("TestPass123"),
            role=UserRole.admin,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        payload = {"user_id": str(user.id), "email": user.email, "role": "admin"}
        access_token = create_access_token(payload)

        async def override_get_db():
            yield db_session

        from app.main import app

        app.dependency_overrides[get_db] = override_get_db

        # Valid request (will fail password check but token is valid)
        response = await client.post(
            "/api/auth/change-password",
            json={"old_password": "wrong", "new_password": "NewPass123"},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        app.dependency_overrides.clear()

        # Should get 400 (bad password) not 401 (unauthorized)
        # This proves authentication worked
        assert response.status_code == 400
