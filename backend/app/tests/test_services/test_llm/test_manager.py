"""Tests for LLM Manager with fallback logic."""

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.llm.base import (
    GenerationOptions,
    GenerationResult,
    LLMProvider,
    LLMProviderType,
    TokenUsage,
)
from app.services.llm.config import LLMSettings
from app.services.llm.exceptions import (
    AllProvidersFailedError,
    LLMProviderError,
    LLMRateLimitError,
    LLMTimeoutError,
)
from app.services.llm.manager import LLMManager


class MockProvider(LLMProvider):
    """Mock LLM provider for testing."""

    def __init__(
        self,
        name: str = "mock",
        model: str = "mock-model",
        available: bool = True,
    ) -> None:
        self._name = name
        self._model = model
        self._available = available
        self._generate_mock = AsyncMock()
        self._generate_structured_mock = AsyncMock()

    async def generate(
        self,
        prompt: str,
        options: GenerationOptions | None = None,
    ) -> GenerationResult:
        return await self._generate_mock(prompt, options)

    async def generate_structured(
        self,
        prompt: str,
        schema: dict[str, Any],
        options: GenerationOptions | None = None,
    ) -> dict[str, Any]:
        return await self._generate_structured_mock(prompt, schema, options)

    def get_name(self) -> str:
        return self._name

    def get_default_model(self) -> str:
        return self._model

    def is_available(self) -> bool:
        return self._available


def create_mock_result(content: str = "test response") -> GenerationResult:
    """Create a mock generation result."""
    return GenerationResult(
        content=content,
        token_usage=TokenUsage(
            prompt_tokens=100,
            completion_tokens=50,
            total_tokens=150,
            estimated_cost_usd=0.001,
        ),
        model="mock-model",
        provider="mock",
        latency_ms=100,
    )


def create_mock_settings(
    primary: str = "deepseek",
    fallback: str | None = "gemini",
    enabled: bool = True,
) -> LLMSettings:
    """Create mock LLM settings."""
    settings = MagicMock(spec=LLMSettings)
    settings.AI_GENERATION_ENABLED = enabled
    settings.LLM_PRIMARY_PROVIDER = primary
    settings.LLM_FALLBACK_PROVIDER = fallback
    settings.get_primary_provider_type.return_value = LLMProviderType(primary)
    settings.get_fallback_provider_type.return_value = (
        LLMProviderType(fallback) if fallback else None
    )
    return settings


