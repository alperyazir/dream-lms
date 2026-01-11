"""
AI Quiz Generation Service.

Generates multiple-choice questions from book module content using LLM.
Supports configurable difficulty levels and question counts.
"""

import logging
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.ai_quiz import (
    AIQuiz,
    AIQuizGenerationRequest,
    AIQuizQuestion,
)
from app.services.ai_generation.prompts import (
    MCQ_JSON_SCHEMA,
    MCQ_SYSTEM_PROMPT,
    build_mcq_prompt,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError
from app.services.llm import LLMManager

logger = logging.getLogger(__name__)


class QuizGenerationError(Exception):
    """Exception raised when quiz generation fails."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class AIQuizService:
    """
    Service for generating AI-powered MCQ quizzes.

    Uses the LLM Manager to generate questions from book module content
    retrieved via the DCS AI Service Client.

    Example:
        service = AIQuizService(dcs_client, llm_manager)
        quiz = await service.generate_quiz(request)
    """

    def __init__(
        self,
        dcs_client: DCSAIServiceClient,
        llm_manager: LLMManager,
    ) -> None:
        """
        Initialize the AI Quiz Service.

        Args:
            dcs_client: Client for accessing DCS AI data.
            llm_manager: Manager for LLM generation.
        """
        self._dcs_client = dcs_client
        self._llm_manager = llm_manager
        logger.info("AIQuizService initialized")

    async def generate_quiz(self, request: AIQuizGenerationRequest) -> AIQuiz:
        """
        Generate an AI-powered MCQ quiz from book modules.

        Uses a topic-based CLIL approach:
        1. Fetches module metadata including topics (efficient single call)
        2. Generates questions about the topics (not text comprehension)
        3. Uses vocabulary for appropriate language level

        Args:
            request: Quiz generation request with configuration.

        Returns:
            AIQuiz with generated questions.

        Raises:
            DCSAIDataNotFoundError: If book or modules not found.
            QuizGenerationError: If LLM generation fails.
        """
        logger.info(
            f"Generating AI quiz: book_id={request.book_id}, "
            f"modules={request.module_ids}, difficulty={request.difficulty}, "
            f"count={request.question_count}"
        )

        # 1. Fetch all modules metadata in a single call (efficient!)
        modules_metadata = await self._dcs_client.get_modules_metadata(request.book_id)

        if modules_metadata is None:
            raise DCSAIDataNotFoundError(
                message=f"Book {request.book_id} AI data not found",
                book_id=request.book_id,
            )

        # Filter to only the requested modules
        requested_modules = [
            m for m in modules_metadata.modules
            if m.module_id in request.module_ids
        ]

        if not requested_modules:
            raise DCSAIDataNotFoundError(
                message=f"None of the requested modules {request.module_ids} found in book {request.book_id}",
                book_id=request.book_id,
            )

        # 2. Extract topics and metadata from selected modules
        all_topics: list[str] = []
        module_titles: list[str] = []
        cefr_level: str | None = None

        for module in requested_modules:
            module_titles.append(module.title)

            # Collect topics
            if module.topics:
                all_topics.extend(module.topics)

            # Use first module's difficulty as default
            if cefr_level is None:
                cefr_level = module.difficulty_level

        # Remove duplicate topics while preserving order
        all_topics = list(dict.fromkeys(all_topics))

        # 3. Fetch vocabulary for the selected modules
        all_vocabulary: list[str] = []
        for module_id in request.module_ids:
            vocab_response = await self._dcs_client.get_vocabulary(
                request.book_id, module_id
            )
            if vocab_response and vocab_response.words:
                all_vocabulary.extend([w.word for w in vocab_response.words])

        # Remove duplicate vocabulary while preserving order
        all_vocabulary = list(dict.fromkeys(all_vocabulary))

        logger.info(
            f"Fetched metadata for {len(requested_modules)} modules, "
            f"{len(all_topics)} topics, {len(all_vocabulary)} vocabulary words"
        )

        # 4. Prepare module title and language
        combined_title = (
            " | ".join(module_titles)
            if len(module_titles) <= 3
            else f"{module_titles[0]} and {len(module_titles) - 1} more"
        )
        language = request.language or modules_metadata.primary_language or "en"

        # 5. Determine difficulty (handle "auto" by mapping from CEFR level)
        difficulty = request.difficulty
        if difficulty == "auto":
            # Map CEFR level to difficulty
            cefr_to_difficulty = {
                "A1": "easy",
                "A2": "easy",
                "B1": "medium",
                "B2": "medium",
                "C1": "hard",
                "C2": "hard",
            }
            difficulty = cefr_to_difficulty.get(cefr_level or "B1", "medium")
            logger.info(f"Auto difficulty mapped from CEFR {cefr_level} to {difficulty}")

        # 6. Build the topic-based prompt
        user_prompt = build_mcq_prompt(
            question_count=request.question_count,
            difficulty=difficulty,
            language=language,
            include_explanations=request.include_explanations,
            # Topic-based parameters
            topics=all_topics if all_topics else None,
            vocabulary=all_vocabulary if all_vocabulary else None,
            module_title=combined_title,
            cefr_level=cefr_level,
            context_text=None,  # No text context needed for topic-based generation
            # Fallback to None - will raise error if no topics
            source_text=None,
        )

        # 6. Generate questions via LLM
        try:
            logger.info("Calling LLM for question generation")
            response = await self._llm_manager.generate_structured(
                prompt=f"{MCQ_SYSTEM_PROMPT}\n\n{user_prompt}",
                schema=MCQ_JSON_SCHEMA,
            )
            logger.info(f"LLM response received: {len(response.get('questions', []))} questions")

        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise QuizGenerationError(
                message=f"Failed to generate questions: {str(e)}",
                original_error=e,
            ) from e

        # 7. Parse and validate response
        raw_questions = response.get("questions", [])

        if not raw_questions:
            raise QuizGenerationError(
                message="LLM returned no questions. Please try again."
            )

        # Map questions to quiz format
        questions: list[AIQuizQuestion] = []
        module_count = len(requested_modules)

        for i, q in enumerate(raw_questions[: request.question_count]):
            # Distribute questions across modules
            source_module = requested_modules[i % module_count]

            # Validate correct_index
            correct_index = q.get("correct_index", 0)
            if not (0 <= correct_index <= 3):
                correct_index = 0

            options = q.get("options", [])
            if len(options) != 4:
                # Skip malformed questions
                logger.warning(f"Skipping question with {len(options)} options")
                continue

            questions.append(
                AIQuizQuestion(
                    question_id=str(uuid4()),
                    question_text=q.get("question", ""),
                    options=options,
                    correct_answer=options[correct_index],
                    correct_index=correct_index,
                    explanation=q.get("explanation") if request.include_explanations else None,
                    source_module_id=source_module.module_id,
                    source_page=source_module.start_page if source_module.start_page else None,
                    difficulty=difficulty,  # Use resolved difficulty
                )
            )

        if not questions:
            raise QuizGenerationError(
                message="No valid questions could be generated. Please try again."
            )

        # 8. Build and return quiz
        quiz = AIQuiz(
            quiz_id=str(uuid4()),
            book_id=request.book_id,
            module_ids=request.module_ids,
            questions=questions,
            difficulty=difficulty,  # Use resolved difficulty
            language=language,
            created_at=datetime.now(timezone.utc),
        )

        logger.info(
            f"AI quiz generated: quiz_id={quiz.quiz_id}, "
            f"questions={len(questions)}"
        )

        return quiz
