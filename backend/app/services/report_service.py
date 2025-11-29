"""Report generation service for time-based reporting and trend analysis - Story 5.6."""

import os
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import (
    Activity,
    Assignment,
    AssignmentStatus,
    AssignmentStudent,
    Book,
    Class,
    ClassStudent,
    ReportFormatEnum,
    ReportJob,
    ReportJobStatusEnum,
    ReportTypeEnum,
    SavedReportConfig,
    Student,
    Teacher,
    User,
)
from app.schemas.reports import (
    AssignmentReportData,
    ClassReportData,
    ReportGenerateRequest,
    ReportHistoryItem,
    ReportJobResponse,
    ReportPeriod,
    ReportStatusResponse,
    ReportSummaryStats,
    ReportTemplateType,
    SavedReportTemplate,
    SavedReportTemplateCreate,
    StudentReportData,
    TrendAnalysis,
)

# Activity type label mapping (reused from analytics_service)
ACTIVITY_TYPE_LABELS = {
    "dragdroppicture": "Drag & Drop",
    "dragdroppicturegroup": "Categorization",
    "matchTheWords": "Word Matching",
    "puzzleFindWords": "Word Search",
    "circle": "Circle the Answer",
    "markwithx": "Mark with X",
}

# Report storage directory
REPORTS_DIR = Path("generated_reports")


def get_period_dates(
    period: ReportPeriod,
    start_date: str | None = None,
    end_date: str | None = None,
) -> tuple[datetime, datetime, datetime, datetime]:
    """
    Calculate current and previous period date ranges.

    Args:
        period: Report period type
        start_date: Custom start date (ISO format)
        end_date: Custom end date (ISO format)

    Returns:
        Tuple of (current_start, current_end, previous_start, previous_end)
    """
    now = datetime.now(UTC)

    if period == ReportPeriod.CUSTOM and start_date and end_date:
        current_start = datetime.fromisoformat(start_date).replace(tzinfo=UTC)
        current_end = datetime.fromisoformat(end_date).replace(
            hour=23, minute=59, second=59, tzinfo=UTC
        )
        # Previous period is same duration before current_start
        duration = current_end - current_start
        previous_end = current_start - timedelta(days=1)
        previous_start = previous_end - duration
    elif period == ReportPeriod.WEEK:
        current_end = now
        current_start = now - timedelta(days=7)
        previous_end = current_start - timedelta(days=1)
        previous_start = previous_end - timedelta(days=7)
    elif period == ReportPeriod.MONTH:
        current_end = now
        current_start = now - timedelta(days=30)
        previous_end = current_start - timedelta(days=1)
        previous_start = previous_end - timedelta(days=30)
    else:  # SEMESTER
        current_end = now
        current_start = now - timedelta(days=90)
        previous_end = current_start - timedelta(days=1)
        previous_start = previous_end - timedelta(days=90)

    return current_start, current_end, previous_start, previous_end


def calculate_trend(current_value: float, previous_value: float | None) -> TrendAnalysis:
    """
    Calculate trend analysis comparing current to previous period.

    Args:
        current_value: Current period metric value
        previous_value: Previous period metric value (None if no data)

    Returns:
        TrendAnalysis with change percentage and direction
    """
    if previous_value is None or previous_value == 0:
        return TrendAnalysis(
            current=current_value,
            previous=previous_value,
            change=None,
            direction="new",
        )

    change = current_value - previous_value
    percentage = (change / previous_value) * 100

    if abs(percentage) < 1:
        direction = "stable"
    elif percentage > 0:
        direction = "up"
    else:
        direction = "down"

    return TrendAnalysis(
        current=current_value,
        previous=previous_value,
        change=round(percentage, 1),
        direction=direction,
    )


