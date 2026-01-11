"""
Reading Comprehension Generation Service.

Generates reading comprehension activities from book module content.
The LLM creates an ORIGINAL passage based on module topics/context,
then generates comprehension questions about that passage.

Story 27.10: Reading Comprehension Generation
"""

import logging
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.reading_comprehension import (
    ReadingComprehensionActivity,
    ReadingComprehensionQuestion,
    ReadingComprehensionRequest,
)
from app.services.ai_generation.prompts import (
    READING_JSON_SCHEMA,
    READING_SYSTEM_PROMPT,
    build_reading_prompt,
    map_cefr_to_difficulty,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError
from app.services.llm import LLMManager

logger = logging.getLogger(__name__)


class ReadingComprehensionError(Exception):
    """Exception raised when reading comprehension generation fails."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class ReadingComprehensionService:
    """
    Service for generating reading comprehension activities.

    Creates an ORIGINAL passage based on module topics/context using
    LLM, then generates comprehension questions (MCQ, True/False,
    Short Answer) about that passage.

    Example:
        service = ReadingComprehensionService(dcs_client, llm_manager)
        activity = await service.generate_activity(request)
    """

    def __init__(
        self,
        dcs_client: DCSAIServiceClient,
        llm_manager: LLMManager,
    ) -> None:
        """
        Initialize the Reading Comprehension Service.

        Args:
            dcs_client: Client for accessing DCS AI data.
            llm_manager: Manager for LLM generation.
        """
        self._dcs_client = dcs_client
        self._llm_manager = llm_manager
        logger.info("ReadingComprehensionService initialized")

    async def generate_activity(
        self, request: ReadingComprehensionRequest
    ) -> ReadingComprehensionActivity:
        """
        Generate a reading comprehension activity from a book module.

        Uses module content as context to generate an ORIGINAL passage,
        then creates comprehension questions about that passage.

        Args:
            request: Activity generation request with configuration.

        Returns:
            ReadingComprehensionActivity with passage and questions.

        Raises:
            DCSAIDataNotFoundError: If book or module not found.
            ReadingComprehensionError: If LLM generation fails.
        """
        logger.info(
            f"Generating reading comprehension: book_id={request.book_id}, "
            f"module_id={request.module_id}, difficulty={request.difficulty}, "
            f"count={request.question_count}, types={request.question_types}, "
            f"passage_length={request.passage_length}"
        )

        # 1. Fetch module content from DCS as context for passage generation
        module = await self._dcs_client.get_module_detail(
            request.book_id, request.module_id
        )

        if module is None:
            raise DCSAIDataNotFoundError(
                message=f"Module {request.module_id} not found in book {request.book_id}",
                book_id=request.book_id,
            )

        # Extract context sample - used as inspiration, NOT the actual passage
        context_sample = module.text
        if not context_sample or not context_sample.strip():
            raise ReadingComprehensionError(
                message=f"Module {request.module_id} has no text content for context."
            )

        # Extract topics from module (or use title as fallback)
        topics = module.topics if module.topics else [module.title]

        logger.info(
            f"Fetched module: title='{module.title}', "
            f"pages={module.pages}, topics={topics}, context_length={len(context_sample)}"
        )

        # 2. Determine difficulty level
        if request.difficulty == "auto":
            difficulty = map_cefr_to_difficulty(module.difficulty)
            logger.info(
                f"Auto difficulty: CEFR={module.difficulty} -> {difficulty}"
            )
        else:
            difficulty = request.difficulty

        # 3. Build the prompt for passage + questions generation
        user_prompt = build_reading_prompt(
            module_title=module.title,
            topics=topics,
            context_sample=context_sample,
            question_count=request.question_count,
            question_types=request.question_types,
            difficulty=difficulty,
            language=module.language,
            passage_length=request.passage_length,
        )

        # 4. Generate passage AND questions via LLM
        try:
            logger.info("Calling LLM for passage and question generation")
            response = await self._llm_manager.generate_structured(
                prompt=f"{READING_SYSTEM_PROMPT}\n\n{user_prompt}",
                schema=READING_JSON_SCHEMA,
            )

            # Extract generated passage (NEW: LLM creates this)
            generated_passage = response.get("passage", "")
            if not generated_passage or not generated_passage.strip():
                raise ReadingComprehensionError(
                    message="LLM failed to generate a passage. Please try again."
                )

            raw_questions = response.get("questions", [])
            logger.info(
                f"LLM response received: passage={len(generated_passage)} chars, "
                f"{len(raw_questions)} questions"
            )

        except ReadingComprehensionError:
            raise
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise ReadingComprehensionError(
                message=f"Failed to generate passage and questions: {str(e)}",
                original_error=e,
            ) from e

        # 5. Parse and validate response
        if not raw_questions:
            raise ReadingComprehensionError(
                message="LLM returned no questions. Please try again."
            )

        # Map questions to activity format
        questions: list[ReadingComprehensionQuestion] = []

        for q in raw_questions[: request.question_count]:
            question_type = q.get("question_type", "mcq")
            options = q.get("options")

            # Validate options based on question type
            if question_type == "mcq":
                if not options or len(options) != 4:
                    logger.warning(
                        f"Skipping MCQ with {len(options) if options else 0} options"
                    )
                    continue
            elif question_type == "true_false":
                if not options or len(options) != 2:
                    # Fix common LLM mistake: auto-correct True/False options
                    options = ["True", "False"]

            # Get correct_index for MCQ/True-False
            correct_index = q.get("correct_index")
            if question_type in ("mcq", "true_false") and correct_index is None:
                # Try to infer from correct_answer
                correct_answer = q.get("correct_answer", "")
                if options:
                    try:
                        correct_index = options.index(correct_answer)
                    except ValueError:
                        correct_index = 0

            questions.append(
                ReadingComprehensionQuestion(
                    question_id=str(uuid4()),
                    question_type=question_type,
                    question_text=q.get("question", ""),
                    options=options if question_type != "short_answer" else None,
                    correct_answer=q.get("correct_answer", ""),
                    correct_index=correct_index if question_type != "short_answer" else None,
                    explanation=q.get("explanation", ""),
                    passage_reference=q.get("passage_reference", ""),
                )
            )

        if not questions:
            raise ReadingComprehensionError(
                message="No valid questions could be generated. Please try again."
            )

        # 6. Build and return activity
        activity = ReadingComprehensionActivity(
            activity_id=str(uuid4()),
            book_id=request.book_id,
            module_id=request.module_id,
            module_title=module.title,
            passage=generated_passage,  # AI-generated passage based on module context
            passage_pages=module.pages,
            questions=questions,
            difficulty=difficulty,
            language=module.language,
            created_at=datetime.now(timezone.utc),
        )

        logger.info(
            f"Reading activity generated: activity_id={activity.activity_id}, "
            f"questions={len(questions)}"
        )

        return activity
