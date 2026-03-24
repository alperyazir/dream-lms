"""Tests for platform analytics endpoints (Story 26.2)."""

import uuid
from datetime import timedelta

from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.models import User, UserRole


def _admin_headers(admin_user: User) -> dict:
    """Create admin auth headers."""
    token = create_access_token(
        subject=str(admin_user.id),
        expires_delta=timedelta(hours=1),
        extra_claims={"role": admin_user.role.value},
    )
    return {"Authorization": f"Bearer {token}"}


def test_platform_usage_returns_200(client: TestClient, admin_user: User) -> None:
    """Test platform-usage endpoint returns 200 for admin."""
    response = client.get(
        "/api/v1/admin/analytics/platform-usage?period=30d",
        headers=_admin_headers(admin_user),
    )
    assert response.status_code == 200
    data = response.json()
    assert "dau" in data
    assert "wau" in data
    assert "mau" in data
    assert "login_trend" in data
    assert "new_registrations" in data
    # Should have students/teachers/total in each
    assert "students" in data["dau"]
    assert "teachers" in data["dau"]
    assert "total" in data["dau"]


def test_assignment_metrics_returns_200(client: TestClient, admin_user: User) -> None:
    """Test assignment-metrics endpoint returns 200 for admin."""
    response = client.get(
        "/api/v1/admin/analytics/assignment-metrics?period=30d",
        headers=_admin_headers(admin_user),
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_assignments" in data
    assert "completion_rate" in data
    assert "average_score" in data
    assert "by_activity_type" in data
    assert "top_performing" in data
    assert "bottom_performing" in data
    assert "assignment_trend" in data


def test_ai_usage_returns_200(client: TestClient, admin_user: User) -> None:
    """Test ai-usage endpoint returns 200 for admin."""
    response = client.get(
        "/api/v1/admin/analytics/ai-usage?period=30d",
        headers=_admin_headers(admin_user),
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_generations" in data
    assert "generation_trend" in data
    assert "by_activity_type" in data
    assert "most_frequent_type" in data


def test_analytics_requires_admin(client: TestClient) -> None:
    """Test analytics endpoints require authentication."""
    endpoints = [
        "/api/v1/admin/analytics/platform-usage",
        "/api/v1/admin/analytics/assignment-metrics",
        "/api/v1/admin/analytics/ai-usage",
    ]
    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code in (401, 403), f"{endpoint} should require auth"


def test_analytics_invalid_period(client: TestClient, admin_user: User) -> None:
    """Test analytics endpoints reject invalid period values."""
    response = client.get(
        "/api/v1/admin/analytics/platform-usage?period=999d",
        headers=_admin_headers(admin_user),
    )
    assert response.status_code == 422


def test_analytics_empty_database(client: TestClient, admin_user: User) -> None:
    """Test analytics endpoints return zeros with empty database."""
    response = client.get(
        "/api/v1/admin/analytics/assignment-metrics?period=7d",
        headers=_admin_headers(admin_user),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_assignments"] == 0
    assert data["completion_rate"] == 0.0
    assert data["average_score"] == 0


def test_platform_usage_default_period(client: TestClient, admin_user: User) -> None:
    """Test platform-usage defaults to 30d period."""
    response = client.get(
        "/api/v1/admin/analytics/platform-usage",
        headers=_admin_headers(admin_user),
    )
    assert response.status_code == 200
