"""Assignment scheduling service - Story 9.6."""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.models import (
    Assignment,
    AssignmentPublishStatus,
)

logger = logging.getLogger(__name__)


@dataclass
class PublishResult:
    """Result of the publish_scheduled_assignments operation."""

    assignments_published: int


async def publish_scheduled_assignments(db: AsyncSession, arq_pool: object | None = None) -> PublishResult:
    """
    Publish scheduled assignments whose publish date has passed.

    This function:
    1. Queries assignments with status='scheduled' and scheduled_publish_date <= now
    2. Updates their status to 'published'

    Should be called periodically (e.g., every hour or once daily).

    Args:
        db: Database session

    Returns:
        PublishResult with count of published assignments
    """
    now = datetime.now(UTC)
    assignments_published = 0

    # Query scheduled assignments that should be published
    result = await db.execute(
        select(Assignment)
        .where(Assignment.status == AssignmentPublishStatus.scheduled)
        .where(Assignment.scheduled_publish_date <= now)
        .options(selectinload(Assignment.assignment_students))
    )
    assignments = result.scalars().all()

    if not assignments:
        logger.info("No scheduled assignments ready to publish")
        return PublishResult(assignments_published=0)

    logger.info(f"Found {len(assignments)} scheduled assignments to publish")

    for assignment in assignments:
        # Update status to published
        assignment.status = AssignmentPublishStatus.published
        assignment.updated_at = now
        assignments_published += 1

        logger.info(f"Published assignment {assignment.id}: {assignment.name}")

    await db.commit()

    logger.info(f"Scheduler complete: published {assignments_published} assignments")

    return PublishResult(assignments_published=assignments_published)
