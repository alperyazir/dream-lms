"""
Gemini LLM Provider Implementation.

Implements LLMProvider for Google Gemini API, using the gemini-1.5-flash model.
Supports text generation with future vision and PDF capabilities (Phase 2).
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


class GeminiProvider(LLMProvider):
    """
    Google Gemini LLM provider implementation.

    Uses the Gemini API for text generation with support for
    multimodal input (images, PDFs) in Phase 2.

    Primary model: gemini-1.5-flash (fast, cost-effective)

    Attributes:
        API_BASE_URL: Base URL for Gemini API.
        DEFAULT_MODEL: Default model to use (gemini-1.5-flash).
    """

    API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
    DEFAULT_MODEL = "gemini-2.5-flash"

    def __init__(self, settings: LLMSettings | None = None) -> None:
        """
        Initialize Gemini provider.

        Args:
            settings: LLM settings instance. If None, loads from environment.
        """
        if settings is None:
            from app.services.llm.config import get_llm_settings

            settings = get_llm_settings()

        self._settings = settings
        self._api_key = settings.GEMINI_API_KEY

    async def generate(
        self,
        prompt: str,
        options: GenerationOptions | None = None,
        *,
        image_data: bytes | None = None,
        image_mime_type: str | None = None,
        pdf_data: bytes | None = None,
    ) -> GenerationResult:
        """
        Generate text completion using Gemini API.

        Args:
            prompt: The input prompt for generation.
            options: Optional generation options.
            image_data: Optional base64-encoded image data (Phase 2 - not implemented).
            image_mime_type: MIME type of the image (e.g., 'image/jpeg'). Phase 2.
            pdf_data: Optional PDF data (Phase 2 - not implemented).

        Returns:
            GenerationResult with generated content and metadata.

        Raises:
            LLMProviderError: On any provider error.

        Note:
            image_data and pdf_data parameters are placeholders for Phase 2
            multimodal capabilities. Currently only text input is supported.
        """
        if image_data is not None or pdf_data is not None:
            logger.warning(
                "Image and PDF processing are Phase 2 features. "
                "Input will be ignored and only text prompt will be processed."
            )

        options = options or GenerationOptions()
        model = options.model or self.DEFAULT_MODEL

        payload = self._build_request_payload(prompt, options)

        return await self._execute_with_retry(payload, model, options)

    async def generate_structured(
        self,
        prompt: str,
        schema: dict[str, Any],
        options: GenerationOptions | None = None,
        *,
        image_data: bytes | None = None,
        image_mime_type: str | None = None,
        pdf_data: bytes | None = None,
    ) -> dict[str, Any]:
        """
        Generate structured JSON output matching a schema.

        Args:
            prompt: The input prompt for generation.
            schema: JSON schema for expected output format.
            options: Optional generation options.
            image_data: Optional image data (Phase 2 - not implemented).
            image_mime_type: MIME type of the image. Phase 2.
            pdf_data: Optional PDF data (Phase 2 - not implemented).

        Returns:
            Parsed JSON dictionary.

        Raises:
            LLMProviderError: On any provider error.
            LLMResponseError: If response is not valid JSON.

        Note:
            image_data and pdf_data parameters are placeholders for Phase 2
            multimodal capabilities. Currently only text input is supported.
        """
        if image_data is not None or pdf_data is not None:
            logger.warning(
                "Image and PDF processing are Phase 2 features. "
                "Input will be ignored and only text prompt will be processed."
            )

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

        # Parse JSON response with repair for common LLM issues
        try:
            parsed = json.loads(result.content)
        except json.JSONDecodeError:
            # Try to repair common JSON issues from LLMs
            repaired = self._repair_json(result.content)
            try:
                parsed = json.loads(repaired)
            except json.JSONDecodeError as e:
                raise LLMResponseError(
                    message=f"Failed to parse JSON response: {e}",
                    provider=self.get_name(),
                    details={"content": result.content[:500], "error": str(e)},
                ) from e

        if not isinstance(parsed, dict):
            raise LLMResponseError(
                message="Response is not a JSON object",
                provider=self.get_name(),
                details={"content": result.content[:500]},
            )
        return parsed

    def get_name(self) -> str:
        """Return provider name."""
        return "gemini"

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
    ) -> dict[str, Any]:
        """
        Build the Gemini API request payload.

        Args:
            prompt: The user prompt.
            options: Generation options.

        Returns:
            Request payload dictionary.
        """
        # Build content parts - currently text only
        # Phase 2 will add image/PDF parts here
        parts: list[dict[str, Any]] = [{"text": prompt}]

        payload: dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": parts,
                }
            ],
            "generationConfig": {
                "temperature": options.temperature,
                "maxOutputTokens": options.max_tokens,
                "topP": options.top_p,
            },
        }

        # Enable JSON mode for structured output
        if options.response_format == "json":
            payload["generationConfig"]["responseMimeType"] = "application/json"

        # Add stop sequences if provided
        if options.stop:
            payload["generationConfig"]["stopSequences"] = options.stop

        return payload

    @staticmethod
    def _repair_json(text: str) -> str:
        """
        Attempt to repair common JSON issues from LLM output.

        Handles: markdown fences, trailing commas, unescaped newlines in strings.
        """
        import re

        s = text.strip()

        # Strip markdown code fences
        if s.startswith("```"):
            s = re.sub(r"^```(?:json)?\s*\n?", "", s)
            s = re.sub(r"\n?```\s*$", "", s)

        # Remove trailing commas before } or ]
        s = re.sub(r",\s*([}\]])", r"\1", s)

        # Fix unescaped newlines inside string values
        # Walk through and escape literal newlines that are inside quotes
        result = []
        in_string = False
        escape_next = False
        for ch in s:
            if escape_next:
                result.append(ch)
                escape_next = False
                continue
            if ch == "\\":
                escape_next = True
                result.append(ch)
                continue
            if ch == '"':
                in_string = not in_string
                result.append(ch)
                continue
            if in_string and ch == "\n":
                result.append("\\n")
                continue
            result.append(ch)

        return "".join(result)

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

    def _get_api_endpoint(self, model: str) -> str:
        """
        Build the full API endpoint URL for the given model.

        Args:
            model: Model name to use.

        Returns:
            Full API endpoint URL.
        """
        return f"{self.API_BASE_URL}/{model}:generateContent"

    async def _execute_with_retry(
        self,
        payload: dict[str, Any],
        model: str,
        options: GenerationOptions,
    ) -> GenerationResult:
        """
        Execute API request with retry logic.

        Args:
            payload: Request payload.
            model: Model being used.
            options: Generation options.

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
                        f"Gemini request failed (attempt {attempt + 1}/{max_retries + 1}), "
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
                        f"Gemini rate limit hit (attempt {attempt + 1}/{max_retries + 1}), "
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
        endpoint = self._get_api_endpoint(model)

        # Gemini uses API key in header (preferred) or query param
        headers = {
            "x-goog-api-key": self._api_key,
            "Content-Type": "application/json",
        }

        start_time = time.time()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    endpoint,
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
                message=f"Failed to connect to Gemini API: {e}",
                provider=self.get_name(),
            ) from e
        except httpx.HTTPError as e:
            raise LLMConnectionError(
                message=f"HTTP error communicating with Gemini: {e}",
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
            # Gemini error format: {"error": {"code": 429, "message": "...", "status": "RESOURCE_EXHAUSTED"}}
            error_obj = error_data.get("error", {})
            error_message = error_obj.get("message", response.text)
            error_status = error_obj.get("status", "")
        except (json.JSONDecodeError, KeyError):
            error_message = response.text
            error_status = ""

        if status_code in (401, 403):
            raise LLMAuthenticationError(
                message=f"Authentication failed: {error_message}",
                provider=self.get_name(),
                details={"status": error_status},
            )
        elif status_code == 429:
            # Try to extract retry-after header
            retry_after = response.headers.get("retry-after")
            retry_seconds = int(retry_after) if retry_after else None
            raise LLMRateLimitError(
                message=f"Rate limit exceeded: {error_message}",
                provider=self.get_name(),
                retry_after_seconds=retry_seconds,
                details={"status": error_status},
            )
        elif status_code in (500, 502, 503):
            raise LLMConnectionError(
                message=f"Server error ({status_code}): {error_message}",
                provider=self.get_name(),
                details={"status_code": status_code, "status": error_status},
            )
        else:
            raise LLMProviderError(
                message=f"API error ({status_code}): {error_message}",
                provider=self.get_name(),
                details={"status_code": status_code, "status": error_status},
            )

    def _parse_response(
        self,
        data: dict[str, Any],
        model: str,
        latency_ms: int,
    ) -> GenerationResult:
        """
        Parse Gemini API response into GenerationResult.

        Gemini response format:
        {
          "candidates": [
            {
              "content": {
                "parts": [{"text": "..."}],
                "role": "model"
              },
              "finishReason": "STOP"
            }
          ],
          "usageMetadata": {
            "promptTokenCount": 10,
            "candidatesTokenCount": 20,
            "totalTokenCount": 30
          }
        }

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
            # Extract content from first candidate
            candidates = data.get("candidates", [])
            if not candidates:
                raise LLMResponseError(
                    message="No candidates in response",
                    provider=self.get_name(),
                    details={"response": data},
                )

            content_obj = candidates[0].get("content", {})
            parts = content_obj.get("parts", [])
            if not parts:
                raise LLMResponseError(
                    message="No parts in response content",
                    provider=self.get_name(),
                    details={"response": data},
                )

            # Combine text from non-thinking parts only
            # Gemini 2.5+ models include "thought" parts for reasoning
            content = "".join(
                part.get("text", "")
                for part in parts
                if not part.get("thought", False)
            )

            # Extract token usage
            usage_metadata = data.get("usageMetadata", {})
            prompt_tokens = usage_metadata.get("promptTokenCount", 0)
            completion_tokens = usage_metadata.get("candidatesTokenCount", 0)

            token_usage = TokenUsage.calculate_cost(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                provider=LLMProviderType.GEMINI,
            )

            return GenerationResult(
                content=content,
                token_usage=token_usage,
                model=model,
                provider=self.get_name(),
                latency_ms=latency_ms,
                raw_response=data,
            )
        except (KeyError, IndexError, TypeError) as e:
            raise LLMResponseError(
                message=f"Invalid response format: {e}",
                provider=self.get_name(),
                details={"response": data},
            ) from e
