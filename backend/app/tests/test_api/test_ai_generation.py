"""
Tests for AI Generation API Endpoints.

Tests vocabulary quiz API with authentication and authorization.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.models import User, UserRole
from app.schemas.vocabulary_quiz import (
    VocabularyQuiz,
    VocabularyQuizQuestion,
)


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def sample_quiz():
    """Sample quiz for testing."""
    return VocabularyQuiz(
        quiz_id="test-quiz-123",
        book_id=123,
        module_ids=[1, 2],
        questions=[
            VocabularyQuizQuestion(
                question_id="q1",
                definition="to succeed in doing something",
                correct_answer="accomplish",
                options=["accomplish", "achieve", "complete", "finish"],
                audio_url="https://example.com/audio.mp3",
                vocabulary_id="v1",
                cefr_level="B1",
            ),
            VocabularyQuizQuestion(
                question_id="q2",
                definition="to reach a goal or result",
                correct_answer="achieve",
                options=["accomplish", "achieve", "complete", "finish"],
                audio_url="https://example.com/audio2.mp3",
                vocabulary_id="v2",
                cefr_level="B1",
            ),
        ],
        created_at=datetime.now(timezone.utc),
        quiz_length=2,
    )


@pytest.fixture
def mock_quiz_service(sample_quiz):
    """Mock VocabularyQuizService."""
    service = MagicMock()
    service.generate_quiz = AsyncMock(return_value=sample_quiz)
    return service


@pytest.fixture
def mock_storage_service(sample_quiz):
    """Mock QuizStorageService."""
    storage = MagicMock()
    storage.save_quiz = AsyncMock(return_value=sample_quiz.quiz_id)
    storage.get_quiz = AsyncMock(return_value=sample_quiz)
    storage.get_quiz_public = AsyncMock()
    storage.save_submission = AsyncMock()
    storage.get_result = AsyncMock()
    storage.has_submitted = AsyncMock(return_value=False)
    return storage


# ============================================================================
# Unit Tests - Authorization
# ============================================================================


class TestQuizGenerationAuthorization:
    """Tests for quiz generation authorization."""

    def test_generate_quiz_requires_auth(self, client: TestClient):
        """Test endpoint requires authentication."""
        response = client.post(
            "/api/v1/ai/vocabulary-quiz/generate",
            json={"book_id": 123, "quiz_length": 5},
        )
        # Should fail without auth
        assert response.status_code in [401, 403]

    def test_generate_quiz_requires_teacher_role(
        self, client: TestClient, student_token: str
    ):
        """Test only teachers can generate quizzes."""
        response = client.post(
            "/api/v1/ai/vocabulary-quiz/generate",
            json={"book_id": 123, "quiz_length": 5},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        # Students should be forbidden
        assert response.status_code == 403

    def test_generate_quiz_teacher_allowed(
        self, client: TestClient, teacher_token: str
    ):
        """Test teachers can access the endpoint."""
        # This will likely fail due to mock not being set up,
        # but it should pass auth check
        response = client.post(
            "/api/v1/ai/vocabulary-quiz/generate",
            json={"book_id": 123, "quiz_length": 5},
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        # Should pass auth (may fail for other reasons)
        assert response.status_code != 403


class TestQuizSubmission:
    """Tests for quiz submission."""

    def test_submit_quiz_requires_auth(self, client: TestClient):
        """Test submission requires authentication."""
        response = client.post(
            "/api/v1/ai/vocabulary-quiz/test-123/submit",
            json={"answers": {"q1": "word"}},
        )
        assert response.status_code in [401, 403]

    def test_get_quiz_requires_auth(self, client: TestClient):
        """Test getting quiz requires authentication."""
        response = client.get("/api/v1/ai/vocabulary-quiz/test-123")
        assert response.status_code in [401, 403]

    def test_get_result_requires_auth(self, client: TestClient):
        """Test getting result requires authentication."""
        response = client.get("/api/v1/ai/vocabulary-quiz/test-123/result")
        assert response.status_code in [401, 403]


# ============================================================================
# Integration Tests (with database fixtures)
# ============================================================================


class TestQuizGenerationIntegration:
    """Integration tests for quiz generation (requires fixtures from conftest)."""

    @pytest.mark.skip(reason="Requires full integration setup with mocked DCS")
    def test_full_quiz_flow(self, client, teacher_token: str):
        """Test complete quiz generation, retrieval, and submission flow."""
        headers = {"Authorization": f"Bearer {teacher_token}"}

        # 1. Generate quiz
        gen_response = client.post(
            "/api/v1/ai/vocabulary-quiz/generate",
            json={
                "book_id": 123,
                "quiz_length": 5,
                "cefr_levels": ["B1"],
            },
            headers=headers,
        )
        assert gen_response.status_code == 201
        quiz_data = gen_response.json()
        quiz_id = quiz_data["quiz_id"]

        # 2. Get quiz (as student)
        get_response = client.get(
            f"/api/v1/ai/vocabulary-quiz/{quiz_id}",
            headers=headers,  # Using teacher for simplicity
        )
        assert get_response.status_code == 200
        public_quiz = get_response.json()
        # Should not have correct answers
        assert "correct_answer" not in public_quiz["questions"][0]

        # 3. Submit answers
        answers = {q["question_id"]: q["options"][0] for q in public_quiz["questions"]}
        submit_response = client.post(
            f"/api/v1/ai/vocabulary-quiz/{quiz_id}/submit",
            json={"answers": answers},
            headers=headers,
        )
        assert submit_response.status_code == 200
        result = submit_response.json()
        assert "score" in result
        assert "percentage" in result

        # 4. Get result
        result_response = client.get(
            f"/api/v1/ai/vocabulary-quiz/{quiz_id}/result",
            headers=headers,
        )
        assert result_response.status_code == 200
