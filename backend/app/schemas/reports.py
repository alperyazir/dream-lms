"""Report schemas for time-based reporting and trend analysis - Story 5.6."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

# --- Enums (Task 1.1 - 1.5) ---


class ReportType(str, Enum):
    """Type of report to generate."""

    STUDENT = "student"
    CLASS = "class"
    ASSIGNMENT = "assignment"


class ReportFormat(str, Enum):
    """Output format for generated reports."""

    PDF = "pdf"
    EXCEL = "excel"


class ReportPeriod(str, Enum):
    """Time period for report data."""

    WEEK = "week"
    MONTH = "month"
    SEMESTER = "semester"
    CUSTOM = "custom"


class ReportTemplateType(str, Enum):
    """Predefined report template types."""

    WEEKLY_CLASS_SUMMARY = "weekly_class_summary"
    STUDENT_PROGRESS_REPORT = "student_progress_report"
    MONTHLY_ASSIGNMENT_OVERVIEW = "monthly_assignment_overview"
    PARENT_TEACHER_CONFERENCE = "parent_teacher_conference"


class ReportJobStatus(str, Enum):
    """Status of a report generation job."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# --- Request Schemas (Task 1.6) ---


class ReportGenerateRequest(BaseModel):
    """Request to generate a new report."""

    report_type: ReportType
    period: ReportPeriod
    start_date: str | None = Field(
        None, description="ISO date for custom period start (YYYY-MM-DD)"
    )
    end_date: str | None = Field(
        None, description="ISO date for custom period end (YYYY-MM-DD)"
    )
    target_id: str = Field(..., description="UUID of target (student, class, or None for assignment)")
    format: ReportFormat
    template_type: ReportTemplateType | None = Field(
        None, description="Optional predefined template to use"
    )


# --- Response Schemas (Task 1.7 - 1.11) ---


class ReportJobResponse(BaseModel):
    """Response after initiating report generation."""

    job_id: str
    status: ReportJobStatus
    created_at: datetime
    estimated_completion: datetime | None = None


class ReportStatusResponse(BaseModel):
    """Response for checking report job status."""

    job_id: str
    status: ReportJobStatus
    progress_percentage: int = Field(ge=0, le=100)
    download_url: str | None = None
    error_message: str | None = None


class SavedReportTemplate(BaseModel):
    """A saved report configuration template."""

    id: str
    name: str
    config: ReportGenerateRequest
    created_at: datetime


class SavedReportTemplateCreate(BaseModel):
    """Request to save a report configuration as a template."""

    name: str = Field(..., min_length=1, max_length=255)
    config: ReportGenerateRequest


class ReportHistoryItem(BaseModel):
    """A previously generated report in history."""

    id: str
    job_id: str
    report_type: ReportType
    template_type: ReportTemplateType | None
    format: ReportFormat
    target_name: str
    created_at: datetime
    expires_at: datetime
    download_url: str | None = None
    is_expired: bool = False


class ReportHistoryResponse(BaseModel):
    """Response containing report history list."""

    reports: list[ReportHistoryItem]


# --- Internal Data Schemas (for report generation) ---


class TrendAnalysis(BaseModel):
    """Trend analysis comparing current to previous period."""

    current: float
    previous: float | None
    change: float | None = Field(None, description="Percentage change")
    direction: str = Field(
        "new", description="Direction: 'up', 'down', 'stable', or 'new'"
    )


class ReportSummaryStats(BaseModel):
    """Summary statistics for a report."""

    avg_score: float
    total_completed: int
    completion_rate: float
    total_assigned: int


class StudentReportData(BaseModel):
    """Data structure for student report content."""

    student_name: str
    student_id: str
    class_name: str
    grade_level: str | None
    period_start: str
    period_end: str
    summary: ReportSummaryStats
    trend: TrendAnalysis
    score_trend: list[dict]  # [{date, score, assignment_name}]
    skill_breakdown: list[dict]  # [{skill_name, avg_score, count}]
    assignments: list[dict]  # [{name, score, completed_at, time_spent}]
    narrative: str
    # Kept for backward compat - will be empty
    activity_breakdown: list[dict] = []


class ClassReportData(BaseModel):
    """Data structure for class report content."""

    class_name: str
    class_id: str
    teacher_name: str
    student_count: int
    period_start: str
    period_end: str
    summary: ReportSummaryStats
    trend: TrendAnalysis
    score_distribution: list[dict]  # [{range_label, count}]
    top_students: list[dict]  # [{name, avg_score, rank}]
    struggling_students: list[dict]  # [{name, avg_score, alert_reason}]
    assignments: list[dict]  # [{name, avg_score, completion_rate}]
    skill_breakdown: list[dict]  # [{skill_name, avg_score, count}]
    narrative: str
    # Kept for backward compat - will be empty
    activity_breakdown: list[dict] = []


class AssignmentReportData(BaseModel):
    """Data structure for assignment overview report content."""

    teacher_name: str
    period_start: str
    period_end: str
    total_assignments: int
    summary: ReportSummaryStats
    trend: TrendAnalysis
    assignments: list[dict]  # [{name, avg_score, completion_rate, time_spent, activity_type}]
    activity_type_comparison: list[dict]  # [{activity_type, avg_score, count}]
    most_successful: list[dict]  # Top 3 highest scoring assignments
    least_successful: list[dict]  # Bottom 3 lowest scoring assignments
    narrative: str
