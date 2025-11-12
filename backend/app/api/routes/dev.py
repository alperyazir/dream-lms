"""Development-only API endpoints for testing and debugging."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.deps import get_db
from app.core.config import settings
from app.models import User, UserRole

router = APIRouter()


@router.get("/quick-login-users")
def get_quick_login_users(db: Session = Depends(get_db)) -> dict[str, list[dict[str, str]]]:
    """
    Get users for quick test login (development only).

    Returns users grouped by role, limited to 5 per role, sorted by newest first.
    Only accessible when ENVIRONMENT != "production".

    Returns:
        Dictionary with role names as keys and lists of user dicts (username, email, password) as values
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")

    # Query up to 5 users per role
    result: dict[str, list[dict[str, str]]] = {}
    for role in UserRole:
        users = db.exec(
            select(User)
            .where(User.role == role)
            .limit(5)
        ).all()

        result[role.value] = [
            {
                "username": u.username,
                "email": u.email,
                # For admin, use settings password; for others, use initial_password
                "password": settings.FIRST_SUPERUSER_PASSWORD if role == UserRole.admin else (u.initial_password or "changethis")
            }
            for u in users
        ]

    return result
