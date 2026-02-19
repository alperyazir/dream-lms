"""Tests for Mix Mode Generation (Story 30.8)."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.mix_mode import (
    ContentAnalysisResult,
    MixModeActivity,
    MixModeActivityPublic,
    MixModeQuestion,
    SkillAllocation,
)


# ---------------------------------------------------------------------------
# Schema Tests
# ---------------------------------------------------------------------------


class TestMixModeSchemas:
    """Test mix mode schema validation."""

    def test_skill_allocation_defaults(self) -> None:
        alloc = SkillAllocation(skill_slug="vocabulary", format_slug="multiple_choice", count=3)
        assert alloc.skill_name == ""
        assert alloc.format_name == ""

    def test_mix_mode_question(self) -> None:
        q = MixModeQuestion(
            question_id="q1",
            skill_slug="vocabulary",
            format_slug="multiple_choice",
            question_data={"text": "hello", "options": ["a", "b"]},
        )
        assert q.skill_slug == "vocabulary"
        assert q.question_data["text"] == "hello"

    def test_mix_mode_activity(self) -> None:
        activity = MixModeActivity(
            activity_id="mix-1",
            book_id=1,
            module_ids=[10],
            skill_distribution={"vocabulary": {"count": 3, "format": "multiple_choice"}},
            questions=[
                MixModeQuestion(
                    question_id="q1", skill_slug="vocabulary",
                    format_slug="multiple_choice", question_data={},
                ),
            ],
            total_questions=1,
            skills_covered=1,
            difficulty="medium",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        assert activity.is_mix_mode is True
        assert activity.total_questions == 1

    def test_public_activity_schema(self) -> None:
        public = MixModeActivityPublic(
            activity_id="mix-1",
            book_id=1,
            module_ids=[10],
            skill_distribution={"vocabulary": {"count": 2, "format": "mcq"}},
            questions=[],
            total_questions=0,
            skills_covered=0,
            difficulty="easy",
            language="en",
            created_at=datetime.now(timezone.utc),
        )
        assert public.is_mix_mode is True

    def test_content_analysis_defaults(self) -> None:
        result = ContentAnalysisResult()
        assert result.vocabulary_weight == 1.0
        assert result.grammar_weight == 1.0
        assert result.reading_weight == 1.0
        assert result.listening_weight == 1.0
        assert result.writing_weight == 1.0


# ---------------------------------------------------------------------------
# Content Analysis Tests
# ---------------------------------------------------------------------------


class TestContentAnalysis:
    """Test content analysis heuristics."""

    def _get_service(self) -> "MixModeService":
        from app.services.ai_generation.mix_mode_service import MixModeService

        return MixModeService(
            dcs_client=MagicMock(),
            llm_manager=MagicMock(),
        )

    def test_vocabulary_rich_text(self) -> None:
        service = self._get_service()
        # High vocabulary density text (many unique words)
        text = " ".join(f"word{i}" for i in range(100))
        result = service._analyze_content(text)
        assert result.vocabulary_weight > 1.0

    def test_low_vocabulary_density(self) -> None:
        service = self._get_service()
        # Repetitive text (low density)
        text = " ".join(["the cat sat"] * 50)
        result = service._analyze_content(text)
        assert result.vocabulary_weight < 1.0

    def test_long_text_reading_weight(self) -> None:
        service = self._get_service()
        text = " ".join(["word"] * 250)
        result = service._analyze_content(text)
        assert result.reading_weight == 1.5

    def test_short_text_reading_weight(self) -> None:
        service = self._get_service()
        text = " ".join(["word"] * 30)
        result = service._analyze_content(text)
        assert result.reading_weight == 0.5

    def test_dialogue_listening_weight(self) -> None:
        service = self._get_service()
        text = '"Hello," said John. "How are you?" asked Mary. "Fine," replied Tom. "Great," he told her.'
        result = service._analyze_content(text)
        assert result.listening_weight == 1.5

    def test_expressive_writing_weight(self) -> None:
        service = self._get_service()
        text = "I think this is important. I believe we should explain our opinion. Describe what you feel about it."
        result = service._analyze_content(text)
        assert result.writing_weight == 1.3

    def test_grammar_always_steady(self) -> None:
        service = self._get_service()
        text = "A simple short text."
        result = service._analyze_content(text)
        assert result.grammar_weight == 1.0


# ---------------------------------------------------------------------------
# Distribution Tests
# ---------------------------------------------------------------------------


class TestDistribution:
    """Test question distribution calculation."""

    def _get_service(self) -> "MixModeService":
        from app.services.ai_generation.mix_mode_service import MixModeService

        return MixModeService(
            dcs_client=MagicMock(),
            llm_manager=MagicMock(),
        )

    def test_equal_distribution(self) -> None:
        service = self._get_service()
        analysis = ContentAnalysisResult()  # all weights = 1.0
        allocations = service._calculate_distribution(analysis, 10)
        assert len(allocations) == 5
        total = sum(a.count for a in allocations)
        assert total == 10
        # Equal weights → each gets 2
        for a in allocations:
            assert a.count == 2

    def test_distribution_sums_to_total(self) -> None:
        service = self._get_service()
        analysis = ContentAnalysisResult(
            vocabulary_weight=1.5,
            reading_weight=1.5,
            listening_weight=0.5,
        )
        for total in [5, 10, 15, 20]:
            allocations = service._calculate_distribution(analysis, total)
            actual_total = sum(a.count for a in allocations)
            assert actual_total == total, f"Expected {total}, got {actual_total}"

    def test_minimum_one_per_skill(self) -> None:
        service = self._get_service()
        analysis = ContentAnalysisResult(
            vocabulary_weight=10.0,
            grammar_weight=0.1,
            reading_weight=0.1,
            listening_weight=0.1,
            writing_weight=0.1,
        )
        allocations = service._calculate_distribution(analysis, 10)
        for a in allocations:
            assert a.count >= 1

    def test_adapted_distribution_vocabulary_heavy(self) -> None:
        service = self._get_service()
        analysis = ContentAnalysisResult(vocabulary_weight=1.5)
        allocations = service._calculate_distribution(analysis, 10)
        vocab_alloc = next(a for a in allocations if a.skill_slug == "vocabulary")
        grammar_alloc = next(a for a in allocations if a.skill_slug == "grammar")
        assert vocab_alloc.count >= grammar_alloc.count

    def test_default_formats(self) -> None:
        service = self._get_service()
        analysis = ContentAnalysisResult()
        allocations = service._calculate_distribution(analysis, 10)
        format_map = {a.skill_slug: a.format_slug for a in allocations}
        assert format_map["vocabulary"] == "multiple_choice"
        assert format_map["grammar"] == "fill_blank"
        assert format_map["reading"] == "multiple_choice"
        assert format_map["listening"] == "multiple_choice"
        assert format_map["writing"] == "fill_blank"


# ---------------------------------------------------------------------------
# Service Integration Tests (mocked generators)
# ---------------------------------------------------------------------------


class TestMixModeService:
    """Test mix mode service with mocked generators."""

    @pytest.fixture
    def mock_dcs_client(self) -> MagicMock:
        client = MagicMock()
        module_mock = MagicMock()
        module_mock.text = "Students learn about travel and holidays. They describe their favorite places. " * 20
        module_mock.title = "Unit 5: Travel"
        module_mock.topics = ["Travel", "Holidays"]
        module_mock.language = "en"
        module_mock.difficulty = "A2"
        client.get_module_detail = AsyncMock(return_value=module_mock)
        return client

    @pytest.fixture
    def mock_llm_manager(self) -> MagicMock:
        manager = MagicMock()
        manager.generate_structured = AsyncMock(return_value={
            "questions": [
                {
                    "question_text": f"Question {i}",
                    "options": ["a", "b", "c", "d"],
                    "correct_index": 0,
                    "correct_answer": "a",
                }
                for i in range(5)
            ],
        })
        return manager

    @pytest.mark.asyncio
    async def test_generate_produces_questions(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.mix_mode_service import MixModeService

        service = MixModeService(mock_dcs_client, mock_llm_manager)

        # Patch individual generators to return simple questions
        async def mock_gen(*args, **kwargs) -> list[MixModeQuestion]:
            skill = kwargs.get("skill_slug", args[0] if args else "vocabulary")
            return [
                MixModeQuestion(
                    question_id=f"{skill}-q{i}",
                    skill_slug=skill,
                    format_slug="multiple_choice",
                    question_data={"text": f"Q{i}"},
                )
                for i in range(kwargs.get("count", args[4] if len(args) > 4 else 2))
            ]

        with patch.object(service, "_generate_skill_questions", side_effect=mock_gen):
            activity = await service.generate_activity(
                book_id=1, module_ids=[10], total_count=10,
            )

        assert isinstance(activity, MixModeActivity)
        assert activity.is_mix_mode is True
        assert activity.total_questions > 0
        assert len(activity.questions) > 0

    @pytest.mark.asyncio
    async def test_handles_generator_failures(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.mix_mode_service import MixModeService

        service = MixModeService(mock_dcs_client, mock_llm_manager)

        call_count = 0

        async def mock_gen(*args, **kwargs) -> list[MixModeQuestion]:
            nonlocal call_count
            call_count += 1
            skill = kwargs.get("skill_slug", args[0] if args else "unknown")
            if call_count <= 2:
                raise RuntimeError("Generator failed")
            return [
                MixModeQuestion(
                    question_id=f"{skill}-q1",
                    skill_slug=skill,
                    format_slug="multiple_choice",
                    question_data={"text": "Q1"},
                ),
            ]

        with patch.object(service, "_generate_skill_questions", side_effect=mock_gen):
            activity = await service.generate_activity(
                book_id=1, module_ids=[10], total_count=10,
            )

        # Should still produce activity with remaining skills
        assert activity.total_questions > 0

    @pytest.mark.asyncio
    async def test_all_generators_fail_raises(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.mix_mode_service import MixModeService, MixModeError

        service = MixModeService(mock_dcs_client, mock_llm_manager)

        async def mock_gen(*args, **kwargs) -> list[MixModeQuestion]:
            raise RuntimeError("All failed")

        with patch.object(service, "_generate_skill_questions", side_effect=mock_gen):
            with pytest.raises(MixModeError, match="No questions could be generated"):
                await service.generate_activity(
                    book_id=1, module_ids=[10], total_count=10,
                )

    @pytest.mark.asyncio
    async def test_empty_module_raises(
        self, mock_dcs_client: MagicMock, mock_llm_manager: MagicMock
    ) -> None:
        from app.services.ai_generation.mix_mode_service import MixModeError, MixModeService

        module_mock = MagicMock()
        module_mock.text = "   "
        module_mock.title = "Empty"
        module_mock.topics = None
        module_mock.language = None
        module_mock.difficulty = None
        mock_dcs_client.get_module_detail = AsyncMock(return_value=module_mock)

        service = MixModeService(mock_dcs_client, mock_llm_manager)
        with pytest.raises(MixModeError, match="no text content"):
            await service.generate_activity(book_id=1, module_ids=[10])

    @pytest.mark.asyncio
    async def test_cefr_to_difficulty(self) -> None:
        from app.services.ai_generation.mix_mode_service import MixModeService

        assert MixModeService._cefr_to_difficulty("A1") == "easy"
        assert MixModeService._cefr_to_difficulty("A2") == "medium"
        assert MixModeService._cefr_to_difficulty("B1") == "medium"
        assert MixModeService._cefr_to_difficulty("B2") == "hard"
        assert MixModeService._cefr_to_difficulty("C1") == "hard"
        assert MixModeService._cefr_to_difficulty("") == "hard"


# ---------------------------------------------------------------------------
# Storage Tests
# ---------------------------------------------------------------------------


class TestMixModeStorage:
    """Test mix mode storage."""

    @pytest.fixture
    def sample_activity(self) -> MixModeActivity:
        return MixModeActivity(
            activity_id="mix-test-001",
            book_id=1,
            module_ids=[10],
            skill_distribution={
                "vocabulary": {"count": 2, "format": "multiple_choice"},
                "grammar": {"count": 2, "format": "fill_blank"},
                "reading": {"count": 2, "format": "multiple_choice"},
            },
            questions=[
                MixModeQuestion(
                    question_id="q1", skill_slug="vocabulary",
                    format_slug="multiple_choice", question_data={"text": "Q1"},
                ),
                MixModeQuestion(
                    question_id="q2", skill_slug="grammar",
                    format_slug="fill_blank", question_data={"text": "Q2"},
                ),
            ],
            total_questions=2,
            skills_covered=2,
            difficulty="medium",
            language="en",
            created_at=datetime.now(timezone.utc),
        )

    @pytest.mark.asyncio
    async def test_save_and_get(self, sample_activity: MixModeActivity) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        await storage.save_mix_mode_activity(sample_activity)
        result = await storage.get_mix_mode_activity("mix-test-001")
        assert result is not None
        assert result.activity_id == "mix-test-001"
        assert result.total_questions == 2

    @pytest.mark.asyncio
    async def test_get_public(self, sample_activity: MixModeActivity) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        await storage.save_mix_mode_activity(sample_activity)
        public = await storage.get_mix_mode_activity_public("mix-test-001")
        assert public is not None
        assert isinstance(public, MixModeActivityPublic)
        assert public.is_mix_mode is True
        assert len(public.questions) == 2

    @pytest.mark.asyncio
    async def test_nonexistent_returns_none(self) -> None:
        from app.services.ai_generation.quiz_storage_service import QuizStorageService

        storage = QuizStorageService()
        result = await storage.get_mix_mode_activity("nonexistent")
        assert result is None
