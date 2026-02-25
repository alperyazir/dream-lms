"""
AI Generation API Routes.

Endpoints for AI-powered content generation including vocabulary quizzes,
AI-generated MCQ quizzes, and reading comprehension activities.
"""

import logging
from typing import Annotated
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.api.deps import AsyncSessionDep, CurrentUser, require_role
from app.models import TeacherGeneratedContent, User, UserRole
from app.schemas.ai_quiz import (
    AIQuiz,
    AIQuizGenerationRequest,
    AIQuizPublic,
    AIQuizQuestion,
    AIQuizResult,
    AIQuizSubmission,
    CreateAssignmentRequest,
    RegenerateQuestionRequest,
    SaveToLibraryRequest,
    SaveToLibraryResponse,
)
from app.schemas.dcs_ai_data import (
    ModuleListResponse,
    ProcessingMetadata,
)
from app.schemas.content_library import (
    AssignContentRequest,
    AssignContentResponse,
    ContentCreator,
    ContentItemDetail,
    ContentItemPublic,
    DeleteContentResponse,
    LibraryResponse,
    UpdateContentRequest,
    UpdateContentResponse,
)
from app.schemas.reading_comprehension import (
    ReadingComprehensionActivity,
    ReadingComprehensionActivityPublic,
    ReadingComprehensionRequest,
    ReadingComprehensionResult,
    ReadingComprehensionSubmission,
)
from app.schemas.sentence_builder import (
    SentenceBuilderActivity,
    SentenceBuilderActivityPublic,
    SentenceBuilderRequest,
    SentenceBuilderResult,
    SentenceBuilderSubmission,
)
from app.schemas.vocabulary_quiz import (
    VocabularyQuiz,
    VocabularyQuizGenerationRequest,
    VocabularyQuizPublic,
    VocabularyQuizResult,
    VocabularyQuizSubmission,
)
from app.schemas.word_builder import (
    WordBuilderActivity,
    WordBuilderActivityPublic,
    WordBuilderRequest,
    WordBuilderResult,
    WordBuilderSubmission,
)
from app.services.ai_generation import (
    AIQuizService,
    InsufficientVocabularyError,
    QuizGenerationError,
    QuizStorageService,
    ReadingComprehensionError,
    ReadingComprehensionService,
    VocabularyQuizService,
    get_quiz_storage_service,
)
from app.services.ai_generation.sentence_builder_service import (
    InsufficientSentencesError,
    SentenceBuilderError,
    SentenceBuilderService,
)
from app.services.ai_generation.word_builder_service import (
    InsufficientVocabularyError as WordBuilderInsufficientVocabularyError,
)
from app.services.ai_generation.word_builder_service import (
    WordBuilderError,
    WordBuilderService,
)
from app.schemas.ai_generation_v2 import GenerationRequestV2
from app.services.dcs_ai import DCSAIServiceClient, get_dcs_ai_client
from app.services.dcs_ai.exceptions import (
    DCSAIDataAuthError,
    DCSAIDataConnectionError,
    DCSAIDataNotFoundError,
    DCSAIDataNotReadyError,
)
from app.services.llm import LLMManager, get_llm_manager
from app.services.llm.rate_limiter import RateLimiter, get_rate_limiter
from app.services.llm.exceptions import RateLimitExceededError
from app.services.tts import TTSManager, get_tts_manager
from app.services.tts.providers.edge import EdgeTTSProvider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai-generation"])


def _set_deprecation_headers(response: Response) -> None:
    """Add deprecation headers to legacy generation endpoints (Story 30.3)."""
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "2026-06-01"
    response.headers["Link"] = '</api/v1/ai/generate-v2>; rel="successor-version"'


# Dependency to get DCS AI client (async)
async def get_dcs_client_dep() -> DCSAIServiceClient:
    """Get the DCS AI service client."""
    return await get_dcs_ai_client()


# Dependency to get quiz storage service
def get_storage_dep() -> QuizStorageService:
    """Get the quiz storage service."""
    return get_quiz_storage_service()


# Dependency to get LLM manager
def get_llm_manager_dep() -> LLMManager:
    """Get the LLM manager."""
    return get_llm_manager()


# Dependency to get vocabulary quiz service
async def get_quiz_service_dep(
    dcs_client: DCSAIServiceClient = Depends(get_dcs_client_dep),
    llm_manager: LLMManager = Depends(get_llm_manager_dep),
) -> VocabularyQuizService:
    """Get the vocabulary quiz service with DCS client and LLM manager."""
    return VocabularyQuizService(dcs_client, llm_manager)


# Dependency to get AI quiz service
async def get_ai_quiz_service_dep(
    dcs_client: DCSAIServiceClient = Depends(get_dcs_client_dep),
    llm_manager: LLMManager = Depends(get_llm_manager_dep),
) -> AIQuizService:
    """Get the AI quiz service with DCS client and LLM manager."""
    return AIQuizService(dcs_client, llm_manager)


# Dependency to get reading comprehension service
async def get_reading_service_dep(
    dcs_client: DCSAIServiceClient = Depends(get_dcs_client_dep),
    llm_manager: LLMManager = Depends(get_llm_manager_dep),
) -> ReadingComprehensionService:
    """Get the reading comprehension service with DCS client and LLM manager."""
    return ReadingComprehensionService(dcs_client, llm_manager)


DCSClientDep = Annotated[DCSAIServiceClient, Depends(get_dcs_client_dep)]
StorageDep = Annotated[QuizStorageService, Depends(get_storage_dep)]
QuizServiceDep = Annotated[VocabularyQuizService, Depends(get_quiz_service_dep)]
AIQuizServiceDep = Annotated[AIQuizService, Depends(get_ai_quiz_service_dep)]
ReadingServiceDep = Annotated[ReadingComprehensionService, Depends(get_reading_service_dep)]


# Dependency to get rate limiter
def get_rate_limiter_dep() -> RateLimiter:
    """Get the rate limiter instance."""
    return get_rate_limiter()


RateLimiterDep = Annotated[RateLimiter, Depends(get_rate_limiter_dep)]


# Dependency to get TTS manager
def get_tts_manager_dep() -> TTSManager | None:
    """Get the TTS manager, or None if TTS is disabled."""
    try:
        return get_tts_manager()
    except Exception:
        return None


# Dependency to get sentence builder service
async def get_sentence_service_dep(
    dcs_client: DCSAIServiceClient = Depends(get_dcs_client_dep),
    llm_manager: LLMManager = Depends(get_llm_manager_dep),
    tts_manager: TTSManager | None = Depends(get_tts_manager_dep),
) -> SentenceBuilderService:
    """Get the sentence builder service with DCS client, LLM, and TTS managers."""
    return SentenceBuilderService(dcs_client, llm_manager, tts_manager)


SentenceServiceDep = Annotated[SentenceBuilderService, Depends(get_sentence_service_dep)]


# Dependency to get word builder service
async def get_word_builder_service_dep(
    dcs_client: DCSAIServiceClient = Depends(get_dcs_client_dep),
    tts_manager: TTSManager | None = Depends(get_tts_manager_dep),
) -> WordBuilderService:
    """Get the word builder service with DCS client and TTS manager."""
    return WordBuilderService(dcs_client, tts_manager)


WordBuilderServiceDep = Annotated[WordBuilderService, Depends(get_word_builder_service_dep)]

# Roles that can generate quizzes
TeacherOrHigher = require_role(
    UserRole.teacher, UserRole.supervisor, UserRole.admin
)


# =============================================================================
# DCS AI Data Proxy Endpoints
# =============================================================================


@router.get(
    "/books/{book_id}/status",
    response_model=ProcessingMetadata,
    summary="Get AI processing status for a book",
    description="Check if a book has been processed by the AI pipeline and get metadata.",
)
async def get_book_ai_status(
    book_id: int,
    current_user: CurrentUser,
    dcs_client: DCSClientDep,
) -> ProcessingMetadata:
    """
    Get the AI processing status and metadata for a book.

    Returns processing status, total modules, vocabulary count, and languages.
    """
    logger.info(
        f"AI status requested: book_id={book_id}, user_id={current_user.id}"
    )

    try:
        metadata = await dcs_client.get_processing_status(book_id)
        if metadata is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No AI data found for book {book_id}. The book may not have been processed yet.",
            )
        return metadata

    except DCSAIDataAuthError as e:
        logger.error(f"DCS auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to connect to content storage service.",
        )

    except DCSAIDataConnectionError as e:
        logger.error(f"DCS connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content storage service unavailable.",
        )


@router.get(
    "/books/{book_id}/modules",
    response_model=ModuleListResponse,
    summary="Get AI modules for a book",
    description="Get the list of modules with AI data for content generation.",
)
async def get_book_ai_modules(
    book_id: int,
    current_user: CurrentUser,
    dcs_client: DCSClientDep,
) -> ModuleListResponse:
    """
    Get the list of modules available for AI content generation.

    Returns module IDs, titles, page numbers, and word counts.
    Use these module_ids when generating activities.
    """
    logger.info(
        f"AI modules requested: book_id={book_id}, user_id={current_user.id}"
    )

    try:
        # First check if book is processed
        metadata = await dcs_client.get_processing_status(book_id)
        if metadata is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No AI data found for book {book_id}. The book may not have been processed yet.",
            )

        if metadata.processing_status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Book AI processing is not complete. Status: {metadata.processing_status}",
            )

        # Get modules
        modules = await dcs_client.get_modules(book_id)
        if modules is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No modules found for book {book_id}.",
            )

        return modules

    except DCSAIDataAuthError as e:
        logger.error(f"DCS auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to connect to content storage service.",
        )

    except DCSAIDataConnectionError as e:
        logger.error(f"DCS connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content storage service unavailable.",
        )


# =============================================================================
# TTS (Text-to-Speech) Endpoints
# =============================================================================


TTSManagerDep = Annotated[TTSManager | None, Depends(get_tts_manager_dep)]


@router.get(
    "/tts/audio",
    summary="Generate audio from text",
    description=(
        "Generate audio pronunciation for a word or short text using TTS. "
        "Returns audio as a streaming MP3 response."
    ),
    responses={
        200: {
            "content": {"audio/mpeg": {}},
            "description": "Audio file",
        }
    },
)
async def generate_tts_audio(
    text: str = Query(..., min_length=1, max_length=200, description="Text to convert to speech"),
    lang: str = Query("en", description="Language code (en, tr, etc.)"),
    tts_manager: TTSManagerDep = None,
):
    """
    Generate audio pronunciation for a word or text.

    This endpoint uses TTS (Text-to-Speech) to generate audio on-demand.
    Useful for vocabulary pronunciation when pre-generated audio is not available.

    - **text**: The word or phrase to pronounce (max 200 characters)
    - **lang**: Language code (default: en)
    """
    from fastapi.responses import Response

    if tts_manager is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TTS service is not available. Please check TTS configuration.",
        )

    try:
        # Generate audio using TTS manager
        from app.services.tts.base import AudioGenerationOptions

        options = AudioGenerationOptions(
            language=lang,
            voice=None,  # Use default voice for language
            speed=1.0,
            format="mp3",
        )

        result = await tts_manager.generate_audio(text, options)

        # Return audio as streaming response
        return Response(
            content=result.audio_data,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="{text[:20]}.mp3"',
                "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
            },
        )

    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate audio: {str(e)}",
        )


# =============================================================================
# Passage Audio Endpoint (Edge TTS with word-level timestamps)
# =============================================================================


