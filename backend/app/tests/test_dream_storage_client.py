"""
Unit tests for Dream Central Storage Client.

Tests JWT authentication, token caching, retry logic, error handling,
response caching, and all API methods with mocked httpx responses.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, Mock, patch

import httpx
import pytest
import pytest_asyncio

from app.services.dream_storage_client import (
    BookRead,
    DreamCentralStorageClient,
    DreamStorageAuthError,
    DreamStorageForbiddenError,
    DreamStorageServerError,
    TokenResponse,
)

# ============================================================================
# Fixtures
# ============================================================================


@pytest_asyncio.fixture
async def client():
    """Provide a DreamCentralStorageClient instance."""
    client_instance = DreamCentralStorageClient()
    yield client_instance
    await client_instance.close()


@pytest.fixture
def mock_token_response():
    """Mock JWT token response."""
    return {"access_token": "test_token_12345", "token_type": "bearer"}


@pytest.fixture
def mock_books_response():
    """Mock books list response."""
    return [
        {
            "id": 1,
            "book_name": "BRAINS",
            "publisher": "Universal ELT",
            "title": "BRAINS Level 1",
            "description": "English learning book",
            "status": "published",
        },
        {
            "id": 2,
            "book_name": "KEEN A",
            "publisher": "Universal ELT",
            "title": "KEEN A Level 1",
            "description": "Another English book",
            "status": "published",
        },
    ]


@pytest.fixture
def mock_book_response():
    """Mock single book response."""
    return {
        "id": 1,
        "book_name": "BRAINS",
        "publisher": "Universal ELT",
        "title": "BRAINS Level 1",
        "description": "English learning book",
        "status": "published",
    }


@pytest.fixture
def mock_config_response():
    """Mock config.json response."""
    return {
        "book_title": "BRAINS",
        "book_cover": "./books/BRAINS/images/book_cover.png",
        "books": [
            {
                "modules": [
                    {
                        "name": "Module 1",
                        "pages": [
                            {
                                "page_number": 7,
                                "sections": [
                                    {
                                        "type": "fill",
                                        "activity": {"type": "matchTheWords", "headerText": "Match the words"},
                                    }
                                ],
                            }
                        ],
                    }
                ]
            }
        ],
    }


# ============================================================================
# Authentication Tests
# ============================================================================


@pytest.mark.asyncio
async def test_authenticate_success(client, mock_token_response):
    """Test successful JWT authentication."""
    # Mock the HTTP request
    with patch.object(client._client, "post") as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_token_response
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        result = await client.authenticate()

        assert isinstance(result, TokenResponse)
        assert result.access_token == "test_token_12345"
        assert result.token_type == "bearer"
        assert client._token == "test_token_12345"
        assert client._token_expires_at is not None


@pytest.mark.asyncio
async def test_authenticate_failure(client):
    """Test authentication failure with invalid credentials."""
    with patch.object(client._client, "post") as mock_post:
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "401 Unauthorized", request=Mock(), response=mock_response
        )
        mock_post.return_value = mock_response

        with pytest.raises(DreamStorageAuthError):
            await client.authenticate()


@pytest.mark.asyncio
async def test_token_cached_and_reused(client, mock_token_response):
    """Test that token is cached and reused for multiple requests."""
    with patch.object(client._client, "post") as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_token_response
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        # First call - should authenticate
        token1 = await client._get_valid_token()

        # Second call - should reuse token
        token2 = await client._get_valid_token()

        assert token1 == token2
        assert mock_post.call_count == 1  # Only called once


@pytest.mark.asyncio
async def test_token_auto_refresh_before_expiry(client, mock_token_response):
    """Test proactive token refresh before expiration."""
    with patch.object(client._client, "post") as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_token_response
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        # First authentication
        await client._get_valid_token()
        assert mock_post.call_count == 1

        # Simulate token expiration by setting expires_at to past
        client._token_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)

        # Next call should refresh token
        token = await client._get_valid_token()
        assert token == "test_token_12345"
        assert mock_post.call_count == 2  # Called twice (initial + refresh)


@pytest.mark.asyncio
async def test_token_refresh_thread_safe(client, mock_token_response):
    """Test that concurrent token refresh requests are handled safely."""
    with patch.object(client._client, "post") as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_token_response
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        # Expire token
        client._token_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)

        # Make multiple concurrent requests
        results = await asyncio.gather(
            client._get_valid_token(),
            client._get_valid_token(),
            client._get_valid_token(),
        )

        # All should get the same token
        assert all(token == results[0] for token in results)
        # Auth should only be called once due to lock
        assert mock_post.call_count == 1


# ============================================================================
# Retry Logic Tests
# ============================================================================


@pytest.mark.asyncio
async def test_retry_on_5xx_errors(client, mock_token_response, mock_books_response):
    """Test that 5xx server errors trigger retries."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request, patch("asyncio.sleep", new_callable=AsyncMock):
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock 500 error twice, then success
        error_response = Mock()
        error_response.status_code = 500
        error_response.text = "Internal Server Error"

        success_response = Mock()
        success_response.status_code = 200
        success_response.json.return_value = mock_books_response
        success_response.raise_for_status = Mock()

        mock_request.side_effect = [error_response, error_response, success_response]

        # Should succeed after retries
        books = await client.get_books()
        assert len(books) == 2
        assert mock_request.call_count == 3  # 2 failures + 1 success


