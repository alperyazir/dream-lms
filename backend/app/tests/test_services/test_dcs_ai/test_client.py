"""
Tests for DCS AI Service Client.

Tests the DCSAIServiceClient class with mocked DCS client and cache.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.schemas.dcs_ai_data import (
    ModuleDetail,
    ModuleListResponse,
    ModuleSummary,
    ProcessingMetadata,
    VocabularyResponse,
    VocabularyWord,
)
from app.services.dcs_ai.client import DCSAIServiceClient
from app.services.dcs_ai.exceptions import (
    DCSAIDataAuthError,
    DCSAIDataConnectionError,
)
from app.services.dream_storage_client import (
    DreamStorageAuthError,
    DreamStorageNotFoundError,
    DreamStorageServerError,
)


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_dcs_client():
    """Mock DreamCentralStorageClient for testing."""
    client = MagicMock()
    client._make_request = AsyncMock()
    return client


@pytest.fixture
def mock_cache():
    """Mock DCSCache for testing."""
    cache = MagicMock()
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock()
    cache.invalidate = AsyncMock(return_value=True)
    cache.invalidate_pattern = AsyncMock(return_value=0)
    return cache


@pytest.fixture
def dcs_ai_client(mock_dcs_client, mock_cache):
    """Create DCSAIServiceClient with mocked dependencies."""
    return DCSAIServiceClient(dcs_client=mock_dcs_client, cache=mock_cache)


@pytest.fixture
def sample_metadata_response():
    """Sample processing metadata response from DCS."""
    return {
        "book_id": "123",
        "processing_status": "completed",
        "total_pages": 120,
        "total_modules": 12,
        "total_vocabulary": 450,
        "total_audio_files": 900,
        "languages": ["en", "tr"],
        "primary_language": "en",
        "difficulty_range": ["A1", "A2", "B1"],
        "stages": None,
    }


@pytest.fixture
def sample_modules_response():
    """Sample module list response from DCS."""
    return {
        "book_id": "123",
        "total_modules": 2,
        "modules": [
            {"module_id": 1, "title": "Unit 1", "pages": [1, 2, 3], "word_count": 500},
            {"module_id": 2, "title": "Unit 2", "pages": [4, 5, 6], "word_count": 600},
        ],
    }


@pytest.fixture
def sample_module_detail_response():
    """Sample module detail response from DCS."""
    return {
        "module_id": 1,
        "title": "Unit 1",
        "pages": [1, 2, 3],
        "text": "Sample text content for the module.",
        "topics": ["topic1", "topic2"],
        "vocabulary_ids": ["vocab_1", "vocab_2"],
        "language": "en",
        "difficulty": "A1",
    }


@pytest.fixture
def sample_vocabulary_response():
    """Sample vocabulary response from DCS."""
    return {
        "book_id": "123",
        "language": "en",
        "translation_language": "tr",
        "total_words": 2,
        "words": [
            {
                "id": "vocab_1",
                "word": "accomplish",
                "translation": "başarmak",
                "definition": "to succeed in doing something",
                "part_of_speech": "verb",
                "level": "B1",
                "example": "She accomplished her goal.",
                "module_id": 1,
                "module_title": "Unit 1",
                "page": 5,
                "audio": {
                    "word": "audio/vocabulary/en/accomplish.mp3",
                    "translation": "audio/vocabulary/tr/accomplish.mp3",
                },
            },
            {
                "id": "vocab_2",
                "word": "achieve",
                "translation": "elde etmek",
                "definition": "to succeed in reaching a goal",
                "part_of_speech": "verb",
                "level": "A2",
                "example": "He achieved success.",
                "module_id": 1,
                "module_title": "Unit 1",
                "page": 6,
                "audio": None,
            },
        ],
        "extracted_at": "2025-01-01T00:00:00Z",
    }


# ============================================================================
# get_processing_status Tests
# ============================================================================


@pytest.mark.asyncio
async def test_get_processing_status_returns_metadata_for_processed_book(
    dcs_ai_client, mock_dcs_client, mock_cache, sample_metadata_response
):
    """Test that get_processing_status returns metadata for processed book."""
    # Arrange
    mock_response = MagicMock()
    mock_response.json.return_value = sample_metadata_response
    mock_dcs_client._make_request.return_value = mock_response

    # Act
    result = await dcs_ai_client.get_processing_status(book_id=123)

    # Assert
    assert result is not None
    assert isinstance(result, ProcessingMetadata)
    assert result.book_id == "123"
    assert result.processing_status == "completed"
    assert result.total_modules == 12
    mock_dcs_client._make_request.assert_called_once_with(
        "GET", "/books/123/ai-data/metadata"
    )


@pytest.mark.asyncio
async def test_get_processing_status_returns_none_for_404(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that get_processing_status returns None for 404."""
    # Arrange
    mock_dcs_client._make_request.side_effect = DreamStorageNotFoundError(
        "Not found"
    )

    # Act
    result = await dcs_ai_client.get_processing_status(book_id=999)

    # Assert
    assert result is None


