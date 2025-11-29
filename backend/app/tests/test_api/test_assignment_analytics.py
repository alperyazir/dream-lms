"""
Integration tests for assignment analytics API - Story 5.3
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
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


@pytest.fixture(name="asgn_analytics_publisher")
def publisher_fixture(session: Session) -> Publisher:
    """Create a test publisher."""
    publisher_user = User(
        email="asgn.analytics.publisher@test.com",
        username="asgn_analytics_publisher",
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
        name="Assignment Analytics Publisher",
        contact_email="asgn.analytics@publisher.com",
    )
    session.add(publisher)
    session.commit()
    session.refresh(publisher)
    return publisher


@pytest.fixture(name="asgn_analytics_school")
def school_fixture(session: Session, asgn_analytics_publisher: Publisher) -> School:
    """Create a test school."""
    school = School(
        id=uuid.uuid4(),
        name="Assignment Analytics School",
        address="789 Analytics Blvd",
        contact_info="asgn.analytics@school.com",
        publisher_id=asgn_analytics_publisher.id,
    )
    session.add(school)
    session.commit()
    session.refresh(school)
    return school


@pytest.fixture(name="asgn_analytics_teacher")
def teacher_fixture(session: Session, asgn_analytics_school: School) -> tuple[Teacher, User, str]:
    """Create teacher with token."""
    teacher_user = User(
        email="asgn.analytics.teacher@test.com",
        username="asgn_analytics_teacher",
        hashed_password="hashed",
        role=UserRole.teacher,
        is_active=True,
        full_name="Assignment Analytics Teacher",
    )
    session.add(teacher_user)
    session.commit()
    session.refresh(teacher_user)

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=asgn_analytics_school.id,
        subject_specialization="Math",
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    token = create_access_token(teacher_user.id, timedelta(minutes=30))
    return teacher, teacher_user, token


@pytest.fixture(name="asgn_analytics_other_teacher")
def other_teacher_fixture(session: Session, asgn_analytics_school: School) -> tuple[Teacher, User, str]:
    """Create another teacher for authorization tests."""
    teacher_user = User(
        email="other.asgn.teacher@test.com",
        username="other_asgn_teacher",
        hashed_password="hashed",
        role=UserRole.teacher,
        is_active=True,
        full_name="Other Assignment Teacher",
    )
    session.add(teacher_user)
    session.commit()
    session.refresh(teacher_user)

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=asgn_analytics_school.id,
        subject_specialization="Science",
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    token = create_access_token(teacher_user.id, timedelta(minutes=30))
    return teacher, teacher_user, token


@pytest.fixture(name="asgn_analytics_class")
def class_fixture(
    session: Session,
    asgn_analytics_school: School,
    asgn_analytics_teacher: tuple[Teacher, User, str],
) -> tuple[Class, list[tuple[Student, User]]]:
    """Create a class with 5 enrolled students."""
    teacher, _, _ = asgn_analytics_teacher

    test_class = Class(
        id=uuid.uuid4(),
        name="Assignment Analytics Test Class",
        teacher_id=teacher.id,
        school_id=asgn_analytics_school.id,
        grade_level="5",
        subject="Math",
        academic_year="2024-2025",
    )
    session.add(test_class)
    session.commit()

    students = []
    for i in range(5):
        student_user = User(
            email=f"asgn.student{i}@test.com",
            username=f"asgn_student_{i}",
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
            school_id=asgn_analytics_school.id,
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


@pytest.fixture(name="assignment_with_varied_submissions")
def assignment_with_submissions_fixture(
    session: Session,
    asgn_analytics_class: tuple[Class, list[tuple[Student, User]]],
    asgn_analytics_teacher: tuple[Teacher, User, str],
    asgn_analytics_publisher: Publisher,
) -> tuple[Assignment, Activity, list[AssignmentStudent]]:
    """Create assignment with varied completion data and answers."""
    test_class, students = asgn_analytics_class
    teacher, _, _ = asgn_analytics_teacher

    # Create book
    book = Book(
        id=uuid.uuid4(),
        publisher_id=asgn_analytics_publisher.id,
        dream_storage_id="asgn-analytics-book-001",
        title="Assignment Analytics Test Book",
        book_name="Assignment Analytics Test Book",
        publisher_name="Test Publisher",
        dcs_activity_count=10,
    )
    session.add(book)
    session.commit()

    # Create activity with config for question analysis
    activity = Activity(
        id=uuid.uuid4(),
        book_id=book.id,
        dream_activity_id="asgn-analytics-activity-001",
        module_name="Module 1",
        page_number=1,
        section_index=0,
        activity_type=ActivityType.dragdroppicture,
        title="Drag Drop Picture Activity",
        config_json={
            "type": "dragdroppicture",
            "answer": [
                {"coords": {"x": 0, "y": 0}, "word": "apple"},
                {"coords": {"x": 1, "y": 0}, "word": "banana"},
                {"coords": {"x": 2, "y": 0}, "word": "cherry"},
            ],
        },
    )
    session.add(activity)
    session.commit()

    # Create assignment
    now = datetime.now(UTC)
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        book_id=book.id,
        activity_id=activity.id,
        name="Test Assignment with Submissions",
        instructions="Complete the drag and drop activity",
        due_date=now + timedelta(days=7),
        time_limit_minutes=30,
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    # Create varied submissions
    # Student 0: Completed, score 100, all correct
    # Student 1: Completed, score 80, some wrong
    # Student 2: Completed, score 60, most wrong
    # Student 3: In progress
    # Student 4: Not started
    assignment_students = []

    for i, (student, _) in enumerate(students):
        if i == 0:  # All correct
            status = AssignmentStatus.completed
            score = 100
            answers = {"0-0": "apple", "1-0": "banana", "2-0": "cherry"}
            completed_at = now - timedelta(days=1)
            time_spent = 15
        elif i == 1:  # Some wrong
            status = AssignmentStatus.completed
            score = 67
            answers = {"0-0": "apple", "1-0": "cherry", "2-0": "cherry"}  # 2 correct
            completed_at = now - timedelta(days=2)
            time_spent = 20
        elif i == 2:  # Most wrong
            status = AssignmentStatus.completed
            score = 33
            answers = {"0-0": "banana", "1-0": "cherry", "2-0": "cherry"}  # 1 correct
            completed_at = now - timedelta(days=3)
            time_spent = 25
        elif i == 3:  # In progress
            status = AssignmentStatus.in_progress
            score = None
            answers = None
            completed_at = None
            time_spent = 10
        else:  # Not started
            status = AssignmentStatus.not_started
            score = None
            answers = None
            completed_at = None
            time_spent = 0

        asgn_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=status,
            score=score,
            answers_json=answers,
            completed_at=completed_at,
            time_spent_minutes=time_spent,
            started_at=(completed_at - timedelta(minutes=time_spent)) if completed_at else None,
        )
        session.add(asgn_student)
        assignment_students.append(asgn_student)

    session.commit()
    return assignment, activity, assignment_students


@pytest.fixture(name="empty_assignment")
def empty_assignment_fixture(
    session: Session,
    asgn_analytics_class: tuple[Class, list[tuple[Student, User]]],
    asgn_analytics_teacher: tuple[Teacher, User, str],
    asgn_analytics_publisher: Publisher,
) -> Assignment:
    """Create assignment with no submissions."""
    test_class, students = asgn_analytics_class
    teacher, _, _ = asgn_analytics_teacher

    book = Book(
        id=uuid.uuid4(),
        publisher_id=asgn_analytics_publisher.id,
        dream_storage_id="empty-asgn-book-001",
        title="Empty Assignment Book",
        book_name="Empty Assignment Book",
        publisher_name="Test Publisher",
        dcs_activity_count=5,
    )
    session.add(book)
    session.commit()

    activity = Activity(
        id=uuid.uuid4(),
        book_id=book.id,
        dream_activity_id="empty-asgn-activity-001",
        module_name="Module 1",
        page_number=1,
        section_index=0,
        activity_type=ActivityType.circle,
        title="Circle Activity",
        config_json={"type": "circle"},
    )
    session.add(activity)
    session.commit()

    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        book_id=book.id,
        activity_id=activity.id,
        name="Empty Assignment",
        due_date=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(assignment)
    session.commit()

    # Create not_started records for all students
    for student, _ in students:
        asgn_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.not_started,
        )
        session.add(asgn_student)

    session.commit()
    session.refresh(assignment)
    return assignment


# --- Tests ---


def test_get_assignment_detailed_results_success(
    client: TestClient,
    assignment_with_varied_submissions: tuple[Assignment, Activity, list[AssignmentStudent]],
    asgn_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test successful retrieval of detailed assignment results."""
    assignment, activity, _ = assignment_with_varied_submissions
    _, _, teacher_token = asgn_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/detailed-results",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "assignment_id" in data
    assert "assignment_name" in data
    assert "activity_type" in data
    assert "completion_overview" in data
    assert "score_statistics" in data
    assert "student_results" in data
    assert "question_analysis" in data

    # Verify assignment info
    assert data["assignment_id"] == str(assignment.id)
    assert data["assignment_name"] == "Test Assignment with Submissions"
    assert data["activity_type"] == "dragdroppicture"


