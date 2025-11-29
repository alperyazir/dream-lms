"""
Integration tests for teacher insights API - Story 5.4
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
    ActivityType,
    Assignment,
    AssignmentStatus,
    AssignmentStudent,
    Book,
    Class,
    ClassStudent,
    DismissedInsight,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


@pytest.fixture(name="insights_publisher")
def publisher_fixture(session: Session) -> Publisher:
    """Create a test publisher."""
    publisher_user = User(
        email="insights_publisher@test.com",
        username="insights_publisher",
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
        name="Insights Test Publisher",
        contact_email="insights@publisher.com",
    )
    session.add(publisher)
    session.commit()
    session.refresh(publisher)
    return publisher


@pytest.fixture(name="insights_school")
def school_fixture(session: Session, insights_publisher: Publisher) -> School:
    """Create a test school."""
    school = School(
        id=uuid.uuid4(),
        name="Insights Test School",
        address="123 Test St",
        contact_info="insights@school.com",
        publisher_id=insights_publisher.id,
    )
    session.add(school)
    session.commit()
    session.refresh(school)
    return school


@pytest.fixture(name="insights_teacher")
def teacher_fixture(session: Session, insights_school: School) -> tuple[Teacher, User, str]:
    """Create teacher with token."""
    teacher_user = User(
        email="insights.teacher@test.com",
        username="insights_teacher",
        hashed_password="hashed",
        role=UserRole.teacher,
        is_active=True,
        full_name="Insights Teacher",
    )
    session.add(teacher_user)
    session.commit()
    session.refresh(teacher_user)

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=insights_school.id,
        subject_specialization="Math",
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    token = create_access_token(teacher_user.id, timedelta(minutes=30))
    return teacher, teacher_user, token


@pytest.fixture(name="insights_class")
def class_fixture(session: Session, insights_teacher: tuple[Teacher, User, str], insights_school: School) -> Class:
    """Create a test class."""
    teacher, _, _ = insights_teacher
    test_class = Class(
        id=uuid.uuid4(),
        name="Math 101",
        teacher_id=teacher.id,
        school_id=insights_school.id,
    )
    session.add(test_class)
    session.commit()
    session.refresh(test_class)
    return test_class


@pytest.fixture(name="insights_students")
def students_fixture(session: Session, insights_class: Class, insights_school: School) -> list[tuple[Student, User]]:
    """Create test students and enroll in class."""
    students = []
    for i in range(5):
        student_user = User(
            email=f"student{i}@insights.test.com",
            username=f"student_insights_{i}",
            hashed_password="hashed",
            role=UserRole.student,
            is_active=True,
            full_name=f"Student {i}",
        )
        session.add(student_user)
        session.commit()
        session.refresh(student_user)

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            school_id=insights_school.id,
            grade_level="5",
        )
        session.add(student)
        session.commit()
        session.refresh(student)

        # Enroll in class
        class_student = ClassStudent(
            id=uuid.uuid4(),
            class_id=insights_class.id,
            student_id=student.id,
        )
        session.add(class_student)
        session.commit()

        students.append((student, student_user))

    return students


@pytest.fixture(name="insights_book")
def book_fixture(session: Session, insights_publisher: Publisher) -> Book:
    """Create a test book."""
    book = Book(
        id=uuid.uuid4(),
        dream_storage_id=f"insights-book-{uuid.uuid4().hex[:8]}",
        title="Insights Test Book",
        book_name="insights_test_book",
        publisher_name="Insights Test Publisher",
        publisher_id=insights_publisher.id,
    )
    session.add(book)
    session.commit()
    session.refresh(book)
    return book


@pytest.fixture(name="insights_activity")
def activity_fixture(session: Session, insights_book: Book) -> Activity:
    """Create a test activity."""
    activity = Activity(
        id=uuid.uuid4(),
        book_id=insights_book.id,
        dream_activity_id="activity-insights-1",
        module_name="module1",
        page_number=1,
        section_index=0,
        activity_type=ActivityType.dragdroppicture,
        config_json={
            "answer": [
                {"coords": {"x": 1, "y": 1}, "word": "apple"},
                {"coords": {"x": 2, "y": 2}, "word": "banana"},
                {"coords": {"x": 3, "y": 3}, "word": "cherry"},
            ]
        },
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity


@pytest.fixture(name="low_performing_assignment")
def low_performing_assignment_fixture(
    session: Session,
    insights_teacher: tuple[Teacher, User, str],
    insights_activity: Activity,
    insights_book: Book,
    insights_students: list[tuple[Student, User]],
) -> Assignment:
    """Create an assignment with low average score (<65%)."""
    teacher, _, _ = insights_teacher
    assignment = Assignment(
        id=uuid.uuid4(),
        name="Low Performing Quiz",
        teacher_id=teacher.id,
        activity_id=insights_activity.id,
        book_id=insights_book.id,
        due_date=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    # Create low-scoring submissions
    low_scores = [40, 45, 50, 55, 60]  # Average = 50%
    for i, (student, _) in enumerate(insights_students):
        asgn_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.completed,
            score=low_scores[i],
            completed_at=datetime.now(UTC),
            time_spent_minutes=10,
            answers_json={"1-1": "wrong", "2-2": "wrong", "3-3": "wrong"},
        )
        session.add(asgn_student)

    session.commit()
    return assignment


@pytest.fixture(name="misconception_assignment")
def misconception_assignment_fixture(
    session: Session,
    insights_teacher: tuple[Teacher, User, str],
    insights_activity: Activity,
    insights_book: Book,
    insights_students: list[tuple[Student, User]],
) -> Assignment:
    """Create an assignment with >60% same wrong answers (misconception)."""
    teacher, _, _ = insights_teacher
    assignment = Assignment(
        id=uuid.uuid4(),
        name="Misconception Quiz",
        teacher_id=teacher.id,
        activity_id=insights_activity.id,
        book_id=insights_book.id,
        due_date=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    # 4 out of 5 students answer the same wrong answer for question 1-1
    for i, (student, _) in enumerate(insights_students):
        if i < 4:
            # 80% give same wrong answer
            answers = {"1-1": "orange", "2-2": "banana", "3-3": "cherry"}
        else:
            answers = {"1-1": "apple", "2-2": "banana", "3-3": "cherry"}

        asgn_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.completed,
            score=60 if i < 4 else 100,
            completed_at=datetime.now(UTC),
            time_spent_minutes=10,
            answers_json=answers,
        )
        session.add(asgn_student)

    session.commit()
    return assignment


def test_get_insights_empty_when_no_assignments(
    client: TestClient,
    insights_teacher: tuple[Teacher, User, str],
) -> None:
    """Test empty insights when teacher has no assignments."""
    _, _, token = insights_teacher

    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "insights" in data
    assert "last_refreshed" in data
    assert isinstance(data["insights"], list)
    assert len(data["insights"]) == 0


def test_get_insights_detects_low_performing_assignment(
    client: TestClient,
    insights_teacher: tuple[Teacher, User, str],
    low_performing_assignment: Assignment,
) -> None:
    """Test detection of low performing assignments (<65% average)."""
    _, _, token = insights_teacher

    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Should have at least one insight for low performing assignment
    low_perf_insights = [
        i for i in data["insights"]
        if i["type"] == "review_recommended" and "Low Performing" in i["title"]
    ]
    assert len(low_perf_insights) >= 1

    insight = low_perf_insights[0]
    assert insight["severity"] in ["moderate", "critical"]
    assert insight["affected_count"] > 0
    assert "recommended_action" in insight


def test_get_insights_detects_common_misconception(
    client: TestClient,
    insights_teacher: tuple[Teacher, User, str],
    misconception_assignment: Assignment,
) -> None:
    """Test detection of common misconceptions (>60% same wrong answer)."""
    _, _, token = insights_teacher

    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()

    misconception_insights = [
        i for i in data["insights"]
        if i["type"] == "common_misconception"
    ]
    # Should detect the misconception where 80% chose "orange" instead of "apple"
    assert len(misconception_insights) >= 1


def test_get_insights_sorted_by_severity(
    client: TestClient,
    insights_teacher: tuple[Teacher, User, str],
    low_performing_assignment: Assignment,
    misconception_assignment: Assignment,
) -> None:
    """Test that insights are sorted by severity (critical first)."""
    _, _, token = insights_teacher

    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()

    insights = data["insights"]
    if len(insights) >= 2:
        # Critical should come before moderate
        severities = [i["severity"] for i in insights]
        critical_idx = next((idx for idx, s in enumerate(severities) if s == "critical"), -1)
        moderate_idx = next((idx for idx, s in enumerate(severities) if s == "moderate"), -1)
        if critical_idx >= 0 and moderate_idx >= 0:
            assert critical_idx < moderate_idx


def test_get_insights_unauthorized_without_token(client: TestClient) -> None:
    """Test that insights require authentication."""
    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights",
    )
    assert response.status_code == 401


def test_get_insight_detail_success(
    client: TestClient,
    insights_teacher: tuple[Teacher, User, str],
    low_performing_assignment: Assignment,
) -> None:
    """Test getting detailed view of an insight."""
    _, _, token = insights_teacher

    # First get the list of insights
    list_response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights",
        headers={"Authorization": f"Bearer {token}"},
    )
    insights = list_response.json()["insights"]
    assert len(insights) > 0

    insight_id = insights[0]["id"]

    # Then get detail
    detail_response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights/{insight_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert detail_response.status_code == 200
    data = detail_response.json()
    assert "insight" in data
    assert "affected_students" in data
    assert "related_assignments" in data
    assert data["insight"]["id"] == insight_id


def test_get_insight_detail_not_found(
    client: TestClient,
    insights_teacher: tuple[Teacher, User, str],
) -> None:
    """Test 404 for non-existent insight."""
    _, _, token = insights_teacher

    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights/nonexistent_insight_id",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404


def test_dismiss_insight_success(
    client: TestClient,
    session: Session,
    insights_teacher: tuple[Teacher, User, str],
    low_performing_assignment: Assignment,
) -> None:
    """Test successfully dismissing an insight."""
    teacher, _, token = insights_teacher

    # First get the list of insights
    list_response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights",
        headers={"Authorization": f"Bearer {token}"},
    )
    insights = list_response.json()["insights"]
    assert len(insights) > 0

    insight_id = insights[0]["id"]

    # Dismiss it
    dismiss_response = client.post(
        f"{settings.API_V1_STR}/teachers/me/insights/{insight_id}/dismiss",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert dismiss_response.status_code == 200
    assert dismiss_response.json()["message"] == "Insight dismissed successfully"


def test_dismiss_insight_filters_from_future_responses(
    client: TestClient,
    insights_teacher: tuple[Teacher, User, str],
    low_performing_assignment: Assignment,
) -> None:
    """Test that dismissed insights don't appear in subsequent calls."""
    _, _, token = insights_teacher

    # Get initial insights
    list_response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights",
        headers={"Authorization": f"Bearer {token}"},
    )
    initial_insights = list_response.json()["insights"]
    assert len(initial_insights) > 0
    insight_id = initial_insights[0]["id"]

    # Dismiss it
    client.post(
        f"{settings.API_V1_STR}/teachers/me/insights/{insight_id}/dismiss",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Get insights again - should not include dismissed one
    list_response2 = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights",
        headers={"Authorization": f"Bearer {token}"},
    )
    new_insights = list_response2.json()["insights"]

    dismissed_ids = [i["id"] for i in new_insights]
    assert insight_id not in dismissed_ids