@router.post(
    "/tts/passage-audio",
    summary="Generate passage audio with word timestamps",
    description=(
        "Generate narration audio for a reading passage using Edge TTS. "
        "Returns base64-encoded audio and word-level timestamps for synchronized "
        "word highlighting in the UI."
    ),
)
async def generate_passage_audio(
    request: dict,
    current_user: CurrentUser,
):
    """
    Generate passage narration audio with word-level timestamps.

    - **text**: The passage text to narrate (max 5000 characters)
    - **voice_id**: Optional Edge TTS voice name (e.g. 'en-US-JennyNeural')
    """
    text = request.get("text", "")
    if not text or len(text) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text is required and must be at most 5000 characters.",
        )

    voice_id = request.get("voice_id") or "en-US-JennyNeural"

    try:
        provider = EdgeTTSProvider()
        result = await provider.generate_passage_audio(
            text=text,
            voice=voice_id,
        )
        return {
            "audio_base64": result.audio_base64,
            "word_timestamps": [
                {"word": wt.word, "start": wt.start, "end": wt.end}
                for wt in result.word_timestamps
            ],
            "duration_seconds": result.duration_seconds,
        }
    except Exception as e:
        logger.error(f"Edge TTS passage audio generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate passage audio: {str(e)}",
        )


# =============================================================================
# DCS Audio Proxy Endpoint
# =============================================================================


@router.get(
    "/audio/vocabulary/{book_id}/{lang}/{word_id}",
    summary="Stream vocabulary audio from DCS",
    description=(
        "Proxy endpoint to stream vocabulary word audio from DCS. "
        "Handles DCS authentication and streams audio to the client."
    ),
    responses={
        200: {
            "content": {"audio/mpeg": {}},
            "description": "Audio file stream",
        }
    },
)
async def stream_vocabulary_audio(
    book_id: int,
    lang: str,
    word_id: str,
    current_user: CurrentUser,
    dcs_client: DCSClientDep,
):
    """
    Stream vocabulary word audio from DCS.

    This endpoint acts as a proxy between the frontend and DCS,
    handling DCS authentication automatically.

    - **book_id**: The DCS book ID
    - **lang**: Language code (en, tr, etc.)
    - **word_id**: The vocabulary word ID (e.g., "word_1", "word_42")
    """
    from fastapi.responses import StreamingResponse

    logger.info(
        f"Audio stream requested: book_id={book_id}, lang={lang}, word_id={word_id}, "
        f"user_id={current_user.id}"
    )

    try:
        # Use the DCS client's underlying HTTP client to fetch audio
        # The DCS client already handles authentication
        # DCS expects: /books/{book_id}/ai-data/audio/vocabulary/{lang}/{word_id}.mp3
        response = await dcs_client._dcs._make_request(
            "GET",
            f"/books/{book_id}/ai-data/audio/vocabulary/{lang}/{word_id}.mp3",
        )

        if response.status_code != 200:
            logger.warning(
                f"DCS audio not found: book_id={book_id}, word_id={word_id}, "
                f"status={response.status_code}"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audio not found for this word.",
            )

        # Stream the audio content
        async def audio_stream():
            yield response.content

        return StreamingResponse(
            audio_stream(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="{word_id}.mp3"',
                "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio stream failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio not available.",
        )


@router.post(
    "/vocabulary-quiz/generate",
    response_model=VocabularyQuiz,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a vocabulary quiz",
    description=(
        "Generate a vocabulary quiz from book modules. "
        "Only teachers, supervisors, and admins can generate quizzes."
    ),
)
async def generate_vocabulary_quiz(
    request: VocabularyQuizGenerationRequest,
    current_user: Annotated[User, TeacherOrHigher],
    quiz_service: QuizServiceDep,
    storage: StorageDep,
    rate_limiter: RateLimiterDep,
    response: Response = None,
) -> VocabularyQuiz:
    """
    Generate a vocabulary quiz from book modules.

    The quiz presents English definitions and asks students to select
    the correct word from multiple options.

    - **book_id**: The book to generate quiz from
    - **module_ids**: Optional list of specific modules (defaults to all)
    - **quiz_length**: Number of questions (5, 10, 15, or 20)
    - **cefr_levels**: Optional filter by CEFR level
    - **include_audio**: Whether to include audio URLs
    """
    # Deprecation header (Story 30.3)
    if response:
        _set_deprecation_headers(response)

    # Check rate limit before generation
    try:
        rate_limiter.check_limits(str(current_user.id), 1)
    except RateLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": str(e),
                "limit_type": e.limit_type,
                "current_usage": e.current_usage,
                "max_allowed": e.max_allowed,
                "reset_at": e.reset_at,
            },
        )

    logger.info(
        f"Quiz generation requested by user_id={current_user.id}, "
        f"book_id={request.book_id}"
    )

    try:
        quiz = await quiz_service.generate_quiz(request)

        # Save quiz to storage for later access
        await storage.save_quiz(quiz)

        # Record usage after successful generation
        rate_limiter.record_usage(str(current_user.id), 1)

        logger.info(
            f"Quiz generated successfully: quiz_id={quiz.quiz_id}, "
            f"questions={quiz.quiz_length}"
        )

        return quiz

    except DCSAIDataNotFoundError as e:
        logger.warning(f"Book not found: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )

    except DCSAIDataNotReadyError as e:
        logger.warning(f"Book not ready: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.message,
        )

    except InsufficientVocabularyError as e:
        logger.warning(f"Insufficient vocabulary: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": e.message,
                "available": e.available,
                "required": e.required,
            },
        )

    except DCSAIDataAuthError as e:
        logger.error(f"DCS auth error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content service temporarily unavailable.",
        )

    except DCSAIDataConnectionError as e:
        logger.error(f"DCS connection error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content service temporarily unavailable.",
        )


@router.get(
    "/vocabulary-quiz/{quiz_id}",
    response_model=VocabularyQuizPublic,
    summary="Get a vocabulary quiz",
    description=(
        "Get a vocabulary quiz by ID. "
        "Returns the quiz without correct answers for students to take."
    ),
)
async def get_vocabulary_quiz(
    quiz_id: str,
    current_user: CurrentUser,
    storage: StorageDep,
) -> VocabularyQuizPublic:
    """
    Get a vocabulary quiz for taking.

    Returns the quiz questions without the correct answers.
    All authenticated users can access quizzes.
    """
    quiz = await storage.get_quiz_public(quiz_id)

    if quiz is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found or expired.",
        )

    return quiz


@router.post(
    "/vocabulary-quiz/{quiz_id}/submit",
    response_model=VocabularyQuizResult,
    summary="Submit quiz answers",
    description=(
        "Submit answers for a vocabulary quiz. "
        "Returns the results with correct answers revealed."
    ),
)
async def submit_vocabulary_quiz(
    quiz_id: str,
    submission: VocabularyQuizSubmission,
    current_user: CurrentUser,
    storage: StorageDep,
) -> VocabularyQuizResult:
    """
    Submit answers for a vocabulary quiz.

    - **answers**: Dictionary mapping question_id to selected word

    Returns the quiz results including score and correct answers.
    """
    # Check if already submitted
    if await storage.has_submitted(quiz_id, current_user.id):
        # Return existing result
        result = await storage.get_result(quiz_id, current_user.id)
        if result:
            return result

    # Process submission
    result = await storage.save_submission(
        quiz_id=quiz_id,
        student_id=current_user.id,
        answers=submission.answers,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found or expired.",
        )

    logger.info(
        f"Quiz submitted: quiz_id={quiz_id}, user_id={current_user.id}, "
        f"score={result.score}/{result.total}"
    )

    return result


@router.get(
    "/vocabulary-quiz/{quiz_id}/result",
    response_model=VocabularyQuizResult,
    summary="Get quiz result",
    description="Get the result of a previously submitted quiz.",
)
async def get_vocabulary_quiz_result(
    quiz_id: str,
    current_user: CurrentUser,
    storage: StorageDep,
) -> VocabularyQuizResult:
    """
    Get the result of a previously submitted quiz.

    Returns the quiz results if the user has submitted this quiz.
    """
    result = await storage.get_result(quiz_id, current_user.id)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz result not found. Have you submitted this quiz?",
        )

    return result


# ========== AI Quiz Endpoints ==========


@router.post(
    "/quiz/debug-request",
    summary="Debug endpoint to see raw request body",
)
async def debug_quiz_request(
    request: dict,
) -> dict:
    """Debug endpoint to see what the frontend is sending."""
    import logging
    logging.getLogger(__name__).info(f"DEBUG RAW REQUEST: {request}")
    return {"received": request}


@router.post(
    "/quiz/generate",
    response_model=AIQuiz,
    status_code=status.HTTP_201_CREATED,
    summary="Generate an AI quiz",
    description=(
        "Generate an AI-powered MCQ quiz from book modules using LLM. "
        "Only teachers, supervisors, and admins can generate quizzes."
    ),
)
async def generate_ai_quiz(
    request: AIQuizGenerationRequest,
    current_user: Annotated[User, TeacherOrHigher],
    ai_quiz_service: AIQuizServiceDep,
    storage: StorageDep,
    rate_limiter: RateLimiterDep,
    response: Response = None,
) -> AIQuiz:
    """
    Generate an AI-powered MCQ quiz from book modules.

    Uses LLM to generate comprehension questions with plausible distractors.

    - **book_id**: The book to generate quiz from
    - **module_ids**: List of module IDs to use as source content
    - **difficulty**: Difficulty level (easy, medium, hard)
    - **question_count**: Number of questions (1-20)
    - **language**: Language for questions (auto-detected if not provided)
    - **include_explanations**: Whether to include answer explanations
    """
    # Deprecation header (Story 30.3)
    if response:
        _set_deprecation_headers(response)

    # Check rate limit before generation
    try:
        rate_limiter.check_limits(str(current_user.id), 1)
    except RateLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": str(e),
                "limit_type": e.limit_type,
                "current_usage": e.current_usage,
                "max_allowed": e.max_allowed,
                "reset_at": e.reset_at,
            },
        )

    # Debug logging to see what was received
    logger.info(f"DEBUG: Received request: {request.model_dump()}")
    logger.info(
        f"AI Quiz generation requested by user_id={current_user.id}, "
        f"book_id={request.book_id}, modules={request.module_ids}"
    )

    try:
        quiz = await ai_quiz_service.generate_quiz(request)

        # Save quiz to storage for later access
        await storage.save_ai_quiz(quiz)

        # Record usage after successful generation
        rate_limiter.record_usage(str(current_user.id), 1)

        logger.info(
            f"AI Quiz generated successfully: quiz_id={quiz.quiz_id}, "
            f"questions={len(quiz.questions)}"
        )

        return quiz

    except DCSAIDataNotFoundError as e:
        logger.warning(f"Module not found: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )

    except DCSAIDataNotReadyError as e:
        logger.warning(f"Book not ready: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.message,
        )

    except QuizGenerationError as e:
        logger.error(f"Quiz generation failed: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )

    except DCSAIDataAuthError as e:
        logger.error(f"DCS auth error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content service temporarily unavailable.",
        )

    except DCSAIDataConnectionError as e:
        logger.error(f"DCS connection error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content service temporarily unavailable.",
        )


@router.get(
    "/quiz/{quiz_id}",
    response_model=AIQuizPublic,
    summary="Get an AI quiz",
    description=(
        "Get an AI quiz by ID. "
        "Returns the quiz without correct answers for students to take."
    ),
)
async def get_ai_quiz(
    quiz_id: str,
    current_user: CurrentUser,
    storage: StorageDep,
) -> AIQuizPublic:
    """
    Get an AI quiz for taking.

    Returns the quiz questions without the correct answers.
    All authenticated users can access quizzes.
    """
    quiz = await storage.get_ai_quiz_public(quiz_id)

    if quiz is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found or expired.",
        )

    return quiz


@router.post(
    "/quiz/{quiz_id}/submit",
    response_model=AIQuizResult,
    summary="Submit AI quiz answers",
    description=(
        "Submit answers for an AI quiz. "
        "Returns the results with correct answers and explanations revealed."
    ),
)
async def submit_ai_quiz(
    quiz_id: str,
    submission: AIQuizSubmission,
    current_user: CurrentUser,
    storage: StorageDep,
) -> AIQuizResult:
    """
    Submit answers for an AI quiz.

    - **answers**: Dictionary mapping question_id to selected option index (0-3)

    Returns the quiz results including score, correct answers, and explanations.
    """
    # Check if already submitted
    if await storage.has_submitted_ai_quiz(quiz_id, current_user.id):
        # Return existing result
        result = await storage.get_ai_quiz_result(quiz_id, current_user.id)
        if result:
            return result

    # Process submission
    result = await storage.save_ai_quiz_submission(
        quiz_id=quiz_id,
        student_id=current_user.id,
        answers=submission.answers,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found or expired.",
        )

    logger.info(
        f"AI Quiz submitted: quiz_id={quiz_id}, user_id={current_user.id}, "
        f"score={result.score}/{result.total}"
    )

    return result


@router.get(
    "/quiz/{quiz_id}/result",
    response_model=AIQuizResult,
    summary="Get AI quiz result",
    description="Get the result of a previously submitted AI quiz.",
)
async def get_ai_quiz_result(
    quiz_id: str,
    current_user: CurrentUser,
    storage: StorageDep,
) -> AIQuizResult:
    """
    Get the result of a previously submitted AI quiz.

    Returns the quiz results if the user has submitted this quiz.
    """
    result = await storage.get_ai_quiz_result(quiz_id, current_user.id)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz result not found. Have you submitted this quiz?",
        )

    return result


