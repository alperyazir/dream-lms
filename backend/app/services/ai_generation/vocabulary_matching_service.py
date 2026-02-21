"""
Vocabulary Matching Service.

Generates vocabulary matching activities from DCS book vocabulary.
No LLM required — just fetches word-definition pairs from DCS,
filters empties, and randomly samples the requested count.
"""

import logging
import random
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.dcs_ai_data import VocabularyWord
from app.schemas.vocabulary_matching import (
    VocabularyMatchingActivity,
    VocabularyMatchingPair,
    VocabularyMatchingRequest,
)
from app.services.dcs_ai.client import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError, DCSAIDataNotReadyError

logger = logging.getLogger(__name__)


class InsufficientVocabularyError(Exception):
    """Not enough vocabulary words to build the matching activity."""

    def __init__(self, message: str, available: int, required: int, book_id: int) -> None:
        self.message = message
        self.available = available
        self.required = required
        self.book_id = book_id
        super().__init__(self.message)


class VocabularyMatchingService:
    """Generate vocabulary matching activities from DCS vocabulary."""

    def __init__(self, dcs_client: DCSAIServiceClient) -> None:
        self._dcs = dcs_client
        logger.info("VocabularyMatchingService initialized")

    async def generate_activity(
        self, request: VocabularyMatchingRequest
    ) -> VocabularyMatchingActivity:
        """Generate a vocabulary matching activity."""
        logger.info(
            f"Generating vocabulary matching: book_id={request.book_id}, "
            f"pair_count={request.pair_count}, modules={request.module_ids}"
        )

        # Check if book is processed
        is_processed = await self._dcs.is_book_processed(request.book_id)
        if not is_processed:
            metadata = await self._dcs.get_processing_status(request.book_id)
            if metadata is None:
                raise DCSAIDataNotFoundError(
                    message="Book has no AI data. Please process the book first.",
                    book_id=request.book_id,
                )
            raise DCSAIDataNotReadyError(
                message=f"Book AI processing not complete. Status: {metadata.processing_status}",
                book_id=request.book_id,
                status=metadata.processing_status,
            )

        # Fetch vocabulary (reuses the same DCS vocabulary endpoint)
        vocabulary = await self._fetch_vocabulary(
            request.book_id, request.module_ids
        )

        # Filter out words with empty definitions
        vocabulary = [w for w in vocabulary if w.definition and w.definition.strip()]

        if len(vocabulary) < request.pair_count:
            raise InsufficientVocabularyError(
                message=(
                    f"Not enough vocabulary words with definitions. "
                    f"Need {request.pair_count}, but only {len(vocabulary)} available."
                ),
                available=len(vocabulary),
                required=request.pair_count,
                book_id=request.book_id,
            )

        # Random sample
        selected = random.sample(vocabulary, request.pair_count)

        # Build pairs
        pairs: list[VocabularyMatchingPair] = []
        for word in selected:
            audio_url = None
            if request.include_audio:
                audio_url = self._dcs.get_audio_stream_url(
                    book_id=request.book_id,
                    lang="en",
                    word=word.word,
                )

            pairs.append(
                VocabularyMatchingPair(
                    pair_id=str(uuid4()),
                    word=word.word,
                    definition=word.definition,
                    audio_url=audio_url,
                    cefr_level=word.level or "",
                )
            )

        module_ids = request.module_ids or list(
            set(w.module_id for w in vocabulary)
        )

        activity = VocabularyMatchingActivity(
            activity_id=str(uuid4()),
            book_id=request.book_id,
            module_ids=module_ids,
            pairs=pairs,
            pair_count=len(pairs),
            created_at=datetime.now(timezone.utc),
        )

        logger.info(
            f"Vocabulary matching generated: activity_id={activity.activity_id}, "
            f"pairs={len(pairs)}"
        )
        return activity

    async def _fetch_vocabulary(
        self, book_id: int, module_ids: list[int] | None
    ) -> list[VocabularyWord]:
        """Fetch vocabulary from DCS for specified modules."""
        vocabulary: list[VocabularyWord] = []

        if module_ids:
            for module_id in module_ids:
                response = await self._dcs.get_vocabulary(book_id, module_id)
                if response:
                    vocabulary.extend(response.words)
        else:
            response = await self._dcs.get_vocabulary(book_id)
            if response:
                vocabulary = list(response.words)

        if not vocabulary:
            raise DCSAIDataNotFoundError(
                message="No vocabulary found for the specified book/modules.",
                book_id=book_id,
                resource="vocabulary",
            )

        logger.debug(f"Fetched {len(vocabulary)} vocabulary words")
        return vocabulary
