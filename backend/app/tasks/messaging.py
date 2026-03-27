"""Background tasks for system message creation and cache invalidation."""

import logging
from datetime import UTC, datetime

from app.models import DirectMessage
from app.services.cache_events import invalidate_for_event

logger = logging.getLogger(__name__)


async def task_create_system_message(
    ctx: dict,
    sender_id: str,
    recipient_id: str,
    body: str,
    subject: str | None = None,
    context_type: str | None = None,
    context_id: str | None = None,
    message_category: str | None = None,
) -> None:
    """Create a single system message in a background worker."""
    try:
        import uuid

        sender_uuid = uuid.UUID(sender_id)
        recipient_uuid = uuid.UUID(recipient_id)
        context_uuid = uuid.UUID(context_id) if context_id else None

        async with ctx["db_session_factory"]() as db:
            message = DirectMessage(
                sender_id=sender_uuid,
                recipient_id=recipient_uuid,
                body=body,
                subject=subject[:500] if subject else None,
                is_system=True,
                is_read=False,
                sent_at=datetime.now(UTC),
                context_type=context_type,
                context_id=context_uuid,
                message_category=message_category,
            )
            db.add(message)
            await db.commit()

        try:
            await invalidate_for_event(
                "message_sent",
                sender_id=sender_id,
                recipient_id=recipient_id,
            )
        except Exception as e:
            logger.error(
                f"Cache invalidation failed for message to {recipient_id}: {e}",
                exc_info=True,
            )
    except Exception as e:
        logger.error(f"Failed to create system message: {e}", exc_info=True)
        raise  # Let Arq handle retry


async def task_create_system_messages_bulk(
    ctx: dict,
    sender_id: str,
    recipient_ids: list[str],
    body: str,
    subject: str | None = None,
    context_type: str | None = None,
    context_id: str | None = None,
    message_category: str | None = None,
) -> None:
    """Create system messages for multiple recipients in a background worker."""
    try:
        import uuid

        if not recipient_ids:
            return

        sender_uuid = uuid.UUID(sender_id)
        context_uuid = uuid.UUID(context_id) if context_id else None
        now = datetime.now(UTC)
        truncated_subject = subject[:500] if subject else None

        async with ctx["db_session_factory"]() as db:
            messages = [
                DirectMessage(
                    sender_id=sender_uuid,
                    recipient_id=uuid.UUID(rid),
                    body=body,
                    subject=truncated_subject,
                    is_system=True,
                    is_read=False,
                    sent_at=now,
                    context_type=context_type,
                    context_id=context_uuid,
                    message_category=message_category,
                )
                for rid in recipient_ids
            ]
            db.add_all(messages)
            await db.commit()

        try:
            for rid in recipient_ids:
                await invalidate_for_event(
                    "message_sent",
                    sender_id=sender_id,
                    recipient_id=rid,
                )
        except Exception as e:
            logger.error(
                f"Cache invalidation failed for bulk messages: {e}", exc_info=True
            )
    except Exception as e:
        logger.error(f"Failed to create system messages bulk: {e}", exc_info=True)
        raise  # Let Arq handle retry