# ========== Reading Comprehension Endpoints ==========


@router.post(
    "/reading/generate",
    response_model=ReadingComprehensionActivity,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a reading comprehension activity",
    description=(
        "Generate a reading comprehension activity from a book module. "
        "Uses ACTUAL module text as the passage and generates questions about it. "
        "Only teachers, supervisors, and admins can generate activities."
    ),
)
async def generate_reading_activity(
    request: ReadingComprehensionRequest,
    current_user: Annotated[User, TeacherOrHigher],
    reading_service: ReadingServiceDep,
    storage: StorageDep,
    rate_limiter: RateLimiterDep,
    response: Response = None,
) -> ReadingComprehensionActivity:
    """
    Generate a reading comprehension activity from a book module.

    Uses ACTUAL module text as the passage (NOT AI-generated).
    Generates comprehension questions (MCQ, True/False, Short Answer) about it.

    - **book_id**: The book containing the module
    - **module_id**: The module to use as the passage source
    - **question_count**: Number of questions (1-10)
    - **question_types**: Types of questions to generate
    - **difficulty**: Difficulty level (auto uses module's CEFR level)
    """
    # Deprecation header (Story 30.3)
    if response:
        _set_deprecation_headers(response)

    # Check rate limit before generation
    try:
        rate_limiter.check_limits(str(current_user.id), 1)
    except RateLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": str(e),
                "limit_type": e.limit_type,
                "current_usage": e.current_usage,
                "max_allowed": e.max_allowed,
                "reset_at": e.reset_at,
            },
        )

    logger.info(
        f"Reading activity generation requested by user_id={current_user.id}, "
        f"book_id={request.book_id}, module_id={request.module_id}"
    )

    try:
        activity = await reading_service.generate_activity(request)

        # Save activity to storage for later access
        await storage.save_reading_activity(activity)

        # Record usage after successful generation
        rate_limiter.record_usage(str(current_user.id), 1)

        logger.info(
            f"Reading activity generated successfully: activity_id={activity.activity_id}, "
            f"questions={len(activity.questions)}"
        )

        return activity

    except DCSAIDataNotFoundError as e:
        logger.warning(f"Module not found: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )

    except DCSAIDataNotReadyError as e:
        logger.warning(f"Book not ready: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.message,
        )

    except ReadingComprehensionError as e:
        logger.error(f"Reading activity generation failed: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )

    except DCSAIDataAuthError as e:
        logger.error(f"DCS auth error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content service temporarily unavailable.",
        )

    except DCSAIDataConnectionError as e:
        logger.error(f"DCS connection error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content service temporarily unavailable.",
        )


@router.get(
    "/reading/{activity_id}",
    response_model=ReadingComprehensionActivityPublic,
    summary="Get a reading comprehension activity",
    description=(
        "Get a reading comprehension activity by ID. "
        "Returns the activity with passage but without correct answers."
    ),
)
async def get_reading_activity(
    activity_id: str,
    current_user: CurrentUser,
    storage: StorageDep,
) -> ReadingComprehensionActivityPublic:
    """
    Get a reading comprehension activity for taking.

    Returns the passage and questions without the correct answers.
    All authenticated users can access activities.
    """
    activity = await storage.get_reading_activity_public(activity_id)

    if activity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found or expired.",
        )

    return activity


@router.post(
    "/reading/{activity_id}/submit",
    response_model=ReadingComprehensionResult,
    summary="Submit reading comprehension answers",
    description=(
        "Submit answers for a reading comprehension activity. "
        "Returns the results with correct answers and explanations revealed."
    ),
)
async def submit_reading_activity(
    activity_id: str,
    submission: ReadingComprehensionSubmission,
    current_user: CurrentUser,
    storage: StorageDep,
) -> ReadingComprehensionResult:
    """
    Submit answers for a reading comprehension activity.

    - **answers**: List of answers for each question

    Returns the activity results including score, correct answers,
    passage references, and explanations.
    """
    # Check if already submitted
    if await storage.has_submitted_reading(activity_id, current_user.id):
        # Return existing result
        result = await storage.get_reading_result(activity_id, current_user.id)
        if result:
            return result

    # Process submission
    result = await storage.save_reading_submission(
        activity_id=activity_id,
        student_id=current_user.id,
        answers=submission.answers,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found or expired.",
        )

    logger.info(
        f"Reading activity submitted: activity_id={activity_id}, "
        f"user_id={current_user.id}, score={result.score}/{result.total}"
    )

    return result


@router.get(
    "/reading/{activity_id}/result",
    response_model=ReadingComprehensionResult,
    summary="Get reading comprehension result",
    description="Get the result of a previously submitted reading comprehension activity.",
)
async def get_reading_result(
    activity_id: str,
    current_user: CurrentUser,
    storage: StorageDep,
) -> ReadingComprehensionResult:
    """
    Get the result of a previously submitted reading comprehension activity.

    Returns the activity results if the user has submitted this activity.
    """
    result = await storage.get_reading_result(activity_id, current_user.id)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity result not found. Have you submitted this activity?",
        )

    return result


# ========== Sentence Builder Endpoints ==========


@router.post(
    "/sentence-builder/generate",
    response_model=SentenceBuilderActivity,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a sentence builder activity",
    description=(
        "Generate a Duolingo-style sentence building activity from book modules. "
        "Students arrange jumbled words into correct sentence order. "
        "Only teachers, supervisors, and admins can generate activities."
    ),
)
async def generate_sentence_activity(
    request: SentenceBuilderRequest,
    current_user: Annotated[User, TeacherOrHigher],
    sentence_service: SentenceServiceDep,
    storage: StorageDep,
    rate_limiter: RateLimiterDep,
    response: Response = None,
) -> SentenceBuilderActivity:
    """
    Generate a sentence builder activity from book modules.

    Extracts sentences from module text, filters by difficulty (word count),
    and creates shuffled word banks for students to arrange.

    - **book_id**: The book to generate activity from
    - **module_ids**: Optional list of specific modules (defaults to all)
    - **sentence_count**: Number of sentences (1-10)
    - **difficulty**: Difficulty level (easy: 4-6 words, medium: 7-10, hard: 11+)
    - **include_audio**: Whether to include TTS audio for correct sentences
    """
    # Deprecation header (Story 30.3)
    if response:
        _set_deprecation_headers(response)

    # Check rate limit before generation
    try:
        rate_limiter.check_limits(str(current_user.id), 1)
    except RateLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": str(e),
                "limit_type": e.limit_type,
                "current_usage": e.current_usage,
                "max_allowed": e.max_allowed,
                "reset_at": e.reset_at,
            },
        )

    logger.info(
        f"Sentence builder activity generation requested by user_id={current_user.id}, "
        f"book_id={request.book_id}, difficulty={request.difficulty}"
    )

    try:
        activity = await sentence_service.generate_activity(request)

        # Save activity to storage for later access
        await storage.save_sentence_activity(activity)

        # Record usage after successful generation
        rate_limiter.record_usage(str(current_user.id), 1)

        logger.info(
            f"Sentence builder activity generated successfully: "
            f"activity_id={activity.activity_id}, sentences={len(activity.sentences)}"
        )

        return activity

    except DCSAIDataNotFoundError as e:
        logger.warning(f"Book/module not found: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )

    except DCSAIDataNotReadyError as e:
        logger.warning(f"Book not ready: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.message,
        )

    except InsufficientSentencesError as e:
        logger.warning(f"Insufficient sentences: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": e.message,
                "available": e.available,
                "required": e.required,
            },
        )

    except SentenceBuilderError as e:
        logger.error(f"Sentence builder generation failed: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )

    except DCSAIDataAuthError as e:
        logger.error(f"DCS auth error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content service temporarily unavailable.",
        )

    except DCSAIDataConnectionError as e:
        logger.error(f"DCS connection error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content service temporarily unavailable.",
        )


@router.get(
    "/sentence-builder/{activity_id}",
    response_model=SentenceBuilderActivityPublic,
    summary="Get a sentence builder activity",
    description=(
        "Get a sentence builder activity by ID. "
        "Returns the activity with word banks but without correct sentence answers."
    ),
)
async def get_sentence_activity(
    activity_id: str,
    current_user: CurrentUser,
    storage: StorageDep,
) -> SentenceBuilderActivityPublic:
    """
    Get a sentence builder activity for taking.

    Returns the shuffled word banks without revealing correct sentences.
    All authenticated users can access activities.
    """
    activity = await storage.get_sentence_activity_public(activity_id)

    if activity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found or expired.",
        )

    return activity


@router.post(
    "/sentence-builder/{activity_id}/submit",
    response_model=SentenceBuilderResult,
    summary="Submit sentence builder answers",
    description=(
        "Submit word orderings for a sentence builder activity. "
        "Returns the results with correct sentences revealed."
    ),
)
async def submit_sentence_activity(
    activity_id: str,
    submission: SentenceBuilderSubmission,
    current_user: CurrentUser,
    storage: StorageDep,
) -> SentenceBuilderResult:
    """
    Submit word orderings for a sentence builder activity.

    - **answers**: Dictionary mapping item_id to list of words in order

    Returns the activity results including score and correct sentences.
    """
    # Check if already submitted
    if await storage.has_submitted_sentence(activity_id, current_user.id):
        # Return existing result
        result = await storage.get_sentence_result(activity_id, current_user.id)
        if result:
            return result

    # Process submission
    result = await storage.save_sentence_submission(
        activity_id=activity_id,
        student_id=current_user.id,
        submission=submission,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found or expired.",
        )

    logger.info(
        f"Sentence activity submitted: activity_id={activity_id}, "
        f"user_id={current_user.id}, score={result.score}/{result.total}"
    )

    return result


