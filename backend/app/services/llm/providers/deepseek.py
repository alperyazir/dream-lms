"""
DeepSeek LLM Provider Implementation.

Implements LLMProvider for DeepSeek API, using the deepseek-chat (V3) model.
Compatible with OpenAI API format.
"""

import json
import logging
import time
from typing import Any

import httpx

from app.services.llm.base import (
    GenerationOptions,
    GenerationResult,
    LLMProvider,
    LLMProviderType,
    TokenUsage,
)
from app.services.llm.config import LLMSettings
from app.services.llm.exceptions import (
    LLMAuthenticationError,
    LLMConnectionError,
    LLMProviderError,
    LLMRateLimitError,
    LLMResponseError,
    LLMTimeoutError,
)

logger = logging.getLogger(__name__)


class DeepSeekProvider(LLMProvider):
    """
    DeepSeek LLM provider implementation.

    Uses the DeepSeek API which is compatible with OpenAI's API format.
    Primary model: deepseek-chat (DeepSeek-V3)

    Attributes:
        API_ENDPOINT: The DeepSeek API endpoint URL.
        DEFAULT_MODEL: The default model to use (deepseek-chat).
    """

    API_ENDPOINT = "https://api.deepseek.com/v1/chat/completions"
    DEFAULT_MODEL = "deepseek-chat"

    def __init__(self, settings: LLMSettings | None = None) -> None:
        """
        Initialize DeepSeek provider.

        Args:
            settings: LLM settings instance. If None, loads from environment.
        """
        if settings is None:
            from app.services.llm.config import get_llm_settings

            settings = get_llm_settings()

        self._settings = settings
        self._api_key = settings.DEEPSEEK_API_KEY

    async def generate(
        self,
        prompt: str,
        options: GenerationOptions | None = None,
    ) -> GenerationResult:
        """
        Generate text completion using DeepSeek API.

        Args:
            prompt: The input prompt for generation.
            options: Optional generation options.

        Returns:
            GenerationResult with generated content and metadata.

        Raises:
            LLMProviderError: On any provider error.
        """
        options = options or GenerationOptions()
        model = options.model or self.DEFAULT_MODEL

        payload = self._build_request_payload(prompt, options, model)

        return await self._execute_with_retry(payload, model)

    async def generate_structured(
        self,
        prompt: str,
        schema: dict[str, Any],
        options: GenerationOptions | None = None,
    ) -> dict[str, Any]:
        """
        Generate structured JSON output matching a schema.

        Args:
            prompt: The input prompt for generation.
            schema: JSON schema for expected output format.
            options: Optional generation options.

        Returns:
            Parsed JSON dictionary.

        Raises:
            LLMProviderError: On any provider error.
            LLMResponseError: If response is not valid JSON.
        """
        options = options or GenerationOptions()

        # Add schema instructions to prompt
        structured_prompt = self._build_structured_prompt(prompt, schema)

        # Force JSON response format
        json_options = GenerationOptions(
            temperature=options.temperature,
            max_tokens=options.max_tokens,
            model=options.model,
            response_format="json",
            top_p=options.top_p,
            stop=options.stop,
        )

        result = await self.generate(structured_prompt, json_options)

        # Parse JSON response
        try:
            parsed = json.loads(result.content)
            if not isinstance(parsed, dict):
                raise LLMResponseError(
                    message="Response is not a JSON object",
                    provider=self.get_name(),
                    details={"content": result.content},
                )
            return parsed
        except json.JSONDecodeError as e:
            raise LLMResponseError(
                message=f"Failed to parse JSON response: {e}",
                provider=self.get_name(),
                details={"content": result.content, "error": str(e)},
            ) from e

    def get_name(self) -> str:
        """Return provider name."""
        return "deepseek"

    def get_default_model(self) -> str:
        """Return the default model identifier."""
        return self.DEFAULT_MODEL

    def is_available(self) -> bool:
        """Check if provider is configured with API key."""
        return bool(self._api_key)

    def _build_request_payload(
        self,
        prompt: str,
        options: GenerationOptions,
        model: str,
    ) -> dict[str, Any]:
        """Build the API request payload."""
        payload: dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": options.temperature,
            "max_tokens": options.max_tokens,
            "top_p": options.top_p,
        }

        if options.response_format == "json":
            payload["response_format"] = {"type": "json_object"}

        if options.stop:
            payload["stop"] = options.stop

        return payload

    def _build_structured_prompt(
        self,
        prompt: str,
        schema: dict[str, Any],
    ) -> str:
        """Build prompt with schema instructions for structured output."""
        schema_str = json.dumps(schema, indent=2)
        return (
            f"{prompt}\n\n"
            f"Respond with a JSON object that matches this schema:\n"
            f"```json\n{schema_str}\n```\n\n"
            f"Respond ONLY with valid JSON, no additional text."
        )

    async def _execute_with_retry(
        self,
        payload: dict[str, Any],
        model: str,
    ) -> GenerationResult:
        """
        Execute API request with retry logic.

        Args:
            payload: Request payload.
            model: Model being used.

        Returns:
            GenerationResult on success.

        Raises:
            LLMProviderError: On non-retryable errors or after all retries exhausted.
        """
        max_retries = self._settings.LLM_MAX_RETRIES
        retry_delay = self._settings.LLM_RETRY_DELAY
        last_error: LLMProviderError | None = None

        for attempt in range(max_retries + 1):
            try:
                return await self._make_request(payload, model)
            except (LLMConnectionError, LLMTimeoutError) as e:
                # Retryable errors
                last_error = e
                if attempt < max_retries:
                    wait_time = retry_delay * (2**attempt)  # Exponential backoff
                    logger.warning(
                        f"DeepSeek request failed (attempt {attempt + 1}/{max_retries + 1}), "
                        f"retrying in {wait_time:.1f}s: {e}"
                    )
                    time.sleep(wait_time)
                continue
            except LLMRateLimitError as e:
                # Rate limit - retry with backoff
                last_error = e
                if attempt < max_retries:
                    wait_time = e.retry_after_seconds or (retry_delay * (2**attempt))
                    logger.warning(
                        f"DeepSeek rate limit hit (attempt {attempt + 1}/{max_retries + 1}), "
                        f"waiting {wait_time}s"
                    )
                    time.sleep(wait_time)
                continue
            except LLMProviderError:
                # Non-retryable errors (auth, etc.)
                raise

        # All retries exhausted
        raise last_error or LLMProviderError(
            message="Request failed after all retries",
            provider=self.get_name(),
        )

    async def _make_request(
        self,
        payload: dict[str, Any],
        model: str,
    ) -> GenerationResult:
        """
        Make a single API request.

        Args:
            payload: Request payload.
            model: Model being used.

        Returns:
            GenerationResult on success.

        Raises:
            LLMProviderError subclass based on error type.
        """
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        start_time = time.time()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.API_ENDPOINT,
                    json=payload,
                    headers=headers,
                    timeout=self._settings.LLM_REQUEST_TIMEOUT,
                )

            latency_ms = int((time.time() - start_time) * 1000)

            # Handle HTTP errors
            self._handle_http_error(response)

            # Parse response
            data = response.json()
            return self._parse_response(data, model, latency_ms)

        except httpx.TimeoutException as e:
            raise LLMTimeoutError(
                message=f"Request timed out after {self._settings.LLM_REQUEST_TIMEOUT}s",
                provider=self.get_name(),
                details={"timeout": self._settings.LLM_REQUEST_TIMEOUT},
            ) from e
        except httpx.ConnectError as e:
            raise LLMConnectionError(
                message=f"Failed to connect to DeepSeek API: {e}",
                provider=self.get_name(),
            ) from e
        except httpx.HTTPError as e:
            raise LLMConnectionError(
                message=f"HTTP error communicating with DeepSeek: {e}",
                provider=self.get_name(),
            ) from e

    def _handle_http_error(self, response: httpx.Response) -> None:
        """
        Handle HTTP response errors.

        Args:
            response: The HTTP response to check.

        Raises:
            LLMProviderError subclass based on status code.
        """
        if response.is_success:
            return

        status_code = response.status_code
        try:
            error_data = response.json()
            error_message = error_data.get("error", {}).get(
                "message", response.text
            )
        except (json.JSONDecodeError, KeyError):
            error_message = response.text

        if status_code == 401:
            raise LLMAuthenticationError(
                message=f"Authentication failed: {error_message}",
                provider=self.get_name(),
            )
        elif status_code == 429:
            # Try to extract retry-after header
            retry_after = response.headers.get("retry-after")
            retry_seconds = int(retry_after) if retry_after else None
            raise LLMRateLimitError(
                message=f"Rate limit exceeded: {error_message}",
                provider=self.get_name(),
                retry_after_seconds=retry_seconds,
            )
        elif status_code in (500, 502, 503):
            raise LLMConnectionError(
                message=f"Server error ({status_code}): {error_message}",
                provider=self.get_name(),
                details={"status_code": status_code},
            )
        else:
            raise LLMProviderError(
                message=f"API error ({status_code}): {error_message}",
                provider=self.get_name(),
                details={"status_code": status_code},
            )

    def _parse_response(
        self,
        data: dict[str, Any],
        model: str,
        latency_ms: int,
    ) -> GenerationResult:
        """
        Parse API response into GenerationResult.

        Args:
            data: Raw API response data.
            model: Model used for generation.
            latency_ms: Request latency in milliseconds.

        Returns:
            GenerationResult with parsed data.

        Raises:
            LLMResponseError: If response format is invalid.
        """
        try:
            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})

            prompt_tokens = usage.get("prompt_tokens", 0)
            completion_tokens = usage.get("completion_tokens", 0)

            token_usage = TokenUsage.calculate_cost(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                provider=LLMProviderType.DEEPSEEK,
            )

            return GenerationResult(
                content=content,
                token_usage=token_usage,
                model=model,
                provider=self.get_name(),
                latency_ms=latency_ms,
                raw_response=data,
            )
        except (KeyError, IndexError) as e:
            raise LLMResponseError(
                message=f"Invalid response format: {e}",
                provider=self.get_name(),
                details={"response": data},
            ) from e
