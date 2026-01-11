"""
LLM Manager with Automatic Fallback.

Orchestrates LLM provider selection and handles automatic fallback
when the primary provider fails.
"""

import logging
from typing import Any

from app.services.llm.base import (
    GenerationOptions,
    GenerationResult,
    LLMProvider,
    LLMProviderType,
)
from app.services.llm.config import LLMSettings, get_llm_settings
from app.services.llm.exceptions import (
    AllProvidersFailedError,
    LLMProviderError,
    LLMRateLimitError,
    LLMTimeoutError,
)

logger = logging.getLogger(__name__)


class LLMManager:
    """
    Manages LLM providers with automatic fallback.

    This class orchestrates provider selection and handles fallback
    to alternative providers when the primary fails.
    """

    def __init__(
        self,
        settings: LLMSettings | None = None,
        providers: dict[LLMProviderType, LLMProvider] | None = None,
    ) -> None:
        """
        Initialize the LLM Manager.

        Args:
            settings: LLM settings. If None, loads from environment.
            providers: Pre-configured providers. If None, initializes from settings.
        """
        self._settings = settings or get_llm_settings()
        self._providers: dict[LLMProviderType, LLMProvider] = providers or {}
        self._initialized = False

    @property
    def settings(self) -> LLMSettings:
        """Get the LLM settings."""
        return self._settings

    @property
    def primary_provider(self) -> LLMProvider | None:
        """Get the primary provider instance."""
        provider_type = self._settings.get_primary_provider_type()
        return self._providers.get(provider_type)

    @property
    def fallback_provider(self) -> LLMProvider | None:
        """Get the fallback provider instance."""
        provider_type = self._settings.get_fallback_provider_type()
        if provider_type:
            return self._providers.get(provider_type)
        return None

    def register_provider(
        self,
        provider_type: LLMProviderType,
        provider: LLMProvider,
    ) -> None:
        """
        Register a provider instance.

        Args:
            provider_type: The type of provider being registered.
            provider: The provider instance.
        """
        self._providers[provider_type] = provider
        logger.info(f"Registered LLM provider: {provider_type.value}")

    def get_provider(self, provider_type: LLMProviderType) -> LLMProvider | None:
        """
        Get a specific provider by type.

        Args:
            provider_type: The type of provider to retrieve.

        Returns:
            The provider instance or None if not registered.
        """
        return self._providers.get(provider_type)

    def get_available_providers(self) -> list[LLMProvider]:
        """
        Get list of available providers in priority order.

        Returns:
            List of available provider instances.
        """
        providers = []

        # Add primary provider first
        if self.primary_provider and self.primary_provider.is_available():
            providers.append(self.primary_provider)

        # Add fallback provider if different from primary
        if (
            self.fallback_provider
            and self.fallback_provider.is_available()
            and self.fallback_provider != self.primary_provider
        ):
            providers.append(self.fallback_provider)

        return providers

    async def generate(
        self,
        prompt: str,
        options: GenerationOptions | None = None,
    ) -> GenerationResult:
        """
        Generate text using available providers with automatic fallback.

        Args:
            prompt: The input prompt for generation.
            options: Optional generation options.

        Returns:
            GenerationResult with generated content and metadata.

        Raises:
            AllProvidersFailedError: If all providers fail.
            LLMProviderError: If no providers are available.
        """
        if not self._settings.AI_GENERATION_ENABLED:
            raise LLMProviderError(
                "AI generation is disabled. Set AI_GENERATION_ENABLED=true to enable."
            )

        providers = self.get_available_providers()
        if not providers:
            raise LLMProviderError(
                "No LLM providers available. Check API key configuration."
            )

        options = options or GenerationOptions()
        errors: list[tuple[str, LLMProviderError]] = []

        for provider in providers:
            try:
                logger.info(f"Attempting generation with provider: {provider.get_name()}")
                result = await provider.generate(prompt, options)
                logger.info(
                    f"Generation successful with {provider.get_name()}: "
                    f"{result.token_usage.total_tokens} tokens, "
                    f"${result.token_usage.estimated_cost_usd:.6f}"
                )
                return result

            except LLMRateLimitError as e:
                logger.warning(
                    f"Rate limit hit for {provider.get_name()}: {e.message}. "
                    f"Retry after: {e.retry_after_seconds}s"
                )
                errors.append((provider.get_name(), e))

            except LLMTimeoutError as e:
                logger.warning(f"Timeout for {provider.get_name()}: {e.message}")
                errors.append((provider.get_name(), e))

            except LLMProviderError as e:
                logger.warning(f"Provider {provider.get_name()} failed: {e.message}")
                errors.append((provider.get_name(), e))

        # All providers failed
        raise AllProvidersFailedError(
            "All configured LLM providers failed",
            provider_errors=errors,
        )

    async def generate_structured(
        self,
        prompt: str,
        schema: dict[str, Any],
        options: GenerationOptions | None = None,
    ) -> dict[str, Any]:
        """
        Generate structured JSON output with automatic fallback.

        Args:
            prompt: The input prompt for generation.
            schema: JSON schema for expected output format.
            options: Optional generation options.

        Returns:
            Parsed JSON matching the schema.

        Raises:
            AllProvidersFailedError: If all providers fail.
            LLMProviderError: If no providers are available.
        """
        if not self._settings.AI_GENERATION_ENABLED:
            raise LLMProviderError(
                "AI generation is disabled. Set AI_GENERATION_ENABLED=true to enable."
            )

        providers = self.get_available_providers()
        if not providers:
            raise LLMProviderError(
                "No LLM providers available. Check API key configuration."
            )

        options = options or GenerationOptions()
        errors: list[tuple[str, LLMProviderError]] = []

        for provider in providers:
            try:
                logger.info(
                    f"Attempting structured generation with provider: {provider.get_name()}"
                )
                result = await provider.generate_structured(prompt, schema, options)
                logger.info(f"Structured generation successful with {provider.get_name()}")
                return result

            except LLMRateLimitError as e:
                logger.warning(
                    f"Rate limit hit for {provider.get_name()}: {e.message}. "
                    f"Retry after: {e.retry_after_seconds}s"
                )
                errors.append((provider.get_name(), e))

            except LLMTimeoutError as e:
                logger.warning(f"Timeout for {provider.get_name()}: {e.message}")
                errors.append((provider.get_name(), e))

            except LLMProviderError as e:
                logger.warning(f"Provider {provider.get_name()} failed: {e.message}")
                errors.append((provider.get_name(), e))

        # All providers failed
        raise AllProvidersFailedError(
            "All configured LLM providers failed for structured generation",
            provider_errors=errors,
        )

    def is_available(self) -> bool:
        """
        Check if at least one provider is available.

        Returns:
            True if generation is enabled and at least one provider is available.
        """
        if not self._settings.AI_GENERATION_ENABLED:
            return False
        return len(self.get_available_providers()) > 0


