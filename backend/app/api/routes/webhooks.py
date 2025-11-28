"""
Book Asset Webhook Routes.

Receives webhook notifications from Dream Central Storage for book catalog changes.
"""

import asyncio
import hmac
import hashlib
import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import AsyncSessionDep, get_async_db, get_current_active_superuser
from app.core.config import settings
from app.models import User, WebhookEventLog, WebhookEventStatus, WebhookEventType, WebhookPayload
from app.services.book_service import soft_delete_book, sync_book
from app.services.dream_storage_client import DreamStorageNotFoundError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _validate_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Validate webhook signature using HMAC-SHA256.

    Args:
        payload: Raw request body (bytes)
        signature: Signature from header (e.g., "sha256=abc123...")
        secret: Shared webhook secret

    Returns:
        True if signature is valid, False otherwise

    Note:
        Uses constant-time comparison to prevent timing attacks.
    """
    # Compute expected signature
    expected = hmac.new(
        secret.encode("utf-8"), payload, hashlib.sha256
    ).hexdigest()

    # Extract actual signature (remove "sha256=" prefix if present)
    actual = signature.replace("sha256=", "")

    # Constant-time comparison to prevent timing attacks
    return hmac.compare_digest(expected, actual)


async def process_webhook_event(event_log_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Process webhook event with retry logic.

    Args:
        event_log_id: ID of the webhook event log to process
        db: Async database session

    Note:
        This function implements exponential backoff retry logic.
        Max 3 retries with backoff: 1s, 2s, 4s.
    """
    # Get event log
    result = await db.execute(select(WebhookEventLog).where(WebhookEventLog.id == event_log_id))
    event_log = result.scalar_one_or_none()

    if not event_log:
        logger.error(f"Webhook event log {event_log_id} not found")
        return

    max_retries = 3

    for attempt in range(max_retries):
        try:
            # Update status
            event_log.status = WebhookEventStatus.processing
            await db.commit()

            # Process based on event type
            logger.info(
                f"Processing webhook event: {event_log.event_type} for book {event_log.book_id}"
            )

            if event_log.event_type == WebhookEventType.book_created:
                # Sync new book
                await sync_book(str(event_log.book_id), db)
                logger.info(f"Successfully synced new book {event_log.book_id}")

            elif event_log.event_type == WebhookEventType.book_updated:
                # Force refresh for updates
                await sync_book(str(event_log.book_id), db, force_refresh=True)
                logger.info(f"Successfully refreshed book {event_log.book_id}")

            elif event_log.event_type == WebhookEventType.book_deleted:
                # Soft delete book
                deleted = await soft_delete_book(str(event_log.book_id), db)
                if deleted:
                    logger.info(f"Successfully soft-deleted book {event_log.book_id}")
                else:
                    logger.warning(f"Book {event_log.book_id} not found for deletion")

            # Success
            event_log.status = WebhookEventStatus.success
            event_log.processed_at = datetime.now(UTC)
            await db.commit()
            logger.info(f"Webhook event {event_log_id} processed successfully")
            return

        except DreamStorageNotFoundError as e:
            # Book not found in Dream Central Storage - mark as failed (non-retryable)
            event_log.retry_count = attempt + 1
            event_log.error_message = f"Book not found in Dream Central Storage: {str(e)}"
            event_log.status = WebhookEventStatus.failed
            event_log.processed_at = datetime.now(UTC)
            await db.commit()
            logger.error(f"Webhook event {event_log_id} failed - book not found: {e}")
            return

        except Exception as e:
            event_log.retry_count = attempt + 1
            event_log.error_message = str(e)

            if attempt < max_retries - 1:
                # Retry with exponential backoff
                event_log.status = WebhookEventStatus.retrying
                await db.commit()
                backoff_seconds = 2**attempt  # 1s, 2s, 4s
                logger.warning(
                    f"Webhook event {event_log_id} failed, retrying in {backoff_seconds}s: {e}"
                )
                await asyncio.sleep(backoff_seconds)
            else:
                # Max retries exhausted
                event_log.status = WebhookEventStatus.failed
                event_log.processed_at = datetime.now(UTC)
                await db.commit()
                logger.error(
                    f"Webhook event {event_log_id} permanently failed after {max_retries} attempts: {e}"
                )

                # TODO: Send admin notification
                # await send_admin_notification(
                #     f"Webhook processing failed: {event_log.event_type} for book {event_log.book_id}"
                # )


