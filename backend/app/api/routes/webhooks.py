"""
DCS Webhook Routes.

Receives webhook notifications from Dream Central Storage for book and publisher changes.
"""

import asyncio
import hashlib
import hmac
import json
import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import AsyncSessionDep, get_current_active_superuser
from app.core.config import settings
from app.models import (
    User,
    WebhookEventLog,
    WebhookEventStatus,
    WebhookEventType,
    WebhookPayload,
)

# Book sync functions deprecated - books now fetched from DCS on-demand
from app.services.dcs_cache import CacheKeys, get_dcs_cache
from app.services.dream_storage_client import (
    DreamStorageNotFoundError,
)

# Note: Publisher sync deprecated - webhooks will no longer sync publishers from DCS
# Publishers are now managed directly in DCS via PublisherService (read-only caching)

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




async def _import_book_activities(book_id: int, db: AsyncSession) -> dict:
    """
    Import activities from DCS config.json into local Activity table.
    
    Args:
        book_id: DCS book ID
        db: Async database session
        
    Returns:
        Dict with import statistics
        
    Raises:
        Exception if import fails
    """
    from app.models import Activity
    from app.services.book_service_v2 import get_book_service
    from app.services.config_parser import parse_book_config
    
    # Activity types that have implemented players
    SUPPORTED_ACTIVITY_TYPES = {
        "dragdroppicture",
        "dragdroppicturegroup",
        "matchTheWords",
        "circle",
        "markwithx",
        "puzzleFindWords",
    }
    
    logger.info(f"📥 Starting activity import for book {book_id}")
    
    # Get book from DCS
    book_service = get_book_service()
    book = await book_service.get_book(book_id)
    if not book:
        raise ValueError(f"Book {book_id} not found in DCS")
    
    # Get book config from DCS
    book_config = await book_service.get_book_config(book_id)
    if not book_config:
        raise ValueError(f"Book configuration not found for book {book_id}")
    
    # Parse activities from config.json
    activity_data_list = parse_book_config(book_config)
    
    # Filter for supported activity types only
    supported_activities = [
        a for a in activity_data_list 
        if a.activity_type in SUPPORTED_ACTIVITY_TYPES
    ]
    
    # Delete existing activities for this book
    result = await db.execute(
        select(Activity).where(Activity.dcs_book_id == book_id)
    )
    existing_activities = result.scalars().all()
    deleted_count = len(existing_activities)
    for activity in existing_activities:
        await db.delete(activity)
    
    # Create new Activity records
    created_count = 0
    for activity_data in supported_activities:
        activity = Activity(
            dcs_book_id=book_id,
            module_name=activity_data.module_name,
            page_number=activity_data.page_number,
            section_index=activity_data.section_index,
            activity_type=activity_data.activity_type,
            title=activity_data.title,
            config_json=activity_data.config_json,
            order_index=activity_data.order_index,
        )
        db.add(activity)
        created_count += 1
    
    await db.commit()
    
    logger.info(
        f"✅ Activity import complete for book {book_id}: "
        f"deleted {deleted_count}, created {created_count}"
    )
    
    return {
        "book_id": book_id,
        "deleted": deleted_count,
        "created": created_count,
        "total_parsed": len(activity_data_list),
    }

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
    logger.info("🔄 " + "=" * 78)
    logger.info(f"🔄 PROCESSING WEBHOOK EVENT: {event_log_id}")
    
    # Get event log
    result = await db.execute(select(WebhookEventLog).where(WebhookEventLog.id == event_log_id))
    event_log = result.scalar_one_or_none()

    if not event_log:
        logger.error(f"❌ Webhook event log {event_log_id} not found")
        return

    logger.info(f"📋 Event Type: {event_log.event_type.value}")
    logger.info(f"📋 Book ID: {event_log.book_id}")
    logger.info(f"📋 Publisher ID: {event_log.publisher_id}")
    
    max_retries = 3

    for attempt in range(max_retries):
        try:
            # Update status
            event_log.status = WebhookEventStatus.processing
            await db.commit()
            logger.info(f"⚙️  Status updated to: processing (attempt {attempt + 1}/{max_retries})")

            # Get cache for invalidation
            cache = get_dcs_cache()
            
            # ALSO invalidate DCS client's internal cache
            from app.services.dream_storage_client import get_dream_storage_client
            dcs_client = await get_dream_storage_client()

            # Process based on event type
            if event_log.event_type.value.startswith("book."):
                book_id = str(event_log.book_id)
                logger.info(f"📚 Processing BOOK event: {event_log.event_type.value} for book {book_id}")

                if event_log.event_type == WebhookEventType.book_created:
                    logger.info("🆕 BOOK CREATED - Invalidating caches and importing activities...")
                    await cache.invalidate(CacheKeys.BOOK_LIST)
                    await cache.invalidate_pattern("dcs:books:publisher:")
                    dcs_client.invalidate_cache()

                    # Import activities for the new book
                    try:
                        import_stats = await _import_book_activities(int(book_id), db)
                        logger.info(
                            f"✅ Imported {import_stats['created']} activities "
                            f"for new book {book_id}"
                        )
                    except Exception as e:
                        logger.error(f"⚠️  Failed to import activities for book {book_id}: {e}")
                        # Don't fail the webhook - cache invalidation succeeded

                    logger.info(f"✅ Cache invalidated for new book {book_id}")

                elif event_log.event_type == WebhookEventType.book_updated:
                    logger.info("📝 BOOK UPDATED - Invalidating caches and re-importing activities...")
                    await cache.invalidate(CacheKeys.book_by_id(book_id))
                    await cache.invalidate(CacheKeys.book_config(book_id))
                    await cache.invalidate(CacheKeys.BOOK_LIST)
                    dcs_client.invalidate_cache()

                    # Re-import activities for the updated book
                    try:
                        import_stats = await _import_book_activities(int(book_id), db)
                        logger.info(
                            f"✅ Re-imported {import_stats['created']} activities "
                            f"for updated book {book_id}"
                        )
                    except Exception as e:
                        logger.error(f"⚠️  Failed to re-import activities for book {book_id}: {e}")
                        # Don't fail the webhook - cache invalidation succeeded

                    logger.info(f"✅ Cache invalidated for updated book {book_id}")

                elif event_log.event_type == WebhookEventType.book_deleted:
                    logger.info("🗑️  BOOK DELETED - Invalidating caches and deleting activities...")
                    await cache.invalidate_pattern(f"dcs:books:id:{book_id}")
                    await cache.invalidate(CacheKeys.BOOK_LIST)
                    dcs_client.invalidate_cache()

                    # Delete activities for the deleted book
                    try:
                        from app.models import Activity
                        result = await db.execute(
                            select(Activity).where(Activity.dcs_book_id == int(book_id))
                        )
                        activities = result.scalars().all()
                        deleted_count = len(activities)
                        for activity in activities:
                            await db.delete(activity)
                        await db.commit()
                        logger.info(f"✅ Deleted {deleted_count} activities for deleted book {book_id}")
                    except Exception as e:
                        logger.error(f"⚠️  Failed to delete activities for book {book_id}: {e}")
                        # Don't fail the webhook - cache invalidation succeeded

                    logger.info(f"✅ Cache invalidated for deleted book {book_id}")

            elif event_log.event_type.value.startswith("publisher."):
                publisher_id = str(event_log.publisher_id)
                logger.info(f"🏢 Processing PUBLISHER event: {event_log.event_type.value} for publisher {publisher_id}")

                if event_log.event_type == WebhookEventType.publisher_created:
                    logger.info("🆕 PUBLISHER CREATED - Invalidating caches...")
                    await cache.invalidate(CacheKeys.PUBLISHER_LIST)
                    dcs_client.invalidate_cache()
                    logger.info(f"✅ Invalidated publisher caches for new publisher {publisher_id}")

                elif event_log.event_type == WebhookEventType.publisher_updated:
                    logger.info("📝 PUBLISHER UPDATED - Invalidating caches...")
                    await cache.invalidate(CacheKeys.publisher_by_id(publisher_id))
                    await cache.invalidate(CacheKeys.publisher_logo(publisher_id))
                    await cache.invalidate(CacheKeys.PUBLISHER_LIST)
                    dcs_client.invalidate_cache()
                    logger.info(f"✅ Invalidated publisher caches for updated publisher {publisher_id}")

                elif event_log.event_type == WebhookEventType.publisher_deleted:
                    logger.info("🗑️  PUBLISHER DELETED - Invalidating caches...")
                    await cache.invalidate_pattern(f"dcs:publishers:id:{publisher_id}")
                    await cache.invalidate_pattern(f"dcs:publishers:logo:{publisher_id}")
                    await cache.invalidate(CacheKeys.PUBLISHER_LIST)
                    await cache.invalidate_pattern(f"dcs:books:publisher:{publisher_id}")
                    dcs_client.invalidate_cache()
                    logger.info(f"✅ Invalidated publisher caches for deleted publisher {publisher_id}")

            # Success
            event_log.status = WebhookEventStatus.success
            event_log.processed_at = datetime.now(UTC)
            await db.commit()
            logger.info(f"✅ Webhook event {event_log_id} processed successfully")
            logger.info("🔄 " + "=" * 78)
            return

        except DreamStorageNotFoundError as e:
            # Book not found in Dream Central Storage - mark as failed (non-retryable)
            event_log.retry_count = attempt + 1
            event_log.error_message = f"Book not found in Dream Central Storage: {str(e)}"
            event_log.status = WebhookEventStatus.failed
            event_log.processed_at = datetime.now(UTC)
            await db.commit()
            logger.error(f"❌ Webhook event {event_log_id} failed - book not found: {e}")
            logger.info("🔄 " + "=" * 78)
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
                    f"⚠️  Webhook event {event_log_id} failed, retrying in {backoff_seconds}s: {e}"
                )
                await asyncio.sleep(backoff_seconds)
            else:
                # Max retries exhausted
                event_log.status = WebhookEventStatus.failed
                event_log.processed_at = datetime.now(UTC)
                await db.commit()
                logger.error(
                    f"❌ Webhook event {event_log_id} permanently failed after {max_retries} attempts: {e}"
                )
                logger.info("🔄 " + "=" * 78)

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
    # ========== DETAILED LOGGING START ==========
    logger.info("=" * 80)
    logger.info("🔔 WEBHOOK REQUEST RECEIVED from Dream Central Storage")
    logger.info(f"Request method: {request.method}")
    logger.info(f"Request URL: {request.url}")
    logger.info(f"Client host: {request.client.host if request.client else 'unknown'}")
    logger.info(f"Headers: {dict(request.headers)}")
    
    # Extract signature from header
    signature = request.headers.get("X-Webhook-Signature")
    if not signature:
        logger.warning("❌ Webhook received WITHOUT signature header")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing webhook signature",
        )
    
    logger.info(f"Signature header present: {signature[:20]}...")

    # Read raw request body for signature validation
    payload_bytes = await request.body()
    logger.info(f"Payload size: {len(payload_bytes)} bytes")
    logger.info(f"Raw payload: {payload_bytes.decode('utf-8')[:500]}...")  # First 500 chars

    # Validate signature
    if not _validate_webhook_signature(
        payload_bytes, signature, settings.DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET
    ):
        logger.warning("❌ Webhook signature VALIDATION FAILED")
        logger.warning(f"Expected secret: {settings.DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET[:10]}...")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )
    
    logger.info("✅ Signature validation PASSED")

    # Parse JSON payload
    try:
        payload_dict = json.loads(payload_bytes.decode("utf-8"))
        webhook_payload = WebhookPayload(**payload_dict)
        
        logger.info(f"📦 Event Type: {webhook_payload.event.value}")
        logger.info(f"📦 Event Data: {webhook_payload.data}")
        logger.info(f"📦 Timestamp: {webhook_payload.timestamp}")
        
    except Exception as e:
        logger.error(f"❌ Failed to parse webhook payload: {e}")
        logger.error(f"Payload was: {payload_bytes.decode('utf-8')}")
        logger.info("=" * 80)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payload format: {str(e)}",
        )

    # Determine if this is a book or publisher event
    is_book_event = webhook_payload.event.value.startswith("book.")
    is_publisher_event = webhook_payload.event.value.startswith("publisher.")
    entity_id = webhook_payload.data.get("id")
    entity_type = "publisher" if is_publisher_event else "book"

    logger.info(f"📌 Event classification: {entity_type} event")
    logger.info(f"📌 Entity ID: {entity_id}")

    # Create webhook event log with appropriate ID field
    event_log = WebhookEventLog(
        event_type=webhook_payload.event,
        book_id=entity_id if is_book_event else None,
        publisher_id=entity_id if is_publisher_event else None,
        payload_json=payload_dict,
        status=WebhookEventStatus.pending,
        created_at=datetime.now(UTC),
    )
    db.add(event_log)
    await db.commit()
    await db.refresh(event_log)
    
    logger.info(f"💾 Event log created with ID: {event_log.id}")

    # Queue background job with new async session
    # Note: We need to create a new session for the background task
    # because FastAPI dependencies don't persist in background tasks
    async def run_webhook_processing():
        """Wrapper to create new async session for background processing."""
        async with AsyncSession(db.bind, expire_on_commit=False) as bg_db:
            await process_webhook_event(event_log.id, bg_db)

    background_tasks.add_task(run_webhook_processing)
    
    logger.info(f"⚡ Background task queued for processing")
    logger.info(f"✅ Webhook accepted: {webhook_payload.event.value} for {entity_type} {entity_id}")
    logger.info("=" * 80)

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

    # Determine if this is a book or publisher event
    is_book_event = payload.event.value.startswith("book.")
    is_publisher_event = payload.event.value.startswith("publisher.")
    entity_id = payload.data.get("id")
    entity_type = "publisher" if is_publisher_event else "book"

    logger.info(
        f"Test webhook triggered by admin {current_user.email}: "
        f"{payload.event} for {entity_type} {entity_id}"
    )

    # Create webhook event log
    event_log = WebhookEventLog(
        event_type=payload.event,
        book_id=entity_id if is_book_event else None,
        publisher_id=entity_id if is_publisher_event else None,
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
        f"Test webhook queued: {payload.event} for {entity_type} {entity_id}, event_id={event_log.id}"
    )

    return {
        "status": "received",
        "event_id": str(event_log.id),
        "message": f"Test webhook triggered by {current_user.email}",
    }