def test_get_assignment_completion_overview(
    client: TestClient,
    assignment_with_varied_submissions: tuple[Assignment, Activity, list[AssignmentStudent]],
    asgn_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test completion overview calculation."""
    assignment, _, _ = assignment_with_varied_submissions
    _, _, teacher_token = asgn_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/detailed-results",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    overview = data["completion_overview"]

    # We have: 3 completed, 1 in_progress, 1 not_started
    assert overview["completed"] == 3
    assert overview["in_progress"] == 1
    assert overview["not_started"] == 1
    assert overview["total"] == 5
    # Past due should be 0 since due_date is in future
    assert overview["past_due"] == 0


def test_get_assignment_score_statistics(
    client: TestClient,
    assignment_with_varied_submissions: tuple[Assignment, Activity, list[AssignmentStudent]],
    asgn_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test score statistics calculation."""
    assignment, _, _ = assignment_with_varied_submissions
    _, _, teacher_token = asgn_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/detailed-results",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    stats = data["score_statistics"]

    # Scores: 100, 67, 33 (sorted: 33, 67, 100)
    # Average: (100 + 67 + 33) / 3 = 66.67
    assert stats is not None
    assert 66 <= stats["avg_score"] <= 67  # Allow rounding
    assert stats["median_score"] == 67  # Middle value
    assert stats["highest_score"] == 100
    assert stats["lowest_score"] == 33


def test_get_assignment_student_results(
    client: TestClient,
    assignment_with_varied_submissions: tuple[Assignment, Activity, list[AssignmentStudent]],
    asgn_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test student results list."""
    assignment, _, _ = assignment_with_varied_submissions
    _, _, teacher_token = asgn_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/detailed-results",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    results = data["student_results"]

    assert len(results) == 5

    for result in results:
        assert "student_id" in result
        assert "name" in result
        assert "status" in result
        assert "score" in result
        assert "time_spent_minutes" in result
        assert "completed_at" in result

    # Verify we have different statuses
    statuses = [r["status"] for r in results]
    assert "completed" in statuses
    assert "in_progress" in statuses
    assert "not_started" in statuses


def test_get_assignment_question_analysis_dragdrop(
    client: TestClient,
    assignment_with_varied_submissions: tuple[Assignment, Activity, list[AssignmentStudent]],
    asgn_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test question-level analysis for dragdroppicture activity."""
    assignment, _, _ = assignment_with_varied_submissions
    _, _, teacher_token = asgn_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/detailed-results",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    analysis = data["question_analysis"]

    assert analysis is not None
    assert analysis["activity_type"] == "dragdroppicture"
    assert "questions" in analysis
    assert "most_missed" in analysis

    # Should have 3 questions (zones)
    questions = analysis["questions"]
    assert len(questions) == 3

    for q in questions:
        assert "question_id" in q
        assert "question_text" in q
        assert "correct_percentage" in q
        assert "total_responses" in q
        assert "answer_distribution" in q

    # Check most missed (top 3 lowest correct %)
    most_missed = analysis["most_missed"]
    assert len(most_missed) <= 3

    for mm in most_missed:
        assert "question_id" in mm
        assert "question_text" in mm
        assert "correct_percentage" in mm
        assert "common_wrong_answer" in mm


def test_get_assignment_most_missed_questions(
    client: TestClient,
    assignment_with_varied_submissions: tuple[Assignment, Activity, list[AssignmentStudent]],
    asgn_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test identification of most missed questions."""
    assignment, _, _ = assignment_with_varied_submissions
    _, _, teacher_token = asgn_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/detailed-results",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    most_missed = data["question_analysis"]["most_missed"]

    # Most missed should be sorted by lowest correct percentage
    if len(most_missed) > 1:
        for i in range(1, len(most_missed)):
            assert most_missed[i - 1]["correct_percentage"] <= most_missed[i]["correct_percentage"]


def test_get_assignment_authorization_own_assignment_only(
    client: TestClient,
    assignment_with_varied_submissions: tuple[Assignment, Activity, list[AssignmentStudent]],
    asgn_analytics_other_teacher: tuple[Teacher, User, str],
) -> None:
    """Test that teacher can only access their own assignments."""
    assignment, _, _ = assignment_with_varied_submissions
    _, _, other_token = asgn_analytics_other_teacher

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/detailed-results",
        headers={"Authorization": f"Bearer {other_token}"},
    )

    # Should return 404 (not found) to not expose existence of other assignments
    assert response.status_code == 404


def test_get_assignment_empty_no_completed(
    client: TestClient,
    empty_assignment: Assignment,
    asgn_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test analytics for assignment with no completed submissions."""
    _, _, teacher_token = asgn_analytics_teacher

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{empty_assignment.id}/detailed-results",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Completion overview should show all not started
    assert data["completion_overview"]["completed"] == 0
    assert data["completion_overview"]["not_started"] == 5

    # Score statistics should be None since no completions
    assert data["score_statistics"] is None

    # Question analysis may be None or empty
    # (no answers to analyze)


def test_get_assignment_nonexistent(
    client: TestClient,
    asgn_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test analytics for non-existent assignment."""
    _, _, teacher_token = asgn_analytics_teacher

    fake_id = uuid.uuid4()
    response = client.get(
        f"{settings.API_V1_STR}/assignments/{fake_id}/detailed-results",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 404


def test_get_student_answers_success(
    client: TestClient,
    assignment_with_varied_submissions: tuple[Assignment, Activity, list[AssignmentStudent]],
    asgn_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test retrieval of individual student's answers."""
    assignment, _, asgn_students = assignment_with_varied_submissions
    _, _, teacher_token = asgn_analytics_teacher

    # Get first student's answers (completed with full answers)
    student_submission = asgn_students[0]

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student_submission.student_id}/answers",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assert "student_id" in data
    assert "name" in data
    assert "status" in data
    assert "score" in data
    assert "time_spent_minutes" in data
    assert "answers_json" in data

    # Should have full answers
    assert data["status"] == "completed"
    assert data["score"] == 100
    assert data["answers_json"] is not None


def test_get_student_answers_authorization(
    client: TestClient,
    assignment_with_varied_submissions: tuple[Assignment, Activity, list[AssignmentStudent]],
    asgn_analytics_other_teacher: tuple[Teacher, User, str],
) -> None:
    """Test that teacher can only view answers for their own assignments."""
    assignment, _, asgn_students = assignment_with_varied_submissions
    _, _, other_token = asgn_analytics_other_teacher

    student_submission = asgn_students[0]

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{student_submission.student_id}/answers",
        headers={"Authorization": f"Bearer {other_token}"},
    )

    assert response.status_code == 404


def test_get_student_answers_nonexistent_student(
    client: TestClient,
    assignment_with_varied_submissions: tuple[Assignment, Activity, list[AssignmentStudent]],
    asgn_analytics_teacher: tuple[Teacher, User, str],
) -> None:
    """Test getting answers for non-existent student submission."""
    assignment, _, _ = assignment_with_varied_submissions
    _, _, teacher_token = asgn_analytics_teacher

    fake_student_id = uuid.uuid4()
    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/students/{fake_student_id}/answers",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    assert response.status_code == 404


def test_get_assignment_requires_teacher_role(
    client: TestClient,
    session: Session,
    assignment_with_varied_submissions: tuple[Assignment, Activity, list[AssignmentStudent]],
    asgn_analytics_class: tuple[Class, list[tuple[Student, User]]],
) -> None:
    """Test that non-teachers cannot access assignment analytics."""
    assignment, _, _ = assignment_with_varied_submissions
    _, students = asgn_analytics_class
    _, student_user = students[0]

    # Create student token
    student_token = create_access_token(student_user.id, timedelta(minutes=30))

    response = client.get(
        f"{settings.API_V1_STR}/assignments/{assignment.id}/detailed-results",
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert response.status_code == 403
