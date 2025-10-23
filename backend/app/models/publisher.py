"""
Publisher model for content publishers in the system.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Publisher(Base):
    """
    Publisher model representing content publishers.
    Linked to User model with role=publisher.
    """

    __tablename__ = "publishers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    contact_email = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="publisher")
    schools = relationship("School", back_populates="publisher", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        """String representation for debugging."""
        return f"<Publisher(id={self.id}, name='{self.name}')>"
