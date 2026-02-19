"""Tests for Writing Skill Generators (Story 30.7)."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import ValidationError

from app.schemas.sentence_builder import SentenceBuilderActivity
from app.schemas.writing_fill_blank import (
    WritingFillBlankActivity,
    WritingFillBlankActivityPublic,
    WritingFillBlankItem,
    WritingFillBlankItemPublic,
    WritingFillBlankRequest,
)


# ---------------------------------------------------------------------------
# Writing Fill-Blank Schema Tests
# ---------------------------------------------------------------------------


class TestWritingFillBlankSchemas:
    """Test writing fill-blank schema validation."""

    def test_valid_request_defaults(self) -> None:
        req = WritingFillBlankRequest(book_id=1, module_ids=[10])
        assert req.item_count == 10
        assert req.difficulty == "auto"
        assert req.language is None

    def test_item_count_bounds(self) -> None:
        with pytest.raises(ValidationError):
            WritingFillBlankRequest(book_id=1, module_ids=[10], item_count=4)
        with pytest.raises(ValidationError):
            WritingFillBlankRequest(book_id=1, module_ids=[10], item_count=21)

    def test_module_ids_required(self) -> None:
        with pytest.raises(ValidationError):
            WritingFillBlankRequest(book_id=1, module_ids=[])

    def test_item_with_acceptable_answers(self) -> None:
        item = WritingFillBlankItem(
            item_id="i1",
            context="Describing your weekend plans.",
            sentence="The park was _______ in the morning.",
            correct_answer="beautiful",
            acceptable_answers=["beautiful", "wonderful", "amazing", "lovely"],
            difficulty="A2",
        )
        assert item.correct_answer == "beautiful"
        assert len(item.acceptable_answers) == 4
        assert "beautiful" in item.acceptable_answers

    def test_public_item_excludes_answers(self) -> None:
        public = WritingFillBlankItemPublic(
            item_id="i1",
            context="Describing your weekend plans.",
            sentence="The park was _______ in the morning.",
            difficulty="A2",
        )
        assert not hasattr(public, "correct_answer") or "correct_answer" not in public.model_fields
        assert not hasattr(public, "acceptable_answers") or "acceptable_answers" not in public.model_fields

    def test_activity_schema(self) -> None:
        activity = WritingFillBlankActivity(
            activity_id="act-1",
            book_id=1,
            module_ids=[10],
            items=[
                WritingFillBlankItem(
                    item_id="i1",
                    context="Writing a letter to a friend.",
                    sentence="I had a _______ time at the beach.",
                    correct_answer="great",
                    acceptable_answers=["great", "wonderful", "fantastic", "amazing"],
                    difficulty="A2",
                ),
            ],
            total_items=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        assert activity.total_items == 1

    def test_public_activity_schema(self) -> None:
        public = WritingFillBlankActivityPublic(
            activity_id="act-1",
            book_id=1,
            module_ids=[10],
            items=[
                WritingFillBlankItemPublic(
                    item_id="i1",
                    context="Writing a letter.",
                    sentence="The weather was _______.",
                    difficulty="A2",
                ),
            ],
            total_items=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        assert len(public.items) == 1


# ---------------------------------------------------------------------------
# Writing Prompts Tests
# ---------------------------------------------------------------------------


class TestWritingPrompts:
    """Test writing prompt generation."""

    def test_writing_sb_prompt_includes_expressive(self) -> None:
        from app.services.ai_generation.prompts.writing_prompts import (
            build_writing_sentence_builder_prompt,
        )

        prompt = build_writing_sentence_builder_prompt(
            sentence_count=5,
            difficulty="medium",
            topics=["Travel"],
            module_title="Unit 3: Holidays",
            cefr_level="A2",
            context_text="Summer holidays are a time for adventure.",
        )
        assert "5" in prompt
        assert "Travel" in prompt
        assert "A2" in prompt
        assert "expressive" in prompt.lower() or "writing" in prompt.lower()

    def test_writing_fb_prompt_includes_context(self) -> None:
        from app.services.ai_generation.prompts.writing_prompts import (
            build_writing_fill_blank_prompt,
        )

        prompt = build_writing_fill_blank_prompt(
            item_count=10,
            difficulty="easy",
            language="en",
            topics=["Food"],
            module_title="Unit 2: My Favorite Food",
            cefr_level="A1",
            context_text="Students describe their favorite meals.",
        )
        assert "10" in prompt
        assert "context" in prompt.lower()
        assert "acceptable_answers" in prompt

    def test_sb_system_prompt_writing_focus(self) -> None:
        from app.services.ai_generation.prompts.writing_prompts import (
            WRITING_SB_SYSTEM_PROMPT,
        )
        assert "expressive" in WRITING_SB_SYSTEM_PROMPT.lower() or "writing" in WRITING_SB_SYSTEM_PROMPT.lower()
        assert "grammar" in WRITING_SB_SYSTEM_PROMPT.lower()  # distinguishes from grammar

    def test_fb_system_prompt_multiple_answers(self) -> None:
        from app.services.ai_generation.prompts.writing_prompts import (
            WRITING_FB_SYSTEM_PROMPT,
        )
        assert "multiple" in WRITING_FB_SYSTEM_PROMPT.lower()
        assert "word choice" in WRITING_FB_SYSTEM_PROMPT.lower()

    def test_fb_json_schema_has_context(self) -> None:
        from app.services.ai_generation.prompts.writing_prompts import (
            WRITING_FB_JSON_SCHEMA,
        )
        item_props = WRITING_FB_JSON_SCHEMA["properties"]["items"]["items"]["properties"]
        assert "context" in item_props
        assert "acceptable_answers" in item_props
        assert "correct_answer" in item_props

    def test_sb_json_schema_has_context(self) -> None:
        from app.services.ai_generation.prompts.writing_prompts import (
            WRITING_SB_JSON_SCHEMA,
        )
        item_props = WRITING_SB_JSON_SCHEMA["properties"]["sentences"]["items"]["properties"]
        assert "sentence" in item_props
        assert "context" in item_props


# ---------------------------------------------------------------------------
# Writing Sentence Builder Service Tests
# ---------------------------------------------------------------------------


class TestWritingSentenceBuilderService:
    """Test writing sentence builder service."""

    @pytest.fixture
    def mock_dcs_client(self) -> MagicMock:
        client = MagicMock()
        module_mock = MagicMock()
        module_mock.text = "Summer holidays are a time for adventure. People travel to new places."
        module_mock.title = "Unit 3: Holidays"
        module_mock.topics = ["Travel", "Holidays"]
        module_mock.language = "en"
        module_mock.difficulty = "A2"
        client.get_module_detail = AsyncMock(return_value=module_mock)
        return client

    @pytest.fixture
    def mock_llm_manager(self) -> MagicMock:
        manager = MagicMock()
        manager.generate_structured = AsyncMock(return_value={
            "sentences": [
                {
                    "sentence": "I love visiting beautiful places during summer.",
                    "context": "Describing your favorite travel experience.",
                },
                {
                    "sentence": "The mountains looked amazing at sunset.",
                    "context": "Writing about nature.",
                },
            ]
        })
        return manager

    @pytest.mark.asyncio
    async def test_generate_returns_activity(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.writing_sentence_builder_service import (
            WritingSentenceBuilderService,
        )

        service = WritingSentenceBuilderService(mock_dcs_client, mock_llm_manager)
        activity = await service.generate_activity(
            book_id=1, module_ids=[10], sentence_count=5,
        )
        assert isinstance(activity, SentenceBuilderActivity)
        assert len(activity.sentences) == 2
        assert activity.sentences[0].word_count > 0

    @pytest.mark.asyncio
    async def test_words_are_shuffled(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.writing_sentence_builder_service import (
            WritingSentenceBuilderService,
        )

        service = WritingSentenceBuilderService(mock_dcs_client, mock_llm_manager)
        activity = await service.generate_activity(
            book_id=1, module_ids=[10], sentence_count=5,
        )
        for item in activity.sentences:
            correct_words = item.correct_sentence.split()
            assert sorted(item.words) == sorted(correct_words)

    @pytest.mark.asyncio
    async def test_empty_module_text_raises(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.writing_sentence_builder_service import (
            WritingSentenceBuilderError,
            WritingSentenceBuilderService,
        )

        module_mock = MagicMock()
        module_mock.text = ""
        module_mock.title = "Empty"
        module_mock.topics = None
        module_mock.language = None
        module_mock.difficulty = None
        mock_dcs_client.get_module_detail = AsyncMock(return_value=module_mock)

        service = WritingSentenceBuilderService(mock_dcs_client, mock_llm_manager)
        with pytest.raises(WritingSentenceBuilderError, match="no text content"):
            await service.generate_activity(book_id=1, module_ids=[10])


# ---------------------------------------------------------------------------
# Writing Fill-Blank Service Tests
# ---------------------------------------------------------------------------


class TestWritingFillBlankService:
    """Test writing fill-blank service."""

    @pytest.fixture
    def mock_dcs_client(self) -> MagicMock:
        client = MagicMock()
        module_mock = MagicMock()
        module_mock.text = "The weather was wonderful today. Students enjoyed the outdoor activities."
        module_mock.title = "Unit 4: Weather"
        module_mock.topics = ["Weather", "Seasons"]
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
                    "context": "Describing the weather to a friend.",
                    "sentence": "The sunset was _______ yesterday evening.",
                    "correct_answer": "beautiful",
                    "acceptable_answers": ["beautiful", "amazing", "wonderful", "stunning"],
                    "difficulty": "A2",
                },
                {
                    "context": "Writing about your weekend.",
                    "sentence": "We had a _______ time at the park.",
                    "correct_answer": "great",
                    "acceptable_answers": ["great", "wonderful", "fantastic"],
                    "difficulty": "A2",
                },
            ]
        })
        return manager

    @pytest.mark.asyncio
    async def test_generate_returns_items(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.writing_fill_blank_service import (
            WritingFillBlankService,
        )

        service = WritingFillBlankService(mock_dcs_client, mock_llm_manager)
        request = WritingFillBlankRequest(book_id=1, module_ids=[10])
        activity = await service.generate_activity(request)

        assert isinstance(activity, WritingFillBlankActivity)
        assert len(activity.items) == 2
        assert activity.items[0].context != ""

    @pytest.mark.asyncio
    async def test_multiple_acceptable_answers(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.writing_fill_blank_service import (
            WritingFillBlankService,
        )

        service = WritingFillBlankService(mock_dcs_client, mock_llm_manager)
        request = WritingFillBlankRequest(book_id=1, module_ids=[10])
        activity = await service.generate_activity(request)

        for item in activity.items:
            assert len(item.acceptable_answers) >= 2
            assert item.correct_answer in item.acceptable_answers

    @pytest.mark.asyncio
    async def test_correct_answer_in_acceptable(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        """Even if LLM doesn't include correct_answer in acceptable_answers, service adds it."""
        mock_llm_manager.generate_structured = AsyncMock(return_value={
            "items": [{
                "context": "Writing a postcard.",
                "sentence": "The hotel was _______.",
                "correct_answer": "lovely",
                "acceptable_answers": ["nice", "great"],  # "lovely" not included
                "difficulty": "A2",
            }]
        })
        from app.services.ai_generation.writing_fill_blank_service import (
            WritingFillBlankService,
        )

        service = WritingFillBlankService(mock_dcs_client, mock_llm_manager)
        request = WritingFillBlankRequest(book_id=1, module_ids=[10])
        activity = await service.generate_activity(request)
        assert "lovely" in activity.items[0].acceptable_answers

    @pytest.mark.asyncio
    async def test_empty_module_raises(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.writing_fill_blank_service import (
            WritingFillBlankError,
            WritingFillBlankService,
        )

        module_mock = MagicMock()
        module_mock.text = "   "
        module_mock.title = "Empty"
        module_mock.topics = None
        module_mock.language = None
        module_mock.difficulty = None
        mock_dcs_client.get_module_detail = AsyncMock(return_value=module_mock)

        service = WritingFillBlankService(mock_dcs_client, mock_llm_manager)
        request = WritingFillBlankRequest(book_id=1, module_ids=[10])
        with pytest.raises(WritingFillBlankError, match="no text content"):
            await service.generate_activity(request)


# ---------------------------------------------------------------------------
# Storage Tests
# ---------------------------------------------------------------------------


class TestWritingFillBlankStorage:
    """Test writing fill-blank storage."""

    @pytest.fixture
    def sample_activity(self) -> WritingFillBlankActivity:
        return WritingFillBlankActivity(
            activity_id="wfb-test-001",
            book_id=1,
            module_ids=[10],
            items=[
                WritingFillBlankItem(
                    item_id="i1",
                    context="Describing a vacation.",
                    sentence="The beach was _______.",
                    correct_answer="beautiful",
                    acceptable_answers=["beautiful", "wonderful", "amazing"],
                    difficulty="A2",
                ),
            ],
            total_items=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )

    @pytest.mark.asyncio
    async def test_save_and_get(self, sample_activity: WritingFillBlankActivity) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        await storage.save_writing_fill_blank_activity(sample_activity)
        result = await storage.get_writing_fill_blank_activity("wfb-test-001")
        assert result is not None
        assert result.items[0].correct_answer == "beautiful"

    @pytest.mark.asyncio
    async def test_get_public_excludes_answers(
        self, sample_activity: WritingFillBlankActivity
    ) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        await storage.save_writing_fill_blank_activity(sample_activity)
        public = await storage.get_writing_fill_blank_activity_public("wfb-test-001")
        assert public is not None
        assert isinstance(public, WritingFillBlankActivityPublic)
        assert not hasattr(public.items[0], "correct_answer") or "correct_answer" not in public.items[0].model_fields

    @pytest.mark.asyncio
    async def test_nonexistent_returns_none(self) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        result = await storage.get_writing_fill_blank_activity("nonexistent")
        assert result is None
