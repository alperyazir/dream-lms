"""Paginated list response schemas for scaling endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models import SchoolPublic, StudentPublic, SupervisorPublic, TeacherPublic
from app.schemas.assignment import AssignmentListItem
from app.schemas.publisher import PublisherAccountPublic


class StudentListResponse(BaseModel):
    """Paginated response for student list."""

    items: list[StudentPublic]
    total: int
    limit: int
    offset: int
    has_more: bool


class TeacherListResponse(BaseModel):
    """Paginated response for teacher list."""

    items: list[TeacherPublic]
    total: int
    limit: int
    offset: int
    has_more: bool


class SchoolListResponse(BaseModel):
    """Paginated response for school list."""

    items: list[SchoolPublic]
    total: int
    limit: int
    offset: int
    has_more: bool


class SupervisorListResponse(BaseModel):
    """Paginated response for supervisor list."""

    items: list[SupervisorPublic]
    total: int
    limit: int
    offset: int
    has_more: bool


class PublisherAccountPaginatedResponse(BaseModel):
    """Paginated response for publisher account list."""

    items: list[PublisherAccountPublic]
    total: int
    limit: int
    offset: int
    has_more: bool


class AssignmentListPaginatedResponse(BaseModel):
    """Paginated response for teacher assignment list."""

    items: list[AssignmentListItem]
    total: int
    limit: int
    offset: int
    has_more: bool


class PublisherStudentItem(BaseModel):
    """Lightweight student item for publisher views."""

    id: uuid.UUID
    user_id: uuid.UUID
    user_full_name: str
    user_email: str | None
    user_username: str
    grade_level: str | None
    school_name: str
    classroom_count: int
    created_at: datetime


class PublisherStudentListResponse(BaseModel):
    """Paginated response for publisher student list."""

    items: list[PublisherStudentItem]
    total: int
    limit: int
    offset: int
    has_more: bool
