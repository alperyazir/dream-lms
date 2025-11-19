import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends
from pydantic.networks import EmailStr
from sqlalchemy import text
from sqlmodel import Session

from app.api.deps import get_current_active_superuser, get_db
from app.core.config import settings
from app.models import Message
from app.utils import generate_test_email, send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/utils", tags=["utils"])


@router.post(
    "/test-email/",
    dependencies=[Depends(get_current_active_superuser)],
    status_code=201,
)
def test_email(email_to: EmailStr) -> Message:
    """
    Test emails.
    """
    email_data = generate_test_email(email_to=email_to)
    send_email(
        email_to=email_to,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Test email sent")


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
    """Check Dream Central Storage connectivity via authentication endpoint."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{settings.DREAM_CENTRAL_STORAGE_URL}/auth/login",
                json={
                    "email": settings.DREAM_CENTRAL_STORAGE_EMAIL,
                    "password": settings.DREAM_CENTRAL_STORAGE_PASSWORD,
                },
            )
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Dream Central Storage health check failed: {e}")
        return False
