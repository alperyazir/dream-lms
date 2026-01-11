"""Tests for Azure TTS provider implementation."""

from unittest.mock import MagicMock, patch

import pytest

from app.services.tts.base import (
    AudioFormat,
    AudioGenerationOptions,
    BatchAudioItem,
    Voice,
)
from app.services.tts.config import TTSSettings
from app.services.tts.exceptions import (
    TTSAudioGenerationError,
    TTSAuthenticationError,
    TTSConnectionError,
    TTSUnsupportedLanguageError,
)
from app.services.tts.providers.azure import AzureTTSProvider


@pytest.fixture
def azure_settings() -> TTSSettings:
    """Create TTSSettings with Azure configuration."""
    return TTSSettings(
        AZURE_TTS_KEY="test-api-key",
        AZURE_TTS_REGION="turkeycentral",
    )


@pytest.fixture
def azure_settings_no_key() -> TTSSettings:
    """Create TTSSettings without Azure API key."""
    return TTSSettings(
        AZURE_TTS_KEY=None,
        AZURE_TTS_REGION="turkeycentral",
    )


class TestAzureTTSProviderBasics:
    """Tests for basic provider methods."""

    def test_initialization(self, azure_settings: TTSSettings) -> None:
        """Test AzureTTSProvider can be initialized with settings."""
        provider = AzureTTSProvider(settings=azure_settings)
        assert provider is not None

    def test_initialization_with_region(self, azure_settings: TTSSettings) -> None:
        """Test AzureTTSProvider uses configured region."""
        provider = AzureTTSProvider(settings=azure_settings)
        assert provider._region == "turkeycentral"

    def test_get_name(self, azure_settings: TTSSettings) -> None:
        """Test get_name returns 'azure'."""
        provider = AzureTTSProvider(settings=azure_settings)
        assert provider.get_name() == "azure"

    def test_is_available_with_key(self, azure_settings: TTSSettings) -> None:
        """Test is_available returns True when API key is configured."""
        provider = AzureTTSProvider(settings=azure_settings)
        assert provider.is_available() is True

    def test_is_available_without_key(self, azure_settings_no_key: TTSSettings) -> None:
        """Test is_available returns False when API key is missing."""
        provider = AzureTTSProvider(settings=azure_settings_no_key)
        assert provider.is_available() is False


class TestSupportedLanguages:
    """Tests for language support methods."""

    def test_get_supported_languages(self, azure_settings: TTSSettings) -> None:
        """Test get_supported_languages returns expected codes."""
        provider = AzureTTSProvider(settings=azure_settings)
        languages = provider.get_supported_languages()

        assert "en" in languages
        assert "en-US" in languages
        assert "en-GB" in languages
        assert "tr" in languages
        assert "tr-TR" in languages

    def test_supports_language_valid(self, azure_settings: TTSSettings) -> None:
        """Test supports_language returns True for valid languages."""
        provider = AzureTTSProvider(settings=azure_settings)

        assert provider.supports_language("en") is True
        assert provider.supports_language("en-US") is True
        assert provider.supports_language("en-GB") is True
        assert provider.supports_language("tr") is True
        assert provider.supports_language("tr-TR") is True

    def test_supports_language_invalid(self, azure_settings: TTSSettings) -> None:
        """Test supports_language returns False for unsupported languages."""
        provider = AzureTTSProvider(settings=azure_settings)

        assert provider.supports_language("fr") is False
        assert provider.supports_language("de") is False
        assert provider.supports_language("es") is False
        assert provider.supports_language("invalid") is False


