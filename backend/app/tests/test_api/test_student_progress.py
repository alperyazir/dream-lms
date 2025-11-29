"""
Integration tests for student progress API - Story 5.5
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


@pytest.fixture(name="progress_publisher")
def publisher_fixture(session: Session) -> Publisher:
    """Create a test publisher."""
    publisher_user = User(
        email="publisher@progress.com",
        username="publisher_progress",
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
        name="Progress Publisher",
        contact_email="progress@publisher.com",
    )
    session.add(publisher)
    session.commit()
    session.refresh(publisher)
    return publisher


@pytest.fixture(name="progress_school")
def school_fixture(session: Session, progress_publisher: Publisher) -> School:
    """Create a test school."""
    school = School(
        id=uuid.uuid4(),
        name="Progress School",
        address="123 Progress St",
        contact_info="progress@school.com",
        publisher_id=progress_publisher.id,
    )
    session.add(school)
    session.commit()
    session.refresh(school)
    return school


@pytest.fixture(name="progress_teacher")
def teacher_fixture(session: Session, progress_school: School) -> tuple[Teacher, User, str]:
    """Create teacher with token."""
    teacher_user = User(
        email="progress.teacher@test.com",
        username="progress_teacher",
        hashed_password="hashed",
        role=UserRole.teacher,
        is_active=True,
        full_name="Progress Teacher",
    )
    session.add(teacher_user)
    session.commit()
    session.refresh(teacher_user)

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=progress_school.id,
        subject_specialization="Math",
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    # Create JWT token
    token = create_access_token(teacher_user.id, timedelta(minutes=30))

    return teacher, teacher_user, token


@pytest.fixture(name="progress_student")
def student_fixture(
    session: Session, progress_school: School, progress_teacher: tuple[Teacher, User, str]
) -> tuple[Student, User, str]:
    """Create student with token enrolled in teacher's class."""
    teacher, _, _ = progress_teacher

    student_user = User(
        email="progress.student@test.com",
        username="progress_student",
        hashed_password="hashed",
        role=UserRole.student,
        is_active=True,
        full_name="Progress Student",
    )
    session.add(student_user)
    session.commit()
    session.refresh(student_user)

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        school_id=progress_school.id,
        grade_level=5,
    )
    session.add(student)
    session.commit()
    session.refresh(student)

    # Create class and enroll student
    test_class = Class(
        id=uuid.uuid4(),
        name="Progress Class",
        teacher_id=teacher.id,
        school_id=progress_school.id,
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

    # Create JWT token for student
    token = create_access_token(student_user.id, timedelta(minutes=30))

    return student, student_user, token


@pytest.fixture(name="student_with_progress_data")
def student_progress_fixture(
    session: Session,
    progress_student: tuple[Student, User, str],
    progress_teacher: tuple[Teacher, User, str],
    progress_publisher: Publisher,
) -> tuple[Student, str, list[AssignmentStudent]]:
    """Create student with varied assignment history for progress tracking."""
    student, _, student_token = progress_student
    teacher, _, _ = progress_teacher

    # Create book
    book = Book(
        id=uuid.uuid4(),
        publisher_id=progress_publisher.id,
        dream_storage_id="progress-book-001",
        title="Progress Test Book",
        book_name="Progress Test Book",
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
            dream_activity_id=f"progress-activity-{i}",
            module_name=f"Module {i+1}",
            page_number=i+1,
            section_index=i,
            activity_type=act_type,
            title=f"Progress Activity {i+1}",
            config_json={"type": act_type, "question": "Test"},
        )
        session.add(activity)
        activities.append(activity)

    session.commit()

    # Create assignments with varied completion data
    now = datetime.now(UTC)
    assignment_students = []

    # Create 10 completed assignments with improving scores (for trend)
    for i in range(10):
        activity = activities[i % len(activities)]

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            book_id=book.id,
            activity_id=activity.id,
            name=f"Progress Assignment {i+1}",
            instructions=f"Complete activity {i+1}",
            due_date=now + timedelta(days=7),
            time_limit_minutes=30,
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)

        # Scores improve over time: 65, 70, 75, 80, 85, 90, 95, 100, 100, 100
        score = min(65 + (i * 5), 100)
        days_ago = 10 - i  # Most recent is today
        completed_at = now - timedelta(days=days_ago)
        time_spent = 15 + i  # Varies from 15-24 minutes

        asgn_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.completed,
            score=score,
            completed_at=completed_at,
            time_spent_minutes=time_spent,
            started_at=completed_at - timedelta(minutes=time_spent),
        )
        session.add(asgn_student)
        assignment_students.append(asgn_student)

    # Add 2 not started assignments for variety
    for i in range(2):
        activity = activities[0]
        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            book_id=book.id,
            activity_id=activity.id,
            name=f"Pending Assignment {i+1}",
            instructions="Complete this activity",
            due_date=now + timedelta(days=14),
            time_limit_minutes=30,
        )
        session.add(assignment)
        session.commit()
        session.refresh(assignment)

        asgn_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.not_started,
        )
        session.add(asgn_student)
        assignment_students.append(asgn_student)

    session.commit()

    return student, student_token, assignment_students


