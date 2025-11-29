"""
Integration tests for student analytics API - Story 5.1
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.models import (
    Activity,
    Assignment,
    AssignmentStatus,
    AssignmentStudent,
    Book,
    Class,
    ClassStudent,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


@pytest.fixture(name="test_publisher")
def publisher_fixture(session: Session) -> Publisher:
    """Create a test publisher."""
    publisher_user = User(
        email="publisher@analytics.com",
        username="publisher_analytics",
        hashed_password="hashed",
        role=UserRole.publisher,
        is_active=True,
    )
    session.add(publisher_user)
    session.commit()
    session.refresh(publisher_user)

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=publisher_user.id,
        name="Analytics Publisher",
        contact_email="analytics@publisher.com",
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
        name="Analytics School",
        address="123 Test St",
        contact_info="analytics@school.com",
        publisher_id=test_publisher.id,
    )
    session.add(school)
    session.commit()
    session.refresh(school)
    return school


@pytest.fixture(name="analytics_teacher")
def teacher_fixture(session: Session, test_school: School) -> tuple[Teacher, User, str]:
    """Create teacher with token."""
    teacher_user = User(
        email="analytics.teacher@test.com",
        username="analytics_teacher",
        hashed_password="hashed",
        role=UserRole.teacher,
        is_active=True,
        full_name="Analytics Teacher",
    )
    session.add(teacher_user)
    session.commit()
    session.refresh(teacher_user)

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=test_school.id,
        subject_specialization="Math",
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    # Create JWT token
    token = create_access_token(teacher_user.id, timedelta(minutes=30))

    return teacher, teacher_user, token


@pytest.fixture(name="analytics_student")
def student_fixture(
    session: Session, test_school: School, analytics_teacher: tuple[Teacher, User, str]
) -> tuple[Student, User]:
    """Create student enrolled in teacher's class."""
    teacher, _, _ = analytics_teacher

    student_user = User(
        email="analytics.student@test.com",
        username="analytics_student",
        hashed_password="hashed",
        role=UserRole.student,
        is_active=True,
        full_name="Analytics Student",
    )
    session.add(student_user)
    session.commit()
    session.refresh(student_user)

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        school_id=test_school.id,
        grade_level=5,
    )
    session.add(student)
    session.commit()
    session.refresh(student)

    # Create class and enroll student
    test_class = Class(
        id=uuid.uuid4(),
        name="Analytics Class",
        teacher_id=teacher.id,
        school_id=test_school.id,
        grade_level="5",
        subject="Math",
        academic_year="2024-2025",
    )
    session.add(test_class)
    session.commit()

    class_student = ClassStudent(
        id=uuid.uuid4(),
        class_id=test_class.id,
        student_id=student.id,
    )
    session.add(class_student)
    session.commit()

    return student, student_user


@pytest.fixture(name="student_with_completed_assignments")
def student_assignments_fixture(
    session: Session,
    analytics_student: tuple[Student, User],
    analytics_teacher: tuple[Teacher, User, str],
    test_publisher: Publisher,
) -> tuple[Student, list[AssignmentStudent]]:
    """Create student with varied assignment history."""
    student, _ = analytics_student
    teacher, _, _ = analytics_teacher

    # Create book
    book = Book(
        id=uuid.uuid4(),
        publisher_id=test_publisher.id,
        dream_storage_id="analytics-book-001",
        title="Analytics Test Book",
        book_name="Analytics Test Book",
        publisher_name="Test Publisher",
        dcs_activity_count=10,
    )
    session.add(book)
    session.commit()

    # Create activities with different types
    activity_types = ["circle", "matchTheWords", "dragdroppicture"]
    activities = []

    for i, act_type in enumerate(activity_types):
        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            dream_activity_id=f"analytics-activity-{i}",
            module_name=f"Module {i+1}",
            page_number=i+1,
            section_index=i,
            activity_type=act_type,
            title=f"Analytics Activity {i+1}",
            config_json={"type": act_type, "question": "Test"},
        )
        session.add(activity)
        activities.append(activity)

    session.commit()

    # Create assignments with varied completion data
    now = datetime.now(UTC)
    assignment_students = []

    for i in range(15):  # 12 completed, 3 not started
        activity = activities[i % len(activities)]

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            book_id=book.id,
            activity_id=activity.id,
            name=f"Analytics Assignment {i+1}",
            instructions=f"Complete activity {i+1}",
            due_date=now + timedelta(days=7),
            time_limit_minutes=30,
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)

        # Create varied data: 12 completed at different times, 3 not started
        is_completed = i < 12
        days_ago = i
        completed_at = now - timedelta(days=days_ago) if is_completed else None
        status = AssignmentStatus.completed if is_completed else AssignmentStatus.not_started
        score = 70 + (i * 2) if is_completed else None
        time_spent = 10 + (i * 2) if is_completed else 0

        asgn_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=status,
            score=score,
            completed_at=completed_at,
            time_spent_minutes=time_spent,
            started_at=completed_at - timedelta(minutes=time_spent) if completed_at else None,
        )
        session.add(asgn_student)
        assignment_students.append(asgn_student)

    session.commit()

    return student, assignment_students


