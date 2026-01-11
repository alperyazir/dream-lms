"""Tests for Gemini LLM Provider."""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.llm.base import GenerationOptions
from app.services.llm.config import LLMSettings
from app.services.llm.exceptions import (
    LLMAuthenticationError,
    LLMConnectionError,
    LLMRateLimitError,
    LLMResponseError,
    LLMTimeoutError,
)
from app.services.llm.providers.gemini import GeminiProvider


def create_mock_settings(api_key: str | None = "test-api-key") -> LLMSettings:
    """Create mock LLM settings for testing."""
    settings = MagicMock(spec=LLMSettings)
    settings.GEMINI_API_KEY = api_key
    settings.LLM_REQUEST_TIMEOUT = 60
    settings.LLM_MAX_RETRIES = 3
    settings.LLM_RETRY_DELAY = 0.01  # Fast retries for tests
    return settings


def create_mock_response(
    content: str = "Hello, world!",
    prompt_tokens: int = 10,
    completion_tokens: int = 20,
) -> dict:
    """Create a mock Gemini API response."""
    return {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": content}],
                    "role": "model",
                },
                "finishReason": "STOP",
            }
        ],
        "usageMetadata": {
            "promptTokenCount": prompt_tokens,
            "candidatesTokenCount": completion_tokens,
            "totalTokenCount": prompt_tokens + completion_tokens,
        },
    }


class TestGeminiProviderInit:
    """Tests for GeminiProvider initialization."""

    def test_init_with_settings(self) -> None:
        """Test provider initialization with settings."""
        settings = create_mock_settings("my-api-key")
        provider = GeminiProvider(settings=settings)

        assert provider._api_key == "my-api-key"
        assert provider._settings == settings

    def test_get_name(self) -> None:
        """Test get_name returns 'gemini'."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        assert provider.get_name() == "gemini"

    def test_get_default_model(self) -> None:
        """Test get_default_model returns 'gemini-1.5-flash'."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        assert provider.get_default_model() == "gemini-1.5-flash"

    def test_is_available_true(self) -> None:
        """Test is_available returns True when API key present."""
        settings = create_mock_settings("valid-key")
        provider = GeminiProvider(settings=settings)

        assert provider.is_available() is True

    def test_is_available_false(self) -> None:
        """Test is_available returns False when API key missing."""
        settings = create_mock_settings(None)
        provider = GeminiProvider(settings=settings)

        assert provider.is_available() is False


class TestGeminiGenerate:
    """Tests for GeminiProvider.generate()."""

    @pytest.mark.asyncio
    async def test_generate_success(self) -> None:
        """Test successful text generation."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response("Test response", 100, 50)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            result = await provider.generate("Hello!")

            assert result.content == "Test response"
            assert result.provider == "gemini"
            assert result.model == "gemini-1.5-flash"
            assert result.token_usage.prompt_tokens == 100
            assert result.token_usage.completion_tokens == 50
            assert result.token_usage.total_tokens == 150
            assert result.latency_ms >= 0

    @pytest.mark.asyncio
    async def test_generate_with_options(self) -> None:
        """Test generation with custom options."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            options = GenerationOptions(
                temperature=0.5,
                max_tokens=1000,
            )

            await provider.generate("Hello!", options)

            # Verify the request payload
            call_args = mock_client.post.call_args
            payload = call_args.kwargs["json"]

            assert payload["generationConfig"]["temperature"] == 0.5
            assert payload["generationConfig"]["maxOutputTokens"] == 1000

    @pytest.mark.asyncio
    async def test_generate_json_format(self) -> None:
        """Test generation with JSON response format."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response('{"key": "value"}')

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            options = GenerationOptions(response_format="json")
            await provider.generate("Generate JSON", options)

            # Verify JSON mode is set
            call_args = mock_client.post.call_args
            payload = call_args.kwargs["json"]

            assert payload["generationConfig"]["responseMimeType"] == "application/json"

    @pytest.mark.asyncio
    async def test_generate_with_stop_sequences(self) -> None:
        """Test generation with stop sequences."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            options = GenerationOptions(stop=["END", "STOP"])
            await provider.generate("Hello!", options)

            call_args = mock_client.post.call_args
            payload = call_args.kwargs["json"]

            assert payload["generationConfig"]["stopSequences"] == ["END", "STOP"]

    @pytest.mark.asyncio
    async def test_generate_with_image_data_logs_warning(self) -> None:
        """Test that image_data parameter logs a warning (Phase 2 feature)."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            with patch(
                "app.services.llm.providers.gemini.logger"
            ) as mock_logger:
                await provider.generate(
                    "Describe image",
                    image_data=b"fake_image_data",
                    image_mime_type="image/jpeg",
                )

                mock_logger.warning.assert_called()
                warning_msg = mock_logger.warning.call_args[0][0]
                assert "Phase 2" in warning_msg

    @pytest.mark.asyncio
    async def test_generate_with_pdf_data_logs_warning(self) -> None:
        """Test that pdf_data parameter logs a warning (Phase 2 feature)."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            with patch(
                "app.services.llm.providers.gemini.logger"
            ) as mock_logger:
                await provider.generate("Summarize PDF", pdf_data=b"fake_pdf_data")

                mock_logger.warning.assert_called()
                warning_msg = mock_logger.warning.call_args[0][0]
                assert "Phase 2" in warning_msg


