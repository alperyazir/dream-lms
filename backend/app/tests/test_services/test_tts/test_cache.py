"""Tests for TTS audio cache service."""

import time
from unittest.mock import patch

import pytest

from app.services.tts.base import AudioFormat
from app.services.tts.cache import (
    AudioCache,
    AudioCacheKey,
    get_audio_cache,
    reset_audio_cache,
)


class TestAudioCacheKey:
    """Tests for AudioCacheKey model."""

    def test_basic_creation(self) -> None:
        """Test basic AudioCacheKey creation."""
        key = AudioCacheKey(
            text_hash="abc123",
            language="en",
            voice="en-US-JennyNeural",
            format=AudioFormat.MP3,
        )

        assert key.text_hash == "abc123"
        assert key.language == "en"
        assert key.voice == "en-US-JennyNeural"
        assert key.format == AudioFormat.MP3

    def test_to_string(self) -> None:
        """Test converting key to string."""
        key = AudioCacheKey(
            text_hash="abc123",
            language="en",
            voice="jenny",
            format=AudioFormat.MP3,
        )

        assert key.to_string() == "abc123:en:jenny:mp3"

    def test_from_string(self) -> None:
        """Test parsing key from string."""
        key = AudioCacheKey.from_string("abc123:tr:ahmet:wav")

        assert key.text_hash == "abc123"
        assert key.language == "tr"
        assert key.voice == "ahmet"
        assert key.format == AudioFormat.WAV

    def test_from_string_invalid(self) -> None:
        """Test parsing invalid string raises error."""
        with pytest.raises(ValueError):
            AudioCacheKey.from_string("invalid")

        with pytest.raises(ValueError):
            AudioCacheKey.from_string("a:b:c")  # Missing format

    def test_roundtrip(self) -> None:
        """Test key survives string roundtrip."""
        original = AudioCacheKey(
            text_hash="xyz789",
            language="de",
            voice="de-DE-Neural",
            format=AudioFormat.OGG,
        )

        key_str = original.to_string()
        parsed = AudioCacheKey.from_string(key_str)

        assert parsed.text_hash == original.text_hash
        assert parsed.language == original.language
        assert parsed.voice == original.voice
        assert parsed.format == original.format


