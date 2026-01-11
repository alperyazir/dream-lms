"""Tests for DeepSeek LLM Provider."""

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
from app.services.llm.providers.deepseek import DeepSeekProvider


def create_mock_settings(api_key: str | None = "test-api-key") -> LLMSettings:
    """Create mock LLM settings for testing."""
    settings = MagicMock(spec=LLMSettings)
    settings.DEEPSEEK_API_KEY = api_key
    settings.LLM_REQUEST_TIMEOUT = 60
    settings.LLM_MAX_RETRIES = 3
    settings.LLM_RETRY_DELAY = 0.01  # Fast retries for tests
    return settings


def create_mock_response(
    content: str = "Hello, world!",
    prompt_tokens: int = 10,
    completion_tokens: int = 20,
) -> dict:
    """Create a mock DeepSeek API response."""
    return {
        "id": "chatcmpl-test",
        "object": "chat.completion",
        "created": 1234567890,
        "model": "deepseek-chat",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        },
    }


class TestDeepSeekProviderInit:
    """Tests for DeepSeekProvider initialization."""

    def test_init_with_settings(self) -> None:
        """Test provider initialization with settings."""
        settings = create_mock_settings("my-api-key")
        provider = DeepSeekProvider(settings=settings)

        assert provider._api_key == "my-api-key"
        assert provider._settings == settings

    def test_get_name(self) -> None:
        """Test get_name returns 'deepseek'."""
        settings = create_mock_settings()
        provider = DeepSeekProvider(settings=settings)

        assert provider.get_name() == "deepseek"

    def test_get_default_model(self) -> None:
        """Test get_default_model returns 'deepseek-chat'."""
        settings = create_mock_settings()
        provider = DeepSeekProvider(settings=settings)

        assert provider.get_default_model() == "deepseek-chat"

    def test_is_available_true(self) -> None:
        """Test is_available returns True when API key present."""
        settings = create_mock_settings("valid-key")
        provider = DeepSeekProvider(settings=settings)

        assert provider.is_available() is True

    def test_is_available_false(self) -> None:
        """Test is_available returns False when API key missing."""
        settings = create_mock_settings(None)
        provider = DeepSeekProvider(settings=settings)

        assert provider.is_available() is False


class TestDeepSeekGenerate:
    """Tests for DeepSeekProvider.generate()."""

    @pytest.mark.asyncio
    async def test_generate_success(self) -> None:
        """Test successful text generation."""
        settings = create_mock_settings()
        provider = DeepSeekProvider(settings=settings)

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
            assert result.provider == "deepseek"
            assert result.model == "deepseek-chat"
            assert result.token_usage.prompt_tokens == 100
            assert result.token_usage.completion_tokens == 50
            assert result.token_usage.total_tokens == 150
            assert result.latency_ms >= 0

    @pytest.mark.asyncio
    async def test_generate_with_options(self) -> None:
        """Test generation with custom options."""
        settings = create_mock_settings()
        provider = DeepSeekProvider(settings=settings)

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
                model="deepseek-chat",
            )

            await provider.generate("Hello!", options)

            # Verify the request payload
            call_args = mock_client.post.call_args
            payload = call_args.kwargs["json"]

            assert payload["temperature"] == 0.5
            assert payload["max_tokens"] == 1000
            assert payload["model"] == "deepseek-chat"

    @pytest.mark.asyncio
    async def test_generate_json_format(self) -> None:
        """Test generation with JSON response format."""
        settings = create_mock_settings()
        provider = DeepSeekProvider(settings=settings)

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

            assert payload["response_format"] == {"type": "json_object"}


class TestDeepSeekGenerateStructured:
    """Tests for DeepSeekProvider.generate_structured()."""

    @pytest.mark.asyncio
    async def test_generate_structured_success(self) -> None:
        """Test successful structured generation."""
        settings = create_mock_settings()
        provider = DeepSeekProvider(settings=settings)

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
        provider = DeepSeekProvider(settings=settings)

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
        provider = DeepSeekProvider(settings=settings)

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


