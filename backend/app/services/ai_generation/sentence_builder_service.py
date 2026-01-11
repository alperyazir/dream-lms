"""
Sentence Builder Service.

Generates Duolingo-style sentence building activities from book modules.
Students arrange jumbled words into correct sentence order.

Story 27.13: Sentence Builder Activity
"""

import logging
import random
import re
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.dcs_ai_data import ModuleDetail
from app.schemas.sentence_builder import (
    SentenceBuilderActivity,
    SentenceBuilderItem,
    SentenceBuilderRequest,
    SentenceBuilderResult,
    SentenceBuilderSubmission,
    SentenceResult,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError, DCSAIDataNotReadyError
from app.services.llm import LLMManager
from app.services.tts import TTSManager

logger = logging.getLogger(__name__)


# Difficulty word count ranges
DIFFICULTY_RANGES = {
    "easy": (4, 6),
    "medium": (7, 10),
    "hard": (11, float("inf")),
}


class InsufficientSentencesError(Exception):
    """
    Raised when there aren't enough suitable sentences to generate activity.

    Attributes:
        message: Human-readable error description.
        available: Number of sentences available.
        required: Number of sentences required.
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


class SentenceBuilderError(Exception):
    """Generic sentence builder generation error."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(self.message)


class SentenceBuilderService:
    """
    Service for generating sentence building activities from book modules.

    This service fetches module text from DCS, extracts sentences,
    filters by difficulty, and creates shuffled word banks.

    Example:
        service = SentenceBuilderService(dcs_client, llm_manager, tts_manager)
        activity = await service.generate_activity(request)
    """

    def __init__(
        self,
        dcs_client: DCSAIServiceClient,
        llm_manager: LLMManager | None = None,
        tts_manager: TTSManager | None = None,
    ) -> None:
        """
        Initialize the Sentence Builder Service.

        Args:
            dcs_client: DCS AI service client for fetching module text.
            llm_manager: LLM manager for sentence quality validation (optional).
            tts_manager: TTS manager for generating sentence audio (optional).
        """
        self._dcs = dcs_client
        self._llm = llm_manager
        self._tts = tts_manager
        logger.info("SentenceBuilderService initialized")

    async def generate_activity(
        self, request: SentenceBuilderRequest
    ) -> SentenceBuilderActivity:
        """
        Generate a sentence builder activity from book modules.

        Uses LLM to generate educational sentences based on module vocabulary
        and topics. Creates shuffled word banks for students to practice.

        Args:
            request: Activity generation request with configuration.

        Returns:
            SentenceBuilderActivity ready to be presented to students.

        Raises:
            DCSAIDataNotFoundError: If the book has no AI data.
            DCSAIDataNotReadyError: If the book is still being processed.
            SentenceBuilderError: If sentence generation fails.
        """
        logger.info(
            f"Generating sentence builder: book_id={request.book_id}, "
            f"difficulty={request.difficulty}, sentence_count={request.sentence_count}"
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

        # Fetch modules to get vocabulary and topics
        modules = await self._fetch_modules(request.book_id, request.module_ids)

        if not modules:
            raise DCSAIDataNotFoundError(
                message="No modules found for the specified book.",
                book_id=request.book_id,
                resource="modules",
            )

        # Get vocabulary from DCS for the book
        vocabulary_words = []
        topic = modules[0].title if modules else "General English"

        try:
            vocabulary = await self._dcs.get_vocabulary(request.book_id)
            if vocabulary:
                # Filter to selected modules if specified
                if request.module_ids:
                    vocabulary_words = [
                        v.word for v in vocabulary
                        if v.module_id in request.module_ids
                    ]
                else:
                    vocabulary_words = [v.word for v in vocabulary]

                # Limit to reasonable number
                vocabulary_words = vocabulary_words[:30]
        except Exception as e:
            logger.warning(f"Could not fetch vocabulary: {e}")

        # Use LLM to generate educational sentences
        if self._llm:
            sentences = await self._generate_sentences_with_llm(
                vocabulary=vocabulary_words,
                topic=topic,
                sentence_count=request.sentence_count,
                difficulty=request.difficulty,
            )
        else:
            # Fallback: extract sentences from text (less ideal)
            sentences = await self._extract_sentences_fallback(
                modules, request.sentence_count, request.difficulty
            )

        if not sentences:
            raise SentenceBuilderError(
                message="Failed to generate sentences. Please try again."
            )

        # Create sentence items with shuffled words
        sentence_items: list[SentenceBuilderItem] = []
        for sentence in sentences:
            sentence_item = await self._create_sentence_item(
                sentence=sentence,
                module_id=modules[0].module_id if modules else 1,
                page=None,
                difficulty=request.difficulty,
                include_audio=request.include_audio,
                book_id=request.book_id,
            )
            sentence_items.append(sentence_item)

        # Determine module IDs used
        module_ids = request.module_ids or [m.module_id for m in modules]

        activity = SentenceBuilderActivity(
            activity_id=str(uuid4()),
            book_id=request.book_id,
            module_ids=module_ids,
            sentences=sentence_items,
            difficulty=request.difficulty,
            include_audio=request.include_audio,
            created_at=datetime.now(timezone.utc),
        )

        logger.info(
            f"Sentence builder activity generated: activity_id={activity.activity_id}, "
            f"sentences={len(sentence_items)}"
        )
        return activity

    async def _generate_sentences_with_llm(
        self,
        vocabulary: list[str],
        topic: str,
        sentence_count: int,
        difficulty: str,
    ) -> list[str]:
        """
        Generate educational sentences using LLM.

        Args:
            vocabulary: Vocabulary words to incorporate.
            topic: Topic/theme for sentences.
            sentence_count: Number of sentences to generate.
            difficulty: Difficulty level.

        Returns:
            List of generated sentence strings.
        """
        from app.services.ai_generation.prompts.sentence_prompts import (
            SENTENCE_GENERATION_JSON_SCHEMA,
            SENTENCE_GENERATION_SYSTEM_PROMPT,
            build_sentence_generation_prompt,
        )

        prompt = build_sentence_generation_prompt(
            vocabulary=vocabulary,
            topic=topic,
            sentence_count=sentence_count,
            difficulty=difficulty,
        )

        try:
            response = await self._llm.generate_structured(
                prompt=f"{SENTENCE_GENERATION_SYSTEM_PROMPT}\n\n{prompt}",
                schema=SENTENCE_GENERATION_JSON_SCHEMA,
            )

            sentences = []
            for item in response.get("sentences", []):
                sentence = item.get("sentence", "").strip()
                if sentence:
                    sentences.append(sentence)

            logger.info(f"LLM generated {len(sentences)} sentences")
            return sentences

        except Exception as e:
            logger.error(f"LLM sentence generation failed: {e}")
            return []

    async def _extract_sentences_fallback(
        self,
        modules: list[ModuleDetail],
        sentence_count: int,
        difficulty: str,
    ) -> list[str]:
        """
        Fallback method: extract sentences from text when LLM is unavailable.

        Args:
            modules: List of modules to extract from.
            sentence_count: Number of sentences needed.
            difficulty: Difficulty level for filtering.

        Returns:
            List of extracted sentence strings.
        """
        all_sentences = []
        for module in modules:
            sentences = self._extract_sentences(module.text)
            filtered = self._filter_by_difficulty(sentences, difficulty)
            all_sentences.extend(filtered)

        if len(all_sentences) < sentence_count:
            logger.warning(
                f"Only {len(all_sentences)} sentences available for {difficulty} difficulty"
            )

        # Select random sentences
        selected = random.sample(
            all_sentences,
            min(sentence_count, len(all_sentences))
        )

        return selected

    async def _fetch_modules(
        self, book_id: int, module_ids: list[int] | None
    ) -> list[ModuleDetail]:
        """
        Fetch modules from DCS.

        Args:
            book_id: The book ID.
            module_ids: Optional list of module IDs. If None, fetches all.

        Returns:
            List of ModuleDetail objects.
        """
        modules: list[ModuleDetail] = []

        if module_ids:
            for module_id in module_ids:
                module = await self._dcs.get_module_detail(book_id, module_id)
                if module and module.text:
                    modules.append(module)
        else:
            # Fetch all modules for the book
            module_list = await self._dcs.get_modules(book_id)
            if module_list:
                for mod_info in module_list.modules:
                    module = await self._dcs.get_module_detail(book_id, mod_info.module_id)
                    if module and module.text:
                        modules.append(module)

        logger.debug(f"Fetched {len(modules)} modules with text content")
        return modules

    def _extract_sentences(self, text: str) -> list[str]:
        """
        Extract sentences from module text.

        Filters out instructional text (exercise directions) and template
        sentences that are not suitable for sentence building activities.

        Args:
            text: Raw module text.

        Returns:
            List of cleaned sentence strings.
        """
        if not text:
            return []

        # Split on sentence boundaries
        sentences = re.split(r'(?<=[.!])\s+', text)

        # Instructional keywords that indicate exercise directions
        instruction_patterns = [
            r'\b(write|circle|complete|fill|answer|match|listen|read|look at|tick|underline|choose|select)\b',
            r'\b(exercise|activity|task|question|example|practice|test|quiz)\b',
            r'\b(correct answer|the definitions|the blanks|the gaps|your partner|the pictures)\b',
            r'\b(then,|now,|next,|first,|finally,)\s',
        ]
        instruction_regex = re.compile('|'.join(instruction_patterns), re.IGNORECASE)

        # Patterns that indicate template/fill-in sentences
        template_patterns = [
            r'_{2,}',  # Multiple underscores (blanks)
            r'\(\s*\)',  # Empty parentheses
            r'\.\.\.',  # Ellipsis
            r'\b(don\'t like|like love|love hate)\b',  # Multiple verb options
        ]
        template_regex = re.compile('|'.join(template_patterns), re.IGNORECASE)

        cleaned = []
        for s in sentences:
            s = s.strip()

            # Skip if too short
            if len(s) < 15:  # Increased minimum length
                continue

            # Skip questions (we want declarative sentences)
            if s.endswith('?'):
                continue

            # Skip if doesn't start with capital letter
            if not s or not s[0].isupper():
                continue

            # Skip if contains unusual characters or formatting
            if re.search(r'[\[\]\{\}\|<>]', s):
                continue

            # Skip instructional text (exercise directions)
            if instruction_regex.search(s):
                continue

            # Skip template/fill-in sentences
            if template_regex.search(s):
                continue

            # Skip sentences with too many numbers (likely answers or lists)
            number_count = len(re.findall(r'\d+', s))
            if number_count > 2:
                continue

            # Skip very short words-heavy sentences (likely vocabulary lists)
            words = s.split()
            if len(words) > 0:
                avg_word_len = sum(len(w) for w in words) / len(words)
                if avg_word_len < 3:  # Average word length too short
                    continue

            # Skip if it's a fragment (no verb indicators)
            if not re.search(r'\b(is|are|was|were|has|have|had|do|does|did|will|would|can|could|may|might|shall|should)\b', s.lower()):
                # Also check for past tense verbs (words ending in -ed)
                if not re.search(r'\b\w+ed\b', s.lower()):
                    # Also check for present tense verbs (words ending in -s, -es)
                    if not re.search(r'\b\w+(s|es)\b', s.lower()):
                        continue

            cleaned.append(s)

        return cleaned

    def _filter_by_difficulty(
        self, sentences: list[str], difficulty: str
    ) -> list[str]:
        """
        Filter sentences by word count based on difficulty.

        Args:
            sentences: List of sentences to filter.
            difficulty: Difficulty level (easy, medium, hard).

        Returns:
            Filtered list of sentences.
        """
        min_words, max_words = DIFFICULTY_RANGES.get(difficulty, (4, 10))

        filtered = []
        for s in sentences:
            word_count = len(s.split())
            if min_words <= word_count <= max_words:
                filtered.append(s)

        return filtered

    async def _filter_with_llm(
        self, sentences: list[dict], max_count: int
    ) -> list[dict]:
        """
        Use LLM to filter sentences for quality.

        Selects grammatically interesting sentences that are suitable
        for language learning activities.

        Args:
            sentences: List of sentence dicts with sentence, module_id, page.
            max_count: Maximum number of sentences to return.

        Returns:
            Filtered list of sentence dicts.
        """
        if not self._llm or len(sentences) <= max_count:
            return sentences

        try:
            from app.services.ai_generation.prompts import (
                SENTENCE_QUALITY_JSON_SCHEMA,
                SENTENCE_QUALITY_SYSTEM_PROMPT,
                build_sentence_quality_prompt,
            )

            # Get sentence texts for evaluation
            sentence_texts = [s["sentence"] for s in sentences[:50]]  # Limit to 50

            # Build prompt
            prompt = build_sentence_quality_prompt(
                sentences=sentence_texts,
                target_count=max_count,
                difficulty="medium",  # Use medium as baseline
            )

            # Call LLM
            response = await self._llm.generate_structured(
                prompt=f"{SENTENCE_QUALITY_SYSTEM_PROMPT}\n\n{prompt}",
                schema=SENTENCE_QUALITY_JSON_SCHEMA,
            )

            selected = response.get("selected_sentences", [])
            logger.info(f"LLM selected {len(selected)} sentences")

            # Map back to original sentence dicts
            selected_texts = {s["sentence"] for s in selected}
            filtered = [s for s in sentences if s["sentence"] in selected_texts]

            # If LLM didn't return enough, supplement with remaining
            if len(filtered) < max_count:
                remaining = [s for s in sentences if s not in filtered]
                filtered.extend(remaining[: max_count - len(filtered)])

            return filtered[:max_count]

        except Exception as e:
            logger.warning(f"LLM filtering failed, using fallback: {e}")
            return sentences[:max_count]

    async def _create_sentence_item(
        self,
        sentence: str,
        module_id: int,
        page: int | None,
        difficulty: str,
        include_audio: bool,
        book_id: int,
    ) -> SentenceBuilderItem:
        """
        Create a sentence item with shuffled word bank.

        Args:
            sentence: The correct sentence.
            module_id: Source module ID.
            page: Source page number.
            difficulty: Difficulty level.
            include_audio: Whether to generate TTS audio.
            book_id: Book ID for TTS generation.

        Returns:
            SentenceBuilderItem with shuffled words.
        """
        # Shuffle words
        words = self._shuffle_words(sentence)

        # Generate audio if requested
        audio_url = None
        if include_audio and self._tts:
            try:
                audio_url = await self._generate_sentence_audio(sentence, book_id)
            except Exception as e:
                logger.warning(f"Failed to generate audio for sentence: {e}")

        return SentenceBuilderItem(
            item_id=str(uuid4()),
            correct_sentence=sentence,
            words=words,
            word_count=len(words),
            audio_url=audio_url,
            source_module_id=module_id,
            source_page=page,
            difficulty=difficulty,
        )

    def _shuffle_words(self, sentence: str) -> list[str]:
        """
        Shuffle words ensuring they're not in original order.

        Preserves punctuation attached to words (e.g., "away.").

        Args:
            sentence: The original sentence.

        Returns:
            List of shuffled words.
        """
        words = sentence.split()
        original = words.copy()

        # Keep shuffling until order is different
        for _ in range(100):  # Max attempts
            random.shuffle(words)
            if words != original:
                return words

        # Fallback: swap first two if same
        if len(words) >= 2:
            words[0], words[1] = words[1], words[0]

        return words

    async def _generate_sentence_audio(
        self, sentence: str, book_id: int
    ) -> str | None:
        """
        Generate TTS audio for a sentence.

        Args:
            sentence: The sentence to generate audio for.
            book_id: Book ID for context (future use).

        Returns:
            Audio URL or None if generation failed.
        """
        if not self._tts:
            return None

        try:
            from app.services.tts import AudioGenerationOptions

            result = await self._tts.generate_audio(
                text=sentence,
                options=AudioGenerationOptions(language="en"),
            )

            # For now, return base64 data URL
            # In production, this would be uploaded to storage
            import base64
            audio_b64 = base64.b64encode(result.audio_data).decode("utf-8")
            return f"data:audio/{result.format};base64,{audio_b64}"

        except Exception as e:
            logger.warning(f"TTS generation failed: {e}")
            return None

    @staticmethod
    def _calculate_result_static(
        activity: SentenceBuilderActivity,
        submission: SentenceBuilderSubmission,
        student_id: str,
    ) -> SentenceBuilderResult:
        """
        Calculate the result of a submitted sentence builder activity.

        Args:
            activity: The activity that was submitted.
            submission: The student's submission.
            student_id: ID of the student who submitted.

        Returns:
            SentenceBuilderResult with score and details.
        """
        sentence_results: list[SentenceResult] = []
        correct_count = 0

        for sentence_item in activity.sentences:
            item_id = sentence_item.item_id
            submitted_words = submission.answers.get(item_id, [])

            # Check if submission matches correct sentence
            correct_words = sentence_item.correct_sentence.split()
            is_correct = submitted_words == correct_words

            if is_correct:
                correct_count += 1

            sentence_results.append(
                SentenceResult(
                    item_id=item_id,
                    submitted_words=submitted_words,
                    correct_sentence=sentence_item.correct_sentence,
                    is_correct=is_correct,
                    audio_url=sentence_item.audio_url,
                )
            )

        total = len(activity.sentences)
        percentage = (correct_count / total * 100) if total > 0 else 0

        return SentenceBuilderResult(
            activity_id=activity.activity_id,
            student_id=student_id,
            score=correct_count,
            total=total,
            percentage=percentage,
            sentence_results=sentence_results,
            submitted_at=datetime.now(timezone.utc),
            difficulty=activity.difficulty,
        )

    def calculate_result(
        self,
        activity: SentenceBuilderActivity,
        submission: SentenceBuilderSubmission,
        student_id: str,
    ) -> SentenceBuilderResult:
        """
        Calculate the result of a submitted sentence builder activity.

        Args:
            activity: The activity that was submitted.
            submission: The student's submission.
            student_id: ID of the student who submitted.

        Returns:
            SentenceBuilderResult with score and details.
        """
        return self._calculate_result_static(activity, submission, student_id)


# Factory function for dependency injection
_service_instance: SentenceBuilderService | None = None


def get_sentence_builder_service(
    dcs_client: DCSAIServiceClient,
    llm_manager: LLMManager | None = None,
    tts_manager: TTSManager | None = None,
) -> SentenceBuilderService:
    """
    Get or create a SentenceBuilderService instance.

    Args:
        dcs_client: DCS AI service client.
        llm_manager: Optional LLM manager for sentence validation.
        tts_manager: Optional TTS manager for audio generation.

    Returns:
        SentenceBuilderService instance.
    """
    global _service_instance
    if _service_instance is None:
        _service_instance = SentenceBuilderService(dcs_client, llm_manager, tts_manager)
    return _service_instance


def reset_sentence_builder_service() -> None:
    """Reset the service instance (for testing)."""
    global _service_instance
    _service_instance = None
