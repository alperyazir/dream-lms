"""
Integration tests for Teacher Feedback API endpoints (Story 6.4).

Tests cover:
- POST /api/v1/assignments/{assignment_id}/students/{student_id}/feedback - Create feedback
- GET /api/v1/assignments/{assignment_id}/students/{student_id}/feedback - Get feedback
- PUT /api/v1/assignments/feedback/{feedback_id} - Update feedback
- Authorization: Teacher can only give feedback on their own assignments
- Draft vs Published feedback visibility
- Notification sending behavior
"""

import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    Assignment,
    AssignmentStatus,
    AssignmentStudent,
    Book,
    BookStatus,
    Class,
    ClassStudent,
    Feedback,
    Notification,
    NotificationType,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


@pytest.fixture(name="feedback_setup")
def feedback_setup_fixture(session: Session):
    """
    Create a complete setup for feedback tests:
    - Publisher with school
    - Teacher with class and assignment
    - Student enrolled in class with completed assignment
    - A second teacher (unauthorized) for access control tests
    """
    # Create publisher
    pub_user = User(
        id=uuid.uuid4(),
        email="fbpublisher@example.com",
        username="fbpublisher",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Feedback Publisher",
    )
    session.add(pub_user)
    session.commit()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Feedback Test Publisher",
    )
    session.add(publisher)
    session.commit()

    # Create school
    school = School(
        id=uuid.uuid4(),
        name="Feedback Test School",
        publisher_id=publisher.id,
    )
    session.add(school)
    session.commit()

    # Create teacher
    teacher_user = User(
        id=uuid.uuid4(),
        email="fbteacher@example.com",
        username="fbteacher",
        hashed_password=get_password_hash("teacherpassword"),
        role=UserRole.teacher,
        full_name="Feedback Teacher",
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Feedback Testing",
    )
    session.add(teacher)
    session.commit()

    # Create second teacher (unauthorized)
    other_teacher_user = User(
        id=uuid.uuid4(),
        email="otherteacher@example.com",
        username="otherteacher",
        hashed_password=get_password_hash("teacherpassword"),
        role=UserRole.teacher,
        full_name="Other Teacher",
    )
    session.add(other_teacher_user)
    session.commit()

    other_teacher = Teacher(
        id=uuid.uuid4(),
        user_id=other_teacher_user.id,
        school_id=school.id,
        subject_specialization="Other Subject",
    )
    session.add(other_teacher)
    session.commit()

    # Create class
    test_class = Class(
        id=uuid.uuid4(),
        name="Feedback Test Class",
        teacher_id=teacher.id,
        school_id=school.id,
        grade_level="5",
        subject="Feedback Testing",
        academic_year="2025",
        is_active=True,
    )
    session.add(test_class)
    session.commit()

    # Create student
    student_user = User(
        id=uuid.uuid4(),
        email="fbstudent@example.com",
        username="fbstudent",
        hashed_password=get_password_hash("studentpassword"),
        role=UserRole.student,
        full_name="Feedback Student",
    )
    session.add(student_user)
    session.commit()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        grade_level="5",
    )
    session.add(student)
    session.commit()

    # Enroll student in class
    class_student = ClassStudent(
        id=uuid.uuid4(),
        class_id=test_class.id,
        student_id=student.id,
    )
    session.add(class_student)
    session.commit()

    # Create book for assignment
    book = Book(
        id=uuid.uuid4(),
        publisher_id=publisher.id,
        dream_storage_id="test-book-feedback-123",
        title="Feedback Test Book",
        book_name="Feedback Test Book",
        publisher_name="Test Publisher",
        status=BookStatus.published,
    )
    session.add(book)
    session.commit()

    # Create assignment
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        book_id=book.id,
        name="Feedback Test Assignment",
    )
    session.add(assignment)
    session.commit()

    # Create assignment student with completed status
    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=assignment.id,
        student_id=student.id,
        status=AssignmentStatus.completed,
        score=85,
        started_at=datetime.now(UTC),
        completed_at=datetime.now(UTC),
    )
    session.add(assignment_student)
    session.commit()

    return {
        "teacher_user": teacher_user,
        "teacher": teacher,
        "other_teacher_user": other_teacher_user,
        "other_teacher": other_teacher,
        "student_user": student_user,
        "student": student,
        "assignment": assignment,
        "assignment_student": assignment_student,
        "class": test_class,
    }


