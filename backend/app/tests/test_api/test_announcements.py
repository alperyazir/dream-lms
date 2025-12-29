"""
Integration tests for Announcement API endpoints (Story 26.1).

Tests cover:
- POST /api/v1/announcements - Create new announcement
- GET /api/v1/announcements - List teacher's announcements
- GET /api/v1/announcements/{id} - Get announcement details
- PUT /api/v1/announcements/{id} - Update announcement
- DELETE /api/v1/announcements/{id} - Soft delete announcement
- HTML sanitization (XSS prevention)
- Recipient expansion (classrooms -> students)
- Permission controls (teacher only)
"""

import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    Announcement,
    AnnouncementRecipient,
    Class,
    ClassStudent,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


@pytest.fixture(name="announcement_setup")
def announcement_setup_fixture(session: Session):
    """
    Create a complete setup for announcement tests:
    - School with teacher
    - Two classes with students
    - Another teacher (for permission tests)
    """
    # Create school
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        address="123 Test St",
        dcs_publisher_id=1,
    )
    session.add(school)

    # Create teacher 1 (primary)
    teacher1_user = User(
        id=uuid.uuid4(),
        email="teacher1@example.com",
        username="teacher1",
        hashed_password=get_password_hash("password"),
        role=UserRole.teacher,
        full_name="Teacher One",
    )
    session.add(teacher1_user)

    teacher1 = Teacher(
        id=uuid.uuid4(),
        user_id=teacher1_user.id,
        school_id=school.id,
    )
    session.add(teacher1)

    # Create teacher 2 (for permission tests)
    teacher2_user = User(
        id=uuid.uuid4(),
        email="teacher2@example.com",
        username="teacher2",
        hashed_password=get_password_hash("password"),
        role=UserRole.teacher,
        full_name="Teacher Two",
    )
    session.add(teacher2_user)

    teacher2 = Teacher(
        id=uuid.uuid4(),
        user_id=teacher2_user.id,
        school_id=school.id,
    )
    session.add(teacher2)

    # Create class 1
    class1 = Class(
        id=uuid.uuid4(),
        name="Class 1A",
        teacher_id=teacher1.id,
        school_id=school.id,
    )
    session.add(class1)

    # Create class 2
    class2 = Class(
        id=uuid.uuid4(),
        name="Class 1B",
        teacher_id=teacher1.id,
        school_id=school.id,
    )
    session.add(class2)

    # Create students for class 1
    students_class1 = []
    for i in range(3):
        student_user = User(
            id=uuid.uuid4(),
            email=f"student1{i}@example.com",
            username=f"student1{i}",
            hashed_password=get_password_hash("password"),
            role=UserRole.student,
            full_name=f"Student 1{i}",
        )
        session.add(student_user)

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            school_id=school.id,
            grade="10",
        )
        session.add(student)
        students_class1.append(student)

        class_student = ClassStudent(
            id=uuid.uuid4(),
            class_id=class1.id,
            student_id=student.id,
        )
        session.add(class_student)

    # Create students for class 2
    students_class2 = []
    for i in range(2):
        student_user = User(
            id=uuid.uuid4(),
            email=f"student2{i}@example.com",
            username=f"student2{i}",
            hashed_password=get_password_hash("password"),
            role=UserRole.student,
            full_name=f"Student 2{i}",
        )
        session.add(student_user)

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            school_id=school.id,
            grade="10",
        )
        session.add(student)
        students_class2.append(student)

        class_student = ClassStudent(
            id=uuid.uuid4(),
            class_id=class2.id,
            student_id=student.id,
        )
        session.add(class_student)

    session.commit()

    return {
        "school": school,
        "teacher1_user": teacher1_user,
        "teacher1": teacher1,
        "teacher2_user": teacher2_user,
        "teacher2": teacher2,
        "class1": class1,
        "class2": class2,
        "students_class1": students_class1,
        "students_class2": students_class2,
    }


