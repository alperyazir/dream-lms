"""Analytics schemas for student performance data - Stories 5.1, 5.2, 5.3, 5.4."""

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel


# Student Info
class StudentInfo(BaseModel):
    """Basic student information for analytics display."""

    id: str
    name: str
    photo_url: str | None = None


# Summary Metrics
class AnalyticsSummary(BaseModel):
    """Aggregated summary metrics for a student."""

    avg_score: float
    total_completed: int
    completion_rate: float
    current_streak: int


# Recent Activity Item
class RecentActivityItem(BaseModel):
    """Single recent assignment completion."""

    assignment_id: str
    assignment_name: str
    score: int
    completed_at: datetime
    time_spent_minutes: int


# Performance Trend Data Point
class PerformanceTrendPoint(BaseModel):
    """Single data point in performance trend chart."""

    date: str  # ISO date format: YYYY-MM-DD
    score: int


# Activity Type Breakdown
class ActivityBreakdownItem(BaseModel):
    """Performance breakdown by activity type."""

    activity_type: str
    avg_score: float
    count: int


# Status Summary
class StatusSummary(BaseModel):
    """Counts of assignments by status."""

    not_started: int
    in_progress: int
    completed: int
    past_due: int


# Time Analytics
class TimeAnalytics(BaseModel):
    """Time-based performance metrics."""

    avg_time_per_assignment: float
    total_time_this_week: int
    total_time_this_month: int


# Complete Analytics Response
class StudentAnalyticsResponse(BaseModel):
    """Complete student analytics data response."""

    student: StudentInfo
    summary: AnalyticsSummary
    recent_activity: list[RecentActivityItem]
    performance_trend: list[PerformanceTrendPoint]
    activity_breakdown: list[ActivityBreakdownItem]
    status_summary: StatusSummary
    time_analytics: TimeAnalytics


# Period type for date range filtering
PeriodType = Literal["7d", "30d", "3m", "all"]

# Class analytics period type (academic periods)
ClassPeriodType = Literal["weekly", "monthly", "semester", "ytd"]


# --- Class Analytics Schemas (Story 5.2) ---


class ClassAnalyticsSummary(BaseModel):
    """Aggregated summary metrics for a class."""

    avg_score: float
    completion_rate: float
    total_assignments: int
    active_students: int


class ScoreDistributionBucket(BaseModel):
    """Single bucket in score distribution histogram."""

    range_label: str  # e.g., "0-59%", "60-69%"
    min_score: int
    max_score: int
    count: int


class StudentLeaderboardItem(BaseModel):
    """Student entry in leaderboard."""

    student_id: str
    name: str
    avg_score: float
    rank: int


class StrugglingStudentItem(BaseModel):
    """Student flagged as struggling."""

    student_id: str
    name: str
    avg_score: float
    past_due_count: int
    alert_reason: str  # e.g., "Low average score", "Multiple past due assignments"


class AssignmentPerformanceItem(BaseModel):
    """Performance metrics for a single assignment."""

    assignment_id: str
    name: str
    avg_score: float
    completion_rate: float
    avg_time_spent: float  # minutes


class ActivityTypePerformanceItem(BaseModel):
    """Performance breakdown by activity type."""

    activity_type: str
    avg_score: float
    count: int


class TrendData(BaseModel):
    """Trend analysis for a metric."""

    metric_name: str
    current_value: float
    previous_value: float
    change_percent: float
    trend: Literal["up", "down", "stable"]


class ClassAnalyticsResponse(BaseModel):
    """Complete class analytics data response."""

    class_id: str
    class_name: str
    summary: ClassAnalyticsSummary
    score_distribution: list[ScoreDistributionBucket]
    leaderboard: list[StudentLeaderboardItem]
    struggling_students: list[StrugglingStudentItem]
    assignment_performance: list[AssignmentPerformanceItem]
    activity_type_performance: list[ActivityTypePerformanceItem]
    trends: list[TrendData]


# --- Assignment Detailed Results Schemas (Story 5.3) ---


class CompletionOverview(BaseModel):
    """Completion status counts for an assignment."""

    completed: int
    in_progress: int
    not_started: int
    past_due: int
    total: int


class ScoreStatistics(BaseModel):
    """Score statistics for an assignment."""

    avg_score: float
    median_score: float
    highest_score: int
    lowest_score: int


class StudentResultItem(BaseModel):
    """Individual student's result for an assignment."""

    student_id: str
    name: str
    status: str
    score: int | None
    time_spent_minutes: int
    completed_at: datetime | None
    has_feedback: bool = False


class AnswerDistributionItem(BaseModel):
    """Distribution of answers for a single option."""

    option: str
    count: int
    percentage: float
    is_correct: bool


class QuestionAnalysis(BaseModel):
    """Analysis of a single question/item."""

    question_id: str
    question_text: str
    correct_percentage: float
    total_responses: int
    answer_distribution: list[AnswerDistributionItem]


class MostMissedQuestion(BaseModel):
    """A question that was frequently missed."""

    question_id: str
    question_text: str
    correct_percentage: float
    common_wrong_answer: str | None


class WordMatchingError(BaseModel):
    """Common incorrect word pair mappings."""

    word: str
    correct_match: str
    common_incorrect_match: str
    error_count: int


