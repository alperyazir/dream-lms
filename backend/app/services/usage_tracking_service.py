"""
AI Usage Tracking Service.

Persist AI usage logs to database for analytics and cost monitoring.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.models import AIUsageLog
from app.services.redis_cache import cache_invalidate


class UsageTrackingService:
    """Service for tracking AI usage (LLM and TTS) to database."""

    def __init__(self, db: AsyncSession):
        """Initialize usage tracking service."""
        self.db = db

    async def log_llm_usage(
        self,
        teacher_id: uuid.UUID,
        activity_type: str,
        provider: str,
        input_tokens: int,
        output_tokens: int,
        estimated_cost: float,
        duration_ms: int,
        success: bool = True,
        error_message: str | None = None,
    ) -> AIUsageLog:
        """
        Log LLM generation usage to database.

        Args:
            teacher_id: Teacher who triggered the generation
            activity_type: Type of activity (e.g., "vocabulary_quiz", "ai_quiz")
            provider: LLM provider name (e.g., "deepseek", "gemini")
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            estimated_cost: Estimated cost in USD
            duration_ms: Generation duration in milliseconds
            success: Whether generation succeeded
            error_message: Error message if failed

        Returns:
            Created AIUsageLog instance
        """
        log_entry = AIUsageLog(
            teacher_id=teacher_id,
            timestamp=datetime.now(UTC),
            operation_type="llm_generation",
            activity_type=activity_type,
            provider=provider,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            audio_characters=0,
            estimated_cost=estimated_cost,
            success=success,
            error_message=error_message,
            duration_ms=duration_ms,
        )

        self.db.add(log_entry)

        # Atomic check-and-increment: avoids TOCTOU race where concurrent
        # requests all pass the quota pre-check before any increments land.
        teacher_user_id = None
        if success:
            result = await self.db.execute(
                text(
                    "UPDATE teachers SET ai_generations_used = ai_generations_used + 1 "
                    "WHERE id = :teacher_id AND ai_generations_used < :quota "
                    "RETURNING ai_generations_used, user_id"
                ),
                {"teacher_id": str(teacher_id), "quota": settings.AI_MONTHLY_QUOTA},
            )
            updated = result.fetchone()
            if updated:
                teacher_user_id = updated[1]

        await self.db.commit()
        await self.db.refresh(log_entry)

        # Invalidate cached AI usage so quota updates immediately
        if success and teacher_user_id:
            await cache_invalidate(f"user:{teacher_user_id}:ai_usage")

        return log_entry

    async def log_tts_usage(
        self,
        teacher_id: uuid.UUID,
        activity_type: str,
        provider: str,
        audio_characters: int,
        estimated_cost: float,
        duration_ms: int,
        success: bool = True,
        error_message: str | None = None,
    ) -> AIUsageLog:
        """
        Log TTS generation usage to database.

        Args:
            teacher_id: Teacher who triggered the generation
            activity_type: Type of activity (e.g., "vocabulary_quiz")
            provider: TTS provider name (e.g., "edge_tts", "azure_tts")
            audio_characters: Number of characters converted to audio
            estimated_cost: Estimated cost in USD
            duration_ms: Generation duration in milliseconds
            success: Whether generation succeeded
            error_message: Error message if failed

        Returns:
            Created AIUsageLog instance
        """
        log_entry = AIUsageLog(
            teacher_id=teacher_id,
            timestamp=datetime.now(UTC),
            operation_type="tts_generation",
            activity_type=activity_type,
            provider=provider,
            input_tokens=0,
            output_tokens=0,
            audio_characters=audio_characters,
            estimated_cost=estimated_cost,
            success=success,
            error_message=error_message,
            duration_ms=duration_ms,
        )

        self.db.add(log_entry)
        await self.db.commit()
        await self.db.refresh(log_entry)

        return log_entry

    async def get_usage_logs(
        self,
        teacher_id: uuid.UUID | None = None,
        operation_type: str | None = None,
        limit: int = 100,
    ) -> list[AIUsageLog]:
        """
        Retrieve usage logs with optional filters.

        Args:
            teacher_id: Filter by teacher ID
            operation_type: Filter by operation type ("llm_generation" or "tts_generation")
            limit: Maximum number of logs to return

        Returns:
            List of AIUsageLog instances
        """
        query = select(AIUsageLog).order_by(AIUsageLog.timestamp.desc()).limit(limit)

        if teacher_id:
            query = query.where(AIUsageLog.teacher_id == teacher_id)

        if operation_type:
            query = query.where(AIUsageLog.operation_type == operation_type)

        result = await self.db.execute(query)
        return list(result.scalars().all())


# Standalone wrapper functions for easier use
async def log_llm_usage(
    db: AsyncSession,
    teacher_id: uuid.UUID,
    activity_type: str,
    provider: str,
    input_tokens: int,
    output_tokens: int,
    estimated_cost: float,
    duration_ms: int,
    success: bool = True,
    error_message: str | None = None,
) -> AIUsageLog:
    """Log LLM usage (standalone function)."""
    service = UsageTrackingService(db)
    return await service.log_llm_usage(
        teacher_id=teacher_id,
        activity_type=activity_type,
        provider=provider,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        estimated_cost=estimated_cost,
        duration_ms=duration_ms,
        success=success,
        error_message=error_message,
    )


async def log_tts_usage(
    db: AsyncSession,
    teacher_id: uuid.UUID,
    activity_type: str,
    provider: str,
    audio_characters: int,
    estimated_cost: float,
    duration_ms: int,
    success: bool = True,
    error_message: str | None = None,
) -> AIUsageLog:
    """Log TTS usage (standalone function)."""
    service = UsageTrackingService(db)
    return await service.log_tts_usage(
        teacher_id=teacher_id,
        activity_type=activity_type,
        provider=provider,
        audio_characters=audio_characters,
        estimated_cost=estimated_cost,
        duration_ms=duration_ms,
        success=success,
        error_message=error_message,
    )