def generate_narrative_summary(
    data: dict,
    report_type: str,
) -> str:
    """
    Generate rule-based narrative summary for a report.

    Args:
        data: Report data dictionary with metrics
        report_type: Type of report (student, class, assignment)

    Returns:
        Human-readable narrative summary
    """
    parts = []

    # Performance direction
    trend = data.get("trend", {})
    if isinstance(trend, TrendAnalysis):
        trend = trend.model_dump()

    if trend.get("direction") == "up":
        parts.append(
            f"Performance improved by {abs(trend.get('change', 0))}% compared to the previous period."
        )
    elif trend.get("direction") == "down":
        parts.append(
            f"Performance decreased by {abs(trend.get('change', 0))}% compared to the previous period."
        )
    elif trend.get("direction") == "stable":
        parts.append("Performance remained stable compared to the previous period.")
    else:
        parts.append("This is the first reporting period with available data.")

    # Activity type insights
    activity_breakdown = data.get("activity_breakdown", [])
    if activity_breakdown:
        # Find best and worst activity types
        sorted_activities = sorted(
            activity_breakdown, key=lambda x: x.get("avg_score", 0), reverse=True
        )
        if sorted_activities:
            best = sorted_activities[0]
            label = best.get("label", best.get("activity_type", "Unknown"))
            parts.append(
                f"Strongest performance was in {label} activities with an average of {best.get('avg_score', 0):.0f}%."
            )

        if len(sorted_activities) > 1:
            worst = sorted_activities[-1]
            label = worst.get("label", worst.get("activity_type", "Unknown"))
            parts.append(
                f"Area for improvement: {label} activities averaged {worst.get('avg_score', 0):.0f}%."
            )

    # Completion rate commentary
    summary = data.get("summary", {})
    if isinstance(summary, ReportSummaryStats):
        summary = summary.model_dump()

    completion_rate = summary.get("completion_rate", 0)
    if completion_rate >= 0.9:
        parts.append("Excellent assignment completion rate.")
    elif completion_rate < 0.7:
        parts.append("Consider encouraging more consistent assignment completion.")

    return " ".join(parts)


async def create_report_job(
    session: AsyncSession,
    teacher_id: uuid.UUID,
    request: ReportGenerateRequest,
) -> ReportJob:
    """
    Create a new report generation job.

    Args:
        session: Database session
        teacher_id: Teacher UUID
        request: Report configuration request

    Returns:
        Created ReportJob
    """
    job = ReportJob(
        teacher_id=teacher_id,
        status=ReportJobStatusEnum.pending.value,  # type: ignore[arg-type]
        report_type=request.report_type.value,  # type: ignore[arg-type]
        template_type=request.template_type.value if request.template_type else None,
        config_json=request.model_dump(mode="json"),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)
    return job


async def get_report_job(
    session: AsyncSession,
    job_id: uuid.UUID,
) -> ReportJob | None:
    """Get report job by ID."""
    result = await session.execute(select(ReportJob).where(ReportJob.id == job_id))
    return result.scalar_one_or_none()


async def update_job_progress(
    session: AsyncSession,
    job: ReportJob,
    progress: int,
    status: ReportJobStatusEnum | None = None,
) -> None:
    """Update job progress percentage and optionally status."""
    job.progress_percentage = progress
    if status:
        job.status = status.value  # type: ignore[assignment]
    session.add(job)
    await session.commit()


async def complete_job(
    session: AsyncSession,
    job: ReportJob,
    file_path: str,
) -> None:
    """Mark job as completed with file path."""
    job.status = ReportJobStatusEnum.completed.value  # type: ignore[assignment]
    job.progress_percentage = 100
    job.file_path = file_path
    job.completed_at = datetime.now(UTC)
    session.add(job)
    await session.commit()


async def fail_job(
    session: AsyncSession,
    job: ReportJob,
    error_message: str,
) -> None:
    """Mark job as failed with error message."""
    job.status = ReportJobStatusEnum.failed.value  # type: ignore[assignment]
    job.error_message = error_message
    job.completed_at = datetime.now(UTC)
    session.add(job)
    await session.commit()


