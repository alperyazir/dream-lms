"""Analytics service for student performance calculations - Stories 5.1, 5.2, 5.3, 5.4."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    Activity,
    Assignment,
    AssignmentStatus,
    AssignmentStudent,
    Class,
    ClassStudent,
    DismissedInsight,
    Feedback,
    Student,
    User,
)
from app.schemas.analytics import (
    Achievement,
    ActivityBreakdownItem,
    ActivityTypeAnalysis,
    ActivityTypePerformanceItem,
    ActivityTypeScore,
    AffectedStudent,
    AnalyticsSummary,
    AnswerDistributionItem,
    AssignmentDetailedResultsResponse,
    AssignmentPerformanceItem,
    ClassAnalyticsResponse,
    ClassAnalyticsSummary,
    ClassPeriodType,
    CompletionOverview,
    ImprovementTrend,
    InsightCard,
    InsightDetail,
    InsightSeverity,
    InsightType,
    MostMissedQuestion,
    PerformanceTrendPoint,
    PeriodType,
    ProgressRecentAssignment,
    QuestionAnalysis,
    RecentActivityItem,
    RelatedAssignment,
    RelatedQuestion,
    ScoreDistributionBucket,
    ScoreStatistics,
    ScoreTrendPoint,
    StatusSummary,
    StrugglingStudentItem,
    StudentAnalyticsResponse,
    StudentAnswersResponse,
    StudentInfo,
    StudentLeaderboardItem,
    StudentProgressPeriod,
    StudentProgressResponse,
    StudentProgressStats,
    StudentResultItem,
    StudyTimeStats,
    TeacherInsightsResponse,
    TimeAnalytics,
    TrendData,
    WordMatchingError,
    WordSearchAnalysis,
)
from app.services.book_service_v2 import get_book_service


def get_period_start_date(period: PeriodType) -> datetime | None:
    """
    Calculate start date for analytics period.

    Args:
        period: Time period ('7d', '30d', '3m', 'all')

    Returns:
        Start datetime or None for 'all'
    """
    if period == "all":
        return None

    now = datetime.now(UTC)
    period_days = {
        "7d": 7,
        "30d": 30,
        "3m": 90,
    }

    days = period_days.get(period, 30)
    return now - timedelta(days=days)


async def calculate_streak(student_id: uuid.UUID, session: AsyncSession) -> int:
    """
    Calculate consecutive days with completed work.

    Args:
        student_id: Student UUID
        session: Database session

    Returns:
        Number of consecutive days with completed assignments
    """
    # Get completed assignments ordered by completion date descending
    result = await session.execute(
        select(AssignmentStudent.completed_at)
        .where(
            AssignmentStudent.student_id == student_id,
            AssignmentStudent.status == AssignmentStatus.completed,
        )
        .order_by(AssignmentStudent.completed_at.desc())
    )

    completed_dates = [row.completed_at for row in result.all()]
    if not completed_dates:
        return 0

    # Extract unique dates (ignore time)
    dates = list({d.date() for d in completed_dates})
    dates.sort(reverse=True)

    # Count consecutive days from today backwards
    streak = 0
    today = datetime.now(UTC).date()

    for d in dates:
        # Check if date is today or the next consecutive day
        if d == today or d == today - timedelta(days=streak + 1):
            streak += 1
            today = d
        else:
            break

    return streak


async def get_student_analytics(
    student_id: uuid.UUID, period: PeriodType, session: AsyncSession
) -> StudentAnalyticsResponse:
    """
    Calculate comprehensive student analytics.

    Args:
        student_id: Student UUID
        period: Time period for filtering ('7d', '30d', '3m', 'all')
        session: Database session

    Returns:
        Complete analytics data

    Raises:
        ValueError: If student not found
    """
    # Get student and user info
    student_result = await session.execute(
        select(Student, User)
        .join(User, Student.user_id == User.id)
        .where(Student.id == student_id)
    )
    student_row = student_result.one_or_none()

    if not student_row:
        raise ValueError(f"Student not found: {student_id}")

    student, user = student_row

    # Get period start date
    period_start = get_period_start_date(period)

    # Build base query for completed assignments
    completed_query = (
        select(AssignmentStudent, Assignment, Activity)
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .join(Activity, Assignment.activity_id == Activity.id)
        .where(
            AssignmentStudent.student_id == student_id,
            AssignmentStudent.status == AssignmentStatus.completed,
        )
    )

    if period_start:
        completed_query = completed_query.where(
            AssignmentStudent.completed_at >= period_start
        )

    completed_result = await session.execute(completed_query)
    completed_assignments = completed_result.all()

    # Calculate summary metrics
    total_completed = len(completed_assignments)
    avg_score = (
        sum(asgn.score for asgn, _, _ in completed_assignments if asgn.score) /
        total_completed
        if total_completed > 0
        else 0.0
    )

    # Get total assigned for completion rate
    total_assigned_result = await session.execute(
        select(func.count(AssignmentStudent.id)).where(
            AssignmentStudent.student_id == student_id
        )
    )
    total_assigned = total_assigned_result.scalar_one()
    completion_rate = total_completed / total_assigned if total_assigned > 0 else 0.0

    # Calculate streak
    current_streak = await calculate_streak(student_id, session)

    summary = AnalyticsSummary(
        avg_score=round(avg_score, 1),
        total_completed=total_completed,
        completion_rate=round(completion_rate, 2),
        current_streak=current_streak,
    )

    # Recent activity (last 10 completed)
    recent_activity = [
        RecentActivityItem(
            assignment_id=str(assignment.id),
            assignment_name=assignment.name,
            score=asgn.score or 0,
            completed_at=asgn.completed_at,
            time_spent_minutes=asgn.time_spent_minutes or 0,
        )
        for asgn, assignment, _ in sorted(
            completed_assignments,
            key=lambda x: x[0].completed_at,
            reverse=True
        )[:10]
    ]

    # Performance trend (group by date)
    trend_data: dict[str, list[int]] = {}
    for asgn, _, _ in completed_assignments:
        if asgn.completed_at and asgn.score is not None:
            date_str = asgn.completed_at.date().isoformat()
            if date_str not in trend_data:
                trend_data[date_str] = []
            trend_data[date_str].append(asgn.score)

    performance_trend = [
        PerformanceTrendPoint(
            date=date_str,
            score=int(sum(scores) / len(scores)),  # Average for that day
        )
        for date_str, scores in sorted(trend_data.items())
    ]

    # Activity type breakdown
    activity_breakdown_data: dict[str, tuple[list[int], int]] = {}
    for asgn, _, activity in completed_assignments:
        if asgn.score is not None:
            if activity.activity_type not in activity_breakdown_data:
                activity_breakdown_data[activity.activity_type] = ([], 0)
            scores, count = activity_breakdown_data[activity.activity_type]
            scores.append(asgn.score)
            activity_breakdown_data[activity.activity_type] = (scores, count + 1)

    activity_breakdown = [
        ActivityBreakdownItem(
            activity_type=act_type,
            avg_score=round(sum(scores) / len(scores), 1),
            count=count,
        )
        for act_type, (scores, count) in activity_breakdown_data.items()
    ]

    # Status summary (all assignments, not just in period)
    status_counts_result = await session.execute(
        select(
            AssignmentStudent.status,
            func.count(AssignmentStudent.id),
        )
        .where(AssignmentStudent.student_id == student_id)
        .group_by(AssignmentStudent.status)
    )
    status_counts = {row[0]: row[1] for row in status_counts_result.all()}

    # Calculate past due (assignments past due_date and not completed)
    # Use replace(tzinfo=None) for SQLite compatibility (stores datetimes as naive)
    past_due_result = await session.execute(
        select(func.count(AssignmentStudent.id))
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .where(
            AssignmentStudent.student_id == student_id,
            AssignmentStudent.status != AssignmentStatus.completed,
            Assignment.due_date < datetime.now(UTC).replace(tzinfo=None),
        )
    )
    past_due_count = past_due_result.scalar_one()

    status_summary = StatusSummary(
        not_started=status_counts.get(AssignmentStatus.not_started, 0),
        in_progress=status_counts.get(AssignmentStatus.in_progress, 0),
        completed=status_counts.get(AssignmentStatus.completed, 0),
        past_due=past_due_count,
    )

    # Time analytics
    total_time = sum(
        asgn.time_spent_minutes for asgn, _, _ in completed_assignments
        if asgn.time_spent_minutes
    )
    avg_time_per_assignment = (
        total_time / total_completed if total_completed > 0 else 0.0
    )

    # Calculate weekly/monthly totals
    # Use naive datetimes for comparison with database results (SQLite compatibility)
    now = datetime.now(UTC).replace(tzinfo=None)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)

    total_time_this_week = sum(
        asgn.time_spent_minutes
        for asgn, _, _ in completed_assignments
        if asgn.completed_at and asgn.completed_at >= week_start and asgn.time_spent_minutes
    )

    total_time_this_month = sum(
        asgn.time_spent_minutes
        for asgn, _, _ in completed_assignments
        if asgn.completed_at and asgn.completed_at >= month_start and asgn.time_spent_minutes
    )

    time_analytics = TimeAnalytics(
        avg_time_per_assignment=round(avg_time_per_assignment, 1),
        total_time_this_week=total_time_this_week,
        total_time_this_month=total_time_this_month,
    )

    # Build response
    return StudentAnalyticsResponse(
        student=StudentInfo(
            id=str(student.id),
            name=user.full_name or user.email,
            photo_url=None,  # TODO: Add profile photo support
        ),
        summary=summary,
        recent_activity=recent_activity,
        performance_trend=performance_trend,
        activity_breakdown=activity_breakdown,
        status_summary=status_summary,
        time_analytics=time_analytics,
    )


def get_class_period_dates(period: ClassPeriodType) -> tuple[datetime, datetime]:
    """
    Calculate start date for current and previous period.

    Args:
        period: Class analytics period ('weekly', 'monthly', 'semester', 'ytd')

    Returns:
        Tuple of (current_period_start, previous_period_start)
    """
    now = datetime.now(UTC)

    period_days = {
        "weekly": 7,
        "monthly": 30,
        "semester": 90,
    }

    if period == "ytd":
        # Year to date - from January 1st
        current_start = datetime(now.year, 1, 1, tzinfo=UTC)
        previous_start = datetime(now.year - 1, 1, 1, tzinfo=UTC)
    else:
        days = period_days.get(period, 30)
        current_start = now - timedelta(days=days)
        previous_start = now - timedelta(days=days * 2)

    return current_start, previous_start


async def get_class_analytics(
    class_id: uuid.UUID, period: ClassPeriodType, session: AsyncSession
) -> ClassAnalyticsResponse:
    """
    Calculate comprehensive class analytics.

    Args:
        class_id: Class UUID
        period: Time period for filtering ('weekly', 'monthly', 'semester', 'ytd')
        session: Database session

    Returns:
        Complete class analytics data

    Raises:
        ValueError: If class not found
    """
    # Get class info
    class_result = await session.execute(select(Class).where(Class.id == class_id))
    class_obj = class_result.scalar_one_or_none()

    if not class_obj:
        raise ValueError(f"Class not found: {class_id}")

    # Get period dates
    current_period_start, previous_period_start = get_class_period_dates(period)
    # Use naive datetime for SQLite compatibility
    current_start_naive = current_period_start.replace(tzinfo=None)
    previous_start_naive = previous_period_start.replace(tzinfo=None)
    now_naive = datetime.now(UTC).replace(tzinfo=None)

    # Get all students enrolled in this class
    enrolled_result = await session.execute(
        select(ClassStudent.student_id).where(ClassStudent.class_id == class_id)
    )
    enrolled_student_ids = [row[0] for row in enrolled_result.all()]

    if not enrolled_student_ids:
        # Return empty analytics for class with no students
        return ClassAnalyticsResponse(
            class_id=str(class_id),
            class_name=class_obj.name,
            summary=ClassAnalyticsSummary(
                avg_score=0.0,
                completion_rate=0.0,
                total_assignments=0,
                active_students=0,
            ),
            score_distribution=[
                ScoreDistributionBucket(range_label="0-59%", min_score=0, max_score=59, count=0),
                ScoreDistributionBucket(range_label="60-69%", min_score=60, max_score=69, count=0),
                ScoreDistributionBucket(range_label="70-79%", min_score=70, max_score=79, count=0),
                ScoreDistributionBucket(range_label="80-89%", min_score=80, max_score=89, count=0),
                ScoreDistributionBucket(range_label="90-100%", min_score=90, max_score=100, count=0),
            ],
            leaderboard=[],
            struggling_students=[],
            assignment_performance=[],
            activity_type_performance=[],
            trends=[],
        )

    # Get all assignment submissions for students in this class
    submissions_query = (
        select(AssignmentStudent, Assignment, Activity, Student, User)
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .join(Activity, Assignment.activity_id == Activity.id)
        .join(Student, AssignmentStudent.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .where(AssignmentStudent.student_id.in_(enrolled_student_ids))
    )
    submissions_result = await session.execute(submissions_query)
    all_submissions = submissions_result.all()

    # Filter for current period
    current_period_submissions = [
        (asgn_student, assignment, activity, student, user)
        for asgn_student, assignment, activity, student, user in all_submissions
        if asgn_student.completed_at and asgn_student.completed_at >= current_start_naive
    ]

    # Filter for previous period
    previous_period_submissions = [
        (asgn_student, assignment, activity, student, user)
        for asgn_student, assignment, activity, student, user in all_submissions
        if asgn_student.completed_at
        and asgn_student.completed_at >= previous_start_naive
        and asgn_student.completed_at < current_start_naive
    ]

    # Calculate summary metrics
    total_submissions = len(all_submissions)
    completed_submissions = [
        s for s in all_submissions if s[0].status == AssignmentStatus.completed
    ]
    total_completed = len(completed_submissions)

    # Get unique assignments in this class's scope
    unique_assignments = {s[1].id for s in all_submissions}
    total_assignments = len(unique_assignments)

    # Active students (students with at least one submission in current period)
    active_students = len({s[3].id for s in current_period_submissions})

    # Calculate average score from completed submissions
    scores = [s[0].score for s in completed_submissions if s[0].score is not None]
    avg_score = sum(scores) / len(scores) if scores else 0.0

    # Completion rate
    completion_rate = total_completed / total_submissions if total_submissions > 0 else 0.0

    summary = ClassAnalyticsSummary(
        avg_score=round(avg_score, 1),
        completion_rate=round(completion_rate, 2),
        total_assignments=total_assignments,
        active_students=active_students,
    )

    # Score distribution histogram (based on student averages)
    student_scores: dict[uuid.UUID, list[float]] = {}
    for asgn_student, _, _, student, _ in completed_submissions:
        if asgn_student.score is not None:
            if student.id not in student_scores:
                student_scores[student.id] = []
            student_scores[student.id].append(asgn_student.score)

    student_averages = [
        sum(scores) / len(scores) for scores in student_scores.values()
    ]

    # Count students in each bucket
    buckets = [
        (0, 59, "0-59%"),
        (60, 69, "60-69%"),
        (70, 79, "70-79%"),
        (80, 89, "80-89%"),
        (90, 100, "90-100%"),
    ]
    score_distribution = []
    for min_score, max_score, label in buckets:
        count = sum(1 for avg in student_averages if min_score <= avg <= max_score)
        score_distribution.append(
            ScoreDistributionBucket(
                range_label=label, min_score=min_score, max_score=max_score, count=count
            )
        )

    # Leaderboard (top 10 students by avg score)
    student_data: dict[uuid.UUID, tuple[str, list[float]]] = {}
    for asgn_student, _, _, student, user in completed_submissions:
        if asgn_student.score is not None:
            if student.id not in student_data:
                student_data[student.id] = (user.full_name or user.email, [])
            student_data[student.id][1].append(asgn_student.score)

    ranked_students = [
        (student_id, name, sum(scores) / len(scores))
        for student_id, (name, scores) in student_data.items()
    ]
    ranked_students.sort(key=lambda x: x[2], reverse=True)

    leaderboard = [
        StudentLeaderboardItem(
            student_id=str(student_id),
            name=name,
            avg_score=round(avg, 1),
            rank=idx + 1,
        )
        for idx, (student_id, name, avg) in enumerate(ranked_students[:10])
    ]

    # Struggling students (avg < 70% OR past_due > 2)
    struggling_students = []

    # Calculate past due count per student
    student_past_due: dict[uuid.UUID, int] = {}
    for asgn_student, assignment, _, student, _ in all_submissions:
        if (
            asgn_student.status != AssignmentStatus.completed
            and assignment.due_date
            and assignment.due_date < now_naive
        ):
            student_past_due[student.id] = student_past_due.get(student.id, 0) + 1

    for student_id, (name, scores) in student_data.items():
        avg = sum(scores) / len(scores) if scores else 0.0
        past_due = student_past_due.get(student_id, 0)

        alert_reasons = []
        if avg < 70:
            alert_reasons.append("Low average score")
        if past_due >= 2:
            alert_reasons.append("Multiple past due assignments")

        if alert_reasons:
            struggling_students.append(
                StrugglingStudentItem(
                    student_id=str(student_id),
                    name=name,
                    avg_score=round(avg, 1),
                    past_due_count=past_due,
                    alert_reason=", ".join(alert_reasons),
                )
            )

    # Assignment performance
    assignment_data: dict[uuid.UUID, tuple[str, list[float], int, list[int]]] = {}
    for asgn_student, assignment, _, _, _ in all_submissions:
        if assignment.id not in assignment_data:
            assignment_data[assignment.id] = (assignment.name, [], 0, [])

        name, scores, total, times = assignment_data[assignment.id]
        total += 1
        if asgn_student.status == AssignmentStatus.completed:
            if asgn_student.score is not None:
                scores.append(asgn_student.score)
            if asgn_student.time_spent_minutes:
                times.append(asgn_student.time_spent_minutes)
        assignment_data[assignment.id] = (name, scores, total, times)

    assignment_performance = [
        AssignmentPerformanceItem(
            assignment_id=str(aid),
            name=name,
            avg_score=round(sum(scores) / len(scores), 1) if scores else 0.0,
            completion_rate=round(len(scores) / total, 2) if total > 0 else 0.0,
            avg_time_spent=round(sum(times) / len(times), 1) if times else 0.0,
        )
        for aid, (name, scores, total, times) in assignment_data.items()
    ]

    # Activity type performance
    activity_type_data: dict[str, list[float]] = {}
    for asgn_student, _, activity, _, _ in completed_submissions:
        if asgn_student.score is not None:
            if activity.activity_type not in activity_type_data:
                activity_type_data[activity.activity_type] = []
            activity_type_data[activity.activity_type].append(asgn_student.score)

    activity_type_performance = [
        ActivityTypePerformanceItem(
            activity_type=act_type,
            avg_score=round(sum(scores) / len(scores), 1),
            count=len(scores),
        )
        for act_type, scores in activity_type_data.items()
    ]

    # Trend analysis
    trends = []

    # Average score trend
    current_scores = [
        s[0].score for s in current_period_submissions if s[0].score is not None
    ]
    previous_scores = [
        s[0].score for s in previous_period_submissions if s[0].score is not None
    ]

    current_avg = sum(current_scores) / len(current_scores) if current_scores else 0.0
    previous_avg = sum(previous_scores) / len(previous_scores) if previous_scores else 0.0

    if previous_avg > 0:
        change_pct = ((current_avg - previous_avg) / previous_avg) * 100
    else:
        change_pct = 0.0

    trend_direction: str = "stable"
    if change_pct > 2:
        trend_direction = "up"
    elif change_pct < -2:
        trend_direction = "down"

    trends.append(
        TrendData(
            metric_name="Average Score",
            current_value=round(current_avg, 1),
            previous_value=round(previous_avg, 1),
            change_percent=round(change_pct, 1),
            trend=trend_direction,  # type: ignore
        )
    )

    # Completion rate trend
    current_completed = len(current_period_submissions)
    previous_completed = len(previous_period_submissions)

    if previous_completed > 0:
        completion_change = ((current_completed - previous_completed) / previous_completed) * 100
    else:
        completion_change = 0.0

    completion_trend: str = "stable"
    if completion_change > 5:
        completion_trend = "up"
    elif completion_change < -5:
        completion_trend = "down"

    trends.append(
        TrendData(
            metric_name="Completions",
            current_value=float(current_completed),
            previous_value=float(previous_completed),
            change_percent=round(completion_change, 1),
            trend=completion_trend,  # type: ignore
        )
    )

    return ClassAnalyticsResponse(
        class_id=str(class_id),
        class_name=class_obj.name,
        summary=summary,
        score_distribution=score_distribution,
        leaderboard=leaderboard,
        struggling_students=struggling_students,
        assignment_performance=assignment_performance,
        activity_type_performance=activity_type_performance,
        trends=trends,
    )


# --- Assignment Detailed Results (Story 5.3) ---


async def get_assignment_detailed_results(
    assignment_id: uuid.UUID, teacher_id: uuid.UUID, session: AsyncSession
) -> AssignmentDetailedResultsResponse:
    """
    Calculate detailed results for a specific assignment.

    Args:
        assignment_id: Assignment UUID
        teacher_id: Teacher UUID (for authorization)
        session: Database session

    Returns:
        Complete assignment analytics data

    Raises:
        ValueError: If assignment not found or teacher doesn't own it
    """
    # Get assignment and verify ownership
    assignment_result = await session.execute(
        select(Assignment, Activity)
        .join(Activity, Assignment.activity_id == Activity.id)
        .where(Assignment.id == assignment_id)
    )
    assignment_row = assignment_result.one_or_none()

    if not assignment_row:
        raise ValueError(f"Assignment not found: {assignment_id}")

    assignment, activity = assignment_row

    if assignment.teacher_id != teacher_id:
        raise ValueError(f"Assignment not found: {assignment_id}")

    # Get all student submissions for this assignment
    submissions_result = await session.execute(
        select(AssignmentStudent, Student, User)
        .join(Student, AssignmentStudent.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .where(AssignmentStudent.assignment_id == assignment_id)
    )
    submissions = submissions_result.all()

    # Calculate completion overview
    now_naive = datetime.now(UTC).replace(tzinfo=None)
    completed_count = 0
    in_progress_count = 0
    not_started_count = 0
    past_due_count = 0

    for asgn_student, _, _ in submissions:
        if asgn_student.status == AssignmentStatus.completed:
            completed_count += 1
        elif asgn_student.status == AssignmentStatus.in_progress:
            in_progress_count += 1
            if assignment.due_date and assignment.due_date < now_naive:
                past_due_count += 1
        else:
            not_started_count += 1
            if assignment.due_date and assignment.due_date < now_naive:
                past_due_count += 1

    completion_overview = CompletionOverview(
        completed=completed_count,
        in_progress=in_progress_count,
        not_started=not_started_count,
        past_due=past_due_count,
        total=len(submissions),
    )

    # Calculate score statistics (only from completed submissions)
    scores = [
        asgn_student.score
        for asgn_student, _, _ in submissions
        if asgn_student.status == AssignmentStatus.completed and asgn_student.score is not None
    ]

    score_statistics = None
    if scores:
        sorted_scores = sorted(scores)
        n = len(sorted_scores)
        if n % 2 == 0:
            median = (sorted_scores[n // 2 - 1] + sorted_scores[n // 2]) / 2
        else:
            median = sorted_scores[n // 2]

        score_statistics = ScoreStatistics(
            avg_score=round(sum(scores) / len(scores), 1),
            median_score=round(median, 1),
            highest_score=max(scores),
            lowest_score=min(scores),
        )

    # Get feedback status for all assignment students
    assignment_student_ids = [asgn_student.id for asgn_student, _, _ in submissions]
    feedback_query = select(Feedback.assignment_student_id).where(
        Feedback.assignment_student_id.in_(assignment_student_ids)
    )
    feedback_result = await session.execute(feedback_query)
    feedback_assignment_student_ids = {row[0] for row in feedback_result.all()}

    # Build student results list
    student_results = [
        StudentResultItem(
            student_id=str(student.id),
            name=user.full_name or user.email,
            status=asgn_student.status.value,
            score=asgn_student.score,
            time_spent_minutes=asgn_student.time_spent_minutes or 0,
            completed_at=asgn_student.completed_at,
            has_feedback=asgn_student.id in feedback_assignment_student_ids,
        )
        for asgn_student, student, user in submissions
    ]

    # Calculate question-level analysis
    question_analysis = await _analyze_activity_answers(
        activity.activity_type,
        activity.config_json,
        [asgn_student for asgn_student, _, _ in submissions if asgn_student.answers_json],
    )

    return AssignmentDetailedResultsResponse(
        assignment_id=str(assignment_id),
        assignment_name=assignment.name,
        activity_type=activity.activity_type,
        due_date=assignment.due_date,
        completion_overview=completion_overview,
        score_statistics=score_statistics,
        student_results=student_results,
        question_analysis=question_analysis,
    )


async def get_student_assignment_answers(
    assignment_id: uuid.UUID,
    student_id: uuid.UUID,
    teacher_id: uuid.UUID,
    session: AsyncSession,
) -> StudentAnswersResponse:
    """
    Get individual student's answers for an assignment.

    Args:
        assignment_id: Assignment UUID
        student_id: Student UUID
        teacher_id: Teacher UUID (for authorization)
        session: Database session

    Returns:
        Student's full answers

    Raises:
        ValueError: If not found or unauthorized
    """
    # Verify teacher owns assignment
    assignment_result = await session.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = assignment_result.scalar_one_or_none()

    if not assignment or assignment.teacher_id != teacher_id:
        raise ValueError(f"Assignment not found: {assignment_id}")

    # Get student's submission
    submission_result = await session.execute(
        select(AssignmentStudent, Student, User)
        .join(Student, AssignmentStudent.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.student_id == student_id,
        )
    )
    submission_row = submission_result.one_or_none()

    if not submission_row:
        raise ValueError(f"Student submission not found: {student_id}")

    asgn_student, student, user = submission_row

    return StudentAnswersResponse(
        student_id=str(student.id),
        name=user.full_name or user.email,
        status=asgn_student.status.value,
        score=asgn_student.score,
        time_spent_minutes=asgn_student.time_spent_minutes or 0,
        started_at=asgn_student.started_at,
        completed_at=asgn_student.completed_at,
        answers_json=asgn_student.answers_json,
    )


async def _analyze_activity_answers(
    activity_type: str,
    config_json: dict,
    submissions: list[AssignmentStudent],
) -> ActivityTypeAnalysis | None:
    """
    Analyze answers based on activity type.

    Args:
        activity_type: Activity type string
        config_json: Activity configuration
        submissions: List of submissions with answers

    Returns:
        Activity-type specific analysis or None if no submissions
    """
    if not submissions:
        return None

    # Route to appropriate analyzer based on activity type
    if activity_type in ("dragdroppicture", "circle", "markwithx"):
        return _analyze_zone_based_activity(activity_type, config_json, submissions)
    elif activity_type == "dragdroppicturegroup":
        return _analyze_category_activity(activity_type, config_json, submissions)
    elif activity_type == "matchTheWords":
        return _analyze_word_matching_activity(activity_type, config_json, submissions)
    elif activity_type == "puzzleFindWords":
        return _analyze_word_search_activity(activity_type, config_json, submissions)
    else:
        # Unknown activity type - return basic analysis
        return ActivityTypeAnalysis(activity_type=activity_type)


def _analyze_zone_based_activity(
    activity_type: str,
    config_json: dict,
    submissions: list[AssignmentStudent],
) -> ActivityTypeAnalysis:
    """
    Analyze zone-based activities (dragdroppicture, circle, markwithx).
    Answers format: { "x-y": "word", ... }
    """
    # Get correct answers from config
    correct_answers = {}
    if "answer" in config_json:
        for answer in config_json["answer"]:
            if "coords" in answer and "word" in answer:
                zone_id = f"{answer['coords']['x']}-{answer['coords']['y']}"
                correct_answers[zone_id] = answer["word"]

    if not correct_answers:
        return ActivityTypeAnalysis(activity_type=activity_type)

    # Aggregate answers across all submissions
    zone_stats: dict[str, dict[str, int]] = {}
    total_responses_per_zone: dict[str, int] = {}

    for submission in submissions:
        if not submission.answers_json:
            continue

        answers = submission.answers_json
        for zone_id, answer in answers.items():
            if zone_id not in zone_stats:
                zone_stats[zone_id] = {}
                total_responses_per_zone[zone_id] = 0

            total_responses_per_zone[zone_id] += 1
            answer_str = str(answer) if answer else "(empty)"
            zone_stats[zone_id][answer_str] = zone_stats[zone_id].get(answer_str, 0) + 1

    # Build question analysis
    questions = []
    for zone_id, correct_word in correct_answers.items():
        if zone_id not in zone_stats:
            continue

        total = total_responses_per_zone[zone_id]
        correct_count = zone_stats[zone_id].get(correct_word, 0)
        correct_percentage = (correct_count / total * 100) if total > 0 else 0.0

        # Build answer distribution
        distribution = []
        for answer, count in sorted(zone_stats[zone_id].items(), key=lambda x: -x[1]):
            distribution.append(
                AnswerDistributionItem(
                    option=answer,
                    count=count,
                    percentage=round(count / total * 100, 1) if total > 0 else 0.0,
                    is_correct=(answer == correct_word),
                )
            )

        questions.append(
            QuestionAnalysis(
                question_id=zone_id,
                question_text=f"Zone {zone_id} → {correct_word}",
                correct_percentage=round(correct_percentage, 1),
                total_responses=total,
                answer_distribution=distribution,
            )
        )

    # Identify most missed questions (lowest correct %)
    sorted_questions = sorted(questions, key=lambda q: q.correct_percentage)
    most_missed = []
    for q in sorted_questions[:3]:
        # Find most common wrong answer
        wrong_answers = [d for d in q.answer_distribution if not d.is_correct]
        common_wrong = wrong_answers[0].option if wrong_answers else None

        most_missed.append(
            MostMissedQuestion(
                question_id=q.question_id,
                question_text=q.question_text,
                correct_percentage=q.correct_percentage,
                common_wrong_answer=common_wrong,
            )
        )

    return ActivityTypeAnalysis(
        activity_type=activity_type,
        questions=questions,
        most_missed=most_missed,
    )


def _analyze_category_activity(
    activity_type: str,
    config_json: dict,
    submissions: list[AssignmentStudent],
) -> ActivityTypeAnalysis:
    """
    Analyze category-based activities (dragdroppicturegroup).
    Answers format: { "word": "category", ... }
    """
    # Get correct answers from config
    correct_mappings = {}
    if "categories" in config_json:
        for category in config_json["categories"]:
            category_name = category.get("name", "Unknown")
            for word in category.get("words", []):
                correct_mappings[word] = category_name

    if not correct_mappings:
        return ActivityTypeAnalysis(activity_type=activity_type)

    # Aggregate answers
    word_stats: dict[str, dict[str, int]] = {}
    total_responses: dict[str, int] = {}

    for submission in submissions:
        if not submission.answers_json:
            continue

        for word, chosen_category in submission.answers_json.items():
            if word not in word_stats:
                word_stats[word] = {}
                total_responses[word] = 0

            total_responses[word] += 1
            cat_str = str(chosen_category) if chosen_category else "(unplaced)"
            word_stats[word][cat_str] = word_stats[word].get(cat_str, 0) + 1

    # Build question analysis
    questions = []
    for word, correct_category in correct_mappings.items():
        if word not in word_stats:
            continue

        total = total_responses[word]
        correct_count = word_stats[word].get(correct_category, 0)
        correct_percentage = (correct_count / total * 100) if total > 0 else 0.0

        distribution = []
        for category, count in sorted(word_stats[word].items(), key=lambda x: -x[1]):
            distribution.append(
                AnswerDistributionItem(
                    option=category,
                    count=count,
                    percentage=round(count / total * 100, 1) if total > 0 else 0.0,
                    is_correct=(category == correct_category),
                )
            )

        questions.append(
            QuestionAnalysis(
                question_id=word,
                question_text=f"{word} → {correct_category}",
                correct_percentage=round(correct_percentage, 1),
                total_responses=total,
                answer_distribution=distribution,
            )
        )

    # Most missed
    sorted_questions = sorted(questions, key=lambda q: q.correct_percentage)
    most_missed = []
    for q in sorted_questions[:3]:
        wrong_answers = [d for d in q.answer_distribution if not d.is_correct]
        common_wrong = wrong_answers[0].option if wrong_answers else None

        most_missed.append(
            MostMissedQuestion(
                question_id=q.question_id,
                question_text=q.question_text,
                correct_percentage=q.correct_percentage,
                common_wrong_answer=common_wrong,
            )
        )

    return ActivityTypeAnalysis(
        activity_type=activity_type,
        questions=questions,
        most_missed=most_missed,
    )


def _analyze_word_matching_activity(
    activity_type: str,
    config_json: dict,
    submissions: list[AssignmentStudent],
) -> ActivityTypeAnalysis:
    """
    Analyze word matching activities (matchTheWords).
    Answers format: { "word": "matchedWord", ... }
    """
    # Get correct pairs from config
    correct_pairs = {}
    if "pairs" in config_json:
        for pair in config_json["pairs"]:
            if "left" in pair and "right" in pair:
                correct_pairs[pair["left"]] = pair["right"]

    if not correct_pairs:
        return ActivityTypeAnalysis(activity_type=activity_type)

    # Aggregate answers
    word_stats: dict[str, dict[str, int]] = {}
    total_responses: dict[str, int] = {}

    for submission in submissions:
        if not submission.answers_json:
            continue

        for word, matched in submission.answers_json.items():
            if word not in word_stats:
                word_stats[word] = {}
                total_responses[word] = 0

            total_responses[word] += 1
            matched_str = str(matched) if matched else "(unmatched)"
            word_stats[word][matched_str] = word_stats[word].get(matched_str, 0) + 1

    # Build question analysis and word matching errors
    questions = []
    word_matching_errors = []

    for word, correct_match in correct_pairs.items():
        if word not in word_stats:
            continue

        total = total_responses[word]
        correct_count = word_stats[word].get(correct_match, 0)
        correct_percentage = (correct_count / total * 100) if total > 0 else 0.0

        distribution = []
        for match, count in sorted(word_stats[word].items(), key=lambda x: -x[1]):
            distribution.append(
                AnswerDistributionItem(
                    option=match,
                    count=count,
                    percentage=round(count / total * 100, 1) if total > 0 else 0.0,
                    is_correct=(match == correct_match),
                )
            )

        questions.append(
            QuestionAnalysis(
                question_id=word,
                question_text=f"{word} ↔ {correct_match}",
                correct_percentage=round(correct_percentage, 1),
                total_responses=total,
                answer_distribution=distribution,
            )
        )

        # Track errors
        wrong_answers = [d for d in distribution if not d.is_correct and d.count > 0]
        if wrong_answers:
            word_matching_errors.append(
                WordMatchingError(
                    word=word,
                    correct_match=correct_match,
                    common_incorrect_match=wrong_answers[0].option,
                    error_count=wrong_answers[0].count,
                )
            )

    # Sort errors by count
    word_matching_errors.sort(key=lambda e: -e.error_count)

    # Most missed
    sorted_questions = sorted(questions, key=lambda q: q.correct_percentage)
    most_missed = []
    for q in sorted_questions[:3]:
        wrong_answers = [d for d in q.answer_distribution if not d.is_correct]
        common_wrong = wrong_answers[0].option if wrong_answers else None

        most_missed.append(
            MostMissedQuestion(
                question_id=q.question_id,
                question_text=q.question_text,
                correct_percentage=q.correct_percentage,
                common_wrong_answer=common_wrong,
            )
        )

    return ActivityTypeAnalysis(
        activity_type=activity_type,
        questions=questions,
        most_missed=most_missed,
        word_matching_errors=word_matching_errors[:5],  # Top 5 errors
    )


def _analyze_word_search_activity(
    activity_type: str,
    config_json: dict,
    submissions: list[AssignmentStudent],
) -> ActivityTypeAnalysis:
    """
    Analyze word search activities (puzzleFindWords).
    Answers format: { "words": ["word1", "word2", ...] }
    """
    # Get target words from config
    target_words = set()
    if "words" in config_json:
        target_words = set(config_json["words"])

    if not target_words:
        return ActivityTypeAnalysis(activity_type=activity_type)

    # Count how many times each word was found
    word_found_count: dict[str, int] = {word: 0 for word in target_words}
    total_attempts = len(submissions)

    for submission in submissions:
        if not submission.answers_json:
            continue

        found_words = submission.answers_json.get("words", [])
        if isinstance(found_words, list):
            for word in found_words:
                if word in word_found_count:
                    word_found_count[word] += 1

    # Build word search analysis
    word_search = []
    for word in target_words:
        found_count = word_found_count.get(word, 0)
        find_rate = (found_count / total_attempts * 100) if total_attempts > 0 else 0.0

        word_search.append(
            WordSearchAnalysis(
                word=word,
                find_rate=round(find_rate, 1),
                found_count=found_count,
                total_attempts=total_attempts,
            )
        )

    # Sort by find rate (lowest first - most difficult)
    word_search.sort(key=lambda w: w.find_rate)

    # Create most missed from words with lowest find rate
    most_missed = [
        MostMissedQuestion(
            question_id=ws.word,
            question_text=f"Find: {ws.word}",
            correct_percentage=ws.find_rate,
            common_wrong_answer=None,
        )
        for ws in word_search[:3]
    ]

    return ActivityTypeAnalysis(
        activity_type=activity_type,
        most_missed=most_missed,
        word_search=word_search,
    )


# --- Teacher Insights / Pattern Detection (Story 5.4) ---

# In-memory cache for teacher insights
_insights_cache: dict[str, tuple[TeacherInsightsResponse, datetime]] = {}
CACHE_TTL = timedelta(hours=24)


def get_cached_insights(teacher_id: uuid.UUID) -> TeacherInsightsResponse | None:
    """Get cached insights if available and not expired."""
    cache_key = str(teacher_id)
    if cache_key in _insights_cache:
        data, timestamp = _insights_cache[cache_key]
        if datetime.now(UTC) - timestamp < CACHE_TTL:
            return data
    return None


def set_cached_insights(teacher_id: uuid.UUID, data: TeacherInsightsResponse) -> None:
    """Cache insights for a teacher."""
    _insights_cache[str(teacher_id)] = (data, datetime.now(UTC))


def invalidate_insights_cache(teacher_id: uuid.UUID) -> None:
    """Invalidate cache for a specific teacher."""
    cache_key = str(teacher_id)
    if cache_key in _insights_cache:
        del _insights_cache[cache_key]


async def get_teacher_insights(
    teacher_id: uuid.UUID, session: AsyncSession, force_refresh: bool = False
) -> TeacherInsightsResponse:
    """
    Get all insights for a teacher, detecting patterns across assignments.

    Args:
        teacher_id: Teacher UUID
        session: Database session
        force_refresh: If True, bypass cache

    Returns:
        TeacherInsightsResponse with all detected insights
    """
    # Check cache first
    if not force_refresh:
        cached = get_cached_insights(teacher_id)
        if cached:
            return cached

    now = datetime.now(UTC)

    # Quick check: does the teacher have any completed assignments?
    # This avoids running expensive queries when there's no data
    count_result = await session.execute(
        select(func.count(AssignmentStudent.id))
        .join(Assignment, Assignment.id == AssignmentStudent.assignment_id)
        .where(
            Assignment.teacher_id == teacher_id,
            AssignmentStudent.status == AssignmentStatus.completed,
        )
    )
    completed_count = count_result.scalar_one()

    if completed_count == 0:
        # No completed assignments, return empty insights
        response = TeacherInsightsResponse(
            insights=[],
            last_refreshed=now,
        )
        set_cached_insights(teacher_id, response)
        return response

    # Get dismissed insight keys for this teacher
    dismissed_result = await session.execute(
        select(DismissedInsight.insight_key).where(
            DismissedInsight.teacher_id == teacher_id
        )
    )
    dismissed_keys = {row[0] for row in dismissed_result.all()}

    # Collect all insights from various detection functions
    all_insights: list[InsightCard] = []

    # Detect low performing assignments
    low_perf_insights = await _detect_low_performing_assignments(teacher_id, session)
    all_insights.extend(low_perf_insights)

    # Detect common misconceptions
    misconception_insights = await _detect_common_misconceptions(teacher_id, session)
    all_insights.extend(misconception_insights)

    # Detect struggling students
    struggling_insights = await _detect_struggling_students(teacher_id, session)
    all_insights.extend(struggling_insights)

    # Detect activity type struggles
    activity_insights = await _detect_activity_type_struggles(teacher_id, session)
    all_insights.extend(activity_insights)

    # Detect time management issues
    time_insights = await _detect_time_management_issues(teacher_id, session)
    all_insights.extend(time_insights)

    # Filter out dismissed insights
    filtered_insights = [i for i in all_insights if i.id not in dismissed_keys]

    # Sort by severity (critical first) then by affected count
    filtered_insights.sort(
        key=lambda x: (0 if x.severity == InsightSeverity.CRITICAL else 1, -x.affected_count)
    )

    response = TeacherInsightsResponse(
        insights=filtered_insights,
        last_refreshed=now,
    )

    # Cache the result
    set_cached_insights(teacher_id, response)

    return response


async def _detect_low_performing_assignments(
    teacher_id: uuid.UUID, session: AsyncSession
) -> list[InsightCard]:
    """
    Detect assignments with average score < 65%.

    Returns insights for low performing assignments.
    """
    insights: list[InsightCard] = []
    now = datetime.now(UTC)

    # Get all assignments for this teacher with at least one completed submission
    query = (
        select(
            Assignment.id,
            Assignment.name,
            func.avg(AssignmentStudent.score).label("avg_score"),
            func.count(AssignmentStudent.id).label("total_submissions"),
        )
        .join(AssignmentStudent, Assignment.id == AssignmentStudent.assignment_id)
        .where(
            Assignment.teacher_id == teacher_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.score.isnot(None),
        )
        .group_by(Assignment.id, Assignment.name)
        .having(func.avg(AssignmentStudent.score) < 65)
    )

    result = await session.execute(query)
    low_perf_assignments = result.all()

    for assignment_id, assignment_name, avg_score, total_submissions in low_perf_assignments:
        # Determine severity
        if avg_score < 50 or total_submissions > 5:
            severity = InsightSeverity.CRITICAL
        else:
            severity = InsightSeverity.MODERATE

        insights.append(
            InsightCard(
                id=f"low_perf_assignment_{assignment_id}",
                type=InsightType.REVIEW_RECOMMENDED,
                severity=severity,
                title="Low Performing Assignment",
                description=f"'{assignment_name}' has an average score of {avg_score:.1f}% across {total_submissions} submissions",
                affected_count=total_submissions,
                recommended_action="Review the activity and consider providing additional instruction on the topic",
                created_at=now,
            )
        )

    return insights


async def _detect_common_misconceptions(
    teacher_id: uuid.UUID, session: AsyncSession
) -> list[InsightCard]:
    """
    Detect questions where >60% of students answered incorrectly.

    Analyzes answer patterns to find common misconceptions.
    """
    insights: list[InsightCard] = []
    now = datetime.now(UTC)

    # Get all completed submissions for teacher's assignments
    query = (
        select(Assignment, Activity, AssignmentStudent)
        .join(Activity, Assignment.activity_id == Activity.id)
        .join(AssignmentStudent, Assignment.id == AssignmentStudent.assignment_id)
        .where(
            Assignment.teacher_id == teacher_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.answers_json.isnot(None),
        )
    )

    result = await session.execute(query)
    submissions = result.all()

    # Group by assignment
    assignment_submissions: dict[uuid.UUID, list[tuple]] = {}
    for assignment, activity, asgn_student in submissions:
        if assignment.id not in assignment_submissions:
            assignment_submissions[assignment.id] = []
        assignment_submissions[assignment.id].append((assignment, activity, asgn_student))

    # Analyze each assignment
    for assignment_id, assignment_data in assignment_submissions.items():
        if not assignment_data:
            continue

        assignment = assignment_data[0][0]
        activity = assignment_data[0][1]
        asgn_students = [d[2] for d in assignment_data]

        # Get correct answers from config
        config = activity.config_json
        correct_answers = _extract_correct_answers(activity.activity_type, config)

        if not correct_answers:
            continue

        # Count answer frequencies per question
        question_stats: dict[str, dict[str, int]] = {}
        question_totals: dict[str, int] = {}

        for asgn_student in asgn_students:
            if not asgn_student.answers_json:
                continue

            for question_id, answer in asgn_student.answers_json.items():
                if question_id not in question_stats:
                    question_stats[question_id] = {}
                    question_totals[question_id] = 0

                question_totals[question_id] += 1
                answer_str = str(answer) if answer else "(empty)"
                question_stats[question_id][answer_str] = question_stats[question_id].get(answer_str, 0) + 1

        # Check for misconceptions
        for question_id, correct_answer in correct_answers.items():
            if question_id not in question_stats:
                continue

            total = question_totals[question_id]
            if total < 3:  # Need at least 3 responses
                continue

            correct_count = question_stats[question_id].get(correct_answer, 0)
            incorrect_percentage = ((total - correct_count) / total) * 100

            if incorrect_percentage > 60:
                # Find most common wrong answer
                wrong_answers = [
                    (ans, count) for ans, count in question_stats[question_id].items()
                    if ans != correct_answer
                ]
                wrong_answers.sort(key=lambda x: -x[1])
                common_wrong = wrong_answers[0][0] if wrong_answers else None
                common_wrong_count = wrong_answers[0][1] if wrong_answers else 0

                # Check if same wrong answer > 50%
                same_wrong_pct = (common_wrong_count / total * 100) if total > 0 else 0

                if same_wrong_pct > 50:
                    severity = InsightSeverity.CRITICAL
                else:
                    severity = InsightSeverity.MODERATE

                insights.append(
                    InsightCard(
                        id=f"misconception_{assignment_id}_{question_id}",
                        type=InsightType.COMMON_MISCONCEPTION,
                        severity=severity,
                        title="Common Misconception Detected",
                        description=f"{incorrect_percentage:.0f}% of students answered incorrectly on '{assignment.name}' - Question '{question_id}'",
                        affected_count=total - correct_count,
                        recommended_action=f"Review this question - many students chose '{common_wrong}' instead of '{correct_answer}'",
                        created_at=now,
                    )
                )

    return insights


def _extract_correct_answers(activity_type: str, config: dict) -> dict[str, str]:
    """Extract correct answers from activity config."""
    correct_answers = {}

    if activity_type in ("dragdroppicture", "circle", "markwithx"):
        if "answer" in config:
            for answer in config["answer"]:
                if "coords" in answer and "word" in answer:
                    zone_id = f"{answer['coords']['x']}-{answer['coords']['y']}"
                    correct_answers[zone_id] = answer["word"]

    elif activity_type == "dragdroppicturegroup":
        if "categories" in config:
            for category in config["categories"]:
                category_name = category.get("name", "Unknown")
                for word in category.get("words", []):
                    correct_answers[word] = category_name

    elif activity_type == "matchTheWords":
        if "pairs" in config:
            for pair in config["pairs"]:
                if "left" in pair and "right" in pair:
                    correct_answers[pair["left"]] = pair["right"]

    return correct_answers


async def _detect_struggling_students(
    teacher_id: uuid.UUID, session: AsyncSession
) -> list[InsightCard]:
    """
    Detect students with >3 past due assignments or consistently low scores.
    """
    insights: list[InsightCard] = []
    now = datetime.now(UTC)
    now_naive = now.replace(tzinfo=None)

    # Get all students in teacher's classes
    enrolled_query = (
        select(ClassStudent.student_id)
        .join(Class, ClassStudent.class_id == Class.id)
        .where(Class.teacher_id == teacher_id)
        .distinct()
    )
    enrolled_result = await session.execute(enrolled_query)
    enrolled_students = [row[0] for row in enrolled_result.all()]

    if not enrolled_students:
        return insights

    # Get student stats
    for student_id in enrolled_students:
        # Count past due assignments
        past_due_query = (
            select(func.count(AssignmentStudent.id))
            .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
            .where(
                AssignmentStudent.student_id == student_id,
                AssignmentStudent.status != AssignmentStatus.completed,
                Assignment.teacher_id == teacher_id,
                Assignment.due_date < now_naive,
            )
        )
        past_due_result = await session.execute(past_due_query)
        past_due_count = past_due_result.scalar_one()

        # Get average score
        avg_score_query = (
            select(func.avg(AssignmentStudent.score))
            .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
            .where(
                AssignmentStudent.student_id == student_id,
                AssignmentStudent.status == AssignmentStatus.completed,
                Assignment.teacher_id == teacher_id,
                AssignmentStudent.score.isnot(None),
            )
        )
        avg_score_result = await session.execute(avg_score_query)
        avg_score = avg_score_result.scalar_one() or 0

        # Get student name
        student_query = (
            select(User.full_name, User.email)
            .join(Student, Student.user_id == User.id)
            .where(Student.id == student_id)
        )
        student_result = await session.execute(student_query)
        student_row = student_result.one_or_none()
        if not student_row:
            continue
        student_name = student_row[0] or student_row[1]

        # Check thresholds
        if past_due_count > 3:
            severity = InsightSeverity.CRITICAL if past_due_count > 5 else InsightSeverity.MODERATE
            insights.append(
                InsightCard(
                    id=f"struggling_student_pastdue_{student_id}",
                    type=InsightType.STRUGGLING_STUDENTS,
                    severity=severity,
                    title="Student with Multiple Past Due Assignments",
                    description=f"'{student_name}' has {past_due_count} past due assignments",
                    affected_count=1,
                    recommended_action="Consider reaching out to check on this student's progress",
                    created_at=now,
                )
            )

        if avg_score > 0 and avg_score < 50:
            insights.append(
                InsightCard(
                    id=f"struggling_student_lowscore_{student_id}",
                    type=InsightType.STRUGGLING_STUDENTS,
                    severity=InsightSeverity.CRITICAL,
                    title="Student with Consistently Low Scores",
                    description=f"'{student_name}' has an average score of {avg_score:.1f}%",
                    affected_count=1,
                    recommended_action="Consider providing additional support or tutoring",
                    created_at=now,
                )
            )

    return insights


async def _detect_activity_type_struggles(
    teacher_id: uuid.UUID, session: AsyncSession
) -> list[InsightCard]:
    """
    Detect activity types where students consistently underperform.
    """
    insights: list[InsightCard] = []
    now = datetime.now(UTC)

    # Get average score by activity type
    query = (
        select(
            Activity.activity_type,
            func.avg(AssignmentStudent.score).label("avg_score"),
            func.count(AssignmentStudent.id).label("submission_count"),
        )
        .join(Assignment, Activity.id == Assignment.activity_id)
        .join(AssignmentStudent, Assignment.id == AssignmentStudent.assignment_id)
        .where(
            Assignment.teacher_id == teacher_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.score.isnot(None),
        )
        .group_by(Activity.activity_type)
    )

    result = await session.execute(query)
    activity_stats = result.all()

    for activity_type, avg_score, submission_count in activity_stats:
        if submission_count < 5:  # Need enough data
            continue

        if avg_score < 60:
            severity = InsightSeverity.CRITICAL if avg_score < 50 else InsightSeverity.MODERATE
            insights.append(
                InsightCard(
                    id=f"activity_type_struggle_{activity_type}",
                    type=InsightType.ACTIVITY_TYPE_STRUGGLE,
                    severity=severity,
                    title=f"Low Performance on {activity_type} Activities",
                    description=f"Students average {avg_score:.1f}% on {activity_type} activities ({submission_count} submissions)",
                    affected_count=submission_count,
                    recommended_action=f"Consider reviewing how to approach {activity_type} activities with students",
                    created_at=now,
                )
            )

    return insights


async def _detect_time_management_issues(
    teacher_id: uuid.UUID, session: AsyncSession
) -> list[InsightCard]:
    """
    Detect rushing patterns: very short completion time + low score.
    """
    insights: list[InsightCard] = []
    now = datetime.now(UTC)

    # Get submissions with time data
    # Note: We only use avg_time for threshold calculation, stddev removed for SQLite compatibility
    query = (
        select(
            Assignment.id,
            Assignment.name,
            func.avg(AssignmentStudent.time_spent_minutes).label("avg_time"),
        )
        .join(AssignmentStudent, Assignment.id == AssignmentStudent.assignment_id)
        .where(
            Assignment.teacher_id == teacher_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.time_spent_minutes > 0,
        )
        .group_by(Assignment.id, Assignment.name)
        .having(func.count(AssignmentStudent.id) >= 3)  # Need at least 3 submissions
    )

    result = await session.execute(query)
    assignment_stats = result.all()

    for assignment_id, assignment_name, avg_time in assignment_stats:
        if avg_time is None or avg_time < 1:
            continue

        # Find students with unusually short time + low score
        threshold_time = avg_time * 0.25  # Less than 25% of average time

        rushing_query = (
            select(func.count(AssignmentStudent.id))
            .where(
                AssignmentStudent.assignment_id == assignment_id,
                AssignmentStudent.status == AssignmentStatus.completed,
                AssignmentStudent.time_spent_minutes < threshold_time,
                AssignmentStudent.score < 60,
            )
        )
        rushing_result = await session.execute(rushing_query)
        rushing_count = rushing_result.scalar_one()

        if rushing_count >= 2:
            severity = InsightSeverity.CRITICAL if rushing_count > 3 else InsightSeverity.MODERATE
            insights.append(
                InsightCard(
                    id=f"time_management_{assignment_id}",
                    type=InsightType.TIME_MANAGEMENT,
                    severity=severity,
                    title="Time Management Issue Detected",
                    description=f"{rushing_count} students rushed through '{assignment_name}' (completed in <{threshold_time:.0f} min with score <60%)",
                    affected_count=rushing_count,
                    recommended_action="Remind students to take their time and review their work before submitting",
                    created_at=now,
                )
            )

    return insights


async def get_insight_detail(
    teacher_id: uuid.UUID, insight_id: str, session: AsyncSession
) -> InsightDetail | None:
    """
    Get detailed information for a specific insight.

    Args:
        teacher_id: Teacher UUID
        insight_id: Insight ID string
        session: Database session

    Returns:
        InsightDetail with affected students, assignments, etc. or None if not found
    """
    # First get all current insights
    insights_response = await get_teacher_insights(teacher_id, session)
    insight_card = next((i for i in insights_response.insights if i.id == insight_id), None)

    if not insight_card:
        return None

    # Parse insight ID to get context
    affected_students: list[AffectedStudent] = []
    related_assignments: list[RelatedAssignment] = []
    related_questions: list[RelatedQuestion] = []

    # Handle different insight types
    if insight_id.startswith("low_perf_assignment_"):
        assignment_id_str = insight_id.replace("low_perf_assignment_", "")
        try:
            assignment_uuid = uuid.UUID(assignment_id_str)
            related_assignments, affected_students = await _get_assignment_insight_details(
                assignment_uuid, teacher_id, session
            )
        except ValueError:
            pass

    elif insight_id.startswith("misconception_"):
        parts = insight_id.replace("misconception_", "").split("_", 1)
        if len(parts) == 2:
            try:
                assignment_uuid = uuid.UUID(parts[0])
                question_id = parts[1]
                related_assignments, affected_students, related_questions = (
                    await _get_misconception_insight_details(
                        assignment_uuid, question_id, teacher_id, session
                    )
                )
            except ValueError:
                pass

    elif insight_id.startswith("struggling_student_"):
        student_id_str = insight_id.split("_")[-1]
        try:
            student_uuid = uuid.UUID(student_id_str)
            affected_students, related_assignments = await _get_student_insight_details(
                student_uuid, teacher_id, session
            )
        except ValueError:
            pass

    elif insight_id.startswith("activity_type_struggle_"):
        activity_type = insight_id.replace("activity_type_struggle_", "")
        related_assignments, affected_students = await _get_activity_type_insight_details(
            activity_type, teacher_id, session
        )

    elif insight_id.startswith("time_management_"):
        assignment_id_str = insight_id.replace("time_management_", "")
        try:
            assignment_uuid = uuid.UUID(assignment_id_str)
            related_assignments, affected_students = await _get_time_management_insight_details(
                assignment_uuid, teacher_id, session
            )
        except ValueError:
            pass

    return InsightDetail(
        insight=insight_card,
        affected_students=affected_students,
        related_assignments=related_assignments,
        related_questions=related_questions if related_questions else None,
    )


async def _get_assignment_insight_details(
    assignment_id: uuid.UUID, teacher_id: uuid.UUID, session: AsyncSession
) -> tuple[list[RelatedAssignment], list[AffectedStudent]]:
    """Get details for a low performing assignment insight."""
    related_assignments = []
    affected_students = []

    # Get assignment info
    assignment_query = select(Assignment).where(
        Assignment.id == assignment_id,
        Assignment.teacher_id == teacher_id,
    )
    assignment_result = await session.execute(assignment_query)
    assignment = assignment_result.scalar_one_or_none()

    if not assignment:
        return [], []

    # Get submission stats
    stats_query = (
        select(
            func.avg(AssignmentStudent.score).label("avg_score"),
            func.count(AssignmentStudent.id).label("total"),
        )
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.status == AssignmentStatus.completed,
        )
    )
    stats_result = await session.execute(stats_query)
    stats = stats_result.one()
    total = stats[1] or 0
    avg_score = stats[0] or 0.0

    # Get completion rate
    total_assigned_query = select(func.count(AssignmentStudent.id)).where(
        AssignmentStudent.assignment_id == assignment_id
    )
    total_assigned_result = await session.execute(total_assigned_query)
    total_assigned = total_assigned_result.scalar_one()
    completion_rate = total / total_assigned if total_assigned > 0 else 0.0

    related_assignments.append(
        RelatedAssignment(
            assignment_id=str(assignment_id),
            name=assignment.name,
            avg_score=round(avg_score, 1),
            completion_rate=round(completion_rate, 2),
        )
    )

    # Get affected students (those with low scores)
    students_query = (
        select(AssignmentStudent, Student, User)
        .join(Student, AssignmentStudent.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.score < 65,
        )
    )
    students_result = await session.execute(students_query)

    for asgn_student, student, user in students_result.all():
        affected_students.append(
            AffectedStudent(
                student_id=str(student.id),
                name=user.full_name or user.email,
                relevant_metric=f"Score: {asgn_student.score:.0f}%",
            )
        )

    return related_assignments, affected_students


async def _get_misconception_insight_details(
    assignment_id: uuid.UUID, question_id: str, teacher_id: uuid.UUID, session: AsyncSession
) -> tuple[list[RelatedAssignment], list[AffectedStudent], list[RelatedQuestion]]:
    """Get details for a misconception insight."""
    related_assignments = []
    affected_students = []
    related_questions = []

    # Get assignment with activity
    query = (
        select(Assignment, Activity)
        .join(Activity, Assignment.activity_id == Activity.id)
        .where(
            Assignment.id == assignment_id,
            Assignment.teacher_id == teacher_id,
        )
    )
    result = await session.execute(query)
    row = result.one_or_none()

    if not row:
        return [], [], []

    assignment, activity = row
    correct_answers = _extract_correct_answers(activity.activity_type, activity.config_json)
    correct_answer = correct_answers.get(question_id, "")

    # Get submission stats
    stats_query = (
        select(
            func.avg(AssignmentStudent.score).label("avg_score"),
            func.count(AssignmentStudent.id).label("total"),
        )
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.status == AssignmentStatus.completed,
        )
    )
    stats_result = await session.execute(stats_query)
    stats = stats_result.one()

    total_assigned_query = select(func.count(AssignmentStudent.id)).where(
        AssignmentStudent.assignment_id == assignment_id
    )
    total_assigned_result = await session.execute(total_assigned_query)
    total_assigned = total_assigned_result.scalar_one()

    related_assignments.append(
        RelatedAssignment(
            assignment_id=str(assignment_id),
            name=assignment.name,
            avg_score=round(stats[0] or 0, 1),
            completion_rate=round((stats[1] or 0) / total_assigned if total_assigned > 0 else 0, 2),
        )
    )

    # Get students who answered incorrectly
    students_query = (
        select(AssignmentStudent, Student, User)
        .join(Student, AssignmentStudent.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.answers_json.isnot(None),
        )
    )
    students_result = await session.execute(students_query)

    wrong_answer_counts: dict[str, int] = {}
    total_responses = 0

    for asgn_student, student, user in students_result.all():
        if not asgn_student.answers_json or question_id not in asgn_student.answers_json:
            continue

        total_responses += 1
        answer = str(asgn_student.answers_json[question_id])

        if answer != correct_answer:
            affected_students.append(
                AffectedStudent(
                    student_id=str(student.id),
                    name=user.full_name or user.email,
                    relevant_metric=f"Answered: {answer}",
                )
            )
            wrong_answer_counts[answer] = wrong_answer_counts.get(answer, 0) + 1

    # Find most common wrong answer
    common_wrong = max(wrong_answer_counts.items(), key=lambda x: x[1])[0] if wrong_answer_counts else None
    incorrect_pct = (len(affected_students) / total_responses * 100) if total_responses > 0 else 0

    related_questions.append(
        RelatedQuestion(
            question_id=question_id,
            question_text=f"{question_id} → {correct_answer}",
            incorrect_percentage=round(incorrect_pct, 1),
            common_wrong_answer=common_wrong,
        )
    )

    return related_assignments, affected_students, related_questions


async def _get_student_insight_details(
    student_id: uuid.UUID, teacher_id: uuid.UUID, session: AsyncSession
) -> tuple[list[AffectedStudent], list[RelatedAssignment]]:
    """Get details for a struggling student insight."""
    affected_students = []
    related_assignments = []

    # Get student info
    student_query = (
        select(Student, User)
        .join(User, Student.user_id == User.id)
        .where(Student.id == student_id)
    )
    student_result = await session.execute(student_query)
    student_row = student_result.one_or_none()

    if not student_row:
        return [], []

    student, user = student_row

    # Get student's stats
    stats_query = (
        select(
            func.avg(AssignmentStudent.score).label("avg_score"),
            func.count(AssignmentStudent.id).label("total"),
        )
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .where(
            AssignmentStudent.student_id == student_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            Assignment.teacher_id == teacher_id,
        )
    )
    stats_result = await session.execute(stats_query)
    stats = stats_result.one()

    affected_students.append(
        AffectedStudent(
            student_id=str(student_id),
            name=user.full_name or user.email,
            relevant_metric=f"Avg Score: {stats[0]:.1f}%" if stats[0] else "No completed work",
        )
    )

    # Get their assignments
    assignments_query = (
        select(Assignment, AssignmentStudent)
        .join(AssignmentStudent, Assignment.id == AssignmentStudent.assignment_id)
        .where(
            AssignmentStudent.student_id == student_id,
            Assignment.teacher_id == teacher_id,
        )
        .order_by(AssignmentStudent.completed_at.desc().nullsfirst())
        .limit(5)
    )
    assignments_result = await session.execute(assignments_query)

    for assignment, asgn_student in assignments_result.all():
        related_assignments.append(
            RelatedAssignment(
                assignment_id=str(assignment.id),
                name=assignment.name,
                avg_score=asgn_student.score or 0,
                completion_rate=1.0 if asgn_student.status == AssignmentStatus.completed else 0.0,
            )
        )

    return affected_students, related_assignments


async def _get_activity_type_insight_details(
    activity_type: str, teacher_id: uuid.UUID, session: AsyncSession
) -> tuple[list[RelatedAssignment], list[AffectedStudent]]:
    """Get details for an activity type struggle insight."""
    related_assignments = []
    affected_students = []

    # Get assignments of this type
    query = (
        select(
            Assignment.id,
            Assignment.name,
            func.avg(AssignmentStudent.score).label("avg_score"),
            func.count(AssignmentStudent.id).label("total"),
        )
        .join(Activity, Assignment.activity_id == Activity.id)
        .join(AssignmentStudent, Assignment.id == AssignmentStudent.assignment_id)
        .where(
            Assignment.teacher_id == teacher_id,
            Activity.activity_type == activity_type,
            AssignmentStudent.status == AssignmentStatus.completed,
        )
        .group_by(Assignment.id, Assignment.name)
        .order_by(func.avg(AssignmentStudent.score))
        .limit(5)
    )

    result = await session.execute(query)

    for assignment_id, name, avg_score, total in result.all():
        # Get total assigned
        total_query = select(func.count(AssignmentStudent.id)).where(
            AssignmentStudent.assignment_id == assignment_id
        )
        total_result = await session.execute(total_query)
        total_assigned = total_result.scalar_one()

        related_assignments.append(
            RelatedAssignment(
                assignment_id=str(assignment_id),
                name=name,
                avg_score=round(avg_score or 0, 1),
                completion_rate=round(total / total_assigned if total_assigned > 0 else 0, 2),
            )
        )

    # Get students struggling with this activity type
    students_query = (
        select(
            Student.id,
            User.full_name,
            User.email,
            func.avg(AssignmentStudent.score).label("avg_score"),
        )
        .join(AssignmentStudent, Student.id == AssignmentStudent.student_id)
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .join(Activity, Assignment.activity_id == Activity.id)
        .join(User, Student.user_id == User.id)
        .where(
            Assignment.teacher_id == teacher_id,
            Activity.activity_type == activity_type,
            AssignmentStudent.status == AssignmentStatus.completed,
        )
        .group_by(Student.id, User.full_name, User.email)
        .having(func.avg(AssignmentStudent.score) < 60)
        .limit(10)
    )

    students_result = await session.execute(students_query)

    for student_id, full_name, email, avg_score in students_result.all():
        affected_students.append(
            AffectedStudent(
                student_id=str(student_id),
                name=full_name or email,
                relevant_metric=f"Avg: {avg_score:.1f}%",
            )
        )

    return related_assignments, affected_students


async def _get_time_management_insight_details(
    assignment_id: uuid.UUID, teacher_id: uuid.UUID, session: AsyncSession
) -> tuple[list[RelatedAssignment], list[AffectedStudent]]:
    """Get details for a time management insight."""
    related_assignments = []
    affected_students = []

    # Get assignment info
    assignment_query = select(Assignment).where(
        Assignment.id == assignment_id,
        Assignment.teacher_id == teacher_id,
    )
    assignment_result = await session.execute(assignment_query)
    assignment = assignment_result.scalar_one_or_none()

    if not assignment:
        return [], []

    # Get average time
    avg_time_query = (
        select(func.avg(AssignmentStudent.time_spent_minutes))
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.time_spent_minutes > 0,
        )
    )
    avg_time_result = await session.execute(avg_time_query)
    avg_time = avg_time_result.scalar_one() or 0

    # Get stats
    stats_query = (
        select(
            func.avg(AssignmentStudent.score),
            func.count(AssignmentStudent.id),
        )
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.status == AssignmentStatus.completed,
        )
    )
    stats_result = await session.execute(stats_query)
    stats = stats_result.one()

    total_query = select(func.count(AssignmentStudent.id)).where(
        AssignmentStudent.assignment_id == assignment_id
    )
    total_result = await session.execute(total_query)
    total_assigned = total_result.scalar_one()

    related_assignments.append(
        RelatedAssignment(
            assignment_id=str(assignment_id),
            name=assignment.name,
            avg_score=round(stats[0] or 0, 1),
            completion_rate=round((stats[1] or 0) / total_assigned if total_assigned > 0 else 0, 2),
        )
    )

    # Get students who rushed
    threshold_time = avg_time * 0.25
    rushing_query = (
        select(AssignmentStudent, Student, User)
        .join(Student, AssignmentStudent.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .where(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.time_spent_minutes < threshold_time,
            AssignmentStudent.score < 60,
        )
    )
    rushing_result = await session.execute(rushing_query)

    for asgn_student, student, user in rushing_result.all():
        affected_students.append(
            AffectedStudent(
                student_id=str(student.id),
                name=user.full_name or user.email,
                relevant_metric=f"{asgn_student.time_spent_minutes:.0f} min, {asgn_student.score:.0f}%",
            )
        )

    return related_assignments, affected_students


async def dismiss_insight(
    teacher_id: uuid.UUID, insight_id: str, session: AsyncSession
) -> bool:
    """
    Dismiss an insight so it won't appear again.

    Args:
        teacher_id: Teacher UUID
        insight_id: Insight ID to dismiss
        session: Database session

    Returns:
        True if dismissed successfully, False if already dismissed
    """
    # Check if already dismissed
    existing = await session.execute(
        select(DismissedInsight).where(
            DismissedInsight.teacher_id == teacher_id,
            DismissedInsight.insight_key == insight_id,
        )
    )
    if existing.scalar_one_or_none():
        return False  # Already dismissed

    # Create dismissal record
    dismissed = DismissedInsight(
        teacher_id=teacher_id,
        insight_key=insight_id,
    )
    session.add(dismissed)
    await session.commit()

    # Invalidate cache
    invalidate_insights_cache(teacher_id)

    return True


# --- Student Progress Analytics (Story 5.5) ---


# Activity type label mapping for user-friendly display
ACTIVITY_TYPE_LABELS = {
    "dragdroppicture": "Drag & Drop",
    "dragdroppicturegroup": "Categorization",
    "matchTheWords": "Word Matching",
    "puzzleFindWords": "Word Search",
    "circle": "Circle the Answer",
    "markwithx": "Mark with X",
}


def get_student_progress_period_start(period: StudentProgressPeriod) -> datetime | None:
    """
    Calculate start date for student progress period.

    Args:
        period: Progress period ('this_week', 'this_month', 'all_time')

    Returns:
        Start datetime or None for 'all_time'
    """
    if period == "all_time":
        return None

    now = datetime.now(UTC)

    if period == "this_week":
        # Start of this week (Monday)
        days_since_monday = now.weekday()
        return now - timedelta(days=days_since_monday, hours=now.hour, minutes=now.minute, seconds=now.second, microseconds=now.microsecond)
    elif period == "this_month":
        # Start of this month
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    return None


def _get_activity_type_label(activity_type: str) -> str:
    """Get user-friendly label for activity type."""
    return ACTIVITY_TYPE_LABELS.get(activity_type, activity_type.replace("_", " ").title())


def _generate_improvement_tips(
    activity_breakdown: list[ActivityTypeScore],
    avg_score: float,
    streak: int,
) -> list[str]:
    """
    Generate encouraging improvement tips based on student performance.

    Args:
        activity_breakdown: Student's performance by activity type
        avg_score: Overall average score
        streak: Current activity streak

    Returns:
        List of improvement tips (max 3)
    """
    tips = []

    # Find weakest activity type
    if activity_breakdown:
        sorted_activities = sorted(activity_breakdown, key=lambda x: x.avg_score)
        weakest = sorted_activities[0]
        if weakest.avg_score < 70:
            tips.append(
                f"Focus on {weakest.label} activities to improve your overall score. "
                f"Practice makes perfect!"
            )

    # Streak encouragement
    if streak == 0:
        tips.append(
            "Start a new streak today! Complete one assignment to begin building "
            "your consistency."
        )
    elif streak < 3:
        tips.append(
            f"You're on a {streak}-day streak! Keep it going to build great study habits."
        )
    elif streak >= 7:
        tips.append(
            f"Amazing {streak}-day streak! Your consistency is paying off. Keep up the great work!"
        )

    # Score-based tips
    if avg_score >= 90:
        tips.append(
            "Outstanding performance! Consider helping classmates or trying more "
            "challenging activities."
        )
    elif avg_score >= 80:
        tips.append(
            "Great work! Review any mistakes to push your score even higher."
        )
    elif avg_score >= 70:
        tips.append(
            "You're doing well! Take your time on each question to improve accuracy."
        )
    elif avg_score >= 50:
        tips.append(
            "Keep practicing! Each assignment helps you learn. Don't rush through questions."
        )
    else:
        tips.append(
            "Every expert was once a beginner. Review the instructions carefully and "
            "ask for help if needed."
        )

    return tips[:3]  # Return max 3 tips


def _detect_achievements(
    total_completed: int,
    streak: int,
    avg_score: float,
    recent_scores: list[int],
    completed_dates: list[datetime],
) -> list[Achievement]:
    """
    Detect achievements earned by the student.

    Args:
        total_completed: Total assignments completed
        streak: Current streak
        avg_score: Overall average score
        recent_scores: List of recent scores
        completed_dates: List of completion dates

    Returns:
        List of earned achievements
    """
    achievements = []
    now = datetime.now(UTC)

    # First assignment completion
    if total_completed >= 1:
        earned_at = min(completed_dates) if completed_dates else now
        achievements.append(
            Achievement(
                id="first_complete",
                type="first_complete",
                title="First Steps",
                description="Completed your first assignment!",
                earned_at=earned_at,
                icon="rocket",
            )
        )

    # 10 assignments milestone
    if total_completed >= 10:
        achievements.append(
            Achievement(
                id="ten_complete",
                type="milestone",
                title="Getting Started",
                description="Completed 10 assignments!",
                earned_at=now,
                icon="target",
            )
        )

    # 50 assignments milestone
    if total_completed >= 50:
        achievements.append(
            Achievement(
                id="fifty_complete",
                type="milestone",
                title="Dedicated Learner",
                description="Completed 50 assignments!",
                earned_at=now,
                icon="medal",
            )
        )

    # Streak achievements
    if streak >= 3:
        achievements.append(
            Achievement(
                id="streak_3",
                type="streak",
                title="On a Roll",
                description="3-day learning streak!",
                earned_at=now,
                icon="flame",
            )
        )

    if streak >= 7:
        achievements.append(
            Achievement(
                id="streak_7",
                type="streak",
                title="Week Warrior",
                description="7-day learning streak!",
                earned_at=now,
                icon="fire",
            )
        )

    if streak >= 30:
        achievements.append(
            Achievement(
                id="streak_30",
                type="streak",
                title="Month Master",
                description="30-day learning streak!",
                earned_at=now,
                icon="crown",
            )
        )

    # Perfect score achievements
    perfect_scores = [s for s in recent_scores if s == 100]
    if perfect_scores:
        achievements.append(
            Achievement(
                id="perfect_score",
                type="perfect_score",
                title="Perfect!",
                description="Scored 100% on an assignment!",
                earned_at=now,
                icon="star",
            )
        )

    if len(perfect_scores) >= 5:
        achievements.append(
            Achievement(
                id="perfect_five",
                type="perfect_score",
                title="Perfectionist",
                description="5 perfect scores!",
                earned_at=now,
                icon="sparkles",
            )
        )

    # High average
    if avg_score >= 90 and total_completed >= 5:
        achievements.append(
            Achievement(
                id="high_achiever",
                type="performance",
                title="High Achiever",
                description="Average score above 90%!",
                earned_at=now,
                icon="trophy",
            )
        )

    # Improvement trend (compare first half to second half)
    if len(recent_scores) >= 6:
        mid = len(recent_scores) // 2
        first_half_avg = sum(recent_scores[:mid]) / mid
        second_half_avg = sum(recent_scores[mid:]) / (len(recent_scores) - mid)
        if second_half_avg > first_half_avg + 10:  # 10+ point improvement
            achievements.append(
                Achievement(
                    id="improvement",
                    type="improvement",
                    title="Rising Star",
                    description="Your scores are improving!",
                    earned_at=now,
                    icon="trending-up",
                )
            )

    return achievements


def _determine_improvement_trend(
    recent_scores: list[int],
) -> ImprovementTrend:
    """
    Determine if student is improving, stable, or declining.

    Uses linear regression slope to determine trend.

    Args:
        recent_scores: List of recent scores (oldest first)

    Returns:
        ImprovementTrend enum value
    """
    if len(recent_scores) < 3:
        return ImprovementTrend.STABLE

    # Simple linear regression to find slope
    n = len(recent_scores)
    x_mean = (n - 1) / 2
    y_mean = sum(recent_scores) / n

    numerator = sum((i - x_mean) * (score - y_mean) for i, score in enumerate(recent_scores))
    denominator = sum((i - x_mean) ** 2 for i in range(n))

    if denominator == 0:
        return ImprovementTrend.STABLE

    slope = numerator / denominator

    # Threshold for determining trend
    if slope > 2:  # More than 2 points per assignment improvement
        return ImprovementTrend.IMPROVING
    elif slope < -2:  # More than 2 points per assignment decline
        return ImprovementTrend.DECLINING
    else:
        return ImprovementTrend.STABLE


async def get_student_progress(
    student_id: uuid.UUID,
    period: StudentProgressPeriod,
    session: AsyncSession,
) -> StudentProgressResponse:
    """
    Get comprehensive student progress data for student-facing dashboard.

    Args:
        student_id: Student UUID
        period: Time period for filtering ('this_week', 'this_month', 'all_time')
        session: Database session

    Returns:
        Complete student progress data including stats, trends, achievements

    Raises:
        ValueError: If student not found
    """
    # Verify student exists
    student_result = await session.execute(
        select(Student).where(Student.id == student_id)
    )
    student = student_result.scalar_one_or_none()

    if not student:
        raise ValueError(f"Student not found: {student_id}")

    # Get period start date
    period_start = get_student_progress_period_start(period)
    period_start_naive = period_start.replace(tzinfo=None) if period_start else None
    now_naive = datetime.now(UTC).replace(tzinfo=None)

    # Get all completed assignments with related data
    completed_query = (
        select(AssignmentStudent, Assignment, Activity)
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .join(Activity, Assignment.activity_id == Activity.id)
        .where(
            AssignmentStudent.student_id == student_id,
            AssignmentStudent.status == AssignmentStatus.completed,
        )
        .order_by(AssignmentStudent.completed_at.desc())
    )

    completed_result = await session.execute(completed_query)
    all_completed = completed_result.all()

    # Filter for period if needed
    if period_start_naive:
        period_completed = [
            row for row in all_completed
            if row[0].completed_at and row[0].completed_at >= period_start_naive
        ]
    else:
        period_completed = list(all_completed)

    # Calculate basic stats
    total_completed = len(period_completed)
    scores = [row[0].score for row in period_completed if row[0].score is not None]
    avg_score = sum(scores) / len(scores) if scores else 0.0

    # Calculate streak (uses all time data)
    current_streak = await calculate_streak(student_id, session)

    # Determine streak start date
    streak_start_date = None
    if current_streak > 0:
        completed_dates = [
            row[0].completed_at.date()
            for row in all_completed
            if row[0].completed_at
        ]
        if completed_dates:
            today = datetime.now(UTC).date()
            streak_start = today - timedelta(days=current_streak - 1)
            streak_start_date = streak_start.isoformat()

    # Determine improvement trend (use last 10 scores)
    recent_scores_for_trend = [
        row[0].score for row in reversed(period_completed[:10])
        if row[0].score is not None
    ]
    improvement_trend = _determine_improvement_trend(recent_scores_for_trend)

    stats = StudentProgressStats(
        total_completed=total_completed,
        avg_score=round(avg_score, 1),
        current_streak=current_streak,
        streak_start_date=streak_start_date,
        improvement_trend=improvement_trend,
    )

    # Build score trend (for chart)
    score_trend = []
    for asgn_student, assignment, activity in period_completed:
        if asgn_student.completed_at and asgn_student.score is not None:
            score_trend.append(
                ScoreTrendPoint(
                    date=asgn_student.completed_at.date().isoformat(),
                    score=asgn_student.score,
                    assignment_name=assignment.name,
                )
            )
    # Reverse to have oldest first (for chart display)
    score_trend = list(reversed(score_trend[:30]))  # Last 30 data points

    # Activity type breakdown
    activity_data: dict[str, tuple[list[int], int]] = {}
    for asgn_student, assignment, activity in period_completed:
        if asgn_student.score is not None:
            act_type = activity.activity_type
            if act_type not in activity_data:
                activity_data[act_type] = ([], 0)
            scores_list, count = activity_data[act_type]
            scores_list.append(asgn_student.score)
            activity_data[act_type] = (scores_list, count + 1)

    activity_breakdown = [
        ActivityTypeScore(
            activity_type=act_type,
            avg_score=round(sum(act_scores) / len(act_scores), 1),
            total_completed=count,
            label=_get_activity_type_label(act_type),
        )
        for act_type, (act_scores, count) in activity_data.items()
    ]

    # Recent assignments (last 5)
    # Fetch book titles for recent assignments
    book_service = get_book_service()
    recent_assignments = []
    for asgn_student, assignment, activity in period_completed[:5]:
        # Fetch book data from DCS
        book = await book_service.get_book(assignment.dcs_book_id)
        book_title = book.title if book else "Unknown Book"

        has_feedback = False

        recent_assignments.append(
            ProgressRecentAssignment(
                id=str(assignment.id),
                name=assignment.name,
                score=asgn_student.score or 0,
                completed_at=asgn_student.completed_at,
                has_feedback=has_feedback,
                activity_type=activity.activity_type,
                book_title=book_title,
            )
        )

    # Study time stats
    week_start = now_naive - timedelta(days=7)
    month_start = now_naive - timedelta(days=30)

    time_this_week = sum(
        row[0].time_spent_minutes or 0
        for row in all_completed
        if row[0].completed_at and row[0].completed_at >= week_start
    )

    time_this_month = sum(
        row[0].time_spent_minutes or 0
        for row in all_completed
        if row[0].completed_at and row[0].completed_at >= month_start
    )

    total_time = sum(
        row[0].time_spent_minutes or 0
        for row in period_completed
    )
    avg_time_per = total_time / total_completed if total_completed > 0 else 0.0

    study_time = StudyTimeStats(
        this_week_minutes=time_this_week,
        this_month_minutes=time_this_month,
        avg_per_assignment=round(avg_time_per, 1),
    )

    # Detect achievements
    all_scores = [row[0].score for row in all_completed if row[0].score is not None]
    all_completed_dates = [
        row[0].completed_at for row in all_completed if row[0].completed_at
    ]
    achievements = _detect_achievements(
        total_completed=len(all_completed),
        streak=current_streak,
        avg_score=avg_score,
        recent_scores=all_scores[:20],  # Last 20 for achievements
        completed_dates=all_completed_dates,
    )

    # Generate improvement tips
    improvement_tips = _generate_improvement_tips(
        activity_breakdown=activity_breakdown,
        avg_score=avg_score,
        streak=current_streak,
    )

    return StudentProgressResponse(
        stats=stats,
        score_trend=score_trend,
        activity_breakdown=activity_breakdown,
        recent_assignments=recent_assignments,
        achievements=achievements,
        study_time=study_time,
        improvement_tips=improvement_tips,
    )
