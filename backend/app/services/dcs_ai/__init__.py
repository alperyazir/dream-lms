"""
DCS AI Service Module.

Provides access to AI-processed book data from Dream Central Storage.

This module exports:
- DCSAIServiceClient: Main client for accessing AI data
- get_dcs_ai_client: FastAPI dependency for injecting the client
- Exception classes for error handling
- Schema models for AI data types

Example:
    from app.services.dcs_ai import DCSAIServiceClient, get_dcs_ai_client

    @router.get("/books/{book_id}/ai-status")
    async def get_ai_status(
        book_id: int,
        ai_client: DCSAIServiceClient = Depends(get_dcs_ai_client),
    ):
        return await ai_client.get_processing_status(book_id)
"""

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
    DCSAIDataError,
    DCSAIDataNotFoundError,
    DCSAIDataNotReadyError,
)
from app.services.dcs_cache import get_dcs_cache
from app.services.dream_storage_client import get_dream_storage_client

# Singleton instance for the client
_dcs_ai_client: DCSAIServiceClient | None = None


async def create_dcs_ai_client() -> DCSAIServiceClient:
    """
    Create a new DCS AI Service Client instance.

    This factory function creates a client with the default DCS client
    and cache instances.

    Returns:
        DCSAIServiceClient: A new client instance.
    """
    dcs_client = await get_dream_storage_client()
    cache = get_dcs_cache()
    return DCSAIServiceClient(dcs_client=dcs_client, cache=cache)


async def get_dcs_ai_client() -> DCSAIServiceClient:
    """
    FastAPI dependency for getting the DCS AI Service Client.

    Uses a singleton pattern to reuse the same client instance
    across requests.

    Returns:
        DCSAIServiceClient: The singleton client instance.

    Example:
        @router.get("/books/{book_id}/modules")
        async def get_modules(
            book_id: int,
            ai_client: DCSAIServiceClient = Depends(get_dcs_ai_client),
        ):
            return await ai_client.get_modules(book_id)
    """
    global _dcs_ai_client
    if _dcs_ai_client is None:
        _dcs_ai_client = await create_dcs_ai_client()
    return _dcs_ai_client


def reset_dcs_ai_client() -> None:
    """
    Reset the singleton client instance.

    Primarily used for testing to ensure clean state.
    """
    global _dcs_ai_client
    _dcs_ai_client = None


# Export all public symbols
__all__ = [
    # Client
    "DCSAIServiceClient",
    "create_dcs_ai_client",
    "get_dcs_ai_client",
    "reset_dcs_ai_client",
    # Exceptions
    "DCSAIDataError",
    "DCSAIDataNotFoundError",
    "DCSAIDataNotReadyError",
    "DCSAIDataAuthError",
    "DCSAIDataConnectionError",
    # Schema models
    "ProcessingMetadata",
    "ModuleSummary",
    "ModuleListResponse",
    "ModuleDetail",
    "VocabularyWord",
    "VocabularyResponse",
]
