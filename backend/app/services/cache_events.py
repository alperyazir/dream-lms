"""Event-driven cache invalidation registry.

Maps domain events → cache key patterns to invalidate.
Freshness comes from write-time invalidation, not TTL expiry.

Usage (async routes):
    from app.services.cache_events import invalidate_for_event
    await invalidate_for_event("message_sent", sender_id=str(sid), recipient_id=str(rid))

Usage (sync routes like teachers.py, users.py):
    from app.services.cache_events import invalidate_for_event_sync
    invalidate_for_event_sync("user_profile_updated", user_id=str(user_id))
"""

import asyncio
import logging
from typing import Any

from app.services.redis_cache import (
    cache_invalidate,
    cache_invalidate_pattern,
    cache_invalidate_pattern_sync,
    cache_invalidate_sync,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Event → cache key pattern registry
# ---------------------------------------------------------------------------
# Keys use Python str.format() placeholders matching **ctx kwargs.
# Patterns ending with '*' use SCAN-based pattern invalidation.
# Plain keys use direct DELETE.

_EVENT_REGISTRY: dict[str, list[str]] = {
    # Messages
    "message_sent": [
        "user:{sender_id}:conversations:*",
        "user:{recipient_id}:conversations:*",
        "user:{recipient_id}:unread_count",
    ],
    "message_read": [
        "user:{user_id}:conversations:*",
        "user:{user_id}:unread_count",
    ],

    # Assignments
    "assignment_assigned": [
        "student:{user_id}:assignments:*",
        "student:{user_id}:calendar:*",
    ],
    "assignment_progress_updated": [
        "student:{user_id}:assignments:*",
    ],
    "assignment_submitted": [
        "student:{user_id}:assignments:*",
        "progress:*",
        "calendar:*",
        "badges",
        "skill-profile",
    ],
    "assignment_feedback": [
        "student:{user_id}:assignments:*",
        "badges",
        "skill-profile",
    ],
    "assignment_graded": [
        "student:{user_id}:assignments:*",
        "progress:*",
    ],

    # Teacher assignments
    "teacher_assignment_changed": [
        "teacher:{user_id}:assignments:*",
    ],

    # User profile
    "user_profile_updated": [
        "auth:user:{user_id}",
    ],

    # Teacher student/class management
    "teacher_students_changed": [
        "teacher:{user_id}:students:*",
    ],
    "teacher_classes_changed": [
        "teacher:{user_id}:classes",
        "teacher:{user_id}:students:*",
    ],
}


def _resolve_keys(event: str, **ctx: Any) -> list[str]:
    """Resolve event to list of cache keys/patterns with context substituted."""
    patterns = _EVENT_REGISTRY.get(event)
    if not patterns:
        logger.warning("Unknown cache event: %s", event)
        return []

    resolved = []
    for pattern in patterns:
        try:
            resolved.append(pattern.format(**ctx))
        except KeyError:
            # Pattern requires context not provided — skip (e.g. global patterns
            # like "progress:*" don't need user_id substitution)
            resolved.append(pattern)
    return resolved


async def invalidate_for_event(event: str, **ctx: Any) -> None:
    """Invalidate all cache keys associated with an event (async).

    Fails silently — cache invalidation must never crash a write path.

    Args:
        event: Event name from the registry (e.g. "notification_created")
        **ctx: Context values for pattern substitution (e.g. user_id="abc-123")
    """
    try:
        keys = _resolve_keys(event, **ctx)
        if not keys:
            return

        tasks = []
        for key in keys:
            if "*" in key:
                tasks.append(cache_invalidate_pattern(key))
            else:
                tasks.append(cache_invalidate(key))

        await asyncio.gather(*tasks, return_exceptions=True)
        logger.debug("Cache invalidated for event=%s ctx=%s keys=%d", event, ctx, len(keys))
    except Exception as e:
        logger.debug("Cache event invalidation error: event=%s err=%s", event, e)


def invalidate_for_event_sync(event: str, **ctx: Any) -> None:
    """Invalidate all cache keys associated with an event (sync).

    For use in sync route handlers (teachers.py, users.py).
    Fails silently — cache invalidation must never crash a write path.
    """
    try:
        keys = _resolve_keys(event, **ctx)
        if not keys:
            return

        for key in keys:
            if "*" in key:
                cache_invalidate_pattern_sync(key)
            else:
                cache_invalidate_sync(key)

        logger.debug("Sync cache invalidated for event=%s ctx=%s keys=%d", event, ctx, len(keys))
    except Exception as e:
        logger.debug("Sync cache event invalidation error: event=%s err=%s", event, e)
