"""
Dream Central Storage HTTP Client Service.

This module provides a reusable async HTTP client for interacting with
the Dream Central Storage REST API, including JWT authentication, retry logic,
response caching, and comprehensive error handling.
"""

import asyncio
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================================================
# Exception Classes
# ============================================================================


class DreamStorageError(Exception):
    """Base exception for Dream Central Storage errors."""

    pass


class DreamStorageAuthError(DreamStorageError):
    """Authentication failed (401)."""

    pass


class DreamStorageForbiddenError(DreamStorageError):
    """Insufficient permissions (403)."""

    pass


class DreamStorageNotFoundError(DreamStorageError):
    """Resource not found (404)."""

    pass


class DreamStorageServerError(DreamStorageError):
    """Server error (5xx)."""

    pass


# ============================================================================
# Response Models
# ============================================================================


class TokenResponse(BaseModel):
    """JWT token response from authentication endpoint."""

    access_token: str
    token_type: str


class BookRead(BaseModel):
    """Book data model from Dream Central Storage API."""

    id: int
    book_name: str
    publisher: str
    book_title: str | None = None  # DCS uses 'book_title' not 'title'
    book_cover: str | None = None
    description: str | None = None
    status: str | None = None
    activity_count: int | None = None  # Total activity count from DCS
    activity_details: dict[str, int] | None = None  # Activity breakdown by type
    language: str | None = None
    category: str | None = None

    @property
    def title(self) -> str:
        """Get display title (book_title if available, otherwise book_name)."""
        return self.book_title or self.book_name


# ============================================================================
# Dream Central Storage Client
# ============================================================================