@router.get(
    "/sentence-builder/{activity_id}/result",
    response_model=SentenceBuilderResult,
    summary="Get sentence builder result",
    description="Get the result of a previously submitted sentence builder activity.",
)
async def get_sentence_result(
    activity_id: str,
    current_user: CurrentUser,
    storage: StorageDep,
) -> SentenceBuilderResult:
    """
    Get the result of a previously submitted sentence builder activity.

    Returns the activity results if the user has submitted this activity.
    """
    result = await storage.get_sentence_result(activity_id, current_user.id)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity result not found. Have you submitted this activity?",
        )

    return result


# ========== Word Builder Endpoints ==========


@router.post(
    "/word-builder/generate",
    response_model=WordBuilderActivity,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a word builder activity",
    description=(
        "Generate a spelling practice activity from book vocabulary. "
        "Students spell words by clicking letters from a scrambled letter bank. "
        "Only teachers, supervisors, and admins can generate activities."
    ),
)
async def generate_word_builder_activity(
    request: WordBuilderRequest,
    current_user: Annotated[User, TeacherOrHigher],
    word_builder_service: WordBuilderServiceDep,
    storage: StorageDep,
    rate_limiter: RateLimiterDep,
    response: Response = None,
) -> WordBuilderActivity:
    """
    Generate a word builder (spelling) activity from book vocabulary.

    Fetches vocabulary from DCS, filters for suitable words (4-12 letters),
    and creates scrambled letter banks for students to spell.

    - **book_id**: The book to generate activity from
    - **module_ids**: Optional list of specific modules (defaults to all)
    - **word_count**: Number of words (1-15)
    - **cefr_levels**: Optional filter by CEFR level
    - **hint_type**: Type of hint (definition, audio, or both)
    """
    # Deprecation header (Story 30.3)
    if response:
        _set_deprecation_headers(response)

    # Check rate limit before generation
    try:
        rate_limiter.check_limits(str(current_user.id), 1)
    except RateLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": str(e),
                "limit_type": e.limit_type,
                "current_usage": e.current_usage,
                "max_allowed": e.max_allowed,
                "reset_at": e.reset_at,
            },
        )

    logger.info(
        f"Word builder activity generation requested by user_id={current_user.id}, "
        f"book_id={request.book_id}, word_count={request.word_count}"
    )

    try:
        activity = await word_builder_service.generate_activity(request)

        # Save activity to storage for later access
        await storage.save_word_builder_activity(activity)

        # Record usage after successful generation
        rate_limiter.record_usage(str(current_user.id), 1)

        logger.info(
            f"Word builder activity generated successfully: "
            f"activity_id={activity.activity_id}, words={len(activity.words)}"
        )

        return activity

    except DCSAIDataNotFoundError as e:
        logger.warning(f"Book/vocabulary not found: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )

    except DCSAIDataNotReadyError as e:
        logger.warning(f"Book not ready: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.message,
        )

    except WordBuilderInsufficientVocabularyError as e:
        logger.warning(f"Insufficient vocabulary: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": e.message,
                "available": e.available,
                "required": e.required,
            },
        )

    except WordBuilderError as e:
        logger.error(f"Word builder generation failed: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )

    except DCSAIDataAuthError as e:
        logger.error(f"DCS auth error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content service temporarily unavailable.",
        )

    except DCSAIDataConnectionError as e:
        logger.error(f"DCS connection error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content service temporarily unavailable.",
        )


@router.get(
    "/word-builder/{activity_id}",
    response_model=WordBuilderActivityPublic,
    summary="Get a word builder activity",
    description=(
        "Get a word builder activity by ID. "
        "Returns the activity with scrambled letters but without correct words."
    ),
)
async def get_word_builder_activity(
    activity_id: str,
    current_user: CurrentUser,
    storage: StorageDep,
) -> WordBuilderActivityPublic:
    """
    Get a word builder activity for taking.

    Returns the scrambled letter banks without revealing correct words.
    All authenticated users can access activities.
    """
    activity = await storage.get_word_builder_activity_public(activity_id)

    if activity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found or expired.",
        )

    return activity


@router.post(
    "/word-builder/{activity_id}/submit",
    response_model=WordBuilderResult,
    summary="Submit word builder answers",
    description=(
        "Submit spellings for a word builder activity. "
        "Returns the results with correct words and scores revealed."
    ),
)
async def submit_word_builder_activity(
    activity_id: str,
    submission: WordBuilderSubmission,
    current_user: CurrentUser,
    storage: StorageDep,
) -> WordBuilderResult:
    """
    Submit spellings for a word builder activity.

    - **answers**: Dictionary mapping item_id to spelled word string
    - **attempts**: Dictionary mapping item_id to number of attempts

    Returns the activity results including score and correct words.
    """
    # Check if already submitted
    if await storage.has_submitted_word_builder(activity_id, current_user.id):
        # Return existing result
        result = await storage.get_word_builder_result(activity_id, current_user.id)
        if result:
            return result

    # Process submission
    result = await storage.save_word_builder_submission(
        activity_id=activity_id,
        student_id=current_user.id,
        submission=submission,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found or expired.",
        )

    logger.info(
        f"Word builder activity submitted: activity_id={activity_id}, "
        f"user_id={current_user.id}, score={result.score}/{result.max_score}"
    )

    return result


@router.get(
    "/word-builder/{activity_id}/result",
    response_model=WordBuilderResult,
    summary="Get word builder result",
    description="Get the result of a previously submitted word builder activity.",
)
async def get_word_builder_result(
    activity_id: str,
    current_user: CurrentUser,
    storage: StorageDep,
) -> WordBuilderResult:
    """
    Get the result of a previously submitted word builder activity.

    Returns the activity results if the user has submitted this activity.
    """
    result = await storage.get_word_builder_result(activity_id, current_user.id)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity result not found. Have you submitted this activity?",
        )

    return result


# ========== Content Review and Management Endpoints (Story 27.19) ==========


@router.post(
    "/quiz/regenerate-question",
    response_model=AIQuizQuestion,
    summary="Regenerate a single question in a quiz",
    description=(
        "Regenerate a single question in an AI quiz using the same parameters. "
        "Only teachers, supervisors, and admins can regenerate questions."
    ),
)
async def regenerate_quiz_question(
    request: RegenerateQuestionRequest,
    current_user: Annotated[User, TeacherOrHigher],
    ai_quiz_service: AIQuizServiceDep,
    storage: StorageDep,
) -> AIQuizQuestion:
    """
    Regenerate a single question in an AI quiz.

    Uses the same generation parameters as the original quiz to generate
    a new question that replaces the one at the specified index.

    - **quiz_id**: ID of the quiz containing the question
    - **question_index**: Zero-based index of the question to regenerate
    - **context**: Original generation parameters (difficulty, language, etc.)
    """
    logger.info(
        f"Question regeneration requested by user_id={current_user.id}, "
        f"quiz_id={request.quiz_id}, question_index={request.question_index}"
    )

    try:
        # Get the original quiz to access its metadata
        quiz = await storage.get_ai_quiz(request.quiz_id)

        if quiz is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found or expired.",
            )

        # Validate question index
        if request.question_index >= len(quiz.questions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid question index. Quiz has {len(quiz.questions)} questions.",
            )

        # Get the question being replaced (for context)
        old_question = quiz.questions[request.question_index]

        # Regenerate a single question using the same parameters
        new_question = await ai_quiz_service.regenerate_question(
            quiz_id=request.quiz_id,
            question_index=request.question_index,
            module_ids=quiz.module_ids,
            difficulty=request.context.get("difficulty", quiz.difficulty),
            language=request.context.get("language", quiz.language),
            source_module_id=old_question.source_module_id,
        )

        # Update the quiz in storage (re-save to update)
        quiz.questions[request.question_index] = new_question
        await storage.save_ai_quiz(quiz)

        logger.info(
            f"Question regenerated successfully: quiz_id={request.quiz_id}, "
            f"question_index={request.question_index}"
        )

        return new_question

    except DCSAIDataNotFoundError as e:
        logger.warning(f"Module not found: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )

    except QuizGenerationError as e:
        logger.error(f"Question regeneration failed: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )


@router.post(
    "/content/save-to-library",
    response_model=SaveToLibraryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save generated content to teacher's library",
    description=(
        "Save AI-generated content to teacher's personal library for reuse. "
        "Only teachers, supervisors, and admins can save content."
    ),
)
async def save_content_to_library(
    request: SaveToLibraryRequest,
    current_user: Annotated[User, TeacherOrHigher],
    storage: StorageDep,
    db: AsyncSessionDep,
) -> SaveToLibraryResponse:
    """
    Save AI-generated content to teacher's library.

    Creates a TeacherGeneratedContent record that the teacher can reuse
    in future assignments.

    - **quiz_id**: ID of the quiz/activity to save
    - **activity_type**: Type of activity (ai_quiz, vocabulary_quiz, etc.)
    - **title**: Title for the saved content
    - **description**: Optional description
    """
    logger.info(
        f"Save to library requested by user_id={current_user.id}, "
        f"quiz_id={request.quiz_id}, activity_type={request.activity_type}"
    )

    try:
        # Get teacher_id from current_user's teacher relationship
        if not current_user.teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found. Only teachers can save content to library.",
            )

        teacher_id = current_user.teacher.id

        # Check if content was provided directly in request
        content_data = None
        book_id = None

        if request.content is not None:
            # Use content directly from request (preferred - doesn't depend on in-memory storage)
            logger.info(
                f"Using content from request directly, quiz_id={request.quiz_id}"
            )
            content_data = request.content
            book_id = request.content.get("book_id")
        else:
            # Fall back to looking up from in-memory storage (legacy)
            logger.info(
                f"Looking up content from storage, quiz_id={request.quiz_id}"
            )

            if request.activity_type == "ai_quiz":
                quiz = await storage.get_ai_quiz(request.quiz_id)
                if quiz:
                    content_data = quiz.model_dump(mode="json")
                    book_id = quiz.book_id
            elif request.activity_type == "vocabulary_quiz":
                quiz = await storage.get_quiz(request.quiz_id)
                if quiz:
                    content_data = quiz.model_dump(mode="json")
                    book_id = quiz.book_id
            elif request.activity_type == "reading":
                activity = await storage.get_reading_activity(request.quiz_id)
                if activity:
                    content_data = activity.model_dump(mode="json")
                    book_id = activity.book_id
            elif request.activity_type == "sentence_builder":
                activity = await storage.get_sentence_activity(request.quiz_id)
                if activity:
                    content_data = activity.model_dump(mode="json")
                    book_id = activity.book_id
            elif request.activity_type == "word_builder":
                activity = await storage.get_word_builder_activity(request.quiz_id)
                if activity:
                    content_data = activity.model_dump(mode="json")
                    book_id = activity.book_id

        if content_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found or expired.",
            )

        # Ensure audio URLs are set for listening activities
        _LISTENING_AUDIO_MAP = {
            "listening_fill_blank": ("items", "full_sentence"),
            "listening_quiz": ("questions", "audio_text"),
            "listening_sentence_builder": ("sentences", "correct_sentence"),
            "listening_word_builder": ("words", "correct_word"),
        }
        if request.activity_type in _LISTENING_AUDIO_MAP:
            lang = content_data.get("language", "en")
            items_key, text_key = _LISTENING_AUDIO_MAP[request.activity_type]
            for item in content_data.get(items_key, []):
                sentence = item.get(text_key, "")
                if sentence:
                    item["audio_url"] = (
                        f"/api/v1/ai/tts/audio"
                        f"?text={quote(sentence, safe='')}"
                        f"&lang={lang}"
                    )
                    item["audio_status"] = "ready"

        # Create TeacherGeneratedContent record
        generated_content = TeacherGeneratedContent(
            teacher_id=teacher_id,
            book_id=book_id,
            activity_type=request.activity_type,
            title=request.title,
            content=content_data,
            skill_id=request.skill_id,
            format_id=request.format_id,
        )
        db.add(generated_content)
        await db.commit()
        await db.refresh(generated_content)

        logger.info(
            f"Content saved to library: content_id={generated_content.id}, "
            f"teacher_id={teacher_id}"
        )

        # Also upload to DCS so it appears in the book-centric library
        if book_id:
            try:
                from app.services.dcs_ai_content_client import get_dcs_ai_content_client
                from app.services.dream_storage_client import DreamCentralStorageClient

                dcs_ai = get_dcs_ai_content_client(DreamCentralStorageClient())

                # Compute item count from content data
                item_count = 0
                if request.activity_type == "mix_mode":
                    item_count = len(content_data.get("questions", []))
                else:
                    for key in ("questions", "items", "sentences", "words", "pairs"):
                        if key in content_data:
                            item_count = len(content_data[key])
                            break

                has_audio = request.activity_type in (
                    "listening_fill_blank", "listening_quiz",
                    "listening_sentence_builder", "listening_word_builder",
                    "vocabulary_matching", "word_builder",
                )
                has_passage = request.activity_type in (
                    "reading_comprehension", "reading", "mix_mode",
                )
                dcs_entry = await dcs_ai.create_content(book_id, {
                    "manifest": {
                        "activity_type": request.activity_type,
                        "title": request.title,
                        "item_count": item_count,
                        "has_audio": has_audio,
                        "has_passage": has_passage,
                        "difficulty": content_data.get("difficulty"),
                        "language": content_data.get("language", "en"),
                        "created_by": str(current_user.id),
                        "created_by_name": current_user.full_name or current_user.email,
                    },
                    "content": content_data,
                })
                dcs_cid = dcs_entry.get("content_id") or dcs_entry.get("id")
                if dcs_cid:
                    generated_content.dcs_content_id = dcs_cid
                    db.add(generated_content)
                    await db.commit()
                logger.info(
                    f"Content also saved to DCS: book_id={book_id}, "
                    f"dcs_content_id={dcs_cid}"
                )
            except Exception as dcs_err:
                logger.warning(
                    f"Failed to save content to DCS (non-fatal): {dcs_err}",
                    exc_info=True,
                )

        return SaveToLibraryResponse(
            content_id=generated_content.id,
            title=generated_content.title,
            activity_type=generated_content.activity_type,
            created_at=generated_content.created_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save to library failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save content to library: {str(e)}",
        )


