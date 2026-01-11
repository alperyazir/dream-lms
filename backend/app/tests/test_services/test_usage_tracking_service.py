"""
Tests for Usage Tracking Service - Story 27.22
"""

import uuid
from datetime import UTC, datetime

import pytest
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import AIUsageLog, Teacher, User
from app.services.usage_tracking_service import (
    log_llm_usage,
    log_tts_usage,
)


@pytest.mark.asyncio
async def test_log_llm_usage(session: AsyncSession, teacher_user_with_record: User):
    """Test logging LLM usage"""
    # Get teacher from user
    teacher = teacher_user_with_record.teacher
    assert teacher is not None

    # Log LLM usage
    log_entry = await log_llm_usage(
        db=session,
        teacher_id=teacher.id,
        activity_type="ai_quiz",
        provider="deepseek",
        input_tokens=1000,
        output_tokens=500,
        estimated_cost=0.00028,
        success=True,
        duration_ms=1500,
    )

    assert log_entry.id is not None
    assert log_entry.teacher_id == teacher.id
    assert log_entry.operation_type == "llm_generation"
    assert log_entry.activity_type == "ai_quiz"
    assert log_entry.provider == "deepseek"
    assert log_entry.input_tokens == 1000
    assert log_entry.output_tokens == 500
    assert log_entry.estimated_cost == 0.00028
    assert log_entry.success is True
    assert log_entry.duration_ms == 1500
    assert log_entry.error_message is None


@pytest.mark.asyncio
async def test_log_llm_usage_with_error(db: AsyncSession, teacher: Teacher):
    """Test logging LLM usage with error"""
    log_entry = await log_llm_usage(
        db=db,
        teacher_id=teacher.id,
        activity_type="vocabulary_quiz",
        provider="gemini",
        input_tokens=500,
        output_tokens=0,
        estimated_cost=0.0,
        success=False,
        error_message="Rate limit exceeded",
        duration_ms=100,
    )

    assert log_entry.success is False
    assert log_entry.error_message == "Rate limit exceeded"
    assert log_entry.output_tokens == 0


@pytest.mark.asyncio
async def test_log_tts_usage(db: AsyncSession, teacher: Teacher):
    """Test logging TTS usage"""
    log_entry = await log_tts_usage(
        db=db,
        teacher_id=teacher.id,
        activity_type="vocabulary_quiz",
        provider="edge_tts",
        audio_characters=250,
        estimated_cost=0.0,
        success=True,
        duration_ms=800,
    )

    assert log_entry.id is not None
    assert log_entry.teacher_id == teacher.id
    assert log_entry.operation_type == "tts_generation"
    assert log_entry.activity_type == "vocabulary_quiz"
    assert log_entry.provider == "edge_tts"
    assert log_entry.audio_characters == 250
    assert log_entry.estimated_cost == 0.0
    assert log_entry.success is True
    assert log_entry.duration_ms == 800
    assert log_entry.input_tokens == 0
    assert log_entry.output_tokens == 0


@pytest.mark.asyncio
async def test_log_tts_usage_azure(db: AsyncSession, teacher: Teacher):
    """Test logging Azure TTS usage with cost"""
    log_entry = await log_tts_usage(
        db=db,
        teacher_id=teacher.id,
        activity_type="reading_comprehension",
        provider="azure_tts",
        audio_characters=1000,
        estimated_cost=0.004,
        success=True,
        duration_ms=1200,
    )

    assert log_entry.provider == "azure_tts"
    assert log_entry.audio_characters == 1000
    assert log_entry.estimated_cost == 0.004


@pytest.mark.asyncio
async def test_log_tts_usage_with_error(db: AsyncSession, teacher: Teacher):
    """Test logging TTS usage with error"""
    log_entry = await log_tts_usage(
        db=db,
        teacher_id=teacher.id,
        activity_type="vocabulary_quiz",
        provider="azure_tts",
        audio_characters=0,
        estimated_cost=0.0,
        success=False,
        error_message="Voice not found",
        duration_ms=50,
    )

    assert log_entry.success is False
    assert log_entry.error_message == "Voice not found"
    assert log_entry.audio_characters == 0
