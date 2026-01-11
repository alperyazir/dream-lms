"""
Tests for Word Builder Service.

Tests letter scrambling, vocabulary filtering, scoring with attempts,
and error handling with mocked DCS AI client.

Story 27.14: Word Builder (Spelling Activity)
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.schemas.dcs_ai_data import (
    VocabularyWord,
    VocabularyResponse,
    ProcessingMetadata,
)
from app.schemas.word_builder import (
    WordBuilderRequest,
    WordBuilderSubmission,
    WordBuilderActivity,
    WordBuilderItem,
)
from app.services.ai_generation.word_builder_service import (
    InsufficientVocabularyError,
    WordBuilderError,
    WordBuilderService,
    scramble_letters,
    calculate_points,
    MIN_WORD_LENGTH,
    MAX_WORD_LENGTH,
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
    client.get_audio_url = AsyncMock(return_value=None)
    return client


@pytest.fixture
def mock_tts_manager():
    """Mock TTSManager for testing audio generation."""
    manager = MagicMock()
    manager.generate_audio = AsyncMock()
    return manager


@pytest.fixture
def word_builder_service(mock_dcs_ai_client, mock_tts_manager):
    """Create WordBuilderService with mocked dependencies."""
    return WordBuilderService(mock_dcs_ai_client, mock_tts_manager)


@pytest.fixture
def word_builder_service_no_tts(mock_dcs_ai_client):
    """Create WordBuilderService without TTS manager."""
    return WordBuilderService(mock_dcs_ai_client, None)


@pytest.fixture
def sample_vocabulary():
    """Sample vocabulary words for testing."""
    return [
        VocabularyWord(
            id="vocab_1",
            word="apple",
            definition="a round fruit with red or green skin",
            part_of_speech="noun",
            level="A1",
            module_id=1,
        ),
        VocabularyWord(
            id="vocab_2",
            word="accomplish",
            definition="to succeed in doing or completing something",
            part_of_speech="verb",
            level="B1",
            module_id=1,
        ),
        VocabularyWord(
            id="vocab_3",
            word="beautiful",
            definition="pleasing to the senses or mind aesthetically",
            part_of_speech="adjective",
            level="A2",
            module_id=1,
        ),
        VocabularyWord(
            id="vocab_4",
            word="computer",
            definition="an electronic device for storing and processing data",
            part_of_speech="noun",
            level="A2",
            module_id=2,
        ),
        VocabularyWord(
            id="vocab_5",
            word="elephant",
            definition="a very large animal with a long trunk",
            part_of_speech="noun",
            level="A1",
            module_id=2,
        ),
        VocabularyWord(
            id="vocab_6",
            word="fantastic",
            definition="extraordinarily good or attractive",
            part_of_speech="adjective",
            level="B1",
            module_id=2,
        ),
        VocabularyWord(
            id="vocab_7",
            word="garden",
            definition="a piece of ground where flowers and vegetables are grown",
            part_of_speech="noun",
            level="A1",
            module_id=1,
        ),
        VocabularyWord(
            id="vocab_8",
            word="happiness",
            definition="the state of being happy",
            part_of_speech="noun",
            level="A2",
            module_id=1,
        ),
        VocabularyWord(
            id="vocab_9",
            word="intelligent",
            definition="having the ability to learn and understand things quickly",
            part_of_speech="adjective",
            level="B1",
            module_id=2,
        ),
        VocabularyWord(
            id="vocab_10",
            word="journey",
            definition="an act of traveling from one place to another",
            part_of_speech="noun",
            level="A2",
            module_id=2,
        ),
    ]


@pytest.fixture
def sample_vocabulary_response(sample_vocabulary):
    """Sample vocabulary response from DCS."""
    return VocabularyResponse(
        book_id="123",
        module_id=None,
        language="en",
        total_words=len(sample_vocabulary),
        words=sample_vocabulary,
    )


# ============================================================================
# Letter Scrambling Tests
# ============================================================================


class TestLetterScrambling:
    """Tests for the scramble_letters function."""

    def test_scramble_letters_not_original(self):
        """Test that scrambled letters are never in original order."""
        word = "elephant"
        original = list(word.lower())

        # Run multiple times to ensure consistency
        for _ in range(10):
            scrambled = scramble_letters(word)
            assert scrambled != original
            assert len(scrambled) == len(word)
            assert sorted(scrambled) == sorted(original)

    def test_scramble_handles_repeated_letters(self):
        """Test scrambling works with repeated letters (e.g., 'accomplish')."""
        word = "accomplish"
        original = list(word.lower())

        scrambled = scramble_letters(word)
        assert scrambled != original
        assert len(scrambled) == len(word)
        # All letters should be preserved
        assert sorted(scrambled) == sorted(original)

    def test_scramble_short_word(self):
        """Test scrambling a short word."""
        word = "apple"
        original = list(word.lower())

        scrambled = scramble_letters(word)
        assert scrambled != original
        assert len(scrambled) == 5

    def test_scramble_two_letter_word(self):
        """Test scrambling a 2-letter word swaps the letters."""
        word = "go"
        scrambled = scramble_letters(word)

        # For a 2-letter word, the only scramble is to swap
        assert scrambled == ['o', 'g'] or scrambled != list(word.lower())

    def test_scramble_preserves_lowercase(self):
        """Test that scrambled letters are lowercase."""
        word = "APPLE"
        scrambled = scramble_letters(word)

        assert all(c.islower() for c in scrambled)


# ============================================================================
# Scoring Tests
# ============================================================================


class TestScoring:
    """Tests for scoring with attempt weighting."""

    def test_score_first_try_full_points(self):
        """Test first-try correct gets 100 points."""
        points = calculate_points(1)
        assert points == 100

    def test_score_second_try(self):
        """Test second-try gets 70 points."""
        points = calculate_points(2)
        assert points == 70

    def test_score_third_try(self):
        """Test third-try gets 50 points."""
        points = calculate_points(3)
        assert points == 50

    def test_score_multiple_attempts_reduced(self):
        """Test 4+ attempts get 30 points."""
        assert calculate_points(4) == 30
        assert calculate_points(5) == 30
        assert calculate_points(10) == 30


# ============================================================================
# Vocabulary Filtering Tests
# ============================================================================


class TestVocabularyFiltering:
    """Tests for vocabulary filtering by word length and definitions."""

    def test_filter_by_length_excludes_short_words(self, word_builder_service):
        """Test that words shorter than MIN_WORD_LENGTH are excluded."""
        short_words = [
            VocabularyWord(
                id="short_1", word="cat", definition="a small animal",
                part_of_speech="noun", level="A1", module_id=1,
            ),
            VocabularyWord(
                id="short_2", word="dog", definition="a loyal pet",
                part_of_speech="noun", level="A1", module_id=1,
            ),
        ]

        filtered = word_builder_service._filter_by_length(short_words)
        assert len(filtered) == 0

    def test_filter_by_length_excludes_long_words(self, word_builder_service):
        """Test that words longer than MAX_WORD_LENGTH are excluded."""
        long_words = [
            VocabularyWord(
                id="long_1", word="internationalization", definition="the process of making something international",
                part_of_speech="noun", level="C1", module_id=1,
            ),
        ]

        filtered = word_builder_service._filter_by_length(long_words)
        assert len(filtered) == 0

    def test_filter_by_length_keeps_valid_words(self, word_builder_service, sample_vocabulary):
        """Test that words within valid length range are kept."""
        filtered = word_builder_service._filter_by_length(sample_vocabulary)

        for word in filtered:
            assert MIN_WORD_LENGTH <= len(word.word) <= MAX_WORD_LENGTH

    def test_filter_with_definitions_excludes_empty(self, word_builder_service):
        """Test that words without definitions are excluded."""
        words_without_defs = [
            VocabularyWord(
                id="no_def_1", word="example", definition="",
                part_of_speech="noun", level="A1", module_id=1,
            ),
            VocabularyWord(
                id="no_def_2", word="sample", definition="   ",
                part_of_speech="noun", level="A1", module_id=1,
            ),
        ]

        filtered = word_builder_service._filter_with_definitions(words_without_defs)
        assert len(filtered) == 0

    def test_filter_with_definitions_keeps_valid(self, word_builder_service, sample_vocabulary):
        """Test that words with definitions are kept."""
        filtered = word_builder_service._filter_with_definitions(sample_vocabulary)

        assert len(filtered) == len(sample_vocabulary)
        for word in filtered:
            assert word.definition and len(word.definition.strip()) > 0


# ============================================================================
# Activity Generation Tests
# ============================================================================


class TestActivityGeneration:
    """Tests for word builder activity generation."""

    @pytest.mark.asyncio
    async def test_generate_activity_success(
        self, word_builder_service, mock_dcs_ai_client, sample_vocabulary_response
    ):
        """Test successful activity generation."""
        mock_dcs_ai_client.get_vocabulary.return_value = sample_vocabulary_response

        request = WordBuilderRequest(
            book_id=123,
            word_count=5,
            hint_type="both",
        )

        activity = await word_builder_service.generate_activity(request)

        assert activity.activity_id is not None
        assert activity.book_id == 123
        assert len(activity.words) == 5
        assert activity.hint_type == "both"

        # Each word should have scrambled letters
        for word_item in activity.words:
            assert word_item.item_id is not None
            assert len(word_item.letters) == len(word_item.correct_word)
            assert word_item.letters != list(word_item.correct_word)
            assert word_item.definition is not None

    @pytest.mark.asyncio
    async def test_generate_activity_with_cefr_filter(
        self, word_builder_service, mock_dcs_ai_client, sample_vocabulary_response
    ):
        """Test activity generation with CEFR level filtering."""
        mock_dcs_ai_client.get_vocabulary.return_value = sample_vocabulary_response

        request = WordBuilderRequest(
            book_id=123,
            word_count=3,
            cefr_levels=["A1", "A2"],
            hint_type="definition",
        )

        activity = await word_builder_service.generate_activity(request)

        # All words should be A1 or A2 level
        for word_item in activity.words:
            # Find original vocabulary word
            original = next(
                (w for w in sample_vocabulary_response.words if w.id == word_item.vocabulary_id),
                None
            )
            assert original is not None
            assert original.level in ["A1", "A2"]

    @pytest.mark.asyncio
    async def test_generate_activity_insufficient_vocabulary(
        self, word_builder_service, mock_dcs_ai_client
    ):
        """Test error when not enough vocabulary available."""
        # Return only 2 words when 10 are requested
        limited_vocab = VocabularyResponse(
            book_id="123",
            module_id=None,
            language="en",
            total_words=2,
            words=[
                VocabularyWord(
                    id="vocab_1", word="apple", definition="a fruit",
                    part_of_speech="noun", level="A1", module_id=1,
                ),
                VocabularyWord(
                    id="vocab_2", word="banana", definition="a yellow fruit",
                    part_of_speech="noun", level="A1", module_id=1,
                ),
            ],
        )
        mock_dcs_ai_client.get_vocabulary.return_value = limited_vocab

        request = WordBuilderRequest(
            book_id=123,
            word_count=10,
        )

        with pytest.raises(InsufficientVocabularyError) as exc_info:
            await word_builder_service.generate_activity(request)

        assert exc_info.value.available < exc_info.value.required

    @pytest.mark.asyncio
    async def test_generate_activity_book_not_processed(
        self, word_builder_service, mock_dcs_ai_client
    ):
        """Test error when book is not processed."""
        mock_dcs_ai_client.is_book_processed.return_value = False
        mock_dcs_ai_client.get_processing_status.return_value = ProcessingMetadata(
            book_id="123",
            processing_status="pending",
            processed_at=None,
            version="1.0",
        )

        request = WordBuilderRequest(book_id=123, word_count=5)

        with pytest.raises(DCSAIDataNotReadyError):
            await word_builder_service.generate_activity(request)

    @pytest.mark.asyncio
    async def test_generate_activity_book_not_found(
        self, word_builder_service, mock_dcs_ai_client
    ):
        """Test error when book is not found."""
        mock_dcs_ai_client.is_book_processed.return_value = False
        mock_dcs_ai_client.get_processing_status.return_value = None

        request = WordBuilderRequest(book_id=999, word_count=5)

        with pytest.raises(DCSAIDataNotFoundError):
            await word_builder_service.generate_activity(request)


# ============================================================================
# Result Calculation Tests
# ============================================================================


class TestResultCalculation:
    """Tests for result calculation with attempt-based scoring."""

    def test_calculate_result_all_correct_first_try(self):
        """Test result with all words correct on first try."""
        activity = WordBuilderActivity(
            activity_id="test-activity",
            book_id=123,
            module_ids=[1],
            words=[
                WordBuilderItem(
                    item_id="item_1",
                    correct_word="apple",
                    letters=["p", "p", "l", "a", "e"],
                    definition="a fruit",
                    audio_url=None,
                    vocabulary_id="vocab_1",
                    cefr_level="A1",
                ),
                WordBuilderItem(
                    item_id="item_2",
                    correct_word="banana",
                    letters=["a", "n", "a", "b", "n", "a"],
                    definition="a yellow fruit",
                    audio_url=None,
                    vocabulary_id="vocab_2",
                    cefr_level="A1",
                ),
            ],
            hint_type="both",
            created_at=datetime.now(timezone.utc),
        )

        submission = WordBuilderSubmission(
            answers={
                "item_1": "apple",
                "item_2": "banana",
            },
            attempts={
                "item_1": 1,
                "item_2": 1,
            },
        )

        result = WordBuilderService.calculate_result(
            activity=activity,
            submission=submission,
            student_id="student-123",
        )

        assert result.correct_count == 2
        assert result.total == 2
        assert result.score == 200  # 100 + 100
        assert result.max_score == 200
        assert result.percentage == 100.0
        assert result.perfect_words == 2
        assert result.average_attempts == 1.0

    def test_calculate_result_mixed_attempts(self):
        """Test result with varying attempt counts."""
        activity = WordBuilderActivity(
            activity_id="test-activity",
            book_id=123,
            module_ids=[1],
            words=[
                WordBuilderItem(
                    item_id="item_1",
                    correct_word="apple",
                    letters=["p", "p", "l", "a", "e"],
                    definition="a fruit",
                    audio_url=None,
                    vocabulary_id="vocab_1",
                    cefr_level="A1",
                ),
                WordBuilderItem(
                    item_id="item_2",
                    correct_word="banana",
                    letters=["a", "n", "a", "b", "n", "a"],
                    definition="a yellow fruit",
                    audio_url=None,
                    vocabulary_id="vocab_2",
                    cefr_level="A1",
                ),
                WordBuilderItem(
                    item_id="item_3",
                    correct_word="cherry",
                    letters=["r", "r", "c", "h", "e", "y"],
                    definition="a small red fruit",
                    audio_url=None,
                    vocabulary_id="vocab_3",
                    cefr_level="A1",
                ),
            ],
            hint_type="both",
            created_at=datetime.now(timezone.utc),
        )

        submission = WordBuilderSubmission(
            answers={
                "item_1": "apple",   # Correct, 1st try -> 100 points
                "item_2": "banana",  # Correct, 2nd try -> 70 points
                "item_3": "cherry",  # Correct, 4th try -> 30 points
            },
            attempts={
                "item_1": 1,
                "item_2": 2,
                "item_3": 4,
            },
        )

        result = WordBuilderService.calculate_result(
            activity=activity,
            submission=submission,
            student_id="student-123",
        )

        assert result.correct_count == 3
        assert result.score == 200  # 100 + 70 + 30
        assert result.max_score == 300
        assert result.perfect_words == 1
        assert result.average_attempts == pytest.approx(2.33, rel=0.01)

    def test_calculate_result_incorrect_answers(self):
        """Test result with incorrect answers."""
        activity = WordBuilderActivity(
            activity_id="test-activity",
            book_id=123,
            module_ids=[1],
            words=[
                WordBuilderItem(
                    item_id="item_1",
                    correct_word="apple",
                    letters=["p", "p", "l", "a", "e"],
                    definition="a fruit",
                    audio_url=None,
                    vocabulary_id="vocab_1",
                    cefr_level="A1",
                ),
                WordBuilderItem(
                    item_id="item_2",
                    correct_word="banana",
                    letters=["a", "n", "a", "b", "n", "a"],
                    definition="a yellow fruit",
                    audio_url=None,
                    vocabulary_id="vocab_2",
                    cefr_level="A1",
                ),
            ],
            hint_type="both",
            created_at=datetime.now(timezone.utc),
        )

        submission = WordBuilderSubmission(
            answers={
                "item_1": "apple",   # Correct
                "item_2": "bananaa", # Incorrect (typo)
            },
            attempts={
                "item_1": 1,
                "item_2": 3,
            },
        )

        result = WordBuilderService.calculate_result(
            activity=activity,
            submission=submission,
            student_id="student-123",
        )

        assert result.correct_count == 1
        assert result.total == 2
        assert result.score == 100  # Only first word correct
        assert result.percentage == 50.0

        # Check individual results
        item_1_result = next(r for r in result.word_results if r.item_id == "item_1")
        item_2_result = next(r for r in result.word_results if r.item_id == "item_2")

        assert item_1_result.is_correct is True
        assert item_1_result.points == 100
        assert item_2_result.is_correct is False
        assert item_2_result.points == 0

    def test_calculate_result_case_insensitive(self):
        """Test that spelling check is case-insensitive."""
        activity = WordBuilderActivity(
            activity_id="test-activity",
            book_id=123,
            module_ids=[1],
            words=[
                WordBuilderItem(
                    item_id="item_1",
                    correct_word="apple",
                    letters=["p", "p", "l", "a", "e"],
                    definition="a fruit",
                    audio_url=None,
                    vocabulary_id="vocab_1",
                    cefr_level="A1",
                ),
            ],
            hint_type="both",
            created_at=datetime.now(timezone.utc),
        )

        submission = WordBuilderSubmission(
            answers={"item_1": "APPLE"},  # Uppercase
            attempts={"item_1": 1},
        )

        result = WordBuilderService.calculate_result(
            activity=activity,
            submission=submission,
            student_id="student-123",
        )

        assert result.correct_count == 1
        assert result.word_results[0].is_correct is True

    def test_calculate_result_empty_submission(self):
        """Test result with missing answers."""
        activity = WordBuilderActivity(
            activity_id="test-activity",
            book_id=123,
            module_ids=[1],
            words=[
                WordBuilderItem(
                    item_id="item_1",
                    correct_word="apple",
                    letters=["p", "p", "l", "a", "e"],
                    definition="a fruit",
                    audio_url=None,
                    vocabulary_id="vocab_1",
                    cefr_level="A1",
                ),
            ],
            hint_type="both",
            created_at=datetime.now(timezone.utc),
        )

        submission = WordBuilderSubmission(
            answers={},  # No answers
            attempts={},
        )

        result = WordBuilderService.calculate_result(
            activity=activity,
            submission=submission,
            student_id="student-123",
        )

        assert result.correct_count == 0
        assert result.score == 0
        assert result.word_results[0].is_correct is False
        assert result.word_results[0].submitted_word == ""