async def get_report_status(
    session: AsyncSession,
    job_id: uuid.UUID,
    teacher_id: uuid.UUID,
) -> ReportStatusResponse | None:
    """
    Get report job status for a teacher.

    Args:
        session: Database session
        job_id: Job UUID
        teacher_id: Teacher UUID (for ownership verification)

    Returns:
        ReportStatusResponse or None if not found/unauthorized
    """
    result = await session.execute(
        select(ReportJob).where(
            ReportJob.id == job_id,
            ReportJob.teacher_id == teacher_id,
        )
    )
    job = result.scalar_one_or_none()

    if not job:
        return None

    download_url = None
    if job.status == ReportJobStatusEnum.completed.value and job.file_path:
        download_url = f"/api/v1/reports/{job.id}/download"

    return ReportStatusResponse(
        job_id=str(job.id),
        status=job.status,
        progress_percentage=job.progress_percentage,
        download_url=download_url,
        error_message=job.error_message,
    )


async def get_report_history(
    session: AsyncSession,
    teacher_id: uuid.UUID,
) -> list[ReportHistoryItem]:
    """
    Get report history for a teacher (last 7 days).

    Args:
        session: Database session
        teacher_id: Teacher UUID

    Returns:
        List of ReportHistoryItem
    """
    now = datetime.now(UTC)
    seven_days_ago = now - timedelta(days=7)

    result = await session.execute(
        select(ReportJob)
        .where(
            ReportJob.teacher_id == teacher_id,
            ReportJob.created_at >= seven_days_ago,
        )
        .order_by(ReportJob.created_at.desc())
    )
    jobs = result.scalars().all()

    history = []
    for job in jobs:
        # Get target name from config
        config = job.config_json or {}
        target_name = "Unknown"

        # Try to get target name based on report type
        # For simplicity, use target_id placeholder; in real implementation, query the actual name
        target_id = config.get("target_id")
        if target_id:
            target_name = f"Target {target_id[:8]}..."

        # Compare using naive datetime since DB stores without timezone
        is_expired = job.expires_at and job.expires_at < now.replace(tzinfo=None)
        download_url = None
        if (
            job.status == ReportJobStatusEnum.completed.value
            and job.file_path
            and not is_expired
        ):
            download_url = f"/api/v1/reports/{job.id}/download"

        template_type = None
        if job.template_type:
            try:
                template_type = ReportTemplateType(job.template_type)
            except ValueError:
                pass

        history.append(
            ReportHistoryItem(
                id=str(job.id),
                job_id=str(job.id),
                report_type=job.report_type,
                template_type=template_type,
                format=ReportFormatEnum(config.get("format", "pdf")),
                target_name=target_name,
                created_at=job.created_at,
                expires_at=job.expires_at or (job.created_at + timedelta(days=7)),
                download_url=download_url,
                is_expired=is_expired,
            )
        )

    return history


async def cleanup_expired_reports(session: AsyncSession) -> int:
    """
    Delete expired reports and their files.

    Args:
        session: Database session

    Returns:
        Number of reports cleaned up
    """
    now = datetime.now(UTC)

    # Compare using naive datetime since DB stores without timezone
    result = await session.execute(
        select(ReportJob).where(ReportJob.expires_at < now.replace(tzinfo=None))
    )
    expired_jobs = result.scalars().all()

    count = 0
    for job in expired_jobs:
        # Delete file if exists
        if job.file_path and os.path.exists(job.file_path):
            try:
                os.remove(job.file_path)
            except OSError:
                pass

        await session.delete(job)
        count += 1

    await session.commit()
    return count


# --- Saved Report Templates ---


async def save_report_template(
    session: AsyncSession,
    teacher_id: uuid.UUID,
    request: SavedReportTemplateCreate,
) -> SavedReportConfig:
    """Save a report configuration as a template."""
    config = SavedReportConfig(
        teacher_id=teacher_id,
        name=request.name,
        config_json=request.config.model_dump(mode="json"),
    )
    session.add(config)
    await session.commit()
    await session.refresh(config)
    return config


async def get_report_templates(
    session: AsyncSession,
    teacher_id: uuid.UUID,
) -> list[SavedReportTemplate]:
    """Get all saved templates for a teacher."""
    result = await session.execute(
        select(SavedReportConfig)
        .where(SavedReportConfig.teacher_id == teacher_id)
        .order_by(SavedReportConfig.created_at.desc())
    )
    configs = result.scalars().all()

    return [
        SavedReportTemplate(
            id=str(config.id),
            name=config.name,
            config=ReportGenerateRequest(**config.config_json),
            created_at=config.created_at,
        )
        for config in configs
    ]


