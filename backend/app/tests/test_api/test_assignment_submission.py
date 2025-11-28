"""
Tests for Assignment Submission API endpoint (Story 4.7).

Tests cover:
- Successful assignment submission
- Idempotent behavior (duplicate submissions)
- Authorization (student role, assignment ownership)
- Validation (score range, status requirements)
- Error handling (404, 400, 403)
"""

import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import (
    Activity,
    Assignment,
    AssignmentStatus,
    AssignmentStudent,
    Book,
    BookAccess,
    Publisher,
    School,
    Student,
    Teacher,
    User,
)


@pytest.fixture(name="test_publisher")
def publisher_fixture(session: Session, publisher_user: User) -> Publisher:
    """Create a test publisher."""
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=publisher_user.id,
        name="Test Publisher",
        contact_email="contact@testpublisher.com",
    )
    session.add(publisher)
    session.commit()
    session.refresh(publisher)
    return publisher


@pytest.fixture(name="test_school")
def school_fixture(session: Session, test_publisher: Publisher) -> School:
    """Create a test school."""
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        publisher_id=test_publisher.id,
        contact_email="school@test.com",
    )
    session.add(school)
    session.commit()
    session.refresh(school)
    return school


@pytest.fixture(name="test_teacher")
def teacher_fixture(session: Session, teacher_user: User, test_school: School) -> Teacher:
    """Create a test teacher."""
    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=test_school.id,
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)
    return teacher


@pytest.fixture(name="test_student")
def student_fixture(session: Session, student_user: User, test_school: School) -> Student:
    """Create a test student."""
    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        school_id=test_school.id,
    )
    session.add(student)
    session.commit()
    session.refresh(student)
    return student


@pytest.fixture(name="test_book")
def book_fixture(session: Session, test_publisher: Publisher) -> Book:
    """Create a test book."""
    book = Book(
        id=uuid.uuid4(),
        dream_storage_id="TEST_BOOK_001",
        title="Test Book",
        book_name="TEST_BOOK",
        publisher_name="Test Publisher",
        publisher_id=test_publisher.id,
        cover_image_url=None,
        dcs_activity_count=1,
        dcs_activity_details=None,
    )
    session.add(book)
    session.commit()
    session.refresh(book)

    # Create BookAccess
    book_access = BookAccess(
        id=uuid.uuid4(),
        book_id=book.id,
        publisher_id=test_publisher.id,
    )
    session.add(book_access)
    session.commit()

    return book


@pytest.fixture(name="test_activity")
def activity_fixture(session: Session, test_book: Book) -> Activity:
    """Create a test activity."""
    from app.models import ActivityType

    activity = Activity(
        id=uuid.uuid4(),
        book_id=test_book.id,
        dream_activity_id="test-activity-submit-001",
        module_name="Test Module",
        page_number=1,
        section_index=1,
        title="Test Activity",
        activity_type=ActivityType.circle,
        order_index=0,
        config_json={"type": "circle", "answer": []},
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity


@pytest.fixture(name="in_progress_assignment")
def in_progress_assignment_fixture(
    session: Session,
    test_teacher: Teacher,
    test_student: Student,
    test_activity: Activity,
    test_book: Book,
) -> tuple[Assignment, AssignmentStudent]:
    """Create an assignment in 'in_progress' status."""
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=test_teacher.id,
        activity_id=test_activity.id,
        book_id=test_book.id,
        name="Test Assignment",
        instructions="Test instructions",
        due_date=None,
        time_limit_minutes=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    session.add(assignment)
    session.flush()

    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=assignment.id,
        student_id=test_student.id,
        status=AssignmentStatus.in_progress,
        score=None,
        answers_json=None,
        progress_json=None,
        started_at=datetime.now(UTC),
        completed_at=None,
        time_spent_minutes=0,
        last_saved_at=None,
    )
    session.add(assignment_student)
    session.commit()
    session.refresh(assignment)
    session.refresh(assignment_student)

    return assignment, assignment_student


@pytest.fixture(name="completed_assignment")
def completed_assignment_fixture(
    session: Session,
    test_teacher: Teacher,
    test_student: Student,
    test_activity: Activity,
    test_book: Book,
) -> tuple[Assignment, AssignmentStudent]:
    """Create an already completed assignment."""
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=test_teacher.id,
        activity_id=test_activity.id,
        book_id=test_book.id,
        name="Completed Assignment",
        instructions="Test instructions",
        due_date=None,
        time_limit_minutes=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    session.add(assignment)
    session.flush()

    completed_at = datetime.now(UTC)
    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=assignment.id,
        student_id=test_student.id,
        status=AssignmentStatus.completed,
        score=85.0,
        answers_json={"type": "circle", "selections": {"0": 1}},
        progress_json=None,
        started_at=datetime.now(UTC),
        completed_at=completed_at,
        time_spent_minutes=10,
        last_saved_at=None,
    )
    session.add(assignment_student)
    session.commit()
    session.refresh(assignment)
    session.refresh(assignment_student)

    return assignment, assignment_student


@pytest.fixture(name="not_started_assignment")
def not_started_assignment_fixture(
    session: Session,
    test_teacher: Teacher,
    test_student: Student,
    test_activity: Activity,
    test_book: Book,
) -> tuple[Assignment, AssignmentStudent]:
    """Create an assignment in 'not_started' status."""
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=test_teacher.id,
        activity_id=test_activity.id,
        book_id=test_book.id,
        name="Not Started Assignment",
        instructions="Test instructions",
        due_date=None,
        time_limit_minutes=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    session.add(assignment)
    session.flush()

    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=assignment.id,
        student_id=test_student.id,
        status=AssignmentStatus.not_started,
        score=None,
        answers_json=None,
        progress_json=None,
        started_at=None,
        completed_at=None,
        time_spent_minutes=0,
        last_saved_at=None,
    )
    session.add(assignment_student)
    session.commit()
    session.refresh(assignment)
    session.refresh(assignment_student)

    return assignment, assignment_student