@pytest.mark.asyncio
async def test_get_processing_status_uses_cache(
    dcs_ai_client, mock_dcs_client, mock_cache, sample_metadata_response
):
    """Test that get_processing_status uses cache on second call."""
    # Arrange - first call populates cache
    mock_response = MagicMock()
    mock_response.json.return_value = sample_metadata_response
    mock_dcs_client._make_request.return_value = mock_response

    await dcs_ai_client.get_processing_status(book_id=123)

    # Simulate cache hit
    cached_metadata = ProcessingMetadata(**sample_metadata_response)
    mock_cache.get.return_value = cached_metadata

    # Act - second call should use cache
    result = await dcs_ai_client.get_processing_status(book_id=123)

    # Assert
    assert result is not None
    assert result.book_id == "123"
    # DCS client should only be called once (first call)
    assert mock_dcs_client._make_request.call_count == 1


@pytest.mark.asyncio
async def test_get_processing_status_raises_auth_error(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that get_processing_status raises DCSAIDataAuthError on auth failure."""
    # Arrange
    mock_dcs_client._make_request.side_effect = DreamStorageAuthError("Auth failed")

    # Act & Assert
    with pytest.raises(DCSAIDataAuthError) as exc_info:
        await dcs_ai_client.get_processing_status(book_id=123)

    assert exc_info.value.book_id == 123


@pytest.mark.asyncio
async def test_get_processing_status_raises_connection_error(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that get_processing_status raises DCSAIDataConnectionError on server error."""
    # Arrange
    mock_dcs_client._make_request.side_effect = DreamStorageServerError("Server error")

    # Act & Assert
    with pytest.raises(DCSAIDataConnectionError) as exc_info:
        await dcs_ai_client.get_processing_status(book_id=123)

    assert exc_info.value.book_id == 123
    assert exc_info.value.original_error is not None


# ============================================================================
# get_modules Tests
# ============================================================================


@pytest.mark.asyncio
async def test_get_modules_returns_list(
    dcs_ai_client, mock_dcs_client, mock_cache, sample_modules_response
):
    """Test that get_modules returns module list."""
    # Arrange
    mock_response = MagicMock()
    mock_response.json.return_value = sample_modules_response
    mock_dcs_client._make_request.return_value = mock_response

    # Act
    result = await dcs_ai_client.get_modules(book_id=123)

    # Assert
    assert result is not None
    assert isinstance(result, ModuleListResponse)
    assert result.total_modules == 2
    assert len(result.modules) == 2
    assert isinstance(result.modules[0], ModuleSummary)
    assert result.modules[0].title == "Unit 1"


@pytest.mark.asyncio
async def test_get_modules_returns_none_for_unprocessed(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that get_modules returns None for unprocessed book."""
    # Arrange
    mock_dcs_client._make_request.side_effect = DreamStorageNotFoundError("Not found")

    # Act
    result = await dcs_ai_client.get_modules(book_id=999)

    # Assert
    assert result is None


# ============================================================================
# get_module_detail Tests
# ============================================================================


@pytest.mark.asyncio
async def test_get_module_detail_returns_full_module(
    dcs_ai_client, mock_dcs_client, mock_cache, sample_module_detail_response
):
    """Test that get_module_detail returns full module data."""
    # Arrange
    mock_response = MagicMock()
    mock_response.json.return_value = sample_module_detail_response
    mock_dcs_client._make_request.return_value = mock_response

    # Act
    result = await dcs_ai_client.get_module_detail(book_id=123, module_id=1)

    # Assert
    assert result is not None
    assert isinstance(result, ModuleDetail)
    assert result.module_id == 1
    assert result.title == "Unit 1"
    assert "Sample text content" in result.text
    assert len(result.vocabulary_ids) == 2
    mock_dcs_client._make_request.assert_called_once_with(
        "GET", "/books/123/ai-data/modules/1"
    )


@pytest.mark.asyncio
async def test_get_module_detail_returns_none_for_404(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that get_module_detail returns None for missing module."""
    # Arrange
    mock_dcs_client._make_request.side_effect = DreamStorageNotFoundError("Not found")

    # Act
    result = await dcs_ai_client.get_module_detail(book_id=123, module_id=999)

    # Assert
    assert result is None


# ============================================================================
# get_vocabulary Tests
# ============================================================================


@pytest.mark.asyncio
async def test_get_vocabulary_without_filter(
    dcs_ai_client, mock_dcs_client, mock_cache, sample_vocabulary_response
):
    """Test that get_vocabulary returns all vocabulary."""
    # Arrange
    mock_response = MagicMock()
    mock_response.json.return_value = sample_vocabulary_response
    mock_dcs_client._make_request.return_value = mock_response

    # Act
    result = await dcs_ai_client.get_vocabulary(book_id=123)

    # Assert
    assert result is not None
    assert isinstance(result, VocabularyResponse)
    assert result.total_words == 2
    assert len(result.words) == 2
    assert isinstance(result.words[0], VocabularyWord)
    assert result.words[0].word == "accomplish"
    mock_dcs_client._make_request.assert_called_once_with(
        "GET", "/books/123/ai-data/vocabulary"
    )


@pytest.mark.asyncio
async def test_get_vocabulary_with_module_filter(
    dcs_ai_client, mock_dcs_client, mock_cache, sample_vocabulary_response
):
    """Test that get_vocabulary with module filter passes module param."""
    # Arrange
    mock_response = MagicMock()
    mock_response.json.return_value = sample_vocabulary_response
    mock_dcs_client._make_request.return_value = mock_response

    # Act
    result = await dcs_ai_client.get_vocabulary(book_id=123, module_id=1)

    # Assert
    assert result is not None
    mock_dcs_client._make_request.assert_called_once_with(
        "GET", "/books/123/ai-data/vocabulary?module=1"
    )


@pytest.mark.asyncio
async def test_get_vocabulary_returns_none_for_404(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that get_vocabulary returns None for missing vocabulary."""
    # Arrange
    mock_dcs_client._make_request.side_effect = DreamStorageNotFoundError("Not found")

    # Act
    result = await dcs_ai_client.get_vocabulary(book_id=999)

    # Assert
    assert result is None


# ============================================================================
# get_audio_url Tests
# ============================================================================


@pytest.mark.asyncio
async def test_get_audio_url_returns_presigned_url(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that get_audio_url returns presigned URL."""
    # Arrange
    mock_response = MagicMock()
    mock_response.json.return_value = {"url": "https://dcs.example.com/audio/presigned"}
    mock_dcs_client._make_request.return_value = mock_response

    # Act
    result = await dcs_ai_client.get_audio_url(book_id=123, lang="en", word="accomplish")

    # Assert
    assert result == "https://dcs.example.com/audio/presigned"
    mock_dcs_client._make_request.assert_called_once_with(
        "GET", "/books/123/ai-data/audio/vocabulary/en/accomplish.mp3"
    )


@pytest.mark.asyncio
async def test_get_audio_url_caches_for_1_hour(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that get_audio_url caches with 1 hour TTL."""
    # Arrange
    mock_response = MagicMock()
    mock_response.json.return_value = {"url": "https://dcs.example.com/audio/presigned"}
    mock_dcs_client._make_request.return_value = mock_response

    # Act
    await dcs_ai_client.get_audio_url(book_id=123, lang="en", word="accomplish")

    # Assert - verify cache.set was called with 1 hour TTL (3600 seconds)
    mock_cache.set.assert_called_once()
    call_args = mock_cache.set.call_args
    assert call_args[1]["ttl"] == 3600  # 1 hour TTL


@pytest.mark.asyncio
async def test_get_audio_url_returns_none_for_404(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that get_audio_url returns None for missing audio."""
    # Arrange
    mock_dcs_client._make_request.side_effect = DreamStorageNotFoundError("Not found")

    # Act
    result = await dcs_ai_client.get_audio_url(book_id=123, lang="en", word="nonexistent")

    # Assert
    assert result is None


# ============================================================================
# is_book_processed Tests
# ============================================================================


@pytest.mark.asyncio
async def test_is_book_processed_returns_true_for_completed(
    dcs_ai_client, mock_dcs_client, mock_cache, sample_metadata_response
):
    """Test that is_book_processed returns True for completed status."""
    # Arrange
    mock_response = MagicMock()
    mock_response.json.return_value = sample_metadata_response  # status = "completed"
    mock_dcs_client._make_request.return_value = mock_response

    # Act
    result = await dcs_ai_client.is_book_processed(book_id=123)

    # Assert
    assert result is True


@pytest.mark.asyncio
async def test_is_book_processed_returns_false_for_processing(
    dcs_ai_client, mock_dcs_client, mock_cache, sample_metadata_response
):
    """Test that is_book_processed returns False for processing status."""
    # Arrange
    processing_metadata = sample_metadata_response.copy()
    processing_metadata["processing_status"] = "processing"
    mock_response = MagicMock()
    mock_response.json.return_value = processing_metadata
    mock_dcs_client._make_request.return_value = mock_response

    # Act
    result = await dcs_ai_client.is_book_processed(book_id=123)

    # Assert
    assert result is False


@pytest.mark.asyncio
async def test_is_book_processed_returns_false_for_not_found(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that is_book_processed returns False when book not found."""
    # Arrange
    mock_dcs_client._make_request.side_effect = DreamStorageNotFoundError("Not found")

    # Act
    result = await dcs_ai_client.is_book_processed(book_id=999)

    # Assert
    assert result is False


@pytest.mark.asyncio
async def test_is_book_processed_returns_false_on_error(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that is_book_processed returns False on connection error."""
    # Arrange
    mock_dcs_client._make_request.side_effect = DreamStorageServerError("Server error")

    # Act
    result = await dcs_ai_client.is_book_processed(book_id=123)

    # Assert
    assert result is False


# ============================================================================
# Exception Mapping Tests
# ============================================================================


@pytest.mark.asyncio
async def test_exception_mapping_not_found(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that DreamStorageNotFoundError results in None return."""
    # Arrange
    mock_dcs_client._make_request.side_effect = DreamStorageNotFoundError("Not found")

    # Act
    result = await dcs_ai_client.get_processing_status(book_id=123)

    # Assert - should return None, not raise
    assert result is None


@pytest.mark.asyncio
async def test_exception_mapping_auth_error(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that DreamStorageAuthError maps to DCSAIDataAuthError."""
    # Arrange
    mock_dcs_client._make_request.side_effect = DreamStorageAuthError("Auth failed")

    # Act & Assert
    with pytest.raises(DCSAIDataAuthError):
        await dcs_ai_client.get_modules(book_id=123)


@pytest.mark.asyncio
async def test_exception_mapping_server_error(
    dcs_ai_client, mock_dcs_client, mock_cache
):
    """Test that DreamStorageServerError maps to DCSAIDataConnectionError."""
    # Arrange
    mock_dcs_client._make_request.side_effect = DreamStorageServerError("Server error")

    # Act & Assert
    with pytest.raises(DCSAIDataConnectionError):
        await dcs_ai_client.get_vocabulary(book_id=123)


# ============================================================================
# Cache Invalidation Tests
# ============================================================================


@pytest.mark.asyncio
async def test_invalidate_book_cache(dcs_ai_client, mock_cache):
    """Test that invalidate_book_cache clears all cache entries for a book."""
    # Arrange
    mock_cache.invalidate_pattern.return_value = 5

    # Act
    count = await dcs_ai_client.invalidate_book_cache(book_id=123)

    # Assert
    assert count == 6  # 5 from pattern + 1 from metadata key
    mock_cache.invalidate.assert_called_once()
    mock_cache.invalidate_pattern.assert_called_once()
