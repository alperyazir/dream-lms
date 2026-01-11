"""
Tests for AI Usage API Endpoints - Story 27.22
"""

import uuid
from datetime import UTC, datetime, timedelta
from io import StringIO

import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import create_access_token
from app.models import Teacher, User
from app.schemas.user import UserRole
from app.services.usage_tracking_service import log_llm_usage, log_tts_usage


@pytest.fixture
async def admin_token(db: AsyncSession) -> str:
    """Create an admin user and return auth token"""
    admin_user = User(
        email="admin@test.com",
        full_name="Admin User",
        hashed_password="fakehash",
        role=UserRole.admin,
        is_active=True,
    )
    db.add(admin_user)
    await db.commit()
    await db.refresh(admin_user)

    token = create_access_token(sub=str(admin_user.id))
    return token


@pytest.fixture
async def create_usage_logs(db: AsyncSession, teacher: Teacher):
    """Create sample usage logs for testing"""
    # Create multiple log entries
    await log_llm_usage(
        db=db,
        teacher_id=teacher.id,
        activity_type="ai_quiz",
        provider="deepseek",
        input_tokens=1000,
        output_tokens=500,
        estimated_cost=0.00028,
        success=True,
        duration_ms=1500,
    )

    await log_llm_usage(
        db=db,
        teacher_id=teacher.id,
        activity_type="vocabulary_quiz",
        provider="gemini",
        input_tokens=500,
        output_tokens=250,
        estimated_cost=0.0,
        success=True,
        duration_ms=1200,
    )

    await log_tts_usage(
        db=db,
        teacher_id=teacher.id,
        activity_type="vocabulary_quiz",
        provider="edge_tts",
        audio_characters=250,
        estimated_cost=0.0,
        success=True,
        duration_ms=800,
    )

    await log_llm_usage(
        db=db,
        teacher_id=teacher.id,
        activity_type="ai_quiz",
        provider="deepseek",
        input_tokens=0,
        output_tokens=0,
        estimated_cost=0.0,
        success=False,
        error_message="Test error",
        duration_ms=100,
    )

    await db.commit()


