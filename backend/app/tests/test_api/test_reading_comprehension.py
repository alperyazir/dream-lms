"""
Tests for Reading Comprehension API Endpoints.

Story 27.10: Reading Comprehension Generation
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.schemas.reading_comprehension import (
    ReadingComprehensionActivity,
    ReadingComprehensionQuestion,
)


@pytest.fixture
def sample_activity():
    """Create a sample reading comprehension activity."""
    return ReadingComprehensionActivity(
        activity_id=str(uuid4()),
        book_id=123,
        module_id=1,
        module_title="Unit 1: Introduction",
        passage="This is a sample passage about learning English.",
        passage_pages=[1, 2],
        questions=[
            ReadingComprehensionQuestion(
                question_id=str(uuid4()),
                question_type="mcq",
                question_text="What is this passage about?",
                options=[
                    "Learning English",
                    "Cooking recipes",
                    "Sports events",
                    "Travel destinations",
                ],
                correct_answer="Learning English",
                correct_index=0,
                explanation="The passage is about learning English.",
                passage_reference="This is a sample passage about learning English.",
            ),
            ReadingComprehensionQuestion(
                question_id=str(uuid4()),
                question_type="true_false",
                question_text="The passage is about cooking.",
                options=["True", "False"],
                correct_answer="False",
                correct_index=1,
                explanation="The passage is about learning, not cooking.",
                passage_reference="This is a sample passage about learning English.",
            ),
            ReadingComprehensionQuestion(
                question_id=str(uuid4()),
                question_type="short_answer",
                question_text="What language is being learned?",
                options=None,
                correct_answer="English",
                correct_index=None,
                explanation="English is being learned.",
                passage_reference="learning English",
            ),
        ],
        difficulty="easy",
        language="en",
        created_at=datetime.now(timezone.utc),
    )


class TestReadingComprehensionAPI:
    """Tests for reading comprehension API endpoints."""

    @pytest.mark.asyncio
    async def test_generate_activity_requires_teacher_role(
        self,
        client: TestClient,
        student_token: str,
    ):
        """Should require teacher role to generate activities."""
        response = client.post(
            "/api/v1/ai/reading/generate",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "book_id": 123,
                "module_id": 1,
            },
        )

        # Students should not be able to generate
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_activity_not_found(
        self,
        client: TestClient,
        student_token: str,
    ):
        """Should return 404 for non-existent activity."""
        response = client.get(
            "/api/v1/ai/reading/nonexistent-id",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_submit_activity_not_found(
        self,
        client: TestClient,
        student_token: str,
    ):
        """Should return 404 when submitting to non-existent activity."""
        response = client.post(
            "/api/v1/ai/reading/nonexistent-id/submit",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "answers": []
            },
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_result_not_found(
        self,
        client: TestClient,
        student_token: str,
    ):
        """Should return 404 for non-existent result."""
        response = client.get(
            "/api/v1/ai/reading/nonexistent-id/result",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 404


class TestReadingActivityStorage:
    """Tests for reading activity storage integration."""

    @pytest.mark.asyncio
    async def test_save_and_retrieve_activity(self, sample_activity):
        """Should save and retrieve activity correctly."""
        from app.services.ai_generation import QuizStorageService

        storage = QuizStorageService()

        # Save activity
        activity_id = await storage.save_reading_activity(sample_activity)
        assert activity_id == sample_activity.activity_id

        # Retrieve activity (internal version with answers)
        retrieved = await storage.get_reading_activity(activity_id)
        assert retrieved is not None
        assert retrieved.activity_id == sample_activity.activity_id
        assert retrieved.passage == sample_activity.passage
        assert len(retrieved.questions) == 3
        assert retrieved.questions[0].correct_answer == "Learning English"

    @pytest.mark.asyncio
    async def test_get_activity_public(self, sample_activity):
        """Should return public version without answers."""
        from app.services.ai_generation import QuizStorageService

        storage = QuizStorageService()
        await storage.save_reading_activity(sample_activity)

        # Retrieve public version
        public = await storage.get_reading_activity_public(sample_activity.activity_id)
        assert public is not None
        assert public.passage == sample_activity.passage
        assert len(public.questions) == 3

        # Public version should not have correct answers
        for q in public.questions:
            assert not hasattr(q, "correct_answer") or q.correct_answer is None

    @pytest.mark.asyncio
    async def test_save_submission_mcq(self, sample_activity):
        """Should grade MCQ questions correctly."""
        from app.schemas.reading_comprehension import ReadingComprehensionAnswer
        from app.services.ai_generation import QuizStorageService

        storage = QuizStorageService()
        await storage.save_reading_activity(sample_activity)

        student_id = uuid4()
        mcq_question = sample_activity.questions[0]

        # Submit correct answer
        answers = [
            ReadingComprehensionAnswer(
                question_id=mcq_question.question_id,
                answer_index=0,  # Correct
            )
        ]

        result = await storage.save_reading_submission(
            sample_activity.activity_id,
            student_id,
            answers,
        )

        assert result is not None
        assert result.score >= 1  # At least 1 correct

        # Check MCQ question result
        mcq_result = next(
            r for r in result.question_results
            if r.question_id == mcq_question.question_id
        )
        assert mcq_result.is_correct is True
        assert mcq_result.student_answer_index == 0

    @pytest.mark.asyncio
    async def test_save_submission_true_false(self, sample_activity):
        """Should grade True/False questions correctly."""
        from app.schemas.reading_comprehension import ReadingComprehensionAnswer
        from app.services.ai_generation import QuizStorageService

        storage = QuizStorageService()
        await storage.save_reading_activity(sample_activity)

        student_id = uuid4()
        tf_question = sample_activity.questions[1]

        # Submit correct answer (False = index 1)
        answers = [
            ReadingComprehensionAnswer(
                question_id=tf_question.question_id,
                answer_index=1,  # False - correct
            )
        ]

        result = await storage.save_reading_submission(
            sample_activity.activity_id,
            student_id,
            answers,
        )

        assert result is not None
        tf_result = next(
            r for r in result.question_results
            if r.question_id == tf_question.question_id
        )
        assert tf_result.is_correct is True

    @pytest.mark.asyncio
    async def test_save_submission_short_answer(self, sample_activity):
        """Should grade short answer questions with fuzzy matching."""
        from app.schemas.reading_comprehension import ReadingComprehensionAnswer
        from app.services.ai_generation import QuizStorageService

        storage = QuizStorageService()
        await storage.save_reading_activity(sample_activity)

        student_id = uuid4()
        sa_question = sample_activity.questions[2]

        # Submit exact answer
        answers = [
            ReadingComprehensionAnswer(
                question_id=sa_question.question_id,
                answer_text="English",  # Exact match
            )
        ]

        result = await storage.save_reading_submission(
            sample_activity.activity_id,
            student_id,
            answers,
        )

        assert result is not None
        sa_result = next(
            r for r in result.question_results
            if r.question_id == sa_question.question_id
        )
        assert sa_result.is_correct is True
        assert sa_result.similarity_score == 1.0

    @pytest.mark.asyncio
    async def test_save_submission_short_answer_fuzzy(self, sample_activity):
        """Should accept similar short answers via fuzzy matching."""
        from app.schemas.reading_comprehension import ReadingComprehensionAnswer
        from app.services.ai_generation import QuizStorageService

        storage = QuizStorageService()
        await storage.save_reading_activity(sample_activity)

        student_id = uuid4()
        sa_question = sample_activity.questions[2]

        # Submit similar answer (case insensitive)
        answers = [
            ReadingComprehensionAnswer(
                question_id=sa_question.question_id,
                answer_text="english",  # Lowercase
            )
        ]

        result = await storage.save_reading_submission(
            sample_activity.activity_id,
            student_id,
            answers,
        )

        assert result is not None
        sa_result = next(
            r for r in result.question_results
            if r.question_id == sa_question.question_id
        )
        assert sa_result.is_correct is True

    @pytest.mark.asyncio
    async def test_score_by_type(self, sample_activity):
        """Should calculate score by question type."""
        from app.schemas.reading_comprehension import ReadingComprehensionAnswer
        from app.services.ai_generation import QuizStorageService

        storage = QuizStorageService()
        await storage.save_reading_activity(sample_activity)

        student_id = uuid4()

        # Answer all questions correctly
        answers = [
            ReadingComprehensionAnswer(
                question_id=sample_activity.questions[0].question_id,
                answer_index=0,  # MCQ correct
            ),
            ReadingComprehensionAnswer(
                question_id=sample_activity.questions[1].question_id,
                answer_index=1,  # True/False correct
            ),
            ReadingComprehensionAnswer(
                question_id=sample_activity.questions[2].question_id,
                answer_text="English",  # Short answer correct
            ),
        ]

        result = await storage.save_reading_submission(
            sample_activity.activity_id,
            student_id,
            answers,
        )

        assert result is not None
        assert result.score == 3
        assert result.total == 3
        assert result.percentage == 100.0

        # Check score by type
        assert result.score_by_type["mcq"]["correct"] == 1
        assert result.score_by_type["mcq"]["total"] == 1
        assert result.score_by_type["true_false"]["correct"] == 1
        assert result.score_by_type["short_answer"]["correct"] == 1

    @pytest.mark.asyncio
    async def test_has_submitted(self, sample_activity):
        """Should track submission status."""
        from app.schemas.reading_comprehension import ReadingComprehensionAnswer
        from app.services.ai_generation import QuizStorageService

        storage = QuizStorageService()
        await storage.save_reading_activity(sample_activity)

        student_id = uuid4()

        # Initially not submitted
        assert await storage.has_submitted_reading(
            sample_activity.activity_id, student_id
        ) is False

        # Submit
        answers = [
            ReadingComprehensionAnswer(
                question_id=sample_activity.questions[0].question_id,
                answer_index=0,
            )
        ]
        await storage.save_reading_submission(
            sample_activity.activity_id,
            student_id,
            answers,
        )

        # Now submitted
        assert await storage.has_submitted_reading(
            sample_activity.activity_id, student_id
        ) is True

    @pytest.mark.asyncio
    async def test_get_result(self, sample_activity):
        """Should retrieve saved result."""
        from app.schemas.reading_comprehension import ReadingComprehensionAnswer
        from app.services.ai_generation import QuizStorageService

        storage = QuizStorageService()
        await storage.save_reading_activity(sample_activity)

        student_id = uuid4()
        answers = [
            ReadingComprehensionAnswer(
                question_id=sample_activity.questions[0].question_id,
                answer_index=0,
            )
        ]

        await storage.save_reading_submission(
            sample_activity.activity_id,
            student_id,
            answers,
        )

        # Retrieve result
        result = await storage.get_reading_result(
            sample_activity.activity_id, student_id
        )

        assert result is not None
        assert result.student_id == student_id
        assert result.passage == sample_activity.passage
        assert result.module_title == sample_activity.module_title