class TestDeepSeekErrorHandling:
    """Tests for DeepSeek error handling."""

    @pytest.mark.asyncio
    async def test_error_401_authentication(self) -> None:
        """Test 401 error maps to LLMAuthenticationError."""
        settings = create_mock_settings()
        provider = DeepSeekProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 401
            response.is_success = False
            response.text = "Invalid API key"
            response.json.return_value = {"error": {"message": "Invalid API key"}}
            mock_client.post.return_value = response

            with pytest.raises(LLMAuthenticationError) as exc_info:
                await provider.generate("Hello!")

            assert "Authentication failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_error_429_rate_limit(self) -> None:
        """Test 429 error maps to LLMRateLimitError."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 0  # Disable retries for this test
        provider = DeepSeekProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 429
            response.is_success = False
            response.text = "Rate limit exceeded"
            response.headers = {"retry-after": "60"}
            response.json.return_value = {"error": {"message": "Rate limit exceeded"}}
            mock_client.post.return_value = response

            with pytest.raises(LLMRateLimitError) as exc_info:
                await provider.generate("Hello!")

            assert exc_info.value.retry_after_seconds == 60

    @pytest.mark.asyncio
    async def test_error_500_server_error(self) -> None:
        """Test 500 error maps to LLMConnectionError."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 0
        provider = DeepSeekProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 500
            response.is_success = False
            response.text = "Internal server error"
            response.json.return_value = {"error": {"message": "Internal server error"}}
            mock_client.post.return_value = response

            with pytest.raises(LLMConnectionError) as exc_info:
                await provider.generate("Hello!")

            assert "Server error (500)" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_error_timeout(self) -> None:
        """Test timeout maps to LLMTimeoutError."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 0
        provider = DeepSeekProvider(settings=settings)

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
        provider = DeepSeekProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.post.side_effect = httpx.ConnectError("Connection refused")

            with pytest.raises(LLMConnectionError) as exc_info:
                await provider.generate("Hello!")

            assert "Failed to connect" in str(exc_info.value)


class TestDeepSeekRetryLogic:
    """Tests for DeepSeek retry logic."""

    @pytest.mark.asyncio
    async def test_retry_on_timeout(self) -> None:
        """Test retry on timeout error."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 2
        settings.LLM_RETRY_DELAY = 0.001
        provider = DeepSeekProvider(settings=settings)

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
    async def test_retry_exhausted(self) -> None:
        """Test error after all retries exhausted."""
        settings = create_mock_settings()
        settings.LLM_MAX_RETRIES = 2
        settings.LLM_RETRY_DELAY = 0.001
        provider = DeepSeekProvider(settings=settings)

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
        provider = DeepSeekProvider(settings=settings)

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client

            response = MagicMock(spec=httpx.Response)
            response.status_code = 401
            response.is_success = False
            response.text = "Invalid API key"
            response.json.return_value = {"error": {"message": "Invalid API key"}}
            mock_client.post.return_value = response

            with pytest.raises(LLMAuthenticationError):
                await provider.generate("Hello!")

            # Should only try once (no retries for auth errors)
            assert mock_client.post.call_count == 1


class TestDeepSeekTokenUsage:
    """Tests for DeepSeek token usage and cost calculation."""

    @pytest.mark.asyncio
    async def test_token_usage_calculation(self) -> None:
        """Test token usage is correctly calculated."""
        settings = create_mock_settings()
        provider = DeepSeekProvider(settings=settings)

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

            # DeepSeek pricing: $0.14/1M input, $0.28/1M output
            expected_cost = (1000 * 0.14 / 1_000_000) + (500 * 0.28 / 1_000_000)
            assert abs(result.token_usage.estimated_cost_usd - expected_cost) < 0.000001

    @pytest.mark.asyncio
    async def test_missing_usage_data(self) -> None:
        """Test handling of missing usage data in response."""
        settings = create_mock_settings()
        provider = DeepSeekProvider(settings=settings)

        # Response without usage data
        mock_response = {
            "id": "chatcmpl-test",
            "choices": [{"message": {"content": "Hello"}, "finish_reason": "stop"}],
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


class TestDeepSeekRequestPayload:
    """Tests for request payload construction."""

    @pytest.mark.asyncio
    async def test_request_headers(self) -> None:
        """Test correct authorization headers are sent."""
        settings = create_mock_settings("my-secret-key")
        provider = DeepSeekProvider(settings=settings)

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

            assert headers["Authorization"] == "Bearer my-secret-key"
            assert headers["Content-Type"] == "application/json"

    @pytest.mark.asyncio
    async def test_request_endpoint(self) -> None:
        """Test correct API endpoint is used."""
        settings = create_mock_settings()
        provider = DeepSeekProvider(settings=settings)

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

            assert url == "https://api.deepseek.com/v1/chat/completions"

    @pytest.mark.asyncio
    async def test_request_message_format(self) -> None:
        """Test correct message format in request."""
        settings = create_mock_settings()
        provider = DeepSeekProvider(settings=settings)

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

            # Verify message format
            call_args = mock_client.post.call_args
            payload = call_args.kwargs["json"]

            assert payload["messages"] == [{"role": "user", "content": "Test prompt"}]
            assert payload["model"] == "deepseek-chat"
