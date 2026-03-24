"""Redis cache service for Dream LMS scaling.

Follows the DCSCache pattern: get/set/invalidate/get_or_fetch.
Graceful degradation: if Redis is down, falls through to DB.

Single-flight locking prevents thundering herd on cold starts:
  - On cache miss, one request acquires a SETNX lock, fetches from DB, populates cache.
  - Other requests poll cache until populated (or timeout → direct fetch).
"""

import asyncio
import logging
import random
import uuid
from typing import Any, Callable, Coroutine

import orjson

import redis as redis_sync
import redis.asyncio as redis

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None
_redis_sync_client: redis_sync.Redis | None = None

# Lua script for atomic lock release (only release if we own the lock)
_RELEASE_LOCK_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


async def get_redis() -> redis.Redis | None:
    """Get the Redis client singleton. Returns None if not connected."""
    return _redis_client


async def init_redis() -> None:
    """Initialize Redis connection on startup."""
    global _redis_client, _redis_sync_client
    try:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
        # Test connection
        await _redis_client.ping()
        logger.info("Redis async client connected: %s", settings.REDIS_URL)
    except Exception as e:
        logger.warning("Redis async unavailable, caching disabled: %s", e)
        _redis_client = None

    # Sync client for sync endpoints (get_current_user, teacher routes)
    try:
        _redis_sync_client = redis_sync.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            retry_on_timeout=False,
        )
        _redis_sync_client.ping()
        logger.info("Redis sync client connected")
    except Exception as e:
        logger.warning("Redis sync client unavailable: %s", e)
        _redis_sync_client = None


async def close_redis() -> None:
    """Close Redis connections on shutdown."""
    global _redis_client, _redis_sync_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
    if _redis_sync_client:
        _redis_sync_client.close()
        _redis_sync_client = None
    logger.info("Redis connections closed")


async def cache_get(key: str) -> Any | None:
    """Get a value from cache. Returns None on miss or error."""
    client = _redis_client
    if not client:
        return None
    try:
        raw = await client.get(key)
        if raw is None:
            return None
        return orjson.loads(raw)
    except Exception as e:
        logger.debug("Cache get error for %s: %s", key, e)
        return None


async def cache_set(key: str, value: Any, ttl: int = 3600) -> None:
    """Set a value in cache with TTL (seconds) + jitter to prevent thundering herd."""
    client = _redis_client
    if not client:
        return
    try:
        # Add ±20% jitter to prevent all caches expiring simultaneously
        jittered_ttl = int(ttl * (0.8 + random.random() * 0.4))
        await client.setex(key, max(jittered_ttl, 1), orjson.dumps(value, default=str).decode())
    except Exception as e:
        logger.debug("Cache set error for %s: %s", key, e)


async def cache_invalidate(key: str) -> None:
    """Delete a specific cache key. Fails silently."""
    client = _redis_client
    if not client:
        return
    try:
        await client.delete(key)
    except Exception as e:
        logger.debug("Cache invalidate error for %s: %s", key, e)


async def cache_invalidate_pattern(pattern: str) -> None:
    """Delete all keys matching a pattern (e.g., 'student:{id}:*'). Fails silently."""
    client = _redis_client
    if not client:
        return
    try:
        cursor = 0
        while True:
            cursor, keys = await client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                await client.delete(*keys)
            if cursor == 0:
                break
    except Exception as e:
        logger.debug("Cache invalidate_pattern error for %s: %s", pattern, e)


async def cache_get_or_fetch(
    key: str,
    fetch_fn: Callable[[], Coroutine[Any, Any, Any]],
    ttl: int = 3600,
) -> Any:
    """Get from cache, or call fetch_fn and cache the result.

    Uses single-flight locking to prevent thundering herd on cold starts:
    - On cache miss, try to acquire a SETNX lock.
    - Lock winner fetches from DB, populates cache, releases lock.
    - Lock losers poll cache every 50ms up to 5s, then fallback to direct fetch.

    Usage:
        data = await cache_get_or_fetch(
            f"student:{student_id}:assignments",
            lambda: _fetch_student_assignments(student_id),
            ttl=3600,
        )
    """
    # Fast path: cache hit
    cached = await cache_get(key)
    if cached is not None:
        return cached

    client = _redis_client
    if not client:
        # Redis unavailable — direct fetch, no caching
        return await fetch_fn()

    # Try to acquire single-flight lock
    lock_key = f"__lock__{key}"
    token = str(uuid.uuid4())

    try:
        acquired = await client.set(lock_key, token, nx=True, px=8000)
    except Exception:
        # Redis error — fallback to direct fetch
        return await fetch_fn()

    if acquired:
        # Lock winner: fetch from DB, populate cache, release lock
        try:
            result = await fetch_fn()
            await cache_set(key, result, ttl)
            return result
        finally:
            # Release lock atomically (only if we still own it)
            try:
                await client.eval(_RELEASE_LOCK_SCRIPT, 1, lock_key, token)
            except Exception:
                pass  # Lock will auto-expire via PX
    else:
        # Lock loser: poll cache until populated or timeout
        for _ in range(100):  # 100 * 50ms = 5s max
            await asyncio.sleep(0.05)
            cached = await cache_get(key)
            if cached is not None:
                return cached

        # Timeout — fallback to direct fetch (don't cache to avoid conflicts)
        return await fetch_fn()


# ---------------------------------------------------------------------------
# Synchronous helpers (native sync Redis client — no threads/event loops)
# ---------------------------------------------------------------------------

def cache_get_sync(key: str) -> Any | None:
    """Synchronous cache get using native sync Redis client."""
    client = _redis_sync_client
    if not client:
        return None
    try:
        raw = client.get(key)
        if raw is None:
            return None
        return orjson.loads(raw)
    except Exception as e:
        logger.debug("Sync cache get error for %s: %s", key, e)
        return None


def cache_set_sync(key: str, value: Any, ttl: int = 3600) -> None:
    """Synchronous cache set with jitter to prevent thundering herd."""
    client = _redis_sync_client
    if not client:
        return
    try:
        jittered_ttl = int(ttl * (0.8 + random.random() * 0.4))
        client.setex(key, max(jittered_ttl, 1), orjson.dumps(value, default=str).decode())
    except Exception as e:
        logger.debug("Sync cache set error for %s: %s", key, e)


def cache_invalidate_sync(key: str) -> None:
    """Synchronous cache invalidate. Fails silently."""
    client = _redis_sync_client
    if not client:
        return
    try:
        client.delete(key)
    except Exception as e:
        logger.debug("Sync cache invalidate error for %s: %s", key, e)


def cache_invalidate_pattern_sync(pattern: str) -> None:
    """Synchronous pattern-based invalidation using SCAN + DELETE. Fails silently."""
    client = _redis_sync_client
    if not client:
        return
    try:
        cursor = 0
        while True:
            cursor, keys = client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                client.delete(*keys)
            if cursor == 0:
                break
    except Exception as e:
        logger.debug("Sync cache invalidate_pattern error for %s: %s", pattern, e)
