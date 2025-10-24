"""
Authentication dependencies for FastAPI endpoints.
Provides JWT token validation and role-based access control.
"""

from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_token
from app.db import get_db
from app.models.user import User, UserRole

# OAuth2 scheme for token extraction from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    """
    Extract and validate JWT from Authorization header, return current user.

    Args:
        token: JWT token from Authorization header
        db: Async database session

    Returns:
        Authenticated User object

    Raises:
        HTTPException: If token is invalid or user not found/inactive (401)
    """
    # Verify and decode token (raises HTTPException if invalid)
    payload = verify_token(token)

    # Extract user_id from token payload
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Query database for user
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_role(*allowed_roles: UserRole) -> Callable:
    """
    Dependency factory for role-based access control.
    Creates a dependency that checks if current user has required role.

    Args:
        *allowed_roles: One or more UserRole values that are allowed

    Returns:
        FastAPI dependency function that validates user role

    Example:
        @router.get("/admin-only", dependencies=[Depends(require_role(UserRole.admin))])
        async def admin_endpoint():
            pass
    """

    async def role_checker(user: User = Depends(get_current_user)) -> User:
        """Check if user has one of the allowed roles."""
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return role_checker


# Convenience dependencies for specific roles
async def get_current_admin(user: User = Depends(require_role(UserRole.admin))) -> User:
    """Dependency that requires admin role."""
    return user


async def get_current_publisher(
    user: User = Depends(require_role(UserRole.publisher)),
) -> User:
    """Dependency that requires publisher role."""
    return user


async def get_current_teacher(user: User = Depends(require_role(UserRole.teacher))) -> User:
    """Dependency that requires teacher role."""
    return user


async def get_current_student(user: User = Depends(require_role(UserRole.student))) -> User:
    """Dependency that requires student role."""
    return user
