"""
Unit tests for Book Media Streaming Routes.

Tests Range header parsing, response headers, MIME type detection,
and streaming behavior with mocked DCS client.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, status

from app.api.routes.book_media import (
    MEDIA_MIME_TYPES,
    _get_media_content_type,
    _parse_range_header,
)

# ============================================================================
# Unit Tests for Helper Functions
# ============================================================================


class TestGetMediaContentType:
    """Tests for _get_media_content_type function."""

    def test_mp3_returns_audio_mpeg(self):
        """Test that .mp3 returns audio/mpeg."""
        assert _get_media_content_type("audio/test.mp3") == "audio/mpeg"

    def test_mp4_returns_video_mp4(self):
        """Test that .mp4 returns video/mp4."""
        assert _get_media_content_type("videos/intro.mp4") == "video/mp4"

    def test_webm_returns_video_webm(self):
        """Test that .webm returns video/webm."""
        assert _get_media_content_type("videos/test.webm") == "video/webm"

    def test_ogg_returns_audio_ogg(self):
        """Test that .ogg returns audio/ogg."""
        assert _get_media_content_type("audio/test.ogg") == "audio/ogg"

    def test_wav_returns_audio_wav(self):
        """Test that .wav returns audio/wav."""
        assert _get_media_content_type("audio/test.wav") == "audio/wav"

    def test_m4a_returns_audio_mp4(self):
        """Test that .m4a returns audio/mp4."""
        assert _get_media_content_type("audio/test.m4a") == "audio/mp4"

    def test_aac_returns_audio_aac(self):
        """Test that .aac returns audio/aac."""
        assert _get_media_content_type("audio/test.aac") == "audio/aac"

    def test_srt_returns_text_plain(self):
        """Test that .srt returns text/plain."""
        assert _get_media_content_type("subtitles/test.srt") == "text/plain"

    def test_vtt_returns_text_vtt(self):
        """Test that .vtt returns text/vtt."""
        assert _get_media_content_type("subtitles/test.vtt") == "text/vtt"

    def test_case_insensitive(self):
        """Test that extension matching is case-insensitive."""
        assert _get_media_content_type("audio/TEST.MP3") == "audio/mpeg"
        assert _get_media_content_type("videos/TEST.MP4") == "video/mp4"

    def test_unknown_returns_octet_stream(self):
        """Test that unknown extensions fall back to application/octet-stream."""
        # Use a truly unknown extension that mimetypes won't recognize
        assert _get_media_content_type("file.unknownext123") == "application/octet-stream"


class TestParseRangeHeader:
    """Tests for _parse_range_header function."""

    def test_parse_full_range(self):
        """Test parsing 'bytes=0-1023' format."""
        start, end = _parse_range_header("bytes=0-1023", file_size=10000)
        assert start == 0
        assert end == 1023

    def test_parse_open_end_range(self):
        """Test parsing 'bytes=1024-' format (from position to end)."""
        start, end = _parse_range_header("bytes=1024-", file_size=10000)
        assert start == 1024
        assert end == 9999

    def test_parse_suffix_range(self):
        """Test parsing 'bytes=-500' format (last 500 bytes)."""
        start, end = _parse_range_header("bytes=-500", file_size=10000)
        assert start == 9500
        assert end == 9999

    def test_parse_first_byte(self):
        """Test parsing 'bytes=0-0' format (first byte only)."""
        start, end = _parse_range_header("bytes=0-0", file_size=10000)
        assert start == 0
        assert end == 0

    def test_invalid_format_raises_416(self):
        """Test that invalid Range format returns 416."""
        with pytest.raises(HTTPException) as exc_info:
            _parse_range_header("invalid-range", file_size=10000)
        assert exc_info.value.status_code == status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE
        assert "Invalid Range header format" in exc_info.value.detail

    def test_empty_range_raises_416(self):
        """Test that 'bytes=-' (empty range) returns 416."""
        with pytest.raises(HTTPException) as exc_info:
            _parse_range_header("bytes=-", file_size=10000)
        assert exc_info.value.status_code == status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE

    def test_start_exceeds_file_size_raises_416(self):
        """Test that start > file_size returns 416."""
        with pytest.raises(HTTPException) as exc_info:
            _parse_range_header("bytes=20000-", file_size=10000)
        assert exc_info.value.status_code == status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE
        assert "Range Not Satisfiable" in exc_info.value.detail

    def test_end_exceeds_file_size_raises_416(self):
        """Test that end >= file_size returns 416."""
        with pytest.raises(HTTPException) as exc_info:
            _parse_range_header("bytes=0-20000", file_size=10000)
        assert exc_info.value.status_code == status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE

    def test_start_greater_than_end_raises_416(self):
        """Test that start > end returns 416."""
        with pytest.raises(HTTPException) as exc_info:
            _parse_range_header("bytes=500-100", file_size=10000)
        assert exc_info.value.status_code == status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE

    def test_negative_start_raises_416(self):
        """Test that suffix range exceeding file size is handled."""
        # bytes=-20000 on a 10000 byte file would make start negative
        with pytest.raises(HTTPException) as exc_info:
            _parse_range_header("bytes=-20000", file_size=10000)
        assert exc_info.value.status_code == status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE

    def test_content_range_header_in_error(self):
        """Test that 416 errors include Content-Range header."""
        with pytest.raises(HTTPException) as exc_info:
            _parse_range_header("bytes=20000-", file_size=10000)
        assert "Content-Range" in exc_info.value.headers
        assert exc_info.value.headers["Content-Range"] == "bytes */10000"


class TestMediaMimeTypes:
    """Tests for MEDIA_MIME_TYPES constant."""

    def test_all_required_types_present(self):
        """Test that all required MIME types are defined."""
        required_extensions = [".mp3", ".mp4", ".webm", ".ogg", ".wav", ".srt"]
        for ext in required_extensions:
            assert ext in MEDIA_MIME_TYPES, f"Missing MIME type for {ext}"

    def test_mime_types_are_valid(self):
        """Test that MIME types are properly formatted."""
        for ext, mime_type in MEDIA_MIME_TYPES.items():
            assert "/" in mime_type, f"Invalid MIME type format for {ext}: {mime_type}"
            category, subtype = mime_type.split("/", 1)
            assert category in ["audio", "video", "text"], f"Unexpected category for {ext}"


# ============================================================================
# Integration-style Tests for stream_media Endpoint
# ============================================================================


class TestStreamMediaEndpoint:
    """Tests for the stream_media endpoint (with mocks)."""

    @pytest.fixture
    def mock_book(self):
        """Create a mock Book object."""
        book = MagicMock()
        book.id = uuid.uuid4()
        book.publisher_name = "Universal ELT"
        book.book_name = "SwitchtoCLIL"
        return book

    @pytest.fixture
    def mock_user(self):
        """Create a mock User object."""
        user = MagicMock()
        user.id = uuid.uuid4()
        user.role = "admin"
        return user

    @pytest.fixture
    def mock_dcs_client(self):
        """Create a mock DCS client."""
        client = MagicMock()
        client.get_asset_size = AsyncMock(return_value=782836)

        async def mock_stream():
            yield b"chunk1"
            yield b"chunk2"

        client.stream_asset = MagicMock(return_value=mock_stream())
        return client

    @pytest.mark.asyncio
    async def test_range_request_returns_206(self, mock_book, mock_user, mock_dcs_client):
        """Test that Range requests return 206 Partial Content."""
        from app.api.routes.book_media import stream_media

        with patch("app.api.routes.book_media._check_book_access", return_value=mock_book), \
             patch("app.api.routes.book_media.get_dream_storage_client", return_value=mock_dcs_client), \
             patch("app.api.routes.book_media._validate_asset_path"):

            # Mock db session
            mock_db = MagicMock()

            response = await stream_media(
                book_id=mock_book.id,
                asset_path="audio/08.mp3",
                current_user=mock_user,
                db=mock_db,
                range_header="bytes=0-1023",
            )

            assert response.status_code == 206
            assert response.headers["Content-Range"] == "bytes 0-1023/782836"
            assert response.headers["Accept-Ranges"] == "bytes"
            assert response.headers["Content-Length"] == "1024"

    @pytest.mark.asyncio
    async def test_no_range_returns_200(self, mock_book, mock_user, mock_dcs_client):
        """Test that requests without Range header return 200 OK."""
        from app.api.routes.book_media import stream_media

        with patch("app.api.routes.book_media._check_book_access", return_value=mock_book), \
             patch("app.api.routes.book_media.get_dream_storage_client", return_value=mock_dcs_client), \
             patch("app.api.routes.book_media._validate_asset_path"):

            mock_db = MagicMock()

            response = await stream_media(
                book_id=mock_book.id,
                asset_path="audio/08.mp3",
                current_user=mock_user,
                db=mock_db,
                range_header=None,
            )

            assert response.status_code == 200
            assert response.headers["Accept-Ranges"] == "bytes"
            assert "Content-Range" not in response.headers

    @pytest.mark.asyncio
    async def test_correct_content_type_for_mp3(self, mock_book, mock_user, mock_dcs_client):
        """Test that mp3 files return audio/mpeg content type."""
        from app.api.routes.book_media import stream_media

        with patch("app.api.routes.book_media._check_book_access", return_value=mock_book), \
             patch("app.api.routes.book_media.get_dream_storage_client", return_value=mock_dcs_client), \
             patch("app.api.routes.book_media._validate_asset_path"):

            mock_db = MagicMock()

            response = await stream_media(
                book_id=mock_book.id,
                asset_path="audio/08.mp3",
                current_user=mock_user,
                db=mock_db,
                range_header=None,
            )

            assert response.media_type == "audio/mpeg"

    @pytest.mark.asyncio
    async def test_correct_content_type_for_mp4(self, mock_book, mock_user, mock_dcs_client):
        """Test that mp4 files return video/mp4 content type."""
        from app.api.routes.book_media import stream_media

        with patch("app.api.routes.book_media._check_book_access", return_value=mock_book), \
             patch("app.api.routes.book_media.get_dream_storage_client", return_value=mock_dcs_client), \
             patch("app.api.routes.book_media._validate_asset_path"):

            mock_db = MagicMock()

            response = await stream_media(
                book_id=mock_book.id,
                asset_path="videos/intro.mp4",
                current_user=mock_user,
                db=mock_db,
                range_header=None,
            )

            assert response.media_type == "video/mp4"

    @pytest.mark.asyncio
    async def test_not_found_returns_404(self, mock_book, mock_user):
        """Test that missing media returns 404."""
        from app.api.routes.book_media import stream_media
        from app.services.dream_storage_client import DreamStorageNotFoundError

        mock_client = MagicMock()
        mock_client.get_asset_size = AsyncMock(side_effect=DreamStorageNotFoundError("Not found"))

        with patch("app.api.routes.book_media._check_book_access", return_value=mock_book), \
             patch("app.api.routes.book_media.get_dream_storage_client", return_value=mock_client), \
             patch("app.api.routes.book_media._validate_asset_path"):

            mock_db = MagicMock()

            with pytest.raises(HTTPException) as exc_info:
                await stream_media(
                    book_id=mock_book.id,
                    asset_path="audio/missing.mp3",
                    current_user=mock_user,
                    db=mock_db,
                    range_header=None,
                )

            assert exc_info.value.status_code == 404
            assert "Media not found" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_dcs_error_returns_500(self, mock_book, mock_user):
        """Test that DCS errors return 500."""
        from app.api.routes.book_media import stream_media
        from app.services.dream_storage_client import DreamStorageError

        mock_client = MagicMock()
        mock_client.get_asset_size = AsyncMock(side_effect=DreamStorageError("Connection failed"))

        with patch("app.api.routes.book_media._check_book_access", return_value=mock_book), \
             patch("app.api.routes.book_media.get_dream_storage_client", return_value=mock_client), \
             patch("app.api.routes.book_media._validate_asset_path"):

            mock_db = MagicMock()

            with pytest.raises(HTTPException) as exc_info:
                await stream_media(
                    book_id=mock_book.id,
                    asset_path="audio/test.mp3",
                    current_user=mock_user,
                    db=mock_db,
                    range_header=None,
                )

            assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    async def test_cache_control_header_set(self, mock_book, mock_user, mock_dcs_client):
        """Test that Cache-Control header is set for caching."""
        from app.api.routes.book_media import stream_media

        with patch("app.api.routes.book_media._check_book_access", return_value=mock_book), \
             patch("app.api.routes.book_media.get_dream_storage_client", return_value=mock_dcs_client), \
             patch("app.api.routes.book_media._validate_asset_path"):

            mock_db = MagicMock()

            response = await stream_media(
                book_id=mock_book.id,
                asset_path="audio/08.mp3",
                current_user=mock_user,
                db=mock_db,
                range_header=None,
            )

            assert "Cache-Control" in response.headers
            assert "max-age=86400" in response.headers["Cache-Control"]
