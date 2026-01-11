"""
PDF Processing Service for Story 27.15 - Teacher Materials Processing.

Provides text extraction from PDFs and language detection for AI content generation.
"""

import logging
import re
import tempfile
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from langdetect import detect, LangDetectException
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.schemas.teacher_material import TextExtractionResult


logger = logging.getLogger(__name__)


# Maximum file size for PDF processing (50MB)
MAX_PDF_SIZE = 50 * 1024 * 1024

# Minimum text length to consider extraction successful
MIN_EXTRACTION_LENGTH = 50


class PDFProcessingError(Exception):
    """Custom exception for PDF processing errors."""

    def __init__(self, message: str, error_type: str = "processing_error"):
        self.message = message
        self.error_type = error_type
        super().__init__(self.message)


class PDFProcessingService:
    """Service for processing PDFs and extracting text for AI generation."""

    async def process_pdf(self, file: UploadFile) -> TextExtractionResult:
        """
        Process uploaded PDF and extract text.

        Pipeline:
        1. Validate file size and type
        2. Save uploaded file temporarily
        3. Attempt text extraction with pypdf
        4. If minimal text found, return with warning (OCR not yet implemented)
        5. Clean and normalize extracted text
        6. Detect language

        Args:
            file: Uploaded PDF file

        Returns:
            TextExtractionResult with extracted text, word count, and language

        Raises:
            HTTPException: On validation or processing errors
        """
        # Validate file type
        if file.content_type not in ["application/pdf", "application/x-pdf"]:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Only PDF files are supported for text extraction",
            )

        # Check file size
        content = await file.read()
        await file.seek(0)

        if len(content) > MAX_PDF_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"PDF file too large. Maximum size is {MAX_PDF_SIZE // 1024 // 1024}MB",
            )

        # Process the PDF
        try:
            extracted_text = await self._extract_text_from_bytes(content)
        except PDFProcessingError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=e.message,
            )

        # Clean the extracted text
        cleaned_text = self._clean_extracted_text(extracted_text)

        # Check if we got meaningful content
        if len(cleaned_text.strip()) < MIN_EXTRACTION_LENGTH:
            # This is likely a scanned PDF - for now, return what we have
            # OCR integration with Gemini Vision is planned for later
            logger.warning(
                f"Minimal text extracted from PDF ({len(cleaned_text)} chars). "
                "This may be a scanned document. OCR is not yet available."
            )

        # Detect language
        language = self._detect_language(cleaned_text)

        # Calculate word count
        word_count = len(cleaned_text.split())

        return TextExtractionResult(
            extracted_text=cleaned_text,
            word_count=word_count,
            language=language,
            source_type="pdf",
        )

    async def _extract_text_from_bytes(self, pdf_bytes: bytes) -> str:
        """
        Extract text from PDF bytes using pypdf.

        Args:
            pdf_bytes: PDF file content as bytes

        Returns:
            Extracted text from all pages

        Raises:
            PDFProcessingError: On extraction failure
        """
        import io

        try:
            # Create a file-like object from bytes
            pdf_file = io.BytesIO(pdf_bytes)
            reader = PdfReader(pdf_file)

            # Check if PDF is encrypted
            if reader.is_encrypted:
                raise PDFProcessingError(
                    "PDF is password-protected. Please provide an unencrypted PDF.",
                    error_type="encrypted_pdf",
                )

            # Extract text from all pages
            text_parts: list[str] = []
            for page_num, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text() or ""
                    if page_text.strip():
                        text_parts.append(page_text)
                except Exception as e:
                    logger.warning(f"Failed to extract text from page {page_num}: {e}")
                    continue

            return "\n\n".join(text_parts)

        except PdfReadError as e:
            logger.error(f"PDF read error: {e}")
            raise PDFProcessingError(
                "Could not read PDF file. The file may be corrupted or in an unsupported format.",
                error_type="corrupted_pdf",
            )
        except Exception as e:
            logger.error(f"Unexpected error during PDF processing: {e}")
            raise PDFProcessingError(
                f"Failed to process PDF: {str(e)}",
                error_type="processing_error",
            )

    def _clean_extracted_text(self, text: str) -> str:
        """
        Clean and normalize extracted text.

        Removes common artifacts like:
        - Excessive whitespace
        - Page numbers and headers/footers
        - Non-printable characters

        Args:
            text: Raw extracted text

        Returns:
            Cleaned text
        """
        if not text:
            return ""

        # Remove non-printable characters (except common whitespace)
        text = "".join(char for char in text if char.isprintable() or char in "\n\t ")

        # Replace multiple spaces with single space
        text = re.sub(r"[ \t]+", " ", text)

        # Replace multiple newlines with double newline (paragraph break)
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Remove page numbers (common patterns)
        # Pattern: standalone numbers on a line, often 1, 2, 3, etc.
        text = re.sub(r"^\s*\d+\s*$", "", text, flags=re.MULTILINE)

        # Remove common header/footer patterns
        # Pattern: "Page X of Y"
        text = re.sub(r"[Pp]age\s+\d+\s+(of|/)\s+\d+", "", text)

        # Strip leading/trailing whitespace from lines
        lines = [line.strip() for line in text.split("\n")]
        text = "\n".join(lines)

        # Remove leading/trailing whitespace from the entire text
        text = text.strip()

        return text

    def _detect_language(self, text: str) -> str | None:
        """
        Detect the language of the text.

        Args:
            text: Text to analyze

        Returns:
            ISO 639-1 language code (e.g., 'en', 'tr') or None if detection fails
        """
        if not text or len(text.strip()) < 20:
            return None

        try:
            # Take a sample for detection (first 5000 chars is enough)
            sample = text[:5000]
            return detect(sample)
        except LangDetectException:
            logger.warning("Language detection failed")
            return None

    async def process_text_input(self, text: str) -> TextExtractionResult:
        """
        Process direct text input (from paste).

        Args:
            text: Text content provided by user

        Returns:
            TextExtractionResult with text, word count, and detected language
        """
        # Clean the text
        cleaned_text = self._clean_text_input(text)

        # Detect language
        language = self._detect_language(cleaned_text)

        # Calculate word count
        word_count = len(cleaned_text.split())

        return TextExtractionResult(
            extracted_text=cleaned_text,
            word_count=word_count,
            language=language,
            source_type="text",
        )

    def _clean_text_input(self, text: str) -> str:
        """
        Clean user-provided text input.

        Args:
            text: Raw text from user

        Returns:
            Cleaned text
        """
        if not text:
            return ""

        # Remove non-printable characters
        text = "".join(char for char in text if char.isprintable() or char in "\n\t ")

        # Normalize whitespace
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Strip leading/trailing whitespace
        text = text.strip()

        return text


# Singleton instance for dependency injection
_pdf_service: PDFProcessingService | None = None


def get_pdf_processing_service() -> PDFProcessingService:
    """Get or create the PDF processing service instance."""
    global _pdf_service
    if _pdf_service is None:
        _pdf_service = PDFProcessingService()
    return _pdf_service
