"""
Integration tests for class analytics API - Story 5.2
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


@pytest.fixture(name="class_analytics_publisher")
def publisher_fixture(session: Session) -> Publisher:
    """Create a test publisher."""
    publisher_user = User(
        email="class.analytics.publisher@test.com",
        username="class_analytics_publisher",
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
        name="Class Analytics Publisher",
        contact_email="class.analytics@publisher.com",
    )
    session.add(publisher)
    session.commit()
    session.refresh(publisher)
    return publisher


@pytest.fixture(name="class_analytics_school")
def school_fixture(session: Session, class_analytics_publisher: Publisher) -> School:
    """Create a test school."""
    school = School(
        id=uuid.uuid4(),
        name="Class Analytics School",
        address="456 Analytics Ave",
        contact_info="analytics@school.com",
        publisher_id=class_analytics_publisher.id,
    )
    session.add(school)
    session.commit()
    session.refresh(school)
    return school


@pytest.fixture(name="class_analytics_teacher")
def teacher_fixture(session: Session, class_analytics_school: School) -> tuple[Teacher, User, str]:
    """Create teacher with token."""
    teacher_user = User(
        email="class.analytics.teacher@test.com",
        username="class_analytics_teacher",
        hashed_password="hashed",
        role=UserRole.teacher,
        is_active=True,
        full_name="Class Analytics Teacher",
    )
    session.add(teacher_user)
    session.commit()
    session.refresh(teacher_user)

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=class_analytics_school.id,
        subject_specialization="Math",
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    # Create JWT token
    token = create_access_token(teacher_user.id, timedelta(minutes=30))

    return teacher, teacher_user, token


@pytest.fixture(name="class_analytics_other_teacher")
def other_teacher_fixture(session: Session, class_analytics_school: School) -> tuple[Teacher, User, str]:
    """Create another teacher for authorization tests."""
    teacher_user = User(
        email="other.class.teacher@test.com",
        username="other_class_teacher",
        hashed_password="hashed",
        role=UserRole.teacher,
        is_active=True,
        full_name="Other Teacher",
    )
    session.add(teacher_user)
    session.commit()
    session.refresh(teacher_user)

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=class_analytics_school.id,
        subject_specialization="Science",
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    token = create_access_token(teacher_user.id, timedelta(minutes=30))
    return teacher, teacher_user, token


@pytest.fixture(name="class_with_students")
def class_with_students_fixture(
    session: Session,
    class_analytics_school: School,
    class_analytics_teacher: tuple[Teacher, User, str],
) -> tuple[Class, list[tuple[Student, User]]]:
    """Create a class with 5 enrolled students."""
    teacher, _, _ = class_analytics_teacher

    test_class = Class(
        id=uuid.uuid4(),
        name="Analytics Test Class",
        teacher_id=teacher.id,
        school_id=class_analytics_school.id,
        grade_level="5",
        subject="Math",
        academic_year="2024-2025",
    )
    session.add(test_class)
    session.commit()

    students = []
    for i in range(5):
        student_user = User(
            email=f"class.student{i}@test.com",
            username=f"class_student_{i}",
            hashed_password="hashed",
            role=UserRole.student,
            is_active=True,
            full_name=f"Student {i + 1}",
        )
        session.add(student_user)
        session.commit()
        session.refresh(student_user)

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            school_id=class_analytics_school.id,
            grade_level=5,
        )
        session.add(student)
        session.commit()
        session.refresh(student)

        class_student = ClassStudent(
            id=uuid.uuid4(),
            class_id=test_class.id,
            student_id=student.id,
        )
        session.add(class_student)
        students.append((student, student_user))

    session.commit()
    session.refresh(test_class)

    return test_class, students


@pytest.fixture(name="class_with_varied_assignments")
def class_with_assignments_fixture(
    session: Session,
    class_with_students: tuple[Class, list[tuple[Student, User]]],
    class_analytics_teacher: tuple[Teacher, User, str],
    class_analytics_publisher: Publisher,
) -> tuple[Class, list[tuple[Student, User]], list[Assignment]]:
    """Create class with assignments and varied completion data."""
    test_class, students = class_with_students
    teacher, _, _ = class_analytics_teacher

    # Create book
    book = Book(
        id=uuid.uuid4(),
        publisher_id=class_analytics_publisher.id,
        dream_storage_id="class-analytics-book-001",
        title="Class Analytics Test Book",
        book_name="Class Analytics Test Book",
        publisher_name="Test Publisher",
        dcs_activity_count=10,
    )
    session.add(book)
    session.commit()

    # Create activities with different types
    activity_types = ["circle", "matchTheWords", "dragdroppicture", "puzzleFindWords"]
    activities = []

    for i, act_type in enumerate(activity_types):
        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            dream_activity_id=f"class-analytics-activity-{i}",
            module_name=f"Module {i + 1}",
            page_number=i + 1,
            section_index=i,
            activity_type=act_type,
            title=f"Activity {i + 1}",
            config_json={"type": act_type, "question": "Test"},
        )
        session.add(activity)
        activities.append(activity)

    session.commit()

    # Create assignments
    now = datetime.now(UTC)
    assignments = []

    for i in range(8):  # 8 assignments
        activity = activities[i % len(activities)]

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            book_id=book.id,
            activity_id=activity.id,
            name=f"Class Assignment {i + 1}",
            instructions=f"Complete activity {i + 1}",
            due_date=now + timedelta(days=7) if i < 6 else now - timedelta(days=3),  # 2 past due
            time_limit_minutes=30,
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)
        assignments.append(assignment)

        # Create assignment records for each student with varied scores
        for j, (student, _) in enumerate(students):
            # Vary completion: first 3 students complete all, next 2 complete fewer
            is_completed = i < (6 if j < 3 else 4)
            days_ago = i * 2

            # Vary scores: student 0 high, student 1-2 medium, student 3-4 low
            base_score = 90 - (j * 10)  # 90, 80, 70, 60, 50

            completed_at = now - timedelta(days=days_ago) if is_completed else None
            status = AssignmentStatus.completed if is_completed else AssignmentStatus.not_started
            score = base_score + (i % 5) if is_completed else None
            time_spent = 15 + (i * 2) if is_completed else 0

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

    session.commit()

    return test_class, students, assignments


@pytest.fixture(name="empty_class")
def empty_class_fixture(
    session: Session,
    class_analytics_school: School,
    class_analytics_teacher: tuple[Teacher, User, str],
) -> Class:
    """Create a class with no students."""
    teacher, _, _ = class_analytics_teacher

    test_class = Class(
        id=uuid.uuid4(),
        name="Empty Analytics Class",
        teacher_id=teacher.id,
        school_id=class_analytics_school.id,
        grade_level="6",
        subject="Science",
    )
    session.add(test_class)
    session.commit()
    session.refresh(test_class)

    return test_class


def test_get_class_analytics_success(
    client: TestClient,
    class_with_varied_assignments: tuple[Class, list[tuple[Student, User]], list[Assignment]],
    class_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test successful class analytics retrieval."""
    test_class, students, _ = class_with_varied_assignments
    _, _, teacher_token = class_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/classes/{test_class.id}/analytics?period=monthly",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "class_id" in data
    assert "class_name" in data
    assert "summary" in data
    assert "score_distribution" in data
    assert "leaderboard" in data
    assert "struggling_students" in data
    assert "assignment_performance" in data
    assert "activity_type_performance" in data
    assert "trends" in data

    # Verify class info
    assert data["class_id"] == str(test_class.id)
    assert data["class_name"] == "Analytics Test Class"

    # Verify summary
    assert data["summary"]["active_students"] <= len(students)
    assert data["summary"]["total_assignments"] > 0
    assert data["summary"]["avg_score"] > 0
    assert 0 <= data["summary"]["completion_rate"] <= 1


