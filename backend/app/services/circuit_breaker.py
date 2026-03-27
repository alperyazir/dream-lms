"""Simple circuit breaker for external service calls."""

import asyncio
import logging
import time

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """
    Simple circuit breaker to prevent cascading failures.

    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Service is down, fail fast without making requests
    - HALF_OPEN: Testing if service recovered, allow one request through
    """

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._state = self.CLOSED
        self._failure_count = 0
        self._last_failure_time: float = 0
        self._lock = asyncio.Lock()

    @property
    def state(self) -> str:
        if self._state == self.OPEN:
            if time.time() - self._last_failure_time >= self.recovery_timeout:
                return self.HALF_OPEN
        return self._state

    async def call(self, func, *args, **kwargs):
        """Execute function through circuit breaker."""
        current_state = self.state

        if current_state == self.OPEN:
            logger.warning(f"Circuit breaker [{self.name}] is OPEN — failing fast")
            raise CircuitBreakerOpenError(
                f"Service {self.name} is unavailable (circuit open)"
            )

        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
        except Exception:
            await self._on_failure()
            raise

    async def _on_success(self):
        async with self._lock:
            self._failure_count = 0
            if self._state != self.CLOSED:
                logger.info(f"Circuit breaker [{self.name}] CLOSED — service recovered")
                self._state = self.CLOSED

    async def _on_failure(self):
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()
            if self._failure_count >= self.failure_threshold:
                self._state = self.OPEN
                logger.error(
                    f"Circuit breaker [{self.name}] OPENED — "
                    f"{self._failure_count} consecutive failures"
                )


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open."""

    pass
