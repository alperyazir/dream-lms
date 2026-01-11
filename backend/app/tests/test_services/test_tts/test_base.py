"""Tests for TTS base classes and types."""

import pytest

from app.services.tts.base import (
    AudioFormat,
    AudioGenerationOptions,
    AudioResult,
    BatchAudioItem,
    BatchAudioResult,
    TTSProviderType,
    Voice,
)


class TestTTSProviderType:
    """Tests for TTSProviderType enum."""

    def test_enum_values(self) -> None:
        """Test enum has expected values."""
        assert TTSProviderType.EDGE.value == "edge"
        assert TTSProviderType.AZURE.value == "azure"
        assert TTSProviderType.GOOGLE.value == "google"

    def test_enum_from_string(self) -> None:
        """Test creating enum from string."""
        assert TTSProviderType("edge") == TTSProviderType.EDGE
        assert TTSProviderType("azure") == TTSProviderType.AZURE
        assert TTSProviderType("google") == TTSProviderType.GOOGLE

    def test_enum_invalid_value(self) -> None:
        """Test invalid enum value raises error."""
        with pytest.raises(ValueError):
            TTSProviderType("invalid")


class TestAudioFormat:
    """Tests for AudioFormat enum."""

    def test_enum_values(self) -> None:
        """Test enum has expected values."""
        assert AudioFormat.MP3.value == "mp3"
        assert AudioFormat.WAV.value == "wav"
        assert AudioFormat.OGG.value == "ogg"

    def test_enum_from_string(self) -> None:
        """Test creating enum from string."""
        assert AudioFormat("mp3") == AudioFormat.MP3
        assert AudioFormat("wav") == AudioFormat.WAV
        assert AudioFormat("ogg") == AudioFormat.OGG


class TestVoice:
    """Tests for Voice model."""

    def test_basic_creation(self) -> None:
        """Test basic Voice creation."""
        voice = Voice(
            id="en-US-JennyNeural",
            name="Jenny",
            language="en-US",
            gender="female",
        )

        assert voice.id == "en-US-JennyNeural"
        assert voice.name == "Jenny"
        assert voice.language == "en-US"
        assert voice.gender == "female"
        assert voice.style is None

    def test_with_style(self) -> None:
        """Test Voice with style specified."""
        voice = Voice(
            id="en-US-JennyNeural",
            name="Jenny",
            language="en-US",
            gender="female",
            style="neural",
        )

        assert voice.style == "neural"

    def test_serialization(self) -> None:
        """Test Voice serialization to dict."""
        voice = Voice(
            id="tr-TR-AhmetNeural",
            name="Ahmet",
            language="tr-TR",
            gender="male",
            style="neural",
        )

        data = voice.model_dump()
        assert data["id"] == "tr-TR-AhmetNeural"
        assert data["name"] == "Ahmet"
        assert data["language"] == "tr-TR"
        assert data["gender"] == "male"
        assert data["style"] == "neural"


class TestAudioGenerationOptions:
    """Tests for AudioGenerationOptions model."""

    def test_default_values(self) -> None:
        """Test AudioGenerationOptions has sensible defaults."""
        options = AudioGenerationOptions()

        assert options.language == "en"
        assert options.voice is None
        assert options.format == AudioFormat.MP3
        assert options.rate == 1.0
        assert options.pitch == 1.0

    def test_custom_values(self) -> None:
        """Test AudioGenerationOptions with custom values."""
        options = AudioGenerationOptions(
            language="tr",
            voice="tr-TR-AhmetNeural",
            format=AudioFormat.WAV,
            rate=1.5,
            pitch=0.8,
        )

        assert options.language == "tr"
        assert options.voice == "tr-TR-AhmetNeural"
        assert options.format == AudioFormat.WAV
        assert options.rate == 1.5
        assert options.pitch == 0.8

    def test_rate_validation(self) -> None:
        """Test rate must be between 0.5 and 2.0."""
        # Valid boundaries
        AudioGenerationOptions(rate=0.5)
        AudioGenerationOptions(rate=2.0)

        # Invalid values
        with pytest.raises(ValueError):
            AudioGenerationOptions(rate=0.4)
        with pytest.raises(ValueError):
            AudioGenerationOptions(rate=2.1)

    def test_pitch_validation(self) -> None:
        """Test pitch must be between 0.5 and 2.0."""
        # Valid boundaries
        AudioGenerationOptions(pitch=0.5)
        AudioGenerationOptions(pitch=2.0)

        # Invalid values
        with pytest.raises(ValueError):
            AudioGenerationOptions(pitch=0.4)
        with pytest.raises(ValueError):
            AudioGenerationOptions(pitch=2.1)


