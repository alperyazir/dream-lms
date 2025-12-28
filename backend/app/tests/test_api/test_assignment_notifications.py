"""
Integration tests for Assignment Notification triggers (Story 6.2).

Tests cover:
- Assignment creation sends notifications to assigned students
- Assignment submission sends notification to teacher
- Scheduled task endpoint triggers deadline checks
- Correct notification types, titles, messages, and links
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    Activity,
    ActivityType,
    Book,
    BookAccess,
    Class,
    ClassStudent,
    Notification,
    NotificationType,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


def create_full_test_setup(session: Session) -> dict:
    """
    Create a complete test setup with publisher, school, teacher, student,
    book, and activity.

    Returns dict with all created objects.
    """
    # Create publisher
    pub_user = User(
        id=uuid.uuid4(),
        email="publisher@test.com",
        username="testpub",
        hashed_password=get_password_hash("password123"),
        role=UserRole.publisher,
        is_active=True,
        full_name="Test Publisher",
    )
    session.add(pub_user)
    session.commit()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Test Publisher",
    )
    session.add(publisher)
    session.commit()

    # Create school
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        publisher_id=publisher.id,
    )
    session.add(school)
    session.commit()

    # Create teacher
    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@test.com",
        username="testteacher",
        hashed_password=get_password_hash("password123"),
        role=UserRole.teacher,
        is_active=True,
        full_name="Test Teacher",
    )
    session.add(teacher_user)
    session.commit()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id,
    )
    session.add(teacher)
    session.commit()

    # Create student
    student_user = User(
        id=uuid.uuid4(),
        email="student@test.com",
        username="teststudent",
        hashed_password=get_password_hash("password123"),
        role=UserRole.student,
        is_active=True,
        full_name="Test Student",
    )
    session.add(student_user)
    session.commit()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
    )
    session.add(student)
    session.commit()

    # Create book
    book = Book(
        id=uuid.uuid4(),
        publisher_id=publisher.id,
        dream_storage_id="test-book-001",
        title="Test Book",
        book_name="Test Book Name",
        publisher_name="Test Publisher",
        description="A test book",
    )
    session.add(book)
    session.commit()

    # Create book access for publisher
    book_access = BookAccess(
        id=uuid.uuid4(),
        book_id=book.id,
        publisher_id=publisher.id,
    )
    session.add(book_access)
    session.commit()

    # Create activity
    activity = Activity(
        id=uuid.uuid4(),
        book_id=book.id,
        title="Test Activity",
        module_name="Test Module",
        page_number=1,
        section_index=0,
        activity_type=ActivityType.matchTheWords,
        config_json={
            "questions": [
                {
                    "id": "q1",
                    "question": "What is 2+2?",
                    "options": ["3", "4", "5"],
                    "correct": 1,
                }
            ]
        },
        order_index=0,
    )
    session.add(activity)
    session.commit()

    # Create class and enroll student
    class_ = Class(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        school_id=school.id,
        name="Test Class",
        grade_level="5",
    )
    session.add(class_)
    session.commit()

    class_student = ClassStudent(
        class_id=class_.id,
        student_id=student.id,
    )
    session.add(class_student)
    session.commit()

    session.refresh(publisher)
    session.refresh(school)
    session.refresh(teacher_user)
    session.refresh(teacher)
    session.refresh(student_user)
    session.refresh(student)
    session.refresh(book)
    session.refresh(activity)
    session.refresh(class_)

    return {
        "publisher": publisher,
        "school": school,
        "teacher_user": teacher_user,
        "teacher": teacher,
        "student_user": student_user,
        "student": student,
        "book": book,
        "activity": activity,
        "class": class_,
    }


@pytest.fixture(name="test_setup")
def test_setup_fixture(session: Session) -> dict:
    """Create full test setup."""
    return create_full_test_setup(session)


@pytest.fixture(name="teacher_token_full")
def teacher_token_full_fixture(client: TestClient, test_setup: dict) -> str:
    """Get teacher token from full setup."""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": test_setup["teacher_user"].email, "password": "password123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(name="student_token_full")
def student_token_full_fixture(client: TestClient, test_setup: dict) -> str:
    """Get student token from full setup."""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": test_setup["student_user"].email, "password": "password123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


# Tests for assignment creation notifications


def test_create_assignment_sends_notification_to_student(
    client: TestClient,
    session: Session,
    test_setup: dict,
    teacher_token_full: str,
):
    """Test that creating an assignment sends notification to assigned student."""
    activity = test_setup["activity"]
    book = test_setup["book"]
    student = test_setup["student"]
    student_user = test_setup["student_user"]

    # Create assignment
    response = client.post(
        f"{settings.API_V1_STR}/assignments/",
        json={
            "name": "Math Quiz",
            "activity_id": str(activity.id),
            "book_id": str(book.id),
            "student_ids": [str(student.id)],
            "due_date": (datetime.now(UTC) + timedelta(days=3)).isoformat(),
        },
        headers={"Authorization": f"Bearer {teacher_token_full}"},
    )

    assert response.status_code == 201
    assignment_id = response.json()["id"]

    # Verify notification was created
    notifications = session.execute(
        select(Notification).where(Notification.user_id == student_user.id)
    ).scalars().all()

    assert len(notifications) == 1
    notification = notifications[0]
    assert notification.type == NotificationType.assignment_created
    assert "Math Quiz" in notification.title
    assert f"/student/assignments/{assignment_id}" == notification.link


def test_create_assignment_sends_notifications_to_multiple_students(
    client: TestClient,
    session: Session,
    test_setup: dict,
    teacher_token_full: str,
):
    """Test that creating an assignment sends notifications to all assigned students."""
    activity = test_setup["activity"]
    book = test_setup["book"]
    teacher = test_setup["teacher"]
    school = test_setup["school"]

    # Create second student and enroll in teacher's class
    student2_user = User(
        id=uuid.uuid4(),
        email="student2@test.com",
        username="teststudent2",
        hashed_password=get_password_hash("password123"),
        role=UserRole.student,
        is_active=True,
        full_name="Second Student",
    )
    session.add(student2_user)
    session.commit()

    student2 = Student(
        id=uuid.uuid4(),
        user_id=student2_user.id,
    )
    session.add(student2)
    session.commit()

    # Enroll second student in class
    class_ = test_setup["class"]
    class_student2 = ClassStudent(
        class_id=class_.id,
        student_id=student2.id,
    )
    session.add(class_student2)
    session.commit()

    # Create assignment for both students
    student1 = test_setup["student"]
    response = client.post(
        f"{settings.API_V1_STR}/assignments/",
        json={
            "name": "Group Assignment",
            "activity_id": str(activity.id),
            "book_id": str(book.id),
            "student_ids": [str(student1.id), str(student2.id)],
        },
        headers={"Authorization": f"Bearer {teacher_token_full}"},
    )

    assert response.status_code == 201

    # Verify notifications were created for both students
    all_notifications = session.execute(
        select(Notification).where(
            Notification.type == NotificationType.assignment_created
        )
    ).scalars().all()

    # Filter for our students
    student_ids = {test_setup["student_user"].id, student2_user.id}
    student_notifications = [n for n in all_notifications if n.user_id in student_ids]

    assert len(student_notifications) == 2


def test_create_assignment_notification_includes_due_date(
    client: TestClient,
    session: Session,
    test_setup: dict,
    teacher_token_full: str,
):
    """Test that assignment notification includes due date in message."""
    activity = test_setup["activity"]
    book = test_setup["book"]
    student = test_setup["student"]
    student_user = test_setup["student_user"]

    due_date = datetime.now(UTC) + timedelta(days=7)

    response = client.post(
        f"{settings.API_V1_STR}/assignments/",
        json={
            "name": "Homework",
            "activity_id": str(activity.id),
            "book_id": str(book.id),
            "student_ids": [str(student.id)],
            "due_date": due_date.isoformat(),
        },
        headers={"Authorization": f"Bearer {teacher_token_full}"},
    )

    assert response.status_code == 201

    notification = session.execute(
        select(Notification).where(Notification.user_id == student_user.id)
    ).scalar_one()

    # Message should include "Due:"
    assert "Due:" in notification.message


def test_create_assignment_notification_no_due_date(
    client: TestClient,
    session: Session,
    test_setup: dict,
    teacher_token_full: str,
):
    """Test that assignment notification handles no due date gracefully."""
    activity = test_setup["activity"]
    book = test_setup["book"]
    student = test_setup["student"]
    student_user = test_setup["student_user"]

    response = client.post(
        f"{settings.API_V1_STR}/assignments/",
        json={
            "name": "Practice Assignment",
            "activity_id": str(activity.id),
            "book_id": str(book.id),
            "student_ids": [str(student.id)],
            # No due_date
        },
        headers={"Authorization": f"Bearer {teacher_token_full}"},
    )

    assert response.status_code == 201

    notification = session.execute(
        select(Notification).where(Notification.user_id == student_user.id)
    ).scalar_one()

    assert "No due date" in notification.message


# Tests for student completion notifications


def test_submit_assignment_sends_notification_to_teacher(
    client: TestClient,
    session: Session,
    test_setup: dict,
    teacher_token_full: str,
    student_token_full: str,
):
    """Test that submitting an assignment sends notification to teacher."""
    activity = test_setup["activity"]
    book = test_setup["book"]
    student = test_setup["student"]
    teacher_user = test_setup["teacher_user"]

    # Create assignment
    create_response = client.post(
        f"{settings.API_V1_STR}/assignments/",
        json={
            "name": "Test Quiz",
            "activity_id": str(activity.id),
            "book_id": str(book.id),
            "student_ids": [str(student.id)],
        },
        headers={"Authorization": f"Bearer {teacher_token_full}"},
    )
    assert create_response.status_code == 201
    assignment_id = create_response.json()["id"]

    # Start assignment (GET endpoint)
    start_response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment_id}/start",
        headers={"Authorization": f"Bearer {student_token_full}"},
    )
    assert start_response.status_code == 200

    # Submit assignment
    submit_response = client.post(
        f"{settings.API_V1_STR}/assignments/{assignment_id}/submit",
        json={
            "answers_json": {"q1": 1},
            "score": 85,
            "time_spent_minutes": 10,
        },
        headers={"Authorization": f"Bearer {student_token_full}"},
    )
    assert submit_response.status_code == 200

    # Verify teacher received notification
    teacher_notifications = session.execute(
        select(Notification).where(
            Notification.user_id == teacher_user.id,
            Notification.type == NotificationType.student_completed,
        )
    ).scalars().all()

    assert len(teacher_notifications) == 1
    notification = teacher_notifications[0]
    assert "Test Student" in notification.title
    assert "Test Quiz" in notification.title
    assert "85" in notification.message  # Score may be "85%" or "85.0%"
    assert f"/teacher/assignments/{assignment_id}" == notification.link


# Tests for scheduled task endpoint


def test_scheduled_task_endpoint_requires_admin(
    client: TestClient,
    student_token_full: str,
):
    """Test that scheduled task endpoint requires admin role."""
    response = client.post(
        f"{settings.API_V1_STR}/admin/tasks/deadline-reminders",
        headers={"Authorization": f"Bearer {student_token_full}"},
    )

    assert response.status_code == 403


def test_scheduled_task_endpoint_success(
    client: TestClient,
    session: Session,
    admin_user: User,
    admin_token: str,
):
    """Test that admin can run scheduled deadline task."""
    response = client.post(
        f"{settings.API_V1_STR}/admin/tasks/deadline-reminders",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "deadline_reminders_sent" in data
    assert "past_due_notifications_sent" in data


def test_scheduled_task_approaching_deadlines_only(
    client: TestClient,
    admin_token: str,
):
    """Test running approaching deadlines check only."""
    response = client.post(
        f"{settings.API_V1_STR}/admin/tasks/approaching-deadlines",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["past_due_notifications_sent"] == 0


def test_scheduled_task_past_due_only(
    client: TestClient,
    admin_token: str,
):
    """Test running past-due check only."""
    response = client.post(
        f"{settings.API_V1_STR}/admin/tasks/past-due",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["deadline_reminders_sent"] == 0