class TestGeminiGenerateStructured:
    """Tests for GeminiProvider.generate_structured()."""

    @pytest.mark.asyncio
    async def test_generate_structured_success(self) -> None:
        """Test successful structured generation."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        json_content = '{"name": "Test", "value": 42}'
        mock_response = create_mock_response(json_content)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            schema = {"type": "object", "properties": {"name": {"type": "string"}}}
            result = await provider.generate_structured("Generate data", schema)

            assert result == {"name": "Test", "value": 42}

    @pytest.mark.asyncio
    async def test_generate_structured_invalid_json(self) -> None:
        """Test structured generation with invalid JSON response."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response("This is not JSON")

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            schema = {"type": "object"}

            with pytest.raises(LLMResponseError) as exc_info:
                await provider.generate_structured("Generate data", schema)

            assert "Failed to parse JSON" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_generate_structured_non_object_json(self) -> None:
        """Test structured generation with non-object JSON response."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response("[1, 2, 3]")  # Array, not object

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            schema = {"type": "object"}

            with pytest.raises(LLMResponseError) as exc_info:
                await provider.generate_structured("Generate data", schema)

            assert "not a JSON object" in str(exc_info.value)


class TestGeminiErrorHandling:
    """Tests for Gemini error handling."""

    @pytest.mark.asyncio
    async def test_error_401_authentication(self) -> None:
        """Test 401 error maps to LLMAuthenticationError."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 401
            response.is_success = False
            response.text = "Invalid API key"
            response.json.return_value = {
                "error": {
                    "code": 401,
                    "message": "Invalid API key",
                    "status": "UNAUTHENTICATED",
                }
            }
            mock_client.post.return_value = response

            with pytest.raises(LLMAuthenticationError) as exc_info:
                await provider.generate("Hello!")

            assert "Authentication failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_error_403_permission_denied(self) -> None:
        """Test 403 error maps to LLMAuthenticationError."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 403
            response.is_success = False
            response.text = "Permission denied"
            response.json.return_value = {
                "error": {
                    "code": 403,
                    "message": "Permission denied",
                    "status": "PERMISSION_DENIED",
                }
            }
            mock_client.post.return_value = response

            with pytest.raises(LLMAuthenticationError) as exc_info:
                await provider.generate("Hello!")

            assert "Authentication failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_error_429_rate_limit(self) -> None:
        """Test 429 error maps to LLMRateLimitError."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 0  # Disable retries for this test
        provider = GeminiProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 429
            response.is_success = False
            response.text = "Rate limit exceeded"
            response.headers = {"retry-after": "60"}
            response.json.return_value = {
                "error": {
                    "code": 429,
                    "message": "Resource has been exhausted",
                    "status": "RESOURCE_EXHAUSTED",
                }
            }
            mock_client.post.return_value = response

            with pytest.raises(LLMRateLimitError) as exc_info:
                await provider.generate("Hello!")

            assert exc_info.value.retry_after_seconds == 60

    @pytest.mark.asyncio
    async def test_error_500_server_error(self) -> None:
        """Test 500 error maps to LLMConnectionError."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 0
        provider = GeminiProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 500
            response.is_success = False
            response.text = "Internal server error"
            response.json.return_value = {
                "error": {
                    "code": 500,
                    "message": "Internal server error",
                    "status": "INTERNAL",
                }
            }
            mock_client.post.return_value = response

            with pytest.raises(LLMConnectionError) as exc_info:
                await provider.generate("Hello!")

            assert "Server error (500)" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_error_503_unavailable(self) -> None:
        """Test 503 error maps to LLMConnectionError."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 0
        provider = GeminiProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 503
            response.is_success = False
            response.text = "Service unavailable"
            response.json.return_value = {
                "error": {
                    "code": 503,
                    "message": "Service unavailable",
                    "status": "UNAVAILABLE",
                }
            }
            mock_client.post.return_value = response

            with pytest.raises(LLMConnectionError) as exc_info:
                await provider.generate("Hello!")

            assert "Server error (503)" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_error_timeout(self) -> None:
        """Test timeout maps to LLMTimeoutError."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 0
        provider = GeminiProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.post.side_effect = httpx.TimeoutException("Timeout")

            with pytest.raises(LLMTimeoutError) as exc_info:
                await provider.generate("Hello!")

            assert "timed out" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_error_connection(self) -> None:
        """Test connection error maps to LLMConnectionError."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 0
        provider = GeminiProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.post.side_effect = httpx.ConnectError("Connection refused")

            with pytest.raises(LLMConnectionError) as exc_info:
                await provider.generate("Hello!")

            assert "Failed to connect" in str(exc_info.value)


