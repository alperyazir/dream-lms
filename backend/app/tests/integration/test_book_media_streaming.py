"""
Integration tests for Book Media Streaming.

These tests communicate with an actual Dream Central Storage instance
running at localhost:8081 and verify streaming with Range support.

Run with: pytest -v -m integration
Skip with: pytest -v -m "not integration"
"""

import pytest
import pytest_asyncio

from app.services.dream_storage_client import (
    DreamCentralStorageClient,
    DreamStorageNotFoundError,
)

# Mark all tests in this module as integration tests
pytestmark = pytest.mark.integration


@pytest_asyncio.fixture
async def client():
    """Provide a real DreamCentralStorageClient instance."""
    client_instance = DreamCentralStorageClient()
    yield client_instance
    await client_instance.close()


@pytest_asyncio.fixture
async def test_book(client):
    """Get a real book from DCS for testing."""
    books = await client.get_books()

    if len(books) == 0:
        pytest.skip("No books available in Dream Central Storage for testing")

    return books[0]


@pytest.mark.asyncio
async def test_get_asset_size_returns_correct_size(client, test_book):
    """Test that get_asset_size returns correct file size."""
    # Try to get size of config.json (should always exist)
    try:
        size = await client.get_asset_size(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="config.json",
        )

        # Size should be a positive integer
        assert isinstance(size, int)
        assert size > 0
    except DreamStorageNotFoundError:
        pytest.skip("config.json not found in test book")


@pytest.mark.asyncio
async def test_get_asset_size_raises_not_found(client, test_book):
    """Test that get_asset_size raises DreamStorageNotFoundError for missing files."""
    with pytest.raises(DreamStorageNotFoundError):
        await client.get_asset_size(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="nonexistent/file.mp3",
        )


@pytest.mark.asyncio
async def test_stream_asset_full_file(client, test_book):
    """Test streaming a complete file without Range header."""
    try:
        chunks = []
        async for chunk in client.stream_asset(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="config.json",
        ):
            chunks.append(chunk)

        # Should have received at least one chunk
        assert len(chunks) > 0

        # Combine chunks and verify content
        full_content = b"".join(chunks)
        assert len(full_content) > 0

        # Config should be valid JSON (starts with { or [)
        assert full_content[0:1] in [b"{", b"["]
    except DreamStorageNotFoundError:
        pytest.skip("config.json not found in test book")


@pytest.mark.asyncio
async def test_stream_asset_with_range(client, test_book):
    """Test streaming a partial file with Range header."""
    try:
        # Request only first 100 bytes
        chunks = []
        async for chunk in client.stream_asset(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="config.json",
            start=0,
            end=99,
        ):
            chunks.append(chunk)

        # Combine chunks
        partial_content = b"".join(chunks)

        # Should have received exactly 100 bytes
        assert len(partial_content) == 100

        # Now request full file and compare first 100 bytes
        full_chunks = []
        async for chunk in client.stream_asset(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="config.json",
        ):
            full_chunks.append(chunk)

        full_content = b"".join(full_chunks)

        # First 100 bytes should match
        assert partial_content == full_content[:100]
    except DreamStorageNotFoundError:
        pytest.skip("config.json not found in test book")


@pytest.mark.asyncio
async def test_stream_asset_middle_range(client, test_book):
    """Test streaming from the middle of a file."""
    try:
        # First get the file size
        file_size = await client.get_asset_size(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="config.json",
        )

        if file_size < 200:
            pytest.skip("config.json too small for middle range test")

        # Request bytes 50-149 (100 bytes from middle)
        chunks = []
        async for chunk in client.stream_asset(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="config.json",
            start=50,
            end=149,
        ):
            chunks.append(chunk)

        partial_content = b"".join(chunks)
        assert len(partial_content) == 100

        # Compare with full file
        full_chunks = []
        async for chunk in client.stream_asset(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="config.json",
        ):
            full_chunks.append(chunk)

        full_content = b"".join(full_chunks)
        assert partial_content == full_content[50:150]
    except DreamStorageNotFoundError:
        pytest.skip("config.json not found in test book")


@pytest.mark.asyncio
async def test_stream_audio_file(client, test_book):
    """Test streaming an actual audio file if available."""
    try:
        # Try to find an audio file
        contents = await client.list_book_contents(test_book.publisher, test_book.book_name)

        audio_files = [f for f in contents if f.endswith(".mp3")]
        if not audio_files:
            pytest.skip("No audio files available in test book")

        audio_path = audio_files[0]

        # Get size
        file_size = await client.get_asset_size(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path=audio_path,
        )

        assert file_size > 0

        # Stream first 1KB
        chunks = []
        async for chunk in client.stream_asset(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path=audio_path,
            start=0,
            end=1023,
        ):
            chunks.append(chunk)

        audio_chunk = b"".join(chunks)
        assert len(audio_chunk) == 1024

        # MP3 files start with ID3 tag or sync word
        # ID3 starts with "ID3", sync word is 0xFF 0xFB (or similar)
        is_mp3 = audio_chunk.startswith(b"ID3") or audio_chunk[0:1] == b"\xff"
        assert is_mp3, "Audio data doesn't look like an MP3 file"
    except DreamStorageNotFoundError:
        pytest.skip("Audio file not found in test book")


@pytest.mark.asyncio
async def test_stream_asset_raises_not_found(client, test_book):
    """Test that streaming a missing file raises DreamStorageNotFoundError."""
    with pytest.raises(DreamStorageNotFoundError):
        async for _ in client.stream_asset(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="nonexistent/audio.mp3",
        ):
            pass


@pytest.mark.asyncio
async def test_streaming_consistency_with_download(client, test_book):
    """Test that streaming produces the same result as direct download."""
    try:
        # Download file directly
        downloaded = await client.download_asset(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="config.json",
        )

        # Stream file
        streamed_chunks = []
        async for chunk in client.stream_asset(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="config.json",
        ):
            streamed_chunks.append(chunk)

        streamed = b"".join(streamed_chunks)

        # Should be identical
        assert downloaded == streamed
    except DreamStorageNotFoundError:
        pytest.skip("config.json not found in test book")


@pytest.mark.asyncio
async def test_seek_functionality(client, test_book):
    """Test seeking by making multiple Range requests."""
    try:
        file_size = await client.get_asset_size(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="config.json",
        )

        if file_size < 300:
            pytest.skip("config.json too small for seek test")

        # Simulate seeking: read bytes 0-99, then "seek" to 200-299
        first_chunks = []
        async for chunk in client.stream_asset(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="config.json",
            start=0,
            end=99,
        ):
            first_chunks.append(chunk)
        first_segment = b"".join(first_chunks)

        # "Seek" to position 200
        second_chunks = []
        async for chunk in client.stream_asset(
            publisher=test_book.publisher,
            book_name=test_book.book_name,
            asset_path="config.json",
            start=200,
            end=299,
        ):
            second_chunks.append(chunk)
        second_segment = b"".join(second_chunks)

        # Verify both segments have correct length
        assert len(first_segment) == 100
        assert len(second_segment) == 100

        # Verify they're different (not the same data)
        assert first_segment != second_segment
    except DreamStorageNotFoundError:
        pytest.skip("config.json not found in test book")