def test_get_student_analytics_success(
    client: TestClient,
    student_with_completed_assignments: tuple[Student, list[AssignmentStudent]],
    analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test successful analytics retrieval with 30-day period."""
    student, _ = student_with_completed_assignments
    _, _, teacher_token = analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/students/{student.id}/analytics?period=30d",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Verify structure
    assert "student" in data
    assert "summary" in data
    assert "recent_activity" in data
    assert "performance_trend" in data
    assert "activity_breakdown" in data
    assert "status_summary" in data
    assert "time_analytics" in data

    # Verify summary metrics
    assert data["summary"]["total_completed"] == 12
    assert data["summary"]["avg_score"] > 0
    assert data["summary"]["completion_rate"] > 0

    # Verify recent activity limited to 10
    assert len(data["recent_activity"]) <= 10

    # Verify student info
    assert data["student"]["id"] == str(student.id)
    assert data["student"]["name"] == "Analytics Student"


def test_get_student_analytics_with_date_range_7d(
    client: TestClient,
    student_with_completed_assignments: tuple[Student, list[AssignmentStudent]],
    analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test analytics with 7-day period filter."""
    student, _ = student_with_completed_assignments
    _, _, teacher_token = analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/students/{student.id}/analytics?period=7d",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should have fewer assignments than 30d (only last 7 days)
    assert data["summary"]["total_completed"] <= 7


def test_get_student_analytics_with_date_range_all(
    client: TestClient,
    student_with_completed_assignments: tuple[Student, list[AssignmentStudent]],
    analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test analytics with all-time period."""
    student, _ = student_with_completed_assignments
    _, _, teacher_token = analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/students/{student.id}/analytics?period=all",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should include all 12 completed assignments
    assert data["summary"]["total_completed"] == 12


def test_get_student_analytics_requires_teacher_role(
    client: TestClient,
    student_with_completed_assignments: tuple[Student, list[AssignmentStudent]],
    analytics_student: tuple[Student, User],
) -> None:
    """Test that non-teachers cannot access analytics."""
    student, student_user = analytics_student

    # Create student token
    student_token = create_access_token(student_user.id, timedelta(minutes=30))

    response = client.get(
        f"{settings.API_V1_STR}/students/{student.id}/analytics?period=30d",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 403


def test_get_student_analytics_unauthorized_student(
    client: TestClient,
    session: Session,
    analytics_teacher: tuple[Teacher, User, str],
    test_school: School,
) -> None:
    """Test teacher cannot access unrelated student."""
    _, _, teacher_token = analytics_teacher

    # Create unrelated student (not in teacher's class)
    unrelated_user = User(
        email="unrelated@test.com",
        username="unrelated_student",
        hashed_password="hashed",
        role=UserRole.student,
        is_active=True,
    )
    session.add(unrelated_user)
    session.commit()
    session.refresh(unrelated_user)

    unrelated_student = Student(
        id=uuid.uuid4(),
        user_id=unrelated_user.id,
        school_id=test_school.id,
        grade_level=6,
    )
    session.add(unrelated_student)
    session.commit()

    response = client.get(
        f"{settings.API_V1_STR}/students/{unrelated_student.id}/analytics?period=30d",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 403
    assert "do not have access" in response.json()["detail"]


def test_get_student_analytics_no_completed_assignments(
    client: TestClient,
    analytics_student: tuple[Student, User],
    analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test analytics for student with no completed assignments."""
    student, _ = analytics_student
    _, _, teacher_token = analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/students/{student.id}/analytics?period=30d",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should return zero values
    assert data["summary"]["total_completed"] == 0
    assert data["summary"]["avg_score"] == 0.0
    assert data["summary"]["current_streak"] == 0
    assert len(data["recent_activity"]) == 0


def test_activity_breakdown_accuracy(
    client: TestClient,
    student_with_completed_assignments: tuple[Student, list[AssignmentStudent]],
    analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test activity type breakdown calculation."""
    student, _ = student_with_completed_assignments
    _, _, teacher_token = analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/students/{student.id}/analytics?period=all",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should have breakdown by activity type (3 types: circle, matchTheWords, dragdroppicture)
    assert len(data["activity_breakdown"]) == 3

    # Each breakdown item should have required fields
    for item in data["activity_breakdown"]:
        assert "activity_type" in item
        assert "avg_score" in item
        assert "count" in item
        assert item["count"] > 0
        assert item["avg_score"] > 0
