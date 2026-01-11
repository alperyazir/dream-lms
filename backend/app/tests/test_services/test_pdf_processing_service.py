"""
Unit tests for PDF Processing Service (Story 27.15).

Tests cover:
- Text extraction from PDFs
- Text input processing
- Language detection
- Error handling for corrupted/encrypted PDFs
"""

import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, UploadFile

from app.services.pdf_processing_service import (
    MIN_EXTRACTION_LENGTH,
    PDFProcessingError,
    PDFProcessingService,
    get_pdf_processing_service,
)


@pytest.fixture
def pdf_service() -> PDFProcessingService:
    """Create a PDF processing service instance."""
    return PDFProcessingService()


@pytest.fixture
def mock_upload_file() -> MagicMock:
    """Create a mock UploadFile."""
    mock = MagicMock(spec=UploadFile)
    mock.content_type = "application/pdf"
    mock.filename = "test.pdf"
    return mock


class TestPDFProcessingService:
    """Tests for PDFProcessingService."""

    @pytest.mark.asyncio
    async def test_process_text_input_success(self, pdf_service: PDFProcessingService):
        """Test processing direct text input."""
        text = "This is a sample English text with enough words to process."

        result = await pdf_service.process_text_input(text)

        assert result.extracted_text == text.strip()
        assert result.word_count > 0
        assert result.source_type == "text"

    @pytest.mark.asyncio
    async def test_process_text_input_cleans_whitespace(
        self, pdf_service: PDFProcessingService
    ):
        """Test that text input is cleaned of excessive whitespace."""
        text = "This   has    multiple    spaces\n\n\n\nand newlines."

        result = await pdf_service.process_text_input(text)

        assert "   " not in result.extracted_text
        assert "\n\n\n" not in result.extracted_text

    @pytest.mark.asyncio
    async def test_process_text_input_detects_english(
        self, pdf_service: PDFProcessingService
    ):
        """Test language detection for English text."""
        text = (
            "This is a sample English text that should be detected as English. "
            "It contains multiple sentences to ensure proper detection."
        )

        result = await pdf_service.process_text_input(text)

        assert result.language == "en"

    @pytest.mark.asyncio
    async def test_process_text_input_empty_returns_empty(
        self, pdf_service: PDFProcessingService
    ):
        """Test processing empty text."""
        text = ""

        result = await pdf_service.process_text_input(text)

        assert result.extracted_text == ""
        assert result.word_count == 0
        assert result.language is None

    @pytest.mark.asyncio
    async def test_process_pdf_invalid_content_type(
        self, pdf_service: PDFProcessingService, mock_upload_file: MagicMock
    ):
        """Test that non-PDF files are rejected."""
        mock_upload_file.content_type = "text/plain"
        mock_upload_file.read = AsyncMock(return_value=b"not a pdf")
        mock_upload_file.seek = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await pdf_service.process_pdf(mock_upload_file)

        assert exc_info.value.status_code == 415
        assert "PDF" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_process_pdf_too_large(
        self, pdf_service: PDFProcessingService, mock_upload_file: MagicMock
    ):
        """Test that oversized PDFs are rejected."""
        # Create content larger than MAX_PDF_SIZE (50MB)
        large_content = b"x" * (51 * 1024 * 1024)
        mock_upload_file.read = AsyncMock(return_value=large_content)
        mock_upload_file.seek = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await pdf_service.process_pdf(mock_upload_file)

        assert exc_info.value.status_code == 413
        assert "large" in exc_info.value.detail.lower()


class TestCleanExtractedText:
    """Tests for text cleaning functionality."""

    def test_clean_removes_page_numbers(self, pdf_service: PDFProcessingService):
        """Test that standalone page numbers are removed."""
        text = "Some content\n1\nMore content\n2\nEven more"

        result = pdf_service._clean_extracted_text(text)

        # Page numbers as standalone lines should be removed
        lines = result.split("\n")
        for line in lines:
            assert line.strip() not in ["1", "2"]

    def test_clean_removes_page_x_of_y(self, pdf_service: PDFProcessingService):
        """Test that 'Page X of Y' patterns are removed."""
        text = "Content here Page 1 of 10 more content page 5 / 20 end"

        result = pdf_service._clean_extracted_text(text)

        assert "Page 1 of 10" not in result
        assert "page 5 / 20" not in result

    def test_clean_handles_empty_text(self, pdf_service: PDFProcessingService):
        """Test handling of empty text."""
        result = pdf_service._clean_extracted_text("")
        assert result == ""

        result = pdf_service._clean_extracted_text(None)  # type: ignore
        assert result == ""


class TestLanguageDetection:
    """Tests for language detection functionality."""

    def test_detect_language_english(self, pdf_service: PDFProcessingService):
        """Test detection of English text."""
        text = "The quick brown fox jumps over the lazy dog."
        result = pdf_service._detect_language(text)
        assert result == "en"

    def test_detect_language_short_text_returns_none(
        self, pdf_service: PDFProcessingService
    ):
        """Test that very short text returns None."""
        text = "Hi"
        result = pdf_service._detect_language(text)
        assert result is None

    def test_detect_language_empty_returns_none(
        self, pdf_service: PDFProcessingService
    ):
        """Test that empty text returns None."""
        result = pdf_service._detect_language("")
        assert result is None


class TestServiceSingleton:
    """Tests for service singleton pattern."""

    def test_get_service_returns_same_instance(self):
        """Test that get_pdf_processing_service returns singleton."""
        service1 = get_pdf_processing_service()
        service2 = get_pdf_processing_service()

        assert service1 is service2
