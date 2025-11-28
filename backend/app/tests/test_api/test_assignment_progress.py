"""
Tests for Assignment Progress Save/Resume API endpoints (Story 4.8).

Tests cover:
- Successful progress save (200)
- Assignment not found (404)
- Assignment doesn't belong to student (403)
- Cannot save on completed assignment (400)
- Authentication required (401)
- Student role required (403)
- progress_json stored correctly in database
- last_saved_at timestamp updated
- Idempotent behavior (multiple saves)
- time_spent_minutes validation
"""

import uuid
from datetime import UTC, datetime, timedelta

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
        grade_level="10",
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
        dream_storage_id="test-book-001",
        title="Test Book",
        publisher_id=test_publisher.id,
        book_name="test-book",
        publisher_name="Test Publisher",
    )
    session.add(book)
    session.commit()
    session.refresh(book)
    return book


@pytest.fixture(name="test_book_access")
def book_access_fixture(
    session: Session, test_book: Book, test_publisher: Publisher
) -> BookAccess:
    """Grant publisher access to book."""
    book_access = BookAccess(
        id=uuid.uuid4(),
        book_id=test_book.id,
        publisher_id=test_publisher.id,
    )
    session.add(book_access)
    session.commit()
    session.refresh(book_access)
    return book_access


@pytest.fixture(name="test_activity")
def activity_fixture(session: Session, test_book: Book) -> Activity:
    """Create a test activity."""
    activity = Activity(
        id=uuid.uuid4(),
        book_id=test_book.id,
        dream_activity_id="test-activity-001",
        module_name="test-module",
        page_number=1,
        section_index=0,
        activity_type="circle",
        title="Test Activity",
        config_json={"question": "Test question", "options": ["A", "B", "C"]},
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity


@pytest.fixture(name="test_assignment")
def assignment_fixture(
    session: Session,
    test_teacher: Teacher,
    test_activity: Activity,
    test_book: Book,
    test_book_access: BookAccess,  # Ensure book access exists
) -> Assignment:
    """Create a test assignment."""
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=test_teacher.id,
        activity_id=test_activity.id,
        book_id=test_book.id,
        name="Test Assignment",
        instructions="Complete the activity",
        time_limit_minutes=30,
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return assignment


@pytest.fixture(name="in_progress_assignment_student")
def in_progress_assignment_student_fixture(
    session: Session, test_assignment: Assignment, test_student: Student
) -> AssignmentStudent:
    """Create an in-progress assignment-student record."""
    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=test_assignment.id,
        student_id=test_student.id,
        status=AssignmentStatus.in_progress,
        time_spent_minutes=5,
        started_at=datetime.now(UTC),
    )
    session.add(assignment_student)
    session.commit()
    session.refresh(assignment_student)
    return assignment_student


@pytest.fixture(name="completed_assignment_student")
def completed_assignment_student_fixture(
    session: Session, test_assignment: Assignment, test_student: Student
) -> AssignmentStudent:
    """Create a completed assignment-student record."""
    # Create a separate assignment for completed status
    new_assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=test_assignment.teacher_id,
        activity_id=test_assignment.activity_id,
        book_id=test_assignment.book_id,
        name="Completed Assignment",
        instructions="Complete the activity",
    )
    session.add(new_assignment)
    session.commit()

    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=new_assignment.id,
        student_id=test_student.id,
        status=AssignmentStatus.completed,
        score=85.0,
        time_spent_minutes=15,
        started_at=datetime.now(UTC),
        completed_at=datetime.now(UTC),
        answers_json={"answer": "completed"},
    )
    session.add(assignment_student)
    session.commit()
    session.refresh(assignment_student)
    return assignment_student


def test_save_progress_success(
    client: TestClient,
    session: Session,
    student_token: str,
    in_progress_assignment_student: AssignmentStudent,
):
    """Test successful progress save with 200 response and database update."""
    progress_data = {
        "partial_answers_json": {"question_1": "answer_a", "selected_circles": [0, 2, 4]},
        "time_spent_minutes": 10,
    }

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=progress_data,
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Progress saved successfully"
    assert data["time_spent_minutes"] == 10
    assert "last_saved_at" in data

    # Verify database was updated
    session.refresh(in_progress_assignment_student)
    assert in_progress_assignment_student.progress_json == progress_data["partial_answers_json"]
    assert in_progress_assignment_student.time_spent_minutes == 10
    assert in_progress_assignment_student.last_saved_at is not None


