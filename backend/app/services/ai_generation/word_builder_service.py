"""
Word Builder Service.

Generates spelling practice activities from book vocabulary.
Students spell vocabulary words by clicking letters from a scrambled letter bank.

Story 27.14: Word Builder (Spelling Activity)
"""

import logging
import random
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.dcs_ai_data import VocabularyWord
from app.schemas.word_builder import (
    WordBuilderActivity,
    WordBuilderItem,
    WordBuilderRequest,
    WordBuilderResult,
    WordBuilderSubmission,
    WordResult,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError, DCSAIDataNotReadyError
from app.services.tts import TTSManager

logger = logging.getLogger(__name__)


# Word length constraints for good spelling practice
MIN_WORD_LENGTH = 4
MAX_WORD_LENGTH = 12

# Scoring based on attempts
POINTS_BY_ATTEMPTS = {
    1: 100,  # Perfect (1st try)
    2: 70,   # 2nd try
    3: 50,   # 3rd try
}
DEFAULT_POINTS = 30  # 4+ tries


class InsufficientVocabularyError(Exception):
    """
    Raised when there aren't enough vocabulary words to generate an activity.

    Attributes:
        message: Human-readable error description.
        available: Number of vocabulary words available.
        required: Number of words required for the activity.
        book_id: The book ID.
    """

    def __init__(
        self,
        message: str,
        available: int,
        required: int,
        book_id: int,
    ) -> None:
        self.message = message
        self.available = available
        self.required = required
        self.book_id = book_id
        super().__init__(self.message)


class WordBuilderError(Exception):
    """Generic word builder generation error."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(self.message)


def scramble_letters(word: str) -> list[str]:
    """
    Scramble letters ensuring they're not in original order.

    Handles repeated letters correctly.

    Args:
        word: The word to scramble.

    Returns:
        List of scrambled letters.
    """
    letters = list(word.lower())
    original = letters.copy()

    # Keep shuffling until different from original
    for _ in range(100):
        random.shuffle(letters)
        if letters != original:
            return letters

    # Fallback: swap first two if same (for very short or palindrome words)
    if len(letters) >= 2:
        letters[0], letters[1] = letters[1], letters[0]

    return letters


def calculate_points(attempts: int) -> int:
    """
    Calculate points based on number of attempts.

    Args:
        attempts: Number of attempts made.

    Returns:
        Points earned (100, 70, 50, or 30).
    """
    return POINTS_BY_ATTEMPTS.get(attempts, DEFAULT_POINTS)


class WordBuilderService:
    """
    Service for generating word builder (spelling) activities from book vocabulary.

    This service fetches vocabulary from DCS, filters for suitable words,
    and creates scrambled letter banks for students to spell.

    Example:
        service = WordBuilderService(dcs_client, tts_manager)
        activity = await service.generate_activity(request)
    """

    def __init__(
        self,
        dcs_client: DCSAIServiceClient,
        tts_manager: TTSManager | None = None,
    ) -> None:
        """
        Initialize the Word Builder Service.

        Args:
            dcs_client: DCS AI service client for fetching vocabulary.
            tts_manager: TTS manager for generating pronunciation audio (optional).
        """
        self._dcs = dcs_client
        self._tts = tts_manager
        logger.info("WordBuilderService initialized")

    async def generate_activity(
        self, request: WordBuilderRequest
    ) -> WordBuilderActivity:
        """
        Generate a word builder activity from book vocabulary.

        Fetches vocabulary from DCS, filters for suitable words (4-12 letters),
        and creates scrambled letter banks.

        Args:
            request: Activity generation request with configuration.

        Returns:
            WordBuilderActivity ready to be presented to students.

        Raises:
            DCSAIDataNotFoundError: If the book has no AI data.
            DCSAIDataNotReadyError: If the book is still being processed.
            InsufficientVocabularyError: If not enough suitable words available.
        """
        logger.info(
            f"Generating word builder: book_id={request.book_id}, "
            f"word_count={request.word_count}, hint_type={request.hint_type}"
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

        # Fetch vocabulary
        vocabulary = await self._fetch_vocabulary(
            request.book_id, request.module_ids
        )

        # Filter by CEFR level if specified
        if request.cefr_levels:
            vocabulary = [
                w for w in vocabulary if w.level in request.cefr_levels
            ]
            logger.debug(
                f"Filtered by CEFR levels {request.cefr_levels}: {len(vocabulary)} words"
            )

        # Filter for suitable word length
        vocabulary = self._filter_by_length(vocabulary)
        logger.debug(f"Filtered by length ({MIN_WORD_LENGTH}-{MAX_WORD_LENGTH}): {len(vocabulary)} words")

        # Prefer words with clear definitions
        vocabulary = self._filter_with_definitions(vocabulary)
        logger.debug(f"Filtered for definitions: {len(vocabulary)} words")

        # Validate we have enough words
        if len(vocabulary) < request.word_count:
            raise InsufficientVocabularyError(
                message=(
                    f"Not enough suitable vocabulary words. Need {request.word_count}, "
                    f"but only {len(vocabulary)} available (4-12 letters with definitions)."
                ),
                available=len(vocabulary),
                required=request.word_count,
                book_id=request.book_id,
            )

        # Select random words
        selected_words = random.sample(vocabulary, request.word_count)

        # Create word items with scrambled letters
        word_items: list[WordBuilderItem] = []
        for vocab_word in selected_words:
            word_item = await self._create_word_item(
                vocab_word=vocab_word,
                hint_type=request.hint_type,
                book_id=request.book_id,
            )
            word_items.append(word_item)

        # Determine module IDs used
        module_ids = request.module_ids or list(
            set(w.module_id for w in selected_words)
        )

        activity = WordBuilderActivity(
            activity_id=str(uuid4()),
            book_id=request.book_id,
            module_ids=module_ids,
            words=word_items,
            hint_type=request.hint_type,
            created_at=datetime.now(timezone.utc),
        )

        logger.info(
            f"Word builder activity generated: activity_id={activity.activity_id}, "
            f"words={len(word_items)}"
        )
        return activity

    async def _fetch_vocabulary(
        self, book_id: int, module_ids: list[int] | None
    ) -> list[VocabularyWord]:
        """
        Fetch vocabulary from DCS for specified modules.

        Args:
            book_id: The book ID.
            module_ids: Optional list of module IDs. If None, fetches all.

        Returns:
            List of VocabularyWord objects.

        Raises:
            DCSAIDataNotFoundError: If no vocabulary found.
        """
        vocabulary: list[VocabularyWord] = []

        if module_ids:
            # Fetch vocabulary for each specified module
            for module_id in module_ids:
                response = await self._dcs.get_vocabulary(book_id, module_id)
                if response:
                    vocabulary.extend(response.words)
        else:
            # Fetch all vocabulary for the book
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

    def _filter_by_length(
        self, vocabulary: list[VocabularyWord]
    ) -> list[VocabularyWord]:
        """
        Filter vocabulary by word length for spelling practice.

        Args:
            vocabulary: List of vocabulary words.

        Returns:
            Filtered list with words 4-12 letters long.
        """
        return [
            w for w in vocabulary
            if MIN_WORD_LENGTH <= len(w.word) <= MAX_WORD_LENGTH
        ]

    def _filter_with_definitions(
        self, vocabulary: list[VocabularyWord]
    ) -> list[VocabularyWord]:
        """
        Filter vocabulary to only include words with definitions.

        Args:
            vocabulary: List of vocabulary words.

        Returns:
            Filtered list with words that have non-empty definitions.
        """
        return [
            w for w in vocabulary
            if w.definition and len(w.definition.strip()) > 0
        ]

    async def _create_word_item(
        self,
        vocab_word: VocabularyWord,
        hint_type: str,
        book_id: int,
    ) -> WordBuilderItem:
        """
        Create a word item with scrambled letters.

        Args:
            vocab_word: The vocabulary word.
            hint_type: Type of hint (definition, audio, or both).
            book_id: Book ID for audio URL resolution.

        Returns:
            WordBuilderItem with scrambled letters.
        """
        # Scramble letters
        letters = scramble_letters(vocab_word.word)

        # Get audio URL if needed
        audio_url = None
        if hint_type in ("audio", "both"):
            audio_url = await self._get_audio_url(vocab_word.word, book_id)

        return WordBuilderItem(
            item_id=str(uuid4()),
            correct_word=vocab_word.word.lower(),
            letters=letters,
            definition=vocab_word.definition,
            audio_url=audio_url,
            vocabulary_id=vocab_word.id,
            cefr_level=vocab_word.level,
        )

    async def _get_audio_url(self, word: str, book_id: int) -> str | None:
        """
        Get audio URL for a word.

        First tries DCS, then falls back to TTS generation.

        Args:
            word: The word to get audio for.
            book_id: Book ID for DCS audio lookup.

        Returns:
            Audio URL or None if unavailable.
        """
        # Try DCS first
        try:
            audio_url = await self._dcs.get_audio_url(
                book_id=book_id,
                lang="en",
                word=word,
            )
            if audio_url:
                return audio_url
        except Exception as e:
            logger.debug(f"DCS audio lookup failed for '{word}': {e}")

        # Fall back to TTS if available
        if self._tts:
            try:
                from app.services.tts import AudioGenerationOptions

                result = await self._tts.generate_audio(
                    text=word,
                    options=AudioGenerationOptions(language="en"),
                )

                # Return base64 data URL
                import base64
                audio_b64 = base64.b64encode(result.audio_data).decode("utf-8")
                return f"data:audio/{result.format};base64,{audio_b64}"

            except Exception as e:
                logger.warning(f"TTS generation failed for '{word}': {e}")

        return None

    @staticmethod
    def calculate_result(
        activity: WordBuilderActivity,
        submission: WordBuilderSubmission,
        student_id: str,
    ) -> WordBuilderResult:
        """
        Calculate the result of a submitted word builder activity.

        Scoring:
        - 1st try: 100 points
        - 2nd try: 70 points
        - 3rd try: 50 points
        - 4+ tries: 30 points

        Args:
            activity: The activity that was submitted.
            submission: The student's submission.
            student_id: ID of the student who submitted.

        Returns:
            WordBuilderResult with score and details.
        """
        word_results: list[WordResult] = []
        total_points = 0
        correct_count = 0
        perfect_count = 0
        total_attempts = 0

        for word_item in activity.words:
            item_id = word_item.item_id
            submitted_word = submission.answers.get(item_id, "").lower().strip()
            attempts = submission.attempts.get(item_id, 1)

            # Check if submission matches correct word
            is_correct = submitted_word == word_item.correct_word.lower()

            # Calculate points
            points = 0
            if is_correct:
                points = calculate_points(attempts)
                total_points += points
                correct_count += 1
                if attempts == 1:
                    perfect_count += 1

            total_attempts += attempts

            word_results.append(
                WordResult(
                    item_id=item_id,
                    submitted_word=submitted_word,
                    correct_word=word_item.correct_word,
                    is_correct=is_correct,
                    attempts=attempts,
                    points=points,
                    audio_url=word_item.audio_url,
                    definition=word_item.definition,
                )
            )

        total = len(activity.words)
        max_score = total * 100
        percentage = (total_points / max_score * 100) if max_score > 0 else 0
        average_attempts = total_attempts / total if total > 0 else 0

        return WordBuilderResult(
            activity_id=activity.activity_id,
            student_id=student_id,
            score=total_points,
            max_score=max_score,
            percentage=percentage,
            correct_count=correct_count,
            total=total,
            word_results=word_results,
            perfect_words=perfect_count,
            average_attempts=round(average_attempts, 2),
            submitted_at=datetime.now(timezone.utc),
        )


# Factory function for dependency injection
_service_instance: WordBuilderService | None = None


def get_word_builder_service(
    dcs_client: DCSAIServiceClient,
    tts_manager: TTSManager | None = None,
) -> WordBuilderService:
    """
    Get or create a WordBuilderService instance.

    Args:
        dcs_client: DCS AI service client.
        tts_manager: Optional TTS manager for audio generation.

    Returns:
        WordBuilderService instance.
    """
    global _service_instance
    if _service_instance is None:
        _service_instance = WordBuilderService(dcs_client, tts_manager)
    return _service_instance


def reset_word_builder_service() -> None:
    """Reset the service instance (for testing)."""
    global _service_instance
    _service_instance = None