@router.post(
    "/content/create-assignment",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create assignment from generated content",
    description=(
        "Create an assignment from AI-generated content. "
        "Only teachers, supervisors, and admins can create assignments."
    ),
)
async def create_assignment_from_content(
    request: CreateAssignmentRequest,
    current_user: Annotated[User, TeacherOrHigher],
    storage: StorageDep,
) -> dict:
    """
    Create an assignment from AI-generated content.

    Links the generated content to the existing assignment infrastructure
    and returns a redirect URL to the assignment wizard.

    - **quiz_id**: ID of the quiz/activity to use
    - **activity_type**: Type of activity (ai_quiz, vocabulary_quiz, etc.)
    - **title**: Title for the assignment
    - **description**: Optional description
    """
    logger.info(
        f"Create assignment requested by user_id={current_user.id}, "
        f"quiz_id={request.quiz_id}, activity_type={request.activity_type}"
    )

    try:
        # Validate that the content exists
        content_exists = False

        if request.activity_type == "ai_quiz":
            quiz = await storage.get_ai_quiz_public(request.quiz_id)
            content_exists = quiz is not None
        elif request.activity_type == "vocabulary_quiz":
            quiz = await storage.get_quiz_public(request.quiz_id)
            content_exists = quiz is not None
        elif request.activity_type == "reading":
            activity = await storage.get_reading_activity_public(request.quiz_id)
            content_exists = activity is not None
        elif request.activity_type == "sentence_builder":
            activity = await storage.get_sentence_activity_public(request.quiz_id)
            content_exists = activity is not None
        elif request.activity_type == "word_builder":
            activity = await storage.get_word_builder_activity_public(request.quiz_id)
            content_exists = activity is not None

        if not content_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found or expired.",
            )

        # TODO: Integrate with assignment creation system
        # For now, return a placeholder response that indicates the assignment wizard URL
        logger.info(
            f"Assignment creation initiated for quiz_id={request.quiz_id}"
        )

        return {
            "message": "Assignment created successfully",
            "quiz_id": request.quiz_id,
            "activity_type": request.activity_type,
            "title": request.title,
            "redirect_url": f"/teacher/assignments/create?quiz_id={request.quiz_id}&type={request.activity_type}",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create assignment failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create assignment.",
        )


# =============================================================================
# Content Library Endpoints (Story 27.21)
# =============================================================================


@router.get(
    "/library",
    response_model=LibraryResponse,
    summary="List teacher's saved AI-generated content",
    description=(
        "List all saved AI-generated content accessible by the teacher. "
        "Includes teacher's own content and shared book-based content."
    ),
)
async def list_library_content(
    current_user: Annotated[User, TeacherOrHigher],
    db: AsyncSessionDep,
    activity_type: str | None = Query(None, description="Filter by activity type"),
    source_type: str | None = Query(None, description="Filter by source type (book/material)"),
    book_id: int | None = Query(None, description="Filter by book ID"),
    skill: str | None = Query(None, description="Filter by skill slug (e.g., vocabulary, grammar)"),
    date_from: str | None = Query(None, description="Filter by creation date (from)"),
    date_to: str | None = Query(None, description="Filter by creation date (to)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> LibraryResponse:
    """
    List saved AI-generated content for teacher.

    Each teacher only sees their own generated content.
    """
    from datetime import datetime

    from app.models import TeacherMaterial

    logger.info(f"Library list requested by user_id={current_user.id}")

    try:
        # Get teacher ID
        if not current_user.teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found.",
            )

        teacher_id = current_user.teacher.id

        # Build base query - teacher only sees their own content
        query = select(TeacherGeneratedContent).where(
            TeacherGeneratedContent.teacher_id == teacher_id
        )

        # Apply filters
        if activity_type:
            query = query.where(TeacherGeneratedContent.activity_type == activity_type)

        if source_type == "book":
            query = query.where(TeacherGeneratedContent.book_id.isnot(None))
        elif source_type == "material":
            query = query.where(TeacherGeneratedContent.material_id.isnot(None))

        if book_id:
            query = query.where(TeacherGeneratedContent.book_id == book_id)

        # Skill filter (Epic 30 - Story 30.3)
        if skill:
            from app.models import SkillCategory as SC
            skill_result = await db.execute(
                select(SC).where(SC.slug == skill)
            )
            skill_record = skill_result.scalar_one_or_none()
            if skill_record:
                query = query.where(TeacherGeneratedContent.skill_id == skill_record.id)
            else:
                # Unknown skill slug — return empty results
                query = query.where(TeacherGeneratedContent.skill_id == None)  # noqa: E711

        if date_from:
            date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.where(TeacherGeneratedContent.created_at >= date_from_dt)

        if date_to:
            date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query = query.where(TeacherGeneratedContent.created_at <= date_to_dt)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_query)
        total = count_result.scalar_one()

        # Apply pagination and ordering
        query = query.order_by(TeacherGeneratedContent.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        # Execute query
        result = await db.execute(query)
        contents = result.scalars().all()

        # Collect unique book IDs and fetch titles from DCS
        book_ids = {c.book_id for c in contents if c.book_id}
        book_titles_map: dict[int, str] = {}

        if book_ids:
            try:
                from app.services.dream_storage_client import get_dream_storage_client
                dcs_client = await get_dream_storage_client()
                all_books = await dcs_client.get_books()
                book_titles_map = {b.id: b.title or b.name or f"Book {b.id}" for b in all_books}
            except Exception as e:
                logger.warning(f"Failed to fetch book titles from DCS: {e}")
                # Fallback to placeholder titles
                book_titles_map = {bid: f"Book {bid}" for bid in book_ids}

        # Build response items
        items = []
        for content in contents:
            # Determine source info
            source_type_str = "book" if content.book_id else "material"
            book_title = None
            material_name = None

            if content.book_id:
                book_title = book_titles_map.get(content.book_id, f"Book {content.book_id}")
            elif content.material_id:
                # Fetch material name
                material_result = await db.execute(
                    select(TeacherMaterial).where(TeacherMaterial.id == content.material_id)
                )
                material = material_result.scalar_one_or_none()
                material_name = material.name if material else "Unknown Material"

            # Count activity items
            item_count = _count_activity_items(content.activity_type, content.content)

            # Get creator info
            from app.models import Teacher

            creator_result = await db.execute(
                select(Teacher).where(Teacher.id == content.teacher_id).options(selectinload(Teacher.user))
            )
            creator = creator_result.scalar_one_or_none()
            creator_name = creator.user.full_name if creator and creator.user else "Unknown"

            # Resolve skill/format names if present (Epic 30)
            content_skill_name = None
            content_format_name = None
            if content.skill_id:
                from app.models import SkillCategory as SC
                sk_result = await db.execute(
                    select(SC).where(SC.id == content.skill_id)
                )
                sk = sk_result.scalar_one_or_none()
                content_skill_name = sk.name if sk else None
            if content.format_id:
                from app.models import ActivityFormat as AF
                af_result = await db.execute(
                    select(AF).where(AF.id == content.format_id)
                )
                af = af_result.scalar_one_or_none()
                content_format_name = af.name if af else None

            items.append(
                ContentItemPublic(
                    id=content.id,
                    activity_type=content.activity_type,
                    title=content.title,
                    source_type=source_type_str,
                    book_id=content.book_id,
                    book_title=book_title,
                    material_id=content.material_id,
                    material_name=material_name,
                    item_count=item_count,
                    created_at=content.created_at,
                    updated_at=None,  # Not tracked in current model
                    used_in_assignments=1 if content.is_used else 0,
                    is_shared=content.book_id is not None,
                    created_by=ContentCreator(
                        id=creator.id if creator else teacher_id,
                        name=creator_name
                    ),
                    skill_id=content.skill_id,
                    skill_name=content_skill_name,
                    format_id=content.format_id,
                    format_name=content_format_name,
                )
            )

        has_more = total > page * page_size

        logger.info(f"Library list returned {len(items)} items (total: {total})")

        return LibraryResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_more=has_more,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Library list failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve library content.",
        )


