"""
AI Usage Analytics Service.

Provides aggregation queries for analyzing AI usage patterns, costs,
and error rates across teachers, activity types, and providers.
"""

import uuid
from datetime import datetime

from sqlalchemy import Integer, case, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import AIUsageLog, Teacher, User


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
        self.db = db

    def _apply_date_filters(self, query, from_date, to_date):
        if from_date:
            query = query.where(AIUsageLog.timestamp >= from_date)
        if to_date:
            query = query.where(AIUsageLog.timestamp <= to_date)
        return query

    async def get_usage_summary(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> UsageSummary:
        success_case = case(
            (AIUsageLog.success == True, 1),  # noqa: E712
            else_=0,
        )
        llm_case = case(
            (AIUsageLog.operation_type == "llm_generation", 1),
            else_=0,
        )
        tts_case = case(
            (AIUsageLog.operation_type == "tts_generation", 1),
            else_=0,
        )

        query = select(
            func.count(AIUsageLog.id).label("total"),
            func.coalesce(func.sum(AIUsageLog.estimated_cost), 0).label("total_cost"),
            func.avg(success_case).label("success_rate"),
            func.sum(llm_case).label("llm_count"),
            func.sum(tts_case).label("tts_count"),
            func.coalesce(func.sum(AIUsageLog.input_tokens), 0).label("total_input"),
            func.coalesce(func.sum(AIUsageLog.output_tokens), 0).label("total_output"),
            func.coalesce(func.sum(AIUsageLog.audio_characters), 0).label("total_audio"),
            func.coalesce(func.avg(AIUsageLog.duration_ms), 0).label("avg_duration"),
        )

        query = self._apply_date_filters(query, from_date, to_date)
        result = await self.db.execute(query)
        row = result.one()

        return UsageSummary(
            total_generations=row.total or 0,
            total_cost=float(row.total_cost or 0),
            success_rate=float(row.success_rate or 0) * 100,
            total_llm_generations=int(row.llm_count or 0),
            total_tts_generations=int(row.tts_count or 0),
            total_input_tokens=int(row.total_input or 0),
            total_output_tokens=int(row.total_output or 0),
            total_audio_characters=int(row.total_audio or 0),
            average_duration_ms=float(row.avg_duration or 0),
        )

    async def get_usage_by_type(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> list[UsageByType]:
        success_case = case(
            (AIUsageLog.success == True, 1),  # noqa: E712
            else_=0,
        )

        query = (
            select(
                AIUsageLog.activity_type,
                func.count(AIUsageLog.id).label("count"),
                func.coalesce(func.sum(AIUsageLog.estimated_cost), 0).label("cost"),
                func.avg(success_case).label("success_rate"),
            )
            .group_by(AIUsageLog.activity_type)
            .order_by(func.count(AIUsageLog.id).desc())
        )

        query = self._apply_date_filters(query, from_date, to_date)
        result = await self.db.execute(query)
        rows = result.all()

        return [
            UsageByType(
                activity_type=row.activity_type,
                count=row.count,
                cost=float(row.cost or 0),
                success_rate=float(row.success_rate or 0) * 100,
            )
            for row in rows
        ]

    async def get_usage_by_teacher(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        limit: int = 100,
    ) -> list[UsageByTeacher]:
        query = (
            select(
                AIUsageLog.teacher_id,
                User.full_name.label("teacher_name"),
                func.count(AIUsageLog.id).label("total_generations"),
                func.coalesce(func.sum(AIUsageLog.estimated_cost), 0).label("estimated_cost"),
                func.max(AIUsageLog.timestamp).label("last_activity_date"),
            )
            .join(Teacher, Teacher.id == AIUsageLog.teacher_id)
            .join(User, User.id == Teacher.user_id)
            .group_by(AIUsageLog.teacher_id, User.full_name)
            .order_by(func.count(AIUsageLog.id).desc())
            .limit(limit)
        )

        query = self._apply_date_filters(query, from_date, to_date)
        result = await self.db.execute(query)
        rows = result.all()

        teachers = []
        for row in rows:
            # Get top activity type for this teacher
            top_query = (
                select(AIUsageLog.activity_type)
                .where(AIUsageLog.teacher_id == row.teacher_id)
                .group_by(AIUsageLog.activity_type)
                .order_by(func.count().desc())
                .limit(1)
            )
            top_query = self._apply_date_filters(top_query, from_date, to_date)
            top_result = await self.db.execute(top_query)
            top_row = top_result.first()

            teachers.append(
                UsageByTeacher(
                    teacher_id=row.teacher_id,
                    teacher_name=row.teacher_name or "Unknown",
                    total_generations=row.total_generations,
                    estimated_cost=float(row.estimated_cost or 0),
                    top_activity_type=top_row[0] if top_row else None,
                    last_activity_date=row.last_activity_date,
                )
            )

        return teachers

    async def get_usage_by_provider(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> list[UsageByProvider]:
        query = (
            select(
                AIUsageLog.provider,
                AIUsageLog.operation_type,
                func.count(AIUsageLog.id).label("count"),
                func.coalesce(func.sum(AIUsageLog.estimated_cost), 0).label("cost"),
            )
            .group_by(AIUsageLog.provider, AIUsageLog.operation_type)
            .order_by(func.count(AIUsageLog.id).desc())
        )

        query = self._apply_date_filters(query, from_date, to_date)
        result = await self.db.execute(query)
        rows = result.all()

        return [
            UsageByProvider(
                provider=row.provider,
                count=row.count,
                cost=float(row.cost or 0),
                operation_type=row.operation_type,
            )
            for row in rows
        ]

    async def get_error_rate(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> dict[str, float]:
        error_case = case(
            (AIUsageLog.success == False, 1),  # noqa: E712
            else_=0,
        )

        query = select(
            func.count(AIUsageLog.id).label("total"),
            func.sum(error_case).label("errors"),
        )

        query = self._apply_date_filters(query, from_date, to_date)
        result = await self.db.execute(query)
        row = result.one()

        total = row.total or 0
        errors = int(row.errors or 0)
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
        query = (
            select(AIUsageLog, User.full_name.label("teacher_name"))
            .join(Teacher, Teacher.id == AIUsageLog.teacher_id)
            .join(User, User.id == Teacher.user_id)
            .where(AIUsageLog.success == False)  # noqa: E712
            .order_by(AIUsageLog.timestamp.desc())
            .limit(limit)
        )

        query = self._apply_date_filters(query, from_date, to_date)
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
