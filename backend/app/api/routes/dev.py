"""Development-only API endpoints for testing and debugging."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Session, select

from app.api.deps import get_async_db, get_db
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.models import User, UserRole
from app.services.redis_cache import cache_get, cache_set

router = APIRouter()


@router.get("/quick-login-users")
def get_quick_login_users(
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str | None]]]:
    """
    Get users for quick test login (development only).

    Returns users grouped by role, limited to 5 per role.
    Only accessible when ENVIRONMENT != "production".

    Use with /dev/instant-login/{username} endpoint which bypasses password.

    Returns:
        Dictionary with role names as keys and lists of user dicts as values.
        Each user dict contains: username
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")

    result: dict[str, list[dict[str, str | None]]] = {}
    for role in UserRole:
        users = db.exec(select(User).where(User.role == role).limit(5)).all()

        result[role.value] = [
            {
                "username": u.username,
                "email": None,
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
    users = db.exec(select(User).where(User.role != UserRole.admin)).all()

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


@router.get("/load-test-users")
def get_load_test_users(
    role: str = "student",
    limit: int = 5000,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> dict:
    """
    Get load-test users by role (paginated).

    Returns usernames for load-test users (prefixed with 'lt_').
    Designed for large-scale load testing with 100k+ users.

    Only accessible when ENVIRONMENT != "production".
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")

    role_map = {"student": UserRole.student, "teacher": UserRole.teacher}
    user_role = role_map.get(role)
    if not user_role:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

    users = db.exec(
        select(User.username)
        .where(User.role == user_role, User.username.startswith("lt_"))
        .offset(offset)
        .limit(min(limit, 10000))
    ).all()

    return {
        "role": role,
        "count": len(users),
        "offset": offset,
        "usernames": list(users),
    }


@router.post("/instant-login/{username}")
async def instant_login(
    username: str, db: AsyncSession = Depends(get_async_db)
) -> dict[str, str]:
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

    # Check Redis cache first — avoids DB hit on repeated logins
    cache_key = f"dev:instant_login:{username}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    # Find user by username (async — doesn't block thread pool)
    result = await db.execute(sa_select(User).where(User.username == username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{username}' not found")

    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(user.id, expires_delta=access_token_expires)

    token_response = {
        "access_token": access_token,
        "token_type": "bearer",
    }
    # Cache for slightly less than token expiry
    await cache_set(
        cache_key,
        token_response,
        ttl=min(int(access_token_expires.total_seconds()) - 60, 3600),
    )
    return token_response
