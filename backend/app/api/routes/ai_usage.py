"""
AI Usage API Routes.

Admin-only endpoints for monitoring AI usage, costs, and error rates.
"""

import csv
import io
import logging
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlmodel import select

from app.api.deps import AsyncSessionDep, CurrentUser, require_role
from app.models import User, UserRole
from app.services.usage_analytics_service import UsageAnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/usage", tags=["ai-usage"])


@router.get("/my-usage")
async def get_my_usage(
    session: AsyncSessionDep,
    current_user: CurrentUser,
):
    """
    Get current user's own AI usage summary.

    Available to all authenticated users (teachers).

    Returns:
        - total_generations: Total number of AI generations this month
        - monthly_quota: Monthly generation quota limit
        - remaining_quota: Remaining generations this month
    """
    from app.models import Teacher
    from app.core.config import settings

    # Monthly quota from environment config
    monthly_quota = settings.AI_MONTHLY_QUOTA

    # Get teacher record for current user
    teacher_query = select(Teacher).where(Teacher.user_id == current_user.id)
    teacher_result = await session.execute(teacher_query)
    teacher = teacher_result.scalar_one_or_none()

    if not teacher:
        # User is not a teacher, return zero usage
        return {
            "total_generations": 0,
            "monthly_quota": monthly_quota,
            "remaining_quota": monthly_quota,
        }

    # Check if we need to reset the monthly quota
    now = datetime.now()
    reset_date = teacher.ai_quota_reset_date

    # Reset if we're in a new month
    if reset_date.year < now.year or (reset_date.year == now.year and reset_date.month < now.month):
        teacher.ai_generations_used = 0
        teacher.ai_quota_reset_date = now
        session.add(teacher)
        await session.commit()
        await session.refresh(teacher)

    return {
        "total_generations": teacher.ai_generations_used,
        "monthly_quota": monthly_quota,
        "remaining_quota": max(0, monthly_quota - teacher.ai_generations_used),
    }


@router.get("/summary")
async def get_usage_summary(
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.admin),
    from_date: datetime | None = Query(None, description="Start date (ISO 8601)"),
    to_date: datetime | None = Query(None, description="End date (ISO 8601)"),
):
    """
    Get overall AI usage summary.

    Requires admin role.

    Returns:
        - total_generations: Total number of AI generations
        - total_cost: Estimated total cost in USD
        - success_rate: Success rate percentage
        - breakdown by operation type (LLM vs TTS)
        - token and character usage
    """
    service = UsageAnalyticsService(session)
    summary = await service.get_usage_summary(from_date, to_date)

    return {
        "total_generations": summary.total_generations,
        "total_cost": summary.total_cost,
        "success_rate": summary.success_rate,
        "total_llm_generations": summary.total_llm_generations,
        "total_tts_generations": summary.total_tts_generations,
        "total_input_tokens": summary.total_input_tokens,
        "total_output_tokens": summary.total_output_tokens,
        "total_audio_characters": summary.total_audio_characters,
        "average_duration_ms": summary.average_duration_ms,
        "date_range": {
            "from": from_date.isoformat() if from_date else None,
            "to": to_date.isoformat() if to_date else None,
        },
    }


@router.get("/by-type")
async def get_usage_by_type(
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.admin),
    from_date: datetime | None = Query(None, description="Start date (ISO 8601)"),
    to_date: datetime | None = Query(None, description="End date (ISO 8601)"),
):
    """
    Get usage breakdown by activity type.

    Requires admin role.

    Returns list of activity types with:
        - activity_type: Type of activity
        - count: Number of generations
        - cost: Estimated cost in USD
        - success_rate: Success rate percentage
    """
    service = UsageAnalyticsService(session)
    usage_by_type = await service.get_usage_by_type(from_date, to_date)

    # Calculate total for percentage
    total = sum(item.count for item in usage_by_type)

    return [
        {
            "activity_type": item.activity_type,
            "count": item.count,
            "cost": item.cost,
            "success_rate": item.success_rate,
            "percentage": round((item.count / total * 100) if total > 0 else 0, 2),
        }
        for item in usage_by_type
    ]