@router.get(
    "/library/{content_id}",
    response_model=ContentItemDetail,
    summary="Get detailed content from library",
    description="Retrieve full details of a saved AI-generated content item.",
)
async def get_library_content_detail(
    content_id: UUID,
    current_user: Annotated[User, TeacherOrHigher],
    db: AsyncSessionDep,
) -> ContentItemDetail:
    """
    Get detailed content from library.

    Returns full activity data including all questions/items.
    """
    from app.models import Teacher, TeacherMaterial

    logger.info(f"Library detail requested: content_id={content_id}, user_id={current_user.id}")

    try:
        # Get teacher ID
        if not current_user.teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found.",
            )

        teacher_id = current_user.teacher.id

        # Get content with access check
        result = await db.execute(
            select(TeacherGeneratedContent).where(TeacherGeneratedContent.id == content_id)
        )
        content = result.scalar_one_or_none()

        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found.",
            )

        # Check access: only the creating teacher can view their content
        if content.teacher_id != teacher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this content.",
            )

        # Determine source info
        source_type_str = "book" if content.book_id else "material"
        book_title = None
        material_name = None

        if content.book_id:
            # Fetch book title from DCS
            try:
                from app.services.dream_storage_client import get_dream_storage_client
                dcs_client = await get_dream_storage_client()
                all_books = await dcs_client.get_books()
                for book in all_books:
                    if book.id == content.book_id:
                        book_title = book.title or book.name or f"Book {content.book_id}"
                        break
                if not book_title:
                    book_title = f"Book {content.book_id}"
            except Exception as e:
                logger.warning(f"Failed to fetch book title from DCS: {e}")
                book_title = f"Book {content.book_id}"
        elif content.material_id:
            material_result = await db.execute(
                select(TeacherMaterial).where(TeacherMaterial.id == content.material_id)
            )
            material = material_result.scalar_one_or_none()
            material_name = material.name if material else "Unknown Material"

        # Count activity items
        item_count = _count_activity_items(content.activity_type, content.content)

        # Get creator info
        creator_result = await db.execute(
            select(Teacher).where(Teacher.id == content.teacher_id).options(selectinload(Teacher.user))
        )
        creator = creator_result.scalar_one_or_none()
        creator_name = creator.user.full_name if creator and creator.user else "Unknown"

        logger.info(f"Library detail returned: content_id={content_id}")

        return ContentItemDetail(
            id=content.id,
            activity_type=content.activity_type,
            title=content.title,
            source_type=source_type_str,
            book_id=content.book_id,
            book_title=book_title,
            material_id=content.material_id,
            material_name=material_name,
            item_count=item_count,
            created_at=content.created_at,
            updated_at=None,
            used_in_assignments=1 if content.is_used else 0,
            is_shared=content.book_id is not None,
            created_by=ContentCreator(
                id=creator.id if creator else teacher_id,
                name=creator_name
            ),
            content=content.content,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Library detail failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve content details.",
        )


@router.delete(
    "/library/{content_id}",
    response_model=DeleteContentResponse,
    summary="Delete content from library",
    description="Delete a saved AI-generated content item. Only the creator can delete.",
)
async def delete_library_content(
    content_id: UUID,
    current_user: Annotated[User, TeacherOrHigher],
    db: AsyncSessionDep,
) -> DeleteContentResponse:
    """
    Delete content from library.

    Only the teacher who created the content can delete it.
    TODO: Add constraint to prevent deletion if content is used in active assignments.
    """
    logger.info(f"Library delete requested: content_id={content_id}, user_id={current_user.id}")

    try:
        # Get teacher ID
        if not current_user.teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found.",
            )

        teacher_id = current_user.teacher.id

        # Get content
        result = await db.execute(
            select(TeacherGeneratedContent).where(TeacherGeneratedContent.id == content_id)
        )
        content = result.scalar_one_or_none()

        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found.",
            )

        # Check ownership
        if content.teacher_id != teacher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the creator can delete this content.",
            )

        # TODO: Check if content is used in active assignments
        # For now, we allow deletion even if is_used is True

        # Delete content
        await db.delete(content)
        await db.commit()

        logger.info(f"Library content deleted: content_id={content_id}")

        return DeleteContentResponse(
            message="Content deleted successfully",
            content_id=content_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Library delete failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete content.",
        )


@router.patch(
    "/library/{content_id}",
    response_model=UpdateContentResponse,
    summary="Update content in library",
    description="Update a saved AI-generated content item including title and questions.",
)
async def update_library_content(
    content_id: UUID,
    request: UpdateContentRequest,
    current_user: Annotated[User, TeacherOrHigher],
    db: AsyncSessionDep,
) -> UpdateContentResponse:
    """
    Update content in library.

    Only the teacher who created the content can update it.
    Allows editing title and content data (questions, options, etc.).
    """
    from datetime import datetime, timezone

    logger.info(f"Library update requested: content_id={content_id}, user_id={current_user.id}")

    try:
        # Get teacher ID
        if not current_user.teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found.",
            )

        teacher_id = current_user.teacher.id

        # Get content
        result = await db.execute(
            select(TeacherGeneratedContent).where(TeacherGeneratedContent.id == content_id)
        )
        content = result.scalar_one_or_none()

        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found.",
            )

        # Check ownership
        if content.teacher_id != teacher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the creator can update this content.",
            )

        # Update fields
        updated_at = datetime.now(timezone.utc)

        if request.title is not None:
            content.title = request.title

        if request.content is not None:
            # Ensure audio URLs are set for listening activities
            _UPDATE_AUDIO_MAP = {
                "listening_fill_blank": ("items", "full_sentence"),
                "listening_quiz": ("questions", "audio_text"),
                "listening_sentence_builder": ("sentences", "correct_sentence"),
                "listening_word_builder": ("words", "correct_word"),
            }
            if content.activity_type in _UPDATE_AUDIO_MAP:
                lang = request.content.get("language", "en")
                items_key, text_key = _UPDATE_AUDIO_MAP[content.activity_type]
                for item in request.content.get(items_key, []):
                    sentence = item.get(text_key, "")
                    if sentence:
                        item["audio_url"] = (
                            f"/api/v1/ai/tts/audio"
                            f"?text={quote(sentence, safe='')}"
                            f"&lang={lang}"
                        )
                        item["audio_status"] = "ready"
            content.content = request.content

        content.updated_at = updated_at

        await db.commit()
        await db.refresh(content)

        logger.info(f"Library content updated: content_id={content_id}")

        return UpdateContentResponse(
            message="Content updated successfully",
            content_id=content_id,
            updated_at=updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Library update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update content.",
        )


@router.post(
    "/library/{content_id}/assign",
    response_model=AssignContentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign AI content to classes",
    description="Create an assignment from AI-generated content and assign to selected classes.",
)
async def assign_library_content(
    content_id: UUID,
    request: AssignContentRequest,
    current_user: Annotated[User, TeacherOrHigher],
    db: AsyncSessionDep,
) -> AssignContentResponse:
    """
    Assign AI-generated content to classes.

    Creates an Assignment with the AI content and assigns to all students in selected classes.
    """
    from datetime import datetime, timezone
    from app.models import Assignment, AssignmentStudent, Class, Student, ActivityType

    logger.info(f"Assign content requested: content_id={content_id}, user_id={current_user.id}")

    try:
        # Get teacher ID
        if not current_user.teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found.",
            )

        teacher_id = current_user.teacher.id

        # Get content
        result = await db.execute(
            select(TeacherGeneratedContent).where(TeacherGeneratedContent.id == content_id)
        )
        content = result.scalar_one_or_none()

        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found.",
            )

        # Check access: teacher owns content OR it's book-based (shared)
        is_owner = content.teacher_id == teacher_id
        is_shared = content.book_id is not None

        if not is_owner and not is_shared:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this content.",
            )

        # Validate class IDs
        if not request.class_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one class must be selected.",
            )

        # Get classes and verify teacher owns them
        classes_result = await db.execute(
            select(Class).where(
                Class.id.in_(request.class_ids),
                Class.teacher_id == teacher_id,
            )
        )
        classes = classes_result.scalars().all()

        if len(classes) != len(request.class_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more classes not found or you don't have access.",
            )

        # Get all students from selected classes via ClassStudent junction table
        from app.models import ClassStudent
        students_result = await db.execute(
            select(Student)
            .join(ClassStudent, ClassStudent.student_id == Student.id)
            .where(ClassStudent.class_id.in_(request.class_ids))
            .distinct()
        )
        students = students_result.scalars().all()

        if not students:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No students found in selected classes.",
            )

        # Map activity type to enum
        try:
            activity_type_enum = ActivityType(content.activity_type)
        except ValueError:
            # Fallback for legacy types
            activity_type_enum = ActivityType.ai_quiz

        # Create assignment
        # Use book_id if available, otherwise use 0 as placeholder for material-based
        dcs_book_id = content.book_id if content.book_id else 0

        assignment = Assignment(
            name=request.name,
            instructions=request.instructions,
            due_date=request.due_date,
            time_limit_minutes=request.time_limit_minutes,
            teacher_id=teacher_id,
            dcs_book_id=dcs_book_id,
            # Store AI content in activity_type and activity_content fields
            activity_type=activity_type_enum,
            activity_content=content.content,
            generation_source="book" if content.book_id else "material",
            source_id=str(content.book_id) if content.book_id else str(content.material_id),
            status="published",
        )
        db.add(assignment)
        await db.flush()  # Get assignment ID

        # Create AssignmentStudent entries
        for student in students:
            assignment_student = AssignmentStudent(
                assignment_id=assignment.id,
                student_id=student.id,
                status="not_started",
            )
            db.add(assignment_student)

        # Mark content as used
        content.is_used = True
        content.assignment_id = assignment.id
        content.updated_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(assignment)

        logger.info(
            f"Content assigned: content_id={content_id}, assignment_id={assignment.id}, "
            f"student_count={len(students)}"
        )

        return AssignContentResponse(
            message="Assignment created successfully",
            assignment_id=assignment.id,
            student_count=len(students),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assign content failed: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create assignment.",
        )


# =============================================================================
# V2 Skill-First Generation Endpoint (Epic 30 - Story 30.3)
# =============================================================================


