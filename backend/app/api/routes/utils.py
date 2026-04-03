import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlmodel import Session

from app.api.deps import get_db
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/utils", tags=["utils"])


@router.get("/health-check/")
async def health_check(db: Session = Depends(get_db)) -> dict:
    """
    Health check endpoint including external service status.

    Checks:
    - Database connectivity
    - Dream Central Storage connectivity
    """
    checks = {
        "database": _check_database(db),
        "dream_central_storage": await _check_dream_storage(),
    }

    overall_status = "healthy" if all(checks.values()) else "degraded"

    return {
        "status": overall_status,
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _check_database(db: Session) -> bool:
    """Check database connectivity."""
    try:
        db.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


async def _check_dream_storage() -> bool:
    """Check Dream Central Storage connectivity."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.DREAM_CENTRAL_STORAGE_URL}/health",
            )
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Dream Central Storage health check failed: {e}")
        return False