class TestGeminiRetryLogic:
    """Tests for Gemini retry logic."""

    @pytest.mark.asyncio
    async def test_retry_on_timeout(self) -> None:
        """Test retry on timeout error."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 2
        settings.LLM_RETRY_DELAY = 0.001
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response("Success after retry")

        call_count = 0

        async def mock_post(*_args, **_kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise httpx.TimeoutException("Timeout")
            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            return response

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.post.side_effect = mock_post

            result = await provider.generate("Hello!")

            assert result.content == "Success after retry"
            assert call_count == 2

    @pytest.mark.asyncio
    async def test_retry_on_rate_limit(self) -> None:
        """Test retry on rate limit error."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 2
        settings.LLM_RETRY_DELAY = 0.001
        provider = GeminiProvider(settings=settings)

        mock_success_response = create_mock_response("Success after rate limit")

        call_count = 0

        async def mock_post(*_args, **_kwargs):
            nonlocal call_count
            call_count += 1
            response = MagicMock(spec=httpx.Response)
            if call_count < 2:
                response.status_code = 429
                response.is_success = False
                response.text = "Rate limit"
                response.headers = {"retry-after": "1"}
                response.json.return_value = {
                    "error": {"code": 429, "message": "Rate limit", "status": "RESOURCE_EXHAUSTED"}
                }
            else:
                response.status_code = 200
                response.is_success = True
                response.json.return_value = mock_success_response
            return response

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.post.side_effect = mock_post

            result = await provider.generate("Hello!")

            assert result.content == "Success after rate limit"
            assert call_count == 2

    @pytest.mark.asyncio
    async def test_retry_exhausted(self) -> None:
        """Test error after all retries exhausted."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 2
        settings.LLM_RETRY_DELAY = 0.001
        provider = GeminiProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.post.side_effect = httpx.TimeoutException("Timeout")

            with pytest.raises(LLMTimeoutError):
                await provider.generate("Hello!")

            # Should have tried 3 times (initial + 2 retries)
            assert mock_client.post.call_count == 3

    @pytest.mark.asyncio
    async def test_no_retry_on_auth_error(self) -> None:
        """Test no retry on authentication error."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 2
        provider = GeminiProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 401
            response.is_success = False
            response.text = "Invalid API key"
            response.json.return_value = {
                "error": {"code": 401, "message": "Invalid API key", "status": "UNAUTHENTICATED"}
            }
            mock_client.post.return_value = response

            with pytest.raises(LLMAuthenticationError):
                await provider.generate("Hello!")

            # Should only try once (no retries for auth errors)
            assert mock_client.post.call_count == 1