def test_create_announcement_individual_students(
    client: TestClient,
    announcement_setup: dict,
    session: Session,
) -> None:
    """Test creating announcement for individual students."""
    teacher1_user = announcement_setup["teacher1_user"]
    students = announcement_setup["students_class1"]

    # Login as teacher
    login_data = {
        "username": teacher1_user.email,
        "password": "password",
    }
    response = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create announcement
    announcement_data = {
        "title": "Test Announcement",
        "content": "<p>This is a <strong>test</strong> announcement.</p>",
        "recipient_student_ids": [str(students[0].id), str(students[1].id)],
        "recipient_classroom_ids": [],
    }

    response = client.post(
        f"{settings.API_V1_STR}/announcements",
        json=announcement_data,
        headers=headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Announcement"
    assert data["recipient_count"] == 2
    assert data["read_count"] == 0


def test_create_announcement_classroom(
    client: TestClient,
    announcement_setup: dict,
    session: Session,
) -> None:
    """Test creating announcement for entire classroom."""
    teacher1_user = announcement_setup["teacher1_user"]
    class1 = announcement_setup["class1"]

    # Login as teacher
    login_data = {
        "username": teacher1_user.email,
        "password": "password",
    }
    response = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create announcement for entire class
    announcement_data = {
        "title": "Class Announcement",
        "content": "<p>Important message for the class</p>",
        "recipient_student_ids": [],
        "recipient_classroom_ids": [str(class1.id)],
    }

    response = client.post(
        f"{settings.API_V1_STR}/announcements",
        json=announcement_data,
        headers=headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["recipient_count"] == 3  # 3 students in class1


def test_create_announcement_mixed_recipients(
    client: TestClient,
    announcement_setup: dict,
    session: Session,
) -> None:
    """Test creating announcement with both individual students and classrooms."""
    teacher1_user = announcement_setup["teacher1_user"]
    class1 = announcement_setup["class1"]
    students_class2 = announcement_setup["students_class2"]

    # Login as teacher
    login_data = {
        "username": teacher1_user.email,
        "password": "password",
    }
    response = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create announcement with mixed recipients
    announcement_data = {
        "title": "Mixed Recipients",
        "content": "<p>For all students</p>",
        "recipient_student_ids": [str(students_class2[0].id)],
        "recipient_classroom_ids": [str(class1.id)],
    }

    response = client.post(
        f"{settings.API_V1_STR}/announcements",
        json=announcement_data,
        headers=headers,
    )

    assert response.status_code == 201
    data = response.json()
    # 3 from class1 + 1 individual = 4 total
    assert data["recipient_count"] == 4


def test_html_sanitization(
    client: TestClient,
    announcement_setup: dict,
    session: Session,
) -> None:
    """Test that HTML content is sanitized to prevent XSS."""
    teacher1_user = announcement_setup["teacher1_user"]
    students = announcement_setup["students_class1"]

    # Login as teacher
    login_data = {
        "username": teacher1_user.email,
        "password": "password",
    }
    response = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt XSS injection
    malicious_content = '<p>Safe text</p><script>alert("xss")</script><p>More text</p>'
    announcement_data = {
        "title": "Security Test",
        "content": malicious_content,
        "recipient_student_ids": [str(students[0].id)],
    }

    response = client.post(
        f"{settings.API_V1_STR}/announcements",
        json=announcement_data,
        headers=headers,
    )

    assert response.status_code == 201
    data = response.json()
    # Script tag should be stripped
    assert "<script>" not in data["content"]
    assert "</script>" not in data["content"]
    assert "<p>Safe text</p>" in data["content"]
    assert "<p>More text</p>" in data["content"]


def test_list_teacher_announcements(
    client: TestClient,
    announcement_setup: dict,
    session: Session,
) -> None:
    """Test listing teacher's announcements."""
    teacher1_user = announcement_setup["teacher1_user"]
    teacher1 = announcement_setup["teacher1"]
    students = announcement_setup["students_class1"]

    # Create some announcements directly in DB
    for i in range(3):
        announcement = Announcement(
            id=uuid.uuid4(),
            teacher_id=teacher1.id,
            title=f"Announcement {i}",
            content=f"<p>Content {i}</p>",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(announcement)
        session.flush()

        # Add recipient
        recipient = AnnouncementRecipient(
            id=uuid.uuid4(),
            announcement_id=announcement.id,
            student_id=students[0].id,
            created_at=datetime.now(UTC),
        )
        session.add(recipient)

    session.commit()

    # Login as teacher
    login_data = {
        "username": teacher1_user.email,
        "password": "password",
    }
    response = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List announcements
    response = client.get(
        f"{settings.API_V1_STR}/announcements",
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["announcements"]) == 3


def test_get_announcement_detail(
    client: TestClient,
    announcement_setup: dict,
    session: Session,
) -> None:
    """Test getting announcement details."""
    teacher1_user = announcement_setup["teacher1_user"]
    teacher1 = announcement_setup["teacher1"]
    students = announcement_setup["students_class1"]

    # Create announcement
    announcement = Announcement(
        id=uuid.uuid4(),
        teacher_id=teacher1.id,
        title="Detail Test",
        content="<p>Detailed content</p>",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    session.add(announcement)
    session.flush()

    # Add recipients
    for student in students[:2]:
        recipient = AnnouncementRecipient(
            id=uuid.uuid4(),
            announcement_id=announcement.id,
            student_id=student.id,
            created_at=datetime.now(UTC),
        )
        session.add(recipient)

    session.commit()

    # Login as teacher
    login_data = {
        "username": teacher1_user.email,
        "password": "password",
    }
    response = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get detail
    response = client.get(
        f"{settings.API_V1_STR}/announcements/{announcement.id}",
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Detail Test"
    assert data["recipient_count"] == 2
    assert len(data["recipient_ids"]) == 2


def test_update_announcement(
    client: TestClient,
    announcement_setup: dict,
    session: Session,
) -> None:
    """Test updating announcement title and content."""
    teacher1_user = announcement_setup["teacher1_user"]
    teacher1 = announcement_setup["teacher1"]
    students = announcement_setup["students_class1"]

    # Create announcement
    announcement = Announcement(
        id=uuid.uuid4(),
        teacher_id=teacher1.id,
        title="Original Title",
        content="<p>Original content</p>",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    session.add(announcement)
    session.flush()

    recipient = AnnouncementRecipient(
        id=uuid.uuid4(),
        announcement_id=announcement.id,
        student_id=students[0].id,
        created_at=datetime.now(UTC),
    )
    session.add(recipient)
    session.commit()

    # Login as teacher
    login_data = {
        "username": teacher1_user.email,
        "password": "password",
    }
    response = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update announcement
    update_data = {
        "title": "Updated Title",
        "content": "<p>Updated content</p>",
    }

    response = client.put(
        f"{settings.API_V1_STR}/announcements/{announcement.id}",
        json=update_data,
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert "Updated content" in data["content"]


def test_delete_announcement(
    client: TestClient,
    announcement_setup: dict,
    session: Session,
) -> None:
    """Test soft deleting an announcement."""
    teacher1_user = announcement_setup["teacher1_user"]
    teacher1 = announcement_setup["teacher1"]
    students = announcement_setup["students_class1"]

    # Create announcement
    announcement = Announcement(
        id=uuid.uuid4(),
        teacher_id=teacher1.id,
        title="To Delete",
        content="<p>Will be deleted</p>",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    session.add(announcement)
    session.flush()

    recipient = AnnouncementRecipient(
        id=uuid.uuid4(),
        announcement_id=announcement.id,
        student_id=students[0].id,
        created_at=datetime.now(UTC),
    )
    session.add(recipient)
    session.commit()

    # Login as teacher
    login_data = {
        "username": teacher1_user.email,
        "password": "password",
    }
    response = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Delete announcement
    response = client.delete(
        f"{settings.API_V1_STR}/announcements/{announcement.id}",
        headers=headers,
    )

    assert response.status_code == 204

    # Verify it's not in list
    response = client.get(
        f"{settings.API_V1_STR}/announcements",
        headers=headers,
    )
    data = response.json()
    announcement_ids = [a["id"] for a in data["announcements"]]
    assert str(announcement.id) not in announcement_ids


def test_teacher_cannot_access_other_teacher_announcement(
    client: TestClient,
    announcement_setup: dict,
    session: Session,
) -> None:
    """Test that teachers cannot access announcements from other teachers."""
    teacher1 = announcement_setup["teacher1"]
    teacher2_user = announcement_setup["teacher2_user"]
    students = announcement_setup["students_class1"]

    # Create announcement by teacher1
    announcement = Announcement(
        id=uuid.uuid4(),
        teacher_id=teacher1.id,
        title="Teacher 1 Announcement",
        content="<p>Private</p>",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    session.add(announcement)
    session.flush()

    recipient = AnnouncementRecipient(
        id=uuid.uuid4(),
        announcement_id=announcement.id,
        student_id=students[0].id,
        created_at=datetime.now(UTC),
    )
    session.add(recipient)
    session.commit()

    # Login as teacher2
    login_data = {
        "username": teacher2_user.email,
        "password": "password",
    }
    response = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Try to access teacher1's announcement
    response = client.get(
        f"{settings.API_V1_STR}/announcements/{announcement.id}",
        headers=headers,
    )

    assert response.status_code == 404


def test_non_teacher_cannot_create_announcement(
    client: TestClient,
    announcement_setup: dict,
    session: Session,
) -> None:
    """Test that non-teachers cannot create announcements."""
    students = announcement_setup["students_class1"]
    student_user = session.get(User, students[0].user_id)

    # Login as student
    login_data = {
        "username": student_user.email,
        "password": "password",
    }
    response = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Try to create announcement
    announcement_data = {
        "title": "Unauthorized",
        "content": "<p>Should fail</p>",
        "recipient_student_ids": [str(students[1].id)],
    }

    response = client.post(
        f"{settings.API_V1_STR}/announcements",
        json=announcement_data,
        headers=headers,
    )

    assert response.status_code == 403
