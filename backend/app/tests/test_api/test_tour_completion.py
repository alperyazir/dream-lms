"""
Tests for tour completion tracking (Story 12.1)
"""
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import User, UserRole


class TestLoginIncludesHasCompletedTour:
    """Test that login response includes has_completed_tour field"""

    def test_login_includes_has_completed_tour_false_by_default(
        self, client: TestClient, session: Session
    ):
        """Test that login response includes has_completed_tour=false for new user"""
        # Arrange - Create a user with default has_completed_tour (False)
        user = User(
            id=uuid.uuid4(),
            email="touruser@example.com",
            username="touruser",
            hashed_password=get_password_hash("testpassword123"),
            role=UserRole.student,
            is_active=True,
        )
        session.add(user)
        session.commit()

        # Act - Login
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "touruser@example.com", "password": "testpassword123"},
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "has_completed_tour" in data
        assert data["has_completed_tour"] is False

    def test_login_includes_has_completed_tour_true_when_completed(
        self, client: TestClient, session: Session
    ):
        """Test that login response includes has_completed_tour=true for user who completed tour"""
        # Arrange - Create a user with has_completed_tour=True
        user = User(
            id=uuid.uuid4(),
            email="completedtour@example.com",
            username="completedtour",
            hashed_password=get_password_hash("testpassword123"),
            role=UserRole.student,
            is_active=True,
            has_completed_tour=True,
        )
        session.add(user)
        session.commit()

        # Act - Login
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "completedtour@example.com", "password": "testpassword123"},
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "has_completed_tour" in data
        assert data["has_completed_tour"] is True


class TestCompleteTourEndpoint:
    """Test POST /api/v1/users/me/complete-tour endpoint"""

    def test_complete_tour_requires_auth(self, client: TestClient):
        """Test that complete-tour endpoint requires authentication"""
        # Act - Call without auth header
        response = client.post(f"{settings.API_V1_STR}/users/me/complete-tour")

        # Assert
        assert response.status_code == 401

    def test_complete_tour_sets_flag_to_true(
        self, client: TestClient, session: Session
    ):
        """Test POST /api/v1/users/me/complete-tour sets flag to true"""
        # Arrange - Create user with has_completed_tour=False
        user = User(
            id=uuid.uuid4(),
            email="incompletetour@example.com",
            username="incompletetour",
            hashed_password=get_password_hash("testpassword123"),
            role=UserRole.student,
            is_active=True,
            has_completed_tour=False,
        )
        session.add(user)
        session.commit()

        # Get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "incompletetour@example.com", "password": "testpassword123"},
        )
        token = login_response.json()["access_token"]

        # Act - Call complete-tour endpoint
        response = client.post(
            f"{settings.API_V1_STR}/users/me/complete-tour",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Assert response
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Tour completed successfully"

        # Assert database was updated
        session.refresh(user)
        assert user.has_completed_tour is True

    def test_complete_tour_idempotent(self, client: TestClient, session: Session):
        """Test that calling complete-tour multiple times is safe"""
        # Arrange - Create user with has_completed_tour=False
        user = User(
            id=uuid.uuid4(),
            email="idempotentuser@example.com",
            username="idempotentuser",
            hashed_password=get_password_hash("testpassword123"),
            role=UserRole.student,
            is_active=True,
            has_completed_tour=False,
        )
        session.add(user)
        session.commit()

        # Get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "idempotentuser@example.com", "password": "testpassword123"},
        )
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Act - Call complete-tour endpoint twice
        response1 = client.post(
            f"{settings.API_V1_STR}/users/me/complete-tour", headers=headers
        )
        response2 = client.post(
            f"{settings.API_V1_STR}/users/me/complete-tour", headers=headers
        )

        # Assert - Both calls succeed
        assert response1.status_code == 200
        assert response2.status_code == 200

        # Assert database still has correct value
        session.refresh(user)
        assert user.has_completed_tour is True

    def test_login_shows_true_after_tour_completion(
        self, client: TestClient, session: Session
    ):
        """Test that login shows has_completed_tour=true after completing tour"""
        # Arrange - Create user with has_completed_tour=False
        user = User(
            id=uuid.uuid4(),
            email="verifylogin@example.com",
            username="verifylogin",
            hashed_password=get_password_hash("testpassword123"),
            role=UserRole.student,
            is_active=True,
            has_completed_tour=False,
        )
        session.add(user)
        session.commit()

        # Get initial token and verify has_completed_tour=false
        login_response1 = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "verifylogin@example.com", "password": "testpassword123"},
        )
        assert login_response1.json()["has_completed_tour"] is False
        token = login_response1.json()["access_token"]

        # Act - Complete tour
        client.post(
            f"{settings.API_V1_STR}/users/me/complete-tour",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Act - Login again
        login_response2 = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "verifylogin@example.com", "password": "testpassword123"},
        )

        # Assert - Second login shows has_completed_tour=true
        assert login_response2.status_code == 200
        assert login_response2.json()["has_completed_tour"] is True


class TestUserPublicIncludesHasCompletedTour:
    """Test that UserPublic response includes has_completed_tour field"""

    def test_get_me_includes_has_completed_tour(
        self, client: TestClient, session: Session
    ):
        """Test GET /api/v1/users/me includes has_completed_tour field"""
        # Arrange - Create user
        user = User(
            id=uuid.uuid4(),
            email="getmeuser@example.com",
            username="getmeuser",
            hashed_password=get_password_hash("testpassword123"),
            role=UserRole.student,
            is_active=True,
            has_completed_tour=True,
        )
        session.add(user)
        session.commit()

        # Get token
        login_response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "getmeuser@example.com", "password": "testpassword123"},
        )
        token = login_response.json()["access_token"]

        # Act - Get current user
        response = client.get(
            f"{settings.API_V1_STR}/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "has_completed_tour" in data
        assert data["has_completed_tour"] is True
