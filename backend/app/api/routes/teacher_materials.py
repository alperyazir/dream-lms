"""
Teacher Materials API endpoints for Story 13.1.

Provides endpoints for teachers to manage their personal materials:
- Upload files (documents, images, audio, video)
- Create text notes and URL links
- List, update, delete materials
- Download/stream files
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.rate_limit import limiter
from app.models import MaterialType, Teacher, TeacherMaterial
from app.schemas.material import (
    MaterialListResponse,
    MaterialResponse,
    MaterialUpdate,
    PresignedUrlResponse,
    StorageQuotaResponse,
    TextNoteCreate,
    TextNoteUpdate,
    UploadResponse,
    UrlLinkCreate,
)
from app.services.dream_storage_client import (
    DreamCentralStorageClient,
    DreamStorageError,
    DreamStorageNotFoundError,
    get_dream_storage_client,
)
from app.services.material_service import (
    check_quota,
    get_or_create_quota,
    get_teacher_material,
    material_to_response,
    quota_to_response,
    sanitize_filename,
    update_quota_usage,
    validate_and_categorize_file,
    validate_file_content,
)

router = APIRouter(prefix="/teachers/materials", tags=["teacher-materials"])


# =============================================================================
# Helper: Get Teacher ID from Current User
# =============================================================================


def get_teacher_id(session: SessionDep, current_user: CurrentUser) -> uuid.UUID:
    """
    Get teacher ID from current user.

    Raises HTTPException if user is not a teacher.
    """
    teacher = session.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can manage materials",
        )

    return teacher.id


# =============================================================================
# Upload Endpoints
# =============================================================================


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file",
    description="Upload a file to teacher's personal storage (Rate limited: 30 uploads/hour)",
)
@limiter.limit("30/hour")
async def upload_material(
    request: Request,  # noqa: ARG001 - Required by slowapi rate limiter
    *,
    session: SessionDep,
    current_user: CurrentUser,
    dcs_client: DreamCentralStorageClient = Depends(get_dream_storage_client),
    file: UploadFile = File(...),
) -> UploadResponse:
    """
    Upload a file to teacher's personal storage.

    Supported file types:
    - Documents: PDF, TXT, DOCX (max 100MB)
    - Images: JPG, PNG, GIF, WEBP (max 100MB)
    - Audio: MP3, WAV, OGG, M4A (max 100MB)
    - Video: MP4, WEBM, MOV (max 100MB)

    Returns 413 if quota exceeded or file too large.
    Returns 415 if file type not supported.
    """
    teacher_id = get_teacher_id(session, current_user)

    # Validate file type and get category
    material_type = validate_and_categorize_file(file)

    # Read file content
    file_content = await file.read()
    file_size = len(file_content)

    # Validate content is not malicious
    validate_file_content(file_content, file.filename or "")

    # Check quota
    quota = check_quota(session, teacher_id, file_size)

    # Upload to DCS
    try:
        storage_path = await dcs_client.upload_teacher_material(
            teacher_id=str(teacher_id),
            file_content=file_content,
            filename=file.filename or "untitled",
            content_type=file.content_type or "application/octet-stream",
            material_type=material_type.value,
        )
    except DreamStorageError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to upload file to storage: {str(e)}",
        )

    # Create material record
    material = TeacherMaterial(
        teacher_id=teacher_id,
        name=sanitize_filename(file.filename),
        type=material_type,
        storage_path=storage_path,
        file_size=file_size,
        mime_type=file.content_type,
        original_filename=file.filename,
    )
    session.add(material)

    # Update quota
    quota = update_quota_usage(session, teacher_id, file_size)

    session.commit()
    session.refresh(material)

    return UploadResponse(
        material=material_to_response(material),
        quota=quota_to_response(quota),
    )


# =============================================================================
# Text Note Endpoints
# =============================================================================


@router.post(
    "/notes",
    response_model=MaterialResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a text note",
)
async def create_text_note(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    data: TextNoteCreate,
) -> MaterialResponse:
    """
    Create a text note material (stored in database, no DCS upload).

    Text notes have a 50KB limit for content.
    """
    teacher_id = get_teacher_id(session, current_user)

    material = TeacherMaterial(
        teacher_id=teacher_id,
        name=data.name,
        type=MaterialType.text_note,
        text_content=data.content,
    )
    session.add(material)
    session.commit()
    session.refresh(material)

    return material_to_response(material)


@router.put(
    "/notes/{material_id}",
    response_model=MaterialResponse,
    summary="Update a text note",
)
async def update_text_note(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    material_id: uuid.UUID,
    data: TextNoteUpdate,
) -> MaterialResponse:
    """
    Update text note name and/or content.
    """
    teacher_id = get_teacher_id(session, current_user)
    material = get_teacher_material(session, material_id, teacher_id)

    if material.type != MaterialType.text_note:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint is only for text notes",
        )

    if data.name is not None:
        material.name = data.name
    if data.content is not None:
        material.text_content = data.content

    material.updated_at = datetime.now(UTC)
    session.add(material)
    session.commit()
    session.refresh(material)

    return material_to_response(material)


# =============================================================================
# URL Link Endpoints
# =============================================================================


@router.post(
    "/urls",
    response_model=MaterialResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a URL link",
)
async def create_url_link(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    data: UrlLinkCreate,
) -> MaterialResponse:
    """
    Create a URL link material (stored in database, no DCS upload).
    """
    teacher_id = get_teacher_id(session, current_user)

    material = TeacherMaterial(
        teacher_id=teacher_id,
        name=data.name,
        type=MaterialType.url,
        url=data.url,
    )
    session.add(material)
    session.commit()
    session.refresh(material)

    return material_to_response(material)


# =============================================================================
# List/Get Endpoints
# =============================================================================


@router.get(
    "",
    response_model=MaterialListResponse,
    summary="List teacher's materials",
)
async def list_materials(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    type: MaterialType | None = None,
) -> MaterialListResponse:
    """
    List all materials for the current teacher.

    Optionally filter by type (document, image, audio, video, url, text_note).
    """
    teacher_id = get_teacher_id(session, current_user)

    # Build query
    query = select(TeacherMaterial).where(TeacherMaterial.teacher_id == teacher_id)
    if type:
        query = query.where(TeacherMaterial.type == type)
    query = query.order_by(TeacherMaterial.created_at.desc())

    materials = session.exec(query).all()
    quota = get_or_create_quota(session, teacher_id)

    return MaterialListResponse(
        materials=[material_to_response(m) for m in materials],
        total_count=len(materials),
        quota=quota_to_response(quota),
    )


@router.get(
    "/quota",
    response_model=StorageQuotaResponse,
    summary="Get storage quota",
)
async def get_quota(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> StorageQuotaResponse:
    """
    Get current storage quota information.
    """
    teacher_id = get_teacher_id(session, current_user)
    quota = get_or_create_quota(session, teacher_id)
    return quota_to_response(quota)


@router.get(
    "/{material_id}",
    response_model=MaterialResponse,
    summary="Get material details",
)
async def get_material(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    material_id: uuid.UUID,
) -> MaterialResponse:
    """
    Get details for a specific material.
    """
    teacher_id = get_teacher_id(session, current_user)
    material = get_teacher_material(session, material_id, teacher_id)
    return material_to_response(material)


@router.get(
    "/{material_id}/presigned-url",
    response_model=PresignedUrlResponse,
    summary="Get presigned URL for direct file access",
)
async def get_presigned_url(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    dcs_client: DreamCentralStorageClient = Depends(get_dream_storage_client),
    material_id: uuid.UUID,
    expires_minutes: int = 60,
) -> PresignedUrlResponse:
    """
    Get a presigned URL for direct browser access to a material file.

    This URL can be used in iframes, img tags, audio/video elements, etc.
    without requiring authentication headers.

    The URL expires after the specified minutes (default 60, max 1440).
    """
    teacher_id = get_teacher_id(session, current_user)
    material = get_teacher_material(session, material_id, teacher_id)

    if material.type in [MaterialType.url, MaterialType.text_note]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URLs and text notes do not have presigned URLs",
        )

    if not material.storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material file not found in storage",
        )

    try:
        result = await dcs_client.get_teacher_material_presigned_url(
            teacher_id=str(teacher_id),
            storage_path=material.storage_path,
            expires_minutes=min(expires_minutes, 1440),
        )
        return PresignedUrlResponse(
            url=result["url"],
            expires_in_seconds=result.get("expires_in_seconds", expires_minutes * 60),
            content_type=material.mime_type,
        )
    except DreamStorageNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage",
        )
    except DreamStorageError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to get presigned URL: {str(e)}",
        )


# =============================================================================
# Update/Delete Endpoints
# =============================================================================


@router.patch(
    "/{material_id}",
    response_model=MaterialResponse,
    summary="Update material name",
)
async def update_material(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    material_id: uuid.UUID,
    data: MaterialUpdate,
) -> MaterialResponse:
    """
    Update material metadata (currently only name).
    """
    teacher_id = get_teacher_id(session, current_user)
    material = get_teacher_material(session, material_id, teacher_id)

    material.name = data.name
    material.updated_at = datetime.now(UTC)
    session.add(material)
    session.commit()
    session.refresh(material)

    return material_to_response(material)


@router.delete(
    "/{material_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a material",
)
async def delete_material(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    dcs_client: DreamCentralStorageClient = Depends(get_dream_storage_client),
    material_id: uuid.UUID,
) -> None:
    """
    Delete a material and its stored file (if any).

    Updates quota usage after deletion.
    """
    teacher_id = get_teacher_id(session, current_user)
    material = get_teacher_material(session, material_id, teacher_id)

    # Delete from DCS if it's a file type
    if material.storage_path:
        try:
            await dcs_client.delete_teacher_material(
                teacher_id=str(teacher_id),
                storage_path=material.storage_path,
            )
        except DreamStorageNotFoundError:
            # File already gone, proceed with DB cleanup
            pass
        except DreamStorageError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to delete file from storage: {str(e)}",
            )

    # Update quota if file had size
    if material.file_size:
        update_quota_usage(session, teacher_id, -material.file_size)

    # Delete record
    session.delete(material)
    session.commit()


# =============================================================================
# Download/Stream Endpoints
# =============================================================================


@router.get(
    "/{material_id}/download",
    summary="Download a material file",
)
async def download_material(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    dcs_client: DreamCentralStorageClient = Depends(get_dream_storage_client),
    material_id: uuid.UUID,
) -> StreamingResponse:
    """
    Download the file for a material.

    Only works for file-based materials (document, image, audio, video).
    """
    teacher_id = get_teacher_id(session, current_user)
    material = get_teacher_material(session, material_id, teacher_id)

    if material.type in [MaterialType.url, MaterialType.text_note]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URLs and text notes cannot be downloaded",
        )

    if not material.storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material file not found in storage",
        )

    try:
        content = await dcs_client.download_teacher_material(
            teacher_id=str(teacher_id),
            storage_path=material.storage_path,
        )
    except DreamStorageNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage",
        )
    except DreamStorageError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to download file: {str(e)}",
        )

    # Prepare filename for Content-Disposition
    filename = material.original_filename or material.name
    safe_filename = filename.replace('"', "'").replace("\n", " ")

    return StreamingResponse(
        iter([content]),
        media_type=material.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Content-Length": str(len(content)),
        },
    )


@router.get(
    "/{material_id}/stream",
    summary="Stream a media file",
)
async def stream_material(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    request: Request,
    dcs_client: DreamCentralStorageClient = Depends(get_dream_storage_client),
    material_id: uuid.UUID,
) -> StreamingResponse:
    """
    Stream audio/video file with range request support.

    Supports HTTP Range headers for seeking in media players.
    """
    teacher_id = get_teacher_id(session, current_user)
    material = get_teacher_material(session, material_id, teacher_id)

    if material.type not in [MaterialType.audio, MaterialType.video]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only audio and video files can be streamed",
        )

    if not material.storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material file not found in storage",
        )

    # Get file size
    file_size = material.file_size
    if not file_size:
        try:
            file_size = await dcs_client.get_teacher_material_size(
                teacher_id=str(teacher_id),
                storage_path=material.storage_path,
            )
        except DreamStorageError:
            file_size = 0

    # Parse Range header
    range_header = request.headers.get("Range")
    start = 0
    end = file_size - 1 if file_size > 0 else None

    if range_header:
        try:
            range_spec = range_header.replace("bytes=", "")
            parts = range_spec.split("-")
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if len(parts) > 1 and parts[1] else (file_size - 1 if file_size else None)
        except (ValueError, IndexError):
            pass

    # Stream from DCS
    async def generate():
        try:
            async for chunk in dcs_client.stream_teacher_material(
                teacher_id=str(teacher_id),
                storage_path=material.storage_path,
                start=start,
                end=end,
            ):
                yield chunk
        except DreamStorageError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Streaming failed: {str(e)}",
            )

    # Calculate content length
    content_length = (end - start + 1) if end is not None else None

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": material.mime_type or "application/octet-stream",
    }

    if file_size and end is not None:
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
        if content_length:
            headers["Content-Length"] = str(content_length)

    status_code = 206 if range_header else 200

    return StreamingResponse(
        generate(),
        status_code=status_code,
        headers=headers,
    )