@pytest.fixture(name="fb_teacher_token")
def fb_teacher_token_fixture(client: TestClient, feedback_setup) -> str:
    """Get access token for feedback teacher."""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": "fbteacher@example.com", "password": "teacherpassword"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(name="other_teacher_token")
def other_teacher_token_fixture(client: TestClient, feedback_setup) -> str:
    """Get access token for unauthorized teacher."""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": "otherteacher@example.com", "password": "teacherpassword"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(name="fb_student_token")
def fb_student_token_fixture(client: TestClient, feedback_setup) -> str:
    """Get access token for feedback student."""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": "fbstudent@example.com", "password": "studentpassword"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


# Tests for POST /api/v1/assignments/{assignment_id}/students/{student_id}/feedback


def test_teacher_create_feedback_success(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that teacher can create feedback for their own assignment."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Great work on this assignment!",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["feedback_text"] == "Great work on this assignment!"
    assert data["is_draft"] is False
    assert data["assignment_id"] == str(assignment.id)
    assert data["student_id"] == str(student.id)
    assert data["teacher_name"] == "Feedback Teacher"


def test_teacher_create_draft_feedback(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that teacher can create draft feedback."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Draft feedback - work in progress",
            "is_draft": True,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["feedback_text"] == "Draft feedback - work in progress"
    assert data["is_draft"] is True


def test_unauthorized_teacher_cannot_create_feedback(
    client: TestClient,
    feedback_setup,
    other_teacher_token: str,
):
    """Test that teacher cannot create feedback for another teacher's assignment."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Unauthorized feedback attempt",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {other_teacher_token}"},
    )

    # Returns 404 for security (don't reveal if assignment exists)
    assert response.status_code == 404


def test_student_cannot_create_feedback(
    client: TestClient,
    feedback_setup,
    fb_student_token: str,
):
    """Test that students cannot create feedback."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Student trying to create feedback",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_student_token}"},
    )

    # Students should get 403 (teachers only endpoint)
    assert response.status_code == 403