class FillInBlankAnalysis(BaseModel):
    """Analysis for a fill-in-blank item."""

    blank_id: str
    blank_context: str
    correct_answer: str
    correct_rate: float
    common_wrong_answers: list[str]


class WordSearchAnalysis(BaseModel):
    """Analysis for word search activity."""

    word: str
    find_rate: float
    found_count: int
    total_attempts: int


class ActivityTypeAnalysis(BaseModel):
    """Activity-type specific analysis results."""

    activity_type: str
    questions: list[QuestionAnalysis] | None = None
    most_missed: list[MostMissedQuestion] | None = None
    word_matching_errors: list[WordMatchingError] | None = None
    fill_in_blank: list[FillInBlankAnalysis] | None = None
    word_search: list[WordSearchAnalysis] | None = None


class StudentAnswersResponse(BaseModel):
    """Individual student's full answers for an assignment."""

    student_id: str
    name: str
    status: str
    score: int | None
    time_spent_minutes: int
    started_at: datetime | None
    completed_at: datetime | None
    answers_json: dict[str, Any] | None


class AssignmentDetailedResultsResponse(BaseModel):
    """Complete detailed results for an assignment."""

    assignment_id: str
    assignment_name: str
    activity_type: str
    due_date: datetime | None
    completion_overview: CompletionOverview
    score_statistics: ScoreStatistics | None
    student_results: list[StudentResultItem]
    question_analysis: ActivityTypeAnalysis | None


# --- Teacher Insights Schemas (Story 5.4) ---


class InsightType(str, Enum):
    """Types of teacher insights."""

    STRUGGLING_TOPIC = "struggling_topic"
    COMMON_MISCONCEPTION = "common_misconception"
    TIME_MANAGEMENT = "time_management"
    REVIEW_RECOMMENDED = "review_recommended"
    STRUGGLING_STUDENTS = "struggling_students"
    ACTIVITY_TYPE_STRUGGLE = "activity_type_struggle"


class InsightSeverity(str, Enum):
    """Severity levels for insights."""

    MODERATE = "moderate"
    CRITICAL = "critical"


class InsightCard(BaseModel):
    """Summary card for a detected insight."""

    id: str
    type: InsightType
    severity: InsightSeverity
    title: str
    description: str
    affected_count: int
    recommended_action: str
    created_at: datetime


class AffectedStudent(BaseModel):
    """Student affected by an insight."""

    student_id: str
    name: str
    relevant_metric: str  # e.g., "Score: 45%", "3 past due"


class RelatedAssignment(BaseModel):
    """Assignment related to an insight."""

    assignment_id: str
    name: str
    avg_score: float
    completion_rate: float


class RelatedQuestion(BaseModel):
    """Question related to an insight (for misconceptions)."""

    question_id: str
    question_text: str
    incorrect_percentage: float
    common_wrong_answer: str | None


class InsightDetail(BaseModel):
    """Detailed view of an insight with affected items."""

    insight: InsightCard
    affected_students: list[AffectedStudent]
    related_assignments: list[RelatedAssignment]
    related_questions: list[RelatedQuestion] | None = None


class TeacherInsightsResponse(BaseModel):
    """Response containing all teacher insights."""

    insights: list[InsightCard]
    last_refreshed: datetime


class DismissInsightRequest(BaseModel):
    """Request to dismiss an insight."""

    insight_id: str


# --- Student Progress Schemas (Story 5.5) ---


class ImprovementTrend(str, Enum):
    """Trend of student improvement."""

    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"


class StudentProgressStats(BaseModel):
    """Overall student progress statistics."""

    total_completed: int
    avg_score: float
    current_streak: int
    streak_start_date: str | None  # ISO date format: YYYY-MM-DD
    improvement_trend: ImprovementTrend


class ActivityTypeScore(BaseModel):
    """Student's average score for an activity type."""

    activity_type: str
    avg_score: float
    total_completed: int
    label: str  # User-friendly label (e.g., "Word Matching" instead of "matchTheWords")


class ScoreTrendPoint(BaseModel):
    """Data point for score trend chart."""

    date: str  # ISO date format: YYYY-MM-DD
    score: int
    assignment_name: str


class ProgressRecentAssignment(BaseModel):
    """Recent assignment for student progress view."""

    id: str
    name: str
    score: int
    completed_at: datetime
    has_feedback: bool
    activity_type: str
    book_title: str


class Achievement(BaseModel):
    """Student achievement/badge."""

    id: str
    type: str  # e.g., "perfect_score", "streak_7", "first_complete"
    title: str
    description: str
    earned_at: datetime
    icon: str  # Icon identifier (e.g., "star", "flame", "trophy")


class StudyTimeStats(BaseModel):
    """Study time statistics."""

    this_week_minutes: int
    this_month_minutes: int
    avg_per_assignment: float


# Period type for student progress
StudentProgressPeriod = Literal["this_week", "this_month", "all_time"]


class StudentProgressResponse(BaseModel):
    """Complete student progress response."""

    stats: StudentProgressStats
    score_trend: list[ScoreTrendPoint]
    activity_breakdown: list[ActivityTypeScore]
    recent_assignments: list[ProgressRecentAssignment]
    achievements: list[Achievement]
    study_time: StudyTimeStats
    improvement_tips: list[str]
