"""Health check endpoint for external monitoring (Uptime Kuma, etc.)."""

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, status
from pydantic import BaseModel
from sqlalchemy import text
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.api.deps import AsyncSessionDep
from app.core.rate_limit import limiter
from app.services.redis_cache import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


class ServiceStatus(BaseModel):
    database: str
    redis: str


class HealthResponse(BaseModel):
    status: str
    services: ServiceStatus
    timestamp: str


@router.get(
    "",
    response_model=HealthResponse,
    summary="Health check",
    description="Check database and Redis connectivity for monitoring tools.",
)
@limiter.limit("30/minute")
async def health_check(
    request: Request,
    session: AsyncSessionDep,
) -> JSONResponse:
    """Check database and Redis connectivity."""
    db_status = "down"
    redis_status = "down"

    # Check database
    try:
        await session.execute(text("SELECT 1"))
        db_status = "up"
    except Exception as e:
        logger.warning("Health check: database unreachable: %s", e)

    # Check Redis
    try:
        redis_client = await get_redis()
        if redis_client:
            await redis_client.ping()
            redis_status = "up"
        else:
            redis_status = "down"
    except Exception as e:
        logger.warning("Health check: Redis unreachable: %s", e)

    # Determine overall status
    if db_status == "up" and redis_status == "up":
        overall = "healthy"
    elif db_status == "up":
        overall = "degraded"
    else:
        overall = "unhealthy"

    http_status = (
        status.HTTP_200_OK
        if db_status == "up"
        else status.HTTP_503_SERVICE_UNAVAILABLE
    )

    payload = HealthResponse(
        status=overall,
        services=ServiceStatus(database=db_status, redis=redis_status),
        timestamp=datetime.now(UTC).isoformat(),
    )

    return JSONResponse(content=payload.model_dump(), status_code=http_status)
