"""Benchmark calculation service for class performance comparison - Story 5.7.

[Source: Story 5.7 - Performance Comparison & Benchmarking]
Calculates benchmarks for comparing class performance against school/publisher averages
with proper anonymization (minimum 5 classes required for benchmark display).
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import func, select, distinct, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Assignment,
    AssignmentStatus,
    AssignmentStudent,
    Class,
    ClassStudent,
    Activity,
    Book,
    Publisher,
    School,
    Teacher,
)
from app.schemas.benchmarks import (
    ActivityTypeBenchmark,
    AdminBenchmarkOverview,
    BenchmarkData,
    BenchmarkMessage,
    BenchmarkTrendPoint,
    ClassBenchmarkResponse,
    ClassMetrics,
    SchoolBenchmarkSummary,
    ActivityTypeStat,
    BenchmarkPeriod,
)

# Minimum number of classes required for benchmark data to be displayed (privacy threshold)
MIN_CLASSES_FOR_BENCHMARK = 5

# Activity type label mapping for user-friendly display
ACTIVITY_TYPE_LABELS = {
    "dragdroppicture": "Drag & Drop",
    "dragdroppicturegroup": "Categorization",
    "matchTheWords": "Word Matching",
    "puzzleFindWords": "Word Search",
    "circle": "Circle the Answer",
    "markwithx": "Mark with X",
}


def get_period_start(period: BenchmarkPeriod) -> datetime:
    """
    Calculate start date for benchmark period.

    Args:
        period: Benchmark period ('weekly', 'monthly', 'semester', 'all')

    Returns:
        Start datetime for the period
    """
    now = datetime.now(UTC)

    if period == "weekly":
        # Start of current week (Monday)
        days_since_monday = now.weekday()
        return now - timedelta(days=days_since_monday, hours=now.hour, minutes=now.minute, seconds=now.second)
    elif period == "monthly":
        # Start of current month
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "semester":
        # Approximate semester (last 6 months)
        return now - timedelta(days=180)
    else:  # "all"
        # Very old date to include all data
        return datetime(2000, 1, 1)


def _get_activity_type_label(activity_type: str) -> str:
    """Get user-friendly label for activity type."""
    return ACTIVITY_TYPE_LABELS.get(activity_type, activity_type.replace("_", " ").title())


def _generate_benchmark_message(
    class_avg: float,
    benchmark_avg: float | None,
    weakest_activity: str | None = None,
) -> BenchmarkMessage:
    """
    Generate encouraging or constructive message based on performance comparison.

    [Source: Story 5.7 AC: 10, 11]
    """
    if benchmark_avg is None:
        return BenchmarkMessage(
            type="at_average",
            title="Keep up the great work!",
            description="Continue supporting your students' learning journey.",
            icon="chart-up",
            focus_area=None,
        )

    difference = class_avg - benchmark_avg

    if difference > 10:
        return BenchmarkMessage(
            type="excelling",
            title="Your class is excelling!",
            description=f"Your class is performing {difference:.0f}% above the benchmark. Outstanding work!",
            icon="trophy",
            focus_area=None,
        )
    elif difference > 0:
        return BenchmarkMessage(
            type="above_average",
            title="Great job!",
            description=f"Your class is {difference:.1f}% above average. Keep up the momentum!",
            icon="star",
            focus_area=None,
        )
    elif difference > -10:
        return BenchmarkMessage(
            type="below_average",
            title="Opportunities for growth",
            description=f"Your class is close to the benchmark. "
            + (f"Consider focusing on {weakest_activity}." if weakest_activity else "You're making progress!"),
            icon="target",
            focus_area=weakest_activity,
        )
    else:
        return BenchmarkMessage(
            type="needs_focus",
            title="Let's focus on improvement",
            description=f"There's room for growth"
            + (f", especially in {weakest_activity}." if weakest_activity else ".")
            + " Small steps lead to big results!",
            icon="chart-up",
            focus_area=weakest_activity,
        )


async def calculate_school_benchmark(
    school_id: uuid.UUID,
    period: BenchmarkPeriod,
    session: AsyncSession,
    exclude_class_id: uuid.UUID | None = None,
) -> BenchmarkData | None:
    """
    Calculate school-wide benchmark data.

    [Source: Story 5.7 AC: 4, 6]

    Args:
        school_id: School UUID
        period: Time period for filtering
        session: Database session
        exclude_class_id: Optional class ID to exclude from calculations (for comparing against)

    Returns:
        BenchmarkData or None if threshold not met
    """
    period_start = get_period_start(period)

    # Count distinct classes in school that have completed assignments
    class_count_query = (
        select(func.count(distinct(Class.id)))
        .select_from(Class)
        .join(ClassStudent, ClassStudent.class_id == Class.id)
        .join(AssignmentStudent, AssignmentStudent.student_id == ClassStudent.student_id)
        .where(
            Class.school_id == school_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.completed_at >= period_start,
        )
    )

    if exclude_class_id:
        class_count_query = class_count_query.where(Class.id != exclude_class_id)

    result = await session.execute(class_count_query)
    class_count = result.scalar() or 0

    # Check minimum threshold
    if class_count < MIN_CLASSES_FOR_BENCHMARK:
        return BenchmarkData(
            level="school",
            average_score=0.0,
            completion_rate=0.0,
            sample_size=class_count,
            period=period,
            is_available=False,
        )

    # Calculate aggregated scores across all classes in school
    # Query completed assignment submissions for classes in school
    benchmark_query = (
        select(
            func.avg(AssignmentStudent.score).label("avg_score"),
            func.count(AssignmentStudent.id).label("total_submissions"),
            func.sum(
                case(
                    (AssignmentStudent.status == AssignmentStatus.completed, 1),
                    else_=0,
                )
            ).label("completed_count"),
        )
        .select_from(AssignmentStudent)
        .join(ClassStudent, ClassStudent.student_id == AssignmentStudent.student_id)
        .join(Class, Class.id == ClassStudent.class_id)
        .where(
            Class.school_id == school_id,
            AssignmentStudent.completed_at >= period_start,
        )
    )

    if exclude_class_id:
        benchmark_query = benchmark_query.where(Class.id != exclude_class_id)

    result = await session.execute(benchmark_query)
    row = result.first()

    if not row or row.avg_score is None:
        return BenchmarkData(
            level="school",
            average_score=0.0,
            completion_rate=0.0,
            sample_size=class_count,
            period=period,
            is_available=False,
        )

    avg_score = float(row.avg_score) if row.avg_score else 0.0
    completion_rate = (
        (row.completed_count / row.total_submissions * 100)
        if row.total_submissions > 0
        else 0.0
    )

    return BenchmarkData(
        level="school",
        average_score=round(avg_score, 1),
        completion_rate=round(completion_rate, 1),
        sample_size=class_count,
        period=period,
        is_available=True,
    )


async def calculate_publisher_benchmark(
    publisher_id: uuid.UUID,
    period: BenchmarkPeriod,
    session: AsyncSession,
    exclude_class_id: uuid.UUID | None = None,
) -> BenchmarkData | None:
    """
    Calculate publisher-wide benchmark data across all schools using publisher's content.

    [Source: Story 5.7 AC: 4, 6]

    Args:
        publisher_id: Publisher UUID
        period: Time period for filtering
        session: Database session
        exclude_class_id: Optional class ID to exclude from calculations

    Returns:
        BenchmarkData or None if threshold not met
    """
    period_start = get_period_start(period)

    # Count distinct classes using publisher's books that have completed assignments
    class_count_query = (
        select(func.count(distinct(Class.id)))
        .select_from(Class)
        .join(ClassStudent, ClassStudent.class_id == Class.id)
        .join(AssignmentStudent, AssignmentStudent.student_id == ClassStudent.student_id)
        .join(Assignment, Assignment.id == AssignmentStudent.assignment_id)
        .join(Book, Book.id == Assignment.book_id)
        .where(
            Book.publisher_id == publisher_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.completed_at >= period_start,
        )
    )

    if exclude_class_id:
        class_count_query = class_count_query.where(Class.id != exclude_class_id)

    result = await session.execute(class_count_query)
    class_count = result.scalar() or 0

    # Check minimum threshold
    if class_count < MIN_CLASSES_FOR_BENCHMARK:
        return BenchmarkData(
            level="publisher",
            average_score=0.0,
            completion_rate=0.0,
            sample_size=class_count,
            period=period,
            is_available=False,
        )

    # Calculate aggregated scores across all classes using publisher's content
    benchmark_query = (
        select(
            func.avg(AssignmentStudent.score).label("avg_score"),
            func.count(AssignmentStudent.id).label("total_submissions"),
            func.sum(
                case(
                    (AssignmentStudent.status == AssignmentStatus.completed, 1),
                    else_=0,
                )
            ).label("completed_count"),
        )
        .select_from(AssignmentStudent)
        .join(Assignment, Assignment.id == AssignmentStudent.assignment_id)
        .join(Book, Book.id == Assignment.book_id)
        .join(ClassStudent, ClassStudent.student_id == AssignmentStudent.student_id)
        .join(Class, Class.id == ClassStudent.class_id)
        .where(
            Book.publisher_id == publisher_id,
            AssignmentStudent.completed_at >= period_start,
        )
    )

    if exclude_class_id:
        benchmark_query = benchmark_query.where(Class.id != exclude_class_id)

    result = await session.execute(benchmark_query)
    row = result.first()

    if not row or row.avg_score is None:
        return BenchmarkData(
            level="publisher",
            average_score=0.0,
            completion_rate=0.0,
            sample_size=class_count,
            period=period,
            is_available=False,
        )

    avg_score = float(row.avg_score) if row.avg_score else 0.0
    completion_rate = (
        (row.completed_count / row.total_submissions * 100)
        if row.total_submissions > 0
        else 0.0
    )

    return BenchmarkData(
        level="publisher",
        average_score=round(avg_score, 1),
        completion_rate=round(completion_rate, 1),
        sample_size=class_count,
        period=period,
        is_available=True,
    )


async def calculate_activity_type_benchmarks(
    class_id: uuid.UUID,
    school_id: uuid.UUID,
    period: BenchmarkPeriod,
    session: AsyncSession,
) -> list[ActivityTypeBenchmark]:
    """
    Calculate performance comparison by activity type.

    [Source: Story 5.7 AC: 5]

    Args:
        class_id: Class UUID
        school_id: School UUID for benchmark comparison
        period: Time period for filtering
        session: Database session

    Returns:
        List of activity type benchmark comparisons
    """
    period_start = get_period_start(period)

    # Get class students
    class_students_result = await session.execute(
        select(ClassStudent.student_id).where(ClassStudent.class_id == class_id)
    )
    class_student_ids = [row[0] for row in class_students_result.all()]

    if not class_student_ids:
        return []

    # Calculate class averages by activity type
    class_scores_query = (
        select(
            Activity.activity_type,
            func.avg(AssignmentStudent.score).label("avg_score"),
        )
        .select_from(AssignmentStudent)
        .join(Assignment, Assignment.id == AssignmentStudent.assignment_id)
        .join(Activity, Activity.id == Assignment.activity_id)
        .where(
            AssignmentStudent.student_id.in_(class_student_ids),
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.completed_at >= period_start,
            AssignmentStudent.score.isnot(None),
        )
        .group_by(Activity.activity_type)
    )

    class_result = await session.execute(class_scores_query)
    class_scores = {row.activity_type: float(row.avg_score) for row in class_result.all()}

    if not class_scores:
        return []

    # Calculate school benchmark averages by activity type (excluding this class)
    school_scores_query = (
        select(
            Activity.activity_type,
            func.avg(AssignmentStudent.score).label("avg_score"),
        )
        .select_from(AssignmentStudent)
        .join(Assignment, Assignment.id == AssignmentStudent.assignment_id)
        .join(Activity, Activity.id == Assignment.activity_id)
        .join(ClassStudent, ClassStudent.student_id == AssignmentStudent.student_id)
        .join(Class, Class.id == ClassStudent.class_id)
        .where(
            Class.school_id == school_id,
            Class.id != class_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.completed_at >= period_start,
            AssignmentStudent.score.isnot(None),
        )
        .group_by(Activity.activity_type)
    )

    school_result = await session.execute(school_scores_query)
    school_scores = {row.activity_type: float(row.avg_score) for row in school_result.all()}

    # Build comparison list
    benchmarks = []
    for activity_type, class_avg in class_scores.items():
        school_avg = school_scores.get(activity_type, class_avg)  # Default to class avg if no benchmark
        difference = class_avg - school_avg

        benchmarks.append(
            ActivityTypeBenchmark(
                activity_type=activity_type,
                activity_label=_get_activity_type_label(activity_type),
                class_average=round(class_avg, 1),
                benchmark_average=round(school_avg, 1),
                difference_percent=round(difference, 1),
            )
        )

    # Sort by difference (largest gaps first)
    benchmarks.sort(key=lambda x: abs(x.difference_percent), reverse=True)

    return benchmarks


async def get_benchmark_trend(
    class_id: uuid.UUID,
    school_id: uuid.UUID,
    publisher_id: uuid.UUID | None,
    session: AsyncSession,
    periods: int = 8,
    period_type: Literal["weekly", "monthly"] = "weekly",
) -> list[BenchmarkTrendPoint]:
    """
    Calculate benchmark comparison trend over time.

    [Source: Story 5.7 AC: 3]

    Args:
        class_id: Class UUID
        school_id: School UUID
        publisher_id: Publisher UUID (optional)
        session: Database session
        periods: Number of periods to include
        period_type: Type of period ('weekly' or 'monthly')

    Returns:
        List of trend points for chart
    """
    now = datetime.now(UTC)
    trend_points = []

    # Get class students
    class_students_result = await session.execute(
        select(ClassStudent.student_id).where(ClassStudent.class_id == class_id)
    )
    class_student_ids = [row[0] for row in class_students_result.all()]

    if not class_student_ids:
        return []

    for i in range(periods - 1, -1, -1):  # Go from oldest to newest
        if period_type == "weekly":
            period_end = now - timedelta(weeks=i)
            period_start = period_end - timedelta(weeks=1)
            period_label = f"Week {periods - i}"
            period_key = period_end.strftime("%Y-W%W")
        else:  # monthly
            # Calculate month offsets
            month = now.month - i
            year = now.year
            while month <= 0:
                month += 12
                year -= 1
            period_start = datetime(year, month, 1)
            if month == 12:
                period_end = datetime(year + 1, 1, 1)
            else:
                period_end = datetime(year, month + 1, 1)
            period_label = period_start.strftime("%B")
            period_key = period_start.strftime("%Y-%m")

        # Class average for period
        class_avg_query = (
            select(func.avg(AssignmentStudent.score))
            .where(
                AssignmentStudent.student_id.in_(class_student_ids),
                AssignmentStudent.status == AssignmentStatus.completed,
                AssignmentStudent.completed_at >= period_start,
                AssignmentStudent.completed_at < period_end,
                AssignmentStudent.score.isnot(None),
            )
        )
        class_result = await session.execute(class_avg_query)
        class_avg = class_result.scalar()

        if class_avg is None:
            continue  # Skip periods with no data

        # School benchmark for period
        school_avg_query = (
            select(func.avg(AssignmentStudent.score))
            .select_from(AssignmentStudent)
            .join(ClassStudent, ClassStudent.student_id == AssignmentStudent.student_id)
            .join(Class, Class.id == ClassStudent.class_id)
            .where(
                Class.school_id == school_id,
                Class.id != class_id,
                AssignmentStudent.status == AssignmentStatus.completed,
                AssignmentStudent.completed_at >= period_start,
                AssignmentStudent.completed_at < period_end,
                AssignmentStudent.score.isnot(None),
            )
        )
        school_result = await session.execute(school_avg_query)
        school_avg = school_result.scalar()

        # Publisher benchmark for period (if applicable)
        publisher_avg = None
        if publisher_id:
            publisher_avg_query = (
                select(func.avg(AssignmentStudent.score))
                .select_from(AssignmentStudent)
                .join(Assignment, Assignment.id == AssignmentStudent.assignment_id)
                .join(Book, Book.id == Assignment.book_id)
                .join(ClassStudent, ClassStudent.student_id == AssignmentStudent.student_id)
                .join(Class, Class.id == ClassStudent.class_id)
                .where(
                    Book.publisher_id == publisher_id,
                    Class.id != class_id,
                    AssignmentStudent.status == AssignmentStatus.completed,
                    AssignmentStudent.completed_at >= period_start,
                    AssignmentStudent.completed_at < period_end,
                    AssignmentStudent.score.isnot(None),
                )
            )
            publisher_result = await session.execute(publisher_avg_query)
            publisher_avg = publisher_result.scalar()

        trend_points.append(
            BenchmarkTrendPoint(
                period=period_key,
                period_label=period_label,
                class_average=round(float(class_avg), 1),
                school_benchmark=round(float(school_avg), 1) if school_avg else None,
                publisher_benchmark=round(float(publisher_avg), 1) if publisher_avg else None,
            )
        )

    return trend_points


async def get_class_benchmarks(
    class_id: uuid.UUID,
    period: BenchmarkPeriod,
    session: AsyncSession,
) -> ClassBenchmarkResponse:
    """
    Get complete benchmark comparison data for a class.

    [Source: Story 5.7 AC: 2, 3, 5, 7, 10, 11]

    Args:
        class_id: Class UUID
        period: Time period for benchmark calculations
        session: Database session

    Returns:
        Complete ClassBenchmarkResponse

    Raises:
        ValueError: If class not found
    """
    # Get class with relationships
    class_result = await session.execute(
        select(Class)
        .options(selectinload(Class.school).selectinload(School.publisher))
        .where(Class.id == class_id)
    )
    class_obj = class_result.scalar_one_or_none()

    if not class_obj:
        raise ValueError(f"Class not found: {class_id}")

    school = class_obj.school
    publisher = school.publisher if school else None

    # Check if benchmarking is enabled
    school_enabled = school.benchmarking_enabled if school else True
    publisher_enabled = publisher.benchmarking_enabled if publisher else True

    if not school_enabled:
        return ClassBenchmarkResponse(
            class_metrics=ClassMetrics(
                class_id=str(class_id),
                class_name=class_obj.name,
                average_score=0.0,
                completion_rate=0.0,
                total_assignments=0,
                active_students=0,
            ),
            benchmarking_enabled=False,
            disabled_reason="Benchmarking is disabled by your school",
        )

    period_start = get_period_start(period)

    # Get class students
    class_students_result = await session.execute(
        select(ClassStudent.student_id).where(ClassStudent.class_id == class_id)
    )
    class_student_ids = [row[0] for row in class_students_result.all()]

    # Calculate class metrics
    if class_student_ids:
        class_metrics_query = (
            select(
                func.avg(AssignmentStudent.score).label("avg_score"),
                func.count(AssignmentStudent.id).label("total_submissions"),
                func.sum(
                    case(
                        (AssignmentStudent.status == AssignmentStatus.completed, 1),
                        else_=0,
                    )
                ).label("completed_count"),
                func.count(distinct(Assignment.id)).label("total_assignments"),
            )
            .select_from(AssignmentStudent)
            .join(Assignment, Assignment.id == AssignmentStudent.assignment_id)
            .where(
                AssignmentStudent.student_id.in_(class_student_ids),
                AssignmentStudent.completed_at >= period_start,
            )
        )
        result = await session.execute(class_metrics_query)
        row = result.first()

        avg_score = float(row.avg_score) if row and row.avg_score else 0.0
        completion_rate = (
            (row.completed_count / row.total_submissions * 100)
            if row and row.total_submissions > 0
            else 0.0
        )
        total_assignments = row.total_assignments if row else 0
    else:
        avg_score = 0.0
        completion_rate = 0.0
        total_assignments = 0

    class_metrics = ClassMetrics(
        class_id=str(class_id),
        class_name=class_obj.name,
        average_score=round(avg_score, 1),
        completion_rate=round(completion_rate, 1),
        total_assignments=total_assignments,
        active_students=len(class_student_ids),
    )

    # Calculate school benchmark
    school_benchmark = await calculate_school_benchmark(
        school_id=school.id,
        period=period,
        session=session,
        exclude_class_id=class_id,
    )

    # Calculate publisher benchmark (if enabled)
    publisher_benchmark = None
    if publisher and publisher_enabled:
        publisher_benchmark = await calculate_publisher_benchmark(
            publisher_id=publisher.id,
            period=period,
            session=session,
            exclude_class_id=class_id,
        )

    # Calculate activity type benchmarks
    activity_benchmarks = await calculate_activity_type_benchmarks(
        class_id=class_id,
        school_id=school.id,
        period=period,
        session=session,
    )

    # Get trend data
    comparison_over_time = await get_benchmark_trend(
        class_id=class_id,
        school_id=school.id,
        publisher_id=publisher.id if publisher else None,
        session=session,
    )

    # Find weakest activity for message
    weakest_activity = None
    if activity_benchmarks:
        below_benchmark = [a for a in activity_benchmarks if a.difference_percent < 0]
        if below_benchmark:
            weakest = min(below_benchmark, key=lambda x: x.difference_percent)
            weakest_activity = weakest.activity_label

    # Generate message
    benchmark_avg = (
        school_benchmark.average_score
        if school_benchmark and school_benchmark.is_available
        else None
    )
    message = _generate_benchmark_message(avg_score, benchmark_avg, weakest_activity)

    return ClassBenchmarkResponse(
        class_metrics=class_metrics,
        school_benchmark=school_benchmark,
        publisher_benchmark=publisher_benchmark,
        activity_benchmarks=activity_benchmarks,
        comparison_over_time=comparison_over_time,
        message=message,
        benchmarking_enabled=True,
    )


async def get_admin_benchmark_overview(
    session: AsyncSession,
) -> AdminBenchmarkOverview:
    """
    Get system-wide benchmark overview for admin dashboard.

    [Source: Story 5.7 AC: 12]

    Args:
        session: Database session

    Returns:
        AdminBenchmarkOverview with system-wide statistics
    """
    # Get all schools with their settings
    schools_result = await session.execute(
        select(School).options(selectinload(School.classes))
    )
    schools = schools_result.scalars().all()

    total_schools = len(schools)
    schools_with_benchmarking = sum(1 for s in schools if s.benchmarking_enabled)

    # Calculate system-wide average score
    system_avg_query = (
        select(func.avg(AssignmentStudent.score))
        .where(
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.score.isnot(None),
        )
    )
    result = await session.execute(system_avg_query)
    system_average = result.scalar() or 0.0

    # Get activity type statistics
    activity_stats_query = (
        select(
            Activity.activity_type,
            func.avg(AssignmentStudent.score).label("avg_score"),
            func.count(AssignmentStudent.id).label("total_completions"),
        )
        .select_from(AssignmentStudent)
        .join(Assignment, Assignment.id == AssignmentStudent.assignment_id)
        .join(Activity, Activity.id == Assignment.activity_id)
        .where(
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.score.isnot(None),
        )
        .group_by(Activity.activity_type)
    )
    activity_result = await session.execute(activity_stats_query)
    activity_type_stats = [
        ActivityTypeStat(
            activity_type=row.activity_type,
            activity_label=_get_activity_type_label(row.activity_type),
            system_average=round(float(row.avg_score), 1),
            total_completions=row.total_completions,
        )
        for row in activity_result.all()
    ]

    # Calculate school summaries
    school_summaries = []
    schools_above = 0
    schools_at = 0
    schools_below = 0

    for school in schools:
        # Get school's average score
        school_avg_query = (
            select(
                func.avg(AssignmentStudent.score),
                func.count(distinct(Class.id)),
            )
            .select_from(AssignmentStudent)
            .join(ClassStudent, ClassStudent.student_id == AssignmentStudent.student_id)
            .join(Class, Class.id == ClassStudent.class_id)
            .where(
                Class.school_id == school.id,
                AssignmentStudent.status == AssignmentStatus.completed,
                AssignmentStudent.score.isnot(None),
            )
        )
        result = await session.execute(school_avg_query)
        row = result.first()
        school_avg = float(row[0]) if row and row[0] else None
        class_count = row[1] if row else 0

        # Determine performance status
        performance_status = None
        if school_avg is not None and system_average > 0:
            diff = school_avg - float(system_average)
            if diff > 5:
                performance_status = "above_average"
                schools_above += 1
            elif diff < -5:
                performance_status = "below_average"
                schools_below += 1
            else:
                performance_status = "average"
                schools_at += 1

        school_summaries.append(
            SchoolBenchmarkSummary(
                school_id=str(school.id),
                school_name=school.name,
                benchmarking_enabled=school.benchmarking_enabled,
                class_count=class_count,
                average_score=round(school_avg, 1) if school_avg else None,
                performance_status=performance_status,
            )
        )

    return AdminBenchmarkOverview(
        total_schools=total_schools,
        schools_with_benchmarking=schools_with_benchmarking,
        schools_above_average=schools_above,
        schools_at_average=schools_at,
        schools_below_average=schools_below,
        system_average_score=round(float(system_average), 1),
        activity_type_stats=activity_type_stats,
        school_summaries=school_summaries,
        last_calculated=datetime.now(UTC),
    )
