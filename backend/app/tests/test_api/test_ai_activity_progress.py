"""
Integration tests for AI activity progress tracking via existing assignment endpoints.

Tests verify that AI-generated activities (vocabulary_quiz, ai_quiz, reading_comprehension,
sentence_builder, word_builder) integrate correctly with the existing
unified progress API (save_activity_progress endpoint).
"""

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.core.config import settings
from app.main import app
from app.models import (
    ActivityType,
    AssignmentStudent,
    AssignmentStudentActivity,
    AssignmentStudentActivityStatus,
)


@pytest.mark.asyncio
async def test_save_vocabulary_quiz_progress(
    session,
    student_token: str,
    student_user,
    assignment_with_activity,
):
    """Test saving progress for vocabulary_quiz activity type."""
    assignment, activity = assignment_with_activity

    # Update activity type to vocabulary_quiz
    activity.activity_type = ActivityType.vocabulary_quiz
    session.add(activity)
    session.commit()

    # Create vocabulary quiz response data
    response_data = {
        "type": "vocabulary_quiz",
        "answers": {
            "q1": "accomplish",
            "q2": "determine",
            "q3": "achieve",
        },
        "correct": {
            "q1": True,
            "q2": False,
            "q3": True,
        },
    }

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.patch(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/activities/{activity.id}",
            json={
                "response_data": response_data,
                "time_spent_seconds": 180,
                "status": "completed",
                "score": 66.67,
                "max_score": 100.0,
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["score"] == 66.67
    assert data["activity_id"] == str(activity.id)

    # Verify data stored in database
    result = session.execute(
        select(AssignmentStudentActivity)
        .join(AssignmentStudent)
        .where(
            AssignmentStudent.assignment_id == assignment.id,
            AssignmentStudentActivity.activity_id == activity.id,
        )
    )
    activity_progress = result.scalar_one()
    assert activity_progress.status == AssignmentStudentActivityStatus.completed
    assert activity_progress.score == 66.67
    assert activity_progress.response_data == response_data


@pytest.mark.asyncio
async def test_save_ai_quiz_progress(
    session,
    student_token: str,
    assignment_with_activity,
):
    """Test saving progress for ai_quiz activity type."""
    assignment, activity = assignment_with_activity

    # Update activity type to ai_quiz
    activity.activity_type = ActivityType.ai_quiz
    session.add(activity)
    session.commit()

    # Create AI quiz response data
    response_data = {
        "type": "ai_quiz",
        "answers": {
            "q1": 2,  # Selected option index
            "q2": 0,
            "q3": 1,
            "q4": 3,
        },
        "correct": {
            "q1": True,
            "q2": False,
            "q3": True,
            "q4": True,
        },
    }

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.patch(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/activities/{activity.id}",
            json={
                "response_data": response_data,
                "time_spent_seconds": 240,
                "status": "completed",
                "score": 75.0,
                "max_score": 100.0,
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["score"] == 75.0


@pytest.mark.asyncio
async def test_save_progress_in_progress_status(
    session,
    student_token: str,
    assignment_with_activity,
):
    """Test saving in-progress state for AI activity (autosave)."""
    assignment, activity = assignment_with_activity

    # Update activity type to vocabulary_quiz
    activity.activity_type = ActivityType.vocabulary_quiz
    session.add(activity)
    session.commit()

    # Partial progress data
    response_data = {
        "type": "vocabulary_quiz",
        "answers": {
            "q1": "accomplish",
            "q2": "",  # Not answered yet
        },
    }

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.patch(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/activities/{activity.id}",
            json={
                "response_data": response_data,
                "time_spent_seconds": 60,
                "status": "in_progress",
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "in_progress"
    assert data["score"] is None  # No score for in-progress

    # Verify database state
    result = session.execute(
        select(AssignmentStudentActivity)
        .join(AssignmentStudent)
        .where(
            AssignmentStudent.assignment_id == assignment.id,
            AssignmentStudentActivity.activity_id == activity.id,
        )
    )
    activity_progress = result.scalar_one()
    assert activity_progress.status == AssignmentStudentActivityStatus.in_progress
    assert activity_progress.score is None
    assert activity_progress.response_data == response_data


@pytest.mark.asyncio
async def test_idempotent_completed_activity(
    session,
    student_token: str,
    assignment_with_activity,
):
    """Test that completing an already-completed activity is idempotent."""
    assignment, activity = assignment_with_activity

    activity.activity_type = ActivityType.ai_quiz
    session.add(activity)
    session.commit()

    response_data = {"type": "ai_quiz", "answers": {"q1": 1}}

    # First completion
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response1 = await client.patch(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/activities/{activity.id}",
            json={
                "response_data": response_data,
                "time_spent_seconds": 120,
                "status": "completed",
                "score": 80.0,
                "max_score": 100.0,
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )

    assert response1.status_code == 200

    # Second completion attempt with different score (should be ignored)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response2 = await client.patch(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/activities/{activity.id}",
            json={
                "response_data": {"new": "data"},
                "time_spent_seconds": 150,
                "status": "completed",
                "score": 90.0,  # Different score
                "max_score": 100.0,
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )

    assert response2.status_code == 200
    data2 = response2.json()
    assert "already completed" in data2["message"].lower()
    assert data2["score"] == 80.0  # Original score preserved
