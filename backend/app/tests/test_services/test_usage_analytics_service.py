"""
Tests for Usage Analytics Service - Story 27.22
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import AIUsageLog, Teacher, User
from app.services.usage_analytics_service import (
    get_error_rate,
    get_usage_by_provider,
    get_usage_by_teacher,
    get_usage_by_type,
    get_usage_summary,
)
from app.services.usage_tracking_service import log_llm_usage, log_tts_usage


@pytest.fixture
async def create_sample_usage_data(db: AsyncSession, teacher: Teacher):
    """Create sample usage data for testing"""
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
        activity_type="ai_quiz",
        provider="deepseek",
        input_tokens=800,
        output_tokens=400,
        estimated_cost=0.000224,
        success=True,
        duration_ms=1200,
    )

    await log_llm_usage(
        db=db,
        teacher_id=teacher.id,
        activity_type="vocabulary_quiz",
        provider="gemini",
        input_tokens=500,
        output_tokens=0,
        estimated_cost=0.0,
        success=False,
        error_message="Rate limit",
        duration_ms=100,
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

    await log_tts_usage(
        db=db,
        teacher_id=teacher.id,
        activity_type="reading_comprehension",
        provider="azure_tts",
        audio_characters=1000,
        estimated_cost=0.004,
        success=True,
        duration_ms=1200,
    )

    await db.commit()


@pytest.mark.asyncio
async def test_get_usage_summary(
    db: AsyncSession, teacher: Teacher, create_sample_usage_data
):
    """Test getting overall usage summary"""
    summary = await get_usage_summary(db)

    assert summary["total_generations"] == 5
    assert summary["total_llm_requests"] == 3
    assert summary["total_tts_requests"] == 2
    assert summary["successful_generations"] == 4
    assert summary["failed_generations"] == 1
    # 0.00028 + 0.000224 + 0.004 = 0.004504
    assert abs(summary["total_estimated_cost"] - 0.004504) < 0.000001
    assert abs(summary["total_llm_cost"] - 0.000504) < 0.000001
    assert abs(summary["total_tts_cost"] - 0.004) < 0.000001
    # 1000 + 800 + 500 = 2300
    assert summary["total_input_tokens"] == 2300
    # 500 + 400 = 900
    assert summary["total_output_tokens"] == 900
    # 250 + 1000 = 1250
    assert summary["total_audio_characters"] == 1250
    # 4/5 = 80%
    assert abs(summary["success_rate_percentage"] - 80.0) < 0.1


@pytest.mark.asyncio
async def test_get_usage_summary_with_date_filter(
    db: AsyncSession, teacher: Teacher, create_sample_usage_data
):
    """Test getting usage summary with date filter"""
    # Filter to future dates (should return zeros)
    tomorrow = datetime.now(UTC) + timedelta(days=1)
    next_week = tomorrow + timedelta(days=7)

    summary = await get_usage_summary(db, from_date=tomorrow, to_date=next_week)

    assert summary["total_generations"] == 0
    assert summary["total_estimated_cost"] == 0.0


@pytest.mark.asyncio
async def test_get_usage_by_type(
    db: AsyncSession, teacher: Teacher, create_sample_usage_data
):
    """Test getting usage breakdown by activity type"""
    by_type = await get_usage_by_type(db)

    # Should have 3 types: ai_quiz, vocabulary_quiz, reading_comprehension
    assert len(by_type) == 3

    # Find ai_quiz
    ai_quiz = next((x for x in by_type if x["activity_type"] == "ai_quiz"), None)
    assert ai_quiz is not None
    assert ai_quiz["count"] == 2
    assert abs(ai_quiz["cost"] - 0.000504) < 0.000001  # 0.00028 + 0.000224
    assert abs(ai_quiz["percentage"] - 40.0) < 0.1  # 2/5 = 40%
    assert ai_quiz["success_rate"] == 100.0  # Both succeeded

    # Find vocabulary_quiz
    vocab_quiz = next(
        (x for x in by_type if x["activity_type"] == "vocabulary_quiz"), None
    )
    assert vocab_quiz is not None
    assert vocab_quiz["count"] == 2  # 1 LLM (failed) + 1 TTS (success)
    assert vocab_quiz["success_rate"] == 50.0  # 1 out of 2


@pytest.mark.asyncio
async def test_get_usage_by_teacher(
    db: AsyncSession, teacher: Teacher, create_sample_usage_data
):
    """Test getting usage breakdown by teacher"""
    by_teacher = await get_usage_by_teacher(db)

    assert len(by_teacher) == 1
    teacher_usage = by_teacher[0]

    assert teacher_usage["teacher_id"] == teacher.id
    assert teacher_usage["teacher_name"] == teacher.user.full_name
    assert teacher_usage["total_generations"] == 5
    assert abs(teacher_usage["estimated_cost"] - 0.004504) < 0.000001
    assert teacher_usage["top_activity_type"] == "ai_quiz"  # Most common (2 entries)
    assert teacher_usage["last_activity_date"] is not None


@pytest.mark.asyncio
async def test_get_usage_by_teacher_with_limit(
    db: AsyncSession, teacher: Teacher, create_sample_usage_data
):
    """Test getting usage by teacher with limit"""
    by_teacher = await get_usage_by_teacher(db, limit=1)

    assert len(by_teacher) <= 1


@pytest.mark.asyncio
async def test_get_usage_by_provider(
    db: AsyncSession, teacher: Teacher, create_sample_usage_data
):
    """Test getting usage breakdown by provider"""
    by_provider = await get_usage_by_provider(db)

    # LLM providers
    assert len(by_provider["llm_providers"]) == 2  # deepseek, gemini

    deepseek = next(
        (p for p in by_provider["llm_providers"] if p["provider"] == "deepseek"), None
    )
    assert deepseek is not None
    assert deepseek["count"] == 2
    assert abs(deepseek["cost"] - 0.000504) < 0.000001

    gemini = next(
        (p for p in by_provider["llm_providers"] if p["provider"] == "gemini"), None
    )
    assert gemini is not None
    assert gemini["count"] == 1
    assert gemini["cost"] == 0.0

    # TTS providers
    assert len(by_provider["tts_providers"]) == 2  # edge_tts, azure_tts

    edge = next(
        (p for p in by_provider["tts_providers"] if p["provider"] == "edge_tts"), None
    )
    assert edge is not None
    assert edge["count"] == 1
    assert edge["cost"] == 0.0

    azure = next(
        (p for p in by_provider["tts_providers"] if p["provider"] == "azure_tts"), None
    )
    assert azure is not None
    assert azure["count"] == 1
    assert abs(azure["cost"] - 0.004) < 0.001


@pytest.mark.asyncio
async def test_get_error_rate(
    db: AsyncSession, teacher: Teacher, create_sample_usage_data
):
    """Test getting error rate and recent errors"""
    errors = await get_error_rate(db)

    stats = errors["error_statistics"]
    assert stats["total_requests"] == 5
    assert stats["total_errors"] == 1
    assert stats["total_successes"] == 4
    assert abs(stats["error_rate_percentage"] - 20.0) < 0.1  # 1/5 = 20%
    assert abs(stats["success_rate_percentage"] - 80.0) < 0.1  # 4/5 = 80%

    # Check recent errors
    recent_errors = errors["recent_errors"]
    assert len(recent_errors) == 1

    error = recent_errors[0]
    assert error["provider"] == "gemini"
    assert error["activity_type"] == "vocabulary_quiz"
    assert error["error_message"] == "Rate limit"
    assert error["teacher_name"] == teacher.user.full_name


@pytest.mark.asyncio
async def test_get_error_rate_with_limit(
    db: AsyncSession, teacher: Teacher, create_sample_usage_data
):
    """Test getting error rate with error limit"""
    errors = await get_error_rate(db, limit=0)

    # Should still get statistics but no error details
    assert errors["error_statistics"]["total_errors"] == 1
    assert len(errors["recent_errors"]) == 0  # Limited to 0


@pytest.mark.asyncio
async def test_empty_database(db: AsyncSession):
    """Test analytics with no data"""
    summary = await get_usage_summary(db)

    assert summary["total_generations"] == 0
    assert summary["total_estimated_cost"] == 0.0
    assert summary["success_rate_percentage"] == 0.0

    by_type = await get_usage_by_type(db)
    assert len(by_type) == 0

    by_teacher = await get_usage_by_teacher(db)
    assert len(by_teacher) == 0

    by_provider = await get_usage_by_provider(db)
    assert len(by_provider["llm_providers"]) == 0
    assert len(by_provider["tts_providers"]) == 0

    errors = await get_error_rate(db)
    assert errors["error_statistics"]["total_requests"] == 0
    assert len(errors["recent_errors"]) == 0
