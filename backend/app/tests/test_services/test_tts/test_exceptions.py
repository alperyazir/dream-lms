"""Tests for TTS exception hierarchy."""

import pytest

from app.services.tts.exceptions import (
    AllTTSProvidersFailedError,
    TTSAudioGenerationError,
    TTSAuthenticationError,
    TTSConnectionError,
    TTSProviderError,
    TTSRateLimitError,
    TTSTimeoutError,
    TTSUnsupportedLanguageError,
)


class TestTTSProviderError:
    """Tests for TTSProviderError base exception."""

    def test_basic_creation(self) -> None:
        """Test basic exception creation."""
        error = TTSProviderError("Test error message")

        assert error.message == "Test error message"
        assert error.provider is None
        assert error.details == {}
        assert str(error) == "Test error message"

    def test_with_provider(self) -> None:
        """Test exception with provider specified."""
        error = TTSProviderError("API error", provider="azure")

        assert error.provider == "azure"
        assert str(error) == "[azure] API error"

    def test_with_details(self) -> None:
        """Test exception with details dict."""
        error = TTSProviderError(
            "Error with details",
            provider="edge",
            details={"status_code": 500, "response": "Internal error"},
        )

        assert error.details["status_code"] == 500
        assert error.details["response"] == "Internal error"

    def test_inheritance(self) -> None:
        """Test TTSProviderError is an Exception."""
        error = TTSProviderError("test")
        assert isinstance(error, Exception)


class TestTTSConnectionError:
    """Tests for TTSConnectionError."""

    def test_creation(self) -> None:
        """Test TTSConnectionError creation."""
        error = TTSConnectionError("Connection failed", provider="azure")

        assert error.message == "Connection failed"
        assert error.provider == "azure"
        assert isinstance(error, TTSProviderError)

    def test_raises_correctly(self) -> None:
        """Test exception can be raised and caught."""
        with pytest.raises(TTSConnectionError) as exc_info:
            raise TTSConnectionError("Network timeout", provider="edge")

        assert "Network timeout" in str(exc_info.value)


class TestTTSAuthenticationError:
    """Tests for TTSAuthenticationError."""

    def test_creation(self) -> None:
        """Test TTSAuthenticationError creation."""
        error = TTSAuthenticationError("Invalid API key", provider="azure")

        assert error.message == "Invalid API key"
        assert isinstance(error, TTSProviderError)


class TestTTSRateLimitError:
    """Tests for TTSRateLimitError."""

    def test_creation_with_retry(self) -> None:
        """Test TTSRateLimitError with retry_after_seconds."""
        error = TTSRateLimitError(
            "Rate limit exceeded",
            provider="edge",
            retry_after_seconds=60,
        )

        assert error.message == "Rate limit exceeded"
        assert error.provider == "edge"
        assert error.retry_after_seconds == 60

    def test_creation_without_retry(self) -> None:
        """Test TTSRateLimitError without retry_after_seconds."""
        error = TTSRateLimitError("Rate limit exceeded", provider="azure")

        assert error.retry_after_seconds is None


class TestTTSTimeoutError:
    """Tests for TTSTimeoutError."""

    def test_creation(self) -> None:
        """Test TTSTimeoutError creation."""
        error = TTSTimeoutError("Request timed out after 30s", provider="azure")

        assert error.message == "Request timed out after 30s"
        assert isinstance(error, TTSProviderError)


class TestTTSAudioGenerationError:
    """Tests for TTSAudioGenerationError."""

    def test_creation(self) -> None:
        """Test TTSAudioGenerationError creation."""
        error = TTSAudioGenerationError(
            "Failed to generate audio",
            provider="edge",
            details={"text": "Hello world"},
        )

        assert error.message == "Failed to generate audio"
        assert error.details["text"] == "Hello world"


class TestTTSUnsupportedLanguageError:
    """Tests for TTSUnsupportedLanguageError."""

    def test_creation(self) -> None:
        """Test TTSUnsupportedLanguageError creation."""
        error = TTSUnsupportedLanguageError(
            "Language not supported",
            language="xx",
            provider="edge",
            supported_languages=["en", "tr", "de"],
        )

        assert error.message == "Language not supported"
        assert error.language == "xx"
        assert error.supported_languages == ["en", "tr", "de"]
        assert isinstance(error, TTSProviderError)

    def test_creation_without_supported_list(self) -> None:
        """Test creation without supported_languages list."""
        error = TTSUnsupportedLanguageError(
            "Language not supported",
            language="yy",
            provider="azure",
        )

        assert error.supported_languages == []


class TestAllTTSProvidersFailedError:
    """Tests for AllTTSProvidersFailedError."""

    def test_creation_with_errors(self) -> None:
        """Test AllTTSProvidersFailedError with provider errors."""
        error1 = TTSConnectionError("Connection failed", provider="edge")
        error2 = TTSTimeoutError("Timeout", provider="azure")

        all_failed = AllTTSProvidersFailedError(
            "All providers failed",
            provider_errors=[("edge", error1), ("azure", error2)],
        )

        assert all_failed.message == "All providers failed"
        assert len(all_failed.provider_errors) == 2
        assert all_failed.provider_errors[0][0] == "edge"
        assert all_failed.provider_errors[1][0] == "azure"

    def test_str_format(self) -> None:
        """Test string representation includes all errors."""
        error1 = TTSConnectionError("Network error", provider="edge")
        error2 = TTSAuthenticationError("Bad API key", provider="azure")

        all_failed = AllTTSProvidersFailedError(
            "All providers failed",
            provider_errors=[("edge", error1), ("azure", error2)],
        )

        error_str = str(all_failed)
        assert "All providers failed" in error_str
        assert "edge: Network error" in error_str
        assert "azure: Bad API key" in error_str

    def test_empty_errors(self) -> None:
        """Test with empty provider errors list."""
        all_failed = AllTTSProvidersFailedError(
            "No providers available",
            provider_errors=[],
        )

        assert len(all_failed.provider_errors) == 0
        assert "No providers available" in str(all_failed)


class TestExceptionHierarchy:
    """Tests for exception inheritance hierarchy."""

    def test_all_exceptions_inherit_from_base(self) -> None:
        """Test all TTS exceptions inherit from TTSProviderError."""
        exceptions = [
            TTSConnectionError("test"),
            TTSAuthenticationError("test"),
            TTSRateLimitError("test"),
            TTSTimeoutError("test"),
            TTSAudioGenerationError("test"),
            TTSUnsupportedLanguageError("test", language="xx"),
            AllTTSProvidersFailedError("test", provider_errors=[]),
        ]

        for exc in exceptions:
            assert isinstance(exc, TTSProviderError)
            assert isinstance(exc, Exception)

    def test_can_catch_specific_exceptions(self) -> None:
        """Test specific exceptions can be caught."""
        try:
            raise TTSRateLimitError("Rate limited", retry_after_seconds=30)
        except TTSRateLimitError as e:
            assert e.retry_after_seconds == 30
        except TTSProviderError:
            pytest.fail("Should have caught TTSRateLimitError specifically")

    def test_can_catch_base_exception(self) -> None:
        """Test base exception catches all TTS exceptions."""
        exceptions_to_test = [
            TTSConnectionError("test"),
            TTSAuthenticationError("test"),
            TTSTimeoutError("test"),
        ]

        for exc in exceptions_to_test:
            try:
                raise exc
            except TTSProviderError:
                pass  # Expected
            except Exception:
                pytest.fail(f"TTSProviderError should catch {type(exc).__name__}")