@pytest.mark.asyncio
async def test_max_retries_respected(client, mock_token_response):
    """Test that max retries (3) is respected."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request, patch("asyncio.sleep", new_callable=AsyncMock):
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock 500 error every time
        error_response = Mock()
        error_response.status_code = 500
        error_response.text = "Internal Server Error"
        mock_request.return_value = error_response

        # Should fail after max retries
        with pytest.raises(DreamStorageServerError):
            await client.get_books()

        assert mock_request.call_count == 4  # Initial + 3 retries


@pytest.mark.asyncio
async def test_no_retry_on_403(client, mock_token_response):
    """Test that 403 Forbidden errors don't trigger retries."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request:
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock 403 error
        error_response = Mock()
        error_response.status_code = 403
        error_response.text = "Forbidden"
        mock_request.return_value = error_response

        # Should fail immediately without retries
        with pytest.raises(DreamStorageForbiddenError):
            await client.get_books()

        assert mock_request.call_count == 1  # No retries


@pytest.mark.asyncio
async def test_no_retry_on_404(client, mock_token_response):
    """Test that 404 Not Found errors don't trigger retries."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request:
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock 404 error
        error_response = Mock()
        error_response.status_code = 404
        error_response.text = "Not Found"
        mock_request.return_value = error_response

        # Should return None for get_book_by_id
        result = await client.get_book_by_id(999)
        assert result is None
        assert mock_request.call_count == 1  # No retries


@pytest.mark.asyncio
async def test_token_refresh_on_401(client, mock_token_response, mock_books_response):
    """Test that 401 triggers token refresh and retry."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request, patch("asyncio.sleep", new_callable=AsyncMock):
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock 401 error first, then success
        auth_error_response = Mock()
        auth_error_response.status_code = 401

        success_response = Mock()
        success_response.status_code = 200
        success_response.json.return_value = mock_books_response
        success_response.raise_for_status = Mock()

        mock_request.side_effect = [auth_error_response, success_response]

        # Should refresh token and succeed
        books = await client.get_books()
        assert len(books) == 2
        assert mock_post.call_count == 2  # Initial auth + refresh after 401


