"""Tests for the health check endpoint."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient


def test_health_endpoint_returns_200(client: TestClient) -> None:
    """Test health endpoint returns 200 when database is available."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["services"]["database"] == "up"
    assert "timestamp" in data


def test_health_response_format(client: TestClient) -> None:
    """Test health endpoint returns correct JSON structure."""
    response = client.get("/api/v1/health")
    data = response.json()
    assert "status" in data
    assert "services" in data
    assert "database" in data["services"]
    assert "redis" in data["services"]
    assert "timestamp" in data
    assert data["services"]["database"] in ("up", "down")
    assert data["services"]["redis"] in ("up", "down")


def test_health_no_auth_required(client: TestClient) -> None:
    """Test health endpoint is accessible without authentication."""
    response = client.get("/api/v1/health")
    # Should not return 401 or 403
    assert response.status_code in (200, 503)


def test_health_degraded_when_redis_down(client: TestClient) -> None:
    """Test health returns degraded status when Redis is unavailable."""
    with patch(
        "app.api.routes.health.get_redis",
        new_callable=AsyncMock,
        return_value=None,
    ):
        response = client.get("/api/v1/health")
        data = response.json()
        assert data["services"]["redis"] == "down"
        # DB is up so status should be degraded, not unhealthy
        if data["services"]["database"] == "up":
            assert data["status"] == "degraded"