class TestAudioResult:
    """Tests for AudioResult model."""

    def test_basic_creation(self) -> None:
        """Test basic AudioResult creation."""
        result = AudioResult(
            audio_data=b"fake audio data",
            format=AudioFormat.MP3,
            duration_ms=1500,
            voice_used="en-US-JennyNeural",
            provider="edge",
            latency_ms=250,
        )

        assert result.audio_data == b"fake audio data"
        assert result.format == AudioFormat.MP3
        assert result.duration_ms == 1500
        assert result.voice_used == "en-US-JennyNeural"
        assert result.provider == "edge"
        assert result.latency_ms == 250
        assert result.cached is False

    def test_cached_result(self) -> None:
        """Test AudioResult with cached=True."""
        result = AudioResult(
            audio_data=b"cached audio",
            format=AudioFormat.MP3,
            duration_ms=1000,
            voice_used="en-US-JennyNeural",
            provider="cache",
            latency_ms=0,
            cached=True,
        )

        assert result.cached is True
        assert result.provider == "cache"

    def test_duration_ms_validation(self) -> None:
        """Test duration_ms must be non-negative."""
        AudioResult(
            audio_data=b"test",
            format=AudioFormat.MP3,
            duration_ms=0,
            voice_used="test",
            provider="test",
            latency_ms=0,
        )

        with pytest.raises(ValueError):
            AudioResult(
                audio_data=b"test",
                format=AudioFormat.MP3,
                duration_ms=-1,
                voice_used="test",
                provider="test",
                latency_ms=0,
            )

    def test_latency_ms_validation(self) -> None:
        """Test latency_ms must be non-negative."""
        with pytest.raises(ValueError):
            AudioResult(
                audio_data=b"test",
                format=AudioFormat.MP3,
                duration_ms=100,
                voice_used="test",
                provider="test",
                latency_ms=-1,
            )


class TestBatchAudioItem:
    """Tests for BatchAudioItem model."""

    def test_basic_creation(self) -> None:
        """Test basic BatchAudioItem creation."""
        item = BatchAudioItem(text="Hello")

        assert item.text == "Hello"
        assert item.options.language == "en"  # Default

    def test_with_custom_options(self) -> None:
        """Test BatchAudioItem with custom options."""
        options = AudioGenerationOptions(language="tr", rate=1.2)
        item = BatchAudioItem(text="Merhaba", options=options)

        assert item.text == "Merhaba"
        assert item.options.language == "tr"
        assert item.options.rate == 1.2


class TestBatchAudioResult:
    """Tests for BatchAudioResult model."""

    def test_basic_creation(self) -> None:
        """Test basic BatchAudioResult creation."""
        result = BatchAudioResult(
            results=[],
            total_duration_ms=0,
            total_latency_ms=100,
            provider="edge",
            success_count=0,
            failure_count=0,
        )

        assert result.results == []
        assert result.total_duration_ms == 0
        assert result.total_latency_ms == 100
        assert result.provider == "edge"
        assert result.success_count == 0
        assert result.failure_count == 0

    def test_with_results(self) -> None:
        """Test BatchAudioResult with actual results."""
        audio_result = AudioResult(
            audio_data=b"audio",
            format=AudioFormat.MP3,
            duration_ms=1000,
            voice_used="test",
            provider="edge",
            latency_ms=100,
        )
        result = BatchAudioResult(
            results=[audio_result],
            total_duration_ms=1000,
            total_latency_ms=150,
            provider="edge",
            success_count=1,
            failure_count=0,
        )

        assert len(result.results) == 1
        assert result.success_count == 1
        assert result.total_duration_ms == 1000
