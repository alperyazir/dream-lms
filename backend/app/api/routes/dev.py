"""Development-only API endpoints for testing and debugging."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.models import User, UserRole

router = APIRouter()


@router.get("/quick-login-users")
def get_quick_login_users(db: Session = Depends(get_db)) -> dict[str, list[dict[str, str | bool | None]]]:
    """
    Get users for quick test login (development only).

    Returns users grouped by role, limited to 5 per role.
    Only accessible when ENVIRONMENT != "production".

    Note: Since initial_password is no longer stored in the database for security reasons,
    quick login only works for:
    - Admin user (uses FIRST_SUPERUSER_PASSWORD)
    - Users with must_change_password=False (their password is likely "changethis" from dev seeding)

    Users with must_change_password=True have random temporary passwords that we don't know,
    so they are excluded from quick login.

    Returns:
        Dictionary with role names as keys and lists of user dicts as values.
        Each user dict contains: username, email, password, must_change_password
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")

    # Query up to 5 users per role, excluding those with must_change_password=True
    # (except admin who always uses FIRST_SUPERUSER_PASSWORD)
    result: dict[str, list[dict[str, str | bool | None]]] = {}
    for role in UserRole:
        if role == UserRole.admin:
            # Admin can always login with FIRST_SUPERUSER_PASSWORD
            users = db.exec(
                select(User)
                .where(User.role == role)
                .limit(5)
            ).all()
        else:
            # For other roles, only include users without must_change_password
            # These users have "changethis" as their password from dev seeding
            users = db.exec(
                select(User)
                .where(User.role == role)
                .where(User.must_change_password == False)  # noqa: E712
                .limit(5)
            ).all()

        result[role.value] = [
            {
                "username": u.username,
                "email": u.email,  # Can be None for students
                # For admin, use settings password; for others, use the default dev password
                "password": settings.FIRST_SUPERUSER_PASSWORD if role == UserRole.admin else "changethis",
                "must_change_password": u.must_change_password,
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