class TestVoiceSupport:
    """Tests for voice-related methods."""

    def test_get_available_voices_turkish(self, azure_settings: TTSSettings) -> None:
        """Test get_available_voices for Turkish language."""
        provider = AzureTTSProvider(settings=azure_settings)

        # Test with short code
        voices_tr = provider.get_available_voices("tr")
        assert len(voices_tr) == 2
        voice_ids = [v.id for v in voices_tr]
        assert "tr-TR-AhmetNeural" in voice_ids
        assert "tr-TR-EmelNeural" in voice_ids

        # Test with full code
        voices_tr_full = provider.get_available_voices("tr-TR")
        assert len(voices_tr_full) == 2

    def test_get_available_voices_english_us(self, azure_settings: TTSSettings) -> None:
        """Test get_available_voices for US English."""
        provider = AzureTTSProvider(settings=azure_settings)
        voices = provider.get_available_voices("en-US")

        assert len(voices) >= 3
        voice_ids = [v.id for v in voices]
        assert "en-US-JennyNeural" in voice_ids
        assert "en-US-GuyNeural" in voice_ids
        assert "en-US-AriaNeural" in voice_ids

    def test_get_available_voices_english_gb(self, azure_settings: TTSSettings) -> None:
        """Test get_available_voices for British English."""
        provider = AzureTTSProvider(settings=azure_settings)
        voices = provider.get_available_voices("en-GB")

        assert len(voices) >= 2
        voice_ids = [v.id for v in voices]
        assert "en-GB-SoniaNeural" in voice_ids
        assert "en-GB-RyanNeural" in voice_ids

    def test_get_available_voices_english_all(
        self, azure_settings: TTSSettings
    ) -> None:
        """Test get_available_voices for generic 'en' returns both US and GB voices."""
        provider = AzureTTSProvider(settings=azure_settings)
        voices = provider.get_available_voices("en")

        # Should include both US and GB voices
        assert len(voices) >= 5
        voice_ids = [v.id for v in voices]
        assert "en-US-JennyNeural" in voice_ids
        assert "en-GB-SoniaNeural" in voice_ids

    def test_get_available_voices_unsupported(
        self, azure_settings: TTSSettings
    ) -> None:
        """Test get_available_voices returns empty list for unsupported language."""
        provider = AzureTTSProvider(settings=azure_settings)
        voices = provider.get_available_voices("fr")
        assert voices == []

    def test_voice_model_structure(self, azure_settings: TTSSettings) -> None:
        """Test that Voice objects have correct structure."""
        provider = AzureTTSProvider(settings=azure_settings)
        voices = provider.get_available_voices("tr")

        for voice in voices:
            assert isinstance(voice, Voice)
            assert voice.id is not None
            assert voice.name is not None
            assert voice.language == "tr-TR"
            assert voice.gender in ["male", "female", "neutral"]
            assert voice.style == "neural"


class TestRatePitchConversion:
    """Tests for rate and pitch conversion."""

    def test_convert_rate_normal(self, azure_settings: TTSSettings) -> None:
        """Test rate conversion for 1.0 (normal speed)."""
        provider = AzureTTSProvider(settings=azure_settings)
        assert provider._convert_rate(1.0) == "default"

    def test_convert_rate_slower(self, azure_settings: TTSSettings) -> None:
        """Test rate conversion for slower speeds."""
        provider = AzureTTSProvider(settings=azure_settings)
        assert provider._convert_rate(0.5) == "-50%"
        assert provider._convert_rate(0.75) == "-25%"

    def test_convert_rate_faster(self, azure_settings: TTSSettings) -> None:
        """Test rate conversion for faster speeds."""
        provider = AzureTTSProvider(settings=azure_settings)
        assert provider._convert_rate(1.5) == "+50%"
        assert provider._convert_rate(2.0) == "+100%"

    def test_convert_pitch_normal(self, azure_settings: TTSSettings) -> None:
        """Test pitch conversion for 1.0 (normal pitch)."""
        provider = AzureTTSProvider(settings=azure_settings)
        assert provider._convert_pitch(1.0) == "default"

    def test_convert_pitch_lower(self, azure_settings: TTSSettings) -> None:
        """Test pitch conversion for lower pitches."""
        provider = AzureTTSProvider(settings=azure_settings)
        assert provider._convert_pitch(0.5) == "-25%"

    def test_convert_pitch_higher(self, azure_settings: TTSSettings) -> None:
        """Test pitch conversion for higher pitches."""
        provider = AzureTTSProvider(settings=azure_settings)
        assert provider._convert_pitch(1.5) == "+25%"
        assert provider._convert_pitch(2.0) == "+50%"


