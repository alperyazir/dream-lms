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
]
