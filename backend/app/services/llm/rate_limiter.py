"""
LLM Rate Limiter.

In-memory rate limiting for LLM requests with configurable
per-request and daily limits per teacher.
"""

from collections import defaultdict
from datetime import datetime, timezone
from typing import NamedTuple

from app.services.llm.config import LLMSettings, get_llm_settings
from app.services.llm.exceptions import RateLimitExceededError


class UsageRecord(NamedTuple):
    """Record of usage for a specific date."""

    date: str
    count: int


class RateLimiter:
    """
    In-memory rate limiter for LLM requests.

    Tracks usage per teacher and enforces configurable limits.
    Uses in-memory storage - for production, consider Redis.
    """

    def __init__(self, settings: LLMSettings | None = None) -> None:
        """
        Initialize the rate limiter.

        Args:
            settings: LLM settings. If None, loads from environment.
        """
        self._settings = settings or get_llm_settings()
        # Usage tracking: teacher_id -> {date_str: count}
        self._daily_usage: dict[str, dict[str, int]] = defaultdict(
            lambda: defaultdict(int)
        )

    @property
    def max_per_request(self) -> int:
        """Get maximum items per request."""
        return self._settings.AI_MAX_QUESTIONS_PER_REQUEST

    @property
    def daily_limit(self) -> int:
        """Get daily limit per teacher."""
        return self._settings.AI_DAILY_LIMIT_PER_TEACHER

    def _get_today(self) -> str:
        """Get today's date as string for tracking."""
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def _get_reset_time(self) -> str:
        """Get the next reset time (midnight UTC)."""
        now = datetime.now(timezone.utc)
        tomorrow = now.replace(hour=0, minute=0, second=0, microsecond=0)
        if now >= tomorrow:
            from datetime import timedelta
            tomorrow = tomorrow + timedelta(days=1)
        return tomorrow.isoformat()

    def check_per_request_limit(self, count: int) -> None:
        """
        Check if request count exceeds per-request limit.

        Args:
            count: Number of items requested.

        Raises:
            RateLimitExceededError: If count exceeds per-request limit.
        """
        if count > self.max_per_request:
            raise RateLimitExceededError(
                f"Request exceeds maximum of {self.max_per_request} items per request",
                limit_type="per_request",
                current_usage=count,
                max_allowed=self.max_per_request,
            )

    def check_daily_limit(self, teacher_id: str, count: int = 1) -> None:
        """
        Check if teacher has remaining daily quota.

        Args:
            teacher_id: The teacher's ID.
            count: Number of items being requested.

        Raises:
            RateLimitExceededError: If daily limit would be exceeded.
        """
        today = self._get_today()
        current_usage = self._daily_usage[teacher_id].get(today, 0)

        if current_usage + count > self.daily_limit:
            raise RateLimitExceededError(
                f"Daily limit of {self.daily_limit} generations exceeded",
                limit_type="daily",
                current_usage=current_usage,
                max_allowed=self.daily_limit,
                reset_at=self._get_reset_time(),
            )

    def check_limits(self, teacher_id: str, count: int = 1) -> None:
        """
        Check both per-request and daily limits.

        Args:
            teacher_id: The teacher's ID.
            count: Number of items being requested.

        Raises:
            RateLimitExceededError: If any limit would be exceeded.
        """
        self.check_per_request_limit(count)
        self.check_daily_limit(teacher_id, count)

    def record_usage(self, teacher_id: str, count: int = 1) -> None:
        """
        Record usage for a teacher.

        Args:
            teacher_id: The teacher's ID.
            count: Number of items generated.
        """
        today = self._get_today()
        self._daily_usage[teacher_id][today] += count

    def get_usage(self, teacher_id: str) -> int:
        """
        Get current daily usage for a teacher.

        Args:
            teacher_id: The teacher's ID.

        Returns:
            Current daily usage count.
        """
        today = self._get_today()
        return self._daily_usage[teacher_id].get(today, 0)

    def get_remaining(self, teacher_id: str) -> int:
        """
        Get remaining daily quota for a teacher.

        Args:
            teacher_id: The teacher's ID.

        Returns:
            Remaining generations allowed today.
        """
        return max(0, self.daily_limit - self.get_usage(teacher_id))

    def get_quota_info(self, teacher_id: str) -> dict:
        """
        Get detailed quota information for a teacher.

        Args:
            teacher_id: The teacher's ID.

        Returns:
            Dictionary with quota details.
        """
        current_usage = self.get_usage(teacher_id)
        return {
            "teacher_id": teacher_id,
            "daily_limit": self.daily_limit,
            "daily_used": current_usage,
            "daily_remaining": max(0, self.daily_limit - current_usage),
            "max_per_request": self.max_per_request,
            "reset_at": self._get_reset_time(),
        }

    def reset_teacher(self, teacher_id: str) -> None:
        """
        Reset usage for a specific teacher (for testing/admin).

        Args:
            teacher_id: The teacher's ID.
        """
        if teacher_id in self._daily_usage:
            del self._daily_usage[teacher_id]

    def reset_all(self) -> None:
        """Reset all usage data (for testing)."""
        self._daily_usage.clear()

    def cleanup_old_data(self, days_to_keep: int = 7) -> int:
        """
        Clean up usage data older than specified days.

        Args:
            days_to_keep: Number of days to retain.

        Returns:
            Number of records cleaned up.
        """
        from datetime import timedelta

        cutoff = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        cutoff_str = cutoff.strftime("%Y-%m-%d")
        cleaned = 0

        for teacher_id in list(self._daily_usage.keys()):
            dates_to_remove = [
                date
                for date in self._daily_usage[teacher_id].keys()
                if date < cutoff_str
            ]
            for date in dates_to_remove:
                del self._daily_usage[teacher_id][date]
                cleaned += 1

            # Remove empty teacher entries
            if not self._daily_usage[teacher_id]:
                del self._daily_usage[teacher_id]

        return cleaned


# Global rate limiter instance
_rate_limiter: RateLimiter | None = None


def get_rate_limiter() -> RateLimiter:
    """
    Get the global rate limiter instance.

    Returns:
        Configured RateLimiter instance.
    """
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter


def reset_rate_limiter() -> None:
    """Reset the global rate limiter instance (for testing)."""
    global _rate_limiter
    _rate_limiter = None
