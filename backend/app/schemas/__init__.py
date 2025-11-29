"""Pydantic schemas for API requests and responses."""

from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentResponse,
    AssignmentStudentResponse,
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
from app.schemas.benchmarks import (
    ActivityTypeBenchmark,
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
    ActivityTypeStat,
)

__all__ = [
    # Assignment schemas
    "AssignmentCreate",
    "AssignmentResponse",
    "AssignmentStudentResponse",
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
