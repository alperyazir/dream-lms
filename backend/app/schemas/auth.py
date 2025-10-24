"""
Authentication schemas for request/response models.
Defines Pydantic models for authentication endpoints.
"""

from pydantic import BaseModel, EmailStr, field_validator

from app.core.security import validate_password_strength


class LoginRequest(BaseModel):
    """Login request schema with email and password."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response schema returned after successful authentication."""

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int  # Seconds until access token expires


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""

    refresh_token: str


class ChangePasswordRequest(BaseModel):
    """Change password request schema."""

    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        """Validate new password meets strength requirements."""
        validate_password_strength(v)
        return v
