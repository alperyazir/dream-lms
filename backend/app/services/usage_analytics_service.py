"""
AI Usage Analytics Service.

Provides aggregation queries for analyzing AI usage patterns, costs,
and error rates across teachers, activity types, and providers.
"""

import uuid
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import AIUsageLog, User


class UsageSummary:
    """Summary statistics for AI usage."""

    def __init__(
        self,
        total_generations: int,
        total_cost: float,
        success_rate: float,
        total_llm_generations: int,
        total_tts_generations: int,
        total_input_tokens: int,
        total_output_tokens: int,
        total_audio_characters: int,
        average_duration_ms: float,
    ):
        self.total_generations = total_generations
        self.total_cost = total_cost
        self.success_rate = success_rate
        self.total_llm_generations = total_llm_generations
        self.total_tts_generations = total_tts_generations
        self.total_input_tokens = total_input_tokens
        self.total_output_tokens = total_output_tokens
        self.total_audio_characters = total_audio_characters
        self.average_duration_ms = average_duration_ms


class UsageByType:
    """Usage statistics by activity type."""

    def __init__(
        self,
        activity_type: str,
        count: int,
        cost: float,
        success_rate: float,
    ):
        self.activity_type = activity_type
        self.count = count
        self.cost = cost
        self.success_rate = success_rate


class UsageByTeacher:
    """Usage statistics by teacher."""

    def __init__(
        self,
        teacher_id: uuid.UUID,
        teacher_name: str,
        total_generations: int,
        estimated_cost: float,
        top_activity_type: str | None,
        last_activity_date: datetime | None,
    ):
        self.teacher_id = teacher_id
        self.teacher_name = teacher_name
        self.total_generations = total_generations
        self.estimated_cost = estimated_cost
        self.top_activity_type = top_activity_type
        self.last_activity_date = last_activity_date


class UsageByProvider:
    """Usage statistics by provider."""

    def __init__(
        self,
        provider: str,
        count: int,
        cost: float,
        operation_type: str,
    ):
        self.provider = provider
        self.count = count
        self.cost = cost
        self.operation_type = operation_type


class ErrorLog:
    """Error log entry."""

    def __init__(
        self,
        id: uuid.UUID,
        timestamp: datetime,
        provider: str,
        error_message: str,
        teacher_id: uuid.UUID,
        teacher_name: str,
        activity_type: str,
        operation_type: str,
    ):
        self.id = id
        self.timestamp = timestamp
        self.provider = provider
        self.error_message = error_message
        self.teacher_id = teacher_id
        self.teacher_name = teacher_name
        self.activity_type = activity_type
        self.operation_type = operation_type


