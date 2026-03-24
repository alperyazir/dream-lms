"""Pydantic schemas for platform-wide analytics endpoints."""

from pydantic import BaseModel


class ActiveUserCounts(BaseModel):
    students: int
    teachers: int
    total: int


class TrendPoint(BaseModel):
    date: str  # ISO date "YYYY-MM-DD"
    count: int


class PlatformUsageResponse(BaseModel):
    dau: ActiveUserCounts
    wau: ActiveUserCounts
    mau: ActiveUserCounts
    login_trend: list[TrendPoint]
    new_registrations: list[TrendPoint]


class ActivityTypeMetric(BaseModel):
    activity_type: str
    completion_rate: float
    average_score: float
    count: int


class AssignmentMetricsResponse(BaseModel):
    total_assignments: int
    assignment_trend: list[TrendPoint]
    completion_rate: float
    average_score: float
    by_activity_type: list[ActivityTypeMetric]
    top_performing: list[ActivityTypeMetric]
    bottom_performing: list[ActivityTypeMetric]


class AITypeBreakdown(BaseModel):
    activity_type: str
    count: int


class AIUsageResponse(BaseModel):
    total_generations: int
    generation_trend: list[TrendPoint]
    by_activity_type: list[AITypeBreakdown]
    most_frequent_type: str | None