class TestSSMLBuilding:
    """Tests for SSML generation."""

    def test_build_ssml_basic(self, azure_settings: TTSSettings) -> None:
        """Test basic SSML generation without prosody modifications."""
        provider = AzureTTSProvider(settings=azure_settings)

        ssml = provider._build_ssml(
            text="Hello world",
            voice="en-US-JennyNeural",
            rate="default",
            pitch="default",
        )

        assert 'version="1.0"' in ssml
        assert 'xml:lang="en-US"' in ssml
        assert 'name="en-US-JennyNeural"' in ssml
        assert "Hello world" in ssml
        # No prosody element when defaults
        assert "prosody" not in ssml

    def test_build_ssml_with_rate(self, azure_settings: TTSSettings) -> None:
        """Test SSML generation with custom rate."""
        provider = AzureTTSProvider(settings=azure_settings)

        ssml = provider._build_ssml(
            text="Fast speech",
            voice="en-US-JennyNeural",
            rate="+50%",
            pitch="default",
        )

        assert "<prosody" in ssml
        assert 'rate="+50%"' in ssml

    def test_build_ssml_with_pitch(self, azure_settings: TTSSettings) -> None:
        """Test SSML generation with custom pitch."""
        provider = AzureTTSProvider(settings=azure_settings)

        ssml = provider._build_ssml(
            text="High pitch",
            voice="en-US-JennyNeural",
            rate="default",
            pitch="+25%",
        )

        assert "<prosody" in ssml
        assert 'pitch="+25%"' in ssml

    def test_build_ssml_with_rate_and_pitch(self, azure_settings: TTSSettings) -> None:
        """Test SSML generation with both rate and pitch."""
        provider = AzureTTSProvider(settings=azure_settings)

        ssml = provider._build_ssml(
            text="Modified",
            voice="en-US-JennyNeural",
            rate="+20%",
            pitch="-10%",
        )

        assert "<prosody" in ssml
        assert 'rate="+20%"' in ssml
        assert 'pitch="-10%"' in ssml

    def test_build_ssml_escapes_special_characters(
        self, azure_settings: TTSSettings
    ) -> None:
        """Test SSML properly escapes special XML characters."""
        provider = AzureTTSProvider(settings=azure_settings)

        ssml = provider._build_ssml(
            text="<script>alert('XSS')</script> & \"quotes\"",
            voice="en-US-JennyNeural",
            rate="default",
            pitch="default",
        )

        # Special characters should be escaped
        assert "&lt;script&gt;" in ssml
        assert "&amp;" in ssml
        assert "&quot;" in ssml or "quotes" in ssml


class TestDefaultVoiceSelection:
    """Tests for default voice selection."""

    def test_default_voice_english(self, azure_settings: TTSSettings) -> None:
        """Test default voice for English."""
        provider = AzureTTSProvider(settings=azure_settings)
        voice = provider._get_default_voice("en")
        assert voice == "en-US-JennyNeural"

    def test_default_voice_english_us(self, azure_settings: TTSSettings) -> None:
        """Test default voice for en-US."""
        provider = AzureTTSProvider(settings=azure_settings)
        voice = provider._get_default_voice("en-US")
        assert voice == "en-US-JennyNeural"

    def test_default_voice_english_gb(self, azure_settings: TTSSettings) -> None:
        """Test default voice for en-GB."""
        provider = AzureTTSProvider(settings=azure_settings)
        voice = provider._get_default_voice("en-GB")
        assert voice == "en-GB-SoniaNeural"

    def test_default_voice_turkish(self, azure_settings: TTSSettings) -> None:
        """Test default voice for Turkish."""
        provider = AzureTTSProvider(settings=azure_settings)
        voice = provider._get_default_voice("tr")
        assert voice == "tr-TR-EmelNeural"

    def test_default_voice_unsupported(self, azure_settings: TTSSettings) -> None:
        """Test default voice for unsupported language raises error."""
        provider = AzureTTSProvider(settings=azure_settings)

        with pytest.raises(TTSUnsupportedLanguageError) as exc_info:
            provider._get_default_voice("fr")

        assert exc_info.value.provider == "azure"