class TestStudentProgressEndpoint:
    """Tests for GET /students/me/progress endpoint."""

    def test_get_progress_success(
        self,
        client: TestClient,
        student_with_progress_data: tuple[Student, str, list[AssignmentStudent]],
    ) -> None:
        """Test successful progress retrieval with default period."""
        _, student_token, _ = student_with_progress_data

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "stats" in data
        assert "score_trend" in data
        assert "activity_breakdown" in data
        assert "recent_assignments" in data
        assert "achievements" in data
        assert "study_time" in data
        assert "improvement_tips" in data

    def test_get_progress_stats_accuracy(
        self,
        client: TestClient,
        student_with_progress_data: tuple[Student, str, list[AssignmentStudent]],
    ) -> None:
        """Test accuracy of progress statistics."""
        _, student_token, _ = student_with_progress_data

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress?period=all_time",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify stats
        stats = data["stats"]
        assert stats["total_completed"] == 10  # 10 completed assignments
        assert stats["avg_score"] > 0
        assert "improvement_trend" in stats
        assert stats["improvement_trend"] in ["improving", "stable", "declining"]

    def test_get_progress_with_this_week_period(
        self,
        client: TestClient,
        student_with_progress_data: tuple[Student, str, list[AssignmentStudent]],
    ) -> None:
        """Test progress with this_week period filter."""
        _, student_token, _ = student_with_progress_data

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress?period=this_week",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should have fewer/equal assignments than all_time
        assert data["stats"]["total_completed"] <= 10

    def test_get_progress_with_this_month_period(
        self,
        client: TestClient,
        student_with_progress_data: tuple[Student, str, list[AssignmentStudent]],
    ) -> None:
        """Test progress with this_month period filter."""
        _, student_token, _ = student_with_progress_data

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress?period=this_month",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should include all 10 completed (they're within last month)
        assert data["stats"]["total_completed"] == 10

    def test_activity_breakdown_has_labels(
        self,
        client: TestClient,
        student_with_progress_data: tuple[Student, str, list[AssignmentStudent]],
    ) -> None:
        """Test activity breakdown includes user-friendly labels."""
        _, student_token, _ = student_with_progress_data

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress?period=all_time",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should have breakdown by activity type (4 types)
        assert len(data["activity_breakdown"]) == 4

        # Each breakdown item should have label
        for item in data["activity_breakdown"]:
            assert "activity_type" in item
            assert "label" in item
            assert "avg_score" in item
            assert "total_completed" in item
            assert item["label"]  # Label should not be empty

    def test_recent_assignments_limited_to_5(
        self,
        client: TestClient,
        student_with_progress_data: tuple[Student, str, list[AssignmentStudent]],
    ) -> None:
        """Test recent assignments are limited to 5."""
        _, student_token, _ = student_with_progress_data

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress?period=all_time",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should have at most 5 recent assignments
        assert len(data["recent_assignments"]) <= 5

        # Verify structure
        for assignment in data["recent_assignments"]:
            assert "id" in assignment
            assert "name" in assignment
            assert "score" in assignment
            assert "completed_at" in assignment
            assert "activity_type" in assignment
            assert "book_title" in assignment

    def test_achievements_present(
        self,
        client: TestClient,
        student_with_progress_data: tuple[Student, str, list[AssignmentStudent]],
    ) -> None:
        """Test achievements are returned."""
        _, student_token, _ = student_with_progress_data

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress?period=all_time",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should have at least first_complete achievement
        assert len(data["achievements"]) >= 1

        # Check achievement structure
        for achievement in data["achievements"]:
            assert "id" in achievement
            assert "type" in achievement
            assert "title" in achievement
            assert "description" in achievement
            assert "icon" in achievement

    def test_improvement_tips_present(
        self,
        client: TestClient,
        student_with_progress_data: tuple[Student, str, list[AssignmentStudent]],
    ) -> None:
        """Test improvement tips are returned."""
        _, student_token, _ = student_with_progress_data

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress?period=all_time",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should have 1-3 improvement tips
        assert 1 <= len(data["improvement_tips"]) <= 3
        for tip in data["improvement_tips"]:
            assert isinstance(tip, str)
            assert len(tip) > 0

    def test_study_time_stats(
        self,
        client: TestClient,
        student_with_progress_data: tuple[Student, str, list[AssignmentStudent]],
    ) -> None:
        """Test study time statistics."""
        _, student_token, _ = student_with_progress_data

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress?period=all_time",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        study_time = data["study_time"]
        assert "this_week_minutes" in study_time
        assert "this_month_minutes" in study_time
        assert "avg_per_assignment" in study_time
        assert study_time["this_month_minutes"] >= 0

    def test_score_trend_for_chart(
        self,
        client: TestClient,
        student_with_progress_data: tuple[Student, str, list[AssignmentStudent]],
    ) -> None:
        """Test score trend data for chart display."""
        _, student_token, _ = student_with_progress_data

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress?period=all_time",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should have score trend data
        assert len(data["score_trend"]) > 0

        # Verify trend point structure
        for point in data["score_trend"]:
            assert "date" in point
            assert "score" in point
            assert "assignment_name" in point

    def test_requires_student_role(
        self,
        client: TestClient,
        progress_teacher: tuple[Teacher, User, str],
    ) -> None:
        """Test that non-students cannot access progress."""
        _, _, teacher_token = progress_teacher

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 403

    def test_requires_authentication(
        self,
        client: TestClient,
    ) -> None:
        """Test that unauthenticated requests are rejected."""
        response = client.get(f"{settings.API_V1_STR}/students/me/progress")

        assert response.status_code == 401