@router.post(
    "/dream-storage",
    status_code=200,
    summary="Receive webhook from Dream Central Storage",
    description="Handles webhook events for book catalog changes",
)
async def receive_dream_storage_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSessionDep,
) -> dict:
    """
    Receive and process webhook from Dream Central Storage.

    Validates webhook signature, logs event, and queues background
    sync operation.

    Returns:
        dict with status and event_id

    Raises:
        HTTPException(401): Invalid webhook signature
        HTTPException(400): Invalid payload format
    """
    # Extract signature from header
    signature = request.headers.get("X-Webhook-Signature")
    if not signature:
        logger.warning("Webhook received without signature")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing webhook signature",
        )

    # Read raw request body for signature validation
    payload_bytes = await request.body()

    # Validate signature
    if not _validate_webhook_signature(
        payload_bytes, signature, settings.DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET
    ):
        logger.warning("Webhook received with invalid signature")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    # Parse JSON payload
    try:
        payload_dict = json.loads(payload_bytes.decode("utf-8"))
        webhook_payload = WebhookPayload(**payload_dict)
    except Exception as e:
        logger.error(f"Failed to parse webhook payload: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payload format: {str(e)}",
        )

    # Create webhook event log
    event_log = WebhookEventLog(
        event_type=webhook_payload.event,
        book_id=webhook_payload.data.id,
        payload_json=payload_dict,
        status=WebhookEventStatus.pending,
        created_at=datetime.now(UTC),
    )
    db.add(event_log)
    await db.commit()
    await db.refresh(event_log)

    # Queue background job with new async session
    # Note: We need to create a new session for the background task
    # because FastAPI dependencies don't persist in background tasks
    async def run_webhook_processing():
        """Wrapper to create new async session for background processing."""
        async with AsyncSession(db.bind, expire_on_commit=False) as bg_db:
            await process_webhook_event(event_log.id, bg_db)

    background_tasks.add_task(run_webhook_processing)

    logger.info(
        f"Webhook received: {webhook_payload.event} for book {webhook_payload.data.id}, event_id={event_log.id}"
    )

    # Return immediately
    return {"status": "received", "event_id": str(event_log.id)}


@router.post(
    "/dream-storage/test",
    status_code=200,
    summary="Test webhook endpoint (dev/admin only)",
    description="Manually trigger a webhook event for testing (non-production only)",
)
async def test_dream_storage_webhook(
    payload: WebhookPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSessionDep,
    current_user: User = Depends(get_current_active_superuser),
) -> dict:
    """
    Test endpoint to manually trigger webhook processing (admin only, non-production).

    This endpoint allows admins to manually send webhook events for testing
    purposes without needing to configure Dream Central Storage webhooks.

    Args:
        payload: Webhook payload matching Dream Central Storage format
        background_tasks: FastAPI background tasks
        db: Async database session
        current_user: Current authenticated admin user

    Returns:
        dict with status and event_id

    Raises:
        HTTPException(403): If used in production environment
    """
    # Block in production
    if settings.ENVIRONMENT == "production":
        logger.warning(
            f"Test webhook endpoint called in production by user {current_user.email}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test webhook endpoint is not available in production",
        )

    logger.info(
        f"Test webhook triggered by admin {current_user.email}: "
        f"{payload.event} for book {payload.data.id}"
    )

    # Create webhook event log
    event_log = WebhookEventLog(
        event_type=payload.event,
        book_id=payload.data.id,
        payload_json=payload.model_dump(),
        status=WebhookEventStatus.pending,
        created_at=datetime.now(UTC),
    )
    db.add(event_log)
    await db.commit()
    await db.refresh(event_log)

    # Queue background job with new async session
    async def run_webhook_processing():
        """Wrapper to create new async session for background processing."""
        async with AsyncSession(db.bind, expire_on_commit=False) as bg_db:
            await process_webhook_event(event_log.id, bg_db)

    background_tasks.add_task(run_webhook_processing)

    logger.info(
        f"Test webhook queued: {payload.event} for book {payload.data.id}, event_id={event_log.id}"
    )

    return {
        "status": "received",
        "event_id": str(event_log.id),
        "message": f"Test webhook triggered by {current_user.email}",
    }
