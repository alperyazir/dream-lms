"""
DCS AI Service Client.

Provides a high-level interface for fetching AI-processed data from
Dream Central Storage. This client handles caching, error handling,
and provides a clean API for accessing book modules, vocabulary, and audio.
"""

import logging
from typing import TYPE_CHECKING
from urllib.parse import quote

from app.schemas.dcs_ai_data import (
    ModuleDetail,
    ModuleListResponse,
    ModulesMetadataResponse,
    ProcessingMetadata,
    VocabularyResponse,
)
from app.services.dcs_ai.exceptions import (
    DCSAIDataAuthError,
    DCSAIDataConnectionError,
)
from app.services.dcs_cache import CacheKeys, DCSCache
from app.services.dream_storage_client import (
    DreamStorageAuthError,
    DreamStorageNotFoundError,
    DreamStorageServerError,
)

if TYPE_CHECKING:
    from app.services.dream_storage_client import DreamCentralStorageClient

logger = logging.getLogger(__name__)


class DCSAIServiceClient:
    """
    Client for accessing DCS AI-processed book data.

    This client provides methods to fetch pre-processed book data including:
    - Processing metadata and status
    - Book modules with text and topics
    - Vocabulary with translations and audio paths
    - Presigned URLs for audio files

    The client uses caching to reduce API calls and handles errors gracefully
    by returning None for missing resources.

    Example:
        client = DCSAIServiceClient(dcs_client, cache)
        metadata = await client.get_processing_status(book_id=123)
        if metadata and metadata.processing_status == "completed":
            modules = await client.get_modules(book_id=123)
    """

    def __init__(
        self,
        dcs_client: "DreamCentralStorageClient",
        cache: DCSCache,
    ) -> None:
        """
        Initialize the DCS AI Service Client.

        Args:
            dcs_client: DreamCentralStorageClient for making HTTP requests.
            cache: DCSCache for caching responses.
        """
        self._dcs = dcs_client
        self._cache = cache
        logger.info("DCSAIServiceClient initialized")

    async def get_processing_status(self, book_id: int) -> ProcessingMetadata | None:
        """
        Get the AI processing status and metadata for a book.

        Fetches metadata about the book's AI processing including status,
        totals for pages/modules/vocabulary, and language information.

        Args:
            book_id: The DCS book ID.

        Returns:
            ProcessingMetadata if the book has been processed, None if not found.

        Raises:
            DCSAIDataAuthError: If authentication with DCS fails.
            DCSAIDataConnectionError: If connection to DCS fails.
        """
        cache_key = CacheKeys.ai_metadata(book_id)
        cached = await self._cache.get(cache_key)
        if cached is not None:
            logger.debug(f"Cache hit for AI metadata: book_id={book_id}")
            return cached

        logger.debug(f"Fetching AI metadata from DCS: book_id={book_id}")
        try:
            response = await self._dcs._make_request(
                "GET", f"/books/{book_id}/ai-data/metadata"
            )
            data = ProcessingMetadata(**response.json())
            await self._cache.set(cache_key, data, ttl=CacheKeys.AI_METADATA_TTL)
            logger.info(
                f"AI metadata fetched: book_id={book_id}, status={data.processing_status}"
            )
            return data

        except DreamStorageNotFoundError:
            logger.info(f"AI metadata not found: book_id={book_id}")
            return None

        except DreamStorageAuthError as e:
            logger.error(f"DCS auth error fetching AI metadata: book_id={book_id}")
            raise DCSAIDataAuthError(
                message=f"Authentication failed: {e}", book_id=book_id
            ) from e

        except DreamStorageServerError as e:
            logger.error(
                f"DCS server error fetching AI metadata: book_id={book_id}, error={e}"
            )
            raise DCSAIDataConnectionError(
                message=f"Connection failed: {e}",
                book_id=book_id,
                original_error=e,
            ) from e

    async def get_modules(self, book_id: int) -> ModuleListResponse | None:
        """
        Get the list of modules for a book.

        Fetches summary information for all modules including IDs, titles,
        page numbers, and word counts.

        Args:
            book_id: The DCS book ID.

        Returns:
            ModuleListResponse with module summaries, None if not found.

        Raises:
            DCSAIDataAuthError: If authentication with DCS fails.
            DCSAIDataConnectionError: If connection to DCS fails.
        """
        cache_key = CacheKeys.ai_modules(book_id)
        cached = await self._cache.get(cache_key)
        if cached is not None:
            logger.debug(f"Cache hit for AI modules: book_id={book_id}")
            return cached

        logger.debug(f"Fetching AI modules from DCS: book_id={book_id}")
        try:
            response = await self._dcs._make_request(
                "GET", f"/books/{book_id}/ai-data/modules"
            )
            data = ModuleListResponse(**response.json())
            await self._cache.set(cache_key, data, ttl=CacheKeys.AI_MODULES_TTL)
            logger.info(
                f"AI modules fetched: book_id={book_id}, count={data.total_modules}"
            )
            return data

        except DreamStorageNotFoundError:
            logger.info(f"AI modules not found: book_id={book_id}")
            return None

        except DreamStorageAuthError as e:
            logger.error(f"DCS auth error fetching AI modules: book_id={book_id}")
            raise DCSAIDataAuthError(
                message=f"Authentication failed: {e}", book_id=book_id
            ) from e

        except DreamStorageServerError as e:
            logger.error(
                f"DCS server error fetching AI modules: book_id={book_id}, error={e}"
            )
            raise DCSAIDataConnectionError(
                message=f"Connection failed: {e}",
                book_id=book_id,
                original_error=e,
            ) from e

    async def get_modules_metadata(self, book_id: int) -> ModulesMetadataResponse | None:
        """
        Get metadata for all modules in a book including topics and vocabulary counts.

        This endpoint returns comprehensive metadata for all modules in a single call,
        making it more efficient than fetching each module's details individually.
        Includes topics, difficulty levels, and vocabulary counts needed for
        topic-based question generation.

        Args:
            book_id: The DCS book ID.

        Returns:
            ModulesMetadataResponse with book and module metadata, None if not found.

        Raises:
            DCSAIDataAuthError: If authentication with DCS fails.
            DCSAIDataConnectionError: If connection to DCS fails.
        """
        cache_key = CacheKeys.ai_modules_metadata(book_id)
        cached = await self._cache.get(cache_key)
        if cached is not None:
            logger.debug(f"Cache hit for AI modules metadata: book_id={book_id}")
            return cached

        logger.debug(f"Fetching AI modules metadata from DCS: book_id={book_id}")
        try:
            response = await self._dcs._make_request(
                "GET", f"/books/{book_id}/ai-data/modules/metadata"
            )
            data = ModulesMetadataResponse(**response.json())
            await self._cache.set(cache_key, data, ttl=CacheKeys.AI_MODULES_TTL)
            logger.info(
                f"AI modules metadata fetched: book_id={book_id}, "
                f"modules={data.module_count}, book_name={data.book_name}"
            )
            return data

        except DreamStorageNotFoundError:
            logger.info(f"AI modules metadata not found: book_id={book_id}")
            return None

        except DreamStorageAuthError as e:
            logger.error(f"DCS auth error fetching AI modules metadata: book_id={book_id}")
            raise DCSAIDataAuthError(
                message=f"Authentication failed: {e}", book_id=book_id
            ) from e

        except DreamStorageServerError as e:
            logger.error(
                f"DCS server error fetching AI modules metadata: book_id={book_id}, error={e}"
            )
            raise DCSAIDataConnectionError(
                message=f"Connection failed: {e}",
                book_id=book_id,
                original_error=e,
            ) from e

    async def get_module_detail(
        self, book_id: int, module_id: int
    ) -> ModuleDetail | None:
        """
        Get detailed information for a specific module.

        Fetches full module data including text content, topics,
        vocabulary IDs, language, and difficulty level.

        Args:
            book_id: The DCS book ID.
            module_id: The module ID within the book.

        Returns:
            ModuleDetail with full module data, None if not found.

        Raises:
            DCSAIDataAuthError: If authentication with DCS fails.
            DCSAIDataConnectionError: If connection to DCS fails.
        """
        cache_key = CacheKeys.ai_module_detail(book_id, module_id)
        cached = await self._cache.get(cache_key)
        if cached is not None:
            logger.debug(
                f"Cache hit for AI module detail: book_id={book_id}, module_id={module_id}"
            )
            return cached

        logger.debug(
            f"Fetching AI module detail from DCS: book_id={book_id}, module_id={module_id}"
        )
        try:
            response = await self._dcs._make_request(
                "GET", f"/books/{book_id}/ai-data/modules/{module_id}"
            )
            data = ModuleDetail(**response.json())
            await self._cache.set(cache_key, data, ttl=CacheKeys.AI_MODULES_TTL)
            logger.info(
                f"AI module detail fetched: book_id={book_id}, module_id={module_id}"
            )
            return data

        except DreamStorageNotFoundError:
            logger.info(
                f"AI module detail not found: book_id={book_id}, module_id={module_id}"
            )
            return None

        except DreamStorageAuthError as e:
            logger.error(
                f"DCS auth error fetching AI module detail: book_id={book_id}, "
                f"module_id={module_id}"
            )
            raise DCSAIDataAuthError(
                message=f"Authentication failed: {e}", book_id=book_id
            ) from e

        except DreamStorageServerError as e:
            logger.error(
                f"DCS server error fetching AI module detail: book_id={book_id}, "
                f"module_id={module_id}, error={e}"
            )
            raise DCSAIDataConnectionError(
                message=f"Connection failed: {e}",
                book_id=book_id,
                original_error=e,
            ) from e

    async def get_vocabulary(
        self, book_id: int, module_id: int | None = None
    ) -> VocabularyResponse | None:
        """
        Get vocabulary words for a book.

        Fetches vocabulary with translations, definitions, audio paths,
        and other metadata. Can optionally filter by module.

        Args:
            book_id: The DCS book ID.
            module_id: Optional module ID to filter vocabulary.

        Returns:
            VocabularyResponse with word list, None if not found.

        Raises:
            DCSAIDataAuthError: If authentication with DCS fails.
            DCSAIDataConnectionError: If connection to DCS fails.
        """
        cache_key = CacheKeys.ai_vocabulary(book_id, module_id)
        cached = await self._cache.get(cache_key)
        if cached is not None:
            logger.debug(
                f"Cache hit for AI vocabulary: book_id={book_id}, module_id={module_id}"
            )
            return cached

        # Build URL with optional module filter
        url = f"/books/{book_id}/ai-data/vocabulary"
        if module_id is not None:
            url += f"?module={module_id}"

        logger.debug(
            f"Fetching AI vocabulary from DCS: book_id={book_id}, module_id={module_id}"
        )
        try:
            response = await self._dcs._make_request("GET", url)
            data = VocabularyResponse(**response.json())
            await self._cache.set(cache_key, data, ttl=CacheKeys.AI_VOCABULARY_TTL)
            logger.info(
                f"AI vocabulary fetched: book_id={book_id}, "
                f"module_id={module_id}, words={data.total_words}"
            )
            return data

        except DreamStorageNotFoundError:
            logger.info(
                f"AI vocabulary not found: book_id={book_id}, module_id={module_id}"
            )
            return None

        except DreamStorageAuthError as e:
            logger.error(
                f"DCS auth error fetching AI vocabulary: book_id={book_id}, "
                f"module_id={module_id}"
            )
            raise DCSAIDataAuthError(
                message=f"Authentication failed: {e}", book_id=book_id
            ) from e

        except DreamStorageServerError as e:
            logger.error(
                f"DCS server error fetching AI vocabulary: book_id={book_id}, "
                f"module_id={module_id}, error={e}"
            )
            raise DCSAIDataConnectionError(
                message=f"Connection failed: {e}",
                book_id=book_id,
                original_error=e,
            ) from e

    async def check_audio_exists(
        self, book_id: int, lang: str, word: str
    ) -> bool:
        """
        Check if audio exists for a vocabulary word in DCS.

        Note: DCS now streams audio directly. This method just checks
        if the audio file exists by making a HEAD request.

        Args:
            book_id: The DCS book ID.
            lang: Language code (e.g., "en", "tr").
            word: The vocabulary word.

        Returns:
            True if audio exists, False otherwise.
        """
        try:
            # URL-encode the word to handle special characters (apostrophes, spaces, etc.)
            encoded_word = quote(word, safe="")

            # Try to fetch - DCS now streams directly
            response = await self._dcs._make_request(
                "GET", f"/books/{book_id}/ai-data/audio/vocabulary/{lang}/{encoded_word}.mp3"
            )
            return response.status_code == 200

        except Exception:
            return False

    def get_audio_stream_url(self, book_id: int, lang: str, word: str) -> str:
        """
        Get the DCS URL for streaming vocabulary audio.

        The frontend should call this URL directly with auth headers.
        DCS now streams audio directly instead of returning presigned URLs.

        Args:
            book_id: The DCS book ID.
            lang: Language code (e.g., "en", "tr").
            word: The vocabulary word.

        Returns:
            The DCS endpoint URL for streaming audio.
        """
        encoded_word = quote(word, safe="")
        return f"/books/{book_id}/ai-data/audio/vocabulary/{lang}/{encoded_word}.mp3"

    async def is_book_processed(self, book_id: int) -> bool:
        """
        Check if a book has completed AI processing.

        This is a convenience method that checks if the book's processing
        status is "completed".

        Args:
            book_id: The DCS book ID.

        Returns:
            True if the book has completed processing, False otherwise.
        """
        try:
            metadata = await self.get_processing_status(book_id)
            if metadata is None:
                return False
            is_completed = metadata.processing_status == "completed"
            logger.debug(
                f"Book processing check: book_id={book_id}, "
                f"status={metadata.processing_status}, completed={is_completed}"
            )
            return is_completed

        except (DCSAIDataAuthError, DCSAIDataConnectionError):
            # On error, assume not processed
            return False

    async def invalidate_book_cache(self, book_id: int) -> int:
        """
        Invalidate all cached data for a specific book.

        This should be called when a book's AI data has been updated
        or reprocessed.

        Args:
            book_id: The DCS book ID.

        Returns:
            Number of cache entries invalidated.
        """
        pattern = f"dcs:ai:{book_id}:"
        # Also invalidate the metadata key (doesn't have trailing colon)
        metadata_key = CacheKeys.ai_metadata(book_id)
        await self._cache.invalidate(metadata_key)

        count = await self._cache.invalidate_pattern(pattern)
        logger.info(f"Invalidated {count + 1} cache entries for book_id={book_id}")
        return count + 1
