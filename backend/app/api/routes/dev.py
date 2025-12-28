"""Development-only API endpoints for testing and debugging."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.models import User, UserRole

router = APIRouter()


@router.get("/quick-login-users")
def get_quick_login_users(db: Session = Depends(get_db)) -> dict[str, list[dict[str, str | None]]]:
    """
    Get users for quick test login (development only).

    Returns users grouped by role, limited to 5 per role.
    Only accessible when ENVIRONMENT != "production".

    Use with /dev/instant-login/{username} endpoint which bypasses password.

    Returns:
        Dictionary with role names as keys and lists of user dicts as values.
        Each user dict contains: username, email
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")

    result: dict[str, list[dict[str, str | None]]] = {}
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
            }
            for u in users
        ]

    return result


@router.post("/reset-quick-login-passwords")
def reset_quick_login_passwords(db: Session = Depends(get_db)) -> dict[str, str | int]:
    """
    Reset passwords for all non-admin users to 'changethis' for quick login testing.
    Also sets must_change_password=False so they can be used for quick login.

    Only accessible when ENVIRONMENT != "production".

    This is a development convenience - DO NOT use in production!
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")

    # Get all non-admin users
    users = db.exec(
        select(User).where(User.role != UserRole.admin)
    ).all()

    count = 0
    for user in users:
        user.hashed_password = get_password_hash("changethis")
        user.must_change_password = False
        db.add(user)
        count += 1

    db.commit()

    return {
        "message": f"Reset {count} users' passwords to 'changethis'",
        "count": count,
    }


@router.post("/instant-login/{username}")
def instant_login(username: str, db: Session = Depends(get_db)) -> dict[str, str]:
    """
    Instant login for development - bypasses password completely.

    Returns an access token for the specified user without requiring password.
    Only accessible when ENVIRONMENT != "production".

    This is MUCH simpler than quick-login and avoids all password issues.

    Args:
        username: Username to login as

    Returns:
        Dictionary with access_token and token_type
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")

    # Find user by username
    user = db.exec(select(User).where(User.username == username)).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{username}' not found")

    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(user.id, expires_delta=access_token_expires)

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
