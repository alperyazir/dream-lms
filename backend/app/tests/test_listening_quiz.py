"""Tests for Listening Quiz Generator (Story 30.4)."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.listening_quiz import (
    ListeningQuizActivity,
    ListeningQuizActivityPublic,
    ListeningQuizQuestion,
    ListeningQuizQuestionPublic,
    ListeningQuizRequest,
)


# ---------------------------------------------------------------------------
# Schema Tests
# ---------------------------------------------------------------------------


class TestListeningQuizRequestSchema:
    """Test ListeningQuizRequest validation."""

    def test_valid_request(self) -> None:
        req = ListeningQuizRequest(
            book_id=1, module_ids=[10, 11], question_count=10, difficulty="medium",
        )
        assert req.question_count == 10
        assert req.difficulty == "medium"

    def test_default_values(self) -> None:
        req = ListeningQuizRequest(book_id=1, module_ids=[10])
        assert req.question_count == 10
        assert req.difficulty == "auto"
        assert req.language is None

    def test_min_question_count(self) -> None:
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ListeningQuizRequest(book_id=1, module_ids=[10], question_count=2)

    def test_max_question_count(self) -> None:
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ListeningQuizRequest(book_id=1, module_ids=[10], question_count=25)

    def test_module_ids_required(self) -> None:
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ListeningQuizRequest(book_id=1, module_ids=[])


class TestListeningQuizQuestionSchema:
    """Test ListeningQuizQuestion validation."""

    def test_valid_question(self) -> None:
        q = ListeningQuizQuestion(
            question_id="q1",
            audio_text="The train departs at 3:45.",
            audio_url="/api/v1/ai/tts/audio?text=test&lang=en",
            audio_status="ready",
            question_text="What time does the train depart?",
            options=["2:45", "3:45", "4:45", "3:15"],
            correct_answer="3:45",
            correct_index=1,
            explanation="The speaker says 3:45.",
            sub_skill="detail",
            difficulty="A2",
        )
        assert q.sub_skill == "detail"
        assert q.correct_index == 1

    def test_audio_failed_status(self) -> None:
        q = ListeningQuizQuestion(
            question_id="q2",
            audio_text="Some text",
            audio_url=None,
            audio_status="failed",
            question_text="Question?",
            options=["A", "B", "C", "D"],
            correct_answer="A",
            correct_index=0,
            sub_skill="gist",
            difficulty="A1",
        )
        assert q.audio_status == "failed"
        assert q.audio_url is None


class TestListeningQuizPublicSchema:
    """Test that public schemas exclude sensitive fields."""

    def test_public_question_has_no_audio_text(self) -> None:
        """audio_text should NOT be present in the public schema."""
        public_q = ListeningQuizQuestionPublic(
            question_id="q1",
            audio_url="/api/v1/ai/tts/audio?text=test&lang=en",
            audio_status="ready",
            question_text="What time?",
            options=["A", "B", "C", "D"],
            sub_skill="detail",
            difficulty="A2",
        )
        data = public_q.model_dump()
        assert "audio_text" not in data
        assert "correct_answer" not in data
        assert "correct_index" not in data

    def test_public_activity_excludes_answers(self) -> None:
        public_activity = ListeningQuizActivityPublic(
            activity_id="act-1",
            book_id=1,
            module_ids=[10],
            questions=[
                ListeningQuizQuestionPublic(
                    question_id="q1",
                    audio_url="/tts/test",
                    question_text="Q?",
                    options=["A", "B", "C", "D"],
                    sub_skill="gist",
                    difficulty="A1",
                ),
            ],
            total_questions=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        data = public_activity.model_dump()
        q_data = data["questions"][0]
        assert "audio_text" not in q_data
        assert "correct_answer" not in q_data


# ---------------------------------------------------------------------------
# Listening Quiz Activity Tests
# ---------------------------------------------------------------------------


class TestListeningQuizActivity:
    """Test ListeningQuizActivity construction."""

    def test_activity_creation(self) -> None:
        activity = ListeningQuizActivity(
            activity_id="quiz-123",
            book_id=1,
            module_ids=[10, 11],
            questions=[
                ListeningQuizQuestion(
                    question_id="q1",
                    audio_text="Hello world.",
                    audio_url="/tts/test",
                    question_text="What did you hear?",
                    options=["Hello world", "Goodbye world", "Hello there", "Hi world"],
                    correct_answer="Hello world",
                    correct_index=0,
                    explanation="Speaker says Hello world.",
                    sub_skill="gist",
                    difficulty="A1",
                ),
            ],
            total_questions=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        assert activity.total_questions == 1
        assert activity.questions[0].sub_skill == "gist"

    def test_activity_serialization_round_trip(self) -> None:
        q = ListeningQuizQuestion(
            question_id="q1",
            audio_text="The meeting is at ten thirty.",
            audio_url="/tts/audio",
            question_text="When is the meeting?",
            options=["9:30", "10:30", "11:30", "10:00"],
            correct_answer="10:30",
            correct_index=1,
            explanation="Speaker says ten thirty.",
            sub_skill="detail",
            difficulty="A2",
        )
        activity = ListeningQuizActivity(
            activity_id="act-round-trip",
            book_id=2,
            module_ids=[20],
            questions=[q],
            total_questions=1,
            difficulty="medium",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        data = activity.model_dump(mode="json")
        restored = ListeningQuizActivity.model_validate(data)
        assert restored.activity_id == "act-round-trip"
        assert restored.questions[0].correct_index == 1
        assert restored.questions[0].audio_text == "The meeting is at ten thirty."


# ---------------------------------------------------------------------------
# Prompt Tests
# ---------------------------------------------------------------------------


class TestListeningPrompts:
    """Test listening quiz prompt generation."""

    def test_build_listening_prompt(self) -> None:
        from app.services.ai_generation.prompts.listening_prompts import (
            build_listening_prompt,
        )
        prompt = build_listening_prompt(
            question_count=10,
            difficulty="medium",
            language="English",
            topics=["Travel", "Transportation"],
            module_title="Unit 5: Getting Around",
            cefr_level="A2",
            context_text="Buses and trains are common in big cities.",
        )
        assert "10" in prompt
        assert "Travel" in prompt
        assert "A2" in prompt
        assert "gist" in prompt.lower()
        assert "detail" in prompt.lower()
        assert "discrimination" in prompt.lower()

    def test_sub_skill_distribution(self) -> None:
        from app.services.ai_generation.prompts.listening_prompts import (
            build_listening_prompt,
        )
        prompt = build_listening_prompt(
            question_count=10,
            difficulty="easy",
            language="English",
            topics=["Food"],
            module_title="Module 1",
            cefr_level="A1",
        )
        # For 10 questions: detail ~5, gist ~3, discrimination ~2
        assert "approximately 5 questions" in prompt
        assert "approximately 3 questions" in prompt

    def test_listening_system_prompt_content(self) -> None:
        from app.services.ai_generation.prompts.listening_prompts import (
            LISTENING_SYSTEM_PROMPT,
        )
        assert "audio" in LISTENING_SYSTEM_PROMPT.lower()
        assert "gist" in LISTENING_SYSTEM_PROMPT.lower()
        assert "detail" in LISTENING_SYSTEM_PROMPT.lower()
        assert "discrimination" in LISTENING_SYSTEM_PROMPT.lower()

    def test_listening_json_schema_has_sub_skill(self) -> None:
        from app.services.ai_generation.prompts.listening_prompts import (
            LISTENING_JSON_SCHEMA,
        )
        q_props = LISTENING_JSON_SCHEMA["properties"]["questions"]["items"]["properties"]
        assert "sub_skill" in q_props
        assert "audio_text" in q_props
        assert "question_text" in q_props

    def test_difficulty_guidelines_exist(self) -> None:
        from app.services.ai_generation.prompts.listening_prompts import (
            LISTENING_DIFFICULTY_GUIDELINES,
        )
        assert "easy" in LISTENING_DIFFICULTY_GUIDELINES
        assert "medium" in LISTENING_DIFFICULTY_GUIDELINES
        assert "hard" in LISTENING_DIFFICULTY_GUIDELINES


# ---------------------------------------------------------------------------
# Service Tests (mocked LLM + TTS)
# ---------------------------------------------------------------------------


class TestListeningQuizService:
    """Test the ListeningQuizService with mocked dependencies."""

    @pytest.fixture
    def mock_dcs_client(self) -> AsyncMock:
        client = AsyncMock()
        module = MagicMock()
        module.text = "Buses run every 15 minutes from the central station."
        module.title = "Unit 5: Transport"
        module.topics = ["Transportation", "Public transit"]
        module.difficulty = "A2"
        module.language = "en"
        module.pages = [45, 46]
        client.get_module_detail.return_value = module
        return client

    @pytest.fixture
    def mock_llm_manager(self) -> AsyncMock:
        manager = AsyncMock()
        manager.generate_structured.return_value = {
            "questions": [
                {
                    "audio_text": "The bus leaves at quarter past ten.",
                    "question_text": "When does the bus leave?",
                    "options": ["10:00", "10:15", "10:30", "10:45"],
                    "correct_index": 1,
                    "explanation": "Quarter past ten means 10:15.",
                    "sub_skill": "detail",
                    "difficulty": "A2",
                },
                {
                    "audio_text": "Welcome to the city tour. Today we will visit three main attractions.",
                    "question_text": "What is this announcement about?",
                    "options": ["A bus schedule", "A city tour", "A train delay", "A ticket price"],
                    "correct_index": 1,
                    "explanation": "The speaker welcomes people to a city tour.",
                    "sub_skill": "gist",
                    "difficulty": "A2",
                },
                {
                    "audio_text": "Please take a seat on the ship.",
                    "question_text": "Which word did you hear?",
                    "options": ["ship", "sheep", "shop", "shape"],
                    "correct_index": 0,
                    "explanation": "The speaker said 'ship', not 'sheep'.",
                    "sub_skill": "discrimination",
                    "difficulty": "A2",
                },
            ]
        }
        return manager

    @pytest.fixture
    def mock_tts_manager(self) -> MagicMock:
        manager = MagicMock()
        manager.is_available.return_value = True

        async def fake_generate_audio(text, options=None):
            result = MagicMock()
            result.audio_data = b"\xff\xfb\x90\x00"  # fake MP3 header
            result.format = "mp3"
            result.duration_ms = 1500
            return result

        manager.generate_audio = AsyncMock(side_effect=fake_generate_audio)
        return manager

    @pytest.mark.asyncio
    async def test_generate_activity_returns_questions(
        self, mock_dcs_client, mock_llm_manager, mock_tts_manager
    ) -> None:
        from app.services.ai_generation.listening_quiz_service import ListeningQuizService

        service = ListeningQuizService(mock_dcs_client, mock_llm_manager, mock_tts_manager)
        request = ListeningQuizRequest(book_id=1, module_ids=[10], question_count=5)
        activity = await service.generate_activity(request)

        assert isinstance(activity, ListeningQuizActivity)
        assert len(activity.questions) == 3
        assert activity.total_questions == 3
        assert activity.language == "en"

    @pytest.mark.asyncio
    async def test_questions_have_audio_urls(
        self, mock_dcs_client, mock_llm_manager, mock_tts_manager
    ) -> None:
        from app.services.ai_generation.listening_quiz_service import ListeningQuizService

        service = ListeningQuizService(mock_dcs_client, mock_llm_manager, mock_tts_manager)
        request = ListeningQuizRequest(book_id=1, module_ids=[10])
        activity = await service.generate_activity(request)

        for q in activity.questions:
            assert q.audio_url is not None
            assert q.audio_status == "ready"
            assert "/api/v1/ai/tts/audio" in q.audio_url

    @pytest.mark.asyncio
    async def test_sub_skill_distribution(
        self, mock_dcs_client, mock_llm_manager, mock_tts_manager
    ) -> None:
        from app.services.ai_generation.listening_quiz_service import ListeningQuizService

        service = ListeningQuizService(mock_dcs_client, mock_llm_manager, mock_tts_manager)
        request = ListeningQuizRequest(book_id=1, module_ids=[10])
        activity = await service.generate_activity(request)

        sub_skills = {q.sub_skill for q in activity.questions}
        assert "detail" in sub_skills
        assert "gist" in sub_skills
        assert "discrimination" in sub_skills

    @pytest.mark.asyncio
    async def test_tts_failure_marks_audio_failed(
        self, mock_dcs_client, mock_llm_manager
    ) -> None:
        from app.services.ai_generation.listening_quiz_service import ListeningQuizService
        from app.services.tts.exceptions import TTSProviderError

        tts_manager = MagicMock()
        tts_manager.is_available.return_value = True
        tts_manager.generate_audio = AsyncMock(side_effect=TTSProviderError("TTS down"))

        service = ListeningQuizService(mock_dcs_client, mock_llm_manager, tts_manager)
        request = ListeningQuizRequest(book_id=1, module_ids=[10])
        activity = await service.generate_activity(request)

        for q in activity.questions:
            assert q.audio_status == "failed"
            assert q.audio_url is None

    @pytest.mark.asyncio
    async def test_no_tts_manager_still_generates(
        self, mock_dcs_client, mock_llm_manager
    ) -> None:
        from app.services.ai_generation.listening_quiz_service import ListeningQuizService

        service = ListeningQuizService(mock_dcs_client, mock_llm_manager, tts_manager=None)
        request = ListeningQuizRequest(book_id=1, module_ids=[10])
        activity = await service.generate_activity(request)

        assert len(activity.questions) == 3
        for q in activity.questions:
            assert q.audio_url is None

    @pytest.mark.asyncio
    async def test_module_not_found_raises(self, mock_llm_manager) -> None:
        from app.services.ai_generation.listening_quiz_service import ListeningQuizService
        from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError

        dcs = AsyncMock()
        dcs.get_module_detail.return_value = None

        service = ListeningQuizService(dcs, mock_llm_manager)
        request = ListeningQuizRequest(book_id=1, module_ids=[99])

        with pytest.raises(DCSAIDataNotFoundError):
            await service.generate_activity(request)

    @pytest.mark.asyncio
    async def test_auto_difficulty_uses_module_cefr(
        self, mock_dcs_client, mock_llm_manager, mock_tts_manager
    ) -> None:
        from app.services.ai_generation.listening_quiz_service import ListeningQuizService

        service = ListeningQuizService(mock_dcs_client, mock_llm_manager, mock_tts_manager)
        request = ListeningQuizRequest(book_id=1, module_ids=[10], difficulty="auto")
        activity = await service.generate_activity(request)

        # Module difficulty is A2 → maps to "medium"
        assert activity.difficulty == "medium"


# ---------------------------------------------------------------------------
# Storage Tests
# ---------------------------------------------------------------------------


class TestListeningQuizStorage:
    """Test listening quiz storage in QuizStorageService."""

    @pytest.mark.asyncio
    async def test_save_and_retrieve(self) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        activity = ListeningQuizActivity(
            activity_id="lq-store-1",
            book_id=1,
            module_ids=[10],
            questions=[
                ListeningQuizQuestion(
                    question_id="q1",
                    audio_text="Test audio text.",
                    audio_url="/tts/test",
                    question_text="What did you hear?",
                    options=["A", "B", "C", "D"],
                    correct_answer="A",
                    correct_index=0,
                    sub_skill="gist",
                    difficulty="A1",
                ),
            ],
            total_questions=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )

        result_id = await storage.save_listening_activity(activity)
        assert result_id == "lq-store-1"

        retrieved = await storage.get_listening_activity("lq-store-1")
        assert retrieved is not None
        assert retrieved.activity_id == "lq-store-1"
        assert retrieved.questions[0].audio_text == "Test audio text."

    @pytest.mark.asyncio
    async def test_public_version_excludes_audio_text(self) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        activity = ListeningQuizActivity(
            activity_id="lq-public-1",
            book_id=1,
            module_ids=[10],
            questions=[
                ListeningQuizQuestion(
                    question_id="q1",
                    audio_text="Secret audio text not for students.",
                    audio_url="/tts/test",
                    question_text="What did you hear?",
                    options=["A", "B", "C", "D"],
                    correct_answer="A",
                    correct_index=0,
                    sub_skill="detail",
                    difficulty="A1",
                ),
            ],
            total_questions=1,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        await storage.save_listening_activity(activity)

        public = await storage.get_listening_activity_public("lq-public-1")
        assert public is not None
        q_data = public.questions[0].model_dump()
        assert "audio_text" not in q_data
        assert "correct_answer" not in q_data
        assert "correct_index" not in q_data

    @pytest.mark.asyncio
    async def test_get_nonexistent_returns_none(self) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        assert await storage.get_listening_activity("nonexistent") is None
        assert await storage.get_listening_activity_public("nonexistent") is None