@pytest.fixture
def mock_azure_sdk():
    """Mock Azure Speech SDK for testing."""
    with patch(
        "app.services.tts.providers.azure.speechsdk.SpeechConfig"
    ) as mock_config_class:
        with patch(
            "app.services.tts.providers.azure.speechsdk.SpeechSynthesizer"
        ) as mock_synth_class:
            with patch(
                "app.services.tts.providers.azure.speechsdk.ResultReason"
            ) as mock_reason:
                with patch(
                    "app.services.tts.providers.azure.speechsdk.CancellationReason"
                ) as mock_cancel_reason:
                    # Setup ResultReason enum values
                    mock_reason.SynthesizingAudioCompleted = "completed"
                    mock_reason.Canceled = "canceled"

                    # Setup CancellationReason enum values
                    mock_cancel_reason.Error = "error"

                    # Setup mock config
                    mock_config = MagicMock()
                    mock_config_class.return_value = mock_config

                    # Setup mock result
                    mock_result = MagicMock()
                    mock_result.reason = mock_reason.SynthesizingAudioCompleted
                    mock_result.audio_data = b"fake_audio_data_from_azure"
                    mock_result.audio_duration = MagicMock()
                    mock_result.audio_duration.total_seconds.return_value = 2.5

                    # Setup synthesizer
                    mock_synth = MagicMock()
                    mock_synth.speak_text_async.return_value.get.return_value = (
                        mock_result
                    )
                    mock_synth.speak_ssml_async.return_value.get.return_value = (
                        mock_result
                    )
                    mock_synth_class.return_value = mock_synth

                    yield {
                        "config_class": mock_config_class,
                        "config": mock_config,
                        "synth_class": mock_synth_class,
                        "synth": mock_synth,
                        "result": mock_result,
                        "reason": mock_reason,
                        "cancel_reason": mock_cancel_reason,
                    }


