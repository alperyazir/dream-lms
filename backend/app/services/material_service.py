"""
Material service helpers for Story 13.1 - Teacher Storage Infrastructure.

Provides file validation, quota management, and response conversion utilities.
"""

import mimetypes
import uuid

from fastapi import HTTPException, UploadFile, status
from sqlmodel import Session, select

from app.models import MaterialType, TeacherMaterial, TeacherStorageQuota
from app.schemas.material import MaterialResponse, StorageQuotaResponse

# =============================================================================
# File Type Validation
# =============================================================================

# Allowed MIME types by category
ALLOWED_MIME_TYPES: dict[MaterialType, list[str]] = {
    MaterialType.document: [
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    MaterialType.image: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    ],
    MaterialType.audio: [
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/mp4",
        "audio/x-m4a",
        "audio/m4a",
    ],
    MaterialType.video: [
        "video/mp4",
        "video/webm",
        "video/quicktime",
    ],
}

# Max file size: 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB in bytes


def validate_and_categorize_file(file: UploadFile) -> MaterialType:
    """
    Validate file type and return category.

    Args:
        file: Uploaded file

    Returns:
        MaterialType: Category for the file

    Raises:
        HTTPException: If file type not allowed (415) or too large (413)
    """
    # Check file size
    if file.size is not None and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds 100MB limit. File is {file.size / 1024 / 1024:.1f}MB",
        )

    # Get MIME type
    mime_type = file.content_type

    # Also check by extension as fallback
    if not mime_type or mime_type == "application/octet-stream":
        guessed_type, _ = mimetypes.guess_type(file.filename or "")
        if guessed_type:
            mime_type = guessed_type

    # Find matching category
    for material_type, allowed_types in ALLOWED_MIME_TYPES.items():
        if mime_type and mime_type.lower() in [t.lower() for t in allowed_types]:
            return material_type

    # Not found in any category
    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail=f"File type '{mime_type}' is not supported. Allowed types: "
        f"documents (PDF, TXT, DOCX), images (JPG, PNG, GIF, WEBP), "
        f"audio (MP3, WAV, OGG, M4A), video (MP4, WEBM, MOV)",
    )


def validate_file_content(file_content: bytes, filename: str) -> None:
    """
    Basic malicious file detection.

    Args:
        file_content: File bytes
        filename: Original filename

    Raises:
        HTTPException: If file appears malicious (400)
    """
    # Check for common script signatures in first bytes
    dangerous_signatures = [
        b"<script",
        b"<?php",
        b"<%",
        b"#!/",
    ]

    first_bytes = file_content[:100].lower()
    for sig in dangerous_signatures:
        if sig in first_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content appears to be malicious or executable",
            )

    # Check for dangerous extensions in filename
    dangerous_extensions = [".exe", ".bat", ".cmd", ".sh", ".php", ".js", ".html", ".htm"]
    lower_filename = (filename or "").lower()
    for ext in dangerous_extensions:
        if lower_filename.endswith(ext):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '{ext}' is not allowed",
            )


# =============================================================================
# Quota Management
# =============================================================================


def get_or_create_quota(session: Session, teacher_id: uuid.UUID) -> TeacherStorageQuota:
    """
    Get or create storage quota record for teacher.

    Args:
        session: Database session
        teacher_id: Teacher's UUID

    Returns:
        TeacherStorageQuota record
    """
    quota = session.exec(
        select(TeacherStorageQuota).where(TeacherStorageQuota.teacher_id == teacher_id)
    ).first()

    if not quota:
        quota = TeacherStorageQuota(teacher_id=teacher_id)
        session.add(quota)
        session.flush()

    return quota


def check_quota(session: Session, teacher_id: uuid.UUID, file_size: int) -> TeacherStorageQuota:
    """
    Check if teacher has enough quota for upload.

    Args:
        session: Database session
        teacher_id: Teacher's UUID
        file_size: Size of file to upload in bytes

    Returns:
        TeacherStorageQuota record

    Raises:
        HTTPException: If quota exceeded (413)
    """
    quota = get_or_create_quota(session, teacher_id)

    if quota.used_bytes + file_size > quota.quota_bytes:
        available = quota.quota_bytes - quota.used_bytes
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Storage quota exceeded. Available: {available / 1024 / 1024:.1f}MB, "
            f"Required: {file_size / 1024 / 1024:.1f}MB. Delete some materials to free up space.",
        )

    return quota


def update_quota_usage(
    session: Session, teacher_id: uuid.UUID, bytes_delta: int
) -> TeacherStorageQuota:
    """
    Update quota usage by delta (positive for add, negative for delete).

    Args:
        session: Database session
        teacher_id: Teacher's UUID
        bytes_delta: Change in bytes (positive or negative)

    Returns:
        Updated TeacherStorageQuota record
    """
    quota = get_or_create_quota(session, teacher_id)
    quota.used_bytes = max(0, quota.used_bytes + bytes_delta)
    session.add(quota)
    return quota


# =============================================================================
# Material Access Helpers
# =============================================================================