def test_save_progress_assignment_not_found(
    client: TestClient,
    student_token: str,
):
    """Test save progress returns 404 for non-existent assignment."""
    non_existent_id = uuid.uuid4()
    progress_data = {
        "partial_answers_json": {"answer": "test"},
        "time_spent_minutes": 5,
    }

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{non_existent_id}/save-progress",
        json=progress_data,
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_save_progress_not_assigned_to_student(
    client: TestClient,
    session: Session,
    student_token: str,
    test_assignment: Assignment,
    test_school: School,
):
    """Test save progress returns 404 when assignment not assigned to student (403 behavior as 404)."""
    # Create another student who doesn't have this assignment
    other_student_user = User(
        id=uuid.uuid4(),
        email="other_student@test.com",
        username="other_student",
        hashed_password="hashed",
        role="student",
    )
    session.add(other_student_user)
    session.commit()

    other_student = Student(
        id=uuid.uuid4(),
        user_id=other_student_user.id,
        grade_level="10",
    )
    session.add(other_student)
    session.commit()

    # Get token for other student
    from app.core.security import create_access_token

    other_token = create_access_token(other_student_user.id, timedelta(minutes=30))
    other_headers = {"Authorization": f"Bearer {other_token}"}

    progress_data = {
        "partial_answers_json": {"answer": "test"},
        "time_spent_minutes": 5,
    }

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{test_assignment.id}/save-progress",
        json=progress_data,
        headers=other_headers,
    )

    # Should return 404 (assignment not found for this student)
    assert response.status_code == 404


def test_save_progress_completed_assignment(
    client: TestClient,
    student_token: str,
    completed_assignment_student: AssignmentStudent,
):
    """Test cannot save progress on completed assignment (400)."""
    progress_data = {
        "partial_answers_json": {"answer": "test"},
        "time_spent_minutes": 20,
    }

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{completed_assignment_student.assignment_id}/save-progress",
        json=progress_data,
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 400
    assert "cannot save progress" in response.json()["detail"].lower()


def test_save_progress_authentication_required(
    client: TestClient,
    in_progress_assignment_student: AssignmentStudent,
):
    """Test authentication required (401)."""
    progress_data = {
        "partial_answers_json": {"answer": "test"},
        "time_spent_minutes": 5,
    }

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=progress_data,
        # No headers = no authentication
    )

    assert response.status_code == 401


def test_save_progress_student_role_required(
    client: TestClient,
    teacher_token: str,
    in_progress_assignment_student: AssignmentStudent,
):
    """Test student role required (403)."""
    progress_data = {
        "partial_answers_json": {"answer": "test"},
        "time_spent_minutes": 5,
    }

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=progress_data,
        headers={"Authorization": f"Bearer {teacher_token}"},  # Using teacher token
    )

    assert response.status_code == 403


def test_save_progress_json_stored_correctly(
    client: TestClient,
    session: Session,
    student_token: str,
    in_progress_assignment_student: AssignmentStudent,
):
    """Test progress_json is stored correctly in database with complex data."""
    complex_progress = {
        "partial_answers_json": {
            "circle_selections": [0, 1, 3],
            "text_inputs": {"field1": "answer1", "field2": "answer2"},
            "nested_data": {"matches": [{"left": "A", "right": "1"}]},
        },
        "time_spent_minutes": 12,
    }

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=complex_progress,
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 200

    # Verify exact data structure preserved
    session.refresh(in_progress_assignment_student)
    assert in_progress_assignment_student.progress_json == complex_progress["partial_answers_json"]


def test_save_progress_last_saved_at_updated(
    client: TestClient,
    session: Session,
    student_token: str,
    in_progress_assignment_student: AssignmentStudent,
):
    """Test last_saved_at timestamp is updated on each save."""
    progress_data = {
        "partial_answers_json": {"answer": "first_save"},
        "time_spent_minutes": 5,
    }

    # First save
    response1 = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=progress_data,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response1.status_code == 200
    first_save_time = response1.json()["last_saved_at"]

    # Second save with different data
    progress_data["partial_answers_json"]["answer"] = "second_save"
    progress_data["time_spent_minutes"] = 10

    import time
    time.sleep(0.1)  # Small delay to ensure different timestamp

    response2 = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=progress_data,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response2.status_code == 200
    second_save_time = response2.json()["last_saved_at"]

    # Timestamps should be different
    assert second_save_time != first_save_time

    # Verify database
    session.refresh(in_progress_assignment_student)
    assert in_progress_assignment_student.progress_json["answer"] == "second_save"