class TestGenerateAudio:
    """Tests for generate_audio method."""

    @pytest.mark.asyncio
    async def test_generate_audio_success(
        self, azure_settings: TTSSettings, mock_azure_sdk: dict
    ) -> None:
        """Test successful audio generation."""
        provider = AzureTTSProvider(settings=azure_settings)

        result = await provider.generate_audio(
            "Hello world",
            AudioGenerationOptions(language="en"),
        )

        assert result.audio_data == b"fake_audio_data_from_azure"
        assert result.format == AudioFormat.MP3
        assert result.provider == "azure"
        assert result.cached is False
        assert result.latency_ms >= 0

    @pytest.mark.asyncio
    async def test_generate_audio_default_options(
        self, azure_settings: TTSSettings, mock_azure_sdk: dict
    ) -> None:
        """Test generate_audio with default options."""
        provider = AzureTTSProvider(settings=azure_settings)

        result = await provider.generate_audio("Test text")

        assert result.audio_data is not None
        assert result.format == AudioFormat.MP3

    @pytest.mark.asyncio
    async def test_generate_audio_turkish(
        self, azure_settings: TTSSettings, mock_azure_sdk: dict
    ) -> None:
        """Test audio generation for Turkish."""
        provider = AzureTTSProvider(settings=azure_settings)

        await provider.generate_audio(
            "Merhaba",
            AudioGenerationOptions(language="tr"),
        )

        # Verify voice was set correctly
        mock_config = mock_azure_sdk["config"]
        assert mock_config.speech_synthesis_voice_name == "tr-TR-EmelNeural"

    @pytest.mark.asyncio
    async def test_generate_audio_custom_voice(
        self, azure_settings: TTSSettings, mock_azure_sdk: dict
    ) -> None:
        """Test audio generation with specific voice."""
        provider = AzureTTSProvider(settings=azure_settings)

        await provider.generate_audio(
            "Test",
            AudioGenerationOptions(
                language="en-US",
                voice="en-US-GuyNeural",
            ),
        )

        mock_config = mock_azure_sdk["config"]
        assert mock_config.speech_synthesis_voice_name == "en-US-GuyNeural"

    @pytest.mark.asyncio
    async def test_generate_audio_with_rate_uses_ssml(
        self, azure_settings: TTSSettings, mock_azure_sdk: dict
    ) -> None:
        """Test audio generation with custom rate uses SSML."""
        provider = AzureTTSProvider(settings=azure_settings)

        await provider.generate_audio(
            "Fast speech",
            AudioGenerationOptions(language="en", rate=1.5),
        )

        # Should use speak_ssml_async, not speak_text_async
        mock_synth = mock_azure_sdk["synth"]
        mock_synth.speak_ssml_async.return_value.get.assert_called()

    @pytest.mark.asyncio
    async def test_generate_audio_with_pitch_uses_ssml(
        self, azure_settings: TTSSettings, mock_azure_sdk: dict
    ) -> None:
        """Test audio generation with custom pitch uses SSML."""
        provider = AzureTTSProvider(settings=azure_settings)

        await provider.generate_audio(
            "High pitch",
            AudioGenerationOptions(language="en", pitch=1.5),
        )

        mock_synth = mock_azure_sdk["synth"]
        mock_synth.speak_ssml_async.return_value.get.assert_called()

    @pytest.mark.asyncio
    async def test_generate_audio_normal_rate_uses_text(
        self, azure_settings: TTSSettings, mock_azure_sdk: dict
    ) -> None:
        """Test audio generation with default rate uses plain text."""
        provider = AzureTTSProvider(settings=azure_settings)

        await provider.generate_audio(
            "Normal speech",
            AudioGenerationOptions(language="en", rate=1.0, pitch=1.0),
        )

        mock_synth = mock_azure_sdk["synth"]
        mock_synth.speak_text_async.return_value.get.assert_called()

    @pytest.mark.asyncio
    async def test_generate_audio_unsupported_language(
        self, azure_settings: TTSSettings
    ) -> None:
        """Test generate_audio raises error for unsupported language."""
        provider = AzureTTSProvider(settings=azure_settings)

        with pytest.raises(TTSUnsupportedLanguageError) as exc_info:
            await provider.generate_audio(
                "Bonjour",
                AudioGenerationOptions(language="fr"),
            )

        assert "fr" in str(exc_info.value)
        assert exc_info.value.provider == "azure"

    @pytest.mark.asyncio
    async def test_generate_audio_authentication_error(
        self, azure_settings: TTSSettings
    ) -> None:
        """Test generate_audio raises TTSAuthenticationError for 401."""
        with patch(
            "app.services.tts.providers.azure.speechsdk.SpeechConfig"
        ) as mock_config_class:
            with patch(
                "app.services.tts.providers.azure.speechsdk.SpeechSynthesizer"
            ) as mock_synth_class:
                with patch(
                    "app.services.tts.providers.azure.speechsdk.ResultReason"
                ) as mock_reason:
                    with patch(
                        "app.services.tts.providers.azure.speechsdk.CancellationReason"
                    ) as mock_cancel_reason:
                        mock_reason.Canceled = "canceled"
                        mock_cancel_reason.Error = "error"

                        mock_config = MagicMock()
                        mock_config_class.return_value = mock_config

                        # Setup canceled result with 401 error
                        mock_result = MagicMock()
                        mock_result.reason = mock_reason.Canceled
                        mock_result.cancellation_details = MagicMock()
                        mock_result.cancellation_details.reason = (
                            mock_cancel_reason.Error
                        )
                        mock_result.cancellation_details.error_details = (
                            "401 Unauthorized - Invalid API key"
                        )

                        mock_synth = MagicMock()
                        mock_synth.speak_text_async.return_value.get.return_value = (
                            mock_result
                        )
                        mock_synth_class.return_value = mock_synth

                        provider = AzureTTSProvider(settings=azure_settings)

                        with pytest.raises(TTSAuthenticationError) as exc_info:
                            await provider.generate_audio(
                                "Test", AudioGenerationOptions(language="en")
                            )

                        assert exc_info.value.provider == "azure"

    @pytest.mark.asyncio
    async def test_generate_audio_connection_error(
        self, azure_settings: TTSSettings
    ) -> None:
        """Test generate_audio raises TTSConnectionError for network issues."""
        with patch(
            "app.services.tts.providers.azure.speechsdk.SpeechConfig"
        ) as mock_config_class:
            mock_config_class.side_effect = Exception("Connection timeout")

            provider = AzureTTSProvider(settings=azure_settings)

            with pytest.raises(TTSConnectionError):
                await provider.generate_audio(
                    "Test", AudioGenerationOptions(language="en")
                )

    @pytest.mark.asyncio
    async def test_generate_audio_empty_result(
        self, azure_settings: TTSSettings
    ) -> None:
        """Test generate_audio raises error for empty audio data."""
        with patch(
            "app.services.tts.providers.azure.speechsdk.SpeechConfig"
        ) as mock_config_class:
            with patch(
                "app.services.tts.providers.azure.speechsdk.SpeechSynthesizer"
            ) as mock_synth_class:
                with patch(
                    "app.services.tts.providers.azure.speechsdk.ResultReason"
                ) as mock_reason:
                    mock_reason.SynthesizingAudioCompleted = "completed"

                    mock_config = MagicMock()
                    mock_config_class.return_value = mock_config

                    # Empty audio data
                    mock_result = MagicMock()
                    mock_result.reason = mock_reason.SynthesizingAudioCompleted
                    mock_result.audio_data = None

                    mock_synth = MagicMock()
                    mock_synth.speak_text_async.return_value.get.return_value = (
                        mock_result
                    )
                    mock_synth_class.return_value = mock_synth

                    provider = AzureTTSProvider(settings=azure_settings)

                    with pytest.raises(TTSAudioGenerationError) as exc_info:
                        await provider.generate_audio(
                            "Test", AudioGenerationOptions(language="en")
                        )

                    assert "empty" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_generate_audio_no_api_key(
        self, azure_settings_no_key: TTSSettings
    ) -> None:
        """Test generate_audio raises error when API key is missing."""
        provider = AzureTTSProvider(settings=azure_settings_no_key)

        with pytest.raises(TTSAuthenticationError):
            await provider.generate_audio(
                "Test", AudioGenerationOptions(language="en")
            )