@pytest.mark.asyncio
async def test_rate_limiting_respects_retry_after(client, mock_token_response, mock_books_response):
    """Test that 429 rate limiting respects Retry-After header."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request, patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock 429 with Retry-After header, then success
        rate_limit_response = Mock()
        rate_limit_response.status_code = 429
        rate_limit_response.headers = {"Retry-After": "30"}

        success_response = Mock()
        success_response.status_code = 200
        success_response.json.return_value = mock_books_response
        success_response.raise_for_status = Mock()

        mock_request.side_effect = [rate_limit_response, success_response]

        books = await client.get_books()
        assert len(books) == 2
        # Should sleep for Retry-After seconds
        mock_sleep.assert_called_once_with(30)


# ============================================================================
# Caching Tests
# ============================================================================


@pytest.mark.asyncio
async def test_cache_hit_returns_cached_data(client, mock_token_response, mock_books_response):
    """Test that cached data is returned on cache hit."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request:
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock books response
        books_response = Mock()
        books_response.status_code = 200
        books_response.json.return_value = mock_books_response
        books_response.raise_for_status = Mock()
        mock_request.return_value = books_response

        # First call - should hit API
        books1 = await client.get_books()
        assert len(books1) == 2
        assert mock_request.call_count == 1

        # Second call - should use cache
        books2 = await client.get_books()
        assert len(books2) == 2
        assert mock_request.call_count == 1  # Still only 1 call