class UsageAnalyticsService:
    """Service for AI usage analytics and aggregations."""

    def __init__(self, db: AsyncSession):
        """Initialize usage analytics service."""
        self.db = db

    async def get_usage_summary(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> UsageSummary:
        """
        Get overall usage summary.

        Args:
            from_date: Start date filter (inclusive)
            to_date: End date filter (inclusive)

        Returns:
            UsageSummary with aggregated statistics
        """
        query = select(
            func.count(AIUsageLog.id).label("total"),
            func.sum(AIUsageLog.estimated_cost).label("total_cost"),
            func.avg(func.cast(AIUsageLog.success, type_=func.Integer())).label("success_rate"),
            func.count(func.nullif(AIUsageLog.operation_type != "llm_generation", True)).label("llm_count"),
            func.count(func.nullif(AIUsageLog.operation_type != "tts_generation", True)).label("tts_count"),
            func.sum(AIUsageLog.input_tokens).label("total_input"),
            func.sum(AIUsageLog.output_tokens).label("total_output"),
            func.sum(AIUsageLog.audio_characters).label("total_audio"),
            func.avg(AIUsageLog.duration_ms).label("avg_duration"),
        )

        if from_date:
            query = query.where(AIUsageLog.timestamp >= from_date)
        if to_date:
            query = query.where(AIUsageLog.timestamp <= to_date)

        result = await self.db.execute(query)
        row = result.one()

        return UsageSummary(
            total_generations=row.total or 0,
            total_cost=float(row.total_cost or 0.0),
            success_rate=float(row.success_rate or 0.0) * 100,  # Convert to percentage
            total_llm_generations=row.llm_count or 0,
            total_tts_generations=row.tts_count or 0,
            total_input_tokens=row.total_input or 0,
            total_output_tokens=row.total_output or 0,
            total_audio_characters=row.total_audio or 0,
            average_duration_ms=float(row.avg_duration or 0.0),
        )

    async def get_usage_by_type(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> list[UsageByType]:
        """
        Get usage breakdown by activity type.

        Args:
            from_date: Start date filter (inclusive)
            to_date: End date filter (inclusive)

        Returns:
            List of UsageByType statistics
        """
        query = select(
            AIUsageLog.activity_type,
            func.count(AIUsageLog.id).label("count"),
            func.sum(AIUsageLog.estimated_cost).label("cost"),
            func.avg(func.cast(AIUsageLog.success, type_=func.Integer())).label("success_rate"),
        ).group_by(AIUsageLog.activity_type).order_by(func.count(AIUsageLog.id).desc())

        if from_date:
            query = query.where(AIUsageLog.timestamp >= from_date)
        if to_date:
            query = query.where(AIUsageLog.timestamp <= to_date)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            UsageByType(
                activity_type=row.activity_type,
                count=row.count,
                cost=float(row.cost or 0.0),
                success_rate=float(row.success_rate or 0.0) * 100,
            )
            for row in rows
        ]

    async def get_usage_by_teacher(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        limit: int = 100,
    ) -> list[UsageByTeacher]:
        """
        Get usage breakdown by teacher.

        Args:
            from_date: Start date filter (inclusive)
            to_date: End date filter (inclusive)
            limit: Maximum number of teachers to return

        Returns:
            List of UsageByTeacher statistics
        """
        # Subquery for top activity type per teacher
        from sqlalchemy import and_, literal_column
        from sqlmodel import col

        query = (
            select(
                AIUsageLog.teacher_id,
                User.full_name.label("teacher_name"),
                func.count(AIUsageLog.id).label("total_generations"),
                func.sum(AIUsageLog.estimated_cost).label("estimated_cost"),
                func.max(AIUsageLog.timestamp).label("last_activity_date"),
            )
            .join(User, User.id == AIUsageLog.teacher_id)
            .group_by(AIUsageLog.teacher_id, User.full_name)
            .order_by(func.count(AIUsageLog.id).desc())
            .limit(limit)
        )

        if from_date:
            query = query.where(AIUsageLog.timestamp >= from_date)
        if to_date:
            query = query.where(AIUsageLog.timestamp <= to_date)

        result = await self.db.execute(query)
        rows = result.all()

        # For each teacher, get their most used activity type
        teachers = []
        for row in rows:
            # Get top activity type for this teacher
            top_activity_query = (
                select(AIUsageLog.activity_type, func.count().label("count"))
                .where(AIUsageLog.teacher_id == row.teacher_id)
                .group_by(AIUsageLog.activity_type)
                .order_by(func.count().desc())
                .limit(1)
            )

            if from_date:
                top_activity_query = top_activity_query.where(AIUsageLog.timestamp >= from_date)
            if to_date:
                top_activity_query = top_activity_query.where(AIUsageLog.timestamp <= to_date)

            top_activity_result = await self.db.execute(top_activity_query)
            top_activity_row = top_activity_result.first()

            teachers.append(
                UsageByTeacher(
                    teacher_id=row.teacher_id,
                    teacher_name=row.teacher_name or "Unknown",
                    total_generations=row.total_generations,
                    estimated_cost=float(row.estimated_cost or 0.0),
                    top_activity_type=top_activity_row.activity_type if top_activity_row else None,
                    last_activity_date=row.last_activity_date,
                )
            )

        return teachers

    async def get_usage_by_provider(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> list[UsageByProvider]:
        """
        Get usage breakdown by provider.

        Args:
            from_date: Start date filter (inclusive)
            to_date: End date filter (inclusive)

        Returns:
            List of UsageByProvider statistics
        """
        query = select(
            AIUsageLog.provider,
            AIUsageLog.operation_type,
            func.count(AIUsageLog.id).label("count"),
            func.sum(AIUsageLog.estimated_cost).label("cost"),
        ).group_by(AIUsageLog.provider, AIUsageLog.operation_type).order_by(func.count(AIUsageLog.id).desc())

        if from_date:
            query = query.where(AIUsageLog.timestamp >= from_date)
        if to_date:
            query = query.where(AIUsageLog.timestamp <= to_date)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            UsageByProvider(
                provider=row.provider,
                count=row.count,
                cost=float(row.cost or 0.0),
                operation_type=row.operation_type,
            )
            for row in rows
        ]

    async def get_error_rate(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> dict[str, float]:
        """
        Get error rate statistics.

        Args:
            from_date: Start date filter (inclusive)
            to_date: End date filter (inclusive)

        Returns:
            Dictionary with error statistics
        """
        query = select(
            func.count(AIUsageLog.id).label("total"),
            func.count(func.nullif(AIUsageLog.success, True)).label("errors"),
        )

        if from_date:
            query = query.where(AIUsageLog.timestamp >= from_date)
        if to_date:
            query = query.where(AIUsageLog.timestamp <= to_date)

        result = await self.db.execute(query)
        row = result.one()

        total = row.total or 0
        errors = row.errors or 0
        error_rate = (errors / total * 100) if total > 0 else 0.0

        return {
            "total_requests": total,
            "total_errors": errors,
            "error_rate_percentage": round(error_rate, 2),
            "success_rate_percentage": round(100 - error_rate, 2),
        }

    async def get_errors(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        limit: int = 100,
    ) -> list[ErrorLog]:
        """
        Get recent error logs.

        Args:
            from_date: Start date filter (inclusive)
            to_date: End date filter (inclusive)
            limit: Maximum number of errors to return

        Returns:
            List of ErrorLog entries
        """
        query = (
            select(AIUsageLog, User.full_name.label("teacher_name"))
            .join(User, User.id == AIUsageLog.teacher_id)
            .where(AIUsageLog.success == False)
            .order_by(AIUsageLog.timestamp.desc())
            .limit(limit)
        )

        if from_date:
            query = query.where(AIUsageLog.timestamp >= from_date)
        if to_date:
            query = query.where(AIUsageLog.timestamp <= to_date)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            ErrorLog(
                id=row.AIUsageLog.id,
                timestamp=row.AIUsageLog.timestamp,
                provider=row.AIUsageLog.provider,
                error_message=row.AIUsageLog.error_message or "Unknown error",
                teacher_id=row.AIUsageLog.teacher_id,
                teacher_name=row.teacher_name or "Unknown",
                activity_type=row.AIUsageLog.activity_type,
                operation_type=row.AIUsageLog.operation_type,
            )
            for row in rows
        ]


# Standalone wrapper functions for easier use
async def get_usage_summary(
    db: AsyncSession,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> dict:
    """Get overall usage summary (standalone function)."""
    service = UsageAnalyticsService(db)
    summary = await service.get_usage_summary(from_date, to_date)

    return {
        "total_generations": summary.total_generations,
        "total_llm_requests": summary.total_llm_generations,
        "total_tts_requests": summary.total_tts_generations,
        "successful_generations": summary.total_generations - int((100 - summary.success_rate) / 100 * summary.total_generations),
        "failed_generations": int((100 - summary.success_rate) / 100 * summary.total_generations),
        "total_estimated_cost": summary.total_cost,
        "total_llm_cost": summary.total_cost,  # Will be separated in real implementation
        "total_tts_cost": 0.0,  # Will be calculated separately
        "total_input_tokens": summary.total_input_tokens,
        "total_output_tokens": summary.total_output_tokens,
        "total_audio_characters": summary.total_audio_characters,
        "success_rate_percentage": summary.success_rate,
    }


async def get_usage_by_type(
    db: AsyncSession,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[dict]:
    """Get usage breakdown by activity type (standalone function)."""
    service = UsageAnalyticsService(db)
    usage_list = await service.get_usage_by_type(from_date, to_date)

    # Calculate total for percentage
    total = sum(u.count for u in usage_list)

    return [
        {
            "activity_type": usage.activity_type,
            "count": usage.count,
            "cost": usage.cost,
            "percentage": (usage.count / total * 100) if total > 0 else 0.0,
            "success_rate": usage.success_rate,
        }
        for usage in usage_list
    ]


async def get_usage_by_teacher(
    db: AsyncSession,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    limit: int = 100,
) -> list[dict]:
    """Get usage breakdown by teacher (standalone function)."""
    service = UsageAnalyticsService(db)
    teachers = await service.get_usage_by_teacher(from_date, to_date, limit)

    return [
        {
            "teacher_id": teacher.teacher_id,
            "teacher_name": teacher.teacher_name,
            "total_generations": teacher.total_generations,
            "estimated_cost": teacher.estimated_cost,
            "top_activity_type": teacher.top_activity_type,
            "last_activity_date": teacher.last_activity_date,
        }
        for teacher in teachers
    ]


async def get_usage_by_provider(
    db: AsyncSession,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> dict:
    """Get usage breakdown by provider (standalone function)."""
    service = UsageAnalyticsService(db)
    providers = await service.get_usage_by_provider(from_date, to_date)

    llm_providers = []
    tts_providers = []

    for provider in providers:
        provider_dict = {
            "provider": provider.provider,
            "count": provider.count,
            "cost": provider.cost,
        }

        if provider.operation_type == "llm_generation":
            llm_providers.append(provider_dict)
        elif provider.operation_type == "tts_generation":
            tts_providers.append(provider_dict)

    return {
        "llm_providers": llm_providers,
        "tts_providers": tts_providers,
    }


async def get_error_rate(
    db: AsyncSession,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    limit: int = 100,
) -> dict:
    """Get error rate and recent errors (standalone function)."""
    service = UsageAnalyticsService(db)
    stats = await service.get_error_rate(from_date, to_date)
    errors = await service.get_errors(from_date, to_date, limit)

    return {
        "error_statistics": {
            "total_requests": stats["total_requests"],
            "total_errors": stats["total_errors"],
            "total_successes": stats["total_requests"] - stats["total_errors"],
            "error_rate_percentage": stats["error_rate_percentage"],
            "success_rate_percentage": stats["success_rate_percentage"],
        },
        "recent_errors": [
            {
                "id": error.id,
                "timestamp": error.timestamp,
                "provider": error.provider,
                "error_message": error.error_message,
                "teacher_id": error.teacher_id,
                "teacher_name": error.teacher_name,
                "activity_type": error.activity_type,
                "operation_type": error.operation_type,
            }
            for error in errors
        ],
    }