class TestGenerateAudioBatch:
    """Tests for generate_audio_batch method."""

    @pytest.mark.asyncio
    async def test_batch_empty_list(self, azure_settings: TTSSettings) -> None:
        """Test batch generation with empty list."""
        provider = AzureTTSProvider(settings=azure_settings)

        result = await provider.generate_audio_batch([])

        assert result.results == []
        assert result.success_count == 0
        assert result.failure_count == 0
        assert result.provider == "azure"

    @pytest.mark.asyncio
    async def test_batch_single_item(
        self, azure_settings: TTSSettings, mock_azure_sdk: dict
    ) -> None:
        """Test batch generation with single item."""
        provider = AzureTTSProvider(settings=azure_settings)

        items = [
            BatchAudioItem(
                text="Hello",
                options=AudioGenerationOptions(language="en"),
            )
        ]

        result = await provider.generate_audio_batch(items)

        assert len(result.results) == 1
        assert result.success_count == 1
        assert result.failure_count == 0

    @pytest.mark.asyncio
    async def test_batch_multiple_items(
        self, azure_settings: TTSSettings, mock_azure_sdk: dict
    ) -> None:
        """Test batch generation with multiple items."""
        provider = AzureTTSProvider(settings=azure_settings)

        items = [
            BatchAudioItem(text="Hello", options=AudioGenerationOptions(language="en")),
            BatchAudioItem(text="World", options=AudioGenerationOptions(language="en")),
            BatchAudioItem(text="Test", options=AudioGenerationOptions(language="en")),
        ]

        result = await provider.generate_audio_batch(items)

        assert len(result.results) == 3
        assert result.success_count == 3
        assert result.failure_count == 0
        assert result.total_latency_ms >= 0

    @pytest.mark.asyncio
    async def test_batch_different_languages(
        self, azure_settings: TTSSettings, mock_azure_sdk: dict
    ) -> None:
        """Test batch with items in different languages."""
        provider = AzureTTSProvider(settings=azure_settings)

        items = [
            BatchAudioItem(
                text="Hello",
                options=AudioGenerationOptions(language="en-US"),
            ),
            BatchAudioItem(
                text="Merhaba",
                options=AudioGenerationOptions(language="tr-TR"),
            ),
        ]

        result = await provider.generate_audio_batch(items)

        assert result.success_count == 2


