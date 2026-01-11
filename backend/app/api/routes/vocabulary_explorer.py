"""
Vocabulary Explorer API Routes.

Story 27.18: Vocabulary Explorer with Audio Player

API endpoints for browsing book vocabulary from DCS AI data.
Provides paginated vocabulary search with filters and audio streaming.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.deps import require_role
from app.models import User, UserRole
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataAuthError, DCSAIDataConnectionError
from app.services.dcs_cache import DCSCache
from app.services.dream_storage_client import DreamCentralStorageClient, get_dream_storage_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/vocabulary", tags=["vocabulary-explorer"])

# Roles that can access vocabulary explorer
TeacherOrHigher = require_role(
    UserRole.teacher, UserRole.supervisor, UserRole.admin
)


# ============================================================================
# SCHEMAS
# ============================================================================


class ModuleInfo(BaseModel):
    """Module information for vocabulary filtering."""

    id: str
    name: str
    vocabulary_count: int


class BookWithVocabulary(BaseModel):
    """Book with AI vocabulary data available."""

    id: int
    title: str
    publisher_name: str
    has_ai_data: bool
    processing_status: str | None
    vocabulary_count: int
    modules: list[ModuleInfo]


class VocabularyWordResponse(BaseModel):
    """A single vocabulary word for display."""

    id: str
    word: str
    translation: str
    definition: str
    example_sentence: str | None
    cefr_level: str
    part_of_speech: str | None
    module_name: str
    book_id: int
    has_audio: bool = False  # Whether audio is available for this word


class VocabularyListResponse(BaseModel):
    """Paginated vocabulary list response."""

    items: list[VocabularyWordResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AudioUrlRequest(BaseModel):
    """Request for vocabulary audio URL."""

    language: str = Field(default="en", description="Language code")
    word: str = Field(..., description="Word to get audio for")


class AudioUrlResponse(BaseModel):
    """Audio URL response."""

    url: str
    expires_at: str


# ============================================================================
# DEPENDENCIES
# ============================================================================


async def get_dcs_ai_client() -> DCSAIServiceClient:
    """Get DCS AI client instance."""
    dcs_client = DreamCentralStorageClient()
    cache = DCSCache(default_ttl=300)
    return DCSAIServiceClient(dcs_client, cache)


# ============================================================================
# ENDPOINTS
# ============================================================================


@router.get(
    "/books",
    response_model=list[BookWithVocabulary],
    summary="Get books with vocabulary",
    description="Get list of books that have AI vocabulary data available.",
)
async def get_books_with_vocabulary(
    current_user: Annotated[User, TeacherOrHigher],
) -> list[BookWithVocabulary]:
    """
    Get list of books with AI vocabulary data.

    Only returns books that have been processed and have vocabulary available.
    Requires teacher or admin role.
    """
    try:
        dcs_ai = await get_dcs_ai_client()
        dcs_client = await get_dream_storage_client()

        # Get all books from DCS
        all_books = await dcs_client.get_books()

        books_with_vocab: list[BookWithVocabulary] = []

        for book in all_books:
            try:
                # Get processing status from DCS AI data
                metadata = await dcs_ai.get_processing_status(book.id)

                if metadata is None or metadata.processing_status != "completed":
                    continue

                # Get modules for the book
                modules_data = await dcs_ai.get_modules_metadata(book.id)

                modules: list[ModuleInfo] = []
                if modules_data and modules_data.modules:
                    modules = [
                        ModuleInfo(
                            id=str(m.module_id),
                            name=m.title,
                            vocabulary_count=m.vocabulary_count,
                        )
                        for m in modules_data.modules
                    ]

                books_with_vocab.append(
                    BookWithVocabulary(
                        id=book.id,
                        title=book.title or f"Book {book.id}",
                        publisher_name=book.publisher or "Unknown",
                        has_ai_data=True,
                        processing_status=metadata.processing_status,
                        vocabulary_count=metadata.total_vocabulary,
                        modules=modules,
                    )
                )
            except (DCSAIDataAuthError, DCSAIDataConnectionError) as e:
                logger.warning(f"Error fetching AI data for book {book.id}: {e}")
                continue

        logger.info(f"Found {len(books_with_vocab)} books with vocabulary data")
        return books_with_vocab

    except Exception as e:
        logger.error(f"Error getting books with vocabulary: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching books: {str(e)}",
        ) from e


@router.get(
    "",
    response_model=VocabularyListResponse,
    summary="Get vocabulary list",
    description="Get paginated vocabulary with optional filters.",
)
async def get_vocabulary(
    current_user: Annotated[User, TeacherOrHigher],
    book_id: Annotated[int, Query(..., description="Book ID to get vocabulary from")],
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 25,
    module_id: Annotated[str | None, Query(description="Filter by module ID")] = None,
    search: Annotated[str | None, Query(description="Search in word/definition")] = None,
    levels: Annotated[str | None, Query(description="CEFR levels, comma-separated")] = None,
    part_of_speech: Annotated[str | None, Query(description="Filter by part of speech")] = None,
) -> VocabularyListResponse:
    """
    Get paginated vocabulary list with filtering.

    Supports filtering by module, CEFR level, part of speech, and search term.
    Requires teacher or admin role.
    """
    try:
        dcs_ai = await get_dcs_ai_client()

        # Parse module_id to int if provided
        mod_id = int(module_id) if module_id else None

        # Fetch vocabulary from DCS
        vocab_response = await dcs_ai.get_vocabulary(book_id, module_id=mod_id)

        if vocab_response is None:
            return VocabularyListResponse(
                items=[],
                total=0,
                page=page,
                page_size=page_size,
                total_pages=0,
            )

        # Get modules metadata for module names
        modules_data = await dcs_ai.get_modules_metadata(book_id)
        module_names = {}
        if modules_data and modules_data.modules:
            module_names = {m.module_id: m.title for m in modules_data.modules}

        # Apply filters to vocabulary
        words = vocab_response.words
        cefr_levels = [level.strip().upper() for level in levels.split(",")] if levels else []

        filtered_words = []
        for word in words:
            # Filter by CEFR level
            if cefr_levels and word.level.upper() not in cefr_levels:
                continue

            # Filter by part of speech
            if part_of_speech and word.part_of_speech != part_of_speech:
                continue

            # Filter by search term
            if search:
                search_lower = search.lower()
                if (
                    search_lower not in word.word.lower()
                    and search_lower not in (word.definition or "").lower()
                    and search_lower not in (word.translation or "").lower()
                ):
                    continue

            filtered_words.append(word)

        # Calculate pagination
        total = len(filtered_words)
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_words = filtered_words[start_idx:end_idx]

        # Convert to response format
        items = [
            VocabularyWordResponse(
                id=w.id,
                word=w.word,
                translation=w.translation or "",
                definition=w.definition,
                example_sentence=w.example,
                cefr_level=w.level,
                part_of_speech=w.part_of_speech,
                module_name=module_names.get(w.module_id, f"Module {w.module_id}"),
                book_id=book_id,
                has_audio=bool(w.audio and w.audio.get("word")),
            )
            for w in paginated_words
        ]

        logger.info(
            f"Vocabulary fetched: book_id={book_id}, "
            f"total={total}, page={page}, returned={len(items)}"
        )

        return VocabularyListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    except (DCSAIDataAuthError, DCSAIDataConnectionError) as e:
        logger.error(f"DCS error fetching vocabulary: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Error connecting to storage service: {str(e)}",
        ) from e

    except Exception as e:
        logger.error(f"Error fetching vocabulary: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching vocabulary: {str(e)}",
        ) from e


@router.post(
    "/{book_id}/audio",
    response_model=AudioUrlResponse,
    summary="Get audio URL for word",
    description="Get presigned audio URL for a vocabulary word.",
)
async def get_audio_url(
    book_id: int,
    request: AudioUrlRequest,
    current_user: Annotated[User, TeacherOrHigher],
) -> AudioUrlResponse:
    """
    Get streaming audio URL for a vocabulary word.

    Returns the DCS URL for streaming audio. The URL can be used
    directly with proper authorization headers.
    """
    try:
        dcs_ai = await get_dcs_ai_client()

        # Check if audio exists
        audio_exists = await dcs_ai.check_audio_exists(
            book_id=book_id,
            lang=request.language,
            word=request.word,
        )

        if not audio_exists:
            raise HTTPException(
                status_code=404,
                detail=f"Audio not found for word: {request.word}",
            )

        # Get streaming URL (via DCS proxy)
        audio_url = dcs_ai.get_audio_stream_url(
            book_id=book_id,
            lang=request.language,
            word=request.word,
        )

        # Build full URL for frontend
        from app.core.config import settings

        full_url = f"{settings.DREAM_CENTRAL_STORAGE_URL}{audio_url}"

        logger.info(f"Audio URL generated: book_id={book_id}, word={request.word}")

        return AudioUrlResponse(
            url=full_url,
            expires_at="",  # Streaming URLs don't expire the same way
        )

    except HTTPException:
        raise

    except (DCSAIDataAuthError, DCSAIDataConnectionError) as e:
        logger.error(f"DCS error getting audio URL: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Error connecting to storage service: {str(e)}",
        ) from e

    except Exception as e:
        logger.error(f"Error getting audio URL: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting audio URL: {str(e)}",
        ) from e