class TestStudentProgressNoData:
    """Tests for students with no completed assignments."""

    def test_progress_with_no_completed_assignments(
        self,
        client: TestClient,
        progress_student: tuple[Student, User, str],
    ) -> None:
        """Test progress for student with no completed work."""
        _, _, student_token = progress_student

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress?period=all_time",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should return zero/empty values
        assert data["stats"]["total_completed"] == 0
        assert data["stats"]["avg_score"] == 0.0
        assert data["stats"]["current_streak"] == 0
        assert len(data["score_trend"]) == 0
        assert len(data["activity_breakdown"]) == 0
        assert len(data["recent_assignments"]) == 0
        # Should still have improvement tips
        assert len(data["improvement_tips"]) >= 1


class TestImprovementTrend:
    """Tests for improvement trend detection."""

    def test_improving_trend_detection(
        self,
        client: TestClient,
        student_with_progress_data: tuple[Student, str, list[AssignmentStudent]],
    ) -> None:
        """Test that improving scores are detected."""
        _, student_token, _ = student_with_progress_data

        response = client.get(
            f"{settings.API_V1_STR}/students/me/progress?period=all_time",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Our test data has improving scores (65 -> 100)
        # Trend should be "improving"
        assert data["stats"]["improvement_trend"] == "improving"
