"""
Teacher Materials API endpoints for Stories 13.1 and 27.15.

Provides endpoints for teachers to manage their personal materials:
- Upload files (documents, images, audio, video)
- Create text notes and URL links
- List, update, delete materials
- Download/stream files
- Upload PDFs with text extraction for AI (Story 27.15)
- Manage AI-generated content library (Story 27.15)
"""

import uuid
from datetime import UTC, datetime
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session, select

from app.api.deps import CurrentUser, SessionDep, get_db
from app.core import security
from app.core.config import settings
from app.core.rate_limit import limiter
from app.models import (
    MaterialType,
    Teacher,
    TeacherGeneratedContent,
    TeacherMaterial,
    TokenPayload,
    User,
)
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
from app.schemas.teacher_material import (
    TeacherGeneratedContentListResponse,
    TeacherGeneratedContentResponse,
    TeacherMaterialListResponse,
    TeacherMaterialResponse,
    TeacherMaterialUploadResponse,
    TextMaterialCreate,
)
from app.services.pdf_processing_service import (
    get_pdf_processing_service,
    PDFProcessingService,
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
    sanitize_filename_for_storage,
    update_quota_usage,
    validate_and_categorize_file,
    validate_file_content,
)

router = APIRouter(prefix="/teachers/materials", tags=["teacher-materials"])

# OAuth2 scheme with auto_error=False to allow fallback to query param for media streaming
_media_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False,
)


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


