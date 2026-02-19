"""Tests for Grammar Fill-in-the-Blank (Story 30.6)."""

import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.grammar_fill_blank import (
    GRAMMAR_TOPICS,
    GrammarFBDifficulty,
    GrammarFBMode,
    GrammarFillBlankActivity,
    GrammarFillBlankActivityPublic,
    GrammarFillBlankItem,
    GrammarFillBlankItemPublic,
    GrammarFillBlankRequest,
)


# ---------------------------------------------------------------------------
# Schema Tests
# ---------------------------------------------------------------------------


class TestGrammarFillBlankSchemas:
    """Test grammar fill-blank schema validation."""

    def test_valid_request_defaults(self) -> None:
        req = GrammarFillBlankRequest(book_id=1, module_ids=[10])
        assert req.item_count == 10
        assert req.difficulty == "auto"
        assert req.mode == "word_bank"
        assert req.include_hints is True
        assert req.language is None

    def test_valid_request_free_type(self) -> None:
        req = GrammarFillBlankRequest(
            book_id=1, module_ids=[10], mode="free_type", include_hints=False,
        )
        assert req.mode == "free_type"
        assert req.include_hints is False

    def test_item_count_bounds(self) -> None:
        with pytest.raises(ValidationError):
            GrammarFillBlankRequest(book_id=1, module_ids=[10], item_count=4)
        with pytest.raises(ValidationError):
            GrammarFillBlankRequest(book_id=1, module_ids=[10], item_count=21)

    def test_module_ids_required(self) -> None:
        with pytest.raises(ValidationError):
            GrammarFillBlankRequest(book_id=1, module_ids=[])

    def test_item_with_word_bank(self) -> None:
        item = GrammarFillBlankItem(
            item_id="i1",
            sentence="She _______ to school every day.",
            correct_answer="goes",
            word_bank=["goes", "go", "going", "gone"],
            grammar_topic="present_simple",
            grammar_hint="Use 3rd person singular form.",
            difficulty="A1",
        )
        assert item.correct_answer == "goes"
        assert len(item.word_bank) == 4

    def test_item_without_word_bank(self) -> None:
        item = GrammarFillBlankItem(
            item_id="i2",
            sentence="They _______ a movie last night.",
            correct_answer="watched",
            word_bank=None,
            grammar_topic="past_simple",
            difficulty="A2",
        )
        assert item.word_bank is None
        assert item.grammar_hint is None

    def test_public_item_excludes_correct_answer(self) -> None:
        public = GrammarFillBlankItemPublic(
            item_id="i1",
            sentence="She _______ to school.",
            word_bank=["goes", "go", "going", "gone"],
            grammar_topic="present_simple",
            difficulty="A1",
        )
        assert not hasattr(public, "correct_answer") or "correct_answer" not in public.model_fields

    def test_activity_schema(self) -> None:
        activity = GrammarFillBlankActivity(
            activity_id="act-1",
            book_id=1,
            module_ids=[10],
            mode="word_bank",
            items=[
                GrammarFillBlankItem(
                    item_id="i1",
                    sentence="She _______ to school.",
                    correct_answer="goes",
                    word_bank=["goes", "go", "going", "gone"],
                    grammar_topic="present_simple",
                    difficulty="A1",
                ),
            ],
            total_items=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        assert activity.total_items == 1
        assert activity.mode == "word_bank"

    def test_public_activity_schema(self) -> None:
        public_activity = GrammarFillBlankActivityPublic(
            activity_id="act-1",
            book_id=1,
            module_ids=[10],
            mode="word_bank",
            items=[
                GrammarFillBlankItemPublic(
                    item_id="i1",
                    sentence="She _______ to school.",
                    word_bank=["goes", "go", "going", "gone"],
                    grammar_topic="present_simple",
                    difficulty="A1",
                ),
            ],
            total_items=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        assert len(public_activity.items) == 1


# ---------------------------------------------------------------------------
# Grammar Topics Tests
# ---------------------------------------------------------------------------


class TestGrammarTopics:
    """Test grammar topic taxonomy."""

    def test_all_topics_are_strings(self) -> None:
        assert all(isinstance(t, str) for t in GRAMMAR_TOPICS)

    def test_expected_topics_present(self) -> None:
        expected = [
            "present_simple", "past_simple", "future_simple",
            "present_perfect", "conditionals", "passive_voice",
            "articles", "prepositions", "modals",
        ]
        for topic in expected:
            assert topic in GRAMMAR_TOPICS, f"Missing topic: {topic}"

    def test_topic_count(self) -> None:
        assert len(GRAMMAR_TOPICS) == 18

    def test_no_duplicate_topics(self) -> None:
        assert len(GRAMMAR_TOPICS) == len(set(GRAMMAR_TOPICS))


# ---------------------------------------------------------------------------
# Prompt Tests
# ---------------------------------------------------------------------------


class TestGrammarFillBlankPrompts:
    """Test grammar fill-blank prompt generation."""

    def test_build_prompt_word_bank(self) -> None:
        from app.services.ai_generation.prompts.grammar_fill_blank_prompts import (
            build_grammar_fill_blank_prompt,
        )

        prompt = build_grammar_fill_blank_prompt(
            item_count=10,
            difficulty="easy",
            language="en",
            topics=["Daily Routines"],
            module_title="Unit 1: Morning Activities",
            cefr_level="A1",
            mode="word_bank",
            include_hints=True,
            context_text="Every morning, the students go to school. They walk together.",
        )
        assert "10" in prompt
        assert "word_bank" in prompt.lower() or "word bank" in prompt.lower()
        assert "A1" in prompt
        assert "Daily Routines" in prompt

    def test_build_prompt_free_type(self) -> None:
        from app.services.ai_generation.prompts.grammar_fill_blank_prompts import (
            build_grammar_fill_blank_prompt,
        )

        prompt = build_grammar_fill_blank_prompt(
            item_count=5,
            difficulty="hard",
            language="en",
            topics=["Science"],
            module_title="Unit 5: Biology",
            cefr_level="B1",
            mode="free_type",
            include_hints=False,
        )
        assert "free_type" in prompt
        assert "null" in prompt.lower() or "NOT" in prompt

    def test_system_prompt_grammar_topics(self) -> None:
        from app.services.ai_generation.prompts.grammar_fill_blank_prompts import (
            GRAMMAR_FB_SYSTEM_PROMPT,
        )

        assert "grammar" in GRAMMAR_FB_SYSTEM_PROMPT.lower()
        assert "A1" in GRAMMAR_FB_SYSTEM_PROMPT
        assert "B1" in GRAMMAR_FB_SYSTEM_PROMPT

    def test_json_schema_has_required_fields(self) -> None:
        from app.services.ai_generation.prompts.grammar_fill_blank_prompts import (
            GRAMMAR_FB_JSON_SCHEMA,
        )

        item_props = GRAMMAR_FB_JSON_SCHEMA["properties"]["items"]["items"]["properties"]
        assert "sentence" in item_props
        assert "correct_answer" in item_props
        assert "grammar_topic" in item_props
        assert "word_bank" in item_props
        assert "difficulty" in item_props


# ---------------------------------------------------------------------------
# Service Tests
# ---------------------------------------------------------------------------


class TestGrammarFillBlankService:
    """Test grammar fill-blank generation service."""

    @pytest.fixture
    def mock_dcs_client(self) -> MagicMock:
        client = MagicMock()
        module_mock = MagicMock()
        module_mock.text = "The students go to school every day. They have been studying hard."
        module_mock.title = "Unit 1: School Life"
        module_mock.topics = ["Education", "Daily Routines"]
        module_mock.language = "en"
        module_mock.difficulty = "A2"
        client.get_module_detail = AsyncMock(return_value=module_mock)
        return client

    @pytest.fixture
    def mock_llm_manager(self) -> MagicMock:
        manager = MagicMock()
        manager.generate_structured = AsyncMock(return_value={
            "items": [
                {
                    "sentence": "She _______ to school every day.",
                    "correct_answer": "goes",
                    "word_bank": ["goes", "go", "going", "gone"],
                    "grammar_topic": "present_simple",
                    "grammar_hint": "Use 3rd person singular.",
                    "difficulty": "A1",
                },
                {
                    "sentence": "They _______ a movie last night.",
                    "correct_answer": "watched",
                    "word_bank": ["watched", "watch", "watching", "watches"],
                    "grammar_topic": "past_simple",
                    "grammar_hint": "Use the past tense.",
                    "difficulty": "A2",
                },
            ]
        })
        return manager

    @pytest.mark.asyncio
    async def test_generate_activity_word_bank(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.grammar_fill_blank_service import (
            GrammarFillBlankService,
        )

        service = GrammarFillBlankService(mock_dcs_client, mock_llm_manager)
        request = GrammarFillBlankRequest(
            book_id=1, module_ids=[10], item_count=10, mode="word_bank",
        )
        activity = await service.generate_activity(request)

        assert isinstance(activity, GrammarFillBlankActivity)
        assert activity.mode == "word_bank"
        assert len(activity.items) == 2
        assert activity.items[0].word_bank is not None
        assert len(activity.items[0].word_bank) == 4

    @pytest.mark.asyncio
    async def test_generate_activity_free_type(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.grammar_fill_blank_service import (
            GrammarFillBlankService,
        )

        service = GrammarFillBlankService(mock_dcs_client, mock_llm_manager)
        request = GrammarFillBlankRequest(
            book_id=1, module_ids=[10], item_count=10, mode="free_type",
        )
        activity = await service.generate_activity(request)

        assert activity.mode == "free_type"
        for item in activity.items:
            assert item.word_bank is None

    @pytest.mark.asyncio
    async def test_invalid_grammar_topic_defaults(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        """Invalid grammar topics should default to present_simple."""
        from app.services.ai_generation.grammar_fill_blank_service import (
            GrammarFillBlankService,
        )

        mock_llm_manager.generate_structured = AsyncMock(return_value={
            "items": [{
                "sentence": "He _______ fast.",
                "correct_answer": "runs",
                "grammar_topic": "invalid_topic_xyz",
                "difficulty": "A1",
            }]
        })
        service = GrammarFillBlankService(mock_dcs_client, mock_llm_manager)
        request = GrammarFillBlankRequest(
            book_id=1, module_ids=[10], item_count=5, mode="free_type",
        )
        activity = await service.generate_activity(request)
        assert activity.items[0].grammar_topic == "present_simple"

    @pytest.mark.asyncio
    async def test_empty_module_text_raises_error(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.grammar_fill_blank_service import (
            GrammarFillBlankError,
            GrammarFillBlankService,
        )

        module_mock = MagicMock()
        module_mock.text = ""
        module_mock.title = "Empty"
        module_mock.topics = None
        module_mock.language = None
        module_mock.difficulty = None
        mock_dcs_client.get_module_detail = AsyncMock(return_value=module_mock)

        service = GrammarFillBlankService(mock_dcs_client, mock_llm_manager)
        request = GrammarFillBlankRequest(book_id=1, module_ids=[10])

        with pytest.raises(GrammarFillBlankError, match="no text content"):
            await service.generate_activity(request)

    @pytest.mark.asyncio
    async def test_word_bank_ensures_correct_answer(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        """Word bank should always contain the correct answer."""
        mock_llm_manager.generate_structured = AsyncMock(return_value={
            "items": [{
                "sentence": "She _______ happy.",
                "correct_answer": "is",
                "word_bank": ["am", "are", "was", "were"],  # correct 'is' not in bank
                "grammar_topic": "present_simple",
                "difficulty": "A1",
            }]
        })
        from app.services.ai_generation.grammar_fill_blank_service import (
            GrammarFillBlankService,
        )

        service = GrammarFillBlankService(mock_dcs_client, mock_llm_manager)
        request = GrammarFillBlankRequest(
            book_id=1, module_ids=[10], item_count=5, mode="word_bank",
        )
        activity = await service.generate_activity(request)
        assert "is" in activity.items[0].word_bank


# ---------------------------------------------------------------------------
# Storage Tests
# ---------------------------------------------------------------------------


class TestGrammarFillBlankStorage:
    """Test grammar fill-blank storage."""

    @pytest.fixture
    def sample_activity(self) -> GrammarFillBlankActivity:
        return GrammarFillBlankActivity(
            activity_id="gfb-test-001",
            book_id=1,
            module_ids=[10],
            mode="word_bank",
            items=[
                GrammarFillBlankItem(
                    item_id="i1",
                    sentence="She _______ to school.",
                    correct_answer="goes",
                    word_bank=["goes", "go", "going", "gone"],
                    grammar_topic="present_simple",
                    grammar_hint="Third person singular.",
                    difficulty="A1",
                ),
            ],
            total_items=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )

    @pytest.mark.asyncio
    async def test_save_and_get(self, sample_activity: GrammarFillBlankActivity) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        await storage.save_grammar_fill_blank_activity(sample_activity)
        result = await storage.get_grammar_fill_blank_activity("gfb-test-001")
        assert result is not None
        assert result.activity_id == "gfb-test-001"
        assert result.items[0].correct_answer == "goes"

    @pytest.mark.asyncio
    async def test_get_public_excludes_answers(
        self, sample_activity: GrammarFillBlankActivity
    ) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        await storage.save_grammar_fill_blank_activity(sample_activity)
        public = await storage.get_grammar_fill_blank_activity_public("gfb-test-001")
        assert public is not None
        assert isinstance(public, GrammarFillBlankActivityPublic)
        assert public.items[0].sentence == "She _______ to school."
        assert not hasattr(public.items[0], "correct_answer") or "correct_answer" not in public.items[0].model_fields

    @pytest.mark.asyncio
    async def test_get_nonexistent_returns_none(self) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        result = await storage.get_grammar_fill_blank_activity("nonexistent")
        assert result is None
