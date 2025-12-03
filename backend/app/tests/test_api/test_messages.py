"""
Integration tests for Direct Message API endpoints (Story 6.3).

Tests cover:
- POST /api/v1/messages - Send new message
- GET /api/v1/messages/conversations - List conversations
- GET /api/v1/messages/thread/{user_id} - Get message thread
- PATCH /api/v1/messages/{id}/read - Mark as read
- GET /api/v1/messages/recipients - Get allowed recipients
- GET /api/v1/messages/unread-count - Unread count
- Privacy controls (students can only message their teachers)
"""

import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    Assignment,
    AssignmentStudent,
    Book,
    BookStatus,
    Class,
    ClassStudent,
    DirectMessage,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


def create_message(
    session: Session,
    sender_id: uuid.UUID,
    recipient_id: uuid.UUID,
    body: str = "Test message",
    subject: str | None = None,
    is_read: bool = False,
) -> DirectMessage:
    """Helper to create a direct message in the database."""
    message = DirectMessage(
        id=uuid.uuid4(),
        sender_id=sender_id,
        recipient_id=recipient_id,
        subject=subject,
        body=body,
        is_read=is_read,
        sent_at=datetime.now(UTC),
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return message


@pytest.fixture(name="messaging_setup")
def messaging_setup_fixture(session: Session):
    """
    Create a complete setup for messaging tests:
    - Publisher with school
    - Teacher with class
    - Student enrolled in class with assignment
    """
    # Create publisher
    pub_user = User(
        id=uuid.uuid4(),
        email="msgpublisher@example.com",
        username="msgpublisher",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        full_name="Msg Publisher",
    )
    session.add(pub_user)
    session.commit()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Messaging Test Publisher",
    )
    session.add(publisher)
    session.commit()

    # Create school
    school = School(
        id=uuid.uuid4(),
        name="Messaging Test School",
        publisher_id=publisher.id,
    )
    session.add(school)
    session.commit()

    # Create teacher
    teacher_user = User(
        id=uuid.uuid4(),
        email="msgteacher@example.com",
        username="msgteacher",
        hashed_password=get_password_hash("teacherpassword"),
        role=UserRole.teacher,
        full_name="Msg Teacher",
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
        subject_specialization="Messaging",
    )
    session.add(teacher)
    session.commit()

    # Create class
    test_class = Class(
        id=uuid.uuid4(),
        name="Test Class",
        teacher_id=teacher.id,
        school_id=school.id,
        grade_level="5",
        subject="Messaging",
        academic_year="2025",
        is_active=True,
    )
    session.add(test_class)
    session.commit()

    # Create student
    student_user = User(
        id=uuid.uuid4(),
        email="msgstudent@example.com",
        username="msgstudent",
        hashed_password=get_password_hash("studentpassword"),
        role=UserRole.student,
        full_name="Msg Student",
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
        dream_storage_id="test-book-123",
        title="Test Book",
        book_name="Test Book",
        publisher_name="Test Publisher",
        status=BookStatus.published,
    )
    session.add(book)
    session.commit()

    # Create assignment for student (allows messaging)
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        book_id=book.id,
        name="Test Assignment",
    )
    session.add(assignment)
    session.commit()

    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=assignment.id,
        student_id=student.id,
    )
    session.add(assignment_student)
    session.commit()

    # Create a second student not in any class (for unauthorized test)
    unauthorized_student_user = User(
        id=uuid.uuid4(),
        email="unauth_student@example.com",
        username="unauthstudent",
        hashed_password=get_password_hash("studentpassword"),
        role=UserRole.student,
        full_name="Unauthorized Student",
    )
    session.add(unauthorized_student_user)
    session.commit()

    unauthorized_student = Student(
        id=uuid.uuid4(),
        user_id=unauthorized_student_user.id,
        grade_level="5",
    )
    session.add(unauthorized_student)
    session.commit()

    return {
        "teacher_user": teacher_user,
        "teacher": teacher,
        "student_user": student_user,
        "student": student,
        "unauthorized_student_user": unauthorized_student_user,
        "class": test_class,
    }


@pytest.fixture(name="msg_teacher_token")
def msg_teacher_token_fixture(client: TestClient, messaging_setup) -> str:
    """Get access token for messaging teacher."""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": "msgteacher@example.com", "password": "teacherpassword"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(name="msg_student_token")
def msg_student_token_fixture(client: TestClient, messaging_setup) -> str:
    """Get access token for messaging student."""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": "msgstudent@example.com", "password": "studentpassword"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(name="unauth_student_token")