class TestAudioCache:
    """Tests for AudioCache class."""

    def test_initialization(self) -> None:
        """Test cache initialization with default TTL."""
        cache = AudioCache(default_ttl_hours=24)

        assert cache.size == 0
        assert cache.hit_count == 0
        assert cache.miss_count == 0

    def test_get_cache_key(self) -> None:
        """Test get_cache_key generates consistent keys."""
        cache = AudioCache()

        key1 = cache.get_cache_key("Hello", "en", "jenny", AudioFormat.MP3)
        key2 = cache.get_cache_key("Hello", "en", "jenny", AudioFormat.MP3)

        assert key1.to_string() == key2.to_string()

    def test_get_cache_key_normalizes_text(self) -> None:
        """Test get_cache_key normalizes text (strip, lowercase)."""
        cache = AudioCache()

        key1 = cache.get_cache_key("Hello", "en", "jenny", AudioFormat.MP3)
        key2 = cache.get_cache_key("  HELLO  ", "en", "jenny", AudioFormat.MP3)

        assert key1.text_hash == key2.text_hash

    def test_get_cache_key_different_for_different_params(self) -> None:
        """Test different parameters produce different keys."""
        cache = AudioCache()

        key1 = cache.get_cache_key("Hello", "en", "jenny", AudioFormat.MP3)
        key2 = cache.get_cache_key("Hello", "tr", "jenny", AudioFormat.MP3)
        key3 = cache.get_cache_key("Hello", "en", "ahmet", AudioFormat.MP3)
        key4 = cache.get_cache_key("Hello", "en", "jenny", AudioFormat.WAV)

        keys = [key1.to_string(), key2.to_string(), key3.to_string(), key4.to_string()]
        assert len(set(keys)) == 4  # All unique

    def test_set_and_get(self) -> None:
        """Test basic set and get operations."""
        cache = AudioCache()
        key = cache.get_cache_key("Test", "en", "jenny", AudioFormat.MP3)
        audio_data = b"fake audio content"

        cache.set(key, audio_data)
        result = cache.get(key)

        assert result == audio_data
        assert cache.size == 1

    def test_get_miss(self) -> None:
        """Test get returns None for missing key."""
        cache = AudioCache()
        key = cache.get_cache_key("Not cached", "en", "jenny", AudioFormat.MP3)

        result = cache.get(key)

        assert result is None
        assert cache.miss_count == 1

    def test_get_hit(self) -> None:
        """Test get increments hit count."""
        cache = AudioCache()
        key = cache.get_cache_key("Test", "en", "jenny", AudioFormat.MP3)
        cache.set(key, b"audio")

        cache.get(key)
        cache.get(key)

        assert cache.hit_count == 2

    def test_delete(self) -> None:
        """Test delete removes entry."""
        cache = AudioCache()
        key = cache.get_cache_key("Test", "en", "jenny", AudioFormat.MP3)
        cache.set(key, b"audio")

        result = cache.delete(key)

        assert result is True
        assert cache.get(key) is None
        assert cache.size == 0

    def test_delete_missing(self) -> None:
        """Test delete returns False for missing key."""
        cache = AudioCache()
        key = cache.get_cache_key("Not there", "en", "jenny", AudioFormat.MP3)

        result = cache.delete(key)

        assert result is False

    def test_clear(self) -> None:
        """Test clear removes all entries."""
        cache = AudioCache()

        # Add multiple entries
        for i in range(5):
            key = cache.get_cache_key(f"Text {i}", "en", "jenny", AudioFormat.MP3)
            cache.set(key, f"audio {i}".encode())

        assert cache.size == 5

        count = cache.clear()

        assert count == 5
        assert cache.size == 0
        assert cache.hit_count == 0
        assert cache.miss_count == 0

    def test_ttl_expiration(self) -> None:
        """Test entries expire after TTL."""
        # Use very short TTL for testing (1 second = 1/3600 hours)
        cache = AudioCache(default_ttl_hours=1)
        key = cache.get_cache_key("Test", "en", "jenny", AudioFormat.MP3)

        # Set with 1 second TTL
        cache.set(key, b"audio", ttl_seconds=1)
        assert cache.get(key) == b"audio"

        # Wait for expiration
        time.sleep(1.1)
        assert cache.get(key) is None
        assert cache.miss_count == 1

    def test_cleanup_expired(self) -> None:
        """Test cleanup_expired removes expired entries."""
        cache = AudioCache()

        # Add entry with very short TTL
        key1 = cache.get_cache_key("Expire soon", "en", "jenny", AudioFormat.MP3)
        cache.set(key1, b"audio1", ttl_seconds=1)

        # Add entry with long TTL
        key2 = cache.get_cache_key("Stay longer", "en", "jenny", AudioFormat.MP3)
        cache.set(key2, b"audio2", ttl_seconds=3600)

        assert cache.size == 2

        # Wait for first to expire
        time.sleep(1.1)
        removed = cache.cleanup_expired()

        assert removed == 1
        assert cache.size == 1
        assert cache.get(key1) is None
        assert cache.get(key2) == b"audio2"

    def test_hit_rate(self) -> None:
        """Test hit_rate calculation."""
        cache = AudioCache()
        key = cache.get_cache_key("Test", "en", "jenny", AudioFormat.MP3)
        cache.set(key, b"audio")

        # Miss (key not in cache initially for different text)
        other_key = cache.get_cache_key("Other", "en", "jenny", AudioFormat.MP3)
        cache.get(other_key)  # miss

        # Hits
        cache.get(key)  # hit
        cache.get(key)  # hit

        # 2 hits, 1 miss = 2/3 hit rate
        assert abs(cache.hit_rate - 2 / 3) < 0.01

    def test_hit_rate_empty(self) -> None:
        """Test hit_rate is 0 with no accesses."""
        cache = AudioCache()
        assert cache.hit_rate == 0.0

    def test_get_stats(self) -> None:
        """Test get_stats returns expected dict."""
        cache = AudioCache()
        key = cache.get_cache_key("Test", "en", "jenny", AudioFormat.MP3)
        cache.set(key, b"audio")
        cache.get(key)

        stats = cache.get_stats()

        assert stats["size"] == 1
        assert stats["hit_count"] == 1
        assert stats["miss_count"] == 0
        assert stats["hit_rate"] == 1.0


class TestGlobalCache:
    """Tests for global cache accessor functions."""

    def setup_method(self) -> None:
        """Reset global cache before each test."""
        reset_audio_cache()

    def test_get_audio_cache(self) -> None:
        """Test get_audio_cache returns AudioCache instance."""
        cache = get_audio_cache()
        assert isinstance(cache, AudioCache)

    def test_get_audio_cache_singleton(self) -> None:
        """Test get_audio_cache returns same instance."""
        cache1 = get_audio_cache()
        cache2 = get_audio_cache()
        assert cache1 is cache2

    def test_reset_audio_cache(self) -> None:
        """Test reset_audio_cache clears and resets."""
        cache1 = get_audio_cache()
        key = cache1.get_cache_key("Test", "en", "jenny", AudioFormat.MP3)
        cache1.set(key, b"audio")

        reset_audio_cache()
        cache2 = get_audio_cache()

        # Should be new instance
        assert cache1 is not cache2
        assert cache2.size == 0

    def test_custom_ttl(self) -> None:
        """Test get_audio_cache accepts custom TTL."""
        cache = get_audio_cache(ttl_hours=48)
        assert isinstance(cache, AudioCache)


class TestCacheThreadSafety:
    """Basic thread safety tests for AudioCache."""

    def test_concurrent_set_get(self) -> None:
        """Test concurrent set and get operations."""
        import threading

        cache = AudioCache()
        errors: list[Exception] = []

        def worker(worker_id: int) -> None:
            try:
                for i in range(100):
                    key = cache.get_cache_key(
                        f"Text {worker_id}-{i}",
                        "en",
                        "jenny",
                        AudioFormat.MP3,
                    )
                    cache.set(key, f"audio {worker_id}-{i}".encode())
                    cache.get(key)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        assert cache.size == 500  # 5 workers * 100 entries each
