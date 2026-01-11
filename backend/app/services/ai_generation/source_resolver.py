"""
Source Resolver for AI Generation - Story 27.15.

Resolves content sources (book or teacher material) for AI generation.
This utility enables AI generation services to work with both book content
and teacher-uploaded materials.
"""

import logging
import uuid
from dataclasses import dataclass
from typing import Literal

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import TeacherMaterial
from app.schemas.teacher_material import MaterialSourceSelection


logger = logging.getLogger(__name__)


@dataclass
class ResolvedSource:
    """Resolved content source for AI generation."""

    source_type: Literal["book", "material"]
    book_id: int | None = None
    material_id: uuid.UUID | None = None
    teacher_id: uuid.UUID | None = None

    # Content fields
    text_content: str | None = None  # Extracted text for AI processing
    word_count: int | None = None
    language: str | None = None

    # Metadata for reference
    source_name: str = ""  # Book title or material name


class SourceResolverError(Exception):
    """Exception raised when source resolution fails."""

    def __init__(self, message: str, source_type: str, source_id: str | None = None):
        self.message = message
        self.source_type = source_type
        self.source_id = source_id
        super().__init__(self.message)


class SourceResolver:
    """
    Resolves content sources for AI generation.

    Enables AI generation services to work with both:
    - Book content (fetched from DCS)
    - Teacher materials (from extracted_text field)
    """

    async def resolve_material(
        self,
        material_id: uuid.UUID,
        teacher_id: uuid.UUID,
        session: Session,
    ) -> ResolvedSource:
        """
        Resolve a teacher material as AI generation source.

        CRITICAL: Verifies ownership - teacher can only use their own materials.

        Args:
            material_id: Material UUID
            teacher_id: Teacher's UUID (for ownership verification)
            session: Database session

        Returns:
            ResolvedSource with material text content

        Raises:
            HTTPException: If material not found, not owned, or not processable
        """
        # Fetch material with ownership check
        material = session.exec(
            select(TeacherMaterial).where(
                TeacherMaterial.id == material_id,
                TeacherMaterial.teacher_id == teacher_id,
            )
        ).first()

        if not material:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Material not found or you don't have access to it",
            )

        # Check if material has extracted text
        if not material.extracted_text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Material has no extracted text for AI processing. "
                "Please upload a PDF with text content or paste text directly.",
            )

        return ResolvedSource(
            source_type="material",
            material_id=material_id,
            teacher_id=teacher_id,
            text_content=material.extracted_text,
            word_count=material.word_count,
            language=material.language,
            source_name=material.name,
        )

    def get_material_text(
        self,
        material_id: uuid.UUID,
        teacher_id: uuid.UUID,
        session: Session,
    ) -> str:
        """
        Get extracted text from a teacher material.

        Synchronous version for services that don't need full resolution.

        Args:
            material_id: Material UUID
            teacher_id: Teacher's UUID
            session: Database session

        Returns:
            Extracted text content

        Raises:
            HTTPException: If material not found or not processable
        """
        material = session.exec(
            select(TeacherMaterial).where(
                TeacherMaterial.id == material_id,
                TeacherMaterial.teacher_id == teacher_id,
            )
        ).first()

        if not material:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Material not found",
            )

        if not material.extracted_text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Material has no extracted text for AI processing",
            )

        return material.extracted_text


# Singleton instance
_resolver_instance: SourceResolver | None = None


def get_source_resolver() -> SourceResolver:
    """Get or create the source resolver instance."""
    global _resolver_instance
    if _resolver_instance is None:
        _resolver_instance = SourceResolver()
    return _resolver_instance