async def delete_report_template(
    session: AsyncSession,
    template_id: uuid.UUID,
    teacher_id: uuid.UUID,
) -> bool:
    """Delete a saved template. Returns True if deleted, False if not found."""
    result = await session.execute(
        select(SavedReportConfig).where(
            SavedReportConfig.id == template_id,
            SavedReportConfig.teacher_id == teacher_id,
        )
    )
    config = result.scalar_one_or_none()

    if not config:
        return False

    await session.delete(config)
    await session.commit()
    return True


# --- Report Data Generation ---


async def generate_student_report_data(
    session: AsyncSession,
    student_id: uuid.UUID,
    current_start: datetime,
    current_end: datetime,
    previous_start: datetime,
    previous_end: datetime,
) -> StudentReportData:
    """
    Generate student report data.

    Args:
        session: Database session
        student_id: Student UUID
        current_start: Current period start date
        current_end: Current period end date
        previous_start: Previous period start date
        previous_end: Previous period end date

    Returns:
        StudentReportData with all metrics
    """
    # Get student info
    student_result = await session.execute(
        select(Student, User, Class)
        .join(User, Student.user_id == User.id)
        .outerjoin(ClassStudent, ClassStudent.student_id == Student.id)
        .outerjoin(Class, ClassStudent.class_id == Class.id)
        .where(Student.id == student_id)
    )
    student_row = student_result.first()

    if not student_row:
        raise ValueError(f"Student not found: {student_id}")

    student, user, class_obj = student_row

    # Query current period completed assignments
    current_assignments = await _get_completed_assignments(
        session, student_id, current_start, current_end
    )

    # Query previous period for trend
    previous_assignments = await _get_completed_assignments(
        session, student_id, previous_start, previous_end
    )

    # Calculate metrics
    current_summary = _calculate_summary(current_assignments)
    previous_avg = (
        sum(a["score"] for a in previous_assignments if a["score"]) / len(previous_assignments)
        if previous_assignments
        else None
    )

    trend = calculate_trend(current_summary.avg_score, previous_avg)

    # Score trend over time
    score_trend = [
        {
            "date": a["completed_at"].date().isoformat(),
            "score": a["score"],
            "assignment_name": a["name"],
        }
        for a in sorted(current_assignments, key=lambda x: x["completed_at"])
        if a["score"] is not None
    ]

    # Activity breakdown
    activity_breakdown = _calculate_activity_breakdown(current_assignments)

    # Format assignments list
    assignments = [
        {
            "name": a["name"],
            "score": a["score"],
            "completed_at": a["completed_at"].isoformat(),
            "time_spent": a["time_spent"],
        }
        for a in current_assignments
    ]

    # Build report data
    data = StudentReportData(
        student_name=user.full_name or user.email,
        student_id=str(student.id),
        class_name=class_obj.name if class_obj else "No Class",
        grade_level=student.grade_level,
        period_start=current_start.date().isoformat(),
        period_end=current_end.date().isoformat(),
        summary=current_summary,
        trend=trend,
        score_trend=score_trend,
        activity_breakdown=activity_breakdown,
        assignments=assignments,
        narrative="",  # Will be generated after
    )

    # Generate narrative
    data.narrative = generate_narrative_summary(data.model_dump(), "student")

    return data