def test_get_class_analytics_score_distribution(
    client: TestClient,
    class_with_varied_assignments: tuple[Class, list[tuple[Student, User]], list[Assignment]],
    class_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test score distribution histogram accuracy."""
    test_class, _, _ = class_with_varied_assignments
    _, _, teacher_token = class_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/classes/{test_class.id}/analytics?period=monthly",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should have 5 buckets
    assert len(data["score_distribution"]) == 5

    # Verify bucket structure and order
    buckets = data["score_distribution"]
    assert buckets[0]["range_label"] == "0-59%"
    assert buckets[1]["range_label"] == "60-69%"
    assert buckets[2]["range_label"] == "70-79%"
    assert buckets[3]["range_label"] == "80-89%"
    assert buckets[4]["range_label"] == "90-100%"

    # Verify counts are non-negative
    for bucket in buckets:
        assert bucket["count"] >= 0
        assert "min_score" in bucket
        assert "max_score" in bucket


def test_get_class_analytics_leaderboard_ranking(
    client: TestClient,
    class_with_varied_assignments: tuple[Class, list[tuple[Student, User]], list[Assignment]],
    class_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test leaderboard ranking correctness."""
    test_class, _, _ = class_with_varied_assignments
    _, _, teacher_token = class_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/classes/{test_class.id}/analytics?period=monthly",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    leaderboard = data["leaderboard"]

    # Should have entries
    assert len(leaderboard) > 0

    # Verify ranking order (descending by score)
    for i in range(1, len(leaderboard)):
        assert leaderboard[i - 1]["avg_score"] >= leaderboard[i]["avg_score"]
        assert leaderboard[i]["rank"] == i + 1

    # Verify structure
    for item in leaderboard:
        assert "student_id" in item
        assert "name" in item
        assert "avg_score" in item
        assert "rank" in item


def test_get_class_analytics_struggling_students(
    client: TestClient,
    class_with_varied_assignments: tuple[Class, list[tuple[Student, User]], list[Assignment]],
    class_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test struggling students detection."""
    test_class, _, _ = class_with_varied_assignments
    _, _, teacher_token = class_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/classes/{test_class.id}/analytics?period=monthly",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    struggling = data["struggling_students"]

    # We have students with low scores (< 70%) so there should be some
    # Students 3 and 4 have base scores of 60 and 50

    for student in struggling:
        assert "student_id" in student
        assert "name" in student
        assert "avg_score" in student
        assert "past_due_count" in student
        assert "alert_reason" in student
        # Should have a valid alert reason
        assert student["alert_reason"] in [
            "Low average score",
            "Multiple past due assignments",
            "Low average score, Multiple past due assignments",
        ]


def test_get_class_analytics_assignment_performance(
    client: TestClient,
    class_with_varied_assignments: tuple[Class, list[tuple[Student, User]], list[Assignment]],
    class_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test assignment performance aggregation."""
    test_class, _, assignments = class_with_varied_assignments
    _, _, teacher_token = class_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/classes/{test_class.id}/analytics?period=monthly",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assignment_perf = data["assignment_performance"]

    # Should have metrics for assignments
    assert len(assignment_perf) > 0

    for item in assignment_perf:
        assert "assignment_id" in item
        assert "name" in item
        assert "avg_score" in item
        assert "completion_rate" in item
        assert "avg_time_spent" in item
        assert 0 <= item["completion_rate"] <= 1


def test_get_class_analytics_activity_type_performance(
    client: TestClient,
    class_with_varied_assignments: tuple[Class, list[tuple[Student, User]], list[Assignment]],
    class_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test activity type performance breakdown."""
    test_class, _, _ = class_with_varied_assignments
    _, _, teacher_token = class_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/classes/{test_class.id}/analytics?period=monthly",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    activity_perf = data["activity_type_performance"]

    # Should have breakdown by activity type
    assert len(activity_perf) > 0

    for item in activity_perf:
        assert "activity_type" in item
        assert "avg_score" in item
        assert "count" in item
        assert item["count"] > 0


def test_get_class_analytics_trends(
    client: TestClient,
    class_with_varied_assignments: tuple[Class, list[tuple[Student, User]], list[Assignment]],
    class_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test trend analysis."""
    test_class, _, _ = class_with_varied_assignments
    _, _, teacher_token = class_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/classes/{test_class.id}/analytics?period=monthly",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    trends = data["trends"]

    # Should have trend data
    assert len(trends) >= 2  # At least avg score and completions

    for trend in trends:
        assert "metric_name" in trend
        assert "current_value" in trend
        assert "previous_value" in trend
        assert "change_percent" in trend
        assert "trend" in trend
        assert trend["trend"] in ["up", "down", "stable"]


def test_get_class_analytics_period_filter_weekly(
    client: TestClient,
    class_with_varied_assignments: tuple[Class, list[tuple[Student, User]], list[Assignment]],
    class_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test weekly period filter."""
    test_class, _, _ = class_with_varied_assignments
    _, _, teacher_token = class_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/classes/{test_class.id}/analytics?period=weekly",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should return valid data structure
    assert "summary" in data
    assert "score_distribution" in data


def test_get_class_analytics_period_filter_semester(
    client: TestClient,
    class_with_varied_assignments: tuple[Class, list[tuple[Student, User]], list[Assignment]],
    class_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test semester period filter."""
    test_class, _, _ = class_with_varied_assignments
    _, _, teacher_token = class_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/classes/{test_class.id}/analytics?period=semester",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assert "summary" in data


def test_get_class_analytics_period_filter_ytd(
    client: TestClient,
    class_with_varied_assignments: tuple[Class, list[tuple[Student, User]], list[Assignment]],
    class_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test year-to-date period filter."""
    test_class, _, _ = class_with_varied_assignments
    _, _, teacher_token = class_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/classes/{test_class.id}/analytics?period=ytd",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assert "summary" in data


def test_get_class_analytics_authorization_own_class_only(
    client: TestClient,
    class_with_varied_assignments: tuple[Class, list[tuple[Student, User]], list[Assignment]],
    class_analytics_other_teacher: tuple[Teacher, User, str],
) -> None:
    """Test that teacher can only access their own classes."""
    test_class, _, _ = class_with_varied_assignments
    _, _, other_token = class_analytics_other_teacher

    response = client.get(
        f"{settings.API_V1_STR}/classes/{test_class.id}/analytics?period=monthly",
        headers={"Authorization": f"Bearer {other_token}"},
    )

    # Should return 404 (not found) to not expose existence of other classes
    assert response.status_code == 404


def test_get_class_analytics_requires_teacher_role(
    client: TestClient,
    session: Session,
    class_with_varied_assignments: tuple[Class, list[tuple[Student, User]], list[Assignment]],
) -> None:
    """Test that non-teachers cannot access class analytics."""
    test_class, students, _ = class_with_varied_assignments
    student, student_user = students[0]

    # Create student token
    student_token = create_access_token(student_user.id, timedelta(minutes=30))

    response = client.get(
        f"{settings.API_V1_STR}/classes/{test_class.id}/analytics?period=monthly",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 403


def test_get_class_analytics_empty_class(
    client: TestClient,
    empty_class: Class,
    class_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test analytics for class with no students."""
    _, _, teacher_token = class_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/classes/{empty_class.id}/analytics?period=monthly",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should return zero/empty values
    assert data["summary"]["avg_score"] == 0.0
    assert data["summary"]["completion_rate"] == 0.0
    assert data["summary"]["total_assignments"] == 0
    assert data["summary"]["active_students"] == 0
    assert len(data["leaderboard"]) == 0
    assert len(data["struggling_students"]) == 0
    assert len(data["assignment_performance"]) == 0
    assert len(data["activity_type_performance"]) == 0

    # Score distribution should have 5 buckets with 0 counts
    assert len(data["score_distribution"]) == 5
    for bucket in data["score_distribution"]:
        assert bucket["count"] == 0


def test_get_class_analytics_nonexistent_class(
    client: TestClient,
    class_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test analytics for non-existent class."""
    _, _, teacher_token = class_analytics_teacher

    fake_id = uuid.uuid4()
    response = client.get(
        f"{settings.API_V1_STR}/classes/{fake_id}/analytics?period=monthly",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 404