class TestLLMManager:
    """Tests for LLMManager class."""

    def test_register_provider(self) -> None:
        """Test provider registration."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)
        provider = MockProvider("test")

        manager.register_provider(LLMProviderType.DEEPSEEK, provider)

        assert manager.get_provider(LLMProviderType.DEEPSEEK) == provider

    def test_get_available_providers_with_primary_only(self) -> None:
        """Test getting available providers with only primary."""
        settings = create_mock_settings(fallback=None)
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary", available=True)
        manager.register_provider(LLMProviderType.DEEPSEEK, primary)

        providers = manager.get_available_providers()
        assert len(providers) == 1
        assert providers[0] == primary

    def test_get_available_providers_with_fallback(self) -> None:
        """Test getting available providers with primary and fallback."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary", available=True)
        fallback = MockProvider("fallback", available=True)
        manager.register_provider(LLMProviderType.DEEPSEEK, primary)
        manager.register_provider(LLMProviderType.GEMINI, fallback)

        providers = manager.get_available_providers()
        assert len(providers) == 2
        assert providers[0] == primary
        assert providers[1] == fallback

    def test_get_available_providers_excludes_unavailable(self) -> None:
        """Test unavailable providers are excluded."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary", available=False)
        fallback = MockProvider("fallback", available=True)
        manager.register_provider(LLMProviderType.DEEPSEEK, primary)
        manager.register_provider(LLMProviderType.GEMINI, fallback)

        providers = manager.get_available_providers()
        assert len(providers) == 1
        assert providers[0] == fallback

    @pytest.mark.asyncio
    async def test_generate_success_with_primary(self) -> None:
        """Test generation with primary provider succeeding."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary")
        expected_result = create_mock_result("primary response")
        primary._generate_mock.return_value = expected_result
        manager.register_provider(LLMProviderType.DEEPSEEK, primary)

        result = await manager.generate("test prompt")

        assert result == expected_result
        primary._generate_mock.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_fallback_on_primary_failure(self) -> None:
        """Test automatic fallback when primary fails."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary")
        primary._generate_mock.side_effect = LLMProviderError("Primary failed", "primary")

        fallback = MockProvider("fallback")
        expected_result = create_mock_result("fallback response")
        fallback._generate_mock.return_value = expected_result

        manager.register_provider(LLMProviderType.DEEPSEEK, primary)
        manager.register_provider(LLMProviderType.GEMINI, fallback)

        result = await manager.generate("test prompt")

        assert result == expected_result
        assert result.content == "fallback response"
        primary._generate_mock.assert_called_once()
        fallback._generate_mock.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_fallback_on_rate_limit(self) -> None:
        """Test fallback when primary hits rate limit."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary")
        primary._generate_mock.side_effect = LLMRateLimitError(
            "Rate limit exceeded",
            "primary",
            retry_after_seconds=60,
        )

        fallback = MockProvider("fallback")
        expected_result = create_mock_result("fallback response")
        fallback._generate_mock.return_value = expected_result

        manager.register_provider(LLMProviderType.DEEPSEEK, primary)
        manager.register_provider(LLMProviderType.GEMINI, fallback)

        result = await manager.generate("test prompt")

        assert result == expected_result

    @pytest.mark.asyncio
    async def test_generate_fallback_on_timeout(self) -> None:
        """Test fallback when primary times out."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary")
        primary._generate_mock.side_effect = LLMTimeoutError("Timeout", "primary")

        fallback = MockProvider("fallback")
        expected_result = create_mock_result("fallback response")
        fallback._generate_mock.return_value = expected_result

        manager.register_provider(LLMProviderType.DEEPSEEK, primary)
        manager.register_provider(LLMProviderType.GEMINI, fallback)

        result = await manager.generate("test prompt")

        assert result == expected_result

    @pytest.mark.asyncio
    async def test_generate_all_providers_fail(self) -> None:
        """Test proper error when all providers fail."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary")
        primary._generate_mock.side_effect = LLMProviderError("Primary failed", "primary")

        fallback = MockProvider("fallback")
        fallback._generate_mock.side_effect = LLMProviderError("Fallback failed", "fallback")

        manager.register_provider(LLMProviderType.DEEPSEEK, primary)
        manager.register_provider(LLMProviderType.GEMINI, fallback)

        with pytest.raises(AllProvidersFailedError) as exc_info:
            await manager.generate("test prompt")

        assert len(exc_info.value.provider_errors) == 2
        assert exc_info.value.provider_errors[0][0] == "primary"
        assert exc_info.value.provider_errors[1][0] == "fallback"

    @pytest.mark.asyncio
    async def test_generate_no_providers_available(self) -> None:
        """Test error when no providers are available."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)

        with pytest.raises(LLMProviderError) as exc_info:
            await manager.generate("test prompt")

        assert "No LLM providers available" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_generate_disabled(self) -> None:
        """Test error when AI generation is disabled."""
        settings = create_mock_settings(enabled=False)
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary")
        manager.register_provider(LLMProviderType.DEEPSEEK, primary)

        with pytest.raises(LLMProviderError) as exc_info:
            await manager.generate("test prompt")

        assert "AI generation is disabled" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_generate_structured_success(self) -> None:
        """Test structured generation success."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary")
        expected_result = {"key": "value", "nested": {"data": 123}}
        primary._generate_structured_mock.return_value = expected_result
        manager.register_provider(LLMProviderType.DEEPSEEK, primary)

        schema = {"type": "object", "properties": {"key": {"type": "string"}}}
        result = await manager.generate_structured("test prompt", schema)

        assert result == expected_result
        primary._generate_structured_mock.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_structured_with_fallback(self) -> None:
        """Test structured generation with fallback."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary")
        primary._generate_structured_mock.side_effect = LLMProviderError("Failed", "primary")

        fallback = MockProvider("fallback")
        expected_result = {"key": "fallback_value"}
        fallback._generate_structured_mock.return_value = expected_result

        manager.register_provider(LLMProviderType.DEEPSEEK, primary)
        manager.register_provider(LLMProviderType.GEMINI, fallback)

        schema = {"type": "object"}
        result = await manager.generate_structured("test prompt", schema)

        assert result == expected_result

    def test_is_available_true(self) -> None:
        """Test is_available returns true when providers exist."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary", available=True)
        manager.register_provider(LLMProviderType.DEEPSEEK, primary)

        assert manager.is_available() is True

    def test_is_available_false_no_providers(self) -> None:
        """Test is_available returns false when no providers."""
        settings = create_mock_settings()
        manager = LLMManager(settings=settings)

        assert manager.is_available() is False

    def test_is_available_false_when_disabled(self) -> None:
        """Test is_available returns false when disabled."""
        settings = create_mock_settings(enabled=False)
        manager = LLMManager(settings=settings)

        primary = MockProvider("primary", available=True)
        manager.register_provider(LLMProviderType.DEEPSEEK, primary)

        assert manager.is_available() is False
