import logging
import uuid
from collections.abc import AsyncGenerator, Generator
from typing import TYPE_CHECKING, Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Session

if TYPE_CHECKING:
    from arq import ArqRedis

from app.core import security
from app.core.config import settings
from app.core.db import async_engine, engine
from app.models import TokenPayload, User, UserRole
from app.services.redis_cache import (
    cache_get,
    cache_set,
)

logger = logging.getLogger(__name__)

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Async database session dependency."""
    async with AsyncSession(async_engine, expire_on_commit=False) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


async def get_current_user(session: AsyncSessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    # Convert string UUID to UUID object
    user_id = (
        uuid.UUID(token_data.sub) if isinstance(token_data.sub, str) else token_data.sub
    )

    # Try Redis cache — return cached User without hitting DB
    cache_key = f"auth:user:{user_id}"
    cached = await cache_get(cache_key)
    if cached and cached.get("id") and cached.get("role"):
        if not cached.get("is_active", True):
            raise HTTPException(status_code=400, detail="Inactive user")
        # Reconstruct User from cache — avoids DB query on every request
        role_val = cached.get("role")
        user = User(
            id=uuid.UUID(cached["id"]),
            username=cached.get("username", ""),
            full_name=cached.get("full_name"),
            role=UserRole(role_val) if role_val else None,
            is_active=cached.get("is_active", True),
            is_superuser=cached.get("is_superuser", False),
            dcs_publisher_id=cached.get("dcs_publisher_id"),
            hashed_password=cached.get("hashed_password", ""),
        )
        return user

    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Cache full user info to skip DB on subsequent requests
    try:
        await cache_set(
            cache_key,
            {
                "id": str(user.id),
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role.value if user.role else None,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "dcs_publisher_id": user.dcs_publisher_id,
                "hashed_password": user.hashed_password,
            },
            ttl=3600,
        )
    except Exception:
        pass  # Non-critical

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user


def require_role(*allowed_roles: UserRole):
    """
    Dependency factory to check if user has one of the allowed roles.

    Usage:
        @router.get("/admin/dashboard")
        async def admin_dashboard(
            user: User = Depends(require_role(UserRole.admin))
        ):
            ...
    """

    def role_checker(current_user: CurrentUser) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden. Required roles: {[role.value for role in allowed_roles]}",
            )
        return current_user

    return Depends(role_checker)


# Dependency for endpoints accessible by Admin OR Supervisor
AdminOrSupervisor = require_role(UserRole.admin, UserRole.supervisor)

# Dependency for endpoints ONLY accessible by Admin
AdminOnly = require_role(UserRole.admin)


def can_delete_user(current_user: User, target_user: User) -> bool:
    """
    Check if current user can delete target user based on role hierarchy.

    Permission hierarchy:
    - Admin can delete anyone (except themselves, checked separately)
    - Supervisor can delete Publisher, Teacher, Student (NOT Admin or Supervisor)
    - Other roles cannot delete users

    Args:
        current_user: The user attempting the deletion
        target_user: The user being deleted

    Returns:
        True if deletion is allowed, False otherwise
    """
    # Self-deletion is handled separately in endpoints
    if current_user.id == target_user.id:
        return False

    # Admins can delete anyone (except themselves, handled above)
    if current_user.role == UserRole.admin:
        return True

    # Supervisors cannot delete Admins or other Supervisors
    if current_user.role == UserRole.supervisor:
        if target_user.role in [UserRole.admin, UserRole.supervisor]:
            return False
        return True

    # Other roles cannot delete users
    return False


async def get_arq_pool(request: Request) -> "ArqRedis":
    """Get arq Redis pool from app state for background task enqueueing."""
    return request.app.state.arq_pool


def can_delete_school(current_user: User) -> bool:
    """
    Check if current user can delete a school.

    Args:
        current_user: The user attempting the deletion

    Returns:
        True if deletion is allowed (Admin or Supervisor)
    """
    return current_user.role in [UserRole.admin, UserRole.supervisor]
