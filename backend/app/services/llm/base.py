"""
LLM Provider Base Classes and Types.

Abstract base class for LLM providers with Pydantic models
for request options and response data.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class LLMProviderType(str, Enum):
    """Supported LLM provider types."""

    DEEPSEEK = "deepseek"
    GEMINI = "gemini"
    OPENAI = "openai"


class GenerationOptions(BaseModel):
    """Options for text generation requests."""

    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="Controls randomness. Higher = more creative.",
    )
    max_tokens: int = Field(
        default=2000,
        ge=1,
        le=100000,
        description="Maximum tokens to generate.",
    )
    model: str | None = Field(
        default=None,
        description="Provider-specific model override. If None, uses provider default.",
    )
    response_format: str | None = Field(
        default=None,
        description="Response format. Use 'json' for structured output.",
    )
    top_p: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Nucleus sampling threshold.",
    )
    stop: list[str] | None = Field(
        default=None,
        description="Stop sequences to end generation.",
    )


class TokenUsage(BaseModel):
    """Token usage and cost tracking for a generation request."""

    prompt_tokens: int = Field(
        ge=0,
        description="Number of tokens in the prompt.",
    )
    completion_tokens: int = Field(
        ge=0,
        description="Number of tokens in the completion.",
    )
    total_tokens: int = Field(
        ge=0,
        description="Total tokens used (prompt + completion).",
    )
    estimated_cost_usd: float = Field(
        ge=0.0,
        description="Estimated cost in USD based on provider pricing.",
    )

    @classmethod
    def calculate_cost(
        cls,
        prompt_tokens: int,
        completion_tokens: int,
        provider: LLMProviderType,
    ) -> "TokenUsage":
        """
        Calculate token usage with estimated cost based on provider pricing.

        Pricing (per 1M tokens):
        - DeepSeek: $0.14 input, $0.28 output
        - Gemini: $0.075 input, $0.30 output (after free tier)
        - OpenAI GPT-4: $3.00 input, $15.00 output
        """
        pricing = {
            LLMProviderType.DEEPSEEK: (0.14 / 1_000_000, 0.28 / 1_000_000),
            LLMProviderType.GEMINI: (0.075 / 1_000_000, 0.30 / 1_000_000),
            LLMProviderType.OPENAI: (3.00 / 1_000_000, 15.00 / 1_000_000),
        }

        input_rate, output_rate = pricing.get(
            provider, (0.0, 0.0)
        )
        estimated_cost = (prompt_tokens * input_rate) + (
            completion_tokens * output_rate
        )

        return cls(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            estimated_cost_usd=round(estimated_cost, 8),
        )


class GenerationResult(BaseModel):
    """Result of a text generation request."""

    content: str = Field(
        description="Generated text content.",
    )
    token_usage: TokenUsage = Field(
        description="Token usage and cost information.",
    )
    model: str = Field(
        description="Model used for generation.",
    )
    provider: str = Field(
        description="Provider that handled the request.",
    )
    latency_ms: int = Field(
        ge=0,
        description="Request latency in milliseconds.",
    )
    raw_response: dict[str, Any] | None = Field(
        default=None,
        description="Raw response from provider for debugging.",
    )


class LLMProvider(ABC):
    """
    Abstract base class for LLM providers.

    All LLM provider implementations must inherit from this class
    and implement the abstract methods.
    """

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        options: GenerationOptions | None = None,
    ) -> GenerationResult:
        """
        Generate text completion.

        Args:
            prompt: The input prompt for generation.
            options: Optional generation options.

        Returns:
            GenerationResult with generated content and metadata.

        Raises:
            LLMProviderError: On any provider error.
        """
        pass

    @abstractmethod
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
            schema: JSON schema for the expected output format.
            options: Optional generation options.

        Returns:
            Parsed JSON matching the schema.

        Raises:
            LLMProviderError: On any provider error.
            LLMResponseError: If response doesn't match schema.
        """
        pass

    @abstractmethod
    def get_name(self) -> str:
        """
        Return provider name for logging and identification.

        Returns:
            Provider name (e.g., "deepseek", "gemini").
        """
        pass

    @abstractmethod
    def get_default_model(self) -> str:
        """
        Return the default model for this provider.

        Returns:
            Model identifier (e.g., "deepseek-chat", "gemini-1.5-flash").
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if provider is configured and available.

        Returns:
            True if provider has valid API key and is usable.
        """
        pass
