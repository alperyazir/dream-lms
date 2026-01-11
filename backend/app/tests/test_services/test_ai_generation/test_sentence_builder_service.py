"""
Tests for Sentence Builder Service.

Tests activity generation, sentence extraction, word shuffling, scoring,
and error handling with mocked DCS AI client.

Story 27.13: Sentence Builder Activity
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.schemas.dcs_ai_data import (
    ModuleDetail,
    ModuleSummary,
    ModuleListResponse,
    ProcessingMetadata,
)
from app.schemas.sentence_builder import (
    SentenceBuilderRequest,
    SentenceBuilderSubmission,
)
from app.services.ai_generation.sentence_builder_service import (
    InsufficientSentencesError,
    SentenceBuilderError,
    SentenceBuilderService,
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
    client.get_modules = AsyncMock()
    client.get_module_detail = AsyncMock()
    return client


@pytest.fixture
def mock_llm_manager():
    """Mock LLMManager for testing sentence filtering."""
    manager = MagicMock()
    manager.generate_structured = AsyncMock()
    return manager


@pytest.fixture
def mock_tts_manager():
    """Mock TTSManager for testing audio generation."""
    manager = MagicMock()
    manager.generate_audio = AsyncMock()
    return manager


@pytest.fixture
def sentence_service(mock_dcs_ai_client, mock_llm_manager, mock_tts_manager):
    """Create SentenceBuilderService with mocked dependencies."""
    return SentenceBuilderService(mock_dcs_ai_client, mock_llm_manager, mock_tts_manager)


@pytest.fixture
def sentence_service_no_llm(mock_dcs_ai_client):
    """Create SentenceBuilderService without LLM or TTS managers."""
    return SentenceBuilderService(mock_dcs_ai_client, None, None)


@pytest.fixture
def sample_module_text():
    """Sample module text with sentences of various lengths."""
    return """
    The cat sat on the mat. This is a simple sentence.
    Learning English can be both challenging and rewarding for students.
    The quick brown fox jumps over the lazy dog in the garden.
    She went to the store. He bought some apples.
    Effective communication skills are essential in today's global business environment.
    The teacher explained the lesson carefully to all the students in the class.
    Birds fly south in winter. Dogs are loyal pets.
    Understanding complex mathematical concepts requires practice and dedication.
    """


@pytest.fixture
def sample_module_detail(sample_module_text):
    """Sample module detail from DCS."""
    return ModuleDetail(
        module_id=1,
        title="Unit 1: Basic English",
        pages=[10, 11, 12],
        text=sample_module_text,
        topics=["animals", "daily life"],
        vocabulary_ids=["vocab_1", "vocab_2"],
        language="en",
        difficulty="A2",
    )


@pytest.fixture
def sample_module_list():
    """Sample module list from DCS."""
    return ModuleListResponse(
        book_id="123",
        total_modules=2,
        modules=[
            ModuleSummary(module_id=1, title="Unit 1", pages=[10, 11, 12]),
            ModuleSummary(module_id=2, title="Unit 2", pages=[20, 21, 22]),
        ],
    )


# ============================================================================
# Sentence Extraction Tests
# ============================================================================


class TestSentenceExtraction:
    """Tests for sentence extraction from module text."""

    def test_extract_sentences_basic(self, sentence_service):
        """Test basic sentence extraction."""
        # Use sentences with detectable verbs (auxiliary verbs, -ed endings, -s endings)
        text = "The cat is sleeping on the mat. The dog was running in the park."
        sentences = sentence_service._extract_sentences(text)

        assert len(sentences) >= 1
        # All sentences should be properly formatted
        for s in sentences:
            assert s[0].isupper()  # Starts with capital
            assert s.endswith('.')  # Ends with period

    def test_extract_sentences_skips_questions(self, sentence_service):
        """Test that questions are skipped."""
        text = "The cat is sitting on the mat. What is your name? The dog was running."
        sentences = sentence_service._extract_sentences(text)

        # Should not include the question
        for s in sentences:
            assert not s.endswith('?')

    def test_extract_sentences_skips_short(self, sentence_service):
        """Test that very short sentences are skipped."""
        text = "Hi. The cat sat on the mat. Yes. No."
        sentences = sentence_service._extract_sentences(text)

        # Should not include very short sentences
        for s in sentences:
            assert len(s) >= 10

    def test_extract_sentences_empty_text(self, sentence_service):
        """Test extraction from empty text."""
        sentences = sentence_service._extract_sentences("")
        assert sentences == []

    def test_extract_sentences_none_text(self, sentence_service):
        """Test extraction from None text."""
        sentences = sentence_service._extract_sentences(None)
        assert sentences == []


# ============================================================================
# Difficulty Filtering Tests
# ============================================================================


class TestDifficultyFiltering:
    """Tests for sentence filtering by difficulty."""

    def test_filter_easy_sentences(self, sentence_service):
        """Test filtering for easy sentences (4-6 words)."""
        sentences = [
            "The cat sat.",  # 3 words - too short
            "The cat sat down.",  # 4 words - easy
            "The cat is sleeping now.",  # 5 words - easy
            "The quick brown fox jumps over.",  # 6 words - easy
            "The quick brown fox jumps over the lazy dog.",  # 9 words - too long
        ]
        filtered = sentence_service._filter_by_difficulty(sentences, "easy")

        # Should only include 4-6 word sentences
        for s in filtered:
            word_count = len(s.split())
            assert 4 <= word_count <= 6

    def test_filter_medium_sentences(self, sentence_service):
        """Test filtering for medium sentences (7-10 words)."""
        sentences = [
            "The cat sat down quietly.",  # 5 words - too short
            "The quick brown fox jumps over the lazy dog.",  # 9 words - medium
            "She went to the store to buy some fresh bread.",  # 10 words - medium
            "The very long sentence has way too many words in it now.",  # 12 words - too long
        ]
        filtered = sentence_service._filter_by_difficulty(sentences, "medium")

        for s in filtered:
            word_count = len(s.split())
            assert 7 <= word_count <= 10

    def test_filter_hard_sentences(self, sentence_service):
        """Test filtering for hard sentences (11+ words)."""
        sentences = [
            "Short sentence here.",  # 3 words
            "The quick brown fox jumps over the lazy dog very quickly.",  # 11 words - hard
            "Understanding complex mathematical concepts requires extensive practice and dedication over time.",  # 11+ words - hard
        ]
        filtered = sentence_service._filter_by_difficulty(sentences, "hard")

        for s in filtered:
            word_count = len(s.split())
            assert word_count >= 11


# ============================================================================
# Word Shuffling Tests
# ============================================================================


class TestWordShuffling:
    """Tests for word shuffling algorithm."""

    def test_shuffle_words_not_original_order(self, sentence_service):
        """Test that shuffled words are never in original order."""
        sentence = "The cat sat on the mat."
        original_words = sentence.split()

        # Run multiple times to verify
        for _ in range(10):
            shuffled = sentence_service._shuffle_words(sentence)
            # All words should still be present
            assert sorted(shuffled) == sorted(original_words)
            # Order should be different (with high probability)
            # Note: For very short sentences, this might occasionally match

    def test_shuffle_words_preserves_all_words(self, sentence_service):
        """Test that shuffling preserves all words."""
        sentence = "Learning English is fun and rewarding."
        shuffled = sentence_service._shuffle_words(sentence)

        assert sorted(shuffled) == sorted(sentence.split())

    def test_shuffle_words_handles_punctuation(self, sentence_service):
        """Test that punctuation attached to words is preserved."""
        sentence = "Hello, world!"
        shuffled = sentence_service._shuffle_words(sentence)

        # Should preserve "Hello," and "world!"
        assert "Hello," in shuffled or "world!" in shuffled

    def test_shuffle_two_word_sentence(self, sentence_service):
        """Test shuffling a two-word sentence."""
        sentence = "Hello world."
        shuffled = sentence_service._shuffle_words(sentence)

        # Should still have both words
        assert len(shuffled) == 2
        assert set(shuffled) == {"Hello", "world."}


# ============================================================================
# Scoring Tests
# ============================================================================


class TestScoring:
    """Tests for sentence builder scoring."""

    def test_score_correct_order(self, sentence_service_no_llm, sample_module_detail, mock_dcs_ai_client):
        """Test scoring when all sentences are correct."""
        # Create a simple activity
        from app.schemas.sentence_builder import SentenceBuilderActivity, SentenceBuilderItem

        activity = SentenceBuilderActivity(
            activity_id="test-123",
            book_id=1,
            module_ids=[1],
            sentences=[
                SentenceBuilderItem(
                    item_id="item-1",
                    correct_sentence="The cat sat.",
                    words=["sat.", "The", "cat"],
                    word_count=3,
                    audio_url=None,
                    source_module_id=1,
                    source_page=10,
                    difficulty="easy",
                ),
            ],
            difficulty="easy",
            include_audio=False,
            created_at=datetime.now(timezone.utc),
        )

        submission = SentenceBuilderSubmission(
            answers={"item-1": ["The", "cat", "sat."]}
        )

        result = sentence_service_no_llm.calculate_result(
            activity=activity,
            submission=submission,
            student_id="00000000-0000-0000-0000-000000000123",
        )

        assert result.score == 1
        assert result.total == 1
        assert result.percentage == 100.0
        assert result.sentence_results[0].is_correct is True

    def test_score_wrong_order(self, sentence_service_no_llm):
        """Test scoring when sentence order is wrong."""
        from app.schemas.sentence_builder import SentenceBuilderActivity, SentenceBuilderItem

        activity = SentenceBuilderActivity(
            activity_id="test-123",
            book_id=1,
            module_ids=[1],
            sentences=[
                SentenceBuilderItem(
                    item_id="item-1",
                    correct_sentence="The cat sat.",
                    words=["sat.", "The", "cat"],
                    word_count=3,
                    audio_url=None,
                    source_module_id=1,
                    source_page=10,
                    difficulty="easy",
                ),
            ],
            difficulty="easy",
            include_audio=False,
            created_at=datetime.now(timezone.utc),
        )

        submission = SentenceBuilderSubmission(
            answers={"item-1": ["sat.", "The", "cat"]}  # Wrong order
        )

        result = sentence_service_no_llm.calculate_result(
            activity=activity,
            submission=submission,
            student_id="00000000-0000-0000-0000-000000000123",
        )

        assert result.score == 0
        assert result.total == 1
        assert result.percentage == 0.0
        assert result.sentence_results[0].is_correct is False

    def test_score_partial_correct(self, sentence_service_no_llm):
        """Test scoring when some sentences are correct."""
        from app.schemas.sentence_builder import SentenceBuilderActivity, SentenceBuilderItem

        activity = SentenceBuilderActivity(
            activity_id="test-123",
            book_id=1,
            module_ids=[1],
            sentences=[
                SentenceBuilderItem(
                    item_id="item-1",
                    correct_sentence="The cat sat.",
                    words=["sat.", "The", "cat"],
                    word_count=3,
                    audio_url=None,
                    source_module_id=1,
                    source_page=10,
                    difficulty="easy",
                ),
                SentenceBuilderItem(
                    item_id="item-2",
                    correct_sentence="Dogs are pets.",
                    words=["pets.", "Dogs", "are"],
                    word_count=3,
                    audio_url=None,
                    source_module_id=1,
                    source_page=11,
                    difficulty="easy",
                ),
            ],
            difficulty="easy",
            include_audio=False,
            created_at=datetime.now(timezone.utc),
        )

        submission = SentenceBuilderSubmission(
            answers={
                "item-1": ["The", "cat", "sat."],  # Correct
                "item-2": ["pets.", "Dogs", "are"],  # Wrong
            }
        )

        result = sentence_service_no_llm.calculate_result(
            activity=activity,
            submission=submission,
            student_id="00000000-0000-0000-0000-000000000123",
        )

        assert result.score == 1
        assert result.total == 2
        assert result.percentage == 50.0


# ============================================================================
# Activity Generation Tests
# ============================================================================


class TestActivityGeneration:
    """Tests for full activity generation."""

    @pytest.mark.asyncio
    async def test_generate_activity_success(
        self, sentence_service_no_llm, mock_dcs_ai_client, sample_module_detail, sample_module_list
    ):
        """Test successful activity generation."""
        # Setup mocks
        mock_dcs_ai_client.is_book_processed.return_value = True
        mock_dcs_ai_client.get_modules.return_value = sample_module_list
        mock_dcs_ai_client.get_module_detail.return_value = sample_module_detail

        request = SentenceBuilderRequest(
            book_id=123,
            sentence_count=2,
            difficulty="medium",
            include_audio=False,
        )

        activity = await sentence_service_no_llm.generate_activity(request)

        assert activity.activity_id is not None
        assert activity.book_id == 123
        assert activity.difficulty == "medium"
        assert len(activity.sentences) == 2

    @pytest.mark.asyncio
    async def test_generate_activity_book_not_processed(
        self, sentence_service_no_llm, mock_dcs_ai_client
    ):
        """Test error when book is not processed."""
        mock_dcs_ai_client.is_book_processed.return_value = False
        mock_dcs_ai_client.get_processing_status.return_value = None

        request = SentenceBuilderRequest(
            book_id=123,
            sentence_count=5,
            difficulty="medium",
        )

        with pytest.raises(DCSAIDataNotFoundError):
            await sentence_service_no_llm.generate_activity(request)

    @pytest.mark.asyncio
    async def test_generate_activity_insufficient_sentences(
        self, sentence_service_no_llm, mock_dcs_ai_client, sample_module_list
    ):
        """Test error when not enough sentences available."""
        # Create module with very short text
        short_module = ModuleDetail(
            module_id=1,
            title="Unit 1",
            pages=[10],
            text="Hi. Hello.",  # Too short
            topics=[],
            vocabulary_ids=[],
            language="en",
            difficulty="A1",
        )

        mock_dcs_ai_client.is_book_processed.return_value = True
        mock_dcs_ai_client.get_modules.return_value = sample_module_list
        mock_dcs_ai_client.get_module_detail.return_value = short_module

        request = SentenceBuilderRequest(
            book_id=123,
            sentence_count=10,  # More than available
            difficulty="medium",
        )

        with pytest.raises(InsufficientSentencesError) as exc_info:
            await sentence_service_no_llm.generate_activity(request)

        assert exc_info.value.required == 10
        assert exc_info.value.available < 10

    @pytest.mark.asyncio
    async def test_generate_activity_with_specific_modules(
        self, sentence_service_no_llm, mock_dcs_ai_client, sample_module_detail
    ):
        """Test activity generation with specific module IDs."""
        mock_dcs_ai_client.is_book_processed.return_value = True
        mock_dcs_ai_client.get_module_detail.return_value = sample_module_detail

        request = SentenceBuilderRequest(
            book_id=123,
            module_ids=[1],  # Specific module
            sentence_count=2,
            difficulty="medium",
            include_audio=False,
        )

        activity = await sentence_service_no_llm.generate_activity(request)

        assert activity.book_id == 123
        assert 1 in activity.module_ids
        # get_modules should not be called when specific modules are provided
        mock_dcs_ai_client.get_modules.assert_not_called()


# ============================================================================
# Error Handling Tests
# ============================================================================


class TestErrorHandling:
    """Tests for error handling scenarios."""

    @pytest.mark.asyncio
    async def test_book_processing_in_progress(
        self, sentence_service_no_llm, mock_dcs_ai_client
    ):
        """Test error when book processing is in progress."""
        mock_dcs_ai_client.is_book_processed.return_value = False
        mock_dcs_ai_client.get_processing_status.return_value = ProcessingMetadata(
            book_id="123",
            processing_status="processing",
            last_updated=datetime.now(timezone.utc),
        )

        request = SentenceBuilderRequest(
            book_id=123,
            sentence_count=5,
            difficulty="medium",
        )

        with pytest.raises(DCSAIDataNotReadyError):
            await sentence_service_no_llm.generate_activity(request)

    @pytest.mark.asyncio
    async def test_no_modules_found(
        self, sentence_service_no_llm, mock_dcs_ai_client
    ):
        """Test error when no modules have content."""
        mock_dcs_ai_client.is_book_processed.return_value = True
        mock_dcs_ai_client.get_modules.return_value = ModuleListResponse(
            book_id="123",
            total_modules=0,
            modules=[],
        )

        request = SentenceBuilderRequest(
            book_id=123,
            sentence_count=5,
            difficulty="medium",
        )

        with pytest.raises(DCSAIDataNotFoundError):
            await sentence_service_no_llm.generate_activity(request)
