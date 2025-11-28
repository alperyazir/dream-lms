"""Tests for assignment schemas validation."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from app.models import AssignmentStatus
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentResponse,
    AssignmentStudentResponse,
)


class TestAssignmentCreate:
    """Test AssignmentCreate schema validation."""

    def test_valid_assignment_with_students(self):
        """Test creating valid assignment with student_ids."""
        student_id = uuid.uuid4()
        activity_id = uuid.uuid4()
        book_id = uuid.uuid4()
        future_date = datetime.now(UTC) + timedelta(days=7)

        data = AssignmentCreate(
            activity_id=activity_id,
            book_id=book_id,
            name="Test Assignment",
            instructions="Complete by Friday",
            due_date=future_date,
            time_limit_minutes=30,
            student_ids=[student_id],
        )

        assert data.activity_id == activity_id
        assert data.book_id == book_id
        assert data.name == "Test Assignment"
        assert data.student_ids == [student_id]

    def test_valid_assignment_with_classes(self):
        """Test creating valid assignment with class_ids."""
        class_id = uuid.uuid4()
        activity_id = uuid.uuid4()
        book_id = uuid.uuid4()

        data = AssignmentCreate(
            activity_id=activity_id,
            book_id=book_id,
            name="Math Quiz",
            class_ids=[class_id],
        )

        assert data.class_ids == [class_id]
        assert data.student_ids is None

    def test_valid_assignment_with_both_students_and_classes(self):
        """Test assignment with both student_ids and class_ids."""
        student_id = uuid.uuid4()
        class_id = uuid.uuid4()
        activity_id = uuid.uuid4()
        book_id = uuid.uuid4()

        data = AssignmentCreate(
            activity_id=activity_id,
            book_id=book_id,
            name="Combined Assignment",
            student_ids=[student_id],
            class_ids=[class_id],
        )

        assert len(data.student_ids) == 1
        assert len(data.class_ids) == 1

    def test_missing_recipients_raises_error(self):
        """Test that assignment without students or classes raises error."""
        with pytest.raises(ValidationError) as exc_info:
            AssignmentCreate(
                activity_id=uuid.uuid4(),
                book_id=uuid.uuid4(),
                name="No Recipients",
            )

        errors = exc_info.value.errors()
        assert any("At least one student or class must be selected" in str(e) for e in errors)

    def test_empty_recipients_raises_error(self):
        """Test that empty student and class lists raise error."""
        with pytest.raises(ValidationError) as exc_info:
            AssignmentCreate(
                activity_id=uuid.uuid4(),
                book_id=uuid.uuid4(),
                name="Empty Recipients",
                student_ids=[],
                class_ids=[],
            )

        errors = exc_info.value.errors()
        assert any("At least one student or class must be selected" in str(e) for e in errors)

    def test_due_date_in_past_raises_error(self):
        """Test that past due date raises validation error."""
        past_date = datetime.now(UTC) - timedelta(days=1)

        with pytest.raises(ValidationError) as exc_info:
            AssignmentCreate(
                activity_id=uuid.uuid4(),
                book_id=uuid.uuid4(),
                name="Past Due",
                due_date=past_date,
                student_ids=[uuid.uuid4()],
            )

        errors = exc_info.value.errors()
        assert any("must be in the future" in str(e).lower() for e in errors)

    def test_negative_time_limit_raises_error(self):
        """Test that negative time limit raises error."""
        with pytest.raises(ValidationError) as exc_info:
            AssignmentCreate(
                activity_id=uuid.uuid4(),
                book_id=uuid.uuid4(),
                name="Negative Time",
                time_limit_minutes=-10,
                student_ids=[uuid.uuid4()],
            )

        errors = exc_info.value.errors()
        assert any("greater than 0" in str(e).lower() for e in errors)

    def test_zero_time_limit_raises_error(self):
        """Test that zero time limit raises error."""
        with pytest.raises(ValidationError) as exc_info:
            AssignmentCreate(
                activity_id=uuid.uuid4(),
                book_id=uuid.uuid4(),
                name="Zero Time",
                time_limit_minutes=0,
                student_ids=[uuid.uuid4()],
            )

        errors = exc_info.value.errors()
        assert any("greater than 0" in str(e).lower() for e in errors)

    def test_name_too_long_raises_error(self):
        """Test that name exceeding 500 characters raises error."""
        long_name = "A" * 501

        with pytest.raises(ValidationError) as exc_info:
            AssignmentCreate(
                activity_id=uuid.uuid4(),
                book_id=uuid.uuid4(),
                name=long_name,
                student_ids=[uuid.uuid4()],
            )

        errors = exc_info.value.errors()
        assert any("500 characters" in str(e).lower() for e in errors)

    def test_empty_name_raises_error(self):
        """Test that empty or whitespace name raises error."""
        with pytest.raises(ValidationError) as exc_info:
            AssignmentCreate(
                activity_id=uuid.uuid4(),
                book_id=uuid.uuid4(),
                name="   ",
                student_ids=[uuid.uuid4()],
            )

        errors = exc_info.value.errors()
        assert any("cannot be empty" in str(e).lower() for e in errors)

    def test_optional_fields_none(self):
        """Test that optional fields can be None."""
        data = AssignmentCreate(
            activity_id=uuid.uuid4(),
            book_id=uuid.uuid4(),
            name="Minimal Assignment",
            student_ids=[uuid.uuid4()],
            instructions=None,
            due_date=None,
            time_limit_minutes=None,
        )

        assert data.instructions is None
        assert data.due_date is None
        assert data.time_limit_minutes is None


class TestAssignmentResponse:
    """Test AssignmentResponse schema."""

    def test_assignment_response_from_dict(self):
        """Test creating AssignmentResponse from dict."""
        now = datetime.now(UTC)
        data = {
            "id": uuid.uuid4(),
            "teacher_id": uuid.uuid4(),
            "activity_id": uuid.uuid4(),
            "book_id": uuid.uuid4(),
            "name": "Test Assignment",
            "instructions": "Complete all questions",
            "due_date": now + timedelta(days=7),
            "time_limit_minutes": 60,
            "created_at": now,
            "updated_at": now,
            "student_count": 25,
        }

        response = AssignmentResponse(**data)

        assert response.name == "Test Assignment"
        assert response.student_count == 25
        assert response.time_limit_minutes == 60

    def test_assignment_response_default_student_count(self):
        """Test that student_count defaults to 0."""
        now = datetime.now(UTC)
        data = {
            "id": uuid.uuid4(),
            "teacher_id": uuid.uuid4(),
            "activity_id": uuid.uuid4(),
            "book_id": uuid.uuid4(),
            "name": "Test",
            "instructions": None,
            "due_date": None,
            "time_limit_minutes": None,
            "created_at": now,
            "updated_at": now,
        }

        response = AssignmentResponse(**data)
        assert response.student_count == 0


class TestAssignmentStudentResponse:
    """Test AssignmentStudentResponse schema."""

    def test_assignment_student_response_from_dict(self):
        """Test creating AssignmentStudentResponse from dict."""
        now = datetime.now(UTC)
        data = {
            "id": uuid.uuid4(),
            "assignment_id": uuid.uuid4(),
            "student_id": uuid.uuid4(),
            "status": AssignmentStatus.in_progress,
            "score": 85,
            "started_at": now - timedelta(hours=1),
            "completed_at": None,
        }

        response = AssignmentStudentResponse(**data)

        assert response.status == AssignmentStatus.in_progress
        assert response.score == 85
        assert response.completed_at is None

    def test_assignment_student_response_not_started(self):
        """Test assignment student with not_started status."""
        data = {
            "id": uuid.uuid4(),
            "assignment_id": uuid.uuid4(),
            "student_id": uuid.uuid4(),
            "status": AssignmentStatus.not_started,
            "score": None,
            "started_at": None,
            "completed_at": None,
        }

        response = AssignmentStudentResponse(**data)

        assert response.status == AssignmentStatus.not_started
        assert response.score is None
        assert response.started_at is None
