"""Benchmarking schemas for class performance comparison - Story 5.7.

[Source: Story 5.7 - Performance Comparison & Benchmarking]
Provides schemas for comparing class performance against school/publisher averages
with proper anonymization (minimum 5 classes required for benchmark display).
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Benchmark Level Types
BenchmarkLevel = Literal["school", "publisher"]
BenchmarkPeriod = Literal["weekly", "monthly", "semester", "all"]


class BenchmarkData(BaseModel):
    """Aggregated benchmark data for a level (school or publisher).

    [Source: Story 5.7 AC: 2, 4, 5, 7]
    """

    level: BenchmarkLevel
    average_score: float = Field(ge=0, le=100, description="Average score as percentage")
    completion_rate: float = Field(ge=0, le=100, description="Completion rate as percentage")
    sample_size: int = Field(ge=0, description="Number of classes in benchmark")
    period: BenchmarkPeriod
    is_available: bool = Field(
        default=True, description="False if < 5 classes threshold not met"
    )


class ActivityTypeBenchmark(BaseModel):
    """Performance comparison for a specific activity type.

    [Source: Story 5.7 AC: 5]
    Compares class performance against benchmark for each activity type.
    """

    activity_type: str
    activity_label: str  # User-friendly label (e.g., "Word Matching")
    class_average: float = Field(ge=0, le=100)
    benchmark_average: float = Field(ge=0, le=100)
    difference_percent: float = Field(
        description="Positive = class is above benchmark, negative = below"
    )


class BenchmarkTrendPoint(BaseModel):
    """Single data point in benchmark trend over time.

    [Source: Story 5.7 AC: 3]
    """

    period: str  # e.g., "2025-W01" for weekly, "2025-01" for monthly
    period_label: str  # e.g., "Week 1", "January"
    class_average: float
    school_benchmark: float | None = None
    publisher_benchmark: float | None = None


class ClassMetrics(BaseModel):
    """Current class performance metrics.

    [Source: Story 5.7 AC: 2]
    """

    class_id: str
    class_name: str
    average_score: float = Field(ge=0, le=100)
    completion_rate: float = Field(ge=0, le=100)
    total_assignments: int
    active_students: int


class BenchmarkMessage(BaseModel):
    """Encouraging or constructive message based on performance.

    [Source: Story 5.7 AC: 10, 11]
    """

    type: Literal["excelling", "above_average", "at_average", "below_average", "needs_focus"]
    title: str
    description: str
    icon: str  # e.g., "trophy", "star", "chart-up", "target"
    focus_area: str | None = None  # Activity type that needs attention


class ClassBenchmarkResponse(BaseModel):
    """Complete benchmark comparison response for a class.

    [Source: Story 5.7 AC: 2, 3, 5, 7, 10, 11]
    """

    class_metrics: ClassMetrics
    school_benchmark: BenchmarkData | None = Field(
        default=None, description="None if disabled or threshold not met"
    )
    publisher_benchmark: BenchmarkData | None = Field(
        default=None, description="None if disabled or threshold not met"
    )
    activity_benchmarks: list[ActivityTypeBenchmark] = Field(default_factory=list)
    comparison_over_time: list[BenchmarkTrendPoint] = Field(default_factory=list)
    message: BenchmarkMessage | None = None
    benchmarking_enabled: bool = True
    disabled_reason: str | None = None  # e.g., "Disabled by school", "Not enough data"


class BenchmarkSettings(BaseModel):
    """Benchmark enable/disable settings.

    [Source: Story 5.7 AC: 9]
    """

    benchmarking_enabled: bool = True


class BenchmarkSettingsUpdate(BaseModel):
    """Request to update benchmark settings.

    [Source: Story 5.7 AC: 9]
    """

    benchmarking_enabled: bool


class BenchmarkSettingsResponse(BaseModel):
    """Response after updating benchmark settings.

    [Source: Story 5.7 AC: 9]
    """

    entity_type: Literal["school", "publisher"]
    entity_id: str
    benchmarking_enabled: bool
    updated_at: datetime


# Admin Benchmark Overview Schemas


class SchoolBenchmarkSummary(BaseModel):
    """Summary of a school's benchmark status for admin view.

    [Source: Story 5.7 AC: 12]
    """

    school_id: str
    school_name: str
    benchmarking_enabled: bool
    class_count: int
    average_score: float | None = None  # None if not enough data
    performance_status: Literal["above_average", "average", "below_average"] | None = None


class ActivityTypeStat(BaseModel):
    """System-wide statistics for an activity type.

    [Source: Story 5.7 AC: 12]
    """

    activity_type: str
    activity_label: str
    system_average: float
    total_completions: int


class AdminBenchmarkOverview(BaseModel):
    """System-wide benchmark overview for admin dashboard.

    [Source: Story 5.7 AC: 12]
    """

    total_schools: int
    schools_with_benchmarking: int
    schools_above_average: int
    schools_at_average: int
    schools_below_average: int
    system_average_score: float
    activity_type_stats: list[ActivityTypeStat]
    school_summaries: list[SchoolBenchmarkSummary]
    last_calculated: datetime
