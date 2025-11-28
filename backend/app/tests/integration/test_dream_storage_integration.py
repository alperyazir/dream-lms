"""
Integration tests for Dream Central Storage Client.

These tests communicate with an actual Dream Central Storage instance
running at localhost:8081 (development credentials).

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


@pytest.mark.asyncio
async def test_authenticate_with_real_api(client):
    """Test actual authentication with Dream Central Storage."""
    token_response = await client.authenticate()

    assert token_response.access_token is not None
    assert len(token_response.access_token) > 0
    assert token_response.token_type == "bearer"


@pytest.mark.asyncio
async def test_get_books_from_real_api(client):
    """Test fetching real book list from Dream Central Storage."""
    books = await client.get_books()

    # Should return a list (may be empty if no books in dev environment)
    assert isinstance(books, list)
    # If books exist, verify structure
    if len(books) > 0:
        assert hasattr(books[0], "id")
        assert hasattr(books[0], "book_name")
        assert hasattr(books[0], "publisher")


@pytest.mark.asyncio
async def test_get_book_config_from_real_api(client):
    """Test fetching real config.json from Dream Central Storage."""
    # First, get list of books to find a valid book
    books = await client.get_books()

    if len(books) == 0:
        pytest.skip("No books available in Dream Central Storage for testing")

    # Get config for first book
    book = books[0]
    config = await client.get_book_config(book.publisher, book.book_name)

    # Verify config structure
    assert isinstance(config, dict)
    assert "book_title" in config or "books" in config  # Basic config structure


@pytest.mark.asyncio
async def test_list_book_contents_from_real_api(client):
    """Test listing book contents from Dream Central Storage."""
    books = await client.get_books()

    if len(books) == 0:
        pytest.skip("No books available in Dream Central Storage for testing")

    # List contents for first book
    book = books[0]
    contents = await client.list_book_contents(book.publisher, book.book_name)

    # Should return a list of file paths
    assert isinstance(contents, list)


@pytest.mark.asyncio
async def test_download_asset_from_real_api(client):
    """Test downloading a real asset from Dream Central Storage."""
    books = await client.get_books()

    if len(books) == 0:
        pytest.skip("No books available in Dream Central Storage for testing")

    # Try to download config.json (should always exist)
    book = books[0]
    try:
        asset_data = await client.download_asset(book.publisher, book.book_name, "config.json")

        # Should return bytes
        assert isinstance(asset_data, bytes)
        assert len(asset_data) > 0

        # Config should be valid JSON (starts with { or [)
        assert asset_data[0:1] in [b"{", b"["]
    except DreamStorageNotFoundError:
        # Asset might not exist, which is acceptable
        pass


@pytest.mark.asyncio
async def test_404_error_for_nonexistent_book(client):
    """Test handling of 404 errors for nonexistent resources."""
    # Try to get a book with an ID that doesn't exist
    book = await client.get_book_by_id(999999)

    # Should return None for 404
    assert book is None


@pytest.mark.asyncio
async def test_token_reuse_across_requests(client):
    """Test that token is reused across multiple API calls."""
    # Make first request
    books1 = await client.get_books()

    # Get current token
    token1 = client._token

    # Make second request
    books2 = await client.get_books()

    # Token should be the same (reused)
    token2 = client._token
    assert token1 == token2


@pytest.mark.asyncio
async def test_caching_works_with_real_api(client):
    """Test that response caching works with real API."""
    # Clear any existing cache
    client.invalidate_cache()

    # First call - should hit API
    books1 = await client.get_books()

    # Check that cache has data
    assert len(client._cache) > 0

    # Second call - should use cache
    books2 = await client.get_books()

    # Results should be identical
    assert len(books1) == len(books2)
    if len(books1) > 0:
        assert books1[0].id == books2[0].id


@pytest.mark.asyncio
async def test_get_asset_url_generates_valid_url(client):
    """Test that get_asset_url generates a valid URL."""
    books = await client.get_books()

    if len(books) == 0:
        pytest.skip("No books available in Dream Central Storage for testing")

    book = books[0]
    url = client.get_asset_url(book.publisher, book.book_name, "images/cover.png")

    # URL should be properly formatted
    assert url.startswith("http")
    assert book.publisher in url
    assert book.book_name in url
    assert "object?path=" in url