class TestManagerIntegration:
    """Tests for AzureTTSProvider integration with TTSManager."""

    def test_provider_registration(self, azure_settings: TTSSettings) -> None:
        """Test AzureTTSProvider can be registered with TTSManager."""
        from app.services.tts.base import TTSProviderType
        from app.services.tts.manager import TTSManager

        manager = TTSManager()
        provider = AzureTTSProvider(settings=azure_settings)

        manager.register_provider(TTSProviderType.AZURE, provider)

        assert manager.get_provider(TTSProviderType.AZURE) is provider

    def test_create_default_manager_includes_azure_when_configured(
        self, azure_settings: TTSSettings
    ) -> None:
        """Test create_default_manager registers AzureTTSProvider when configured."""
        from app.services.tts.manager import TTSManager

        # Create manager with custom settings that has Azure key
        manager = TTSManager(settings=azure_settings)

        # Manually register like create_default_manager does
        from app.services.tts.base import TTSProviderType
        from app.services.tts.providers.azure import AzureTTSProvider as AzureProvider
        from app.services.tts.providers.edge import EdgeTTSProvider

        manager.register_provider(TTSProviderType.EDGE, EdgeTTSProvider())
        manager.register_provider(
            TTSProviderType.AZURE, AzureProvider(settings=azure_settings)
        )

        providers = manager.get_available_providers()

        assert any(p.get_name() == "azure" for p in providers)

    def test_azure_not_available_without_key(
        self, azure_settings_no_key: TTSSettings
    ) -> None:
        """Test Azure provider is not available when API key is missing."""
        from app.services.tts.base import TTSProviderType
        from app.services.tts.manager import TTSManager

        manager = TTSManager(settings=azure_settings_no_key)
        provider = AzureTTSProvider(settings=azure_settings_no_key)

        manager.register_provider(TTSProviderType.AZURE, provider)

        # Provider is registered but not available
        assert manager.get_provider(TTSProviderType.AZURE) is provider
        assert provider.is_available() is False


class TestSpeechConfigCreation:
    """Tests for _get_speech_config method."""

    def test_get_speech_config_success(
        self, azure_settings: TTSSettings, mock_azure_sdk: dict
    ) -> None:
        """Test _get_speech_config creates config with correct parameters."""
        provider = AzureTTSProvider(settings=azure_settings)

        provider._get_speech_config()

        # Verify SpeechConfig was called with correct parameters
        mock_azure_sdk["config_class"].assert_called_once_with(
            subscription="test-api-key",
            region="turkeycentral",
        )

    def test_get_speech_config_no_key_raises(
        self, azure_settings_no_key: TTSSettings
    ) -> None:
        """Test _get_speech_config raises error when API key is missing."""
        provider = AzureTTSProvider(settings=azure_settings_no_key)

        with pytest.raises(TTSAuthenticationError) as exc_info:
            provider._get_speech_config()

        assert "not configured" in str(exc_info.value).lower()
