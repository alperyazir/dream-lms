"""
Tests for Vocabulary Quiz Service.

Tests quiz generation, distractor selection, and error handling
with mocked DCS AI client.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.schemas.dcs_ai_data import (
    ProcessingMetadata,
    VocabularyResponse,
    VocabularyWord,
)
from app.schemas.vocabulary_quiz import VocabularyQuizGenerationRequest
from app.services.ai_generation.vocabulary_quiz_service import (
    CEFR_LEVELS,
    InsufficientVocabularyError,
    VocabularyQuizService,
    get_adjacent_cefr_levels,
)
from app.services.dcs_ai.exceptions import (
    DCSAIDataNotFoundError,
    DCSAIDataNotReadyError,
)


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_dcs_ai_client():
    """Mock DCSAIServiceClient for testing."""
    client = MagicMock()
    client.is_book_processed = AsyncMock(return_value=True)
    client.get_processing_status = AsyncMock()
    client.get_vocabulary = AsyncMock()
    client.get_audio_url = AsyncMock(return_value="https://example.com/audio.mp3")
    return client


@pytest.fixture
def quiz_service(mock_dcs_ai_client):
    """Create VocabularyQuizService with mocked DCS client."""
    return VocabularyQuizService(mock_dcs_ai_client)


@pytest.fixture
def sample_vocabulary_words():
    """Sample vocabulary words for testing."""
    return [
        VocabularyWord(
            id="vocab_1",
            word="accomplish",
            translation="başarmak",
            definition="to succeed in doing something",
            part_of_speech="verb",
            level="B1",
            example="She accomplished her goal.",
            module_id=1,
            module_title="Unit 1",
            page=10,
            audio={"word": "audio/en/accomplish.mp3"},
        ),
        VocabularyWord(
            id="vocab_2",
            word="achieve",
            translation="elde etmek",
            definition="to reach a goal or result",
            part_of_speech="verb",
            level="B1",
            example="He achieved success.",
            module_id=1,
            module_title="Unit 1",
            page=11,
            audio={"word": "audio/en/achieve.mp3"},
        ),
        VocabularyWord(
            id="vocab_3",
            word="complete",
            translation="tamamlamak",
            definition="to finish making or doing something",
            part_of_speech="verb",
            level="A2",
            example="Complete the task.",
            module_id=1,
            module_title="Unit 1",
            page=12,
            audio={"word": "audio/en/complete.mp3"},
        ),
        VocabularyWord(
            id="vocab_4",
            word="finish",
            translation="bitirmek",
            definition="to bring something to an end",
            part_of_speech="verb",
            level="A2",
            example="Finish your homework.",
            module_id=1,
            module_title="Unit 1",
            page=13,
            audio={"word": "audio/en/finish.mp3"},
        ),
        VocabularyWord(
            id="vocab_5",
            word="succeed",
            translation="başarılı olmak",
            definition="to achieve what you want or intend",
            part_of_speech="verb",
            level="B1",
            example="He succeeded in his career.",
            module_id=2,
            module_title="Unit 2",
            page=20,
            audio={"word": "audio/en/succeed.mp3"},
        ),
        VocabularyWord(
            id="vocab_6",
            word="fail",
            translation="başarısız olmak",
            definition="to not succeed in doing something",
            part_of_speech="verb",
            level="A2",
            example="Don't be afraid to fail.",
            module_id=2,
            module_title="Unit 2",
            page=21,
            audio={"word": "audio/en/fail.mp3"},
        ),
    ]


@pytest.fixture
def vocabulary_response(sample_vocabulary_words):
    """Sample vocabulary response from DCS."""
    return VocabularyResponse(
        book_id="123",
        language="en",
        translation_language="tr",
        total_words=len(sample_vocabulary_words),
        words=sample_vocabulary_words,
        extracted_at="2026-01-01T00:00:00Z",
    )


# ============================================================================
# Unit Tests - get_adjacent_cefr_levels
# ============================================================================


class TestGetAdjacentCefrLevels:
    """Tests for get_adjacent_cefr_levels function."""

    def test_middle_level_returns_two_adjacent(self):
        """Test B1 returns A2 and B2."""
        result = get_adjacent_cefr_levels("B1")
        assert "A2" in result
        assert "B2" in result
        assert len(result) == 2

    def test_lowest_level_returns_one_adjacent(self):
        """Test A1 returns only A2."""
        result = get_adjacent_cefr_levels("A1")
        assert result == ["A2"]

    def test_highest_level_returns_one_adjacent(self):
        """Test C2 returns only C1."""
        result = get_adjacent_cefr_levels("C2")
        assert result == ["C1"]

    def test_unknown_level_defaults_to_a1_adjacent(self):
        """Test unknown level returns A2 (adjacent to A1)."""
        result = get_adjacent_cefr_levels("UNKNOWN")
        assert result == ["A2"]


# ============================================================================
# Unit Tests - VocabularyQuizService
# ============================================================================


class TestVocabularyQuizServiceGenerateQuiz:
    """Tests for VocabularyQuizService.generate_quiz method."""

    @pytest.mark.asyncio
    async def test_generate_quiz_success(
        self, quiz_service, mock_dcs_ai_client, vocabulary_response
    ):
        """Test successful quiz generation with mocked vocabulary."""
        mock_dcs_ai_client.get_vocabulary.return_value = vocabulary_response

        request = VocabularyQuizGenerationRequest(
            book_id=123,
            quiz_length=5,
        )

        quiz = await quiz_service.generate_quiz(request)

        assert quiz.quiz_id is not None
        assert quiz.book_id == 123
        assert quiz.quiz_length == 5
        assert len(quiz.questions) == 5

        # Each question should have 4 options
        for question in quiz.questions:
            assert len(question.options) == 4
            assert question.correct_answer in question.options
            assert question.definition is not None
            assert question.audio_url == "https://example.com/audio.mp3"

    @pytest.mark.asyncio
    async def test_generate_quiz_filters_by_cefr_level(
        self, quiz_service, mock_dcs_ai_client, sample_vocabulary_words
    ):
        """Test that only words matching CEFR filter are included."""
        # Add more B1 words to meet minimum of 5
        extended_words = sample_vocabulary_words + [
            VocabularyWord(
                id="vocab_7",
                word="attempt",
                definition="to try to do something",
                part_of_speech="verb",
                level="B1",
                module_id=1,
            ),
            VocabularyWord(
                id="vocab_8",
                word="effort",
                definition="physical or mental activity needed to achieve something",
                part_of_speech="noun",
                level="B1",
                module_id=1,
            ),
        ]
        mock_dcs_ai_client.get_vocabulary.return_value = VocabularyResponse(
            book_id="123",
            language="en",
            total_words=len(extended_words),
            words=extended_words,
        )

        # Filter to only B1 level words (now have 5 B1 words)
        request = VocabularyQuizGenerationRequest(
            book_id=123,
            quiz_length=5,
            cefr_levels=["B1"],
        )

        quiz = await quiz_service.generate_quiz(request)

        # All questions should be B1 level
        for question in quiz.questions:
            assert question.cefr_level == "B1"

    @pytest.mark.asyncio
    async def test_generate_quiz_insufficient_vocabulary(
        self, quiz_service, mock_dcs_ai_client, vocabulary_response
    ):
        """Test error when not enough words available."""
        mock_dcs_ai_client.get_vocabulary.return_value = vocabulary_response

        # Request more words than available
        request = VocabularyQuizGenerationRequest(
            book_id=123,
            quiz_length=20,  # Only 6 words available
        )

        with pytest.raises(InsufficientVocabularyError) as exc_info:
            await quiz_service.generate_quiz(request)

        assert exc_info.value.available == 6
        assert exc_info.value.required == 20

    @pytest.mark.asyncio
    async def test_generate_quiz_book_not_processed(
        self, quiz_service, mock_dcs_ai_client
    ):
        """Test error when book has not been processed."""
        mock_dcs_ai_client.is_book_processed.return_value = False
        mock_dcs_ai_client.get_processing_status.return_value = ProcessingMetadata(
            book_id="123",
            processing_status="pending",
            total_pages=0,
            total_modules=0,
            total_vocabulary=0,
            total_audio_files=0,
        )

        request = VocabularyQuizGenerationRequest(book_id=123, quiz_length=5)

        with pytest.raises(DCSAIDataNotReadyError):
            await quiz_service.generate_quiz(request)

    @pytest.mark.asyncio
    async def test_generate_quiz_book_not_found(
        self, quiz_service, mock_dcs_ai_client
    ):
        """Test error when book has no AI data."""
        mock_dcs_ai_client.is_book_processed.return_value = False
        mock_dcs_ai_client.get_processing_status.return_value = None

        request = VocabularyQuizGenerationRequest(book_id=123, quiz_length=5)

        with pytest.raises(DCSAIDataNotFoundError):
            await quiz_service.generate_quiz(request)

    @pytest.mark.asyncio
    async def test_generate_quiz_without_audio(
        self, quiz_service, mock_dcs_ai_client, vocabulary_response
    ):
        """Test quiz generation with include_audio=False."""
        mock_dcs_ai_client.get_vocabulary.return_value = vocabulary_response

        request = VocabularyQuizGenerationRequest(
            book_id=123,
            quiz_length=5,
            include_audio=False,
        )

        quiz = await quiz_service.generate_quiz(request)

        # Audio URL should not be fetched
        mock_dcs_ai_client.get_audio_url.assert_not_called()

        # Questions should have no audio
        for question in quiz.questions:
            assert question.audio_url is None


class TestDistractorSelection:
    """Tests for distractor selection logic."""

    @pytest.mark.asyncio
    async def test_distractor_selection_same_level(
        self, quiz_service, mock_dcs_ai_client, sample_vocabulary_words
    ):
        """Test distractors are selected from same CEFR level when possible."""
        # Use the internal method for direct testing
        target = sample_vocabulary_words[0]  # B1 level
        distractors = quiz_service._select_distractors(
            target_word=target,
            vocabulary_pool=sample_vocabulary_words,
            count=3,
        )

        assert len(distractors) == 3
        assert target.word not in distractors

    @pytest.mark.asyncio
    async def test_distractor_selection_fallback_to_any(
        self, quiz_service, mock_dcs_ai_client
    ):
        """Test fallback to any level when not enough same-level words."""
        # Create vocabulary with only 2 words at same level
        minimal_vocab = [
            VocabularyWord(
                id="v1",
                word="word1",
                definition="def1",
                part_of_speech="noun",
                level="C1",
                module_id=1,
            ),
            VocabularyWord(
                id="v2",
                word="word2",
                definition="def2",
                part_of_speech="noun",
                level="A1",
                module_id=1,
            ),
            VocabularyWord(
                id="v3",
                word="word3",
                definition="def3",
                part_of_speech="noun",
                level="A2",
                module_id=1,
            ),
            VocabularyWord(
                id="v4",
                word="word4",
                definition="def4",
                part_of_speech="noun",
                level="B1",
                module_id=1,
            ),
        ]

        target = minimal_vocab[0]  # C1 level - only one at this level
        distractors = quiz_service._select_distractors(
            target_word=target,
            vocabulary_pool=minimal_vocab,
            count=3,
        )

        assert len(distractors) == 3
        assert target.word not in distractors


# ============================================================================
# Unit Tests - Quiz Storage Service
# ============================================================================


class TestQuizStorageService:
    """Tests for QuizStorageService."""

    @pytest.mark.asyncio
    async def test_save_and_get_quiz(self):
        """Test saving and retrieving a quiz."""
        from datetime import datetime, timezone
        from app.services.ai_generation.quiz_storage_service import QuizStorageService
        from app.schemas.vocabulary_quiz import (
            VocabularyQuiz,
            VocabularyQuizQuestion,
        )

        storage = QuizStorageService()

        quiz = VocabularyQuiz(
            quiz_id="test-quiz-123",
            book_id=123,
            module_ids=[1, 2],
            questions=[
                VocabularyQuizQuestion(
                    question_id="q1",
                    definition="test definition",
                    correct_answer="word",
                    options=["word", "other1", "other2", "other3"],
                    audio_url=None,
                    vocabulary_id="v1",
                    cefr_level="B1",
                ),
            ],
            created_at=datetime.now(timezone.utc),
            quiz_length=1,
        )

        # Save
        quiz_id = await storage.save_quiz(quiz)
        assert quiz_id == "test-quiz-123"

        # Get full quiz (with answers)
        retrieved = await storage.get_quiz("test-quiz-123")
        assert retrieved is not None
        assert retrieved.quiz_id == "test-quiz-123"
        assert retrieved.questions[0].correct_answer == "word"

        # Get public quiz (without answers)
        public = await storage.get_quiz_public("test-quiz-123")
        assert public is not None
        assert public.quiz_id == "test-quiz-123"
        # Public version shouldn't have correct_answer attribute exposed
        assert not hasattr(public.questions[0], "correct_answer")

    @pytest.mark.asyncio
    async def test_submit_quiz_calculates_score(self):
        """Test submission returns correct score."""
        from datetime import datetime, timezone
        from uuid import uuid4
        from app.services.ai_generation.quiz_storage_service import QuizStorageService
        from app.schemas.vocabulary_quiz import (
            VocabularyQuiz,
            VocabularyQuizQuestion,
        )

        storage = QuizStorageService()
        student_id = uuid4()

        quiz = VocabularyQuiz(
            quiz_id="test-quiz-456",
            book_id=123,
            module_ids=[1],
            questions=[
                VocabularyQuizQuestion(
                    question_id="q1",
                    definition="def1",
                    correct_answer="correct1",
                    options=["correct1", "wrong1", "wrong2", "wrong3"],
                    audio_url=None,
                    vocabulary_id="v1",
                    cefr_level="B1",
                ),
                VocabularyQuizQuestion(
                    question_id="q2",
                    definition="def2",
                    correct_answer="correct2",
                    options=["correct2", "wrong1", "wrong2", "wrong3"],
                    audio_url=None,
                    vocabulary_id="v2",
                    cefr_level="B1",
                ),
            ],
            created_at=datetime.now(timezone.utc),
            quiz_length=2,
        )

        await storage.save_quiz(quiz)

        # Submit with 1 correct and 1 wrong
        answers = {
            "q1": "correct1",  # Correct
            "q2": "wrong1",    # Wrong
        }

        result = await storage.save_submission(
            quiz_id="test-quiz-456",
            student_id=student_id,
            answers=answers,
        )

        assert result is not None
        assert result.score == 1
        assert result.total == 2
        assert result.percentage == 50.0

        # Check individual question results
        assert result.question_results[0].is_correct is True
        assert result.question_results[1].is_correct is False

    @pytest.mark.asyncio
    async def test_get_result_after_submission(self):
        """Test getting results after submission."""
        from datetime import datetime, timezone
        from uuid import uuid4
        from app.services.ai_generation.quiz_storage_service import QuizStorageService
        from app.schemas.vocabulary_quiz import (
            VocabularyQuiz,
            VocabularyQuizQuestion,
        )

        storage = QuizStorageService()
        student_id = uuid4()

        quiz = VocabularyQuiz(
            quiz_id="test-quiz-789",
            book_id=123,
            module_ids=[1],
            questions=[
                VocabularyQuizQuestion(
                    question_id="q1",
                    definition="def1",
                    correct_answer="correct1",
                    options=["correct1", "wrong1", "wrong2", "wrong3"],
                    audio_url=None,
                    vocabulary_id="v1",
                    cefr_level="B1",
                ),
            ],
            created_at=datetime.now(timezone.utc),
            quiz_length=1,
        )

        await storage.save_quiz(quiz)
        await storage.save_submission(
            quiz_id="test-quiz-789",
            student_id=student_id,
            answers={"q1": "correct1"},
        )

        # Get result
        result = await storage.get_result("test-quiz-789", student_id)
        assert result is not None
        assert result.score == 1

        # Check has_submitted
        assert await storage.has_submitted("test-quiz-789", student_id) is True
        assert await storage.has_submitted("test-quiz-789", uuid4()) is False