def get_teacher_material(
    session: Session,
    material_id: uuid.UUID,
    teacher_id: uuid.UUID,
) -> TeacherMaterial:
    """
    Get material ensuring ownership.

    Args:
        session: Database session
        material_id: Material UUID
        teacher_id: Teacher's UUID (for ownership verification)

    Returns:
        TeacherMaterial record

    Raises:
        HTTPException: If not found (404)
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


# =============================================================================
# Response Converters
# =============================================================================


def quota_to_response(quota: TeacherStorageQuota) -> StorageQuotaResponse:
    """
    Convert quota model to response schema.

    Args:
        quota: TeacherStorageQuota model

    Returns:
        StorageQuotaResponse schema
    """
    used_percentage = (quota.used_bytes / quota.quota_bytes) * 100 if quota.quota_bytes > 0 else 0

    return StorageQuotaResponse(
        used_bytes=quota.used_bytes,
        quota_bytes=quota.quota_bytes,
        used_percentage=round(used_percentage, 2),
        is_warning=used_percentage >= 80,
        is_full=used_percentage >= 100,
    )


def material_to_response(material: TeacherMaterial) -> MaterialResponse:
    """
    Convert material model to response schema.

    Args:
        material: TeacherMaterial model

    Returns:
        MaterialResponse schema
    """
    # Generate download URL for file types
    download_url = None
    if material.type not in [MaterialType.url, MaterialType.text_note]:
        download_url = f"/api/v1/teachers/materials/{material.id}/download"

    return MaterialResponse(
        id=material.id,
        name=material.name,
        type=material.type,
        file_size=material.file_size,
        mime_type=material.mime_type,
        original_filename=material.original_filename,
        url=material.url,
        text_content=material.text_content,
        created_at=material.created_at,
        updated_at=material.updated_at,
        download_url=download_url,
    )


def sanitize_filename(filename: str | None) -> str:
    """
    Sanitize filename for display purposes.

    Args:
        filename: Original filename or None

    Returns:
        Sanitized filename
    """
    if not filename:
        return "untitled"

    # Remove path separators
    filename = filename.replace("/", "_").replace("\\", "_")

    # Limit length
    if len(filename) > 200:
        name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
        filename = name[:190] + ("." + ext if ext else "")

    return filename or "untitled"


def sanitize_filename_for_storage(filename: str | None) -> str:
    """
    Sanitize filename for cloud storage (DCS).

    Converts Unicode characters to ASCII-safe alternatives to avoid issues
    with URL encoding and storage system bugs. This function should be used
    when uploading files to DCS.

    The original filename is preserved in the database for display purposes.

    Args:
        filename: Original filename or None

    Returns:
        ASCII-safe filename suitable for storage paths

    Examples:
        >>> sanitize_filename_for_storage("yağız yazır.MOV")
        'yagiz_yazir.MOV'
        >>> sanitize_filename_for_storage("test file.pdf")
        'test_file.pdf'
    """
    import os
    import re
    import unicodedata

    if not filename:
        return "untitled"

    # Turkish-specific character mappings (before NFD normalization)
    # These characters don't decompose nicely with NFD
    turkish_map = {
        "ğ": "g",
        "Ğ": "G",
        "ı": "i",
        "İ": "I",
        "ş": "s",
        "Ş": "S",
        "ç": "c",
        "Ç": "C",
        "ö": "o",
        "Ö": "O",
        "ü": "u",
        "Ü": "U",
    }

    # Apply Turkish mappings first
    for turkish_char, ascii_char in turkish_map.items():
        filename = filename.replace(turkish_char, ascii_char)

    # Normalize to NFD (decomposed) to separate base chars from diacritics
    normalized = unicodedata.normalize("NFD", filename)

    # Remove combining diacritical marks (accents, etc.)
    # This converts remaining accented chars like é -> e, ñ -> n, etc.
    ascii_chars = []
    for char in normalized:
        if unicodedata.category(char) != "Mn":  # Mn = Mark, Nonspacing
            ascii_chars.append(char)
    filename = "".join(ascii_chars)

    # Encode to ASCII, replacing non-ASCII chars
    try:
        filename = filename.encode("ascii", "ignore").decode("ascii")
    except UnicodeError:
        pass

    # Replace spaces and other problematic characters with underscores
    filename = re.sub(r"[^\w\-\.]", "_", filename)

    # Replace consecutive underscores with single underscore
    filename = re.sub(r"_+", "_", filename)

    # Remove leading/trailing underscores
    filename = filename.strip("_")

    # Preserve extension - handle edge case where filename starts with dot
    # (e.g., ".txt" from fully stripped non-Latin names)
    name, ext = os.path.splitext(filename)

    # If name starts with dot and has no extension, it's likely a stripped filename
    # like ".txt" where splitext treats the whole thing as name
    if name.startswith(".") and not ext and len(name) > 1:
        # Treat the dot-prefixed part as extension
        ext = name
        name = ""

    # Limit length
    if len(name) > 100:
        name = name[:100]

    # Ensure we have something
    if not name:
        name = "file"

    return f"{name}{ext}" if ext else name