def get_media_teacher_id(
    session: Annotated[Session, Depends(get_db)],
    header_token: Annotated[str | None, Depends(_media_oauth2_scheme)] = None,
    query_token: Annotated[str | None, Query(alias="token")] = None,
) -> uuid.UUID:
    """
    Get teacher ID for media streaming with support for query param auth.

    Supports both header-based auth (Authorization: Bearer xxx) and
    query param auth (?token=xxx) for HTML5 media elements.
    """
    # Try header token first, then query param
    token = header_token or query_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    # Convert string UUID to UUID object
    user_id = uuid.UUID(token_data.sub) if isinstance(token_data.sub, str) else token_data.sub
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Get teacher ID
    teacher = session.exec(
        select(Teacher).where(Teacher.user_id == user.id)
    ).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access materials",
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

    # Upload to DCS with sanitized filename (ASCII-safe for URL paths)
    storage_filename = sanitize_filename_for_storage(file.filename)
    try:
        storage_path = await dcs_client.upload_teacher_material(
            teacher_id=str(teacher_id),
            file_content=file_content,
            filename=storage_filename,
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
    summary="Get URL for file access",
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
    Get a URL for accessing a material file.

    Note: Since DCS no longer provides presigned URLs, this returns the
    authenticated streaming endpoint URL. The frontend must include the
    Authorization header when accessing this URL.

    The expires_in_seconds is provided for API compatibility but the URL
    remains valid as long as the user is authenticated.
    """
    teacher_id = get_teacher_id(session, current_user)
    material = get_teacher_material(session, material_id, teacher_id)

    if material.type in [MaterialType.url, MaterialType.text_note]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URLs and text notes do not have file URLs",
        )

    if not material.storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material file not found in storage",
        )

    try:
        # Verify file exists in DCS
        result = await dcs_client.get_teacher_material_presigned_url(
            teacher_id=str(teacher_id),
            storage_path=material.storage_path,
            expires_minutes=min(expires_minutes, 1440),
        )

        # Return URL to our own streaming endpoint (requires auth header)
        stream_url = f"/api/v1/teachers/materials/{material_id}/stream"

        return PresignedUrlResponse(
            url=stream_url,
            expires_in_seconds=result.get("expires_in_seconds", expires_minutes * 60),
            content_type=material.mime_type or result.get("content_type", "application/octet-stream"),
        )
    except DreamStorageNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage",
        )
    except DreamStorageError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to verify file: {str(e)}",
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
    session: Annotated[Session, Depends(get_db)],
    dcs_client: DreamCentralStorageClient = Depends(get_dream_storage_client),
    material_id: uuid.UUID,
    header_token: Annotated[str | None, Depends(_media_oauth2_scheme)] = None,
    query_token: Annotated[str | None, Query(alias="token")] = None,
) -> StreamingResponse:
    """
    Download the file for a material.

    Only works for file-based materials (document, image, audio, video).

    **Authentication:**
    - Header: `Authorization: Bearer <token>` (for fetch/axios requests)
    - Query param: `?token=<token>` (for HTML5 video/audio elements)
    """
    # Authenticate user from header or query token
    token = header_token or query_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    # Get user and verify teacher
    user_id = uuid.UUID(token_data.sub) if isinstance(token_data.sub, str) else token_data.sub
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    teacher = session.exec(select(Teacher).where(Teacher.user_id == user.id)).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access materials",
        )

    teacher_id = teacher.id
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

    # Prepare filename for Content-Disposition (RFC 5987 encoding for non-ASCII)
    filename = material.original_filename or material.name
    # For ASCII filenames, use simple quoting; for non-ASCII, use RFC 5987 encoding
    try:
        filename.encode('ascii')
        content_disposition = f'attachment; filename="{filename.replace(chr(34), chr(39))}"'
    except UnicodeEncodeError:
        # Use RFC 5987 encoding for non-ASCII filenames
        from urllib.parse import quote
        encoded_filename = quote(filename, safe='')
        content_disposition = f"attachment; filename*=UTF-8''{encoded_filename}"

    return StreamingResponse(
        iter([content]),
        media_type=material.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": content_disposition,
            "Content-Length": str(len(content)),
        },
    )


@router.get(
    "/{material_id}/stream",
    summary="Stream a media file",
)
async def stream_material(
    *,
    session: Annotated[Session, Depends(get_db)],
    teacher_id: Annotated[uuid.UUID, Depends(get_media_teacher_id)],
    request: Request,
    dcs_client: DreamCentralStorageClient = Depends(get_dream_storage_client),
    material_id: uuid.UUID,
) -> StreamingResponse:
    """
    Stream audio/video file with range request support.

    Supports HTTP Range headers for seeking in media players.

    **Authentication:**
    - Header: `Authorization: Bearer <token>` (for fetch/axios requests)
    - Query param: `?token=<token>` (for HTML5 video/audio elements)
    """
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


# =============================================================================
# AI Processing Endpoints (Story 27.15)
# =============================================================================


@router.post(
    "/ai/upload-pdf",
    response_model=TeacherMaterialUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload PDF with text extraction",
    description="Upload a PDF and extract text for AI content generation",
)
@limiter.limit("20/hour")
async def upload_pdf_for_ai(
    request: Request,  # noqa: ARG001 - Required by slowapi rate limiter
    *,
    session: SessionDep,
    current_user: CurrentUser,
    dcs_client: DreamCentralStorageClient = Depends(get_dream_storage_client),
    pdf_service: PDFProcessingService = Depends(get_pdf_processing_service),
    file: UploadFile = File(...),
    name: str = Query(..., min_length=1, max_length=255, description="Display name"),
    description: str | None = Query(None, max_length=1000),
) -> TeacherMaterialUploadResponse:
    """
    Upload a PDF file and extract text for AI content generation.

    The PDF text is extracted and stored for use with AI generation features.
    Only PDF files are supported (max 50MB).

    Returns the material with extracted text, word count, and detected language.
    """
    teacher_id = get_teacher_id(session, current_user)

    # Validate file type
    if file.content_type not in ["application/pdf", "application/x-pdf"]:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are supported for text extraction",
        )

    # Read and validate file content
    file_content = await file.read()
    file_size = len(file_content)
    await file.seek(0)

    validate_file_content(file_content, file.filename or "upload.pdf")

    # Check quota
    check_quota(session, teacher_id, file_size)

    # Extract text from PDF
    extraction_result = await pdf_service.process_pdf(file)

    # Upload to storage
    storage_filename = sanitize_filename_for_storage(file.filename)
    try:
        storage_path = await dcs_client.upload_teacher_material(
            teacher_id=str(teacher_id),
            file_content=file_content,
            filename=storage_filename,
            content_type=file.content_type or "application/pdf",
            material_type="document",
        )
    except DreamStorageError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to upload file to storage: {str(e)}",
        )

    # Create material record with extracted text
    material = TeacherMaterial(
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


@router.post(
    "/ai/text",
    response_model=TeacherMaterialUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create material from text",
    description="Create a material from pasted text for AI content generation",
)
async def create_text_material_for_ai(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    pdf_service: PDFProcessingService = Depends(get_pdf_processing_service),
    data: TextMaterialCreate,
) -> TeacherMaterialUploadResponse:
    """
    Create a material from pasted text for AI content generation.

    The text is processed and stored for use with AI generation features.
    Text is analyzed for word count and language detection.
    """
    teacher_id = get_teacher_id(session, current_user)

    # Process the text
    extraction_result = await pdf_service.process_text_input(data.text)

    # Create material record
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


@router.get(
    "/ai/processable",
    response_model=TeacherMaterialListResponse,
    summary="List AI-processable materials",
    description="List materials with extracted text available for AI generation",
)
async def list_processable_materials(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> TeacherMaterialListResponse:
    """
    List teacher's materials that have extracted text available for AI processing.

    Only returns materials where extracted_text is not null.
    """
    teacher_id = get_teacher_id(session, current_user)

    query = select(TeacherMaterial).where(
        TeacherMaterial.teacher_id == teacher_id,
        TeacherMaterial.extracted_text.isnot(None),
    ).order_by(TeacherMaterial.created_at.desc())

    materials = session.exec(query).all()

    return TeacherMaterialListResponse(
        materials=[TeacherMaterialResponse.from_material(m) for m in materials],
        total_count=len(materials),
    )


@router.get(
    "/ai/{material_id}",
    response_model=TeacherMaterialResponse,
    summary="Get material for AI",
    description="Get material details including extracted text for AI",
)
async def get_material_for_ai(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    material_id: uuid.UUID,
) -> TeacherMaterialResponse:
    """
    Get material details including extracted text.

    Returns 422 if material has no extracted text.
    """
    teacher_id = get_teacher_id(session, current_user)
    material = get_teacher_material(session, material_id, teacher_id)

    if not material.extracted_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Material has no extracted text for AI processing",
        )

    return TeacherMaterialResponse.from_material(material)


# =============================================================================
# Generated Content Endpoints (Story 27.15)
# =============================================================================


@router.get(
    "/generated",
    response_model=TeacherGeneratedContentListResponse,
    summary="List generated content",
    description="List teacher's AI-generated content library",
)
async def list_generated_content(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    activity_type: str | None = Query(None, description="Filter by activity type"),
) -> TeacherGeneratedContentListResponse:
    """
    List all AI-generated content for the current teacher.

    Optionally filter by activity type (vocab_quiz, ai_quiz, reading, matching, etc.).

    CRITICAL: Only returns content owned by the authenticated teacher (isolation).
    """
    teacher_id = get_teacher_id(session, current_user)

    query = select(TeacherGeneratedContent).where(
        TeacherGeneratedContent.teacher_id == teacher_id
    )

    if activity_type:
        query = query.where(TeacherGeneratedContent.activity_type == activity_type)

    query = query.order_by(TeacherGeneratedContent.created_at.desc())
    items = session.exec(query).all()

    # Convert to response with enriched fields
    responses = []
    for item in items:
        # Get material name if material_id exists
        material_name = None
        if item.material_id:
            material = session.get(TeacherMaterial, item.material_id)
            if material:
                material_name = material.name

        responses.append(TeacherGeneratedContentResponse(
            id=item.id,
            teacher_id=item.teacher_id,
            material_id=item.material_id,
            book_id=item.book_id,
            activity_type=item.activity_type,
            title=item.title,
            content=item.content,
            is_used=item.is_used,
            assignment_id=item.assignment_id,
            created_at=item.created_at,
            material_name=material_name,
        ))

    return TeacherGeneratedContentListResponse(
        items=responses,
        total_count=len(responses),
    )


@router.get(
    "/generated/{content_id}",
    response_model=TeacherGeneratedContentResponse,
    summary="Get generated content",
)
async def get_generated_content(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    content_id: uuid.UUID,
) -> TeacherGeneratedContentResponse:
    """
    Get a specific generated content item.

    CRITICAL: Only accessible by the owning teacher (isolation).
    """
    teacher_id = get_teacher_id(session, current_user)

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

    # Get material name if exists
    material_name = None
    if content.material_id:
        material = session.get(TeacherMaterial, content.material_id)
        if material:
            material_name = material.name

    return TeacherGeneratedContentResponse(
        id=content.id,
        teacher_id=content.teacher_id,
        material_id=content.material_id,
        book_id=content.book_id,
        activity_type=content.activity_type,
        title=content.title,
        content=content.content,
        is_used=content.is_used,
        assignment_id=content.assignment_id,
        created_at=content.created_at,
        material_name=material_name,
    )


@router.delete(
    "/generated/{content_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete generated content",
)
async def delete_generated_content(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    content_id: uuid.UUID,
) -> None:
    """
    Delete a generated content item.

    Cannot delete content that is already used in an assignment.
    """
    teacher_id = get_teacher_id(session, current_user)

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

    if content.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete content that is used in an assignment",
        )

    session.delete(content)
    session.commit()
