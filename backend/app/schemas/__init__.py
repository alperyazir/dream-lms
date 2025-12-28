"""Pydantic schemas for API requests and responses."""

from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentListResponse,
    AssignmentResponse,
    AssignmentStudentResponse,
    AssignmentWithTeacher,
)
from app.schemas.benchmarks import (
    ActivityTypeBenchmark,
    ActivityTypeStat,
    AdminBenchmarkOverview,
    BenchmarkData,
    BenchmarkMessage,
    BenchmarkSettings,
    BenchmarkSettingsResponse,
    BenchmarkSettingsUpdate,
    BenchmarkTrendPoint,
    ClassBenchmarkResponse,
    ClassMetrics,
    SchoolBenchmarkSummary,
)
from app.schemas.book import (
    ActivityDetailResponse,
    ActivityResponse,
    BookDetailResponse,
    BookListResponse,
    BookResponse,
    BookSyncResponse,
)
from app.schemas.reports import (
    ReportFormat,
    ReportGenerateRequest,
    ReportHistoryItem,
    ReportHistoryResponse,
    ReportJobResponse,
    ReportJobStatus,
    ReportPeriod,
    ReportStatusResponse,
    ReportTemplateType,
    ReportType,
    SavedReportTemplate,
    SavedReportTemplateCreate,
)

__all__ = [
    # Assignment schemas
    "AssignmentCreate",
    "AssignmentListResponse",
    "AssignmentResponse",
    "AssignmentStudentResponse",
    "AssignmentWithTeacher",
    # Book schemas
    "ActivityDetailResponse",
    "ActivityResponse",
    "BookDetailResponse",
    "BookListResponse",
    "BookResponse",
    "BookSyncResponse",
    # Report schemas
    "ReportFormat",
    "ReportGenerateRequest",
    "ReportHistoryItem",
    "ReportHistoryResponse",
    "ReportJobResponse",
    "ReportJobStatus",
    "ReportPeriod",
    "ReportStatusResponse",
    "ReportTemplateType",
    "ReportType",
    "SavedReportTemplate",
    "SavedReportTemplateCreate",
    # Benchmark schemas
    "ActivityTypeBenchmark",
    "AdminBenchmarkOverview",
    "BenchmarkData",
    "BenchmarkMessage",
    "BenchmarkSettings",
    "BenchmarkSettingsResponse",
    "BenchmarkSettingsUpdate",
    "BenchmarkTrendPoint",
    "ClassBenchmarkResponse",
    "ClassMetrics",
    "SchoolBenchmarkSummary",
    "ActivityTypeStat",
]
