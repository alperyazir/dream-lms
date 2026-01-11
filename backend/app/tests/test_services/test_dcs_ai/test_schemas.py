"""
Tests for DCS AI Data Schemas.

Tests Pydantic model validation for AI data types.
"""

import pytest
from pydantic import ValidationError

from app.schemas.dcs_ai_data import (
    ModuleDetail,
    ModuleListResponse,
    ModuleSummary,
    ProcessingMetadata,
    VocabularyResponse,
    VocabularyWord,
)


# ============================================================================
# ProcessingMetadata Tests
# ============================================================================


def test_processing_metadata_valid():
    """Test that valid ProcessingMetadata can be created."""
    data = ProcessingMetadata(
        book_id="123",
        processing_status="completed",
        total_pages=120,
        total_modules=12,
        total_vocabulary=450,
        total_audio_files=900,
        languages=["en", "tr"],
        primary_language="en",
        difficulty_range=["A1", "A2", "B1"],
        stages={"extraction": "done"},
    )

    assert data.book_id == "123"
    assert data.processing_status == "completed"
    assert data.total_pages == 120
    assert data.total_modules == 12
    assert data.languages == ["en", "tr"]


def test_processing_metadata_optional_fields():
    """Test that ProcessingMetadata works with minimal required fields."""
    data = ProcessingMetadata(
        book_id="123",
        processing_status="pending",
    )

    assert data.book_id == "123"
    assert data.processing_status == "pending"
    assert data.total_pages == 0
    assert data.total_modules == 0
    assert data.languages == []
    assert data.primary_language == "en"
    assert data.difficulty_range == []
    assert data.stages is None


def test_processing_metadata_negative_totals_rejected():
    """Test that negative values for totals are rejected."""
    with pytest.raises(ValidationError):
        ProcessingMetadata(
            book_id="123",
            processing_status="completed",
            total_pages=-1,
        )


# ============================================================================
# ModuleSummary Tests
# ============================================================================


def test_module_summary_valid():
    """Test that valid ModuleSummary can be created."""
    data = ModuleSummary(
        module_id=1,
        title="Unit 1: Introduction",
        pages=[1, 2, 3, 4, 5],
        word_count=500,
    )

    assert data.module_id == 1
    assert data.title == "Unit 1: Introduction"
    assert data.pages == [1, 2, 3, 4, 5]
    assert data.word_count == 500


def test_module_summary_defaults():
    """Test that ModuleSummary has correct defaults."""
    data = ModuleSummary(module_id=1, title="Test")

    assert data.pages == []
    assert data.word_count == 0


# ============================================================================
# ModuleListResponse Tests
# ============================================================================


def test_module_list_response_valid():
    """Test that valid ModuleListResponse can be created."""
    data = ModuleListResponse(
        book_id="123",
        total_modules=2,
        modules=[
            ModuleSummary(module_id=1, title="Unit 1", pages=[1], word_count=100),
            ModuleSummary(module_id=2, title="Unit 2", pages=[2], word_count=200),
        ],
    )

    assert data.book_id == "123"
    assert data.total_modules == 2
    assert len(data.modules) == 2


def test_module_list_response_empty_modules():
    """Test that ModuleListResponse works with empty modules list."""
    data = ModuleListResponse(
        book_id="123",
        total_modules=0,
    )

    assert data.modules == []


# ============================================================================
# ModuleDetail Tests
# ============================================================================


def test_module_detail_valid():
    """Test that valid ModuleDetail can be created."""
    data = ModuleDetail(
        module_id=1,
        title="Unit 1",
        pages=[1, 2, 3],
        text="Sample module text content.",
        topics=["topic1", "topic2"],
        vocabulary_ids=["vocab_1", "vocab_2"],
        language="en",
        difficulty="B1",
    )

    assert data.module_id == 1
    assert data.title == "Unit 1"
    assert "Sample module text" in data.text
    assert len(data.topics) == 2
    assert data.language == "en"
    assert data.difficulty == "B1"


def test_module_detail_defaults():
    """Test that ModuleDetail has correct defaults."""
    data = ModuleDetail(module_id=1, title="Test")

    assert data.pages == []
    assert data.text == ""
    assert data.topics == []
    assert data.vocabulary_ids == []
    assert data.language == "en"
    assert data.difficulty == "A1"


# ============================================================================
# VocabularyWord Tests
# ============================================================================


def test_vocabulary_word_valid():
    """Test that valid VocabularyWord can be created."""
    data = VocabularyWord(
        id="vocab_123",
        word="accomplish",
        translation="başarmak",
        definition="to succeed in doing something",
        part_of_speech="verb",
        level="B1",
        example="She accomplished her goal.",
        module_id=3,
        module_title="Unit 3: Achievements",
        page=45,
        audio={
            "word": "audio/vocabulary/en/accomplish.mp3",
            "translation": "audio/vocabulary/tr/accomplish.mp3",
        },
    )

    assert data.id == "vocab_123"
    assert data.word == "accomplish"
    assert data.translation == "başarmak"
    assert data.part_of_speech == "verb"
    assert data.audio is not None
    assert "word" in data.audio


def test_vocabulary_word_optional_audio():
    """Test that VocabularyWord works without audio."""
    data = VocabularyWord(
        id="vocab_1",
        word="test",
        definition="a test word",
        part_of_speech="noun",
        module_id=1,
    )

    assert data.audio is None
    assert data.translation is None
    assert data.example is None
    assert data.module_title is None
    assert data.page is None


def test_vocabulary_word_defaults():
    """Test that VocabularyWord has correct defaults."""
    data = VocabularyWord(
        id="vocab_1",
        word="test",
        definition="test definition",
        part_of_speech="noun",
        module_id=1,
    )

    assert data.level == "A1"


# ============================================================================
# VocabularyResponse Tests
# ============================================================================


def test_vocabulary_response_valid():
    """Test that valid VocabularyResponse can be created."""
    data = VocabularyResponse(
        book_id="123",
        language="en",
        translation_language="tr",
        total_words=2,
        words=[
            VocabularyWord(
                id="vocab_1",
                word="test1",
                definition="def1",
                part_of_speech="noun",
                module_id=1,
            ),
            VocabularyWord(
                id="vocab_2",
                word="test2",
                definition="def2",
                part_of_speech="verb",
                module_id=1,
            ),
        ],
        extracted_at="2025-01-01T00:00:00Z",
    )

    assert data.book_id == "123"
    assert data.language == "en"
    assert data.translation_language == "tr"
    assert data.total_words == 2
    assert len(data.words) == 2


def test_vocabulary_response_optional_fields():
    """Test that VocabularyResponse works with minimal fields."""
    data = VocabularyResponse(
        book_id="123",
        language="en",
        total_words=0,
    )

    assert data.translation_language is None
    assert data.words == []
    assert data.extracted_at is None


def test_vocabulary_response_negative_total_rejected():
    """Test that negative total_words is rejected."""
    with pytest.raises(ValidationError):
        VocabularyResponse(
            book_id="123",
            language="en",
            total_words=-1,
        )