class TestSubmitAssignment:
    """Test POST /api/v1/assignments/{assignment_id}/submit endpoint."""

    def test_submit_assignment_success(
        self,
        client: TestClient,
        student_token: str,
        in_progress_assignment: tuple[Assignment, AssignmentStudent],
        session: Session,
    ):
        """Test successful assignment submission."""
        assignment, assignment_student = in_progress_assignment

        submission_data = {
            "answers_json": {"type": "circle", "selections": {"0": 2, "1": 1}},
            "score": 75.5,
            "time_spent_minutes": 15,
        }

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/submit",
            json=submission_data,
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Assignment submitted successfully"
        assert data["score"] == 75.5
        assert "completed_at" in data
        assert data["assignment_id"] == str(assignment.id)

        # Verify database update
        session.refresh(assignment_student)
        assert assignment_student.status == AssignmentStatus.completed
        assert assignment_student.score == 75.5
        assert assignment_student.time_spent_minutes == 15
        assert assignment_student.answers_json == submission_data["answers_json"]
        assert assignment_student.completed_at is not None

    def test_submit_assignment_idempotent(
        self,
        client: TestClient,
        student_token: str,
        completed_assignment: tuple[Assignment, AssignmentStudent],
    ):
        """Test that submitting an already completed assignment returns existing result."""
        assignment, assignment_student = completed_assignment
        original_score = assignment_student.score
        original_completed_at = assignment_student.completed_at

        submission_data = {
            "answers_json": {"type": "circle", "selections": {"0": 1}},
            "score": 95.0,  # Different score
            "time_spent_minutes": 20,
        }

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/submit",
            json=submission_data,
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Assignment already submitted"
        assert data["score"] == original_score  # Original score returned
        assert data["assignment_id"] == str(assignment.id)

    def test_submit_assignment_not_found(
        self,
        client: TestClient,
        student_token: str,
    ):
        """Test submission with invalid assignment ID."""
        invalid_id = uuid.uuid4()
        submission_data = {
            "answers_json": {"type": "circle", "selections": {"0": 1}},
            "score": 80.0,
            "time_spent_minutes": 10,
        }

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{invalid_id}/submit",
            json=submission_data,
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_submit_assignment_wrong_status(
        self,
        client: TestClient,
        student_token: str,
        not_started_assignment: tuple[Assignment, AssignmentStudent],
    ):
        """Test that submitting a not_started assignment fails."""
        assignment, _ = not_started_assignment

        submission_data = {
            "answers_json": {"type": "circle", "selections": {"0": 1}},
            "score": 80.0,
            "time_spent_minutes": 10,
        }

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/submit",
            json=submission_data,
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 400
        assert "status" in response.json()["detail"].lower()

    def test_submit_assignment_invalid_score_too_high(
        self,
        client: TestClient,
        student_token: str,
        in_progress_assignment: tuple[Assignment, AssignmentStudent],
    ):
        """Test that score > 100 is rejected."""
        assignment, _ = in_progress_assignment

        submission_data = {
            "answers_json": {"type": "circle", "selections": {"0": 1}},
            "score": 150.0,  # Invalid: > 100
            "time_spent_minutes": 10,
        }

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/submit",
            json=submission_data,
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 422  # Validation error

    def test_submit_assignment_invalid_score_negative(
        self,
        client: TestClient,
        student_token: str,
        in_progress_assignment: tuple[Assignment, AssignmentStudent],
    ):
        """Test that negative score is rejected."""
        assignment, _ = in_progress_assignment

        submission_data = {
            "answers_json": {"type": "circle", "selections": {"0": 1}},
            "score": -10.0,  # Invalid: negative
            "time_spent_minutes": 10,
        }

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/submit",
            json=submission_data,
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 422  # Validation error

    def test_submit_assignment_requires_authentication(
        self,
        client: TestClient,
        in_progress_assignment: tuple[Assignment, AssignmentStudent],
    ):
        """Test that unauthenticated requests are rejected."""
        assignment, _ = in_progress_assignment

        submission_data = {
            "answers_json": {"type": "circle", "selections": {"0": 1}},
            "score": 80.0,
            "time_spent_minutes": 10,
        }

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/submit",
            json=submission_data,
        )

        assert response.status_code == 401

    def test_submit_assignment_requires_student_role(
        self,
        client: TestClient,
        teacher_token: str,
        in_progress_assignment: tuple[Assignment, AssignmentStudent],
    ):
        """Test that non-student users cannot submit assignments."""
        assignment, _ = in_progress_assignment

        submission_data = {
            "answers_json": {"type": "circle", "selections": {"0": 1}},
            "score": 80.0,
            "time_spent_minutes": 10,
        }

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/submit",
            json=submission_data,
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 403

    def test_submit_assignment_with_completed_at(
        self,
        client: TestClient,
        student_token: str,
        in_progress_assignment: tuple[Assignment, AssignmentStudent],
        session: Session,
    ):
        """Test submission with explicit completed_at timestamp."""
        assignment, assignment_student = in_progress_assignment
        completed_at = datetime.now(UTC)

        submission_data = {
            "answers_json": {"type": "circle", "selections": {"0": 2}},
            "score": 90.0,
            "time_spent_minutes": 12,
            "completed_at": completed_at.isoformat(),
        }

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/submit",
            json=submission_data,
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["score"] == 90.0