@pytest.mark.asyncio
async def test_cache_miss_fetches_from_api(client, mock_token_response, mock_config_response):
    """Test that cache miss triggers API call."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request:
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock config response
        config_response = Mock()
        config_response.status_code = 200
        config_response.json.return_value = mock_config_response
        config_response.raise_for_status = Mock()
        mock_request.return_value = config_response

        # Should fetch from API
        config = await client.get_book_config("Universal ELT", "BRAINS")
        assert config["book_title"] == "BRAINS"
        assert mock_request.call_count == 1


@pytest.mark.asyncio
async def test_cache_expiration_triggers_refresh(client, mock_token_response, mock_books_response):
    """Test that expired cache triggers API refresh."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request:
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock books response
        books_response = Mock()
        books_response.status_code = 200
        books_response.json.return_value = mock_books_response
        books_response.raise_for_status = Mock()
        mock_request.return_value = books_response

        # First call
        await client.get_books()
        assert mock_request.call_count == 1

        # Manually expire cache
        for key in client._cache:
            client._cache[key]["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=1)

        # Second call should refresh
        await client.get_books()
        assert mock_request.call_count == 2


@pytest.mark.asyncio
async def test_cache_invalidation_clears_cache(client, mock_token_response, mock_books_response):
    """Test that manual cache invalidation clears all cached data."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request:
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock books response
        books_response = Mock()
        books_response.status_code = 200
        books_response.json.return_value = mock_books_response
        books_response.raise_for_status = Mock()
        mock_request.return_value = books_response

        # First call - cache data
        await client.get_books()
        assert len(client._cache) > 0

        # Invalidate cache
        client.invalidate_cache()
        assert len(client._cache) == 0

        # Next call should hit API again
        await client.get_books()
        assert mock_request.call_count == 2


# ============================================================================
# API Method Tests
# ============================================================================


@pytest.mark.asyncio
async def test_get_books_returns_list(client, mock_token_response, mock_books_response):
    """Test get_books() returns list of BookRead models."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request:
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock books response
        books_response = Mock()
        books_response.status_code = 200
        books_response.json.return_value = mock_books_response
        books_response.raise_for_status = Mock()
        mock_request.return_value = books_response

        books = await client.get_books()
        assert len(books) == 2
        assert all(isinstance(book, BookRead) for book in books)
        assert books[0].book_name == "BRAINS"
        assert books[1].book_name == "KEEN A"


@pytest.mark.asyncio
async def test_get_book_by_id_returns_book(client, mock_token_response, mock_book_response):
    """Test get_book_by_id() returns single BookRead model."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request:
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock book response
        book_response = Mock()
        book_response.status_code = 200
        book_response.json.return_value = mock_book_response
        book_response.raise_for_status = Mock()
        mock_request.return_value = book_response

        book = await client.get_book_by_id(1)
        assert isinstance(book, BookRead)
        assert book.book_name == "BRAINS"
        assert book.id == 1


@pytest.mark.asyncio
async def test_get_book_config_returns_dict(client, mock_token_response, mock_config_response):
    """Test get_book_config() returns config dictionary."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request:
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock config response
        config_response = Mock()
        config_response.status_code = 200
        config_response.json.return_value = mock_config_response
        config_response.raise_for_status = Mock()
        mock_request.return_value = config_response

        config = await client.get_book_config("Universal ELT", "BRAINS")
        assert isinstance(config, dict)
        assert config["book_title"] == "BRAINS"
        assert "books" in config


@pytest.mark.asyncio
async def test_list_book_contents_returns_list(client, mock_token_response):
    """Test list_book_contents() returns list of file paths."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request:
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock contents response
        contents_response = Mock()
        contents_response.status_code = 200
        contents_response.json.return_value = ["images/", "audio/", "config.json"]
        contents_response.raise_for_status = Mock()
        mock_request.return_value = contents_response

        contents = await client.list_book_contents("Universal ELT", "BRAINS")
        assert isinstance(contents, list)
        assert "config.json" in contents
        assert "images/" in contents


@pytest.mark.asyncio
async def test_download_asset_returns_bytes(client, mock_token_response):
    """Test download_asset() returns file content as bytes."""
    with patch.object(client._client, "post") as mock_post, patch.object(
        client._client, "request"
    ) as mock_request:
        # Mock auth
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        # Mock asset download response
        asset_response = Mock()
        asset_response.status_code = 200
        asset_response.content = b"fake image data"
        asset_response.raise_for_status = Mock()
        mock_request.return_value = asset_response

        data = await client.download_asset("Universal ELT", "BRAINS", "images/cover.png")
        assert isinstance(data, bytes)
        assert data == b"fake image data"


@pytest.mark.asyncio
async def test_get_asset_url_generates_url(client):
    """Test get_asset_url() generates correct URL."""
    url = client.get_asset_url("Universal ELT", "BRAINS", "images/M1/p7m5.jpg")
    assert "Universal ELT" in url
    assert "BRAINS" in url
    assert "images/M1/p7m5.jpg" in url
    assert "object?path=" in url


# ============================================================================
# Security Validation Tests
# ============================================================================


@pytest.mark.asyncio
async def test_validate_asset_path_accepts_valid_paths(client):
    """Test that valid asset paths are accepted."""
    # Should not raise any exception
    client._validate_asset_path("images/M1/p7m5.jpg")
    client._validate_asset_path("audio/6a.mp3")
    client._validate_asset_path("config.json")
    client._validate_asset_path("images/book_cover.png")


@pytest.mark.asyncio
async def test_validate_asset_path_rejects_path_traversal(client):
    """Test that paths with '..' are rejected."""
    with pytest.raises(ValueError) as exc_info:
        client._validate_asset_path("../../../etc/passwd")
    assert "path traversal not allowed" in str(exc_info.value)

    with pytest.raises(ValueError):
        client._validate_asset_path("images/../../config.json")


@pytest.mark.asyncio
async def test_validate_asset_path_rejects_absolute_paths(client):
    """Test that absolute paths are rejected."""
    with pytest.raises(ValueError) as exc_info:
        client._validate_asset_path("/etc/passwd")
    assert "absolute paths not allowed" in str(exc_info.value)

    with pytest.raises(ValueError):
        client._validate_asset_path("/images/cover.png")


@pytest.mark.asyncio
async def test_get_asset_url_validates_path(client):
    """Test that get_asset_url() validates asset_path."""
    with pytest.raises(ValueError):
        client.get_asset_url("Publisher", "Book", "../../../etc/passwd")


@pytest.mark.asyncio
async def test_download_asset_validates_path(client, mock_token_response):
    """Test that download_asset() validates asset_path."""
    with patch.object(client._client, "post") as mock_post:
        auth_response = Mock()
        auth_response.status_code = 200
        auth_response.json.return_value = mock_token_response
        auth_response.raise_for_status = Mock()
        mock_post.return_value = auth_response

        with pytest.raises(ValueError):
            await client.download_asset("Publisher", "Book", "../../../etc/passwd")
