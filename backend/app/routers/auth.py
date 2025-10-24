"""
Authentication router with login, refresh, logout, and password change endpoints.
Handles JWT token generation and validation.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)
from app.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
)
from app.services.auth_service import (
    authenticate_user,
    build_token_payload,
    is_token_blacklisted,
    logout_user,
)

settings = get_settings()

# Rate limiter configuration
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login",
    description="Authenticate user credentials and return JWT access and refresh tokens",
)
@limiter.limit("5/15minutes")
async def login(
    request: Request, login_data: LoginRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """
    Login endpoint that validates credentials and returns JWT tokens.

    - Validates email and password
    - Returns access token (1-hour expiry) and refresh token (7-day expiry)
    - Does not reveal if user exists (generic error message for security)

    Args:
        login_data: Login credentials (email and password)
        db: Database session

    Returns:
        TokenResponse with access_token, refresh_token, token_type, expires_in

    Raises:
        HTTPException: 401 if credentials are invalid
    """
    # Authenticate user (returns None if invalid without leaking existence)
    user = await authenticate_user(login_data.email, login_data.password, db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Build token payload with user info and role-specific IDs
    payload = await build_token_payload(user, db)

    # Generate access and refresh tokens
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.jwt_access_token_expire_minutes * 60,  # Convert to seconds
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh access token",
    description="Use refresh token to obtain a new access token",
)
@limiter.limit("10/hour")
async def refresh_token(
    request: Request, refresh_data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """
    Refresh token endpoint that issues a new access token.

    - Validates refresh token
    - Checks if token is blacklisted (logout)
    - Generates new access token with same payload

    Args:
        refresh_data: Refresh token request
        db: Database session

    Returns:
        TokenResponse with new access_token

    Raises:
        HTTPException: 401 if refresh token is invalid or blacklisted
    """
    # Check if refresh token is blacklisted
    if is_token_blacklisted(refresh_data.refresh_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify refresh token (raises HTTPException if invalid)
    payload = verify_token(refresh_data.refresh_token)

    # Generate new access token with same payload
    # Remove exp claim to avoid token with old expiration
    payload_without_exp = {k: v for k, v in payload.items() if k != "exp"}
    access_token = create_access_token(payload_without_exp)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_data.refresh_token,  # Return same refresh token
        token_type="Bearer",
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="User logout",
    description="Invalidate refresh token by adding to blacklist",
)
async def logout(
    refresh_data: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Logout endpoint that invalidates the refresh token.

    - Requires authentication (current user)
    - Adds refresh token to blacklist
    - Prevents further use of refresh token

    Args:
        refresh_data: Refresh token to invalidate
        current_user: Authenticated user (from JWT)

    Note:
        In-memory blacklist will reset on server restart.
        For production, use Redis.
    """
    logout_user(refresh_data.refresh_token)


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change user password",
    description="Change authenticated user's password",
)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Change password endpoint for authenticated users.

    - Requires authentication (current user)
    - Validates old password
    - Validates new password strength
    - Updates password hash

    Args:
        password_data: Old and new password
        current_user: Authenticated user (from JWT)
        db: Database session

    Raises:
        HTTPException: 400 if old password is incorrect
    """
    # Verify old password
    if not verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password",
        )

    # Validate new password strength (already done in schema validator)
    # Hash and update password
    current_user.password_hash = hash_password(password_data.new_password)

    # Commit changes
    await db.commit()
