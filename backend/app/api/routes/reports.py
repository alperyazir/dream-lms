"""Report API endpoints - Story 5.6."""

import logging
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.routing import APIRouter
from sqlmodel import select

from app.api.deps import AsyncSessionDep, require_role
from app.models import (
    ReportJobStatusEnum,
    Teacher,
    User,
    UserRole,
)
from app.schemas.reports import (
    ReportGenerateRequest,
    ReportHistoryResponse,
    ReportJobResponse,
    ReportStatusResponse,
    SavedReportTemplate,
    SavedReportTemplateCreate,
)
from app.services.report_service import (
    create_report_job,
    delete_report_template,
    fail_job,
    generate_report_filename,
    get_report_history,
    get_report_job,
    get_report_status,
    get_report_templates,
    process_report_job,
    save_report_template,
)

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)


async def _get_teacher_id(session: AsyncSessionDep, user: User) -> uuid.UUID:
    """Get teacher ID from user, raising 404 if not found."""
    result = await session.execute(select(Teacher).where(Teacher.user_id == user.id))
    teacher = result.scalar_one_or_none()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher record not found for this user",
        )
    return teacher.id


# Background task wrapper for processing
def _process_report_background_sync(job_id: uuid.UUID):
    """Sync wrapper for background task to process report job."""
    import asyncio
    import traceback

    async def run_job():
        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

        from app.core.config import settings

        # Create a fresh engine for this background task
        engine = create_async_engine(str(settings.SQLALCHEMY_DATABASE_URI))

        logger.info(f"Starting background processing for job {job_id}")
        async with AsyncSession(engine) as session:
            try:
                await process_report_job(session, job_id)
                logger.info(f"Completed background processing for job {job_id}")
            except Exception as e:
                logger.error(f"Error processing report job {job_id}: {e}")
                logger.error(traceback.format_exc())
                # Try to mark job as failed
                try:
                    job = await get_report_job(session, job_id)
                    if job:
                        await fail_job(session, job, str(e))
                except Exception:
                    pass
            finally:
                await engine.dispose()

    asyncio.run(run_job())


@router.post(
    "/generate",
    response_model=ReportJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate a new report",
    description="Initiate report generation. Returns job ID for status polling.",
)
async def generate_report(
    *,
    session: AsyncSessionDep,
    background_tasks: BackgroundTasks,
    request: ReportGenerateRequest,
    current_user: User = require_role(UserRole.teacher),
) -> ReportJobResponse:
    """
    Initiate report generation.

    The report is generated asynchronously. Use the returned job_id
    to poll for status and download when complete.
    """
    teacher_id = await _get_teacher_id(session, current_user)

    # Create the job
    job = await create_report_job(session, teacher_id, request)

    # Schedule background processing
    # Using a simple approach - in production would use Celery/RQ
    background_tasks.add_task(
        _process_report_background_sync, job.id
    )

    logger.info(
        f"Report generation initiated: job_id={job.id}, "
        f"type={request.report_type}, format={request.format}"
    )

    return ReportJobResponse(
        job_id=str(job.id),
        status=job.status,
        created_at=job.created_at,
        estimated_completion=None,  # Could estimate based on report complexity
    )


@router.get(
    "/{job_id}/status",
    response_model=ReportStatusResponse,
    summary="Check report generation status",
    description="Get the current status of a report generation job.",
)
async def check_report_status(
    *,
    session: AsyncSessionDep,
    job_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher),
) -> ReportStatusResponse:
    """
    Check the status of a report generation job.

    Poll this endpoint to track progress. When status is 'completed',
    the download_url will be available.
    """
    teacher_id = await _get_teacher_id(session, current_user)

    status_response = await get_report_status(session, job_id, teacher_id)

    if not status_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report job not found or access denied",
        )

    return status_response


@router.get(
    "/{job_id}/preview",
    summary="Preview generated report",
    description="Preview the generated report file in browser.",
)
async def preview_report(
    *,
    session: AsyncSessionDep,
    job_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher),
) -> FileResponse:
    """
    Preview a completed report in the browser (inline).

    Returns the PDF file to be displayed in browser instead of downloaded.
    """
    teacher_id = await _get_teacher_id(session, current_user)

    # Get and verify job ownership
    job = await get_report_job(session, job_id)

    if not job or job.teacher_id != teacher_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or access denied",
        )

    if job.status != ReportJobStatusEnum.completed.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report is not ready. Current status: {job.status}",
        )

    if not job.file_path:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Report file path not found",
        )

    file_path = Path(job.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report file no longer available",
        )

    # Determine content type
    config = job.config_json or {}
    file_format = config.get("format", "pdf")

    if file_format == "xlsx":
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        media_type = "application/pdf"

    logger.info(f"Report previewed: job_id={job.id}, format={file_format}")

    # Return without filename to display inline in browser
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        headers={"Content-Disposition": "inline"},
    )