async def generate_class_report_data(
    session: AsyncSession,
    class_id: uuid.UUID,
    current_start: datetime,
    current_end: datetime,
    previous_start: datetime,
    previous_end: datetime,
) -> ClassReportData:
    """
    Generate class report data.

    Args:
        session: Database session
        class_id: Class UUID
        current_start: Current period start date
        current_end: Current period end date
        previous_start: Previous period start date
        previous_end: Previous period end date

    Returns:
        ClassReportData with all metrics
    """
    # Get class info with teacher
    class_result = await session.execute(
        select(Class, Teacher, User)
        .join(Teacher, Class.teacher_id == Teacher.id)
        .join(User, Teacher.user_id == User.id)
        .where(Class.id == class_id)
    )
    class_row = class_result.first()

    if not class_row:
        raise ValueError(f"Class not found: {class_id}")

    class_obj, teacher, teacher_user = class_row

    # Get students in class
    students_result = await session.execute(
        select(Student, User)
        .join(ClassStudent, ClassStudent.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .where(ClassStudent.class_id == class_id)
    )
    students = students_result.all()
    student_ids = [s.id for s, _ in students]

    # Get assignments that have been assigned to students in this class
    # Assignments are linked to students via AssignmentStudent junction table
    assignments_result = await session.execute(
        select(Assignment)
        .distinct()
        .join(AssignmentStudent, AssignmentStudent.assignment_id == Assignment.id)
        .where(
            AssignmentStudent.student_id.in_(student_ids),
            Assignment.created_at >= current_start,
            Assignment.created_at <= current_end,
        )
    )
    assignments = assignments_result.scalars().all()
    assignment_ids = [a.id for a in assignments]

    # Get all student submissions for these assignments
    submissions_result = await session.execute(
        select(AssignmentStudent, Assignment, Activity)
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .join(Activity, Assignment.activity_id == Activity.id)
        .where(
            AssignmentStudent.student_id.in_(student_ids),
            AssignmentStudent.assignment_id.in_(assignment_ids),
            AssignmentStudent.status == AssignmentStatus.completed,
        )
    )
    submissions = submissions_result.all()

    # Calculate class average
    current_scores = [sub.score for sub, _, _ in submissions if sub.score is not None]
    current_avg = sum(current_scores) / len(current_scores) if current_scores else 0

    # Get previous period for trend
    prev_assignments_result = await session.execute(
        select(Assignment.id)
        .distinct()
        .join(AssignmentStudent, AssignmentStudent.assignment_id == Assignment.id)
        .where(
            AssignmentStudent.student_id.in_(student_ids),
            Assignment.created_at >= previous_start,
            Assignment.created_at <= previous_end,
        )
    )
    prev_assignment_ids = [a[0] for a in prev_assignments_result.all()]

    prev_submissions_result = await session.execute(
        select(AssignmentStudent.score)
        .where(
            AssignmentStudent.student_id.in_(student_ids),
            AssignmentStudent.assignment_id.in_(prev_assignment_ids),
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.score.isnot(None),
        )
    )
    prev_scores = [s[0] for s in prev_submissions_result.all()]
    prev_avg = sum(prev_scores) / len(prev_scores) if prev_scores else None

    trend = calculate_trend(current_avg, prev_avg)

    # Completion rate
    total_expected = len(student_ids) * len(assignment_ids) if student_ids and assignment_ids else 1
    completion_rate = len(submissions) / total_expected if total_expected > 0 else 0

    summary = ReportSummaryStats(
        avg_score=round(current_avg, 1),
        total_completed=len(submissions),
        completion_rate=round(completion_rate, 2),
        total_assigned=total_expected,
    )

    # Score distribution
    score_distribution = _calculate_score_distribution(current_scores)

    # Top/struggling students
    student_avgs = {}
    for sub, _, _ in submissions:
        if sub.student_id not in student_avgs:
            student_avgs[sub.student_id] = []
        if sub.score is not None:
            student_avgs[sub.student_id].append(sub.score)

    student_scores = [
        (sid, sum(scores) / len(scores)) for sid, scores in student_avgs.items() if scores
    ]
    student_scores.sort(key=lambda x: x[1], reverse=True)

    # Get student names
    student_names = {s.id: u.full_name or u.email for s, u in students}

    top_students = [
        {"name": student_names.get(sid, "Unknown"), "avg_score": round(avg, 1), "rank": i + 1}
        for i, (sid, avg) in enumerate(student_scores[:5])
    ]

    struggling_students = [
        {
            "name": student_names.get(sid, "Unknown"),
            "avg_score": round(avg, 1),
            "alert_reason": "Low average score" if avg < 70 else "Below class average",
        }
        for sid, avg in student_scores[-5:][::-1]
        if avg < current_avg
    ]

    # Assignment performance
    assignment_perf = []
    for assignment in assignments:
        assignment_subs = [sub for sub, a, _ in submissions if a.id == assignment.id]
        if assignment_subs:
            avg = sum(s.score for s in assignment_subs if s.score) / len(assignment_subs)
            comp_rate = len(assignment_subs) / len(student_ids) if student_ids else 0
            assignment_perf.append({
                "name": assignment.name,
                "avg_score": round(avg, 1),
                "completion_rate": round(comp_rate, 2),
            })

    # Activity breakdown
    activity_breakdown = []
    activity_scores: dict[str, list[int]] = {}
    for sub, _, activity in submissions:
        if sub.score is not None:
            if activity.activity_type not in activity_scores:
                activity_scores[activity.activity_type] = []
            activity_scores[activity.activity_type].append(sub.score)

    for act_type, scores in activity_scores.items():
        activity_breakdown.append({
            "activity_type": act_type,
            "avg_score": round(sum(scores) / len(scores), 1),
            "count": len(scores),
            "label": ACTIVITY_TYPE_LABELS.get(act_type, act_type),
        })

    data = ClassReportData(
        class_name=class_obj.name,
        class_id=str(class_obj.id),
        teacher_name=teacher_user.full_name or teacher_user.email,
        student_count=len(students),
        period_start=current_start.date().isoformat(),
        period_end=current_end.date().isoformat(),
        summary=summary,
        trend=trend,
        score_distribution=score_distribution,
        top_students=top_students,
        struggling_students=struggling_students,
        assignments=assignment_perf,
        activity_breakdown=activity_breakdown,
        narrative="",
    )

    data.narrative = generate_narrative_summary(data.model_dump(), "class")

    return data


async def generate_assignment_report_data(
    session: AsyncSession,
    teacher_id: uuid.UUID,
    current_start: datetime,
    current_end: datetime,
    previous_start: datetime,
    previous_end: datetime,
) -> AssignmentReportData:
    """
    Generate assignment overview report data.

    Args:
        session: Database session
        teacher_id: Teacher UUID
        current_start: Current period start date
        current_end: Current period end date
        previous_start: Previous period start date
        previous_end: Previous period end date

    Returns:
        AssignmentReportData with all metrics
    """
    # Get teacher info
    teacher_result = await session.execute(
        select(Teacher, User)
        .join(User, Teacher.user_id == User.id)
        .where(Teacher.id == teacher_id)
    )
    teacher_row = teacher_result.first()

    if not teacher_row:
        raise ValueError(f"Teacher not found: {teacher_id}")

    teacher, teacher_user = teacher_row

    # Get all assignments for this teacher in current period
    assignments_result = await session.execute(
        select(Assignment, Activity)
        .join(Activity, Assignment.activity_id == Activity.id)
        .where(
            Assignment.teacher_id == teacher_id,
            Assignment.created_at >= current_start,
            Assignment.created_at <= current_end,
        )
    )
    assignments = assignments_result.all()

    # Get submissions for these assignments
    assignment_ids = [a.id for a, _ in assignments]
    submissions_result = await session.execute(
        select(AssignmentStudent)
        .where(
            AssignmentStudent.assignment_id.in_(assignment_ids),
            AssignmentStudent.status == AssignmentStatus.completed,
        )
    )
    submissions = submissions_result.scalars().all()

    # Calculate current metrics
    all_scores = [s.score for s in submissions if s.score is not None]
    current_avg = sum(all_scores) / len(all_scores) if all_scores else 0

    # Get previous period metrics
    prev_assignments_result = await session.execute(
        select(Assignment.id)
        .where(
            Assignment.teacher_id == teacher_id,
            Assignment.created_at >= previous_start,
            Assignment.created_at <= previous_end,
        )
    )
    prev_assignment_ids = [a[0] for a in prev_assignments_result.all()]

    prev_submissions_result = await session.execute(
        select(AssignmentStudent.score)
        .where(
            AssignmentStudent.assignment_id.in_(prev_assignment_ids),
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.score.isnot(None),
        )
    )
    prev_scores = [s[0] for s in prev_submissions_result.all()]
    prev_avg = sum(prev_scores) / len(prev_scores) if prev_scores else None

    trend = calculate_trend(current_avg, prev_avg)

    # Summary
    total_assigned_result = await session.execute(
        select(func.count(AssignmentStudent.id))
        .where(AssignmentStudent.assignment_id.in_(assignment_ids))
    )
    total_assigned = total_assigned_result.scalar_one() or 0

    summary = ReportSummaryStats(
        avg_score=round(current_avg, 1),
        total_completed=len(submissions),
        completion_rate=round(len(submissions) / total_assigned, 2) if total_assigned > 0 else 0,
        total_assigned=total_assigned,
    )

    # Per-assignment metrics
    assignment_metrics = []
    for assignment, activity in assignments:
        assignment_subs = [s for s in submissions if s.assignment_id == assignment.id]
        if assignment_subs:
            scores = [s.score for s in assignment_subs if s.score is not None]
            avg = sum(scores) / len(scores) if scores else 0
            times = [s.time_spent_minutes for s in assignment_subs if s.time_spent_minutes]
            avg_time = sum(times) / len(times) if times else 0

            assigned_count_result = await session.execute(
                select(func.count(AssignmentStudent.id))
                .where(AssignmentStudent.assignment_id == assignment.id)
            )
            assigned_count = assigned_count_result.scalar_one() or 1

            assignment_metrics.append({
                "name": assignment.name,
                "avg_score": round(avg, 1),
                "completion_rate": round(len(assignment_subs) / assigned_count, 2),
                "time_spent": round(avg_time, 1),
                "activity_type": activity.activity_type,
            })

    # Sort for most/least successful
    sorted_by_score = sorted(assignment_metrics, key=lambda x: x["avg_score"], reverse=True)
    most_successful = sorted_by_score[:3]
    least_successful = sorted_by_score[-3:][::-1] if len(sorted_by_score) > 3 else []

    # Activity type comparison
    activity_scores: dict[str, list[int]] = {}
    for assignment, activity in assignments:
        assignment_subs = [s for s in submissions if s.assignment_id == assignment.id]
        for sub in assignment_subs:
            if sub.score is not None:
                if activity.activity_type not in activity_scores:
                    activity_scores[activity.activity_type] = []
                activity_scores[activity.activity_type].append(sub.score)

    activity_comparison = [
        {
            "activity_type": act_type,
            "avg_score": round(sum(scores) / len(scores), 1),
            "count": len(scores),
            "label": ACTIVITY_TYPE_LABELS.get(act_type, act_type),
        }
        for act_type, scores in activity_scores.items()
    ]

    data = AssignmentReportData(
        teacher_name=teacher_user.full_name or teacher_user.email,
        period_start=current_start.date().isoformat(),
        period_end=current_end.date().isoformat(),
        total_assignments=len(assignments),
        summary=summary,
        trend=trend,
        assignments=assignment_metrics,
        activity_type_comparison=activity_comparison,
        most_successful=most_successful,
        least_successful=least_successful,
        narrative="",
    )

    data.narrative = generate_narrative_summary(data.model_dump(), "assignment")

    return data


# --- Helper Functions ---


async def _get_completed_assignments(
    session: AsyncSession,
    student_id: uuid.UUID,
    start_date: datetime,
    end_date: datetime,
) -> list[dict]:
    """Get completed assignments for a student in a date range."""
    result = await session.execute(
        select(AssignmentStudent, Assignment, Activity)
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .join(Activity, Assignment.activity_id == Activity.id)
        .where(
            AssignmentStudent.student_id == student_id,
            AssignmentStudent.status == AssignmentStatus.completed,
            AssignmentStudent.completed_at >= start_date,
            AssignmentStudent.completed_at <= end_date,
        )
    )

    return [
        {
            "id": str(assignment.id),
            "name": assignment.name,
            "score": sub.score,
            "completed_at": sub.completed_at,
            "time_spent": sub.time_spent_minutes or 0,
            "activity_type": activity.activity_type,
        }
        for sub, assignment, activity in result.all()
    ]


def _calculate_summary(assignments: list[dict]) -> ReportSummaryStats:
    """Calculate summary stats from assignment list."""
    scores = [a["score"] for a in assignments if a["score"] is not None]
    avg_score = sum(scores) / len(scores) if scores else 0

    return ReportSummaryStats(
        avg_score=round(avg_score, 1),
        total_completed=len(assignments),
        completion_rate=1.0,  # All passed assignments are completed
        total_assigned=len(assignments),
    )


def _calculate_activity_breakdown(assignments: list[dict]) -> list[dict]:
    """Calculate activity type breakdown from assignment list."""
    breakdown: dict[str, list[int]] = {}

    for a in assignments:
        act_type = a["activity_type"]
        if act_type not in breakdown:
            breakdown[act_type] = []
        if a["score"] is not None:
            breakdown[act_type].append(a["score"])

    return [
        {
            "activity_type": act_type,
            "avg_score": round(sum(scores) / len(scores), 1),
            "count": len(scores),
            "label": ACTIVITY_TYPE_LABELS.get(act_type, act_type),
        }
        for act_type, scores in breakdown.items()
        if scores
    ]


def _calculate_score_distribution(scores: list[int]) -> list[dict]:
    """Calculate score distribution buckets."""
    buckets = [
        {"range_label": "0-59%", "min": 0, "max": 59, "count": 0},
        {"range_label": "60-69%", "min": 60, "max": 69, "count": 0},
        {"range_label": "70-79%", "min": 70, "max": 79, "count": 0},
        {"range_label": "80-89%", "min": 80, "max": 89, "count": 0},
        {"range_label": "90-100%", "min": 90, "max": 100, "count": 0},
    ]

    for score in scores:
        for bucket in buckets:
            if bucket["min"] <= score <= bucket["max"]:
                bucket["count"] += 1
                break

    return buckets


async def process_report_job(
    session: AsyncSession,
    job_id: uuid.UUID,
) -> None:
    """
    Main report processing logic. Called as background task.

    Args:
        session: Database session
        job_id: Report job UUID
    """
    from app.services.pdf_generator import generate_pdf_report
    from app.services.excel_generator import generate_excel_report

    job = await get_report_job(session, job_id)
    if not job:
        return

    # Extract ALL values before any commits to avoid lazy loading issues
    # After session.commit(), the job object becomes expired and accessing
    # attributes triggers lazy loading which fails in async context
    job_id_str = str(job.id)
    config_json = job.config_json
    report_type = job.report_type
    teacher_id = job.teacher_id
    template_type = job.template_type

    try:
        # Update status to processing
        await update_job_progress(session, job, 10, ReportJobStatusEnum.processing)

        config = ReportGenerateRequest(**config_json)

        # Calculate period dates
        current_start, current_end, previous_start, previous_end = get_period_dates(
            config.period, config.start_date, config.end_date
        )

        # Generate report data based on type
        await update_job_progress(session, job, 30)

        if report_type == ReportTypeEnum.student.value:
            report_data = await generate_student_report_data(
                session,
                uuid.UUID(config.target_id),
                current_start,
                current_end,
                previous_start,
                previous_end,
            )
            data_dict = report_data.model_dump()
        elif report_type == ReportTypeEnum.class_.value:
            report_data = await generate_class_report_data(
                session,
                uuid.UUID(config.target_id),
                current_start,
                current_end,
                previous_start,
                previous_end,
            )
            data_dict = report_data.model_dump()
        else:  # ASSIGNMENT
            report_data = await generate_assignment_report_data(
                session,
                teacher_id,
                current_start,
                current_end,
                previous_start,
                previous_end,
            )
            data_dict = report_data.model_dump()

        await update_job_progress(session, job, 60)

        # Ensure reports directory exists
        REPORTS_DIR.mkdir(exist_ok=True)

        # Generate report file
        file_format = config.format.value
        file_name = f"{job_id_str}.{file_format}"
        file_path = REPORTS_DIR / file_name

        await update_job_progress(session, job, 80)

        if config.format.value == ReportFormatEnum.pdf.value:
            generate_pdf_report(
                data_dict,
                report_type,
                template_type,
                str(file_path),
            )
        else:
            generate_excel_report(
                data_dict,
                report_type,
                template_type,
                str(file_path),
            )

        # Mark completed
        await complete_job(session, job, str(file_path))

    except Exception as e:
        await fail_job(session, job, str(e))
        raise
