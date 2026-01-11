"""
LLM Request/Response Logging.

Structured logging for LLM requests with support for debugging
and usage analytics.
"""

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field

from app.services.llm.base import GenerationResult, TokenUsage

logger = logging.getLogger("llm.requests")


class LLMRequestLog(BaseModel):
    """Structured log entry for LLM requests."""

    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Request timestamp in UTC.",
    )
    request_id: str = Field(
        description="Unique request identifier.",
    )
    provider: str = Field(
        description="LLM provider used.",
    )
    model: str = Field(
        description="Model used for generation.",
    )
    prompt_hash: str = Field(
        description="SHA-256 hash of the prompt (for privacy).",
    )
    prompt_length: int = Field(
        ge=0,
        description="Length of the prompt in characters.",
    )
    token_usage: TokenUsage | None = Field(
        default=None,
        description="Token usage details.",
    )
    latency_ms: int = Field(
        ge=0,
        description="Request latency in milliseconds.",
    )
    success: bool = Field(
        description="Whether the request succeeded.",
    )
    error_type: str | None = Field(
        default=None,
        description="Error type if request failed.",
    )
    error_message: str | None = Field(
        default=None,
        description="Error message if request failed.",
    )
    user_id: str | None = Field(
        default=None,
        description="User ID making the request.",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata.",
    )

    def to_json(self) -> str:
        """Serialize to JSON string for logging."""
        return self.model_dump_json()

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        data = self.model_dump()
        data["timestamp"] = self.timestamp.isoformat()
        if self.token_usage:
            data["token_usage"] = self.token_usage.model_dump()
        return data


def hash_prompt(prompt: str) -> str:
    """
    Create a SHA-256 hash of the prompt for privacy-preserving logging.

    Args:
        prompt: The prompt text.

    Returns:
        Hexadecimal hash string.
    """
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:16]


def generate_request_id() -> str:
    """
    Generate a unique request ID.

    Returns:
        Unique request identifier.
    """
    import uuid
    return str(uuid.uuid4())[:8]


class LLMLogger:
    """
    Structured logger for LLM requests.

    Provides methods for logging successful and failed LLM requests
    with consistent structured format.
    """

    def __init__(self, logger_name: str = "llm.requests") -> None:
        """Initialize the LLM logger."""
        self._logger = logging.getLogger(logger_name)
        self._logs: list[LLMRequestLog] = []  # In-memory buffer for testing

    def log_request(
        self,
        request_id: str,
        provider: str,
        model: str,
        prompt: str,
        result: GenerationResult | None = None,
        error: Exception | None = None,
        latency_ms: int = 0,
        user_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> LLMRequestLog:
        """
        Log an LLM request.

        Args:
            request_id: Unique request identifier.
            provider: Provider name.
            model: Model name.
            prompt: The input prompt.
            result: Generation result if successful.
            error: Exception if failed.
            latency_ms: Request latency in milliseconds.
            user_id: Optional user ID.
            metadata: Additional metadata.

        Returns:
            The created log entry.
        """
        log_entry = LLMRequestLog(
            request_id=request_id,
            provider=provider,
            model=model,
            prompt_hash=hash_prompt(prompt),
            prompt_length=len(prompt),
            token_usage=result.token_usage if result else None,
            latency_ms=latency_ms,
            success=error is None,
            error_type=type(error).__name__ if error else None,
            error_message=str(error) if error else None,
            user_id=user_id,
            metadata=metadata or {},
        )

        # Log as structured JSON
        log_dict = log_entry.to_dict()

        if error:
            self._logger.warning(
                f"LLM request failed: {json.dumps(log_dict)}",
                extra={"llm_log": log_dict},
            )
        else:
            self._logger.info(
                f"LLM request completed: {json.dumps(log_dict)}",
                extra={"llm_log": log_dict},
            )

        # Store in memory buffer
        self._logs.append(log_entry)

        return log_entry

    def log_success(
        self,
        request_id: str,
        provider: str,
        prompt: str,
        result: GenerationResult,
        latency_ms: int,
        user_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> LLMRequestLog:
        """
        Log a successful LLM request.

        Args:
            request_id: Unique request identifier.
            provider: Provider name.
            prompt: The input prompt.
            result: Generation result.
            latency_ms: Request latency in milliseconds.
            user_id: Optional user ID.
            metadata: Additional metadata.

        Returns:
            The created log entry.
        """
        return self.log_request(
            request_id=request_id,
            provider=provider,
            model=result.model,
            prompt=prompt,
            result=result,
            latency_ms=latency_ms,
            user_id=user_id,
            metadata=metadata,
        )

    def log_error(
        self,
        request_id: str,
        provider: str,
        model: str,
        prompt: str,
        error: Exception,
        latency_ms: int,
        user_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> LLMRequestLog:
        """
        Log a failed LLM request.

        Args:
            request_id: Unique request identifier.
            provider: Provider name.
            model: Model name.
            prompt: The input prompt.
            error: The exception that occurred.
            latency_ms: Request latency in milliseconds.
            user_id: Optional user ID.
            metadata: Additional metadata.

        Returns:
            The created log entry.
        """
        return self.log_request(
            request_id=request_id,
            provider=provider,
            model=model,
            prompt=prompt,
            error=error,
            latency_ms=latency_ms,
            user_id=user_id,
            metadata=metadata,
        )

    def get_recent_logs(self, limit: int = 100) -> list[LLMRequestLog]:
        """
        Get recent log entries from memory buffer.

        Args:
            limit: Maximum number of entries to return.

        Returns:
            List of recent log entries.
        """
        return self._logs[-limit:]

    def clear_logs(self) -> None:
        """Clear the in-memory log buffer (for testing)."""
        self._logs.clear()


# Global logger instance
_llm_logger: LLMLogger | None = None


def get_llm_logger() -> LLMLogger:
    """
    Get the global LLM logger instance.

    Returns:
        Configured LLMLogger instance.
    """
    global _llm_logger
    if _llm_logger is None:
        _llm_logger = LLMLogger()
    return _llm_logger


def reset_llm_logger() -> None:
    """Reset the global LLM logger instance (for testing)."""
    global _llm_logger
    _llm_logger = None
