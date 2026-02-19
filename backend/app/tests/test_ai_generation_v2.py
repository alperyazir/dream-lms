"""Tests for Skill-First AI Generation V2 (Story 30.3)."""

import uuid

import pytest
from pydantic import ValidationError
from sqlmodel import Session

from app.models import ActivityFormat, SkillCategory, SkillFormatCombination
from app.schemas.ai_generation_v2 import GenerationRequestV2, GenerationResponseV2
from app.services.skill_generation_dispatcher import (
    GENERATOR_MAP,
    DispatchResult,
    dispatch,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(name="seed_skill_data")
def seed_skill_data_fixture(session: Session) -> dict:
    """Seed skills, formats, and combinations for dispatcher tests."""
    vocab = SkillCategory(
        name="Vocabulary", slug="vocabulary", icon="text", color="teal",
        display_order=5, is_active=True,
    )
    grammar = SkillCategory(
        name="Grammar", slug="grammar", icon="pen-tool", color="orange",
        display_order=6, is_active=True,
    )
    reading = SkillCategory(
        name="Reading", slug="reading", icon="book-open", color="green",
        display_order=2, is_active=True,
    )
    listening = SkillCategory(
        name="Listening", slug="listening", icon="ear", color="blue",
        display_order=1, is_active=True,
    )
    writing = SkillCategory(
        name="Writing", slug="writing", icon="edit-3", color="yellow",
        display_order=3, is_active=True,
    )
    speaking = SkillCategory(
        name="Speaking", slug="speaking", icon="mic", color="purple",
        display_order=4, is_active=False,  # Inactive!
    )
    session.add_all([vocab, grammar, reading, listening, writing, speaking])
    session.flush()

    mcq = ActivityFormat(name="Quiz (MCQ)", slug="multiple_choice")
    wb = ActivityFormat(name="Word Builder", slug="word_builder")
    matching = ActivityFormat(name="Matching", slug="matching")
    sb = ActivityFormat(name="Sentence Builder", slug="sentence_builder")
    fill = ActivityFormat(name="Fill-in-the-blank", slug="fill_blank")
    comp = ActivityFormat(name="Comprehension", slug="comprehension")
    session.add_all([mcq, wb, matching, sb, fill, comp])
    session.flush()

    combos = [
        SkillFormatCombination(skill_id=vocab.id, format_id=mcq.id, display_order=1),
        SkillFormatCombination(skill_id=vocab.id, format_id=wb.id, display_order=2),
        SkillFormatCombination(skill_id=vocab.id, format_id=matching.id, display_order=3),
        SkillFormatCombination(skill_id=grammar.id, format_id=mcq.id, display_order=1),
        SkillFormatCombination(skill_id=grammar.id, format_id=sb.id, display_order=2),
        SkillFormatCombination(skill_id=grammar.id, format_id=fill.id, display_order=3),
        SkillFormatCombination(skill_id=reading.id, format_id=comp.id, display_order=1),
        SkillFormatCombination(skill_id=reading.id, format_id=mcq.id, display_order=2),
        SkillFormatCombination(skill_id=listening.id, format_id=mcq.id, display_order=1),
        SkillFormatCombination(skill_id=listening.id, format_id=fill.id, display_order=2),
        SkillFormatCombination(skill_id=writing.id, format_id=sb.id, display_order=1),
        SkillFormatCombination(skill_id=writing.id, format_id=fill.id, display_order=2),
    ]
    session.add_all(combos)
    session.commit()

    return {
        "vocab": vocab, "grammar": grammar, "reading": reading,
        "listening": listening, "writing": writing, "speaking": speaking,
        "mcq": mcq, "wb": wb, "matching": matching, "sb": sb,
        "fill": fill, "comp": comp,
    }


# ---------------------------------------------------------------------------
# Schema Tests — GenerationRequestV2
# ---------------------------------------------------------------------------


class TestGenerationRequestV2Schema:
    """Test GenerationRequestV2 validation."""

    def test_valid_book_request(self) -> None:
        """Test valid V2 request with book source."""
        req = GenerationRequestV2(
            source_type="book_module",
            book_id=1,
            module_ids=[10, 11],
            skill_slug="vocabulary",
            format_slug="multiple_choice",
            count=10,
        )
        assert req.skill_slug == "vocabulary"
        assert req.format_slug == "multiple_choice"

    def test_format_slug_required_for_non_mix(self) -> None:
        """Test that format_slug is required unless skill is 'mix'."""
        with pytest.raises(ValidationError) as exc_info:
            GenerationRequestV2(
                book_id=1,
                module_ids=[10],
                skill_slug="vocabulary",
                # format_slug missing
            )
        assert "format_slug" in str(exc_info.value)

    def test_format_slug_optional_for_mix(self) -> None:
        """Test that format_slug can be None for mix skill."""
        req = GenerationRequestV2(
            book_id=1,
            module_ids=[10],
            skill_slug="mix",
            format_slug=None,
        )
        assert req.format_slug is None

    def test_book_id_required_for_book_module(self) -> None:
        """Test that book_id is required for book_module source type."""
        with pytest.raises(ValidationError):
            GenerationRequestV2(
                source_type="book_module",
                # book_id missing
                module_ids=[10],
                skill_slug="vocabulary",
                format_slug="multiple_choice",
            )

    def test_material_text_required_for_teacher_material(self) -> None:
        """Test that material_text is required for teacher_material source type."""
        with pytest.raises(ValidationError):
            GenerationRequestV2(
                source_type="teacher_material",
                # material_text missing
                skill_slug="grammar",
                format_slug="multiple_choice",
            )

    def test_valid_teacher_material_request(self) -> None:
        """Test valid V2 request with teacher material source."""
        req = GenerationRequestV2(
            source_type="teacher_material",
            material_text="This is the teacher's text content for grammar exercises.",
            skill_slug="grammar",
            format_slug="sentence_builder",
        )
        assert req.source_type == "teacher_material"
        assert req.material_text is not None


# ---------------------------------------------------------------------------
# Dispatcher Tests
# ---------------------------------------------------------------------------


class TestSkillGenerationDispatcher:
    """Test the skill-format dispatcher."""

    def test_dispatch_vocabulary_mcq(self, session: Session, seed_skill_data: dict) -> None:
        """Test dispatching vocabulary × multiple_choice."""
        result = dispatch("vocabulary", "multiple_choice", session)
        assert result.generator_key == "vocabulary_quiz"
        assert result.activity_type == "vocabulary_quiz"
        assert result.skill_name == "Vocabulary"
        assert result.format_name == "Quiz (MCQ)"

    def test_dispatch_vocabulary_word_builder(self, session: Session, seed_skill_data: dict) -> None:
        """Test dispatching vocabulary × word_builder."""
        result = dispatch("vocabulary", "word_builder", session)
        assert result.generator_key == "word_builder"

    def test_dispatch_grammar_mcq(self, session: Session, seed_skill_data: dict) -> None:
        """Test dispatching grammar × multiple_choice routes to grammar_quiz."""
        result = dispatch("grammar", "multiple_choice", session)
        assert result.generator_key == "grammar_quiz"
        assert result.activity_type == "ai_quiz"

    def test_dispatch_grammar_sentence_builder(self, session: Session, seed_skill_data: dict) -> None:
        """Test dispatching grammar × sentence_builder."""
        result = dispatch("grammar", "sentence_builder", session)
        assert result.generator_key == "sentence_builder"

    def test_dispatch_reading_comprehension(self, session: Session, seed_skill_data: dict) -> None:
        """Test dispatching reading × comprehension."""
        result = dispatch("reading", "comprehension", session)
        assert result.generator_key == "reading_comprehension"
        assert result.activity_type == "reading"

    def test_dispatch_reading_mcq(self, session: Session, seed_skill_data: dict) -> None:
        """Test dispatching reading × multiple_choice."""
        result = dispatch("reading", "multiple_choice", session)
        assert result.generator_key == "ai_quiz"

    def test_invalid_skill_returns_422(self, session: Session, seed_skill_data: dict) -> None:
        """Test that an unknown skill slug returns 422."""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            dispatch("nonexistent_skill", "multiple_choice", session)
        assert exc_info.value.status_code == 422

    def test_invalid_format_returns_422(self, session: Session, seed_skill_data: dict) -> None:
        """Test that an unknown format slug returns 422."""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            dispatch("vocabulary", "nonexistent_format", session)
        assert exc_info.value.status_code == 422

    def test_inactive_skill_returns_422(self, session: Session, seed_skill_data: dict) -> None:
        """Test that an inactive skill (Speaking) returns 422."""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            dispatch("speaking", "multiple_choice", session)
        assert exc_info.value.status_code == 422

    def test_dispatch_listening_mcq(self, session: Session, seed_skill_data: dict) -> None:
        """Test dispatching listening × multiple_choice (Story 30.4)."""
        result = dispatch("listening", "multiple_choice", session)
        assert result.generator_key == "listening_quiz"
        assert result.activity_type == "listening_quiz"

    def test_dispatch_grammar_fill_blank(self, session: Session, seed_skill_data: dict) -> None:
        """Test dispatching grammar × fill_blank (Story 30.6)."""
        result = dispatch("grammar", "fill_blank", session)
        assert result.generator_key == "grammar_fill_blank"
        assert result.activity_type == "grammar_fill_blank"

    def test_dispatch_listening_fill_blank(self, session: Session, seed_skill_data: dict) -> None:
        """Test dispatching listening × fill_blank (Story 30.5)."""
        result = dispatch("listening", "fill_blank", session)
        assert result.generator_key == "listening_fill_blank"
        assert result.activity_type == "listening_fill_blank"

    def test_dispatch_writing_sentence_builder(self, session: Session, seed_skill_data: dict) -> None:
        """Test dispatching writing × sentence_builder (Story 30.7)."""
        result = dispatch("writing", "sentence_builder", session)
        assert result.generator_key == "writing_sentence_builder"
        assert result.activity_type == "writing_sentence_builder"

    def test_dispatch_writing_fill_blank(self, session: Session, seed_skill_data: dict) -> None:
        """Test dispatching writing × fill_blank (Story 30.7)."""
        result = dispatch("writing", "fill_blank", session)
        assert result.generator_key == "writing_fill_blank"
        assert result.activity_type == "writing_fill_blank"

    def test_vocab_matching_returns_501(self, session: Session, seed_skill_data: dict) -> None:
        """Test that vocabulary × matching returns 501 (not yet implemented)."""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            dispatch("vocabulary", "matching", session)
        assert exc_info.value.status_code == 501

    def test_invalid_combination_returns_422(self, session: Session, seed_skill_data: dict) -> None:
        """Test that a valid skill+format but invalid combination returns 422."""
        from fastapi import HTTPException
        # vocabulary × comprehension is not a valid combination
        with pytest.raises(HTTPException) as exc_info:
            dispatch("vocabulary", "comprehension", session)
        assert exc_info.value.status_code == 422


# ---------------------------------------------------------------------------
# Generator Map Tests
# ---------------------------------------------------------------------------


class TestGeneratorMap:
    """Test the static GENERATOR_MAP configuration."""

    def test_all_implemented_keys_are_valid(self) -> None:
        """Test that all generator keys in the map are valid identifiers."""
        valid_keys = {
            "vocabulary_quiz", "word_builder", "ai_quiz",
            "grammar_quiz", "sentence_builder", "reading_comprehension",
            "listening_quiz",
            "listening_fill_blank",
            "grammar_fill_blank",
            "writing_sentence_builder",
            "writing_fill_blank",
            None,  # stub
        }
        for (skill, fmt), (gen_key, act_type) in GENERATOR_MAP.items():
            assert gen_key in valid_keys, f"Invalid generator key: {gen_key} for ({skill}, {fmt})"
            assert isinstance(act_type, str)

    def test_implemented_combo_count(self) -> None:
        """Test that we have the expected number of implemented combos."""
        implemented = sum(1 for k, (gen, _) in GENERATOR_MAP.items() if gen is not None)
        # vocabulary×mcq, vocabulary×word_builder, grammar×mcq, grammar×sentence_builder,
        # grammar×fill_blank, reading×comprehension, reading×mcq,
        # writing×sentence_builder, writing×fill_blank,
        # listening×mcq, listening×fill_blank = 11
        assert implemented == 11

    def test_stub_combo_count(self) -> None:
        """Test that we have the expected number of stub combos."""
        stubs = sum(1 for k, (gen, _) in GENERATOR_MAP.items() if gen is None)
        # vocabulary×matching = 1
        assert stubs == 1


# ---------------------------------------------------------------------------
# GenerationResponseV2 Schema Tests
# ---------------------------------------------------------------------------


class TestGenerationResponseV2:
    """Test GenerationResponseV2 schema."""

    def test_response_includes_skill_metadata(self) -> None:
        """Test that response includes all required skill metadata."""
        from datetime import datetime, timezone

        resp = GenerationResponseV2(
            content_id="test-123",
            activity_type="vocabulary_quiz",
            content={"questions": []},
            skill_id=uuid.uuid4(),
            skill_slug="vocabulary",
            skill_name="Vocabulary",
            format_id=uuid.uuid4(),
            format_slug="multiple_choice",
            format_name="Quiz (MCQ)",
            source_type="book_module",
            book_id=1,
            difficulty="medium",
            item_count=10,
            created_at=datetime.now(timezone.utc),
        )

        assert resp.skill_slug == "vocabulary"
        assert resp.format_slug == "multiple_choice"
        assert resp.item_count == 10


# ---------------------------------------------------------------------------
# Grammar Prompt Tests
# ---------------------------------------------------------------------------


class TestGrammarPrompt:
    """Test grammar-focused prompt generation."""

    def test_build_grammar_prompt(self) -> None:
        """Test that grammar prompt builds correctly."""
        from app.services.ai_generation.prompts.grammar_prompts import build_grammar_prompt

        prompt = build_grammar_prompt(
            question_count=5,
            difficulty="medium",
            language="English",
            topics=["Education", "Daily routines"],
            vocabulary=["school", "homework", "teacher"],
            module_title="Unit 1: School Life",
            cefr_level="A2",
        )

        assert "5" in prompt
        assert "grammar" in prompt.lower()
        assert "Education" in prompt
        assert "A2" in prompt

    def test_grammar_system_prompt_content(self) -> None:
        """Test that grammar system prompt focuses on grammar."""
        from app.services.ai_generation.prompts.grammar_prompts import GRAMMAR_SYSTEM_PROMPT

        assert "grammar" in GRAMMAR_SYSTEM_PROMPT.lower()
        assert "tense" in GRAMMAR_SYSTEM_PROMPT.lower()
        assert "Error correction" in GRAMMAR_SYSTEM_PROMPT

    def test_grammar_json_schema_has_grammar_topic(self) -> None:
        """Test that grammar JSON schema includes grammar_topic field."""
        from app.services.ai_generation.prompts.grammar_prompts import GRAMMAR_JSON_SCHEMA

        question_props = GRAMMAR_JSON_SCHEMA["properties"]["questions"]["items"]["properties"]
        assert "grammar_topic" in question_props


# ---------------------------------------------------------------------------
# Content Library Skill Fields Tests
# ---------------------------------------------------------------------------


class TestContentLibrarySkillFields:
    """Test content library with skill classification."""

    def test_save_to_library_request_with_skill_ids(self) -> None:
        """Test SaveToLibraryRequest accepts skill_id and format_id."""
        from app.schemas.ai_quiz import SaveToLibraryRequest

        req = SaveToLibraryRequest(
            quiz_id="test-quiz-123",
            activity_type="ai_quiz",
            title="Grammar Quiz - Present Tense",
            skill_id=uuid.uuid4(),
            format_id=uuid.uuid4(),
        )
        assert req.skill_id is not None
        assert req.format_id is not None

    def test_save_to_library_request_without_skill_ids(self) -> None:
        """Test SaveToLibraryRequest works without skill_id (backward compat)."""
        from app.schemas.ai_quiz import SaveToLibraryRequest

        req = SaveToLibraryRequest(
            quiz_id="test-quiz-456",
            activity_type="vocabulary_quiz",
            title="Vocab Quiz",
        )
        assert req.skill_id is None
        assert req.format_id is None

    def test_content_item_public_with_skill_data(self) -> None:
        """Test ContentItemPublic includes skill fields."""
        from datetime import datetime, timezone
        from app.schemas.content_library import ContentItemPublic, ContentCreator

        item = ContentItemPublic(
            id=uuid.uuid4(),
            activity_type="ai_quiz",
            title="Grammar Quiz",
            source_type="book",
            book_id=1,
            book_title="English Book",
            item_count=10,
            created_at=datetime.now(timezone.utc),
            used_in_assignments=0,
            is_shared=True,
            created_by=ContentCreator(id=uuid.uuid4(), name="Teacher"),
            skill_id=uuid.uuid4(),
            skill_name="Grammar",
            format_id=uuid.uuid4(),
            format_name="Quiz (MCQ)",
        )
        assert item.skill_name == "Grammar"
        assert item.format_name == "Quiz (MCQ)"

    def test_content_item_public_null_skill_data(self) -> None:
        """Test ContentItemPublic works with null skill data (old content)."""
        from datetime import datetime, timezone
        from app.schemas.content_library import ContentItemPublic, ContentCreator

        item = ContentItemPublic(
            id=uuid.uuid4(),
            activity_type="vocabulary_quiz",
            title="Old Vocab Quiz",
            source_type="book",
            book_id=1,
            book_title="Old Book",
            item_count=5,
            created_at=datetime.now(timezone.utc),
            used_in_assignments=0,
            is_shared=True,
            created_by=ContentCreator(id=uuid.uuid4(), name="Teacher"),
        )
        assert item.skill_id is None
        assert item.skill_name is None