def test_create_feedback_nonexistent_assignment(
    client: TestClient,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test creating feedback for non-existent assignment returns 404."""
    student = feedback_setup["student"]
    fake_assignment_id = uuid.uuid4()

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{fake_assignment_id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Feedback for non-existent assignment",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 404


def test_create_feedback_nonexistent_student(
    client: TestClient,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test creating feedback for non-existent student returns 404."""
    assignment = feedback_setup["assignment"]
    fake_student_id = uuid.uuid4()

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{fake_student_id}/feedback",
        json={
            "feedback_text": "Feedback for non-existent student",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 404


def test_create_feedback_text_validation(
    client: TestClient,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that feedback text exceeding max length is rejected."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Create text longer than 1000 characters
    long_text = "x" * 1001

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": long_text,
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 422


def test_update_existing_feedback(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that creating feedback for existing record updates it instead."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Create initial feedback
    response1 = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Initial feedback",
            "is_draft": True,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )
    assert response1.status_code == 201
    initial_id = response1.json()["id"]

    # Create second feedback (should update)
    response2 = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Updated feedback",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )
    assert response2.status_code == 201
    data = response2.json()
    assert data["id"] == initial_id  # Same ID, meaning it was updated
    assert data["feedback_text"] == "Updated feedback"
    assert data["is_draft"] is False


# Tests for GET /api/v1/assignments/{assignment_id}/students/{student_id}/feedback


def test_teacher_get_feedback_success(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that teacher can get feedback they created."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Create feedback first
    client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Feedback to retrieve",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    # Get feedback
    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["feedback_text"] == "Feedback to retrieve"


def test_student_can_view_published_feedback(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
    fb_student_token: str,
):
    """Test that student can view published feedback for their assignment."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Teacher creates published feedback
    client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Published feedback for student",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    # Student retrieves feedback
    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        headers={"Authorization": f"Bearer {fb_student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["feedback_text"] == "Published feedback for student"
    assert "teacher_name" in data


def test_student_cannot_view_draft_feedback(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
    fb_student_token: str,
):
    """Test that student cannot view draft feedback."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Teacher creates draft feedback
    client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Draft feedback - student should not see",
            "is_draft": True,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    # Student tries to retrieve feedback
    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        headers={"Authorization": f"Bearer {fb_student_token}"},
    )

    # Should return 404 since draft is not visible to student
    assert response.status_code == 404


def test_teacher_can_view_draft_feedback(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that teacher can view their own draft feedback."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Teacher creates draft feedback
    client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Draft feedback - teacher should see",
            "is_draft": True,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    # Teacher retrieves feedback
    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_draft"] is True


def test_get_nonexistent_feedback(
    client: TestClient,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test getting feedback when none exists returns 404."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 404


# Tests for PUT /api/v1/assignments/feedback/{feedback_id}


def test_update_feedback_text(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that teacher can update feedback text."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Create feedback
    create_response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Original feedback",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )
    feedback_id = create_response.json()["id"]

    # Update feedback
    response = client.put(
        f"{settings.API_V1_STR}/assignments/feedback/{feedback_id}",
        json={
            "feedback_text": "Updated feedback text",
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["feedback_text"] == "Updated feedback text"


def test_update_feedback_draft_status(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that teacher can change feedback draft status."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Create draft feedback
    create_response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Draft feedback",
            "is_draft": True,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )
    feedback_id = create_response.json()["id"]

    # Update to publish
    response = client.put(
        f"{settings.API_V1_STR}/assignments/feedback/{feedback_id}",
        json={
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_draft"] is False


def test_unauthorized_teacher_cannot_update_feedback(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
    other_teacher_token: str,
):
    """Test that unauthorized teacher cannot update another teacher's feedback."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Create feedback as authorized teacher
    create_response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Original feedback",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )
    feedback_id = create_response.json()["id"]

    # Try to update as unauthorized teacher
    response = client.put(
        f"{settings.API_V1_STR}/assignments/feedback/{feedback_id}",
        json={
            "feedback_text": "Unauthorized update attempt",
        },
        headers={"Authorization": f"Bearer {other_teacher_token}"},
    )

    assert response.status_code == 404  # Returns 404 to avoid leaking existence


def test_update_nonexistent_feedback(
    client: TestClient,
    fb_teacher_token: str,
):
    """Test updating non-existent feedback returns 404."""
    fake_feedback_id = uuid.uuid4()

    response = client.put(
        f"{settings.API_V1_STR}/assignments/feedback/{fake_feedback_id}",
        json={
            "feedback_text": "Update to nothing",
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 404


# Tests for Notification behavior


def test_published_feedback_creates_notification(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that publishing feedback creates a notification for the student."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]
    student_user = feedback_setup["student_user"]

    # Create published feedback
    client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Great job!",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    # Check notification was created
    query = select(Notification).where(
        Notification.user_id == student_user.id,
        Notification.type == NotificationType.feedback_received,
    )
    result = session.execute(query)
    notification = result.scalar_one_or_none()

    assert notification is not None
    assert "Feedback Test Assignment" in notification.message


def test_draft_feedback_does_not_create_notification(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that saving draft feedback does NOT create a notification."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]
    student_user = feedback_setup["student_user"]

    # Create draft feedback
    client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Work in progress",
            "is_draft": True,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    # Check no notification was created
    query = select(Notification).where(
        Notification.user_id == student_user.id,
        Notification.type == NotificationType.feedback_received,
    )
    result = session.execute(query)
    notification = result.scalar_one_or_none()

    assert notification is None


def test_publishing_draft_creates_notification(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that publishing a draft creates a notification."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]
    student_user = feedback_setup["student_user"]

    # Create draft feedback
    create_response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Draft to publish",
            "is_draft": True,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )
    feedback_id = create_response.json()["id"]

    # Verify no notification yet
    query = select(Notification).where(
        Notification.user_id == student_user.id,
        Notification.type == NotificationType.feedback_received,
    )
    result = session.execute(query)
    assert result.scalar_one_or_none() is None

    # Publish the draft
    client.put(
        f"{settings.API_V1_STR}/assignments/feedback/{feedback_id}",
        json={
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    # Now notification should exist
    session.expire_all()  # Refresh session
    result = session.execute(query)
    notification = result.scalar_one_or_none()

    assert notification is not None


# Tests for XSS Protection


def test_feedback_xss_sanitization(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that XSS content in feedback is sanitized."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Attempt to inject XSS
    malicious_text = '<script>alert("xss")</script>Great work!'

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": malicious_text,
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    # Script tags should be stripped
    assert "<script>" not in data["feedback_text"]
    assert "Great work!" in data["feedback_text"]


def test_feedback_allows_safe_html(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that safe HTML tags are preserved in feedback."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Safe HTML content
    safe_html = "<p>Great work!</p><strong>Keep it up!</strong><em>Well done</em>"

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": safe_html,
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    # Safe tags should be preserved
    assert "<p>" in data["feedback_text"]
    assert "<strong>" in data["feedback_text"]
    assert "<em>" in data["feedback_text"]


# =============================================================================
# Tests for GET /api/v1/assignments/{assignment_id}/my-feedback
# =============================================================================


def test_student_get_my_feedback_success(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
    fb_student_token: str,
):
    """Test that student can get their own feedback using my-feedback endpoint."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Teacher creates published feedback
    client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Great job on this assignment!",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    # Student gets their feedback using my-feedback endpoint
    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/my-feedback",
        headers={"Authorization": f"Bearer {fb_student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["feedback_text"] == "Great job on this assignment!"
    # Should have teacher_name but NOT teacher_id (student view)
    assert "teacher_name" in data
    assert "teacher_id" not in data


def test_student_get_my_feedback_no_feedback(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_student_token: str,
):
    """Test that student gets null when no feedback exists."""
    assignment = feedback_setup["assignment"]

    # Student gets their feedback when none exists
    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/my-feedback",
        headers={"Authorization": f"Bearer {fb_student_token}"},
    )

    # Should return 200 with null/None
    assert response.status_code == 200
    assert response.json() is None


def test_student_get_my_feedback_draft_not_visible(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
    fb_student_token: str,
):
    """Test that student cannot see draft feedback via my-feedback endpoint."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Teacher creates draft feedback
    client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Work in progress - draft",
            "is_draft": True,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    # Student tries to get their feedback
    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/my-feedback",
        headers={"Authorization": f"Bearer {fb_student_token}"},
    )

    # Should return 200 with null since draft is not visible
    assert response.status_code == 200
    assert response.json() is None


def test_teacher_cannot_use_my_feedback_endpoint(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that teacher cannot use the my-feedback endpoint (student only)."""
    assignment = feedback_setup["assignment"]

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/my-feedback",
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    # Teachers are forbidden from this endpoint
    assert response.status_code == 403


# ============================================================================
# Story 6.5: Badge and Emoji Reaction Tests
# ============================================================================


def test_create_feedback_with_badges(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test creating feedback with badges (Story 6.5, AC: 7)."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Excellent work!",
            "badges": ["perfect_score", "hard_worker"],
            "emoji_reaction": "star",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert "perfect_score" in data["badges"]
    assert "hard_worker" in data["badges"]
    assert "star" in data["emoji_reactions"]


def test_invalid_badge_rejected(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that invalid badge slugs are rejected (Story 6.5, AC: 2)."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Good work!",
            "badges": ["invalid_badge_type"],
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 422


def test_invalid_emoji_rejected(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that invalid emoji reactions are rejected (Story 6.5, AC: 5)."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Good work!",
            "emoji_reaction": "invalid_emoji",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert response.status_code == 422


def test_update_feedback_badges(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test updating feedback badges (Story 6.5, AC: 13)."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Create feedback first
    create_response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Good work!",
            "badges": ["hard_worker"],
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )
    assert create_response.status_code == 201
    feedback_id = create_response.json()["id"]

    # Update badges
    update_response = client.put(
        f"{settings.API_V1_STR}/assignments/feedback/{feedback_id}",
        json={
            "badges": ["perfect_score", "fast_learner"],
            "emoji_reaction": "fire",
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert update_response.status_code == 200
    data = update_response.json()
    assert "perfect_score" in data["badges"]
    assert "fast_learner" in data["badges"]
    assert "hard_worker" not in data["badges"]
    assert "fire" in data["emoji_reactions"]


def test_remove_badges_by_empty_array(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test removing badges by passing empty array (Story 6.5, AC: 13)."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Create feedback with badges
    create_response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Good work!",
            "badges": ["hard_worker", "creative_thinking"],
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )
    assert create_response.status_code == 201
    feedback_id = create_response.json()["id"]

    # Remove all badges
    update_response = client.put(
        f"{settings.API_V1_STR}/assignments/feedback/{feedback_id}",
        json={
            "badges": [],
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    assert update_response.status_code == 200
    data = update_response.json()
    assert data["badges"] == []


def test_badge_notification_includes_badge_names(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that notification includes badge names when awarded (Story 6.5, AC: 11)."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Create feedback with badges
    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Amazing work!",
            "badges": ["perfect_score"],
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )
    assert response.status_code == 201

    # Check notification was created with badge name
    notification = session.exec(
        select(Notification)
        .where(Notification.user_id == feedback_setup["student_user"].id)
        .where(Notification.type == NotificationType.feedback_received)
        .order_by(Notification.created_at.desc())
    ).first()

    assert notification is not None
    assert "Perfect Score" in notification.message
    assert "badge" in notification.message.lower()


def test_get_feedback_options_endpoint(
    client: TestClient,
):
    """Test GET /api/v1/feedback/options returns badges and emoji (Story 6.5)."""
    response = client.get(f"{settings.API_V1_STR}/feedback/options")

    assert response.status_code == 200
    data = response.json()

    # Verify 6 predefined badges
    assert len(data["badges"]) == 6
    badge_slugs = [b["slug"] for b in data["badges"]]
    assert "perfect_score" in badge_slugs
    assert "great_improvement" in badge_slugs
    assert "creative_thinking" in badge_slugs
    assert "hard_worker" in badge_slugs
    assert "fast_learner" in badge_slugs
    assert "needs_review" in badge_slugs

    # Verify 6 emoji reactions
    assert len(data["emoji_reactions"]) == 6
    emoji_slugs = [e["slug"] for e in data["emoji_reactions"]]
    assert "thumbs_up" in emoji_slugs
    assert "heart" in emoji_slugs
    assert "star" in emoji_slugs
    assert "party" in emoji_slugs
    assert "fire" in emoji_slugs
    assert "hundred" in emoji_slugs


def test_max_six_badges_enforced(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
):
    """Test that maximum 6 badges are enforced (Story 6.5)."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Try to add 7 badges (more than allowed)
    response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Great work!",
            "badges": [
                "perfect_score",
                "great_improvement",
                "creative_thinking",
                "hard_worker",
                "fast_learner",
                "needs_review",
                "perfect_score",  # 7th badge (duplicate but still counts)
            ],
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    # Should fail validation
    assert response.status_code == 422


def test_student_can_view_badges_in_feedback(
    client: TestClient,
    session: Session,
    feedback_setup,
    fb_teacher_token: str,
    fb_student_token: str,
):
    """Test that student can view badges in their feedback (Story 6.5, AC: 8)."""
    assignment = feedback_setup["assignment"]
    student = feedback_setup["student"]

    # Teacher creates feedback with badges
    client.post(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student.id}/feedback",
        json={
            "feedback_text": "Great job!",
            "badges": ["perfect_score", "fast_learner"],
            "emoji_reaction": "star",
            "is_draft": False,
        },
        headers={"Authorization": f"Bearer {fb_teacher_token}"},
    )

    # Student views their feedback
    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/my-feedback",
        headers={"Authorization": f"Bearer {fb_student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "perfect_score" in data["badges"]
    assert "fast_learner" in data["badges"]
    assert "star" in data["emoji_reactions"]
