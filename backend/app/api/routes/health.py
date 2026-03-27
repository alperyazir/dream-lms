"""Health check endpoint for monitoring and container health checks."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app.core.db import async_engine

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """
    System health check — checks DB, Redis, and DCS connectivity.
    Used by Docker health checks and uptime monitoring.
    """
    checks = {}
    overall = "healthy"

    # Check database
    try:
        from sqlalchemy.ext.asyncio import AsyncSession

        async with AsyncSession(async_engine) as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = {"status": "healthy"}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(type(e).__name__)}
        overall = "unhealthy"

    # Check Redis
    try:
        from app.services.redis_cache import cache_get

        await cache_get("health:ping")
        checks["redis"] = {"status": "healthy"}
    except Exception as e:
        checks["redis"] = {"status": "unhealthy", "error": str(type(e).__name__)}
        overall = "degraded"  # Redis down = degraded, not unhealthy

    # Check DCS
    try:
        import httpx

        from app.core.config import settings

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.DREAM_CENTRAL_STORAGE_URL}/health")
            if resp.status_code < 500:
                checks["dcs"] = {"status": "healthy"}
            else:
                checks["dcs"] = {
                    "status": "unhealthy",
                    "error": f"HTTP {resp.status_code}",
                }
                overall = "degraded"
    except Exception as e:
        checks["dcs"] = {"status": "unhealthy", "error": str(type(e).__name__)}
        overall = "degraded"

    status_code = 200 if overall != "unhealthy" else 503

    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=status_code,
        content={
            "status": overall,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": checks,
        },
    )