class TestGeminiTokenUsage:
    """Tests for Gemini token usage and cost calculation."""

    @pytest.mark.asyncio
    async def test_token_usage_calculation(self) -> None:
        """Test token usage is correctly calculated."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response("Response", 1000, 500)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            result = await provider.generate("Hello!")

            assert result.token_usage.prompt_tokens == 1000
            assert result.token_usage.completion_tokens == 500
            assert result.token_usage.total_tokens == 1500

            # Gemini pricing: $0.075/1M input, $0.30/1M output
            expected_cost = (1000 * 0.075 / 1_000_000) + (500 * 0.30 / 1_000_000)
            assert abs(result.token_usage.estimated_cost_usd - expected_cost) < 0.000001

    @pytest.mark.asyncio
    async def test_missing_usage_data(self) -> None:
        """Test handling of missing usage data in response."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        # Response without usageMetadata
        mock_response = {
            "candidates": [
                {
                    "content": {"parts": [{"text": "Hello"}], "role": "model"},
                    "finishReason": "STOP",
                }
            ],
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            result = await provider.generate("Hello!")

            # Should default to 0 tokens
            assert result.token_usage.prompt_tokens == 0
            assert result.token_usage.completion_tokens == 0


class TestGeminiRequestPayload:
    """Tests for request payload construction."""

    @pytest.mark.asyncio
    async def test_request_headers(self) -> None:
        """Test correct authorization headers are sent."""
        settings = create_mock_settings("my-secret-key")
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            await provider.generate("Hello!")

            # Verify headers
            call_args = mock_client.post.call_args
            headers = call_args.kwargs["headers"]

            assert headers["x-goog-api-key"] == "my-secret-key"
            assert headers["Content-Type"] == "application/json"

    @pytest.mark.asyncio
    async def test_request_endpoint(self) -> None:
        """Test correct API endpoint is used."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            await provider.generate("Hello!")

            # Verify endpoint
            call_args = mock_client.post.call_args
            url = call_args.args[0]

            assert url == "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    @pytest.mark.asyncio
    async def test_request_endpoint_custom_model(self) -> None:
        """Test endpoint uses custom model when specified."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            options = GenerationOptions(model="gemini-1.5-pro")
            await provider.generate("Hello!", options)

            # Verify endpoint uses custom model
            call_args = mock_client.post.call_args
            url = call_args.args[0]

            assert "gemini-1.5-pro" in url

    @pytest.mark.asyncio
    async def test_request_content_format(self) -> None:
        """Test correct content format in request."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = create_mock_response()

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            await provider.generate("Test prompt")

            # Verify content format
            call_args = mock_client.post.call_args
            payload = call_args.kwargs["json"]

            assert payload["contents"] == [
                {"role": "user", "parts": [{"text": "Test prompt"}]}
            ]
            assert "generationConfig" in payload


class TestGeminiResponseParsing:
    """Tests for response parsing edge cases."""

    @pytest.mark.asyncio
    async def test_empty_candidates(self) -> None:
        """Test error on empty candidates array."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = {"candidates": [], "usageMetadata": {}}

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            with pytest.raises(LLMResponseError) as exc_info:
                await provider.generate("Hello!")

            assert "No candidates" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_empty_parts(self) -> None:
        """Test error on empty parts array."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = {
            "candidates": [{"content": {"parts": [], "role": "model"}}],
            "usageMetadata": {},
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            with pytest.raises(LLMResponseError) as exc_info:
                await provider.generate("Hello!")

            assert "No parts" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_multiple_parts_combined(self) -> None:
        """Test that multiple parts are combined."""
        settings = create_mock_settings()
        provider = GeminiProvider(settings=settings)

        mock_response = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "Hello "},
                            {"text": "World!"},
                        ],
                        "role": "model",
                    },
                    "finishReason": "STOP",
                }
            ],
            "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 5, "totalTokenCount": 15},
        }

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 200
            response.is_success = True
            response.json.return_value = mock_response
            mock_client.post.return_value = response

            result = await provider.generate("Hello!")

            assert result.content == "Hello World!"


class TestGeminiManagerIntegration:
    """Tests for Gemini integration with LLMManager."""

    @pytest.mark.asyncio
    async def test_manager_fallback_to_gemini(self) -> None:
        """Test manager falls back to Gemini when DeepSeek fails."""
        from app.services.llm.base import LLMProviderType
        from app.services.llm.manager import LLMManager

        # Create settings with both providers
        settings = MagicMock(spec=LLMSettings)
        settings.AI_GENERATION_ENABLED = True
        settings.LLM_PRIMARY_PROVIDER = "deepseek"
        settings.LLM_FALLBACK_PROVIDER = "gemini"
        settings.get_primary_provider_type.return_value = LLMProviderType.DEEPSEEK
        settings.get_fallback_provider_type.return_value = LLMProviderType.GEMINI

        # Create mock providers
        deepseek_mock = MagicMock()
        deepseek_mock.is_available.return_value = True
        deepseek_mock.get_name.return_value = "deepseek"
        deepseek_mock.generate = AsyncMock(
            side_effect=LLMConnectionError("DeepSeek down", provider="deepseek")
        )

        gemini_mock = MagicMock()
        gemini_mock.is_available.return_value = True
        gemini_mock.get_name.return_value = "gemini"
        gemini_mock.generate = AsyncMock(
            return_value=MagicMock(
                content="Gemini response",
                token_usage=MagicMock(total_tokens=50, estimated_cost_usd=0.001),
            )
        )

        manager = LLMManager(settings=settings)
        manager.register_provider(LLMProviderType.DEEPSEEK, deepseek_mock)
        manager.register_provider(LLMProviderType.GEMINI, gemini_mock)

        result = await manager.generate("Test prompt")

        assert result.content == "Gemini response"
        deepseek_mock.generate.assert_called_once()
        gemini_mock.generate.assert_called_once()
