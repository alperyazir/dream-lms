"""
Listening Quiz Generation Service.

Generates listening comprehension quizzes with TTS audio prompts.
Students listen to audio clips and answer MCQ questions.

Epic 30 - Story 30.4: Listening Skill — Quiz Format (Audio + MCQ)
"""

import logging
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.listening_quiz import (
    ListeningQuizActivity,
    ListeningQuizQuestion,
    ListeningQuizRequest,
)
from app.services.ai_generation.context_helpers import get_metadata_context
from app.services.ai_generation.prompts.listening_prompts import (
    LISTENING_JSON_SCHEMA,
    LISTENING_SYSTEM_PROMPT,
    build_listening_prompt,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError
from app.services.llm import LLMManager
from app.services.tts.manager import TTSManager

logger = logging.getLogger(__name__)


# Map difficulty strings to CEFR levels
_DIFFICULTY_TO_CEFR = {
    "easy": "A1",
    "medium": "A2",
    "hard": "B1",
}


class ListeningQuizError(Exception):
    """Exception raised when listening quiz generation fails."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class ListeningQuizService:
    """Service for generating listening quiz activities with TTS audio."""

    def __init__(
        self,
        dcs_client: DCSAIServiceClient,
        llm_manager: LLMManager,
        tts_manager: TTSManager | None = None,
    ) -> None:
        self._dcs_client = dcs_client
        self._llm_manager = llm_manager
        self._tts_manager = tts_manager
        logger.info("ListeningQuizService initialized")

    async def generate_activity(
        self, request: ListeningQuizRequest
    ) -> ListeningQuizActivity:
        """Generate a listening quiz activity from book module content.

        Flow:
        1. Fetch module text from DCS
        2. Generate questions via LLM (with audio_text for each)
        3. Generate TTS audio for each question's audio_text
        4. Return structured quiz with audio URLs

        Args:
            request: Listening quiz generation request.

        Returns:
            ListeningQuizActivity with questions and audio URLs.

        Raises:
            DCSAIDataNotFoundError: If module not found.
            ListeningQuizError: If generation fails.
        """
        logger.info(
            f"Generating listening quiz: book_id={request.book_id}, "
            f"modules={request.module_ids}, difficulty={request.difficulty}, "
            f"count={request.question_count}"
        )

        # 1. Tier 1: Use metadata-only context (topics + vocab, no full text)
        try:
            ctx = await get_metadata_context(
                self._dcs_client, request.book_id, request.module_ids
            )
        except ValueError as e:
            raise DCSAIDataNotFoundError(
                message=str(e), book_id=request.book_id
            ) from e

        language = request.language or ctx.language

        # 2. Determine difficulty and CEFR level
        if request.difficulty == "auto":
            cefr_level = ctx.difficulty_level or "A2"
            difficulty = self._cefr_to_difficulty(cefr_level)
        else:
            difficulty = request.difficulty
            cefr_level = _DIFFICULTY_TO_CEFR.get(difficulty, "A2")

        # 3. Build prompt and call LLM
        user_prompt = build_listening_prompt(
            question_count=request.question_count,
            difficulty=difficulty,
            language=language,
            topics=ctx.topics,
            module_title=ctx.primary_module_title,
            cefr_level=cefr_level,
            context_text=None,
        )

        try:
            logger.info("Calling LLM for listening quiz generation")
            response = await self._llm_manager.generate_structured(
                prompt=f"{LISTENING_SYSTEM_PROMPT}\n\n{user_prompt}",
                schema=LISTENING_JSON_SCHEMA,
            )
            raw_questions = response.get("questions", [])
            logger.info(f"LLM returned {len(raw_questions)} questions")
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise ListeningQuizError(
                message=f"Failed to generate listening questions: {str(e)}",
                original_error=e,
            ) from e

        if not raw_questions:
            raise ListeningQuizError(
                message="LLM returned no questions. Please try again."
            )

        # 4. Parse questions and generate TTS audio
        quiz_id = str(uuid4())
        questions: list[ListeningQuizQuestion] = []

        for i, q in enumerate(raw_questions[: request.question_count]):
            options = q.get("options", [])
            if len(options) != 4:
                logger.warning(f"Skipping question {i} with {len(options)} options")
                continue

            correct_index = q.get("correct_index", 0)
            if correct_index < 0 or correct_index > 3:
                correct_index = 0

            sub_skill = q.get("sub_skill", "detail")
            if sub_skill not in ("gist", "detail", "discrimination"):
                sub_skill = "detail"

            question_id = str(uuid4())
            audio_text = q.get("audio_text", "")

            questions.append(
                ListeningQuizQuestion(
                    question_id=question_id,
                    audio_text=audio_text,
                    audio_url=None,
                    audio_status="pending",
                    question_text=q.get("question_text", ""),
                    options=options,
                    correct_answer=options[correct_index],
                    correct_index=correct_index,
                    explanation=q.get("explanation"),
                    sub_skill=sub_skill,
                    difficulty=q.get("difficulty", cefr_level),
                )
            )

        if not questions:
            raise ListeningQuizError(
                message="No valid questions could be generated. Please try again."
            )

        # 5. Skip TTS — audio is generated on the frontend via Edge TTS
        # (questions have audio_text populated; frontend calls /tts/passage-audio per question)
        logger.info("Skipping backend TTS — audio will be generated on frontend")

        activity = ListeningQuizActivity(
            activity_id=quiz_id,
            book_id=request.book_id,
            module_ids=request.module_ids,
            questions=questions,
            total_questions=len(questions),
            difficulty=difficulty,
            language=language,
            created_at=datetime.now(timezone.utc),
        )

        logger.info(
            f"Listening quiz generated: activity_id={quiz_id}, "
            f"questions={len(questions)}"
        )
        return activity

    @staticmethod
    def _cefr_to_difficulty(cefr: str) -> str:
        """Map CEFR level to difficulty string."""
        cefr_upper = (cefr or "").upper()
        if cefr_upper in ("A1",):
            return "easy"
        if cefr_upper in ("A2", "B1"):
            return "medium"
        return "hard"


