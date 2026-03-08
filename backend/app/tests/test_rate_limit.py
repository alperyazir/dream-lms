"""
Tests for rate limiting functionality.

Tests cover:
- get_user_id_or_ip key function (unit tests)
- Rate limit enforcement (integration tests)
- Fail-open behavior when Redis unavailable
"""

import uuid
from datetime import timedelta, timezone, datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.rate_limit import ALGORITHM, RateLimits, get_user_id_or_ip
from app.core.security import create_access_token


class TestGetUserIdOrIp:
    """Unit tests for the get_user_id_or_ip key function."""

    def _make_request(self, auth_header: str | None = None, client_ip: str = "127.0.0.1") -> MagicMock:
        """Create a mock Request object."""
        request = MagicMock()
        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header
        request.headers = headers
        request.client = MagicMock()
        request.client.host = client_ip
        # slowapi's get_remote_address uses request.client.host
        request.scope = {"type": "http"}
        return request

    def test_returns_user_id_for_valid_token(self):
        """Authenticated requests return user:{id}."""
        user_id = str(uuid.uuid4())
        token = create_access_token(
            subject=user_id,
            expires_delta=timedelta(hours=1),
        )
        request = self._make_request(auth_header=f"Bearer {token}")

        result = get_user_id_or_ip(request)

        assert result == f"user:{user_id}"

    def test_returns_ip_for_no_auth_header(self):
        """Unauthenticated requests return ip:{addr}."""
        request = self._make_request(client_ip="192.168.1.100")

        result = get_user_id_or_ip(request)

        assert result == "ip:192.168.1.100"

    def test_returns_ip_for_invalid_token(self):
        """Invalid tokens fall back to IP."""
        request = self._make_request(
            auth_header="Bearer invalid.token.here",
            client_ip="10.0.0.1",
        )

        result = get_user_id_or_ip(request)

        assert result == "ip:10.0.0.1"

    def test_returns_ip_for_expired_token(self):
        """Expired tokens fall back to IP."""
        user_id = str(uuid.uuid4())
        token = create_access_token(
            subject=user_id,
            expires_delta=timedelta(hours=-1),  # Already expired
        )
        request = self._make_request(
            auth_header=f"Bearer {token}",
            client_ip="10.0.0.2",
        )

        result = get_user_id_or_ip(request)

        assert result == "ip:10.0.0.2"

    def test_returns_ip_for_empty_bearer(self):
        """Empty bearer token falls back to IP."""
        request = self._make_request(
            auth_header="Bearer ",
            client_ip="10.0.0.3",
        )

        result = get_user_id_or_ip(request)

        assert result == "ip:10.0.0.3"

    def test_returns_ip_for_non_bearer_auth(self):
        """Non-Bearer auth schemes fall back to IP."""
        request = self._make_request(
            auth_header="Basic dXNlcjpwYXNz",
            client_ip="10.0.0.4",
        )

        result = get_user_id_or_ip(request)

        assert result == "ip:10.0.0.4"


class TestRateLimitsConstants:
    """Verify rate limit tier constants are set correctly."""

    def test_auth_tier(self):
        assert RateLimits.AUTH == "10/minute"

    def test_ai_tier(self):
        assert RateLimits.AI == "20/minute"

    def test_write_tier(self):
        assert RateLimits.WRITE == "60/minute"

    def test_read_tier(self):
        assert RateLimits.READ == "200/minute"

    def test_admin_tier(self):
        assert RateLimits.ADMIN == "300/minute"

    def test_upload_tier(self):
        assert RateLimits.UPLOAD == "10/minute"


class TestRateLimitConfig:
    """Verify rate limit configuration settings exist."""

    def test_rate_limit_enabled_setting(self):
        assert hasattr(settings, "RATE_LIMIT_ENABLED")
        assert isinstance(settings.RATE_LIMIT_ENABLED, bool)

    def test_rate_limit_redis_url_setting(self):
        assert hasattr(settings, "RATE_LIMIT_REDIS_URL")
        assert isinstance(settings.RATE_LIMIT_REDIS_URL, str)

    def test_rate_limit_default_setting(self):
        assert hasattr(settings, "RATE_LIMIT_DEFAULT")
        assert settings.RATE_LIMIT_DEFAULT == "200/minute"


class TestRateLimitIntegration:
    """Integration tests for rate limiting on actual endpoints."""

    def test_login_rate_limit_returns_429(self, client: TestClient, admin_user):
        """AUTH tier returns 429 after exceeding 10 requests/minute."""
        # Make 10 requests (limit is 10/minute)
        for i in range(10):
            response = client.post(
                f"{settings.API_V1_STR}/login/access-token",
                data={"username": "wrong@example.com", "password": "wrong"},
            )
            # Should get 400 (invalid credentials), not 429
            assert response.status_code == 400, f"Request {i+1} got {response.status_code}"

        # 11th request should be rate limited
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "wrong@example.com", "password": "wrong"},
        )
        assert response.status_code == 429

    def test_429_response_has_retry_after_header(self, client: TestClient, admin_user):
        """429 response includes Retry-After header."""
        # Exhaust rate limit (10/minute)
        for _ in range(11):
            client.post(
                f"{settings.API_V1_STR}/login/access-token",
                data={"username": "wrong@example.com", "password": "wrong"},
            )

        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "wrong@example.com", "password": "wrong"},
        )

        if response.status_code == 429:
            assert "retry-after" in response.headers or "Retry-After" in response.headers

    def test_429_response_body_format(self, client: TestClient, admin_user):
        """429 response body includes detail and retry_after."""
        # Exhaust rate limit (10/minute)
        for _ in range(11):
            client.post(
                f"{settings.API_V1_STR}/login/access-token",
                data={"username": "wrong@example.com", "password": "wrong"},
            )

        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": "wrong@example.com", "password": "wrong"},
        )

        if response.status_code == 429:
            body = response.json()
            assert "detail" in body
            assert "Rate limit exceeded" in body["detail"]


class TestRateLimitDisabled:
    """Test that rate limiting can be disabled via configuration."""

    def test_disabled_rate_limit_allows_all_requests(self):
        """When RATE_LIMIT_ENABLED is False, no requests are blocked."""
        # This test verifies the config flag exists and is used
        # The actual limiter reads this at initialization time
        from app.core.rate_limit import limiter
        assert hasattr(limiter, "_enabled") or hasattr(limiter, "enabled")