@pytest.mark.asyncio
async def test_get_usage_summary_unauthorized(client: AsyncClient, teacher_token: str):
    """Test that non-admin users cannot access usage summary"""
    response = await client.get(
        "/api/v1/ai/usage/summary",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 403  # Forbidden


@pytest.mark.asyncio
async def test_get_usage_summary(
    client: AsyncClient, admin_token: str, create_usage_logs
):
    """Test getting usage summary as admin"""
    response = await client.get(
        "/api/v1/ai/usage/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["total_generations"] == 4
    assert data["total_llm_requests"] == 3
    assert data["total_tts_requests"] == 1
    assert data["successful_generations"] == 3
    assert data["failed_generations"] == 1
    assert abs(data["total_estimated_cost"] - 0.00028) < 0.00001


@pytest.mark.asyncio
async def test_get_usage_summary_with_date_filter(
    client: AsyncClient, admin_token: str, create_usage_logs
):
    """Test getting usage summary with date range filter"""
    # Filter to future dates (should return zeros)
    tomorrow = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    next_week = (datetime.now(UTC) + timedelta(days=7)).isoformat()

    response = await client.get(
        f"/api/v1/ai/usage/summary?from_date={tomorrow}&to_date={next_week}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["total_generations"] == 0
    assert data["total_estimated_cost"] == 0.0


@pytest.mark.asyncio
async def test_get_usage_by_type(
    client: AsyncClient, admin_token: str, create_usage_logs
):
    """Test getting usage breakdown by activity type"""
    response = await client.get(
        "/api/v1/ai/usage/by-type",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) == 2  # ai_quiz and vocabulary_quiz

    # Find ai_quiz
    ai_quiz = next((x for x in data if x["activity_type"] == "ai_quiz"), None)
    assert ai_quiz is not None
    assert ai_quiz["count"] == 2
    assert "percentage" in ai_quiz
    assert "success_rate" in ai_quiz


@pytest.mark.asyncio
async def test_get_usage_by_teacher(
    client: AsyncClient, admin_token: str, create_usage_logs, teacher: Teacher
):
    """Test getting usage breakdown by teacher"""
    response = await client.get(
        "/api/v1/ai/usage/by-teacher",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) == 1

    teacher_usage = data[0]
    assert teacher_usage["teacher_id"] == str(teacher.id)
    assert teacher_usage["teacher_name"] == teacher.user.full_name
    assert teacher_usage["total_generations"] == 4
    assert "estimated_cost" in teacher_usage
    assert "top_activity_type" in teacher_usage
    assert "last_activity_date" in teacher_usage


@pytest.mark.asyncio
async def test_get_usage_by_teacher_with_limit(
    client: AsyncClient, admin_token: str, create_usage_logs
):
    """Test getting usage by teacher with limit parameter"""
    response = await client.get(
        "/api/v1/ai/usage/by-teacher?limit=1",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) <= 1


@pytest.mark.asyncio
async def test_get_usage_by_provider(
    client: AsyncClient, admin_token: str, create_usage_logs
):
    """Test getting usage breakdown by provider"""
    response = await client.get(
        "/api/v1/ai/usage/by-provider",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assert "llm_providers" in data
    assert "tts_providers" in data

    # Check LLM providers
    assert len(data["llm_providers"]) == 2  # deepseek, gemini

    deepseek = next(
        (p for p in data["llm_providers"] if p["provider"] == "deepseek"), None
    )
    assert deepseek is not None
    assert deepseek["count"] == 2

    # Check TTS providers
    assert len(data["tts_providers"]) == 1  # edge_tts

    edge = next(
        (p for p in data["tts_providers"] if p["provider"] == "edge_tts"), None
    )
    assert edge is not None
    assert edge["count"] == 1


@pytest.mark.asyncio
async def test_get_errors(client: AsyncClient, admin_token: str, create_usage_logs):
    """Test getting error logs"""
    response = await client.get(
        "/api/v1/ai/usage/errors",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assert "error_statistics" in data
    assert "recent_errors" in data

    stats = data["error_statistics"]
    assert stats["total_requests"] == 4
    assert stats["total_errors"] == 1
    assert stats["total_successes"] == 3

    errors = data["recent_errors"]
    assert len(errors) == 1
    assert errors[0]["error_message"] == "Test error"
    assert errors[0]["provider"] == "deepseek"


@pytest.mark.asyncio
async def test_get_errors_with_limit(
    client: AsyncClient, admin_token: str, create_usage_logs
):
    """Test getting errors with limit parameter"""
    response = await client.get(
        "/api/v1/ai/usage/errors?limit=0",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should get statistics but no error details
    assert data["error_statistics"]["total_errors"] == 1
    assert len(data["recent_errors"]) == 0


@pytest.mark.asyncio
async def test_export_csv(client: AsyncClient, admin_token: str, create_usage_logs):
    """Test CSV export functionality"""
    response = await client.get(
        "/api/v1/ai/usage/export",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "attachment" in response.headers.get("content-disposition", "")

    # Parse CSV content
    csv_content = response.text
    lines = csv_content.strip().split("\n")

    # Check header
    assert "timestamp" in lines[0]
    assert "teacher_name" in lines[0]
    assert "operation_type" in lines[0]
    assert "activity_type" in lines[0]
    assert "provider" in lines[0]

    # Should have header + 4 data rows
    assert len(lines) == 5


@pytest.mark.asyncio
async def test_export_csv_with_date_filter(
    client: AsyncClient, admin_token: str, create_usage_logs
):
    """Test CSV export with date range filter"""
    # Filter to future dates (should return only header)
    tomorrow = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    next_week = (datetime.now(UTC) + timedelta(days=7)).isoformat()

    response = await client.get(
        f"/api/v1/ai/usage/export?from_date={tomorrow}&to_date={next_week}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200

    csv_content = response.text
    lines = csv_content.strip().split("\n")

    # Should have only header
    assert len(lines) == 1


@pytest.mark.asyncio
async def test_export_csv_unauthorized(client: AsyncClient, teacher_token: str):
    """Test that non-admin users cannot export CSV"""
    response = await client.get(
        "/api/v1/ai/usage/export",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 403  # Forbidden


@pytest.mark.asyncio
async def test_all_endpoints_require_auth(client: AsyncClient):
    """Test that all AI usage endpoints require authentication"""
    endpoints = [
        "/api/v1/ai/usage/summary",
        "/api/v1/ai/usage/by-type",
        "/api/v1/ai/usage/by-teacher",
        "/api/v1/ai/usage/by-provider",
        "/api/v1/ai/usage/errors",
        "/api/v1/ai/usage/export",
    ]

    for endpoint in endpoints:
        response = await client.get(endpoint)
        assert response.status_code == 401  # Unauthorized