@router.get("/by-teacher")
async def get_usage_by_teacher(
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.admin),
    from_date: datetime | None = Query(None, description="Start date (ISO 8601)"),
    to_date: datetime | None = Query(None, description="End date (ISO 8601)"),
    limit: int = Query(100, ge=1, le=1000, description="Max teachers to return"),
):
    """
    Get usage breakdown by teacher.

    Requires admin role.

    Returns list of teachers with:
        - teacher_id: Teacher UUID
        - teacher_name: Teacher full name
        - total_generations: Number of generations
        - estimated_cost: Total estimated cost in USD
        - top_activity_type: Most used activity type
        - last_activity_date: Last generation timestamp
    """
    service = UsageAnalyticsService(session)
    usage_by_teacher = await service.get_usage_by_teacher(from_date, to_date, limit)

    return [
        {
            "teacher_id": str(item.teacher_id),
            "teacher_name": item.teacher_name,
            "total_generations": item.total_generations,
            "estimated_cost": item.estimated_cost,
            "top_activity_type": item.top_activity_type,
            "last_activity_date": item.last_activity_date.isoformat() if item.last_activity_date else None,
        }
        for item in usage_by_teacher
    ]


@router.get("/by-provider")
async def get_usage_by_provider(
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.admin),
    from_date: datetime | None = Query(None, description="Start date (ISO 8601)"),
    to_date: datetime | None = Query(None, description="End date (ISO 8601)"),
):
    """
    Get usage breakdown by provider (LLM and TTS).

    Requires admin role.

    Returns list of providers with:
        - provider: Provider name
        - operation_type: "llm_generation" or "tts_generation"
        - count: Number of requests
        - cost: Estimated cost in USD
    """
    service = UsageAnalyticsService(session)
    usage_by_provider = await service.get_usage_by_provider(from_date, to_date)

    # Group by operation type for easier frontend consumption
    llm_providers = []
    tts_providers = []

    for item in usage_by_provider:
        provider_data = {
            "provider": item.provider,
            "count": item.count,
            "cost": item.cost,
        }

        if item.operation_type == "llm_generation":
            llm_providers.append(provider_data)
        else:
            tts_providers.append(provider_data)

    return {
        "llm_providers": llm_providers,
        "tts_providers": tts_providers,
    }


@router.get("/errors")
async def get_errors(
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.admin),
    from_date: datetime | None = Query(None, description="Start date (ISO 8601)"),
    to_date: datetime | None = Query(None, description="End date (ISO 8601)"),
    limit: int = Query(100, ge=1, le=1000, description="Max errors to return"),
):
    """
    Get recent AI generation errors.

    Requires admin role.

    Returns list of errors with:
        - id: Error log ID
        - timestamp: When the error occurred
        - provider: Provider that failed
        - error_message: Error description
        - teacher_id: Teacher who triggered the request
        - teacher_name: Teacher full name
        - activity_type: Activity type that failed
        - operation_type: "llm_generation" or "tts_generation"
    """
    service = UsageAnalyticsService(session)
    error_rate = await service.get_error_rate(from_date, to_date)
    errors = await service.get_errors(from_date, to_date, limit)

    return {
        "error_statistics": error_rate,
        "recent_errors": [
            {
                "id": str(error.id),
                "timestamp": error.timestamp.isoformat(),
                "provider": error.provider,
                "error_message": error.error_message,
                "teacher_id": str(error.teacher_id),
                "teacher_name": error.teacher_name,
                "activity_type": error.activity_type,
                "operation_type": error.operation_type,
            }
            for error in errors
        ],
    }


@router.get("/export")
async def export_usage_data(
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.admin),
    from_date: datetime | None = Query(None, description="Start date (ISO 8601)"),
    to_date: datetime | None = Query(None, description="End date (ISO 8601)"),
):
    """
    Export usage data as CSV.

    Requires admin role.

    Returns CSV file with all usage data in the specified date range.
    """
    from app.models import AIUsageLog

    # Query all usage logs in date range
    query = select(AIUsageLog).order_by(AIUsageLog.timestamp.desc())

    if from_date:
        query = query.where(AIUsageLog.timestamp >= from_date)
    if to_date:
        query = query.where(AIUsageLog.timestamp <= to_date)

    result = await session.execute(query)
    logs = result.scalars().all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        "Timestamp",
        "Teacher ID",
        "Operation Type",
        "Activity Type",
        "Provider",
        "Input Tokens",
        "Output Tokens",
        "Audio Characters",
        "Estimated Cost (USD)",
        "Duration (ms)",
        "Success",
        "Error Message",
    ])

    # Write data rows
    for log in logs:
        writer.writerow([
            log.timestamp.isoformat(),
            str(log.teacher_id),
            log.operation_type,
            log.activity_type,
            log.provider,
            log.input_tokens,
            log.output_tokens,
            log.audio_characters,
            f"{log.estimated_cost:.8f}",
            log.duration_ms,
            "Yes" if log.success else "No",
            log.error_message or "",
        ])

    # Generate filename with date range
    from_str = from_date.strftime("%Y%m%d") if from_date else "all"
    to_str = to_date.strftime("%Y%m%d") if to_date else "now"
    filename = f"ai_usage_{from_str}_to_{to_str}.csv"

    # Return CSV file
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
