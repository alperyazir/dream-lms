"""
Integration tests for health check endpoint.

Tests that health check includes Dream Central Storage connectivity status.
"""

from fastapi.testclient import TestClient


def test_health_check_includes_dream_storage_status(client: TestClient):
    """Test that health check includes Dream Central Storage status."""
    response = client.get("/api/v1/utils/health-check/")

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "status" in data
    assert "checks" in data
    assert "timestamp" in data

    # Verify Dream Central Storage check exists
    assert "dream_central_storage" in data["checks"]
    assert isinstance(data["checks"]["dream_central_storage"], bool)

    # Verify database check also exists
    assert "database" in data["checks"]
    assert isinstance(data["checks"]["database"], bool)


def test_health_check_overall_status(client: TestClient):
    """Test that overall status reflects individual checks."""
    response = client.get("/api/v1/utils/health-check/")

    assert response.status_code == 200
    data = response.json()

    # Overall status should be "healthy" or "degraded"
    assert data["status"] in ["healthy", "degraded"]

    # If all checks pass, status should be "healthy"
    if all(data["checks"].values()):
        assert data["status"] == "healthy"
    else:
        assert data["status"] == "degraded"


def test_health_check_timestamp_format(client: TestClient):
    """Test that health check timestamp is in ISO format."""
    response = client.get("/api/v1/utils/health-check/")

    assert response.status_code == 200
    data = response.json()

    # Verify timestamp is a string in ISO format
    assert isinstance(data["timestamp"], str)
    # Basic check: should contain T separator and likely a colon
    assert "T" in data["timestamp"]
    assert ":" in data["timestamp"]