def test_dismiss_insight_already_dismissed(
    client: TestClient,
    insights_teacher: tuple[Teacher, User, str],
    low_performing_assignment: Assignment,
) -> None:
    """Test that dismissing same insight twice returns 404."""
    _, _, token = insights_teacher

    # Get an insight
    list_response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights",
        headers={"Authorization": f"Bearer {token}"},
    )
    insights = list_response.json()["insights"]
    insight_id = insights[0]["id"]

    # Dismiss it once
    client.post(
        f"{settings.API_V1_STR}/teachers/me/insights/{insight_id}/dismiss",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Try to dismiss again
    second_response = client.post(
        f"{settings.API_V1_STR}/teachers/me/insights/{insight_id}/dismiss",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert second_response.status_code == 404


def test_student_cannot_access_teacher_insights(
    client: TestClient,
    insights_students: list[tuple[Student, User]],
) -> None:
    """Test that students cannot access teacher insights."""
    _, student_user = insights_students[0]
    student_token = create_access_token(student_user.id, timedelta(minutes=30))

    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    # Should fail with 403 (wrong role)
    assert response.status_code == 403


def test_teacher_only_sees_own_class_insights(
    client: TestClient,
    session: Session,
    insights_teacher: tuple[Teacher, User, str],
    insights_school: School,
    low_performing_assignment: Assignment,
) -> None:
    """Test that teacher only sees insights for their own classes."""
    # Create another teacher
    other_teacher_user = User(
        email="other.teacher@insights.test.com",
        username="other_insights_teacher",
        hashed_password="hashed",
        role=UserRole.teacher,
        is_active=True,
    )
    session.add(other_teacher_user)
    session.commit()
    session.refresh(other_teacher_user)

    other_teacher = Teacher(
        id=uuid.uuid4(),
        user_id=other_teacher_user.id,
        school_id=insights_school.id,
    )
    session.add(other_teacher)
    session.commit()

    other_token = create_access_token(other_teacher_user.id, timedelta(minutes=30))

    response = client.get(
        f"{settings.API_V1_STR}/teachers/me/insights",
        headers={"Authorization": f"Bearer {other_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    # Other teacher should have no insights (no assignments)
    assert len(data["insights"]) == 0
