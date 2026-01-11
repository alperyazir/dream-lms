"""
Tests for AI Quiz Service.

Tests quiz generation with mocked LLM and DCS AI client.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.schemas.ai_quiz import (
    AIQuizGenerationRequest,
    AIQuiz,
    AIQuizQuestion,
)
from app.schemas.dcs_ai_data import ModuleDetail
from app.services.ai_generation.ai_quiz_service import (
    AIQuizService,
    QuizGenerationError,
)
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_dcs_ai_client():
    """Mock DCSAIServiceClient for testing."""
    client = MagicMock()
    client.get_module_detail = AsyncMock()
    return client


@pytest.fixture
def mock_llm_manager():
    """Mock LLMManager for testing."""
    manager = MagicMock()
    manager.generate_structured = AsyncMock()
    return manager


@pytest.fixture
def quiz_service(mock_dcs_ai_client, mock_llm_manager):
    """Create AIQuizService with mocked dependencies."""
    return AIQuizService(mock_dcs_ai_client, mock_llm_manager)


@pytest.fixture
def sample_module():
    """Sample module for testing."""
    return ModuleDetail(
        module_id=1,
        title="Unit 1: Introduction",
        pages=[1, 2, 3, 4, 5],
        text="""
        This is sample text content from the module.
        It contains educational material about various topics.
        Students should learn about grammar and vocabulary.
        Reading comprehension is important for language learning.
        """,
        topics=["grammar", "vocabulary", "reading"],
        vocabulary_ids=["vocab_1", "vocab_2"],
        language="en",
        difficulty="B1",
    )


@pytest.fixture
def sample_llm_response():
    """Sample LLM response for MCQ generation."""
    return {
        "questions": [
            {
                "question": "What is important for language learning according to the text?",
                "options": [
                    "Reading comprehension",
                    "Writing speed",
                    "Speaking loudly",
                    "Memorizing words only",
                ],
                "correct_index": 0,
                "explanation": "The text states that reading comprehension is important for language learning.",
            },
            {
                "question": "What topics are covered in this module?",
                "options": [
                    "Grammar and vocabulary",
                    "Mathematics",
                    "History",
                    "Science experiments",
                ],
                "correct_index": 0,
                "explanation": "The module covers grammar and vocabulary as educational topics.",
            },
        ]
    }


# ============================================================================
# Test Cases
# ============================================================================


class TestAIQuizServiceGeneration:
    """Tests for quiz generation."""

    @pytest.mark.asyncio
    async def test_generate_quiz_success(
        self, quiz_service, mock_dcs_ai_client, mock_llm_manager, sample_module, sample_llm_response
    ):
        """Test successful MCQ generation with mocked LLM."""
        # Setup
        mock_dcs_ai_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.return_value = sample_llm_response

        request = AIQuizGenerationRequest(
            book_id=1,
            module_ids=[1],
            difficulty="medium",
            question_count=2,
        )

        # Execute
        quiz = await quiz_service.generate_quiz(request)

        # Verify
        assert quiz is not None
        assert quiz.book_id == 1
        assert quiz.difficulty == "medium"
        assert len(quiz.questions) == 2
        assert quiz.language == "en"

        # Verify questions
        assert quiz.questions[0].question_text == "What is important for language learning according to the text?"
        assert quiz.questions[0].correct_index == 0
        assert quiz.questions[0].correct_answer == "Reading comprehension"
        assert len(quiz.questions[0].options) == 4

    @pytest.mark.asyncio
    async def test_generate_quiz_combines_multiple_modules(
        self, quiz_service, mock_dcs_ai_client, mock_llm_manager, sample_module, sample_llm_response
    ):
        """Test content from multiple modules is combined."""
        # Setup - two modules
        module2 = ModuleDetail(
            module_id=2,
            title="Unit 2: Advanced Topics",
            pages=[6, 7, 8],
            text="This is content from module 2.",
            topics=["advanced"],
            vocabulary_ids=[],
            language="en",
            difficulty="B2",
        )

        mock_dcs_ai_client.get_module_detail.side_effect = [sample_module, module2]
        mock_llm_manager.generate_structured.return_value = sample_llm_response

        request = AIQuizGenerationRequest(
            book_id=1,
            module_ids=[1, 2],
            difficulty="medium",
            question_count=2,
        )

        # Execute
        quiz = await quiz_service.generate_quiz(request)

        # Verify
        assert mock_dcs_ai_client.get_module_detail.call_count == 2
        assert quiz.module_ids == [1, 2]

    @pytest.mark.asyncio
    async def test_generate_quiz_easy_difficulty(
        self, quiz_service, mock_dcs_ai_client, mock_llm_manager, sample_module, sample_llm_response
    ):
        """Test easy difficulty includes appropriate prompt guidance."""
        mock_dcs_ai_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.return_value = sample_llm_response

        request = AIQuizGenerationRequest(
            book_id=1,
            module_ids=[1],
            difficulty="easy",
            question_count=2,
        )

        await quiz_service.generate_quiz(request)

        # Verify the prompt includes difficulty guidance
        call_args = mock_llm_manager.generate_structured.call_args
        prompt = call_args.kwargs.get("prompt") or call_args.args[0]
        assert "Easy" in prompt or "easy" in prompt.lower()

    @pytest.mark.asyncio
    async def test_generate_quiz_hard_difficulty(
        self, quiz_service, mock_dcs_ai_client, mock_llm_manager, sample_module, sample_llm_response
    ):
        """Test hard difficulty includes appropriate prompt guidance."""
        mock_dcs_ai_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.return_value = sample_llm_response

        request = AIQuizGenerationRequest(
            book_id=1,
            module_ids=[1],
            difficulty="hard",
            question_count=2,
        )

        quiz = await quiz_service.generate_quiz(request)

        assert quiz.difficulty == "hard"

    @pytest.mark.asyncio
    async def test_generate_quiz_detects_language(
        self, quiz_service, mock_dcs_ai_client, mock_llm_manager, sample_llm_response
    ):
        """Test language auto-detection from module metadata."""
        french_module = ModuleDetail(
            module_id=1,
            title="Unit 1",
            pages=[1, 2],
            text="Contenu en français.",
            topics=[],
            vocabulary_ids=[],
            language="fr",
            difficulty="A1",
        )

        mock_dcs_ai_client.get_module_detail.return_value = french_module
        mock_llm_manager.generate_structured.return_value = sample_llm_response

        request = AIQuizGenerationRequest(
            book_id=1,
            module_ids=[1],
            question_count=2,
        )

        quiz = await quiz_service.generate_quiz(request)

        assert quiz.language == "fr"

    @pytest.mark.asyncio
    async def test_generate_quiz_module_not_found(
        self, quiz_service, mock_dcs_ai_client
    ):
        """Test graceful handling when module not found."""
        mock_dcs_ai_client.get_module_detail.return_value = None

        request = AIQuizGenerationRequest(
            book_id=1,
            module_ids=[999],
            question_count=2,
        )

        with pytest.raises(DCSAIDataNotFoundError) as exc_info:
            await quiz_service.generate_quiz(request)

        assert "999" in str(exc_info.value.message)

    @pytest.mark.asyncio
    async def test_generate_quiz_llm_failure(
        self, quiz_service, mock_dcs_ai_client, mock_llm_manager, sample_module
    ):
        """Test graceful handling when LLM fails."""
        mock_dcs_ai_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.side_effect = Exception("LLM API error")

        request = AIQuizGenerationRequest(
            book_id=1,
            module_ids=[1],
            question_count=2,
        )

        with pytest.raises(QuizGenerationError) as exc_info:
            await quiz_service.generate_quiz(request)

        assert "Failed to generate questions" in exc_info.value.message

    @pytest.mark.asyncio
    async def test_generate_quiz_empty_response(
        self, quiz_service, mock_dcs_ai_client, mock_llm_manager, sample_module
    ):
        """Test handling of empty LLM response."""
        mock_dcs_ai_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.return_value = {"questions": []}

        request = AIQuizGenerationRequest(
            book_id=1,
            module_ids=[1],
            question_count=2,
        )

        with pytest.raises(QuizGenerationError) as exc_info:
            await quiz_service.generate_quiz(request)

        assert "no questions" in exc_info.value.message.lower()

    @pytest.mark.asyncio
    async def test_generate_quiz_with_explanations(
        self, quiz_service, mock_dcs_ai_client, mock_llm_manager, sample_module, sample_llm_response
    ):
        """Test quiz generation with explanations enabled."""
        mock_dcs_ai_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.return_value = sample_llm_response

        request = AIQuizGenerationRequest(
            book_id=1,
            module_ids=[1],
            question_count=2,
            include_explanations=True,
        )

        quiz = await quiz_service.generate_quiz(request)

        assert quiz.questions[0].explanation is not None
        assert "reading comprehension" in quiz.questions[0].explanation.lower()

    @pytest.mark.asyncio
    async def test_generate_quiz_without_explanations(
        self, quiz_service, mock_dcs_ai_client, mock_llm_manager, sample_module, sample_llm_response
    ):
        """Test quiz generation with explanations disabled."""
        mock_dcs_ai_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.return_value = sample_llm_response

        request = AIQuizGenerationRequest(
            book_id=1,
            module_ids=[1],
            question_count=2,
            include_explanations=False,
        )

        quiz = await quiz_service.generate_quiz(request)

        # Explanations should be None when disabled
        assert quiz.questions[0].explanation is None


class TestAIQuizServiceValidation:
    """Tests for response validation."""

    @pytest.mark.asyncio
    async def test_skips_malformed_questions(
        self, quiz_service, mock_dcs_ai_client, mock_llm_manager, sample_module
    ):
        """Test that malformed questions are skipped."""
        malformed_response = {
            "questions": [
                {
                    "question": "Valid question",
                    "options": ["A", "B", "C", "D"],
                    "correct_index": 0,
                    "explanation": "Good",
                },
                {
                    "question": "Bad question",
                    "options": ["A", "B"],  # Only 2 options - should be skipped
                    "correct_index": 0,
                    "explanation": "Bad",
                },
            ]
        }

        mock_dcs_ai_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.return_value = malformed_response

        request = AIQuizGenerationRequest(
            book_id=1,
            module_ids=[1],
            question_count=2,
        )

        quiz = await quiz_service.generate_quiz(request)

        # Only valid questions should be included
        assert len(quiz.questions) == 1
        assert quiz.questions[0].question_text == "Valid question"

    @pytest.mark.asyncio
    async def test_validates_correct_index_bounds(
        self, quiz_service, mock_dcs_ai_client, mock_llm_manager, sample_module
    ):
        """Test that out-of-bounds correct_index is corrected."""
        invalid_index_response = {
            "questions": [
                {
                    "question": "Test question",
                    "options": ["A", "B", "C", "D"],
                    "correct_index": 5,  # Invalid - should be corrected to 0
                    "explanation": "Test",
                },
            ]
        }

        mock_dcs_ai_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.return_value = invalid_index_response

        request = AIQuizGenerationRequest(
            book_id=1,
            module_ids=[1],
            question_count=1,
        )

        quiz = await quiz_service.generate_quiz(request)

        # Invalid index should be corrected to 0
        assert quiz.questions[0].correct_index == 0
        assert quiz.questions[0].correct_answer == "A"
