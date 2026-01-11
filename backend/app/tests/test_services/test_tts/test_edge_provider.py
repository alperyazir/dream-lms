"""Tests for Edge TTS provider implementation."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.tts.base import (
    AudioFormat,
    AudioGenerationOptions,
    BatchAudioItem,
    Voice,
)
from app.services.tts.exceptions import (
    TTSAudioGenerationError,
    TTSConnectionError,
    TTSUnsupportedLanguageError,
)
from app.services.tts.providers.edge import EdgeTTSProvider


class TestEdgeTTSProviderBasics:
    """Tests for basic provider methods."""

    def test_initialization(self) -> None:
        """Test EdgeTTSProvider can be initialized."""
        provider = EdgeTTSProvider()
        assert provider is not None

    def test_get_name(self) -> None:
        """Test get_name returns 'edge'."""
        provider = EdgeTTSProvider()
        assert provider.get_name() == "edge"

    def test_is_available(self) -> None:
        """Test is_available returns True (Edge TTS needs no API key)."""
        provider = EdgeTTSProvider()
        assert provider.is_available() is True


class TestSupportedLanguages:
    """Tests for language support methods."""

    def test_get_supported_languages(self) -> None:
        """Test get_supported_languages returns expected codes."""
        provider = EdgeTTSProvider()
        languages = provider.get_supported_languages()

        assert "en" in languages
        assert "en-US" in languages
        assert "en-GB" in languages
        assert "tr" in languages
        assert "tr-TR" in languages

    def test_supports_language_valid(self) -> None:
        """Test supports_language returns True for valid languages."""
        provider = EdgeTTSProvider()

        assert provider.supports_language("en") is True
        assert provider.supports_language("en-US") is True
        assert provider.supports_language("en-GB") is True
        assert provider.supports_language("tr") is True
        assert provider.supports_language("tr-TR") is True

    def test_supports_language_invalid(self) -> None:
        """Test supports_language returns False for unsupported languages."""
        provider = EdgeTTSProvider()

        assert provider.supports_language("fr") is False
        assert provider.supports_language("de") is False
        assert provider.supports_language("es") is False
        assert provider.supports_language("invalid") is False


class TestVoiceSupport:
    """Tests for voice-related methods."""

    def test_get_available_voices_turkish(self) -> None:
        """Test get_available_voices for Turkish language."""
        provider = EdgeTTSProvider()

        # Test with short code
        voices_tr = provider.get_available_voices("tr")
        assert len(voices_tr) == 2
        voice_ids = [v.id for v in voices_tr]
        assert "tr-TR-AhmetNeural" in voice_ids
        assert "tr-TR-EmelNeural" in voice_ids

        # Test with full code
        voices_tr_full = provider.get_available_voices("tr-TR")
        assert len(voices_tr_full) == 2

    def test_get_available_voices_english_us(self) -> None:
        """Test get_available_voices for US English."""
        provider = EdgeTTSProvider()
        voices = provider.get_available_voices("en-US")

        assert len(voices) >= 3
        voice_ids = [v.id for v in voices]
        assert "en-US-JennyNeural" in voice_ids
        assert "en-US-GuyNeural" in voice_ids
        assert "en-US-AriaNeural" in voice_ids

    def test_get_available_voices_english_gb(self) -> None:
        """Test get_available_voices for British English."""
        provider = EdgeTTSProvider()
        voices = provider.get_available_voices("en-GB")

        assert len(voices) >= 2
        voice_ids = [v.id for v in voices]
        assert "en-GB-SoniaNeural" in voice_ids
        assert "en-GB-RyanNeural" in voice_ids

    def test_get_available_voices_english_all(self) -> None:
        """Test get_available_voices for generic 'en' returns both US and GB voices."""
        provider = EdgeTTSProvider()
        voices = provider.get_available_voices("en")

        # Should include both US and GB voices
        assert len(voices) >= 5
        voice_ids = [v.id for v in voices]
        assert "en-US-JennyNeural" in voice_ids
        assert "en-GB-SoniaNeural" in voice_ids

    def test_get_available_voices_unsupported(self) -> None:
        """Test get_available_voices returns empty list for unsupported language."""
        provider = EdgeTTSProvider()
        voices = provider.get_available_voices("fr")
        assert voices == []

    def test_voice_model_structure(self) -> None:
        """Test that Voice objects have correct structure."""
        provider = EdgeTTSProvider()
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

    def test_convert_rate_normal(self) -> None:
        """Test rate conversion for 1.0 (normal speed)."""
        provider = EdgeTTSProvider()
        assert provider._convert_rate(1.0) == "+0%"

    def test_convert_rate_slower(self) -> None:
        """Test rate conversion for slower speeds."""
        provider = EdgeTTSProvider()
        assert provider._convert_rate(0.5) == "-50%"
        assert provider._convert_rate(0.75) == "-25%"

    def test_convert_rate_faster(self) -> None:
        """Test rate conversion for faster speeds."""
        provider = EdgeTTSProvider()
        assert provider._convert_rate(1.5) == "+50%"
        assert provider._convert_rate(2.0) == "+100%"

    def test_convert_pitch_normal(self) -> None:
        """Test pitch conversion for 1.0 (normal pitch)."""
        provider = EdgeTTSProvider()
        assert provider._convert_pitch(1.0) == "+0Hz"

    def test_convert_pitch_lower(self) -> None:
        """Test pitch conversion for lower pitches."""
        provider = EdgeTTSProvider()
        assert provider._convert_pitch(0.5) == "-50Hz"

    def test_convert_pitch_higher(self) -> None:
        """Test pitch conversion for higher pitches."""
        provider = EdgeTTSProvider()
        assert provider._convert_pitch(1.5) == "+50Hz"
        assert provider._convert_pitch(2.0) == "+100Hz"


class TestGenerateAudio:
    """Tests for generate_audio method."""

    @pytest.fixture
    def mock_communicate(self):
        """Create a mock for edge_tts.Communicate."""
        with patch("app.services.tts.providers.edge.edge_tts.Communicate") as mock:
            instance = MagicMock()
            mock.return_value = instance

            # Create async generator for stream()
            async def mock_stream():
                yield {"type": "audio", "data": b"fake_audio_data_chunk_1"}
                yield {"type": "audio", "data": b"fake_audio_data_chunk_2"}

            instance.stream = mock_stream
            yield mock

    @pytest.mark.asyncio
    async def test_generate_audio_success(self, mock_communicate) -> None:
        """Test successful audio generation."""
        provider = EdgeTTSProvider()

        result = await provider.generate_audio(
            "Hello world",
            AudioGenerationOptions(language="en"),
        )

        assert result.audio_data == b"fake_audio_data_chunk_1fake_audio_data_chunk_2"
        assert result.format == AudioFormat.MP3
        assert result.provider == "edge"
        assert result.cached is False
        assert result.latency_ms >= 0

    @pytest.mark.asyncio
    async def test_generate_audio_default_options(self, mock_communicate) -> None:
        """Test generate_audio with default options."""
        provider = EdgeTTSProvider()

        result = await provider.generate_audio("Test text")

        assert result.audio_data is not None
        assert result.format == AudioFormat.MP3

    @pytest.mark.asyncio
    async def test_generate_audio_turkish(self, mock_communicate) -> None:
        """Test audio generation for Turkish."""
        provider = EdgeTTSProvider()

        result = await provider.generate_audio(
            "Merhaba",
            AudioGenerationOptions(language="tr"),
        )

        # Verify Communicate was called with Turkish voice
        mock_communicate.assert_called_once()
        call_args = mock_communicate.call_args
        assert "tr-TR" in call_args[0][1]  # Voice argument

    @pytest.mark.asyncio
    async def test_generate_audio_custom_voice(self, mock_communicate) -> None:
        """Test audio generation with specific voice."""
        provider = EdgeTTSProvider()

        result = await provider.generate_audio(
            "Test",
            AudioGenerationOptions(
                language="en-US",
                voice="en-US-GuyNeural",
            ),
        )

        mock_communicate.assert_called_once()
        call_args = mock_communicate.call_args
        assert call_args[0][1] == "en-US-GuyNeural"

    @pytest.mark.asyncio
    async def test_generate_audio_with_rate(self, mock_communicate) -> None:
        """Test audio generation with custom rate."""
        provider = EdgeTTSProvider()

        await provider.generate_audio(
            "Fast speech",
            AudioGenerationOptions(language="en", rate=1.5),
        )

        mock_communicate.assert_called_once()
        call_kwargs = mock_communicate.call_args[1]
        assert call_kwargs["rate"] == "+50%"

    @pytest.mark.asyncio
    async def test_generate_audio_with_pitch(self, mock_communicate) -> None:
        """Test audio generation with custom pitch."""
        provider = EdgeTTSProvider()

        await provider.generate_audio(
            "High pitch",
            AudioGenerationOptions(language="en", pitch=1.5),
        )

        mock_communicate.assert_called_once()
        call_kwargs = mock_communicate.call_args[1]
        assert call_kwargs["pitch"] == "+50Hz"

    @pytest.mark.asyncio
    async def test_generate_audio_unsupported_language(self) -> None:
        """Test generate_audio raises error for unsupported language."""
        provider = EdgeTTSProvider()

        with pytest.raises(TTSUnsupportedLanguageError) as exc_info:
            await provider.generate_audio(
                "Bonjour",
                AudioGenerationOptions(language="fr"),
            )

        assert "fr" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_generate_audio_empty_result(self) -> None:
        """Test generate_audio raises error for empty audio data."""
        with patch("app.services.tts.providers.edge.edge_tts.Communicate") as mock:
            instance = MagicMock()
            mock.return_value = instance

            # Return empty stream
            async def empty_stream():
                if False:
                    yield {}  # Make it an async generator

            instance.stream = empty_stream

            provider = EdgeTTSProvider()

            with pytest.raises(TTSAudioGenerationError) as exc_info:
                await provider.generate_audio("Test", AudioGenerationOptions(language="en"))

            assert "empty" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_generate_audio_connection_error(self) -> None:
        """Test generate_audio wraps connection errors."""
        with patch("app.services.tts.providers.edge.edge_tts.Communicate") as mock:
            mock.side_effect = Exception("Connection refused")

            provider = EdgeTTSProvider()

            with pytest.raises(TTSConnectionError):
                await provider.generate_audio("Test", AudioGenerationOptions(language="en"))


class TestGenerateAudioBatch:
    """Tests for generate_audio_batch method."""

    @pytest.fixture
    def mock_communicate_batch(self):
        """Create a mock for batch processing."""
        with patch("app.services.tts.providers.edge.edge_tts.Communicate") as mock:
            instance = MagicMock()
            mock.return_value = instance

            async def mock_stream():
                yield {"type": "audio", "data": b"audio_data"}

            instance.stream = mock_stream
            yield mock

    @pytest.mark.asyncio
    async def test_batch_empty_list(self) -> None:
        """Test batch generation with empty list."""
        provider = EdgeTTSProvider()

        result = await provider.generate_audio_batch([])

        assert result.results == []
        assert result.success_count == 0
        assert result.failure_count == 0
        assert result.provider == "edge"

    @pytest.mark.asyncio
    async def test_batch_single_item(self, mock_communicate_batch) -> None:
        """Test batch generation with single item."""
        provider = EdgeTTSProvider()

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
    async def test_batch_multiple_items(self, mock_communicate_batch) -> None:
        """Test batch generation with multiple items."""
        provider = EdgeTTSProvider()

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
    async def test_batch_partial_failure(self) -> None:
        """Test batch handles partial failures gracefully."""
        call_count = 0

        async def failing_stream():
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                raise Exception("Simulated failure")
            yield {"type": "audio", "data": b"audio_data"}

        with patch("app.services.tts.providers.edge.edge_tts.Communicate") as mock:
            instance = MagicMock()
            mock.return_value = instance
            instance.stream = failing_stream

            provider = EdgeTTSProvider()

            items = [
                BatchAudioItem(text="One", options=AudioGenerationOptions(language="en")),
                BatchAudioItem(text="Two", options=AudioGenerationOptions(language="en")),
                BatchAudioItem(text="Three", options=AudioGenerationOptions(language="en")),
            ]

            result = await provider.generate_audio_batch(items)

            # Should have 2 successes and 1 failure
            assert result.success_count == 2
            assert result.failure_count == 1
            assert len(result.results) == 2

    @pytest.mark.asyncio
    async def test_batch_different_languages(self, mock_communicate_batch) -> None:
        """Test batch with items in different languages."""
        provider = EdgeTTSProvider()

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


class TestDefaultVoiceSelection:
    """Tests for default voice selection."""

    def test_default_voice_english(self) -> None:
        """Test default voice for English."""
        provider = EdgeTTSProvider()
        voice = provider._get_default_voice("en")
        assert voice == "en-US-JennyNeural"

    def test_default_voice_english_us(self) -> None:
        """Test default voice for en-US."""
        provider = EdgeTTSProvider()
        voice = provider._get_default_voice("en-US")
        assert voice == "en-US-JennyNeural"

    def test_default_voice_english_gb(self) -> None:
        """Test default voice for en-GB."""
        provider = EdgeTTSProvider()
        voice = provider._get_default_voice("en-GB")
        assert voice == "en-GB-SoniaNeural"

    def test_default_voice_turkish(self) -> None:
        """Test default voice for Turkish."""
        provider = EdgeTTSProvider()
        voice = provider._get_default_voice("tr")
        assert voice == "tr-TR-EmelNeural"

    def test_default_voice_unsupported(self) -> None:
        """Test default voice for unsupported language raises error."""
        provider = EdgeTTSProvider()

        with pytest.raises(TTSUnsupportedLanguageError):
            provider._get_default_voice("fr")


class TestManagerIntegration:
    """Tests for EdgeTTSProvider integration with TTSManager."""

    def test_provider_registration(self) -> None:
        """Test EdgeTTSProvider can be registered with TTSManager."""
        from app.services.tts.base import TTSProviderType
        from app.services.tts.manager import TTSManager

        manager = TTSManager()
        provider = EdgeTTSProvider()

        manager.register_provider(TTSProviderType.EDGE, provider)

        assert manager.get_provider(TTSProviderType.EDGE) is provider

    def test_create_default_manager_includes_edge(self) -> None:
        """Test create_default_manager registers EdgeTTSProvider."""
        from app.services.tts.manager import create_default_manager

        manager = create_default_manager()
        providers = manager.get_available_providers()

        assert len(providers) >= 1
        assert any(p.get_name() == "edge" for p in providers)

    def test_manager_is_available_with_edge(self) -> None:
        """Test manager reports available when Edge is registered."""
        from app.services.tts.manager import create_default_manager

        manager = create_default_manager()
        assert manager.is_available() is True
