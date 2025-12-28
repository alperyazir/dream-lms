"""
Dream Central Storage HTTP Client Service.

This module provides a reusable async HTTP client for interacting with
the Dream Central Storage REST API, including JWT authentication, retry logic,
response caching, and comprehensive error handling.
"""

import asyncio
import hashlib
import logging
from collections.abc import AsyncGenerator
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote as url_quote

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
    publisher_id: int | None = None  # Publisher ID for dcs_id mapping
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


class PublisherRead(BaseModel):
    """Publisher data model from Dream Central Storage API."""

    id: int
    name: str
    contact_email: str | None = None
    logo_url: str | None = None


class PublisherListResponse(BaseModel):
    """Response model for listing publishers from DCS."""

    items: list[PublisherRead]
    total: int


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

    async def list_books(self, publisher_id: int | None = None) -> list[BookRead]:
        """
        Fetch books from Dream Central Storage, optionally filtered by publisher.

        Args:
            publisher_id: Optional publisher ID to filter by

        Returns:
            List[BookRead]: List of books (all or filtered by publisher)

        Raises:
            DreamStorageError: If request fails
        """
        # Build query parameters
        params = {}
        if publisher_id is not None:
            params["publisher_id"] = publisher_id

        # Generate cache key
        cache_key = f"list_books:{publisher_id}" if publisher_id else "list_books:all"

        # Check cache
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        # Make request
        response = await self._make_request("GET", "/books/", params=params)
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
            List[str]: Flat list of relative file paths (e.g., "video/1.mp4", "video/1.srt")

        Raises:
            DreamStorageError: If request fails
        """
        url = f"/storage/books/{publisher}/{book_name}"
        response = await self._make_request("GET", url)
        tree_data = response.json()

        # The book path prefix that we want to strip from full paths
        # e.g., "Universal ELT/SwitchtoCLIL/" -> we want just "video/1.mp4"
        book_prefix = f"{publisher}/{book_name}/"

        # DCS returns a nested tree structure. Flatten it to a list of relative paths.
        def flatten_tree(node: dict | list) -> list[str]:
            """Recursively flatten tree structure to list of file paths."""
            results: list[str] = []

            # Handle list of nodes (top-level response or children array)
            if isinstance(node, list):
                for item in node:
                    results.extend(flatten_tree(item))
                return results

            # Handle single node (dict with path, type, children)
            if not isinstance(node, dict):
                return results

            node_path = node.get("path", "")
            node_type = node.get("type", "")
            children = node.get("children", [])

            # If it's a file, add to results (using path from node directly)
            if node_type == "file" and node_path:
                # Strip the book prefix to get relative path
                # e.g., "Universal ELT/SwitchtoCLIL/video/1.mp4" -> "video/1.mp4"
                if node_path.startswith(book_prefix):
                    relative_path = node_path[len(book_prefix):]
                else:
                    relative_path = node_path
                results.append(relative_path)

            # Recurse into children
            if children:
                results.extend(flatten_tree(children))

            return results

        return flatten_tree(tree_data)

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

    async def get_asset_size(
        self,
        publisher: str,
        book_name: str,
        asset_path: str,
    ) -> int:
        """
        Get the size of an asset file without downloading it.

        Uses a Range request to get the total file size from Content-Range header.

        Args:
            publisher: Publisher name
            book_name: Book name
            asset_path: Relative path to asset

        Returns:
            File size in bytes

        Raises:
            DreamStorageNotFoundError: If asset doesn't exist
            DreamStorageError: If request fails
        """
        self._validate_asset_path(asset_path)

        # Get valid token
        token = await self._get_valid_token()

        url = f"{settings.DREAM_CENTRAL_STORAGE_URL}/storage/books/{publisher}/{book_name}/object"
        params = {"path": asset_path}
        headers = {
            "Authorization": f"Bearer {token}",
            "Range": "bytes=0-0",  # Request first byte to get total size
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params, headers=headers)

            if response.status_code == 404:
                raise DreamStorageNotFoundError(f"Asset not found: {asset_path}")

            if response.status_code not in (200, 206):
                raise DreamStorageError(f"Unexpected status: {response.status_code}")

            # Parse Content-Range to get total size
            content_range = response.headers.get("Content-Range")
            if content_range:
                # Format: "bytes 0-0/782836"
                try:
                    total_size = int(content_range.split("/")[1])
                    return total_size
                except (IndexError, ValueError) as e:
                    raise DreamStorageError(f"Invalid Content-Range header: {content_range}") from e

            # Fallback to Content-Length if no Content-Range
            content_length = response.headers.get("Content-Length")
            if content_length:
                return int(content_length)

            raise DreamStorageError("Unable to determine file size")

    async def stream_asset(
        self,
        publisher: str,
        book_name: str,
        asset_path: str,
        start: int = 0,
        end: int | None = None,
        chunk_size: int = 32 * 1024,
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream an asset file with optional byte range.

        Args:
            publisher: Publisher name
            book_name: Book name
            asset_path: Relative path to asset
            start: Start byte position
            end: End byte position (None for end of file)
            chunk_size: Size of chunks to yield (default 32KB)

        Yields:
            Bytes chunks of the file

        Raises:
            DreamStorageNotFoundError: If asset doesn't exist
            DreamStorageError: If request fails
        """
        self._validate_asset_path(asset_path)

        # Get valid token
        token = await self._get_valid_token()

        url = f"{settings.DREAM_CENTRAL_STORAGE_URL}/storage/books/{publisher}/{book_name}/object"
        params = {"path": asset_path}
        headers = {"Authorization": f"Bearer {token}"}

        # Add Range header if specified
        if end is not None:
            headers["Range"] = f"bytes={start}-{end}"
        elif start > 0:
            headers["Range"] = f"bytes={start}-"

        # Use longer timeout for streaming (120s for large files)
        timeout = httpx.Timeout(connect=5.0, read=120.0, write=10.0, pool=5.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("GET", url, params=params, headers=headers) as response:
                if response.status_code == 404:
                    raise DreamStorageNotFoundError(f"Asset not found: {asset_path}")

                if response.status_code == 416:
                    raise DreamStorageError("Range not satisfiable")

                if response.status_code not in (200, 206):
                    raise DreamStorageError(f"Unexpected status: {response.status_code}")

                async for chunk in response.aiter_bytes(chunk_size):
                    yield chunk


    async def list_videos(
        self, publisher: str, book_name: str
    ) -> list[dict[str, Any]]:
        """
        List available video files in a book's DCS storage.

        Args:
            publisher: Publisher name
            book_name: Book name

        Returns:
            List of video info dicts with path, name, size_bytes, has_subtitles

        Raises:
            DreamStorageError: If request fails
        """
        cache_key = self._generate_cache_key("list_videos", publisher, book_name)

        # Check cache
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        # Get all files in the book directory
        all_files = await self.list_book_contents(publisher, book_name)

        # Filter for video files
        video_extensions = (".mp4", ".webm", ".ogg", ".mov")
        videos: list[dict[str, Any]] = []

        for file_path in all_files:
            if file_path.lower().endswith(video_extensions):
                # Check if subtitle file exists
                srt_path = file_path.rsplit(".", 1)[0] + ".srt"
                has_subtitles = srt_path in all_files

                # Get file name from path
                file_name = file_path.split("/")[-1] if "/" in file_path else file_path

                # Get file size
                try:
                    size_bytes = await self.get_asset_size(publisher, book_name, file_path)
                except Exception as e:
                    logger.warning(f"Could not get size for {file_path}: {e}")
                    size_bytes = 0

                videos.append(
                    {
                        "path": file_path,
                        "name": file_name,
                        "size_bytes": size_bytes,
                        "has_subtitles": has_subtitles,
                    }
                )

        # Cache for 15 minutes
        self._set_cached(cache_key, videos, ttl_seconds=15 * 60)

        return videos

    # ========================================================================
    # Teacher Materials Storage (Story 13.1)
    # ========================================================================

    TEACHERS_BUCKET = "teachers"

    async def upload_teacher_material(
        self,
        teacher_id: str,
        file_content: bytes,
        filename: str,
        content_type: str,
        material_type: str,
    ) -> str:
        """
        Upload a file to teacher's personal storage.

        Uses the DCS /teachers/{teacher_uuid}/upload endpoint which expects
        multipart/form-data with a 'file' field.

        Args:
            teacher_id: Teacher UUID string
            file_content: File bytes
            filename: Original filename
            content_type: MIME type
            material_type: Category (document, image, audio, video)

        Returns:
            Storage path in format "{category}/{filename}"

        Raises:
            DreamStorageError: If upload fails
        """
        # Get valid token
        token = await self._get_valid_token()

        # Use DCS teacher upload endpoint
        url = f"{settings.DREAM_CENTRAL_STORAGE_URL}/teachers/{teacher_id}/upload"

        # Prepare multipart form data
        files = {
            "file": (filename, file_content, content_type)
        }

        # Use longer timeout for uploads
        timeout = httpx.Timeout(connect=5.0, read=120.0, write=120.0, pool=5.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                url,
                files=files,
                headers={"Authorization": f"Bearer {token}"},
            )

            if response.status_code == 404:
                raise DreamStorageNotFoundError(f"Teacher storage not found: {teacher_id}")

            if response.status_code == 413:
                raise DreamStorageError("File too large for storage")

            if response.status_code == 422:
                detail = response.json().get("detail", "Validation error")
                raise DreamStorageError(f"Upload validation failed: {detail}")

            if response.status_code not in (200, 201):
                raise DreamStorageError(
                    f"Upload failed with status {response.status_code}: {response.text}"
                )

            # Parse response to get the storage path
            result = response.json()
            # DCS returns: {teacher_id, filename, path, size, content_type}
            # path format: "{teacher_id}/materials/{filename}"
            storage_path = result.get("path")
            if not storage_path:
                # Fallback for older API versions
                storage_path = f"{teacher_id}/materials/{result.get('filename', 'unknown')}"

            logger.info(f"Uploaded teacher material: {storage_path}")
            return storage_path

    async def download_teacher_material(
        self,
        teacher_id: str,
        storage_path: str,
    ) -> bytes:
        """
        Download a file from teacher's storage.

        Uses DCS /teachers/{teacher_id}/materials/{path} endpoint which directly
        streams the file content.

        Args:
            teacher_id: Teacher UUID string
            storage_path: Storage path in format "{teacher_uuid}/materials/{filename}"

        Returns:
            File bytes

        Raises:
            ValueError: If path format is invalid
            DreamStorageError: If download fails
        """
        # Parse storage path: {teacher_uuid}/materials/{filename}
        parts = storage_path.split("/", 2)
        if len(parts) != 3:
            raise ValueError(f"Invalid storage path format: {storage_path}")
        _teacher_uuid, _materials, filename = parts

        # Get valid token
        token = await self._get_valid_token()

        # URL-encode filename for Unicode support (e.g., Turkish characters)
        encoded_filename = url_quote(filename, safe="")

        # New DCS endpoint directly streams file content
        url = f"{settings.DREAM_CENTRAL_STORAGE_URL}/teachers/{teacher_id}/materials/{encoded_filename}"

        timeout = httpx.Timeout(connect=5.0, read=60.0, write=10.0, pool=5.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
            )

            if response.status_code == 404:
                raise DreamStorageNotFoundError(f"Material not found: {storage_path}")

            if response.status_code not in (200, 206):
                raise DreamStorageError(
                    f"Failed to download file: {response.status_code}"
                )

            return response.content

    async def stream_teacher_material(
        self,
        teacher_id: str,
        storage_path: str,
        start: int = 0,
        end: int | None = None,
        chunk_size: int = 32 * 1024,
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream a file from teacher's storage with optional byte range.

        Uses DCS /teachers/{teacher_id}/materials/{path} endpoint which directly
        streams the file content with Range header support.

        Args:
            teacher_id: Teacher UUID string
            storage_path: Storage path in format "{teacher_uuid}/materials/{filename}"
            start: Start byte position
            end: End byte position (None for end of file)
            chunk_size: Size of chunks to yield (default 32KB)

        Yields:
            Bytes chunks of the file

        Raises:
            ValueError: If path format is invalid
            DreamStorageError: If streaming fails
        """
        # Parse storage path: {teacher_uuid}/materials/{filename}
        parts = storage_path.split("/", 2)
        if len(parts) != 3:
            raise ValueError(f"Invalid storage path format: {storage_path}")
        _teacher_uuid, _materials, filename = parts

        # Get valid token
        token = await self._get_valid_token()

        # URL-encode filename for Unicode support (e.g., Turkish characters)
        encoded_filename = url_quote(filename, safe="")

        # New DCS endpoint directly streams file content with Range support
        url = f"{settings.DREAM_CENTRAL_STORAGE_URL}/teachers/{teacher_id}/materials/{encoded_filename}"

        timeout = httpx.Timeout(connect=5.0, read=120.0, write=10.0, pool=5.0)

        # Prepare headers for streaming with range support
        headers = {"Authorization": f"Bearer {token}"}
        if end is not None:
            headers["Range"] = f"bytes={start}-{end}"
        elif start > 0:
            headers["Range"] = f"bytes={start}-"

        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("GET", url, headers=headers) as stream_response:
                if stream_response.status_code == 404:
                    raise DreamStorageNotFoundError(f"Material not found: {storage_path}")

                if stream_response.status_code == 416:
                    raise DreamStorageError("Range not satisfiable")

                if stream_response.status_code not in (200, 206):
                    raise DreamStorageError(f"Unexpected status: {stream_response.status_code}")

                async for chunk in stream_response.aiter_bytes(chunk_size):
                    yield chunk

    async def delete_teacher_material(
        self,
        teacher_id: str,
        storage_path: str,
    ) -> None:
        """
        Delete a file from teacher's storage.

        Uses DCS /teachers/{teacher_id}/materials/{path} DELETE endpoint.

        Args:
            teacher_id: Teacher UUID string
            storage_path: Storage path in format "{teacher_uuid}/materials/{filename}"

        Raises:
            ValueError: If path format is invalid
            DreamStorageError: If deletion fails
        """
        # Parse storage path: {teacher_uuid}/materials/{filename}
        parts = storage_path.split("/", 2)
        if len(parts) != 3:
            raise ValueError(f"Invalid storage path format: {storage_path}")
        _teacher_uuid, _materials, filename = parts

        # Get valid token
        token = await self._get_valid_token()

        # URL-encode filename for Unicode support (e.g., Turkish characters)
        encoded_filename = url_quote(filename, safe="")

        # New DCS endpoint for deleting materials
        url = f"{settings.DREAM_CENTRAL_STORAGE_URL}/teachers/{teacher_id}/materials/{encoded_filename}"

        timeout = httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.delete(
                url,
                headers={"Authorization": f"Bearer {token}"},
            )

            if response.status_code == 404:
                # File already deleted or never existed - not an error
                logger.warning(f"Material not found for deletion: {storage_path}")
                return

            if response.status_code not in (200, 204):
                raise DreamStorageError(
                    f"Failed to delete material: {response.status_code}"
                )

        logger.info(f"Deleted teacher material: {storage_path}")

    async def get_teacher_material_presigned_url(
        self,
        teacher_id: str,
        storage_path: str,
        expires_minutes: int = 60,
    ) -> dict:
        """
        Get URL info for browser access to a teacher material.

        Note: The new DCS API no longer provides presigned URLs. This function
        now verifies the file exists and returns metadata. The frontend should
        use the authenticated streaming endpoint instead.

        Args:
            teacher_id: Teacher UUID string
            storage_path: Storage path in format "{teacher_uuid}/materials/{filename}"
            expires_minutes: URL expiry in minutes (for compatibility, not used)

        Returns:
            Dict with path, size, content_type

        Raises:
            ValueError: If path format is invalid
            DreamStorageError: If request fails
        """
        # Parse storage path: {teacher_uuid}/materials/{filename}
        parts = storage_path.split("/", 2)
        if len(parts) != 3:
            raise ValueError(f"Invalid storage path format: {storage_path}")
        _teacher_uuid, _materials, filename = parts

        # Verify file exists with Range request (HEAD not supported by DCS)
        token = await self._get_valid_token()

        # URL-encode filename for Unicode support (e.g., Turkish characters)
        encoded_filename = url_quote(filename, safe="")

        url = f"{settings.DREAM_CENTRAL_STORAGE_URL}/teachers/{teacher_id}/materials/{encoded_filename}"

        timeout = httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            # Use Range request to get first byte - this verifies file exists and gets metadata
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Range": "bytes=0-0",
                },
            )

            if response.status_code == 404:
                raise DreamStorageNotFoundError(f"Material not found: {storage_path}")

            if response.status_code not in (200, 206):
                raise DreamStorageError(
                    f"Failed to verify material: {response.status_code}"
                )

            # Parse size from Content-Range header (format: "bytes 0-0/total_size")
            content_range = response.headers.get("content-range", "")
            size = 0
            if "/" in content_range:
                try:
                    size = int(content_range.split("/")[1])
                except (IndexError, ValueError):
                    pass

            return {
                "path": storage_path,
                "size": size,
                "content_type": response.headers.get("content-type", "application/octet-stream"),
                "expires_in_seconds": expires_minutes * 60,
            }

    async def get_teacher_material_size(
        self,
        teacher_id: str,
        storage_path: str,
    ) -> int:
        """
        Get the size of a teacher material file without downloading it.

        Uses Range request to get Content-Range header (HEAD not supported by DCS).

        Args:
            teacher_id: Teacher UUID string
            storage_path: Storage path in format "{teacher_uuid}/materials/{filename}"

        Returns:
            File size in bytes

        Raises:
            ValueError: If path format is invalid
            DreamStorageError: If request fails
        """
        # Parse storage path: {teacher_uuid}/materials/{filename}
        parts = storage_path.split("/", 2)
        if len(parts) != 3:
            raise ValueError(f"Invalid storage path format: {storage_path}")
        _teacher_uuid, _materials, filename = parts

        # Get valid token
        token = await self._get_valid_token()

        # URL-encode filename for Unicode support (e.g., Turkish characters)
        encoded_filename = url_quote(filename, safe="")

        # New DCS endpoint for materials
        url = f"{settings.DREAM_CENTRAL_STORAGE_URL}/teachers/{teacher_id}/materials/{encoded_filename}"

        timeout = httpx.Timeout(connect=5.0, read=10.0, write=10.0, pool=5.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            # Use Range request to get first byte - Content-Range header contains total size
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Range": "bytes=0-0",
                },
            )

            if response.status_code == 404:
                raise DreamStorageNotFoundError(f"Material not found: {storage_path}")

            if response.status_code not in (200, 206):
                raise DreamStorageError(
                    f"Failed to get file size: {response.status_code}"
                )

            # Parse size from Content-Range header (format: "bytes 0-0/total_size")
            content_range = response.headers.get("content-range", "")
            if "/" in content_range:
                try:
                    return int(content_range.split("/")[1])
                except (IndexError, ValueError):
                    pass

            raise DreamStorageError("Unable to determine file size")

    async def get_publisher_logo(self, dcs_id: int) -> tuple[bytes, str] | None:
        """
        Fetch publisher logo from DCS.

        Uses DCS REST API endpoint to fetch publisher logo.

        Args:
            dcs_id: Publisher ID in Dream Central Storage

        Returns:
            Tuple of (content_bytes, mime_type) or None if not found

        Raises:
            DreamStorageError: If DCS request fails (except 404)
        """
        try:
            # Use DCS REST API endpoint for publisher logos
            url = f"/publishers/{dcs_id}/logo"
            response = await self._make_request("GET", url)

            # Detect MIME type from response headers or content
            content_type = response.headers.get("content-type", "image/png")

            return (response.content, content_type)
        except DreamStorageNotFoundError:
            # Logo not found in DCS
            return None
        except DreamStorageError:
            # Re-raise DCS errors (auth, server errors, etc.)
            raise
        except Exception as e:
            logger.warning(f"Error fetching logo for DCS publisher {dcs_id}: {e}")
            return None

    async def list_publishers(self) -> list[PublisherRead]:
        """
        Fetch all publishers from DCS.

        Used for initial/bulk sync on LMS startup.

        Returns:
            List of PublisherRead objects

        Raises:
            DreamStorageError: If DCS request fails
        """
        try:
            response = await self._make_request("GET", "/publishers/")
            data = response.json()

            # Handle both list and paginated response formats
            if isinstance(data, list):
                return [PublisherRead(**p) for p in data]
            elif isinstance(data, dict) and "items" in data:
                return [PublisherRead(**p) for p in data["items"]]
            else:
                logger.warning(f"Unexpected publishers response format: {type(data)}")
                return []
        except DreamStorageError:
            raise
        except Exception as e:
            logger.error(f"Error fetching publishers list: {e}")
            raise DreamStorageError(f"Failed to fetch publishers: {e}") from e

    async def get_publisher_by_id(self, publisher_id: int) -> PublisherRead | None:
        """
        Fetch single publisher by DCS ID.

        Args:
            publisher_id: Publisher ID in Dream Central Storage

        Returns:
            PublisherRead object or None if not found

        Raises:
            DreamStorageError: If DCS request fails (except 404)
        """
        try:
            response = await self._make_request("GET", f"/publishers/{publisher_id}")
            return PublisherRead(**response.json())
        except DreamStorageNotFoundError:
            return None
        except DreamStorageError:
            raise
        except Exception as e:
            logger.error(f"Error fetching publisher {publisher_id}: {e}")
            raise DreamStorageError(f"Failed to fetch publisher: {e}") from e

    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename for safe storage.

        Args:
            filename: Original filename

        Returns:
            Sanitized filename safe for storage
        """
        import os
        import re
        import unicodedata

        # Normalize unicode
        filename = unicodedata.normalize("NFKD", filename)

        # Keep only safe characters (alphanumeric, underscore, hyphen, dot, space)
        filename = re.sub(r"[^\w\s\-\.]", "", filename)

        # Replace spaces with underscores
        filename = filename.replace(" ", "_")

        # Remove consecutive underscores/dots
        filename = re.sub(r"_{2,}", "_", filename)
        filename = re.sub(r"\.{2,}", ".", filename)

        # Limit length (preserve extension)
        name, ext = os.path.splitext(filename)
        if len(name) > 100:
            name = name[:100]

        return f"{name}{ext}"


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
