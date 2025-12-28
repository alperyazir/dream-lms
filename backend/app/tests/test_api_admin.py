"""
Tests for admin API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings


def test_create_publisher_as_admin(
    client: TestClient, session: Session, admin_token: str
) -> None:
    """Test that publisher creation endpoint returns 410 Gone (deprecated)"""
    publisher_data = {
        "name": "Test Publisher Inc",
        "contact_email": "contact@testpublisher.com",
        "username": "publisher1",
        "user_email": "publisher1@example.com",
        "full_name": "Publisher One"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=publisher_data
    )

    # Publisher creation is deprecated - managed in Dream Central Storage
    assert response.status_code == 410
    assert "Dream Central Storage" in response.json()["detail"]


def test_create_publisher_as_non_admin(
    client: TestClient, teacher_token: str
) -> None:
    """Test non-admin gets 403 when trying to create publisher"""
    publisher_data = {
        "name": "Test Publisher Inc",
        "contact_email": "contact@testpublisher.com",
        "user_email": "publisher2@example.com",
        "full_name": "Publisher Two"
    }

    response = client.post(
        f"{settings.API_V1_STR}/admin/publishers",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=publisher_data
    )

    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"] or "Access forbidden" in response.json()["detail"]


@pytest.mark.skip(reason="TODO: Update test to use DCS publisher IDs (Story 24.4 cleanup)")
def test_create_school_as_admin(
    client: TestClient, session: Session, admin_token: str
) -> None:
    """Test admin can create school successfully"""
    # NOTE: This test needs to be updated to use publisher_id from DCS
    pass


@pytest.mark.skip(reason="DEPRECATED: Publishers now fetched from DCS API, not local DB")
def test_list_publishers_as_admin(
    client: TestClient, session: Session, admin_token: str
) -> None:
    """Test admin can list publishers - DEPRECATED: use DCS API"""
    pass


@pytest.mark.skip(reason="TODO: Update test to use DCS publisher IDs (Story 24.4 cleanup)")
def test_list_schools_filtered_by_publisher(
    client: TestClient, session: Session, admin_token: str
) -> None:
    """Test admin can filter schools by publisher_id"""
    pass


@pytest.mark.skip(reason="DEPRECATED: Publisher creation returns 410 Gone")
def test_temporary_password_format(
    client: TestClient, admin_token: str
) -> None:
    """Test generated temporary password - DEPRECATED"""
    pass


# Story 7.5: Integration tests for clean database initialization


def test_admin_can_login_after_init_db(
    client: TestClient, session: Session
) -> None:
    """Test that admin can log in immediately after database initialization."""
    from app.core.db import init_db

    # Initialize database (creates only admin)
    init_db(session)

    # Attempt login with admin credentials
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }

    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data=login_data
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_get_users_returns_only_admin(
    client: TestClient, session: Session, admin_token: str
) -> None:
    """Test that GET /api/users returns only the admin user after init_db."""
    from app.core.db import init_db

    # Initialize database (creates only admin)
    init_db(session)

    # Get all users
    response = client.get(
        f"{settings.API_V1_STR}/users/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    assert "data" in data
    users = data["data"]
    assert len(users) == 1, "Should have exactly one user (admin)"
    assert users[0]["email"] == settings.FIRST_SUPERUSER
    assert users[0]["role"] == "admin"


@pytest.mark.skip(reason="DEPRECATED: Publishers now fetched from DCS API, not local DB")
def test_get_publishers_returns_empty_list(
    client: TestClient, session: Session, admin_token: str
) -> None:
    """Test that GET /api/admin/publishers returns list from DCS - DEPRECATED"""
    pass


def test_get_teachers_returns_empty_list(
    client: TestClient, session: Session, admin_token: str
) -> None:
    """Test that GET /api/admin/teachers returns empty list after init_db."""
    from app.core.db import init_db

    # Initialize database (creates only admin)
    init_db(session)

    # Get all teachers
    response = client.get(
        f"{settings.API_V1_STR}/admin/teachers",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 0, "Should have zero teachers after init_db"


def test_get_students_returns_empty_list(
    client: TestClient, session: Session, admin_token: str
) -> None:
    """Test that GET /api/admin/students returns empty list after init_db."""
    from app.core.db import init_db

    # Initialize database (creates only admin)
    init_db(session)

    # Get all students
    response = client.get(
        f"{settings.API_V1_STR}/admin/students",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 0, "Should have zero students after init_db"


def test_application_starts_without_errors_after_init(
    client: TestClient, session: Session
) -> None:
    """Test that application starts without errors (no foreign key violations) after init_db."""
    from app.core.db import init_db

    # Initialize database (creates only admin)
    init_db(session)

    # Test that health check endpoint works (indicates app started successfully)
    response = client.get("/api/v1/utils/health-check/")

    assert response.status_code == 200
    # Health check returns structured response (Story 3.0)
    data = response.json()
    assert "status" in data
    assert data["status"] in ["healthy", "degraded"]


def test_admin_can_test_dream_storage_connection(
    client: TestClient, admin_token: str
) -> None:
    """Test admin endpoint for testing Dream Central Storage connection."""
    response = client.get(
        f"{settings.API_V1_STR}/admin/test-dream-storage-connection",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "status" in data
    assert "message" in data
    assert "url" in data
    assert "details" in data

    # Status should be "success" or "error"
    assert data["status"] in ["success", "error"]

    # URL should match configured storage URL
    assert data["url"] == settings.DREAM_CENTRAL_STORAGE_URL


def test_non_admin_cannot_test_dream_storage_connection(
    client: TestClient, teacher_token: str
) -> None:
    """Test that non-admin users cannot access test connection endpoint."""
    response = client.get(
        f"{settings.API_V1_STR}/admin/test-dream-storage-connection",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    # Should be forbidden (403) for non-admin users
    assert response.status_code == 403
