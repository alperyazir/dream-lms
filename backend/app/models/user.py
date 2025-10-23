"""
User model and UserRole enum for authentication and authorization.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserRole(enum.Enum):
    """User role enumeration for role-based access control."""

    admin = "admin"
    publisher = "publisher"
    teacher = "teacher"
    student = "student"


class User(Base):
    """
    User model for all system users (admin, publisher, teacher, student).
    Role-based polymorphism with separate role-specific tables.
    """

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships to role-specific tables
    publisher = relationship(
        "Publisher", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    teacher = relationship(
        "Teacher", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    student = relationship(
        "Student", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation for debugging."""
        return f"<User(id={self.id}, email='{self.email}', role={self.role.value})>"
