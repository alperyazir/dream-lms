"""Tests for LLM Rate Limiter."""

from unittest.mock import MagicMock

import pytest

from app.services.llm.config import LLMSettings
from app.services.llm.exceptions import RateLimitExceededError
from app.services.llm.rate_limiter import RateLimiter


def create_mock_settings(
    max_per_request: int = 20,
    daily_limit: int = 100,
) -> LLMSettings:
    """Create mock LLM settings for testing."""
    settings = MagicMock(spec=LLMSettings)
    settings.AI_MAX_QUESTIONS_PER_REQUEST = max_per_request
    settings.AI_DAILY_LIMIT_PER_TEACHER = daily_limit
    return settings


class TestRateLimiter:
    """Tests for RateLimiter class."""

    def test_check_per_request_limit_success(self) -> None:
        """Test requests within limit succeed."""
        settings = create_mock_settings(max_per_request=20)
        limiter = RateLimiter(settings=settings)

        # Should not raise
        limiter.check_per_request_limit(10)
        limiter.check_per_request_limit(20)

    def test_check_per_request_limit_exceeded(self) -> None:
        """Test RateLimitExceededError raised when limit hit."""
        settings = create_mock_settings(max_per_request=20)
        limiter = RateLimiter(settings=settings)

        with pytest.raises(RateLimitExceededError) as exc_info:
            limiter.check_per_request_limit(21)

        assert exc_info.value.limit_type == "per_request"
        assert exc_info.value.current_usage == 21
        assert exc_info.value.max_allowed == 20

    def test_check_daily_limit_success(self) -> None:
        """Test daily limit check passes when under limit."""
        settings = create_mock_settings(daily_limit=100)
        limiter = RateLimiter(settings=settings)

        # Should not raise
        limiter.check_daily_limit("teacher-1", count=50)
        limiter.check_daily_limit("teacher-1", count=49)

    def test_check_daily_limit_exceeded(self) -> None:
        """Test daily limit exceeded error."""
        settings = create_mock_settings(daily_limit=100)
        limiter = RateLimiter(settings=settings)

        # Record some usage first
        limiter.record_usage("teacher-1", count=95)

        # Try to use more than remaining
        with pytest.raises(RateLimitExceededError) as exc_info:
            limiter.check_daily_limit("teacher-1", count=10)

        assert exc_info.value.limit_type == "daily"
        assert exc_info.value.current_usage == 95
        assert exc_info.value.max_allowed == 100
        assert exc_info.value.reset_at is not None

    def test_record_usage(self) -> None:
        """Test usage recording."""
        settings = create_mock_settings(daily_limit=100)
        limiter = RateLimiter(settings=settings)

        limiter.record_usage("teacher-1", count=10)
        assert limiter.get_usage("teacher-1") == 10

        limiter.record_usage("teacher-1", count=5)
        assert limiter.get_usage("teacher-1") == 15

    def test_get_remaining(self) -> None:
        """Test remaining quota calculation."""
        settings = create_mock_settings(daily_limit=100)
        limiter = RateLimiter(settings=settings)

        assert limiter.get_remaining("teacher-1") == 100

        limiter.record_usage("teacher-1", count=30)
        assert limiter.get_remaining("teacher-1") == 70

        limiter.record_usage("teacher-1", count=70)
        assert limiter.get_remaining("teacher-1") == 0

        # Can't go negative
        limiter.record_usage("teacher-1", count=10)
        assert limiter.get_remaining("teacher-1") == 0

    def test_get_quota_info(self) -> None:
        """Test quota info retrieval."""
        settings = create_mock_settings(max_per_request=20, daily_limit=100)
        limiter = RateLimiter(settings=settings)

        limiter.record_usage("teacher-1", count=25)

        info = limiter.get_quota_info("teacher-1")

        assert info["teacher_id"] == "teacher-1"
        assert info["daily_limit"] == 100
        assert info["daily_used"] == 25
        assert info["daily_remaining"] == 75
        assert info["max_per_request"] == 20
        assert "reset_at" in info

    def test_check_limits_both(self) -> None:
        """Test combined limit check."""
        settings = create_mock_settings(max_per_request=20, daily_limit=100)
        limiter = RateLimiter(settings=settings)

        # Should pass
        limiter.check_limits("teacher-1", count=10)

        # Per-request limit exceeded
        with pytest.raises(RateLimitExceededError) as exc_info:
            limiter.check_limits("teacher-1", count=25)
        assert exc_info.value.limit_type == "per_request"

    def test_reset_teacher(self) -> None:
        """Test resetting a specific teacher's usage."""
        settings = create_mock_settings(daily_limit=100)
        limiter = RateLimiter(settings=settings)

        limiter.record_usage("teacher-1", count=50)
        limiter.record_usage("teacher-2", count=30)

        limiter.reset_teacher("teacher-1")

        assert limiter.get_usage("teacher-1") == 0
        assert limiter.get_usage("teacher-2") == 30

    def test_reset_all(self) -> None:
        """Test resetting all usage data."""
        settings = create_mock_settings(daily_limit=100)
        limiter = RateLimiter(settings=settings)

        limiter.record_usage("teacher-1", count=50)
        limiter.record_usage("teacher-2", count=30)

        limiter.reset_all()

        assert limiter.get_usage("teacher-1") == 0
        assert limiter.get_usage("teacher-2") == 0

    def test_isolation_between_teachers(self) -> None:
        """Test that different teachers have isolated limits."""
        settings = create_mock_settings(daily_limit=100)
        limiter = RateLimiter(settings=settings)

        limiter.record_usage("teacher-1", count=90)
        limiter.record_usage("teacher-2", count=10)

        # teacher-1 near limit
        with pytest.raises(RateLimitExceededError):
            limiter.check_daily_limit("teacher-1", count=15)

        # teacher-2 has plenty left
        limiter.check_daily_limit("teacher-2", count=50)  # Should not raise

    def test_default_count_is_one(self) -> None:
        """Test default count is 1 for recording and checking."""
        settings = create_mock_settings(daily_limit=100)
        limiter = RateLimiter(settings=settings)

        limiter.record_usage("teacher-1")
        limiter.record_usage("teacher-1")
        limiter.record_usage("teacher-1")

        assert limiter.get_usage("teacher-1") == 3