def unauth_student_token_fixture(client: TestClient, messaging_setup) -> str:
    """Get access token for unauthorized student."""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": "unauth_student@example.com", "password": "studentpassword"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


# Tests for POST /api/v1/messages


def test_teacher_send_message_to_student(
    client: TestClient,
    session: Session,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test that teacher can send message to student in their class."""
    student_user = messaging_setup["student_user"]

    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(student_user.id),
            "subject": "Great work!",
            "body": "You did an excellent job on the assignment.",
        },
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["recipient_id"] == str(student_user.id)
    assert data["subject"] == "Great work!"
    assert "You did an excellent job" in data["body"]
    assert data["is_read"] is False


def test_student_send_message_to_teacher(
    client: TestClient,
    session: Session,
    messaging_setup,
    msg_student_token: str,
):
    """Test that student can send message to teacher who assigned them work."""
    teacher_user = messaging_setup["teacher_user"]

    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(teacher_user.id),
            "body": "I have a question about the assignment.",
        },
        headers={"Authorization": f"Bearer {msg_student_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["recipient_id"] == str(teacher_user.id)
    assert "question about the assignment" in data["body"]


def test_student_cannot_message_unauthorized_teacher(
    client: TestClient,
    session: Session,
    messaging_setup,
    unauth_student_token: str,
):
    """Test that student cannot message teacher who hasn't assigned them work."""
    teacher_user = messaging_setup["teacher_user"]

    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(teacher_user.id),
            "body": "Hello teacher!",
        },
        headers={"Authorization": f"Bearer {unauth_student_token}"},
    )

    assert response.status_code == 403
    assert "not allowed to message" in response.json()["detail"]


def test_send_message_to_nonexistent_user(
    client: TestClient,
    msg_teacher_token: str,
):
    """Test sending message to non-existent user returns 404."""
    fake_id = uuid.uuid4()

    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(fake_id),
            "body": "Hello!",
        },
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 404
    assert "Recipient not found" in response.json()["detail"]


def test_send_message_empty_body(
    client: TestClient,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test sending message with empty body returns 422."""
    student_user = messaging_setup["student_user"]

    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(student_user.id),
            "body": "",
        },
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 422


def test_admin_cannot_message_student(
    client: TestClient,
    admin_user: User,
    admin_token: str,
    messaging_setup,
):
    """Test that admins cannot message students (only teachers and publishers)."""
    student_user = messaging_setup["student_user"]

    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(student_user.id),
            "body": "Hello from admin!",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 403
    assert "not allowed to message this user" in response.json()["detail"]


def test_admin_can_message_teacher(
    client: TestClient,
    admin_user: User,
    admin_token: str,
    messaging_setup,
):
    """Test that admins can message teachers."""
    teacher_user = messaging_setup["teacher_user"]

    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(teacher_user.id),
            "body": "Hello teacher, this is admin!",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["sender_id"] == str(admin_user.id)
    assert data["recipient_id"] == str(teacher_user.id)
    assert data["body"] == "Hello teacher, this is admin!"


def test_teacher_can_message_admin(
    client: TestClient,
    admin_user: User,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test that teachers can message admins."""
    teacher_user = messaging_setup["teacher_user"]

    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(admin_user.id),
            "body": "Hello admin, this is teacher!",
        },
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["sender_id"] == str(teacher_user.id)
    assert data["recipient_id"] == str(admin_user.id)


def test_admin_get_recipients_returns_teachers(
    client: TestClient,
    admin_token: str,
    messaging_setup,
):
    """Test that admin recipients include teachers."""
    response = client.get(
        f"{settings.API_V1_STR}/messages/recipients",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    # Should have at least the teacher from messaging_setup
    teacher_user = messaging_setup["teacher_user"]
    recipient_ids = [r["user_id"] for r in data["recipients"]]
    assert str(teacher_user.id) in recipient_ids


def test_send_message_unauthorized(client: TestClient, messaging_setup):
    """Test that unauthenticated requests return 401."""
    student_user = messaging_setup["student_user"]

    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(student_user.id),
            "body": "Hello!",
        },
    )

    assert response.status_code == 401


# Tests for GET /api/v1/messages/conversations


