"""
Vocabulary Quiz Service.

Generates vocabulary quizzes from book modules using DCS AI data.
Quizzes present English definitions, synonyms, or antonyms and ask students
to select the correct word.
"""

import logging
import random
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from app.schemas.dcs_ai_data import VocabularyWord
from app.schemas.vocabulary_quiz import (
    VocabularyQuiz,
    VocabularyQuizGenerationRequest,
    VocabularyQuizQuestion,
)
from app.services.dcs_ai.client import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError, DCSAIDataNotReadyError
from app.services.llm import LLMManager

logger = logging.getLogger(__name__)


# CEFR level ordering for adjacency calculations
CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]


class InsufficientVocabularyError(Exception):
    """
    Raised when there aren't enough vocabulary words to generate a quiz.

    Attributes:
        message: Human-readable error description.
        available: Number of vocabulary words available.
        required: Number of words required for the quiz.
        book_id: The book ID.
    """

    def __init__(
        self,
        message: str,
        available: int,
        required: int,
        book_id: int,
    ) -> None:
        """
        Initialize the exception.

        Args:
            message: Human-readable error description.
            available: Number of vocabulary words available.
            required: Number of words required for the quiz.
            book_id: The book ID.
        """
        self.message = message
        self.available = available
        self.required = required
        self.book_id = book_id
        super().__init__(self.message)


def get_adjacent_cefr_levels(level: str) -> list[str]:
    """
    Get CEFR levels adjacent to the given level.

    Used for finding distractors when there aren't enough words
    at the exact same level.

    Args:
        level: The target CEFR level (A1, A2, B1, B2, C1, C2).

    Returns:
        List of adjacent CEFR levels (+/- 1 from target).

    Example:
        >>> get_adjacent_cefr_levels("B1")
        ["A2", "B2"]
    """
    try:
        idx = CEFR_LEVELS.index(level)
    except ValueError:
        logger.warning(f"Unknown CEFR level: {level}, treating as A1")
        idx = 0

    adjacent = []
    if idx > 0:
        adjacent.append(CEFR_LEVELS[idx - 1])
    if idx < len(CEFR_LEVELS) - 1:
        adjacent.append(CEFR_LEVELS[idx + 1])

    return adjacent