# Global manager instance (lazy initialization)
_manager: LLMManager | None = None


def get_llm_manager() -> LLMManager:
    """
    Get the global LLM manager instance.

    Returns:
        Configured LLMManager instance with providers registered.
    """
    global _manager
    if _manager is None:
        _manager = create_default_manager()
    return _manager


def reset_llm_manager() -> None:
    """Reset the global LLM manager instance (for testing)."""
    global _manager
    _manager = None


def create_default_manager(settings: LLMSettings | None = None) -> LLMManager:
    """
    Create a manager with default providers registered.

    This factory function creates an LLMManager and registers
    the available providers based on configuration.

    Args:
        settings: Optional LLM settings. If None, loads from environment.

    Returns:
        Configured LLMManager with providers registered.
    """
    from app.services.llm.providers.deepseek import DeepSeekProvider
    from app.services.llm.providers.gemini import GeminiProvider

    settings = settings or get_llm_settings()
    manager = LLMManager(settings=settings)

    # Register DeepSeek provider if API key is available
    if settings.DEEPSEEK_API_KEY:
        deepseek = DeepSeekProvider(settings=settings)
        manager.register_provider(LLMProviderType.DEEPSEEK, deepseek)

    # Register Gemini provider if API key is available (fallback)
    if settings.GEMINI_API_KEY:
        gemini = GeminiProvider(settings=settings)
        manager.register_provider(LLMProviderType.GEMINI, gemini)

    return manager
