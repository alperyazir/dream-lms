"""
Unit tests for security module (JWT and password utilities).
Tests token creation, verification, password hashing, and validation.
"""

import pytest
from datetime import timedelta
from fastapi import HTTPException

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    validate_password_strength,
    verify_password,
    verify_token,
)


class TestPasswordHashing:
    """Test password hashing and verification."""

    def test_hash_password(self):
        """Test that password is hashed and not stored as plain text."""
        password = "TestPassword123"
        hashed = hash_password(password)

        assert hashed != password
        assert len(hashed) > 0

    def test_verify_password_correct(self):
        """Test password verification with correct password."""
        password = "TestPassword123"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_wrong_password(self):
        """Test password verification with wrong password."""
        password = "TestPassword123"
        hashed = hash_password(password)

        assert verify_password("WrongPassword", hashed) is False

    def test_hash_different_for_same_password(self):
        """Test that same password produces different hashes (salt)."""
        password = "TestPassword123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        # Hashes should be different due to salt
        assert hash1 != hash2
        # But both should verify correctly
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestPasswordValidation:
    """Test password strength validation."""

    def test_validate_password_strength_valid(self):
        """Test valid password passes all requirements."""
        assert validate_password_strength("ValidPass123") is True
        assert validate_password_strength("Another1Valid") is True
        assert validate_password_strength("Complex99Password") is True

    def test_validate_password_strength_too_short(self):
        """Test password validation rejects passwords < 8 characters."""
        with pytest.raises(ValueError, match="at least 8 characters"):
            validate_password_strength("Short1")

    def test_validate_password_strength_no_uppercase(self):
        """Test password validation rejects passwords without uppercase."""
        with pytest.raises(ValueError, match="uppercase letter"):
            validate_password_strength("lowercase123")

    def test_validate_password_strength_no_lowercase(self):
        """Test password validation rejects passwords without lowercase."""
        with pytest.raises(ValueError, match="lowercase letter"):
            validate_password_strength("UPPERCASE123")

    def test_validate_password_strength_no_number(self):
        """Test password validation rejects passwords without numbers."""
        with pytest.raises(ValueError, match="one number"):
            validate_password_strength("NoNumbersHere")

    def test_validate_password_strength_exactly_8_chars(self):
        """Test password with exactly 8 characters is valid."""
        assert validate_password_strength("Valid123") is True


class TestJWTTokens:
    """Test JWT token creation and verification."""

    def test_create_access_token(self):
        """Test access token creation with payload."""
        payload = {"user_id": "123", "role": "teacher"}
        token = create_access_token(payload)

        assert token is not None
        assert len(token) > 0
        assert isinstance(token, str)

    def test_create_refresh_token(self):
        """Test refresh token creation with 7-day expiration."""
        payload = {"user_id": "123", "role": "teacher"}
        token = create_refresh_token(payload)

        assert token is not None
        assert len(token) > 0
        assert isinstance(token, str)

    def test_verify_token_valid(self):
        """Test token verification with valid token."""
        payload = {"user_id": "123", "role": "teacher"}
        token = create_access_token(payload)

        decoded = verify_token(token)

        assert decoded["user_id"] == "123"
        assert decoded["role"] == "teacher"
        assert "exp" in decoded

    def test_verify_token_invalid(self):
        """Test token verification with invalid token."""
        with pytest.raises(HTTPException) as exc_info:
            verify_token("invalid.token.here")

        assert exc_info.value.status_code == 401
        assert "Invalid token" in exc_info.value.detail

    def test_verify_token_malformed(self):
        """Test token verification with malformed token."""
        with pytest.raises(HTTPException) as exc_info:
            verify_token("not-a-jwt-token")

        assert exc_info.value.status_code == 401

    def test_create_access_token_with_custom_expiration(self):
        """Test access token creation with custom expiration."""
        payload = {"user_id": "123"}
        expires_delta = timedelta(minutes=30)
        token = create_access_token(payload, expires_delta=expires_delta)

        decoded = verify_token(token)
        assert decoded["user_id"] == "123"

    def test_tokens_verify_correctly(self):
        """Test that multiple tokens with same payload both verify correctly."""
        payload = {"user_id": "123"}
        token1 = create_access_token(payload)
        token2 = create_access_token(payload)

        # Both tokens should verify correctly regardless of whether they differ
        assert verify_token(token1)["user_id"] == "123"
        assert verify_token(token2)["user_id"] == "123"

    def test_refresh_token_contains_payload(self):
        """Test that refresh token contains expected payload."""
        payload = {"user_id": "456", "email": "test@example.com", "role": "student"}
        token = create_refresh_token(payload)

        decoded = verify_token(token)

        assert decoded["user_id"] == "456"
        assert decoded["email"] == "test@example.com"
        assert decoded["role"] == "student"
        assert "exp" in decoded
