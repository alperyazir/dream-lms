"""Platform-wide analytics service for admin dashboard."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import case, cast, func, Date
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    Assignment,
    AssignmentStatus,
    AssignmentStudent,
    Student,
    Teacher,
    User,
    UserRole,
)
from app.schemas.platform_analytics import (
    ActiveUserCounts,
    ActivityTypeMetric,
    AITypeBreakdown,
    AIUsageResponse,
    AssignmentMetricsResponse,
    PlatformUsageResponse,
    TrendPoint,
)


def _get_period_start(period: str) -> datetime:
    """Convert period string to start datetime."""
    days = {"7d": 7, "30d": 30, "90d": 90}
    return datetime.now(UTC) - timedelta(days=days.get(period, 30))


async def get_platform_usage(
    session: AsyncSession, period: str
) -> PlatformUsageResponse:
    """Get platform usage metrics: active users and trends.

    Since User model has no last_login field, we use AssignmentStudent
    activity (started_at / completed_at) as a proxy for student activity,
    and Assignment.created_at for teacher activity.
    """
    now = datetime.now(UTC)
    period_start = _get_period_start(period)

    # --- Active users (using assignment activity as proxy) ---
    # Students: had assignment activity in the period
    async def _count_active_students(since: datetime) -> int:
        result = await session.execute(
            select(func.count(func.distinct(AssignmentStudent.student_id))).where(
                AssignmentStudent.started_at >= since,
            )
        )
        return result.scalar_one() or 0

    # Teachers: created assignments in the period
    async def _count_active_teachers(since: datetime) -> int:
        result = await session.execute(
            select(func.count(func.distinct(Assignment.teacher_id))).where(
                Assignment.created_at >= since,
            )
        )
        return result.scalar_one() or 0

    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    dau_s = await _count_active_students(day_ago)
    dau_t = await _count_active_teachers(day_ago)
    wau_s = await _count_active_students(week_ago)
    wau_t = await _count_active_teachers(week_ago)
    mau_s = await _count_active_students(month_ago)
    mau_t = await _count_active_teachers(month_ago)

    # --- Login trend (daily assignment activity as proxy) ---
    trend_result = await session.execute(
        select(
            cast(AssignmentStudent.started_at, Date).label("day"),
            func.count(func.distinct(AssignmentStudent.student_id)).label("cnt"),
        )
        .where(AssignmentStudent.started_at >= period_start)
        .group_by("day")
        .order_by("day")
    )
    login_trend = [
        TrendPoint(date=str(row.day), count=row.cnt)
        for row in trend_result.all()
        if row.day is not None
    ]

    # --- New registrations trend (Student + Teacher created_at) ---
    # User model has no created_at, so use Student + Teacher tables
    student_reg = await session.execute(
        select(
            cast(Student.created_at, Date).label("day"),
            func.count(Student.id).label("cnt"),
        )
        .where(Student.created_at >= period_start)
        .group_by("day")
        .order_by("day")
    )
    teacher_reg = await session.execute(
        select(
            cast(Teacher.created_at, Date).label("day"),
            func.count(Teacher.id).label("cnt"),
        )
        .where(Teacher.created_at >= period_start)
        .group_by("day")
        .order_by("day")
    )
    # Merge student + teacher registration counts by day
    reg_by_day: dict[str, int] = {}
    for row in student_reg.all():
        if row.day is not None:
            reg_by_day[str(row.day)] = reg_by_day.get(str(row.day), 0) + row.cnt
    for row in teacher_reg.all():
        if row.day is not None:
            reg_by_day[str(row.day)] = reg_by_day.get(str(row.day), 0) + row.cnt
    new_registrations = [
        TrendPoint(date=day, count=cnt)
        for day, cnt in sorted(reg_by_day.items())
    ]

    return PlatformUsageResponse(
        dau=ActiveUserCounts(students=dau_s, teachers=dau_t, total=dau_s + dau_t),
        wau=ActiveUserCounts(students=wau_s, teachers=wau_t, total=wau_s + wau_t),
        mau=ActiveUserCounts(students=mau_s, teachers=mau_t, total=mau_s + mau_t),
        login_trend=login_trend,
        new_registrations=new_registrations,
    )


async def get_assignment_metrics(
    session: AsyncSession, period: str
) -> AssignmentMetricsResponse:
    """Get assignment performance metrics."""
    period_start = _get_period_start(period)

    # Total assignments in period
    total_result = await session.execute(
        select(func.count(Assignment.id)).where(
            Assignment.created_at >= period_start
        )
    )
    total_assignments = total_result.scalar_one() or 0

    # Assignment creation trend
    trend_result = await session.execute(
        select(
            cast(Assignment.created_at, Date).label("day"),
            func.count(Assignment.id).label("cnt"),
        )
        .where(Assignment.created_at >= period_start)
        .group_by("day")
        .order_by("day")
    )
    assignment_trend = [
        TrendPoint(date=str(row.day), count=row.cnt)
        for row in trend_result.all()
        if row.day is not None
    ]

    # Completion rate and average score
    stats_result = await session.execute(
        select(
            func.count(AssignmentStudent.id).label("total"),
            func.sum(
                case(
                    (AssignmentStudent.status == AssignmentStatus.completed, 1),
                    else_=0,
                )
            ).label("completed"),
            func.avg(
                case(
                    (AssignmentStudent.status == AssignmentStatus.completed, AssignmentStudent.score),
                    else_=None,
                )
            ).label("avg_score"),
        ).join(Assignment, Assignment.id == AssignmentStudent.assignment_id)
        .where(Assignment.created_at >= period_start)
    )
    stats = stats_result.one()
    total_submissions = stats.total or 0
    completed = stats.completed or 0
    completion_rate = (completed / total_submissions * 100) if total_submissions > 0 else 0.0
    average_score = round(float(stats.avg_score or 0), 1)

    # By activity type (using Assignment.activity_type for AI assignments)
    type_result = await session.execute(
        select(
            Assignment.activity_type,
            func.count(AssignmentStudent.id).label("total"),
            func.sum(
                case(
                    (AssignmentStudent.status == AssignmentStatus.completed, 1),
                    else_=0,
                )
            ).label("completed"),
            func.avg(
                case(
                    (AssignmentStudent.status == AssignmentStatus.completed, AssignmentStudent.score),
                    else_=None,
                )
            ).label("avg_score"),
        )
        .join(Assignment, Assignment.id == AssignmentStudent.assignment_id)
        .where(
            Assignment.created_at >= period_start,
            Assignment.activity_type.isnot(None),
        )
        .group_by(Assignment.activity_type)
    )
    by_activity_type: list[ActivityTypeMetric] = []
    for row in type_result.all():
        t = row.total or 0
        c = row.completed or 0
        by_activity_type.append(
            ActivityTypeMetric(
                activity_type=str(row.activity_type.value) if row.activity_type else "unknown",
                completion_rate=round((c / t * 100) if t > 0 else 0.0, 1),
                average_score=round(float(row.avg_score or 0), 1),
                count=t,
            )
        )

    # Sort by average score for top/bottom
    sorted_types = sorted(by_activity_type, key=lambda x: x.average_score, reverse=True)
    top_performing = sorted_types[:3]
    bottom_performing = sorted_types[-3:] if len(sorted_types) > 3 else sorted_types

    return AssignmentMetricsResponse(
        total_assignments=total_assignments,
        assignment_trend=assignment_trend,
        completion_rate=round(completion_rate, 1),
        average_score=average_score,
        by_activity_type=by_activity_type,
        top_performing=top_performing,
        bottom_performing=bottom_performing,
    )


async def get_ai_usage(
    session: AsyncSession, period: str
) -> AIUsageResponse:
    """Get AI generation usage metrics.

    AI-generated assignments have activity_content IS NOT NULL.
    """
    period_start = _get_period_start(period)

    # Total AI generations
    total_result = await session.execute(
        select(func.count(Assignment.id)).where(
            Assignment.created_at >= period_start,
            Assignment.activity_content.isnot(None),
        )
    )
    total_generations = total_result.scalar_one() or 0

    # Generation trend
    trend_result = await session.execute(
        select(
            cast(Assignment.created_at, Date).label("day"),
            func.count(Assignment.id).label("cnt"),
        )
        .where(
            Assignment.created_at >= period_start,
            Assignment.activity_content.isnot(None),
        )
        .group_by("day")
        .order_by("day")
    )
    generation_trend = [
        TrendPoint(date=str(row.day), count=row.cnt)
        for row in trend_result.all()
        if row.day is not None
    ]

    # By activity type
    type_result = await session.execute(
        select(
            Assignment.activity_type,
            func.count(Assignment.id).label("cnt"),
        )
        .where(
            Assignment.created_at >= period_start,
            Assignment.activity_content.isnot(None),
            Assignment.activity_type.isnot(None),
        )
        .group_by(Assignment.activity_type)
        .order_by(func.count(Assignment.id).desc())
    )
    by_activity_type: list[AITypeBreakdown] = []
    most_frequent_type: str | None = None
    for i, row in enumerate(type_result.all()):
        type_name = str(row.activity_type.value) if row.activity_type else "unknown"
        by_activity_type.append(
            AITypeBreakdown(activity_type=type_name, count=row.cnt)
        )
        if i == 0:
            most_frequent_type = type_name

    return AIUsageResponse(
        total_generations=total_generations,
        generation_trend=generation_trend,
        by_activity_type=by_activity_type,
        most_frequent_type=most_frequent_type,
    )
