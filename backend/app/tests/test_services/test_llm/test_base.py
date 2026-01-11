"""Tests for LLM base classes and types."""

import pytest

from app.services.llm.base import (
    GenerationOptions,
    GenerationResult,
    LLMProviderType,
    TokenUsage,
)


class TestGenerationOptions:
    """Tests for GenerationOptions model."""

    def test_default_values(self) -> None:
        """Test GenerationOptions has sensible defaults."""
        options = GenerationOptions()

        assert options.temperature == 0.7
        assert options.max_tokens == 2000
        assert options.model is None
        assert options.response_format is None
        assert options.top_p == 1.0
        assert options.stop is None

    def test_custom_values(self) -> None:
        """Test GenerationOptions with custom values."""
        options = GenerationOptions(
            temperature=0.5,
            max_tokens=1000,
            model="custom-model",
            response_format="json",
        )

        assert options.temperature == 0.5
        assert options.max_tokens == 1000
        assert options.model == "custom-model"
        assert options.response_format == "json"

    def test_temperature_validation(self) -> None:
        """Test temperature must be between 0 and 2."""
        # Valid boundaries
        GenerationOptions(temperature=0.0)
        GenerationOptions(temperature=2.0)

        # Invalid values
        with pytest.raises(ValueError):
            GenerationOptions(temperature=-0.1)
        with pytest.raises(ValueError):
            GenerationOptions(temperature=2.1)

    def test_max_tokens_validation(self) -> None:
        """Test max_tokens must be positive."""
        GenerationOptions(max_tokens=1)
        GenerationOptions(max_tokens=100000)

        with pytest.raises(ValueError):
            GenerationOptions(max_tokens=0)
        with pytest.raises(ValueError):
            GenerationOptions(max_tokens=-1)


class TestTokenUsage:
    """Tests for TokenUsage model."""

    def test_basic_creation(self) -> None:
        """Test basic TokenUsage creation."""
        usage = TokenUsage(
            prompt_tokens=100,
            completion_tokens=50,
            total_tokens=150,
            estimated_cost_usd=0.001,
        )

        assert usage.prompt_tokens == 100
        assert usage.completion_tokens == 50
        assert usage.total_tokens == 150
        assert usage.estimated_cost_usd == 0.001

    def test_calculate_cost_deepseek(self) -> None:
        """Test cost calculation for DeepSeek provider."""
        usage = TokenUsage.calculate_cost(
            prompt_tokens=1_000_000,
            completion_tokens=1_000_000,
            provider=LLMProviderType.DEEPSEEK,
        )

        # DeepSeek: $0.14/1M input, $0.28/1M output
        expected_cost = 0.14 + 0.28
        assert usage.prompt_tokens == 1_000_000
        assert usage.completion_tokens == 1_000_000
        assert usage.total_tokens == 2_000_000
        assert abs(usage.estimated_cost_usd - expected_cost) < 0.0001

    def test_calculate_cost_gemini(self) -> None:
        """Test cost calculation for Gemini provider."""
        usage = TokenUsage.calculate_cost(
            prompt_tokens=1_000_000,
            completion_tokens=1_000_000,
            provider=LLMProviderType.GEMINI,
        )

        # Gemini: $0.075/1M input, $0.30/1M output
        expected_cost = 0.075 + 0.30
        assert abs(usage.estimated_cost_usd - expected_cost) < 0.0001

    def test_calculate_cost_openai(self) -> None:
        """Test cost calculation for OpenAI provider."""
        usage = TokenUsage.calculate_cost(
            prompt_tokens=1_000_000,
            completion_tokens=1_000_000,
            provider=LLMProviderType.OPENAI,
        )

        # OpenAI GPT-4: $3/1M input, $15/1M output
        expected_cost = 3.00 + 15.00
        assert abs(usage.estimated_cost_usd - expected_cost) < 0.0001

    def test_calculate_cost_small_usage(self) -> None:
        """Test cost calculation for small token usage."""
        usage = TokenUsage.calculate_cost(
            prompt_tokens=100,
            completion_tokens=50,
            provider=LLMProviderType.DEEPSEEK,
        )

        # Very small cost for 150 tokens
        assert usage.total_tokens == 150
        assert usage.estimated_cost_usd < 0.0001


class TestGenerationResult:
    """Tests for GenerationResult model."""

    def test_basic_creation(self) -> None:
        """Test basic GenerationResult creation."""
        token_usage = TokenUsage(
            prompt_tokens=100,
            completion_tokens=50,
            total_tokens=150,
            estimated_cost_usd=0.001,
        )
        result = GenerationResult(
            content="Hello, world!",
            token_usage=token_usage,
            model="deepseek-chat",
            provider="deepseek",
            latency_ms=500,
        )

        assert result.content == "Hello, world!"
        assert result.model == "deepseek-chat"
        assert result.provider == "deepseek"
        assert result.latency_ms == 500
        assert result.raw_response is None

    def test_with_raw_response(self) -> None:
        """Test GenerationResult with raw_response."""
        token_usage = TokenUsage(
            prompt_tokens=100,
            completion_tokens=50,
            total_tokens=150,
            estimated_cost_usd=0.001,
        )
        raw = {"choices": [{"message": {"content": "test"}}]}
        result = GenerationResult(
            content="test",
            token_usage=token_usage,
            model="deepseek-chat",
            provider="deepseek",
            latency_ms=100,
            raw_response=raw,
        )

        assert result.raw_response == raw


class TestLLMProviderType:
    """Tests for LLMProviderType enum."""

    def test_enum_values(self) -> None:
        """Test enum has expected values."""
        assert LLMProviderType.DEEPSEEK.value == "deepseek"
        assert LLMProviderType.GEMINI.value == "gemini"
        assert LLMProviderType.OPENAI.value == "openai"

    def test_enum_from_string(self) -> None:
        """Test creating enum from string."""
        assert LLMProviderType("deepseek") == LLMProviderType.DEEPSEEK
        assert LLMProviderType("gemini") == LLMProviderType.GEMINI
        assert LLMProviderType("openai") == LLMProviderType.OPENAI