@router.post(
    "/generate-v2",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Generate AI content using skill-first model (V2)",
    description=(
        "Generate AI content by selecting a skill and activity format. "
        "Routes to the appropriate generator automatically. "
        "Only teachers, supervisors, and admins can generate content."
    ),
)
async def generate_content_v2(
    request: "GenerationRequestV2",
    current_user: Annotated[User, TeacherOrHigher],
    dcs_client: DCSClientDep,
    llm_manager: Annotated[LLMManager, Depends(get_llm_manager_dep)],
    tts_manager: Annotated[TTSManager | None, Depends(get_tts_manager_dep)],
    storage: StorageDep,
    rate_limiter: RateLimiterDep,
    db: AsyncSessionDep,
) -> dict:
    """
    V2 endpoint: generate AI content using skill_slug + format_slug.

    Routes to the appropriate generator service based on the skill-format
    combination. Returns generated content with skill metadata.
    """
    from datetime import datetime, timezone
    from uuid import uuid4

    from sqlmodel import Session as SyncSession

    from app.schemas.ai_generation_v2 import GenerationRequestV2, GenerationResponseV2
    from app.services.skill_generation_dispatcher import dispatch

    # Check rate limit
    try:
        rate_limiter.check_limits(str(current_user.id), 1)
    except RateLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": str(e),
                "limit_type": e.limit_type,
                "current_usage": e.current_usage,
                "max_allowed": e.max_allowed,
                "reset_at": e.reset_at,
            },
        )

    logger.info(
        f"V2 generation requested: skill={request.skill_slug}, "
        f"format={request.format_slug}, user={current_user.id}"
    )

    # Handle mix mode separately (no dispatcher needed)
    if request.skill_slug == "mix":
        try:
            from app.services.ai_generation.mix_mode_service import MixModeService
            from app.services.dcs_ai_content_client import get_dcs_ai_content_client
            from app.services.dream_storage_client import DreamCentralStorageClient

            dcs_ai_content = get_dcs_ai_content_client(DreamCentralStorageClient())
            mix_service = MixModeService(dcs_client, llm_manager, tts_manager, dcs_ai_content_client=dcs_ai_content)
            mix_activity = await mix_service.generate_activity(
                book_id=request.book_id,
                module_ids=request.module_ids or [],
                total_count=request.count,
                difficulty=request.difficulty,
                language=request.language,
            )

            # Ensure audio URLs are set for listening/vocabulary questions
            # Same TTS on-demand pattern used by standalone activities
            _MIX_AUDIO_MAP: dict[tuple[str, str], tuple[str, str]] = {
                # (skill_slug, format_slug): (text_field, fallback_field)
                ("listening", "fill_blank"): ("full_sentence", "display_sentence"),
                ("listening", "sentence_builder"): ("correct_sentence", ""),
                ("listening", "word_builder"): ("correct_word", ""),
                ("vocabulary", "word_builder"): ("correct_word", ""),
                ("vocabulary", "matching"): ("word", ""),
            }
            lang = request.language or "en"
            for q in mix_activity.questions:
                key = (q.skill_slug, q.format_slug)
                if key in _MIX_AUDIO_MAP:
                    text_field, fallback_field = _MIX_AUDIO_MAP[key]
                    text = q.question_data.get(text_field) or q.question_data.get(fallback_field, "")
                    if text:
                        q.question_data["audio_url"] = (
                            f"/api/v1/ai/tts/audio"
                            f"?text={quote(text, safe='')}"
                            f"&lang={lang}"
                        )
                        q.question_data["audio_status"] = "ready"

            await storage.save_mix_mode_activity(mix_activity)

            rate_limiter.record_usage(str(current_user.id), 1)

            from app.schemas.ai_generation_v2 import GenerationResponseV2
            mix_response = GenerationResponseV2(
                content_id=mix_activity.activity_id,
                activity_type="mix_mode",
                content=mix_activity.model_dump(mode="json"),
                skill_id="00000000-0000-0000-0000-000000000000",
                skill_slug="mix",
                skill_name="Mix Mode",
                format_id="00000000-0000-0000-0000-000000000000",
                format_slug="mix",
                format_name="Multi-Skill Mix",
                source_type=request.source_type,
                book_id=request.book_id,
                difficulty=request.difficulty,
                item_count=mix_activity.total_questions,
                created_at=mix_activity.created_at,
            )
            return mix_response.model_dump(mode="json")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Mix mode generation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Mix mode generation failed: {str(e)}",
            )

    # Dispatch: validate combination and get generator key
    # Use a sync session for the dispatcher's DB lookups
    from app.core.config import settings
    from sqlmodel import create_engine

    sync_engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    with SyncSession(sync_engine) as sync_session:
        dispatch_result = dispatch(
            request.skill_slug,
            request.format_slug or "",
            sync_session,
        )
    sync_engine.dispose()

    # Route to the appropriate generator
    try:
        content_data: dict = {}
        content_id = str(uuid4())
        item_count = 0

        generator_key = dispatch_result.generator_key

        if generator_key == "vocabulary_quiz":
            from app.schemas.vocabulary_quiz import VocabularyQuizGenerationRequest
            vocab_request = VocabularyQuizGenerationRequest(
                book_id=request.book_id,
                module_ids=request.module_ids,
                quiz_length=min(request.count, 20),
                include_audio=request.include_audio,
            )
            service = VocabularyQuizService(dcs_client, llm_manager)
            quiz = await service.generate_quiz(vocab_request)
            await storage.save_quiz(quiz)
            content_data = quiz.model_dump(mode="json")
            content_id = quiz.quiz_id
            item_count = quiz.quiz_length

        elif generator_key == "word_builder":
            from app.schemas.word_builder import WordBuilderRequest
            wb_request = WordBuilderRequest(
                book_id=request.book_id,
                module_ids=request.module_ids,
                word_count=min(request.count, 15),
                include_audio=request.include_audio,
            )
            service = WordBuilderService(dcs_client, tts_manager)
            activity = await service.generate_activity(wb_request)
            await storage.save_word_builder_activity(activity)
            content_data = activity.model_dump(mode="json")
            content_id = activity.activity_id
            item_count = len(activity.words)

        elif generator_key == "ai_quiz":
            from app.schemas.ai_quiz import AIQuizGenerationRequest
            quiz_request = AIQuizGenerationRequest(
                book_id=request.book_id,
                module_ids=request.module_ids or [],
                difficulty=request.difficulty if request.difficulty != "auto" else "medium",
                question_count=request.count,
                language=request.language,
            )
            ai_service = AIQuizService(dcs_client, llm_manager)
            quiz = await ai_service.generate_quiz(quiz_request)
            await storage.save_ai_quiz(quiz)
            content_data = quiz.model_dump(mode="json")
            content_id = quiz.quiz_id
            item_count = len(quiz.questions)

        elif generator_key == "grammar_quiz":
            # Grammar uses AIQuizService with a grammar-focused system prompt
            from app.schemas.ai_quiz import AIQuizGenerationRequest
            from app.services.ai_generation.prompts import GRAMMAR_MCQ_SYSTEM_PROMPT
            quiz_request = AIQuizGenerationRequest(
                book_id=request.book_id,
                module_ids=request.module_ids or [],
                difficulty=request.difficulty if request.difficulty != "auto" else "medium",
                question_count=request.count,
                language=request.language,
            )
            ai_service = AIQuizService(dcs_client, llm_manager)
            quiz = await ai_service.generate_quiz(
                quiz_request,
                system_prompt_override=GRAMMAR_MCQ_SYSTEM_PROMPT,
            )
            await storage.save_ai_quiz(quiz)
            content_data = quiz.model_dump(mode="json")
            content_id = quiz.quiz_id
            item_count = len(quiz.questions)

        elif generator_key == "sentence_builder":
            from app.schemas.sentence_builder import SentenceBuilderRequest
            sb_request = SentenceBuilderRequest(
                book_id=request.book_id,
                module_ids=request.module_ids,
                sentence_count=min(request.count, 10),
                difficulty=request.difficulty if request.difficulty != "auto" else "medium",
                include_audio=request.include_audio,
            )
            sb_service = SentenceBuilderService(dcs_client, llm_manager, tts_manager)
            activity = await sb_service.generate_activity(sb_request)
            await storage.save_sentence_activity(activity)
            content_data = activity.model_dump(mode="json")
            content_id = activity.activity_id
            item_count = len(activity.sentences)

        elif generator_key == "reading_comprehension":
            from app.schemas.reading_comprehension import ReadingComprehensionRequest
            extra = request.extra_config or {}
            passage_count = min(int(extra.get("passage_count", 1)), 5)
            questions_per_passage = min(request.count, 20)
            passage_length = 250

            import asyncio

            rc_service = ReadingComprehensionService(dcs_client, llm_manager)
            passages: list[dict] = []
            all_questions: list[dict] = []

            # Build all requests — all passages share the full combined module context
            all_module_ids = request.module_ids or [0]
            primary_module_id = all_module_ids[0]
            rc_requests = []
            for i in range(passage_count):
                rc_requests.append(ReadingComprehensionRequest(
                    book_id=request.book_id,
                    module_id=primary_module_id,
                    module_ids=all_module_ids,
                    question_count=questions_per_passage,
                    difficulty=request.difficulty if request.difficulty != "auto" else "medium",
                    language=request.language,
                    passage_length=passage_length,
                    passage_index=i + 1,
                    total_passages=passage_count,
                ))

            # Generate all passages in parallel
            activities = await asyncio.gather(
                *(rc_service.generate_activity(req) for req in rc_requests)
            )

            for activity in activities:
                await storage.save_reading_activity(activity)
                passages.append({
                    "passage_id": activity.activity_id,
                    "passage": activity.passage,
                    "module_id": activity.module_id,
                    "module_title": activity.module_title,
                    "questions": [q.model_dump(mode="json") for q in activity.questions],
                })
                all_questions.extend(activity.questions)

            if passage_count == 1:
                # Single passage: return activity as-is
                content_data = activity.model_dump(mode="json")
                content_id = activity.activity_id
            else:
                # Multiple passages: include passages array with grouped questions
                content_data = activity.model_dump(mode="json")
                content_data["passages"] = passages
                # Also keep flat questions for item count / compat
                content_data["questions"] = []
                for p in passages:
                    content_data["questions"].extend(p["questions"])
                content_id = activity.activity_id
            item_count = len(all_questions)

        elif generator_key == "listening_quiz":
            from app.schemas.listening_quiz import ListeningQuizRequest
            from app.services.ai_generation.listening_quiz_service import (
                ListeningQuizService,
            )
            lq_request = ListeningQuizRequest(
                book_id=request.book_id,
                module_ids=request.module_ids or [],
                question_count=min(request.count, 20),
                difficulty=request.difficulty if request.difficulty != "auto" else "auto",
                language=request.language,
            )
            lq_service = ListeningQuizService(dcs_client, llm_manager, tts_manager)
            activity = await lq_service.generate_activity(lq_request)
            await storage.save_listening_activity(activity)
            content_data = activity.model_dump(mode="json")
            content_id = activity.activity_id
            item_count = len(activity.questions)

        elif generator_key == "listening_fill_blank":
            from app.schemas.listening_fill_blank import ListeningFillBlankRequest
            from app.services.ai_generation.listening_fill_blank_service import (
                ListeningFillBlankService,
            )
            lfb_request = ListeningFillBlankRequest(
                book_id=request.book_id,
                module_ids=request.module_ids or [],
                item_count=min(request.count, 20),
                difficulty=request.difficulty if request.difficulty != "auto" else "auto",
                language=request.language,
            )
            lfb_service = ListeningFillBlankService(dcs_client, llm_manager, tts_manager)
            activity = await lfb_service.generate_activity(lfb_request)
            await storage.save_listening_fill_blank_activity(activity)
            content_data = activity.model_dump(mode="json")
            content_id = activity.activity_id
            item_count = len(activity.items)

        elif generator_key == "grammar_fill_blank":
            from app.schemas.grammar_fill_blank import GrammarFillBlankRequest
            from app.services.ai_generation.grammar_fill_blank_service import (
                GrammarFillBlankService,
            )
            gfb_request = GrammarFillBlankRequest(
                book_id=request.book_id,
                module_ids=request.module_ids or [],
                item_count=min(request.count, 20),
                difficulty=request.difficulty if request.difficulty != "auto" else "auto",
                language=request.language,
                mode=request.extra_config.get("mode", "word_bank") if request.extra_config else "word_bank",
                include_hints=request.extra_config.get("include_hints", True) if request.extra_config else True,
            )
            gfb_service = GrammarFillBlankService(dcs_client, llm_manager)
            activity = await gfb_service.generate_activity(gfb_request)
            await storage.save_grammar_fill_blank_activity(activity)
            content_data = activity.model_dump(mode="json")
            content_id = activity.activity_id
            item_count = len(activity.items)

        elif generator_key == "writing_sentence_corrector":
            from app.schemas.writing_sentence_corrector import WritingSentenceCorrectorRequest
            from app.services.ai_generation.writing_sentence_corrector_service import (
                WritingSentenceCorrectorService,
            )
            wsc_request = WritingSentenceCorrectorRequest(
                book_id=request.book_id,
                module_ids=request.module_ids or [],
                item_count=min(request.count, 20),
                difficulty=request.difficulty if request.difficulty != "auto" else "auto",
                language=request.language,
            )
            wsc_service = WritingSentenceCorrectorService(dcs_client, llm_manager)
            activity = await wsc_service.generate_activity(wsc_request)
            await storage.save_writing_sentence_corrector_activity(activity)
            content_data = activity.model_dump(mode="json")
            content_id = activity.activity_id
            item_count = len(activity.items)

        elif generator_key == "writing_fill_blank":
            from app.schemas.writing_fill_blank import WritingFillBlankRequest
            from app.services.ai_generation.writing_fill_blank_service import (
                WritingFillBlankService,
            )
            wfb_request = WritingFillBlankRequest(
                book_id=request.book_id,
                module_ids=request.module_ids or [],
                item_count=min(request.count, 20),
                difficulty=request.difficulty if request.difficulty != "auto" else "auto",
                language=request.language,
            )
            wfb_service = WritingFillBlankService(dcs_client, llm_manager)
            activity = await wfb_service.generate_activity(wfb_request)
            await storage.save_writing_fill_blank_activity(activity)
            content_data = activity.model_dump(mode="json")
            content_id = activity.activity_id
            item_count = len(activity.items)

        elif generator_key == "writing_free_response":
            from app.schemas.writing_free_response import WritingFreeResponseRequest
            from app.services.ai_generation.writing_free_response_service import (
                WritingFreeResponseService,
            )
            wfr_request = WritingFreeResponseRequest(
                book_id=request.book_id,
                module_ids=request.module_ids or [],
                item_count=min(request.count, 10),
                difficulty=request.difficulty if request.difficulty != "auto" else "auto",
                language=request.language,
            )
            wfr_service = WritingFreeResponseService(dcs_client, llm_manager)
            activity = await wfr_service.generate_activity(wfr_request)
            await storage.save_writing_free_response_activity(activity)
            content_data = activity.model_dump(mode="json")
            content_id = activity.activity_id
            item_count = len(activity.items)

        elif generator_key == "speaking_open_response":
            from app.schemas.speaking_open_response import SpeakingOpenResponseRequest
            from app.services.ai_generation.speaking_open_response_service import (
                SpeakingOpenResponseService,
            )
            sor_request = SpeakingOpenResponseRequest(
                book_id=request.book_id,
                module_ids=request.module_ids or [],
                item_count=min(request.count, 10),
                difficulty=request.difficulty if request.difficulty != "auto" else "auto",
                language=request.language,
            )
            sor_service = SpeakingOpenResponseService(dcs_client, llm_manager)
            activity = await sor_service.generate_activity(sor_request)
            await storage.save_speaking_open_response_activity(activity)
            content_data = activity.model_dump(mode="json")
            content_id = activity.activity_id
            item_count = len(activity.items)

        elif generator_key == "listening_sentence_builder":
            from app.schemas.listening_sentence_builder import ListeningSentenceBuilderRequest
            from app.services.ai_generation.listening_sentence_builder_service import (
                ListeningSentenceBuilderService,
            )
            lsb_request = ListeningSentenceBuilderRequest(
                book_id=request.book_id,
                module_ids=request.module_ids or [],
                sentence_count=min(request.count, 15),
                difficulty=request.difficulty if request.difficulty != "auto" else "auto",
                language=request.language,
            )
            lsb_service = ListeningSentenceBuilderService(dcs_client, llm_manager, tts_manager)
            activity = await lsb_service.generate_activity(lsb_request)
            await storage.save_listening_sentence_builder_activity(activity)
            content_data = activity.model_dump(mode="json")
            content_id = activity.activity_id
            item_count = len(activity.sentences)

        elif generator_key == "listening_word_builder":
            from app.schemas.listening_word_builder import ListeningWordBuilderRequest
            from app.services.ai_generation.listening_word_builder_service import (
                ListeningWordBuilderService,
            )
            lwb_request = ListeningWordBuilderRequest(
                book_id=request.book_id,
                module_ids=request.module_ids or [],
                word_count=min(request.count, 20),
                difficulty=request.difficulty if request.difficulty != "auto" else "auto",
                language=request.language,
            )
            lwb_service = ListeningWordBuilderService(dcs_client, llm_manager, tts_manager)
            activity = await lwb_service.generate_activity(lwb_request)
            await storage.save_listening_word_builder_activity(activity)
            content_data = activity.model_dump(mode="json")
            content_id = activity.activity_id
            item_count = len(activity.words)

        elif generator_key == "vocabulary_matching":
            from app.schemas.vocabulary_matching import VocabularyMatchingRequest
            from app.services.ai_generation.vocabulary_matching_service import (
                VocabularyMatchingService,
            )
            vm_request = VocabularyMatchingRequest(
                book_id=request.book_id,
                module_ids=request.module_ids,
                pair_count=min(request.count, 20),
                include_audio=request.include_audio,
            )
            vm_service = VocabularyMatchingService(dcs_client)
            activity = await vm_service.generate_activity(vm_request)
            await storage.save_vocabulary_matching_activity(activity)
            content_data = activity.model_dump(mode="json")
            content_id = activity.activity_id
            item_count = len(activity.pairs)

        else:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail=f"Generator '{generator_key}' not yet implemented.",
            )

        # Record rate limit usage
        rate_limiter.record_usage(str(current_user.id), 1)

        # Inject skill metadata into content
        content_data["_skill_metadata"] = {
            "skill_id": dispatch_result.skill_id,
            "skill_slug": request.skill_slug,
            "skill_name": dispatch_result.skill_name,
            "format_id": dispatch_result.format_id,
            "format_slug": request.format_slug,
            "format_name": dispatch_result.format_name,
        }

        response = GenerationResponseV2(
            content_id=content_id,
            activity_type=dispatch_result.activity_type,
            content=content_data,
            skill_id=dispatch_result.skill_id,
            skill_slug=request.skill_slug,
            skill_name=dispatch_result.skill_name,
            format_id=dispatch_result.format_id,
            format_slug=request.format_slug or "",
            format_name=dispatch_result.format_name,
            source_type=request.source_type,
            book_id=request.book_id,
            difficulty=request.difficulty,
            item_count=item_count,
            created_at=datetime.now(timezone.utc),
        )

        logger.info(
            f"V2 generation complete: skill={request.skill_slug}, "
            f"format={request.format_slug}, items={item_count}"
        )

        return response.model_dump(mode="json")

    except HTTPException:
        raise
    except DCSAIDataNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except DCSAIDataNotReadyError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)
    except DCSAIDataAuthError as e:
        logger.error(f"DCS auth error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content service temporarily unavailable.",
        )
    except DCSAIDataConnectionError as e:
        logger.error(f"DCS connection error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Content service temporarily unavailable.",
        )
    except Exception as e:
        logger.error(f"V2 generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation failed: {str(e)}",
        )


