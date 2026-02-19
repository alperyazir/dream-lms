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
from app.services.ai_generation.context_helpers import get_metadata_context
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

        # 1. Fetch metadata-only context (topics + vocab, no full text)
        all_module_ids = request.module_ids or [request.module_id]

        try:
            ctx = await get_metadata_context(
                self._dcs_client, request.book_id, all_module_ids,
            )
        except ValueError as e:
            raise DCSAIDataNotFoundError(
                message=str(e),
                book_id=request.book_id,
            ) from e

        logger.info(
            f"Metadata context: modules={len(ctx.module_titles)}, "
            f"topics={len(ctx.topics)}, vocab={len(ctx.vocabulary_words)}, "
            f"summaries={len(ctx.module_summaries)}, "
            f"grammar_points={len(ctx.grammar_points)}"
        )

        # 2. Determine difficulty level
        if request.difficulty == "auto":
            difficulty = map_cefr_to_difficulty(ctx.difficulty_level)
            logger.info(
                f"Auto difficulty: CEFR={ctx.difficulty_level} -> {difficulty}"
            )
        else:
            difficulty = request.difficulty

        # 3. Build combined module title for multi-module awareness
        if len(ctx.module_titles) == 1:
            combined_title = ctx.module_titles[0]
        elif len(ctx.module_titles) <= 4:
            combined_title = " | ".join(ctx.module_titles)
        else:
            combined_title = (
                f"{ctx.module_titles[0]} and {len(ctx.module_titles) - 1} more modules"
            )

        # 4. Build the prompt for passage + questions generation
        user_prompt = build_reading_prompt(
            module_title=combined_title,
            topics=ctx.topics,
            context_sample="\n".join(ctx.module_summaries) if ctx.module_summaries else "(Use topics and vocabulary as guidance)",
            question_count=request.question_count,
            question_types=request.question_types,
            difficulty=difficulty,
            language=ctx.language,
            passage_length=request.passage_length,
            vocabulary=ctx.vocabulary_words[:30],
            grammar_points=ctx.grammar_points,
            passage_index=request.passage_index,
            total_passages=request.total_passages,
        )

        # 5. Generate passage AND questions via LLM
        full_prompt = f"{READING_SYSTEM_PROMPT}\n\n{user_prompt}"

        try:
            logger.info("Calling LLM for passage and question generation")
            response = await self._llm_manager.generate_structured(
                prompt=full_prompt,
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
        # Use passage index for title if multi-passage, otherwise combined module title
        if request.passage_index and request.total_passages and request.total_passages > 1:
            activity_title = f"Passage {request.passage_index}"
        else:
            activity_title = combined_title

        activity = ReadingComprehensionActivity(
            activity_id=str(uuid4()),
            book_id=request.book_id,
            module_id=request.module_id,
            module_title=activity_title,
            passage=generated_passage,  # AI-generated passage based on module context
            passage_pages=[],
            questions=questions,
            difficulty=difficulty,
            language=ctx.language,
            created_at=datetime.now(timezone.utc),
        )

        logger.info(
            f"Reading activity generated: activity_id={activity.activity_id}, "
            f"questions={len(questions)}"
        )

        return activity
