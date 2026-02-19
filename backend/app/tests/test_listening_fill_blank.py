"""Tests for Listening Fill-in-the-Blank Generator (Story 30.5)."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.schemas.listening_fill_blank import (
    ListeningFillBlankActivity,
    ListeningFillBlankActivityPublic,
    ListeningFillBlankItem,
    ListeningFillBlankItemPublic,
    ListeningFillBlankRequest,
)


# ---------------------------------------------------------------------------
# Schema Tests
# ---------------------------------------------------------------------------


class TestListeningFillBlankRequestSchema:
    """Test request validation."""

    def test_valid_request(self) -> None:
        req = ListeningFillBlankRequest(
            book_id=1, module_ids=[10], item_count=10, difficulty="medium",
        )
        assert req.item_count == 10
        assert req.typo_tolerance is True

    def test_defaults(self) -> None:
        req = ListeningFillBlankRequest(book_id=1, module_ids=[10])
        assert req.item_count == 10
        assert req.difficulty == "auto"
        assert req.typo_tolerance is True

    def test_min_item_count(self) -> None:
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ListeningFillBlankRequest(book_id=1, module_ids=[10], item_count=2)

    def test_max_item_count(self) -> None:
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ListeningFillBlankRequest(book_id=1, module_ids=[10], item_count=25)


class TestListeningFillBlankItemSchema:
    """Test item schema."""

    def test_valid_item(self) -> None:
        item = ListeningFillBlankItem(
            item_id="i1",
            full_sentence="The cat is sleeping on the sofa.",
            display_sentence="The cat is _______ on the sofa.",
            missing_word="sleeping",
            acceptable_answers=["sleeping", "sleepin"],
            audio_url="/tts/test",
            difficulty="A1",
            word_type="verb",
        )
        assert item.missing_word == "sleeping"
        assert item.word_type == "verb"

    def test_audio_failed(self) -> None:
        item = ListeningFillBlankItem(
            item_id="i2",
            full_sentence="Test.",
            display_sentence="_______.",
            missing_word="Test",
            acceptable_answers=["Test"],
            audio_url=None,
            audio_status="failed",
            difficulty="A1",
        )
        assert item.audio_status == "failed"


class TestPublicSchema:
    """Test public schemas exclude sensitive fields."""

    def test_public_item_excludes_answer(self) -> None:
        public = ListeningFillBlankItemPublic(
            item_id="i1",
            display_sentence="The cat is _______ on the sofa.",
            audio_url="/tts/test",
            difficulty="A1",
        )
        data = public.model_dump()
        assert "full_sentence" not in data
        assert "missing_word" not in data
        assert "acceptable_answers" not in data

    def test_public_activity(self) -> None:
        public_activity = ListeningFillBlankActivityPublic(
            activity_id="act-1",
            book_id=1,
            module_ids=[10],
            items=[
                ListeningFillBlankItemPublic(
                    item_id="i1",
                    display_sentence="The ___ is red.",
                    audio_url="/tts/test",
                    difficulty="A1",
                ),
            ],
            total_items=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        data = public_activity.model_dump()
        assert "full_sentence" not in data["items"][0]
        assert "missing_word" not in data["items"][0]


# ---------------------------------------------------------------------------
# Answer Matching Tests
# ---------------------------------------------------------------------------


class TestAnswerMatching:
    """Test the flexible answer matching utility."""

    def test_exact_match(self) -> None:
        from app.lib.answer_matching import check_answer
        is_correct, match_type = check_answer("sleeping", "sleeping")
        assert is_correct is True
        assert match_type == "exact"

    def test_case_insensitive(self) -> None:
        from app.lib.answer_matching import check_answer
        is_correct, _ = check_answer("Sleeping", "sleeping")
        assert is_correct is True

    def test_whitespace_trimmed(self) -> None:
        from app.lib.answer_matching import check_answer
        is_correct, _ = check_answer("  sleeping  ", "sleeping")
        assert is_correct is True

    def test_variant_match(self) -> None:
        from app.lib.answer_matching import check_answer
        is_correct, match_type = check_answer(
            "sleepin", "sleeping", acceptable_answers=["sleepin"],
        )
        assert is_correct is True
        assert match_type == "variant"

    def test_typo_tolerance(self) -> None:
        from app.lib.answer_matching import check_answer
        is_correct, match_type = check_answer(
            "sleepng", "sleeping", typo_tolerance=True,
        )
        assert is_correct is True
        assert match_type == "typo"

    def test_typo_tolerance_disabled(self) -> None:
        from app.lib.answer_matching import check_answer
        is_correct, match_type = check_answer(
            "sleepng", "sleeping", typo_tolerance=False,
        )
        assert is_correct is False
        assert match_type == "wrong"

    def test_too_many_errors_rejected(self) -> None:
        from app.lib.answer_matching import check_answer
        is_correct, _ = check_answer("slpng", "sleeping", typo_tolerance=True)
        assert is_correct is False

    def test_empty_answer(self) -> None:
        from app.lib.answer_matching import check_answer
        is_correct, match_type = check_answer("", "sleeping")
        assert is_correct is False
        assert match_type == "wrong"

    def test_short_word_no_typo_tolerance(self) -> None:
        """Words shorter than 3 chars should not get typo tolerance."""
        from app.lib.answer_matching import check_answer
        is_correct, _ = check_answer("at", "an", typo_tolerance=True)
        assert is_correct is False

    def test_levenshtein_distance(self) -> None:
        from app.lib.answer_matching import levenshtein_distance
        assert levenshtein_distance("kitten", "sitting") == 3
        assert levenshtein_distance("abc", "abc") == 0
        assert levenshtein_distance("abc", "ab") == 1


# ---------------------------------------------------------------------------
# Prompt Tests
# ---------------------------------------------------------------------------


class TestListeningFBPrompts:
    """Test prompt generation."""

    def test_build_prompt(self) -> None:
        from app.services.ai_generation.prompts.listening_fill_blank_prompts import (
            build_listening_fill_blank_prompt,
        )
        prompt = build_listening_fill_blank_prompt(
            item_count=10,
            difficulty="easy",
            language="English",
            topics=["Animals"],
            module_title="Unit 1: Pets",
            cefr_level="A1",
        )
        assert "10" in prompt
        assert "Animals" in prompt
        assert "A1" in prompt

    def test_system_prompt_content(self) -> None:
        from app.services.ai_generation.prompts.listening_fill_blank_prompts import (
            LISTENING_FB_SYSTEM_PROMPT,
        )
        assert "fill-in-the-blank" in LISTENING_FB_SYSTEM_PROMPT.lower()
        assert "NEVER remove" in LISTENING_FB_SYSTEM_PROMPT
        assert "article" in LISTENING_FB_SYSTEM_PROMPT.lower()

    def test_json_schema_has_required_fields(self) -> None:
        from app.services.ai_generation.prompts.listening_fill_blank_prompts import (
            LISTENING_FB_JSON_SCHEMA,
        )
        item_props = LISTENING_FB_JSON_SCHEMA["properties"]["items"]["items"]["properties"]
        assert "full_sentence" in item_props
        assert "display_sentence" in item_props
        assert "missing_word" in item_props
        assert "word_type" in item_props


# ---------------------------------------------------------------------------
# Service Tests (mocked)
# ---------------------------------------------------------------------------


class TestListeningFillBlankService:
    """Test the service with mocked dependencies."""

    @pytest.fixture
    def mock_dcs(self) -> AsyncMock:
        client = AsyncMock()
        module = MagicMock()
        module.text = "The cat sleeps on the sofa. The dog runs in the garden."
        module.title = "Unit 1: Pets"
        module.topics = ["Animals", "Home"]
        module.difficulty = "A1"
        module.language = "en"
        module.pages = [1, 2]
        client.get_module_detail.return_value = module
        return client

    @pytest.fixture
    def mock_llm(self) -> AsyncMock:
        manager = AsyncMock()
        manager.generate_structured.return_value = {
            "items": [
                {
                    "full_sentence": "The cat is sleeping on the sofa.",
                    "display_sentence": "The cat is _______ on the sofa.",
                    "missing_word": "sleeping",
                    "acceptable_answers": ["sleeping", "sleepin"],
                    "word_type": "verb",
                    "difficulty": "A1",
                },
                {
                    "full_sentence": "The dog runs in the garden.",
                    "display_sentence": "The dog _______ in the garden.",
                    "missing_word": "runs",
                    "acceptable_answers": ["runs"],
                    "word_type": "verb",
                    "difficulty": "A1",
                },
            ]
        }
        return manager

    @pytest.fixture
    def mock_tts(self) -> MagicMock:
        tts = MagicMock()
        tts.is_available.return_value = True
        tts.generate_audio = AsyncMock(return_value=MagicMock(audio_data=b"\xff"))
        return tts

    @pytest.mark.asyncio
    async def test_generate_returns_items(self, mock_dcs, mock_llm, mock_tts) -> None:
        from app.services.ai_generation.listening_fill_blank_service import (
            ListeningFillBlankService,
        )
        service = ListeningFillBlankService(mock_dcs, mock_llm, mock_tts)
        req = ListeningFillBlankRequest(book_id=1, module_ids=[10])
        activity = await service.generate_activity(req)

        assert isinstance(activity, ListeningFillBlankActivity)
        assert len(activity.items) == 2
        assert activity.items[0].missing_word == "sleeping"

    @pytest.mark.asyncio
    async def test_items_have_audio_urls(self, mock_dcs, mock_llm, mock_tts) -> None:
        from app.services.ai_generation.listening_fill_blank_service import (
            ListeningFillBlankService,
        )
        service = ListeningFillBlankService(mock_dcs, mock_llm, mock_tts)
        req = ListeningFillBlankRequest(book_id=1, module_ids=[10])
        activity = await service.generate_activity(req)

        for item in activity.items:
            assert item.audio_url is not None
            assert "/api/v1/ai/tts/audio" in item.audio_url

    @pytest.mark.asyncio
    async def test_tts_failure_marks_failed(self, mock_dcs, mock_llm) -> None:
        from app.services.ai_generation.listening_fill_blank_service import (
            ListeningFillBlankService,
        )
        from app.services.tts.exceptions import TTSProviderError

        tts = MagicMock()
        tts.is_available.return_value = True
        tts.generate_audio = AsyncMock(side_effect=TTSProviderError("down"))

        service = ListeningFillBlankService(mock_dcs, mock_llm, tts)
        req = ListeningFillBlankRequest(book_id=1, module_ids=[10])
        activity = await service.generate_activity(req)

        for item in activity.items:
            assert item.audio_status == "failed"

    @pytest.mark.asyncio
    async def test_module_not_found(self, mock_llm) -> None:
        from app.services.ai_generation.listening_fill_blank_service import (
            ListeningFillBlankService,
        )
        from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError

        dcs = AsyncMock()
        dcs.get_module_detail.return_value = None
        service = ListeningFillBlankService(dcs, mock_llm)
        req = ListeningFillBlankRequest(book_id=1, module_ids=[99])

        with pytest.raises(DCSAIDataNotFoundError):
            await service.generate_activity(req)

    @pytest.mark.asyncio
    async def test_acceptable_answers_includes_correct(self, mock_dcs, mock_llm, mock_tts) -> None:
        from app.services.ai_generation.listening_fill_blank_service import (
            ListeningFillBlankService,
        )
        service = ListeningFillBlankService(mock_dcs, mock_llm, mock_tts)
        req = ListeningFillBlankRequest(book_id=1, module_ids=[10])
        activity = await service.generate_activity(req)

        for item in activity.items:
            assert item.missing_word.lower() in [a.lower() for a in item.acceptable_answers]


# ---------------------------------------------------------------------------
# Storage Tests
# ---------------------------------------------------------------------------


class TestListeningFBStorage:
    """Test storage for listening fill-blank."""

    @pytest.mark.asyncio
    async def test_save_and_retrieve(self) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        activity = ListeningFillBlankActivity(
            activity_id="lfb-1",
            book_id=1,
            module_ids=[10],
            items=[
                ListeningFillBlankItem(
                    item_id="i1",
                    full_sentence="The cat sleeps.",
                    display_sentence="The ___ sleeps.",
                    missing_word="cat",
                    acceptable_answers=["cat"],
                    audio_url="/tts/test",
                    difficulty="A1",
                ),
            ],
            total_items=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        await storage.save_listening_fill_blank_activity(activity)
        retrieved = await storage.get_listening_fill_blank_activity("lfb-1")
        assert retrieved is not None
        assert retrieved.items[0].missing_word == "cat"

    @pytest.mark.asyncio
    async def test_public_excludes_answer(self) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        activity = ListeningFillBlankActivity(
            activity_id="lfb-pub",
            book_id=1,
            module_ids=[10],
            items=[
                ListeningFillBlankItem(
                    item_id="i1",
                    full_sentence="Secret full sentence.",
                    display_sentence="Secret ___ sentence.",
                    missing_word="full",
                    acceptable_answers=["full"],
                    difficulty="A1",
                ),
            ],
            total_items=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        await storage.save_listening_fill_blank_activity(activity)
        public = await storage.get_listening_fill_blank_activity_public("lfb-pub")
        assert public is not None
        data = public.items[0].model_dump()
        assert "full_sentence" not in data
        assert "missing_word" not in data

    @pytest.mark.asyncio
    async def test_nonexistent_returns_none(self) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        assert await storage.get_listening_fill_blank_activity("nope") is None
