"""
Teacher Material Service for Story 27.15 - Teacher Materials Processing.

Provides operations for teacher material management with AI text processing.
"""

import logging
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, UploadFile, status
from sqlmodel import Session, select

from app.models import (
    MaterialType,
    TeacherGeneratedContent,
    TeacherMaterial,
)
from app.schemas.teacher_material import (
    TeacherGeneratedContentCreate,
    TeacherGeneratedContentResponse,
    TeacherMaterialResponse,
    TeacherMaterialUploadResponse,
    TextExtractionResult,
    TextMaterialCreate,
)
from app.services.dream_storage_client import (
    DreamCentralStorageClient,
    DreamStorageError,
)
from app.services.material_service import (
    check_quota,
    get_or_create_quota,
    sanitize_filename_for_storage,
    update_quota_usage,
    validate_file_content,
)
from app.services.pdf_processing_service import (
    PDFProcessingService,
    get_pdf_processing_service,
)


logger = logging.getLogger(__name__)


class TeacherMaterialService:
    """Service for managing teacher materials with AI processing capabilities."""

    def __init__(
        self,
        storage_client: DreamCentralStorageClient,
        pdf_service: PDFProcessingService | None = None,
    ):
        self.storage = storage_client
        self.pdf_service = pdf_service or get_pdf_processing_service()

    async def upload_pdf(
        self,
        file: UploadFile,
        name: str,
        teacher_id: uuid.UUID,
        session: Session,
        description: str | None = None,
    ) -> TeacherMaterialUploadResponse:
        """
        Upload a PDF and extract text for AI processing.

        Args:
            file: Uploaded PDF file
            name: Display name for the material
            teacher_id: Teacher's UUID
            session: Database session
            description: Optional description

        Returns:
            TeacherMaterialUploadResponse with material and extraction result

        Raises:
            HTTPException: On validation or processing errors
        """
        # Validate file type
        if file.content_type not in ["application/pdf", "application/x-pdf"]:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Only PDF files are supported",
            )

        # Read file content
        content = await file.read()
        await file.seek(0)
        file_size = len(content)

        # Check quota
        check_quota(session, teacher_id, file_size)

        # Validate file content
        validate_file_content(content, file.filename or "upload.pdf")

        # Extract text from PDF
        extraction_result = await self.pdf_service.process_pdf(file)

        # Generate storage path
        material_id = uuid.uuid4()
        safe_filename = sanitize_filename_for_storage(file.filename)
        storage_path = f"materials/{teacher_id}/{material_id}/{safe_filename}"

        # Upload to storage
        try:
            await file.seek(0)
            await self.storage.upload_teacher_material(
                teacher_id=str(teacher_id),
                material_id=str(material_id),
                filename=safe_filename,
                content=content,
                content_type=file.content_type,
            )
        except DreamStorageError as e:
            logger.error(f"Failed to upload material to storage: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file to storage",
            )

        # Create database record
        material = TeacherMaterial(
            id=material_id,
            teacher_id=teacher_id,
            name=name,
            type=MaterialType.document,
            storage_path=storage_path,
            file_size=file_size,
            mime_type=file.content_type,
            original_filename=file.filename,
            extracted_text=extraction_result.extracted_text,
            word_count=extraction_result.word_count,
            language=extraction_result.language,
        )
        session.add(material)

        # Update quota
        update_quota_usage(session, teacher_id, file_size)

        session.commit()
        session.refresh(material)

        return TeacherMaterialUploadResponse(
            material=TeacherMaterialResponse.from_material(material),
            extraction=extraction_result,
        )

    async def create_from_text(
        self,
        data: TextMaterialCreate,
        teacher_id: uuid.UUID,
        session: Session,
    ) -> TeacherMaterialUploadResponse:
        """
        Create material from pasted text.

        Args:
            data: Text material creation data
            teacher_id: Teacher's UUID
            session: Database session

        Returns:
            TeacherMaterialUploadResponse with material and extraction result
        """
        # Process the text
        extraction_result = await self.pdf_service.process_text_input(data.text)

        # Create database record
        material = TeacherMaterial(
            teacher_id=teacher_id,
            name=data.name,
            type=MaterialType.text_note,
            text_content=data.text,
            extracted_text=extraction_result.extracted_text,
            word_count=extraction_result.word_count,
            language=extraction_result.language,
        )
        session.add(material)
        session.commit()
        session.refresh(material)

        return TeacherMaterialUploadResponse(
            material=TeacherMaterialResponse.from_material(material),
            extraction=extraction_result,
        )

    def get_materials(
        self,
        teacher_id: uuid.UUID,
        session: Session,
        processable_only: bool = False,
    ) -> list[TeacherMaterial]:
        """
        Get all materials for a teacher.

        CRITICAL: Only returns materials owned by the specified teacher (isolation).

        Args:
            teacher_id: Teacher's UUID
            session: Database session
            processable_only: If True, only return materials with extracted_text

        Returns:
            List of TeacherMaterial records
        """
        query = select(TeacherMaterial).where(
            TeacherMaterial.teacher_id == teacher_id
        )

        if processable_only:
            query = query.where(TeacherMaterial.extracted_text.isnot(None))

        query = query.order_by(TeacherMaterial.created_at.desc())

        return list(session.exec(query).all())

    def get_material(
        self,
        material_id: uuid.UUID,
        teacher_id: uuid.UUID,
        session: Session,
    ) -> TeacherMaterial:
        """
        Get a specific material by ID.

        CRITICAL: Verifies ownership (teacher can only access own materials).

        Args:
            material_id: Material UUID
            teacher_id: Teacher's UUID
            session: Database session

        Returns:
            TeacherMaterial record

        Raises:
            HTTPException: If material not found or not owned by teacher
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

        return material

    async def delete_material(
        self,
        material_id: uuid.UUID,
        teacher_id: uuid.UUID,
        session: Session,
    ) -> bool:
        """
        Delete a material and its stored file.

        Args:
            material_id: Material UUID
            teacher_id: Teacher's UUID
            session: Database session

        Returns:
            True if deleted successfully
        """
        material = self.get_material(material_id, teacher_id, session)

        # Delete from storage if it's a file
        if material.storage_path:
            try:
                await self.storage.delete_teacher_material(
                    teacher_id=str(teacher_id),
                    material_id=str(material_id),
                )
            except DreamStorageError as e:
                logger.warning(f"Failed to delete material from storage: {e}")
                # Continue with database deletion anyway

        # Update quota if file had size
        if material.file_size:
            update_quota_usage(session, teacher_id, -material.file_size)

        # Delete from database
        session.delete(material)
        session.commit()

        return True

    # =========================================================================
    # Generated Content Methods
    # =========================================================================

    def save_generated_content(
        self,
        data: TeacherGeneratedContentCreate,
        session: Session,
    ) -> TeacherGeneratedContent:
        """
        Save generated AI content to teacher's library.

        Args:
            data: Generated content creation data
            session: Database session

        Returns:
            Created TeacherGeneratedContent record
        """
        content = TeacherGeneratedContent(
            teacher_id=data.teacher_id,
            material_id=data.material_id,
            book_id=data.book_id,
            activity_type=data.activity_type,
            title=data.title,
            content=data.content,
        )
        session.add(content)
        session.commit()
        session.refresh(content)
        return content

    def get_generated_content_list(
        self,
        teacher_id: uuid.UUID,
        session: Session,
        activity_type: str | None = None,
    ) -> list[TeacherGeneratedContent]:
        """
        Get all generated content for a teacher.

        CRITICAL: Only returns content owned by the specified teacher (isolation).

        Args:
            teacher_id: Teacher's UUID
            session: Database session
            activity_type: Optional filter by activity type

        Returns:
            List of TeacherGeneratedContent records
        """
        query = select(TeacherGeneratedContent).where(
            TeacherGeneratedContent.teacher_id == teacher_id
        )

        if activity_type:
            query = query.where(TeacherGeneratedContent.activity_type == activity_type)

        query = query.order_by(TeacherGeneratedContent.created_at.desc())

        return list(session.exec(query).all())

    def get_generated_content(
        self,
        content_id: uuid.UUID,
        teacher_id: uuid.UUID,
        session: Session,
    ) -> TeacherGeneratedContent:
        """
        Get a specific generated content by ID.

        Args:
            content_id: Content UUID
            teacher_id: Teacher's UUID
            session: Database session

        Returns:
            TeacherGeneratedContent record

        Raises:
            HTTPException: If not found or not owned by teacher
        """
        content = session.exec(
            select(TeacherGeneratedContent).where(
                TeacherGeneratedContent.id == content_id,
                TeacherGeneratedContent.teacher_id == teacher_id,
            )
        ).first()

        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Generated content not found",
            )

        return content

    def delete_generated_content(
        self,
        content_id: uuid.UUID,
        teacher_id: uuid.UUID,
        session: Session,
    ) -> bool:
        """
        Delete generated content.

        Args:
            content_id: Content UUID
            teacher_id: Teacher's UUID
            session: Database session

        Returns:
            True if deleted successfully
        """
        content = self.get_generated_content(content_id, teacher_id, session)

        # Check if content is used in an assignment
        if content.is_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete content that is used in an assignment",
            )

        session.delete(content)
        session.commit()

        return True

    def mark_content_as_used(
        self,
        content_id: uuid.UUID,
        assignment_id: uuid.UUID,
        teacher_id: uuid.UUID,
        session: Session,
    ) -> TeacherGeneratedContent:
        """
        Mark generated content as used in an assignment.

        Args:
            content_id: Content UUID
            assignment_id: Assignment UUID
            teacher_id: Teacher's UUID
            session: Database session

        Returns:
            Updated TeacherGeneratedContent record
        """
        content = self.get_generated_content(content_id, teacher_id, session)
        content.is_used = True
        content.assignment_id = assignment_id
        session.add(content)
        session.commit()
        session.refresh(content)
        return content
