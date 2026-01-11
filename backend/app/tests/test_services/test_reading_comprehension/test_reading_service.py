"""
Tests for the Reading Comprehension Service.

Story 27.10: Reading Comprehension Generation
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.dcs_ai_data import ModuleDetail
from app.schemas.reading_comprehension import (
    ReadingComprehensionRequest,
)
from app.services.ai_generation.reading_comprehension_service import (
    ReadingComprehensionError,
    ReadingComprehensionService,
)
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError


@pytest.fixture
def mock_dcs_client():
    """Create a mock DCS AI client."""
    client = MagicMock()
    client.get_module_detail = AsyncMock()
    return client


@pytest.fixture
def mock_llm_manager():
    """Create a mock LLM manager."""
    manager = MagicMock()
    manager.generate_structured = AsyncMock()
    return manager


@pytest.fixture
def sample_module():
    """Create a sample module detail."""
    return ModuleDetail(
        module_id=1,
        title="Unit 1: Introduction",
        pages=[1, 2, 3],
        text="This is a sample passage about learning English. "
        "The passage contains important information about vocabulary "
        "and grammar concepts. Students should pay attention to "
        "the main ideas presented in this text.",
        topics=["vocabulary", "grammar"],
        vocabulary_ids=["word1", "word2"],
        language="en",
        difficulty="A2",
    )


@pytest.fixture
def sample_llm_response():
    """Create a sample LLM response."""
    return {
        "questions": [
            {
                "question_type": "mcq",
                "question": "What is this passage about?",
                "options": [
                    "Learning English",
                    "Cooking recipes",
                    "Sports events",
                    "Travel destinations",
                ],
                "correct_index": 0,
                "correct_answer": "Learning English",
                "explanation": "The passage explicitly discusses learning English.",
                "passage_reference": "This is a sample passage about learning English.",
            },
            {
                "question_type": "true_false",
                "question": "Students should ignore the main ideas.",
                "options": ["True", "False"],
                "correct_index": 1,
                "correct_answer": "False",
                "explanation": "The passage says students should pay attention.",
                "passage_reference": "Students should pay attention to the main ideas.",
            },
            {
                "question_type": "short_answer",
                "question": "What two topics does the passage cover?",
                "correct_answer": "vocabulary and grammar",
                "explanation": "The passage mentions vocabulary and grammar concepts.",
                "passage_reference": "The passage contains important information about vocabulary and grammar concepts.",
            },
        ]
    }


class TestReadingComprehensionService:
    """Tests for ReadingComprehensionService."""

    @pytest.mark.asyncio
    async def test_generate_activity_success(
        self,
        mock_dcs_client,
        mock_llm_manager,
        sample_module,
        sample_llm_response,
    ):
        """Should generate activity successfully."""
        mock_dcs_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.return_value = sample_llm_response

        service = ReadingComprehensionService(mock_dcs_client, mock_llm_manager)

        request = ReadingComprehensionRequest(
            book_id=123,
            module_id=1,
            question_count=3,
            question_types=["mcq", "true_false", "short_answer"],
            difficulty="auto",
        )

        activity = await service.generate_activity(request)

        # Verify activity structure
        assert activity.activity_id is not None
        assert activity.book_id == 123
        assert activity.module_id == 1
        assert activity.module_title == "Unit 1: Introduction"
        assert activity.passage == sample_module.text  # ACTUAL text
        assert len(activity.questions) == 3

        # Verify questions
        mcq = next(q for q in activity.questions if q.question_type == "mcq")
        assert len(mcq.options) == 4
        assert mcq.correct_index == 0

        tf = next(q for q in activity.questions if q.question_type == "true_false")
        assert len(tf.options) == 2
        assert tf.correct_index == 1

        sa = next(q for q in activity.questions if q.question_type == "short_answer")
        assert sa.options is None
        assert sa.correct_index is None

        # Verify DCS was called correctly
        mock_dcs_client.get_module_detail.assert_called_once_with(123, 1)

    @pytest.mark.asyncio
    async def test_generate_activity_module_not_found(
        self,
        mock_dcs_client,
        mock_llm_manager,
    ):
        """Should raise error when module not found."""
        mock_dcs_client.get_module_detail.return_value = None

        service = ReadingComprehensionService(mock_dcs_client, mock_llm_manager)

        request = ReadingComprehensionRequest(
            book_id=123,
            module_id=999,
        )

        with pytest.raises(DCSAIDataNotFoundError) as exc_info:
            await service.generate_activity(request)

        assert "999" in str(exc_info.value.message)
        assert "123" in str(exc_info.value.message)

    @pytest.mark.asyncio
    async def test_generate_activity_empty_text(
        self,
        mock_dcs_client,
        mock_llm_manager,
    ):
        """Should raise error when module has no text."""
        empty_module = ModuleDetail(
            module_id=1,
            title="Empty Module",
            text="",
            language="en",
            difficulty="A1",
        )
        mock_dcs_client.get_module_detail.return_value = empty_module

        service = ReadingComprehensionService(mock_dcs_client, mock_llm_manager)

        request = ReadingComprehensionRequest(
            book_id=123,
            module_id=1,
        )

        with pytest.raises(ReadingComprehensionError) as exc_info:
            await service.generate_activity(request)

        assert "no text content" in str(exc_info.value.message)

    @pytest.mark.asyncio
    async def test_generate_activity_llm_failure(
        self,
        mock_dcs_client,
        mock_llm_manager,
        sample_module,
    ):
        """Should raise error when LLM fails."""
        mock_dcs_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.side_effect = Exception("LLM error")

        service = ReadingComprehensionService(mock_dcs_client, mock_llm_manager)

        request = ReadingComprehensionRequest(
            book_id=123,
            module_id=1,
        )

        with pytest.raises(ReadingComprehensionError) as exc_info:
            await service.generate_activity(request)

        assert "LLM error" in str(exc_info.value.message)

    @pytest.mark.asyncio
    async def test_generate_activity_empty_response(
        self,
        mock_dcs_client,
        mock_llm_manager,
        sample_module,
    ):
        """Should raise error when LLM returns no questions."""
        mock_dcs_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.return_value = {"questions": []}

        service = ReadingComprehensionService(mock_dcs_client, mock_llm_manager)

        request = ReadingComprehensionRequest(
            book_id=123,
            module_id=1,
        )

        with pytest.raises(ReadingComprehensionError) as exc_info:
            await service.generate_activity(request)

        assert "no questions" in str(exc_info.value.message).lower()

    @pytest.mark.asyncio
    async def test_auto_difficulty_mapping(
        self,
        mock_dcs_client,
        mock_llm_manager,
        sample_llm_response,
    ):
        """Should map CEFR level to difficulty when auto."""
        # Test A2 -> easy
        a2_module = ModuleDetail(
            module_id=1,
            title="A2 Module",
            text="Sample text",
            language="en",
            difficulty="A2",
        )
        mock_dcs_client.get_module_detail.return_value = a2_module
        mock_llm_manager.generate_structured.return_value = sample_llm_response

        service = ReadingComprehensionService(mock_dcs_client, mock_llm_manager)

        request = ReadingComprehensionRequest(
            book_id=123,
            module_id=1,
            difficulty="auto",
        )

        activity = await service.generate_activity(request)
        assert activity.difficulty == "easy"

    @pytest.mark.asyncio
    async def test_explicit_difficulty(
        self,
        mock_dcs_client,
        mock_llm_manager,
        sample_module,
        sample_llm_response,
    ):
        """Should use explicit difficulty over auto."""
        mock_dcs_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.return_value = sample_llm_response

        service = ReadingComprehensionService(mock_dcs_client, mock_llm_manager)

        request = ReadingComprehensionRequest(
            book_id=123,
            module_id=1,
            difficulty="hard",
        )

        activity = await service.generate_activity(request)
        assert activity.difficulty == "hard"

    @pytest.mark.asyncio
    async def test_true_false_options_fix(
        self,
        mock_dcs_client,
        mock_llm_manager,
        sample_module,
    ):
        """Should auto-fix True/False questions with missing options."""
        # Response with True/False but missing options
        llm_response = {
            "questions": [
                {
                    "question_type": "true_false",
                    "question": "This is true.",
                    "correct_index": 0,
                    "correct_answer": "True",
                    "explanation": "It's true.",
                    "passage_reference": "Reference text.",
                }
            ]
        }
        mock_dcs_client.get_module_detail.return_value = sample_module
        mock_llm_manager.generate_structured.return_value = llm_response

        service = ReadingComprehensionService(mock_dcs_client, mock_llm_manager)

        request = ReadingComprehensionRequest(
            book_id=123,
            module_id=1,
            question_types=["true_false"],
        )

        activity = await service.generate_activity(request)

        # Should have auto-fixed options
        assert len(activity.questions) == 1
        assert activity.questions[0].options == ["True", "False"]
