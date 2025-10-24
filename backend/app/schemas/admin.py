"""
Admin schemas for dashboard statistics and user management.
Defines Pydantic models for admin endpoints.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


# Dashboard Stats
class DashboardStats(BaseModel):
    """Dashboard statistics response schema."""

    total_publishers: int
    total_schools: int
    total_teachers: int
    total_students: int


# Publisher Schemas
class PublisherCreate(BaseModel):
    """Publisher creation request schema."""

    name: str
    contact_email: Optional[EmailStr] = None


class PublisherUpdate(BaseModel):
    """Publisher update request schema (partial updates)."""

    name: Optional[str] = None
    contact_email: Optional[EmailStr] = None


class PublisherResponse(BaseModel):
    """Publisher response schema with relationships."""

    id: UUID
    user_id: UUID
    name: str
    contact_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # User email from relationship
    email: str
    is_active: bool

    class Config:
        """Pydantic configuration."""

        from_attributes = True


# School Schemas
class SchoolCreate(BaseModel):
    """School creation request schema."""

    name: str
    publisher_id: UUID
    address: Optional[str] = None
    contact_info: Optional[str] = None


class SchoolUpdate(BaseModel):
    """School update request schema (partial updates)."""

    name: Optional[str] = None
    publisher_id: Optional[UUID] = None
    address: Optional[str] = None
    contact_info: Optional[str] = None


class SchoolResponse(BaseModel):
    """School response schema with publisher details."""

    id: UUID
    name: str
    publisher_id: UUID
    address: Optional[str] = None
    contact_info: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Publisher name from relationship
    publisher_name: str

    class Config:
        """Pydantic configuration."""

        from_attributes = True


# Teacher List Response
class TeacherListResponse(BaseModel):
    """Teacher list response with school and publisher info."""

    id: UUID
    user_id: UUID
    email: str
    is_active: bool
    school_id: UUID
    school_name: str
    publisher_id: UUID
    publisher_name: str
    subject_specialization: Optional[str] = None
    created_at: datetime

    class Config:
        """Pydantic configuration."""

        from_attributes = True


# Student List Response
class StudentListResponse(BaseModel):
    """Student list response with school/teacher associations."""

    id: UUID
    user_id: UUID
    email: str
    is_active: bool
    grade_level: Optional[str] = None
    parent_email: Optional[str] = None
    created_at: datetime

    class Config:
        """Pydantic configuration."""

        from_attributes = True


# Pagination Response
class PaginationMeta(BaseModel):
    """Pagination metadata."""

    page: int
    per_page: int
    total: int
    total_pages: int
    next_page: Optional[int] = None
    prev_page: Optional[int] = None