class VocabularyQuizService:
    """
    Service for generating vocabulary quizzes from book modules.

    This service fetches vocabulary from DCS AI data and creates
    definition-based, synonym, or antonym quizzes with plausible distractors.

    Example:
        service = VocabularyQuizService(dcs_client, llm_manager)
        quiz = await service.generate_quiz(
            VocabularyQuizGenerationRequest(book_id=123, quiz_length=10, quiz_mode="synonym")
        )
    """

    def __init__(
        self, dcs_client: DCSAIServiceClient, llm_manager: LLMManager | None = None
    ) -> None:
        """
        Initialize the vocabulary quiz service.

        Args:
            dcs_client: DCS AI service client for fetching vocabulary data.
            llm_manager: LLM manager for generating synonyms/antonyms (optional).
        """
        self._dcs = dcs_client
        self._llm = llm_manager
        logger.info("VocabularyQuizService initialized")

    async def generate_quiz(
        self, request: VocabularyQuizGenerationRequest
    ) -> VocabularyQuiz:
        """
        Generate a vocabulary quiz from book modules.

        Fetches vocabulary from DCS, filters by CEFR level if specified,
        selects quiz words, and generates questions with distractors.
        Supports definition, synonym, antonym, or mixed quiz modes.

        Args:
            request: Quiz generation request with book_id, quiz_length, quiz_mode, etc.

        Returns:
            VocabularyQuiz with questions ready to be presented to students.

        Raises:
            DCSAIDataNotFoundError: If the book has no AI data.
            DCSAIDataNotReadyError: If the book is still being processed.
            InsufficientVocabularyError: If not enough vocabulary words are available.
        """
        logger.info(
            f"Generating vocabulary quiz: book_id={request.book_id}, "
            f"quiz_length={request.quiz_length}, quiz_mode={request.quiz_mode}, "
            f"modules={request.module_ids}"
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

        # Fetch vocabulary - either from specific modules or all modules
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

        # Validate we have enough words
        if len(vocabulary) < request.quiz_length:
            raise InsufficientVocabularyError(
                message=(
                    f"Not enough vocabulary words. Need {request.quiz_length}, "
                    f"but only {len(vocabulary)} available."
                ),
                available=len(vocabulary),
                required=request.quiz_length,
                book_id=request.book_id,
            )

        # Minimum distractors requirement: need at least 4 words total
        # (1 correct + 3 distractors)
        if len(vocabulary) < 4:
            raise InsufficientVocabularyError(
                message=(
                    "Not enough vocabulary for distractors. "
                    f"Need at least 4 words, but only {len(vocabulary)} available."
                ),
                available=len(vocabulary),
                required=4,
                book_id=request.book_id,
            )

        # Select quiz words randomly
        quiz_words = random.sample(vocabulary, request.quiz_length)

        # Generate questions with distractors
        questions = await self._generate_questions(
            quiz_words=quiz_words,
            vocabulary_pool=vocabulary,
            book_id=request.book_id,
            include_audio=request.include_audio,
            quiz_mode=request.quiz_mode,
        )

        # Determine module IDs used
        module_ids = request.module_ids or list(
            set(w.module_id for w in vocabulary)
        )

        quiz = VocabularyQuiz(
            quiz_id=str(uuid4()),
            book_id=request.book_id,
            module_ids=module_ids,
            questions=questions,
            created_at=datetime.now(timezone.utc),
            quiz_length=request.quiz_length,
            quiz_mode=request.quiz_mode,
        )

        logger.info(
            f"Quiz generated: quiz_id={quiz.quiz_id}, "
            f"questions={len(questions)}, mode={request.quiz_mode}"
        )

        return quiz

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

    async def _generate_questions(
        self,
        quiz_words: list[VocabularyWord],
        vocabulary_pool: list[VocabularyWord],
        book_id: int,
        include_audio: bool,
        quiz_mode: Literal["definition", "synonym", "antonym", "mixed"] = "definition",
    ) -> list[VocabularyQuizQuestion]:
        """
        Generate quiz questions with distractors for each word.

        Args:
            quiz_words: Words selected for the quiz.
            vocabulary_pool: Full vocabulary pool for selecting distractors.
            book_id: The book ID for audio URL resolution.
            include_audio: Whether to include audio URLs.
            quiz_mode: Type of quiz (definition, synonym, antonym, or mixed).

        Returns:
            List of VocabularyQuizQuestion objects.
        """
        questions = []

        # For mixed mode, distribute question types evenly
        question_types: list[Literal["definition", "synonym", "antonym"]] = []
        if quiz_mode == "mixed":
            types = ["definition", "synonym", "antonym"]
            for i in range(len(quiz_words)):
                question_types.append(types[i % 3])
            random.shuffle(question_types)
        else:
            question_types = [quiz_mode] * len(quiz_words)  # type: ignore

        for i, word in enumerate(quiz_words):
            question_type = question_types[i]

            # For synonym/antonym questions, we need to generate the actual synonym/antonym
            # and use it as the correct answer
            correct_answer = word.word
            question_prompt = ""

            if question_type == "definition":
                # Definition question: show definition, answer is the word
                question_prompt = await self._get_question_prompt(word, question_type)
                correct_answer = word.word
            elif question_type in ("synonym", "antonym"):
                # Synonym/Antonym question: show original word, answer is synonym/antonym
                # Generate the synonym/antonym using LLM
                generated_word = await self._generate_synonym_or_antonym(word.word, question_type)
                if generated_word and generated_word.lower() != word.word.lower():
                    correct_answer = generated_word
                    question_prompt = await self._get_question_prompt(word, question_type)
                else:
                    # Fallback to definition if can't generate synonym/antonym
                    logger.warning(
                        f"Could not generate {question_type} for '{word.word}', falling back to definition"
                    )
                    question_type = "definition"
                    question_prompt = await self._get_question_prompt(word, "definition")
                    correct_answer = word.word

            # Select distractors (excluding the correct answer)
            distractors = self._select_distractors(
                target_word=word,
                vocabulary_pool=vocabulary_pool,
                count=3,
                exclude_word=correct_answer,
            )

            # Create options list with correct answer and shuffle
            options = [correct_answer] + distractors
            random.shuffle(options)

            # Set audio URL to DCS streaming path (frontend will add DCS host and auth)
            audio_url = None
            if include_audio:
                audio_url = self._dcs.get_audio_stream_url(
                    book_id=book_id,
                    lang="en",
                    word=word.word,
                )

            question = VocabularyQuizQuestion(
                question_id=str(uuid4()),
                definition=question_prompt,
                correct_answer=correct_answer,
                options=options,
                audio_url=audio_url,
                vocabulary_id=word.id,
                cefr_level=word.level,
                question_type=question_type,
            )
            questions.append(question)

        return questions

    async def _get_question_prompt(
        self,
        word: VocabularyWord,
        question_type: Literal["definition", "synonym", "antonym"],
    ) -> str:
        """
        Get the MCQ-style question prompt based on question type.

        Uses LLM to generate proper question text like:
        - "What word means 'a feeling of happiness'?"
        - "Which word is a synonym of 'happy'?"
        - "What is the opposite of 'big'?"

        Args:
            word: The vocabulary word.
            question_type: Type of question.

        Returns:
            The question string to display to the student.
        """
        if self._llm is None:
            # Fallback to simple format if no LLM available
            logger.warning(
                f"LLM not available for question generation, "
                f"using simple format for word: {word.word}"
            )
            return self._get_simple_question_prompt(word, question_type)

        try:
            question_text = await self._generate_mcq_question(
                word, question_type
            )
            return question_text
        except Exception as e:
            logger.error(
                f"Failed to generate MCQ question for {word.word}: {e}, "
                "falling back to simple format"
            )
            return self._get_simple_question_prompt(word, question_type)

    def _get_simple_question_prompt(
        self,
        word: VocabularyWord,
        question_type: Literal["definition", "synonym", "antonym"],
    ) -> str:
        """
        Generate a simple question prompt without LLM.

        Args:
            word: The vocabulary word.
            question_type: Type of question.

        Returns:
            Simple question string.
        """
        if question_type == "definition":
            return f"Which word means: \"{word.definition}\"?"
        elif question_type == "synonym":
            return f"Which word is similar in meaning to '{word.word}'?"
        else:  # antonym
            return f"Which word is the opposite of '{word.word}'?"

    async def _generate_mcq_question(
        self,
        word: VocabularyWord,
        question_type: Literal["definition", "synonym", "antonym"],
    ) -> str:
        """
        Generate an MCQ-style question using LLM.

        Args:
            word: The vocabulary word.
            question_type: Type of question (definition, synonym, antonym).

        Returns:
            A well-formed MCQ question string.
        """
        from app.services.llm.base import GenerationOptions

        if self._llm is None:
            raise ValueError("LLM manager not available")

        if question_type == "definition":
            prompt = f"""You are an English vocabulary quiz generator. Generate a single MCQ question.

Task: Create a question asking students to identify the word that matches this definition.

Word: {word.word}
Definition: {word.definition}

Example output formats:
- Which word means 'to make something better'?
- What is the word for 'a feeling of great joy'?
- Which term describes 'the act of helping others'?

IMPORTANT: Only output the question text. No options, no explanation, just the question ending with a question mark.

Question:"""

        elif question_type == "synonym":
            prompt = f"""You are an English vocabulary quiz generator. Generate a single MCQ question.

Task: Create a question asking students to find a synonym (word with similar meaning).

Word: {word.word}

Example output formats:
- Which word has a similar meaning to 'happy'?
- What is another word for 'beautiful'?
- Which word means the same as 'intelligent'?

IMPORTANT: Only output the question text. No options, no explanation, just the question ending with a question mark.

Question:"""

        else:  # antonym
            prompt = f"""You are an English vocabulary quiz generator. Generate a single MCQ question.

Task: Create a question asking students to find an antonym (word with opposite meaning).

Word: {word.word}

Example output formats:
- Which word is the opposite of 'happy'?
- What is the antonym of 'large'?
- Which word means the opposite of 'fast'?

IMPORTANT: Only output the question text. No options, no explanation, just the question ending with a question mark.

Question:"""

        options = GenerationOptions(temperature=0.7, max_tokens=100)
        response = await self._llm.generate(prompt, options)

        # Clean up the response
        result = response.content.strip()
        # Remove quotes if wrapped
        if result.startswith('"') and result.endswith('"'):
            result = result[1:-1]
        # Remove "Question:" prefix if present
        if result.lower().startswith("question:"):
            result = result[9:].strip()
        # Ensure it ends with a question mark
        if not result.endswith("?"):
            result += "?"

        logger.debug(f"Generated MCQ question for '{word.word}' ({question_type}): '{result}'")
        return result

    async def _generate_synonym_or_antonym(
        self,
        word: str,
        relation_type: Literal["synonym", "antonym"],
    ) -> str | None:
        """
        Generate a synonym or antonym for a word using LLM.

        Args:
            word: The target word.
            relation_type: Whether to generate synonym or antonym.

        Returns:
            The generated synonym/antonym word, or None if failed.
        """
        from app.services.llm.base import GenerationOptions

        if self._llm is None:
            return None

        try:
            if relation_type == "synonym":
                prompt = f"""Generate a single common English word that means the same as or is very similar to '{word}'.

Rules:
- Output ONLY the synonym word, nothing else
- No explanations, no punctuation, just the word
- Choose a common, well-known word
- The word must be different from '{word}'

Synonym:"""
            else:  # antonym
                prompt = f"""Generate a single common English word that means the opposite of '{word}'.

Rules:
- Output ONLY the antonym word, nothing else
- No explanations, no punctuation, just the word
- Choose a common, well-known word
- The word must be different from '{word}'

Antonym:"""

            options = GenerationOptions(temperature=0.3, max_tokens=20)
            response = await self._llm.generate(prompt, options)

            # Clean up the response
            result = response.content.strip().lower()
            # Remove any prefixes
            for prefix in ["synonym:", "antonym:", "answer:"]:
                if result.lower().startswith(prefix):
                    result = result[len(prefix):].strip()
            # Get first word only
            result = result.split()[0] if result.split() else ""
            # Remove punctuation
            result = result.strip(".,!?;:'\"")

            if result and result.lower() != word.lower():
                logger.debug(f"Generated {relation_type} for '{word}': '{result}'")
                return result
            else:
                logger.warning(f"Generated {relation_type} '{result}' is same as original word '{word}'")
                return None

        except Exception as e:
            logger.error(f"Failed to generate {relation_type} for '{word}': {e}")
            return None

    def _select_distractors(
        self,
        target_word: VocabularyWord,
        vocabulary_pool: list[VocabularyWord],
        count: int = 3,
        exclude_word: str | None = None,
    ) -> list[str]:
        """
        Select plausible distractors for a vocabulary quiz question.

        Distractors are selected with the following priority:
        1. Same CEFR level, same module
        2. Same CEFR level, different module
        3. Adjacent CEFR level (+/- 1)
        4. Any level (fallback)

        Args:
            target_word: The correct answer word.
            vocabulary_pool: Pool of vocabulary to select from.
            count: Number of distractors to select (default 3).
            exclude_word: Additional word to exclude (e.g., the correct answer for synonym/antonym).

        Returns:
            List of distractor words (strings).
        """
        # Filter out the target word and exclude_word
        exclude_words = {target_word.word.lower()}
        if exclude_word:
            exclude_words.add(exclude_word.lower())

        candidates = [
            w for w in vocabulary_pool if w.word.lower() not in exclude_words
        ]

        if not candidates:
            logger.warning(
                f"No distractor candidates for word: {target_word.word}"
            )
            return []

        # Priority 1: Same level, same module
        same_level_same_module = [
            w for w in candidates
            if w.level == target_word.level and w.module_id == target_word.module_id
        ]

        # Priority 2: Same level, different module
        same_level_diff_module = [
            w for w in candidates
            if w.level == target_word.level and w.module_id != target_word.module_id
        ]

        # Priority 3: Adjacent levels
        adjacent_levels = get_adjacent_cefr_levels(target_word.level)
        adjacent_level_words = [
            w for w in candidates if w.level in adjacent_levels
        ]

        # Build priority order pool
        priority_pool = (
            same_level_same_module
            + same_level_diff_module
            + adjacent_level_words
        )

        # If we have enough in priority pool, use it
        if len(priority_pool) >= count:
            # Ensure uniqueness
            unique_words = list({w.word: w for w in priority_pool}.values())
            if len(unique_words) >= count:
                selected = random.sample(unique_words, count)
                return [w.word for w in selected]

        # Fallback to any word from candidates
        unique_candidates = list({w.word: w for w in candidates}.values())
        actual_count = min(count, len(unique_candidates))
        selected = random.sample(unique_candidates, actual_count)

        return [w.word for w in selected]


# Factory function for dependency injection
_service_instance: VocabularyQuizService | None = None


def get_vocabulary_quiz_service(
    dcs_client: DCSAIServiceClient,
    llm_manager: LLMManager | None = None,
) -> VocabularyQuizService:
    """
    Get or create a VocabularyQuizService instance.

    Args:
        dcs_client: DCS AI service client.
        llm_manager: LLM manager for synonym/antonym generation (optional).

    Returns:
        VocabularyQuizService instance.
    """
    global _service_instance
    if _service_instance is None:
        _service_instance = VocabularyQuizService(dcs_client, llm_manager)
    return _service_instance


def reset_vocabulary_quiz_service() -> None:
    """Reset the service instance (for testing)."""
    global _service_instance
    _service_instance = None