# =============================================================================
# V2 Streaming Generation Endpoint (SSE for reading comprehension)
# =============================================================================


@router.post(
    "/generate-v2/stream",
    summary="Stream AI content generation (SSE)",
    description=(
        "Generate reading comprehension passages with Server-Sent Events. "
        "Each passage is streamed as it completes instead of waiting for all."
    ),
)
async def generate_content_v2_stream(
    request: "GenerationRequestV2",
    current_user: Annotated[User, TeacherOrHigher],
    dcs_client: DCSClientDep,
    llm_manager: Annotated[LLMManager, Depends(get_llm_manager_dep)],
    tts_manager: Annotated[TTSManager | None, Depends(get_tts_manager_dep)],
    storage: StorageDep,
    rate_limiter: RateLimiterDep,
    db: AsyncSessionDep,
):
    """
    SSE streaming endpoint for multi-passage reading comprehension.

    Sends events:
    - event: passage  → each passage as it completes
    - event: complete → final metadata when all passages are done
    - event: error    → if generation fails
    """
    import asyncio
    import json
    from datetime import datetime, timezone
    from uuid import uuid4

    from fastapi.responses import StreamingResponse
    from sqlmodel import Session as SyncSession

    from app.schemas.ai_generation_v2 import GenerationRequestV2, GenerationResponseV2
    from app.schemas.reading_comprehension import ReadingComprehensionRequest
    from app.services.skill_generation_dispatcher import dispatch

    # Check rate limit
    try:
        rate_limiter.check_limits(str(current_user.id), 1)
    except RateLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        )

    # Dispatch to get generator key
    from app.core.config import settings
    from sqlmodel import create_engine

    sync_engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    with SyncSession(sync_engine) as sync_session:
        dispatch_result = dispatch(
            request.skill_slug,
            request.format_slug or "",
            sync_session,
        )
    sync_engine.dispose()

    generator_key = dispatch_result.generator_key

    if generator_key != "reading_comprehension":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Streaming is only supported for reading comprehension.",
        )

    extra = request.extra_config or {}
    passage_count = min(int(extra.get("passage_count", 1)), 5)
    questions_per_passage = min(request.count, 20)

    all_module_ids = request.module_ids or [0]
    primary_module_id = all_module_ids[0]

    rc_service = ReadingComprehensionService(dcs_client, llm_manager)

    rc_requests = []
    for i in range(passage_count):
        rc_requests.append(ReadingComprehensionRequest(
            book_id=request.book_id,
            module_id=primary_module_id,
            module_ids=all_module_ids,
            question_count=questions_per_passage,
            difficulty=request.difficulty if request.difficulty != "auto" else "medium",
            language=request.language,
            passage_length=250,
            passage_index=i + 1,
            total_passages=passage_count,
        ))

    async def event_generator():
        passages = []
        all_questions = []

        # Create tasks and yield results as they complete
        tasks = [
            asyncio.create_task(rc_service.generate_activity(req))
            for req in rc_requests
        ]

        for coro in asyncio.as_completed(tasks):
            try:
                activity = await coro
                await storage.save_reading_activity(activity)

                passage_data = {
                    "passage_id": activity.activity_id,
                    "passage": activity.passage,
                    "module_id": activity.module_id,
                    "module_title": activity.module_title,
                    "questions": [q.model_dump(mode="json") for q in activity.questions],
                }
                passages.append(passage_data)
                all_questions.extend(activity.questions)

                # Send this passage immediately
                yield f"event: passage\ndata: {json.dumps(passage_data)}\n\n"

            except Exception as e:
                logger.error(f"Passage generation failed: {e}")
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

        # All done — send the complete response metadata
        rate_limiter.record_usage(str(current_user.id), 1)

        # Sort passages by module_title (Passage 1, Passage 2, etc.)
        passages.sort(key=lambda p: p["module_title"])

        complete_data = {
            "content_id": passages[0]["passage_id"] if passages else str(uuid4()),
            "activity_type": dispatch_result.activity_type,
            "skill_id": dispatch_result.skill_id,
            "skill_slug": request.skill_slug,
            "skill_name": dispatch_result.skill_name,
            "format_id": dispatch_result.format_id,
            "format_slug": request.format_slug or "",
            "format_name": dispatch_result.format_name,
            "source_type": request.source_type,
            "book_id": request.book_id,
            "difficulty": request.difficulty,
            "item_count": len(all_questions),
            "passages": passages,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        yield f"event: complete\ndata: {json.dumps(complete_data)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _count_activity_items(activity_type: str, content: dict) -> int:
    """
    Count the number of items in an activity.

    Returns the number of questions, words, pairs, etc. depending on activity type.
    """
    try:
        if activity_type in ["ai_quiz", "vocabulary_quiz"]:
            return len(content.get("questions", []))
        elif activity_type in ["reading", "reading_comprehension"]:
            return len(content.get("questions", []))
        elif activity_type in ["sentence_builder", "listening_sentence_builder"]:
            return len(content.get("sentences", []))
        elif activity_type in ["word_builder", "listening_word_builder"]:
            return len(content.get("words", []))
        elif activity_type in ["listening_quiz"]:
            return len(content.get("questions", []))
        elif activity_type in [
            "listening_fill_blank",
            "grammar_fill_blank",
            "writing_fill_blank",
            "writing_sentence_corrector",
            "writing_free_response",
            "speaking_open_response",
        ]:
            return len(content.get("items", []))
        elif activity_type == "vocabulary_matching":
            return len(content.get("pairs", []))
        elif activity_type == "mix_mode":
            return len(content.get("questions", []))
        else:
            return 0
    except Exception:
        return 0