def test_save_progress_idempotent_behavior(
    client: TestClient,
    session: Session,
    student_token: str,
    in_progress_assignment_student: AssignmentStudent,
):
    """Test multiple saves work correctly (idempotent)."""
    # First save
    progress_data_1 = {
        "partial_answers_json": {"answer": "version1"},
        "time_spent_minutes": 5,
    }
    response1 = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=progress_data_1,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response1.status_code == 200

    # Second save (overwrites)
    progress_data_2 = {
        "partial_answers_json": {"answer": "version2"},
        "time_spent_minutes": 10,
    }
    response2 = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=progress_data_2,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response2.status_code == 200

    # Third save (overwrites again)
    progress_data_3 = {
        "partial_answers_json": {"answer": "version3"},
        "time_spent_minutes": 15,
    }
    response3 = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=progress_data_3,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response3.status_code == 200

    # Verify final state
    session.refresh(in_progress_assignment_student)
    assert in_progress_assignment_student.progress_json["answer"] == "version3"
    assert in_progress_assignment_student.time_spent_minutes == 15


def test_save_progress_time_spent_validation(
    client: TestClient,
    student_token: str,
    in_progress_assignment_student: AssignmentStudent,
):
    """Test time_spent_minutes validation (must be non-negative)."""
    progress_data = {
        "partial_answers_json": {"answer": "test"},
        "time_spent_minutes": -5,  # Invalid: negative
    }

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=progress_data,
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 422  # Validation error


def test_progress_json_cleared_after_submission(
    client: TestClient,
    session: Session,
    student_token: str,
    in_progress_assignment_student: AssignmentStudent,
):
    """
    Test AC 13: Verify progress_json is cleared after successful submission.

    This ensures that only answers_json is retained for completed assignments,
    while progress_json (used only during in-progress state) is cleared.
    """
    # Step 1: Save progress first
    progress_data = {
        "partial_answers_json": {"question_1": "partial_answer", "question_2": "partial_answer_2"},
        "time_spent_minutes": 10,
    }

    save_response = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=progress_data,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert save_response.status_code == 200

    # Verify progress was saved
    session.refresh(in_progress_assignment_student)
    assert in_progress_assignment_student.progress_json is not None
    assert in_progress_assignment_student.progress_json == progress_data["partial_answers_json"]

    # Step 2: Submit the assignment
    submit_data = {
        "answers_json": {"question_1": "final_answer", "question_2": "final_answer_2"},
        "score": 85.0,
        "time_spent_minutes": 15,
    }

    submit_response = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/submit",
        json=submit_data,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert submit_response.status_code == 200

    # Step 3: Verify progress_json is cleared, answers_json is populated
    session.refresh(in_progress_assignment_student)
    assert in_progress_assignment_student.status == AssignmentStatus.completed
    assert in_progress_assignment_student.progress_json is None  # CLEARED
    assert in_progress_assignment_student.answers_json is not None  # POPULATED
    assert in_progress_assignment_student.answers_json == submit_data["answers_json"]
    assert in_progress_assignment_student.score == 85.0
    assert in_progress_assignment_student.completed_at is not None


def test_save_progress_payload_size_limit(
    client: TestClient,
    student_token: str,
    in_progress_assignment_student: AssignmentStudent,
):
    """
    Test payload size validation (Story 4.8 QA Fix).

    Verify that payloads exceeding 100KB are rejected with a validation error.
    This prevents DoS attacks with excessively large progress payloads.
    """
    # Create a large payload that exceeds 100KB
    # Each entry is roughly 50 bytes, so we need about 2100 entries to exceed 100KB
    large_payload = {f"question_{i}": "a" * 50 for i in range(2500)}

    progress_data = {
        "partial_answers_json": large_payload,
        "time_spent_minutes": 10,
    }

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=progress_data,
        headers={"Authorization": f"Bearer {student_token}"},
    )

    # Should return 422 (validation error)
    assert response.status_code == 422
    error_detail = response.json()["detail"]

    # Verify error message mentions size limit
    # Pydantic wraps the error, so we need to check the nested structure
    assert any(
        "exceeds maximum" in str(err).lower() or "100kb" in str(err).lower()
        for err in error_detail
    )


def test_save_progress_payload_size_within_limit(
    client: TestClient,
    session: Session,
    student_token: str,
    in_progress_assignment_student: AssignmentStudent,
):
    """
    Test that payloads within the 100KB limit are accepted.

    This verifies the validation doesn't reject valid payloads.
    """
    # Create a moderately sized payload well within the limit (~50KB)
    reasonable_payload = {f"question_{i}": "answer_" + ("x" * 20) for i in range(1000)}

    progress_data = {
        "partial_answers_json": reasonable_payload,
        "time_spent_minutes": 10,
    }

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{in_progress_assignment_student.assignment_id}/save-progress",
        json=progress_data,
        headers={"Authorization": f"Bearer {student_token}"},
    )

    # Should succeed
    assert response.status_code == 200
    assert response.json()["message"] == "Progress saved successfully"

    # Verify data was saved correctly
    session.refresh(in_progress_assignment_student)
    assert in_progress_assignment_student.progress_json == reasonable_payload