@router.get(
    "/{job_id}/download",
    summary="Download generated report",
    description="Download the generated report file.",
)
async def download_report(
    *,
    session: AsyncSessionDep,
    job_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher),
) -> FileResponse:
    """
    Download a completed report.

    Returns the PDF or Excel file directly.
    """
    teacher_id = await _get_teacher_id(session, current_user)

    # Get and verify job ownership
    job = await get_report_job(session, job_id)

    if not job or job.teacher_id != teacher_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or access denied",
        )

    if job.status != ReportJobStatusEnum.completed.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report is not ready. Current status: {job.status}",
        )

    if not job.file_path:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Report file path not found",
        )

    file_path = Path(job.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report file no longer available",
        )

    # Determine content type and filename
    config = job.config_json or {}
    file_format = config.get("format", "pdf")
    report_type = job.report_type

    # Get metadata for filename generation
    from app.models import Class, ReportTypeEnum, Student

    logger.info(f"DEBUG DOWNLOAD: job_id={job_id}, report_type={report_type}, config={config}")

    student_name = None
    class_name = None
    teacher_name = None

    # Extract names based on report type for meaningful filenames
    if report_type == ReportTypeEnum.student.value and config.get("target_id"):
        try:
            student_result = await session.execute(
                select(Student, User)
                .join(User, Student.user_id == User.id)
                .where(Student.id == uuid.UUID(config["target_id"]))
            )
            student_row = student_result.first()
            if student_row:
                student, user = student_row
                student_name = user.full_name or user.email
                logger.info(f"DEBUG DOWNLOAD: Found student name: {student_name}")
            else:
                logger.warning(f"DEBUG DOWNLOAD: Student not found for target_id={config.get('target_id')}")
        except Exception as e:
            logger.error(f"DEBUG DOWNLOAD: Error fetching student name: {e}")
            pass  # Use fallback filename if lookup fails

    elif report_type == ReportTypeEnum.class_.value and config.get("target_id"):
        try:
            class_result = await session.execute(
                select(Class).where(Class.id == uuid.UUID(config["target_id"]))
            )
            class_obj = class_result.scalar_one_or_none()
            if class_obj:
                class_name = class_obj.name
        except Exception:
            pass  # Use fallback filename if lookup fails

    elif report_type == ReportTypeEnum.assignment.value:
        # For assignment reports, use teacher name
        try:
            teacher_result = await session.execute(
                select(Teacher, User)
                .join(User, Teacher.user_id == User.id)
                .where(Teacher.id == teacher_id)
            )
            teacher_row = teacher_result.first()
            if teacher_row:
                teacher, user = teacher_row
                teacher_name = user.full_name or user.email
        except Exception:
            pass  # Use fallback filename if lookup fails

    # Generate meaningful filename
    filename_base = generate_report_filename(
        report_type=report_type,
        student_name=student_name,
        class_name=class_name,
        teacher_name=teacher_name,
    )

    # Handle Excel files
    if file_format == "xlsx":
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = filename_base.replace(".pdf", ".xlsx")
    else:
        media_type = "application/pdf"
        filename = filename_base

    logger.info(f"Report downloaded: job_id={job.id}, format={file_format}, filename={filename}")
    logger.info(f"DEBUG CONTENT-DISPOSITION: attachment; filename=\"{filename}\"")

    # Manually set Content-Disposition header to ensure filename is sent correctly
    # Don't use filename parameter as it might override our custom header
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


@router.get(
    "/history",
    response_model=ReportHistoryResponse,
    summary="Get report history",
    description="List previously generated reports (last 7 days).",
)
async def list_report_history(
    *,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.teacher),
) -> ReportHistoryResponse:
    """
    Get report generation history.

    Returns reports from the last 7 days with download links
    for those still available.
    """
    teacher_id = await _get_teacher_id(session, current_user)

    history = await get_report_history(session, teacher_id)

    return ReportHistoryResponse(reports=history)


@router.post(
    "/templates",
    response_model=SavedReportTemplate,
    status_code=status.HTTP_201_CREATED,
    summary="Save report template",
    description="Save a report configuration as a reusable template.",
)
async def create_report_template(
    *,
    session: AsyncSessionDep,
    request: SavedReportTemplateCreate,
    current_user: User = require_role(UserRole.teacher),
) -> SavedReportTemplate:
    """
    Save a report configuration as a template.

    Templates can be reused to quickly generate recurring reports.
    """
    teacher_id = await _get_teacher_id(session, current_user)

    config = await save_report_template(session, teacher_id, request)

    logger.info(f"Report template saved: id={config.id}, name={request.name}")

    return SavedReportTemplate(
        id=str(config.id),
        name=config.name,
        config=request.config,
        created_at=config.created_at,
    )


@router.get(
    "/templates",
    response_model=list[SavedReportTemplate],
    summary="List saved templates",
    description="Get all saved report templates for the current teacher.",
)
async def list_report_templates(
    *,
    session: AsyncSessionDep,
    current_user: User = require_role(UserRole.teacher),
) -> list[SavedReportTemplate]:
    """
    List all saved report templates.
    """
    teacher_id = await _get_teacher_id(session, current_user)

    templates = await get_report_templates(session, teacher_id)

    return templates


@router.delete(
    "/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete report template",
    description="Delete a saved report template.",
)
async def remove_report_template(
    *,
    session: AsyncSessionDep,
    template_id: uuid.UUID,
    current_user: User = require_role(UserRole.teacher),
) -> None:
    """
    Delete a saved report template.
    """
    teacher_id = await _get_teacher_id(session, current_user)

    deleted = await delete_report_template(session, template_id, teacher_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or access denied",
        )

    logger.info(f"Report template deleted: id={template_id}")