class DreamCentralStorageClient:
    """
    Async HTTP client for Dream Central Storage REST API.

    Features:
    - JWT authentication with automatic token refresh
    - Retry logic with exponential backoff
    - Response caching (15-min for books, 30-min for configs)
    - Connection pooling (max 10 concurrent connections)
    - Comprehensive error handling and logging

    Usage:
        client = DreamCentralStorageClient()
        books = await client.get_books()
        await client.close()

    Or use as context manager:
        async with DreamCentralStorageClient() as client:
            books = await client.get_books()
    """

    def __init__(self) -> None:
        """Initialize the Dream Central Storage client."""
        # Configure connection limits
        limits = httpx.Limits(
            max_connections=10, max_keepalive_connections=5  # Max concurrent connections  # Reuse connections
        )

        # Configure timeouts
        # Note: We'll override timeout for downloads
        timeout = httpx.Timeout(
            connect=5.0,  # Connection timeout
            read=30.0,  # Default read timeout for API calls
            write=10.0,  # Write timeout
            pool=5.0,  # Pool acquisition timeout
        )

        # Initialize HTTP client
        self._client = httpx.AsyncClient(
            base_url=settings.DREAM_CENTRAL_STORAGE_URL, limits=limits, timeout=timeout
        )

        # Token cache
        self._token: str | None = None
        self._token_expires_at: datetime | None = None
        self._token_lock = asyncio.Lock()

        # Response cache
        self._cache: dict[str, dict[str, Any]] = {}

        logger.info("DreamCentralStorageClient initialized")

    async def __aenter__(self) -> "DreamCentralStorageClient":
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Async context manager exit."""
        await self.close()

    async def close(self) -> None:
        """Close the HTTP client and release resources."""
        await self._client.aclose()
        logger.info("DreamCentralStorageClient closed")

    # ========================================================================
    # Authentication
    # ========================================================================

    async def authenticate(self) -> TokenResponse:
        """
        Authenticate with Dream Central Storage and obtain JWT token.

        Returns:
            TokenResponse: JWT access token and token type

        Raises:
            DreamStorageAuthError: If authentication fails
        """
        logger.info("Authenticating with Dream Central Storage")

        try:
            response = await self._client.post(
                "/auth/login",
                json={
                    "email": settings.DREAM_CENTRAL_STORAGE_EMAIL,
                    "password": settings.DREAM_CENTRAL_STORAGE_PASSWORD,
                },
            )
            response.raise_for_status()

            data = response.json()
            token_response = TokenResponse(**data)

            # Cache token with expiration
            self._token = token_response.access_token
            # Refresh 5 minutes before expiry (5 * 60 = 300 seconds)
            expiry_seconds = settings.DREAM_CENTRAL_STORAGE_TOKEN_EXPIRY - 300
            self._token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expiry_seconds)

            logger.info("Authentication successful, token cached")
            return token_response

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.error("Authentication failed: invalid credentials")
                raise DreamStorageAuthError("Invalid credentials") from e
            raise DreamStorageServerError(f"Server error during authentication: {e}") from e
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            raise DreamStorageAuthError(f"Authentication failed: {e}") from e

    async def _get_valid_token(self) -> str:
        """
        Get a valid JWT token, refreshing if necessary.

        This method is thread-safe and ensures only one token refresh happens at a time.

        Returns:
            str: Valid JWT access token

        Raises:
            DreamStorageAuthError: If unable to obtain valid token
        """
        async with self._token_lock:
            # Check if we need to refresh token
            if self._token is None or self._token_expires_at is None:
                # No token, authenticate
                await self.authenticate()
            elif datetime.now(timezone.utc) >= self._token_expires_at:
                # Token expired or about to expire, refresh
                logger.info("Token expired, refreshing...")
                await self.authenticate()

            if self._token is None:
                raise DreamStorageAuthError("Failed to obtain valid token")

            return self._token

    # ========================================================================
    # Caching
    # ========================================================================

    def _generate_cache_key(self, method: str, *args: Any, **kwargs: Any) -> str:
        """Generate cache key from method name and parameters."""
        params_str = f"{args}:{kwargs}"
        params_hash = hashlib.md5(params_str.encode()).hexdigest()[:8]
        return f"{method}:{params_hash}"

    def _get_cached(self, key: str) -> Any | None:
        """Get cached value if not expired."""
        if key in self._cache:
            cache_entry = self._cache[key]
            if datetime.now(timezone.utc) < cache_entry["expires_at"]:
                logger.debug(f"Cache hit: {key}")
                return cache_entry["data"]
            else:
                # Expired, remove from cache
                logger.debug(f"Cache expired: {key}")
                del self._cache[key]

        logger.debug(f"Cache miss: {key}")
        return None

    def _set_cached(self, key: str, data: Any, ttl_seconds: int) -> None:
        """Set cached value with TTL."""
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
        self._cache[key] = {"data": data, "expires_at": expires_at}
        logger.debug(f"Cache set: {key} (TTL: {ttl_seconds}s)")

    def invalidate_cache(self) -> None:
        """Invalidate all cached data."""
        self._cache.clear()
        logger.info("Cache invalidated")

    # ========================================================================
    # Retry Logic
    # ========================================================================

    async def _make_request(
        self, method: str, url: str, use_long_timeout: bool = False, **kwargs: Any
    ) -> httpx.Response:
        """
        Make HTTP request with retry logic and authentication.

        Args:
            method: HTTP method (GET, POST, etc.)
            url: Request URL
            use_long_timeout: Use 60s timeout for large downloads
            **kwargs: Additional request parameters

        Returns:
            httpx.Response: HTTP response

        Raises:
            DreamStorageAuthError: Authentication failed
            DreamStorageForbiddenError: Insufficient permissions
            DreamStorageNotFoundError: Resource not found
            DreamStorageServerError: Server error after retries
        """
        # Get valid token
        token = await self._get_valid_token()

        # Add authorization header
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {token}"

        # Override timeout for downloads
        if use_long_timeout:
            kwargs["timeout"] = 60.0

        # Make request with retry logic
        attempt = 0
        max_retries = 3

        while attempt <= max_retries:
            try:
                logger.debug(f"API request: {method} {url} (attempt {attempt + 1}/{max_retries + 1})")

                start_time = datetime.now(timezone.utc)
                response = await self._client.request(method, url, headers=headers, **kwargs)
                elapsed_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

                logger.debug(f"API response: {response.status_code} in {elapsed_ms:.0f}ms")

                # Handle specific status codes
                if response.status_code == 401:
                    # Unauthorized - refresh token and retry once
                    if attempt == 0:
                        logger.warning("Received 401, refreshing token...")
                        # Clear token and re-authenticate (no lock needed here)
                        self._token = None
                        self._token_expires_at = None
                        token_response = await self.authenticate()
                        headers["Authorization"] = f"Bearer {token_response.access_token}"
                        attempt += 1
                        continue
                    else:
                        raise DreamStorageAuthError("Authentication failed after token refresh")

                elif response.status_code == 403:
                    # Forbidden - don't retry
                    logger.error(f"Forbidden: {response.text}")
                    raise DreamStorageForbiddenError(f"Insufficient permissions: {response.text}")

                elif response.status_code == 404:
                    # Not found - don't retry
                    logger.warning(f"Resource not found: {url}")
                    raise DreamStorageNotFoundError(f"Resource not found: {url}")

                elif response.status_code == 429:
                    # Rate limited - respect Retry-After header
                    retry_after = int(response.headers.get("Retry-After", 60))
                    logger.warning(f"Rate limited, retrying after {retry_after}s")
                    await asyncio.sleep(retry_after)
                    attempt += 1
                    continue

                elif response.status_code >= 500:
                    # Server error - retry with exponential backoff
                    if attempt < max_retries:
                        delay = 1 * (2**attempt)  # 1s, 2s, 4s
                        logger.warning(
                            f"Server error {response.status_code}, retry {attempt + 1}/{max_retries} after {delay}s"
                        )
                        await asyncio.sleep(delay)
                        attempt += 1
                        continue
                    else:
                        logger.error(f"Server error after {max_retries} retries: {response.text}")
                        raise DreamStorageServerError(
                            f"Server error {response.status_code}: {response.text}"
                        )

                # Success or other status code
                response.raise_for_status()
                return response

            except httpx.TimeoutException as e:
                # Network timeout - retry with exponential backoff
                if attempt < max_retries:
                    delay = 1 * (2**attempt)
                    logger.warning(f"Request timeout, retry {attempt + 1}/{max_retries} after {delay}s")
                    await asyncio.sleep(delay)
                    attempt += 1
                    continue
                else:
                    logger.error(f"Request timeout after {max_retries} retries")
                    raise DreamStorageServerError(f"Request timeout: {e}") from e

            except httpx.NetworkError as e:
                # Network error - retry with exponential backoff
                if attempt < max_retries:
                    delay = 1 * (2**attempt)
                    logger.warning(f"Network error, retry {attempt + 1}/{max_retries} after {delay}s")
                    await asyncio.sleep(delay)
                    attempt += 1
                    continue
                else:
                    logger.error(f"Network error after {max_retries} retries: {e}")
                    raise DreamStorageServerError(f"Network error: {e}") from e

        # Should not reach here
        raise DreamStorageServerError("Max retries exceeded")

    # ========================================================================
    # Security Validation
    # ========================================================================

    def _validate_asset_path(self, asset_path: str) -> None:
        """
        Validate asset path to prevent path traversal attacks.

        Args:
            asset_path: Relative path to asset

        Raises:
            ValueError: If path contains path traversal attempts
        """
        if ".." in asset_path:
            raise ValueError("Invalid asset path: path traversal not allowed (contains '..')")
        if asset_path.startswith("/"):
            raise ValueError("Invalid asset path: absolute paths not allowed")

    # ========================================================================
    # API Methods
    # ========================================================================

    async def get_books(self) -> list[BookRead]:
        """
        Fetch all books from Dream Central Storage.

        Returns:
            List[BookRead]: List of all available books

        Raises:
            DreamStorageError: If request fails
        """
        cache_key = "get_books"

        # Check cache
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        # Make request
        response = await self._make_request("GET", "/books/")
        books_data = response.json()
        books = [BookRead(**book) for book in books_data]

        # Cache for 15 minutes
        self._set_cached(cache_key, books, ttl_seconds=15 * 60)

        return books

    async def get_book_by_id(self, book_id: int) -> BookRead | None:
        """
        Fetch a specific book by ID.

        Args:
            book_id: Book ID in Dream Central Storage

        Returns:
            BookRead: Book data, or None if not found

        Raises:
            DreamStorageError: If request fails (except 404)
        """
        try:
            response = await self._make_request("GET", f"/books/{book_id}")
            return BookRead(**response.json())
        except DreamStorageNotFoundError:
            return None

    async def get_book_config(self, publisher: str, book_name: str) -> dict[str, Any]:
        """
        Fetch config.json for a specific book.

        Args:
            publisher: Publisher name (e.g., "Universal ELT")
            book_name: Book name (e.g., "BRAINS")

        Returns:
            dict: Parsed config.json content

        Raises:
            DreamStorageError: If request fails
        """
        cache_key = self._generate_cache_key("get_book_config", publisher, book_name)

        # Check cache
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        # Make request - use /object endpoint with path parameter
        url = f"/storage/books/{publisher}/{book_name}/object?path=config.json"
        response = await self._make_request("GET", url)
        config_data = response.json()

        # Cache for 30 minutes
        self._set_cached(cache_key, config_data, ttl_seconds=30 * 60)

        return config_data

    async def list_book_contents(self, publisher: str, book_name: str) -> list[str]:
        """
        List all files in a book's storage directory.

        Args:
            publisher: Publisher name
            book_name: Book name

        Returns:
            List[str]: List of file paths

        Raises:
            DreamStorageError: If request fails
        """
        url = f"/storage/books/{publisher}/{book_name}"
        response = await self._make_request("GET", url)
        return response.json()

    def get_asset_url(self, publisher: str, book_name: str, asset_path: str) -> str:
        """
        Generate authenticated URL for downloading a book asset.

        Args:
            publisher: Publisher name
            book_name: Book name
            asset_path: Relative path to asset (e.g., "images/M1/p7m5.jpg")

        Returns:
            str: Full URL to asset with authentication

        Raises:
            ValueError: If asset_path contains path traversal attempts
        """
        self._validate_asset_path(asset_path)
        base_url = settings.DREAM_CENTRAL_STORAGE_URL
        url = f"{base_url}/storage/books/{publisher}/{book_name}/object?path={asset_path}"
        return url

    async def download_asset(self, publisher: str, book_name: str, asset_path: str) -> bytes:
        """
        Download a book asset file.

        Args:
            publisher: Publisher name
            book_name: Book name
            asset_path: Relative path to asset

        Returns:
            bytes: File content

        Raises:
            ValueError: If asset_path contains path traversal attempts
            DreamStorageError: If download fails
        """
        self._validate_asset_path(asset_path)
        url = f"/storage/books/{publisher}/{book_name}/object?path={asset_path}"
        # Use longer timeout for downloads
        response = await self._make_request("GET", url, use_long_timeout=True)
        return response.content


# ============================================================================
# Singleton Instance (optional - can also use dependency injection)
# ============================================================================

_client_instance: DreamCentralStorageClient | None = None


async def get_dream_storage_client() -> DreamCentralStorageClient:
    """
    Get singleton instance of DreamCentralStorageClient.

    This can be used as a FastAPI dependency.

    Usage:
        @app.get("/books")
        async def list_books(
            client: DreamCentralStorageClient = Depends(get_dream_storage_client)
        ):
            return await client.get_books()
    """
    global _client_instance
    if _client_instance is None:
        _client_instance = DreamCentralStorageClient()
    return _client_instance