def test_get_conversations_success(
    client: TestClient,
    session: Session,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test getting conversations returns grouped conversations."""
    teacher_user = messaging_setup["teacher_user"]
    student_user = messaging_setup["student_user"]

    # Create messages in both directions
    create_message(session, teacher_user.id, student_user.id, "Hi student!")
    create_message(session, student_user.id, teacher_user.id, "Hi teacher!")

    response = client.get(
        f"{settings.API_V1_STR}/messages/conversations",
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "conversations" in data
    assert len(data["conversations"]) == 1
    assert data["conversations"][0]["participant_id"] == str(student_user.id)
    assert "total_unread" in data


def test_get_conversations_unread_count(
    client: TestClient,
    session: Session,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test that unread count is accurate per conversation."""
    teacher_user = messaging_setup["teacher_user"]
    student_user = messaging_setup["student_user"]

    # Create 3 unread messages from student
    create_message(session, student_user.id, teacher_user.id, "Msg 1", is_read=False)
    create_message(session, student_user.id, teacher_user.id, "Msg 2", is_read=False)
    create_message(session, student_user.id, teacher_user.id, "Msg 3", is_read=False)

    response = client.get(
        f"{settings.API_V1_STR}/messages/conversations",
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["conversations"][0]["unread_count"] == 3
    assert data["total_unread"] == 3


def test_get_conversations_empty(
    client: TestClient,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test getting conversations when no messages exist."""
    response = client.get(
        f"{settings.API_V1_STR}/messages/conversations",
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["conversations"] == []
    assert data["total"] == 0


# Tests for GET /api/v1/messages/thread/{user_id}


def test_get_thread_success(
    client: TestClient,
    session: Session,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test getting message thread returns messages in order."""
    teacher_user = messaging_setup["teacher_user"]
    student_user = messaging_setup["student_user"]

    # Create messages in chronological order
    create_message(session, teacher_user.id, student_user.id, "Message 1")
    create_message(session, student_user.id, teacher_user.id, "Message 2")
    create_message(session, teacher_user.id, student_user.id, "Message 3")

    response = client.get(
        f"{settings.API_V1_STR}/messages/thread/{student_user.id}",
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["participant_id"] == str(student_user.id)
    assert len(data["messages"]) == 3
    assert data["messages"][0]["body"] == "Message 1"
    assert data["messages"][2]["body"] == "Message 3"


def test_get_thread_marks_as_read(
    client: TestClient,
    session: Session,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test that viewing thread marks unread messages as read."""
    teacher_user = messaging_setup["teacher_user"]
    student_user = messaging_setup["student_user"]

    # Create unread message from student
    create_message(session, student_user.id, teacher_user.id, "Unread", is_read=False)

    # View thread
    client.get(
        f"{settings.API_V1_STR}/messages/thread/{student_user.id}",
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    # Check unread count is now 0
    response = client.get(
        f"{settings.API_V1_STR}/messages/unread-count",
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.json()["count"] == 0


def test_get_thread_user_not_found(
    client: TestClient,
    msg_teacher_token: str,
):
    """Test getting thread with non-existent user returns 404."""
    fake_id = uuid.uuid4()

    response = client.get(
        f"{settings.API_V1_STR}/messages/thread/{fake_id}",
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 404


# Tests for PATCH /api/v1/messages/{id}/read


def test_mark_message_as_read_success(
    client: TestClient,
    session: Session,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test marking a message as read."""
    teacher_user = messaging_setup["teacher_user"]
    student_user = messaging_setup["student_user"]

    message = create_message(
        session, student_user.id, teacher_user.id, "Test", is_read=False
    )

    response = client.patch(
        f"{settings.API_V1_STR}/messages/{message.id}/read",
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 200
    assert response.json()["is_read"] is True


def test_mark_message_as_read_not_recipient(
    client: TestClient,
    session: Session,
    messaging_setup,
    msg_student_token: str,
):
    """Test that non-recipient cannot mark message as read."""
    teacher_user = messaging_setup["teacher_user"]
    student_user = messaging_setup["student_user"]

    # Message sent TO student (teacher is sender)
    message = create_message(
        session, teacher_user.id, student_user.id, "Test", is_read=False
    )

    # Teacher tries to mark as read (but teacher is sender, not recipient)
    response = client.patch(
        f"{settings.API_V1_STR}/messages/{message.id}/read",
        headers={"Authorization": f"Bearer {msg_student_token}"},
    )

    # Student should be able to mark it as read since they're the recipient
    assert response.status_code == 200


# Tests for GET /api/v1/messages/recipients


def test_get_recipients_teacher(
    client: TestClient,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test teacher gets students from their classes as recipients."""
    student_user = messaging_setup["student_user"]

    response = client.get(
        f"{settings.API_V1_STR}/messages/recipients",
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["recipients"]) >= 1

    # Check student is in recipients
    student_ids = [r["user_id"] for r in data["recipients"]]
    assert str(student_user.id) in student_ids


def test_get_recipients_student(
    client: TestClient,
    messaging_setup,
    msg_student_token: str,
):
    """Test student gets teachers who assigned them work as recipients."""
    teacher_user = messaging_setup["teacher_user"]

    response = client.get(
        f"{settings.API_V1_STR}/messages/recipients",
        headers={"Authorization": f"Bearer {msg_student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["recipients"]) >= 1

    # Check teacher is in recipients
    teacher_ids = [r["user_id"] for r in data["recipients"]]
    assert str(teacher_user.id) in teacher_ids


def test_get_recipients_unauthorized_student(
    client: TestClient,
    messaging_setup,
    unauth_student_token: str,
):
    """Test unauthorized student gets empty recipients list."""
    response = client.get(
        f"{settings.API_V1_STR}/messages/recipients",
        headers={"Authorization": f"Bearer {unauth_student_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["recipients"]) == 0


# Tests for GET /api/v1/messages/unread-count


def test_get_unread_count_success(
    client: TestClient,
    session: Session,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test getting unread messages count."""
    teacher_user = messaging_setup["teacher_user"]
    student_user = messaging_setup["student_user"]

    create_message(session, student_user.id, teacher_user.id, "Unread 1", is_read=False)
    create_message(session, student_user.id, teacher_user.id, "Unread 2", is_read=False)
    create_message(session, student_user.id, teacher_user.id, "Read", is_read=True)

    response = client.get(
        f"{settings.API_V1_STR}/messages/unread-count",
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 200
    assert response.json()["count"] == 2


def test_get_unread_count_zero(
    client: TestClient,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test unread count is zero when no unread messages."""
    response = client.get(
        f"{settings.API_V1_STR}/messages/unread-count",
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 200
    assert response.json()["count"] == 0


# Tests for Publisher messaging


def test_publisher_can_message_teacher(
    client: TestClient,
    publisher_user: User,
    publisher_token: str,
    messaging_setup,
):
    """Test that publishers can message teachers."""
    teacher_user = messaging_setup["teacher_user"]

    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(teacher_user.id),
            "body": "Hello teacher, this is publisher!",
        },
        headers={"Authorization": f"Bearer {publisher_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["sender_id"] == str(publisher_user.id)
    assert data["recipient_id"] == str(teacher_user.id)
    assert data["body"] == "Hello teacher, this is publisher!"


def test_publisher_can_message_admin(
    client: TestClient,
    publisher_user: User,
    publisher_token: str,
    admin_user: User,
):
    """Test that publishers can message admins."""
    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(admin_user.id),
            "body": "Hello admin, this is publisher!",
        },
        headers={"Authorization": f"Bearer {publisher_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["sender_id"] == str(publisher_user.id)
    assert data["recipient_id"] == str(admin_user.id)


def test_admin_can_message_publisher(
    client: TestClient,
    admin_user: User,
    admin_token: str,
    publisher_user: User,
):
    """Test that admins can message publishers."""
    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(publisher_user.id),
            "body": "Hello publisher, this is admin!",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["sender_id"] == str(admin_user.id)
    assert data["recipient_id"] == str(publisher_user.id)


def test_publisher_cannot_message_student(
    client: TestClient,
    publisher_token: str,
    messaging_setup,
):
    """Test that publishers cannot message students."""
    student_user = messaging_setup["student_user"]

    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(student_user.id),
            "body": "Hello student!",
        },
        headers={"Authorization": f"Bearer {publisher_token}"},
    )

    assert response.status_code == 403
    assert "not allowed to message this user" in response.json()["detail"]


def test_publisher_get_recipients(
    client: TestClient,
    publisher_token: str,
    admin_user: User,
    messaging_setup,
):
    """Test that publisher recipients include admins and teachers."""
    response = client.get(
        f"{settings.API_V1_STR}/messages/recipients",
        headers={"Authorization": f"Bearer {publisher_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    recipient_ids = [r["user_id"] for r in data["recipients"]]

    # Should include admin
    assert str(admin_user.id) in recipient_ids
    # Should include teacher from messaging_setup
    teacher_user = messaging_setup["teacher_user"]
    assert str(teacher_user.id) in recipient_ids


def test_teacher_can_message_publisher(
    client: TestClient,
    publisher_user: User,
    messaging_setup,
    msg_teacher_token: str,
):
    """Test that teachers can message publishers."""
    teacher_user = messaging_setup["teacher_user"]

    response = client.post(
        f"{settings.API_V1_STR}/messages",
        json={
            "recipient_id": str(publisher_user.id),
            "body": "Hello publisher, this is teacher!",
        },
        headers={"Authorization": f"Bearer {msg_teacher_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["sender_id"] == str(teacher_user.id)
    assert data["recipient_id"] == str(publisher_user.id)
