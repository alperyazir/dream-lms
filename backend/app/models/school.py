"""
School model for educational institutions.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class School(Base):
    """
    School model representing educational institutions.
    Belongs to a Publisher and has many Teachers.
    """

    __tablename__ = "schools"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    publisher_id = Column(
        UUID(as_uuid=True),
        ForeignKey("publishers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    address = Column(Text)
    contact_info = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    publisher = relationship("Publisher", back_populates="schools")
    teachers = relationship("Teacher", back_populates="school", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        """String representation for debugging."""
        return f"<School(id={self.id}, name='{self.name}')>"
