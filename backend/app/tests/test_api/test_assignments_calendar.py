"""
Tests for Assignment Calendar API endpoint (Story 9.6).

Tests cover:
- GET /api/v1/assignments/calendar endpoint
- Authentication: Teacher role required
- Date range filtering with start_date and end_date
- Optional filters: class_id, status, book_id
- Response structure with assignments_by_date grouping
- Color coding statuses (scheduled, published, archived)
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import (
    Activity,
    ActivityType,
    Assignment,
    AssignmentActivity,
    AssignmentPublishStatus,
    AssignmentStudent,
    AssignmentStatus,
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


@pytest.fixture(name="calendar_teacher_setup")
def calendar_teacher_setup_fixture(session: Session) -> dict:
    """
    Create a complete teacher setup with publisher, school, book, activity,
    class, and student for calendar tests.
    """
    from app.core.security import get_password_hash

    # Create publisher user
    pub_user = User(
        id=uuid.uuid4(),
        email="calendar_publisher@example.com",
        username="calendarpublisher",
        hashed_password=get_password_hash("password"),
        role=UserRole.publisher,
        is_active=True,
    )
    session.add(pub_user)
    session.commit()

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="Calendar Test Publisher",
    )
    session.add(publisher)
    session.commit()

    # Create school
    school = School(
        id=uuid.uuid4(),
        name="Calendar Test School",
        publisher_id=publisher.id,
    )
    session.add(school)
    session.commit()

    # Create teacher user
    teacher_user = User(
        id=uuid.uuid4(),
        email="calendar_teacher@example.com",
        username="calendarteacher",
        hashed_password=get_password_hash("teacherpassword"),
        role=UserRole.teacher,
        is_active=True,
        full_name="Calendar Test Teacher",
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

    # Create book
    book = Book(
        id=uuid.uuid4(),
        publisher_id=publisher.id,
        dream_storage_id="calendar-test-book",
        title="Calendar Test Book",
        book_name="Calendar Test Book",
        publisher_name="Calendar Test Publisher",
        description="A book for calendar testing",
    )
    session.add(book)
    session.commit()

    # Create activity
    activity = Activity(
        id=uuid.uuid4(),
        book_id=book.id,
        title="Calendar Test Activity",
        module_name="Calendar Test Module",
        page_number=1,
        section_index=0,
        activity_type=ActivityType.matchTheWords,
        config_json={"questions": []},
        order_index=0,
    )
    session.add(activity)
    session.commit()

    # Create class
    class_obj = Class(
        id=uuid.uuid4(),
        name="Calendar Test Class",
        teacher_id=teacher.id,
        school_id=school.id,
    )
    session.add(class_obj)
    session.commit()

    # Create student user
    student_user = User(
        id=uuid.uuid4(),
        email="calendar_student@example.com",
        username="calendarstudent",
        hashed_password=get_password_hash("studentpassword"),
        role=UserRole.student,
        is_active=True,
        full_name="Calendar Test Student",
    )
    session.add(student_user)
    session.commit()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
    )
    session.add(student)
    session.commit()

    # Add student to class
    class_student = ClassStudent(
        class_id=class_obj.id,
        student_id=student.id,
    )
    session.add(class_student)
    session.commit()

    session.refresh(publisher)
    session.refresh(school)
    session.refresh(teacher)
    session.refresh(teacher_user)
    session.refresh(book)
    session.refresh(activity)
    session.refresh(class_obj)
    session.refresh(student)

    return {
        "publisher": publisher,
        "school": school,
        "teacher": teacher,
        "teacher_user": teacher_user,
        "book": book,
        "activity": activity,
        "class": class_obj,
        "student": student,
    }


def create_assignment_with_student(
    session: Session,
    teacher: Teacher,
    book: Book,
    activity: Activity,
    student: Student,
    name: str,
    due_date: datetime | None = None,
    scheduled_publish_date: datetime | None = None,
    status: AssignmentPublishStatus = AssignmentPublishStatus.published,
) -> Assignment:
    """Helper to create an assignment with a student assigned."""
    assignment = Assignment(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        activity_id=activity.id,
        book_id=book.id,
        name=name,
        due_date=due_date,
        scheduled_publish_date=scheduled_publish_date,
        status=status,
    )
    session.add(assignment)
    session.commit()

    # Create assignment activity junction
    assignment_activity = AssignmentActivity(
        assignment_id=assignment.id,
        activity_id=activity.id,
        order_index=0,
    )
    session.add(assignment_activity)
    session.commit()

    # Assign student
    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=assignment.id,
        student_id=student.id,
        status=AssignmentStatus.not_started,
    )
    session.add(assignment_student)
    session.commit()

    session.refresh(assignment)
    return assignment


class TestCalendarEndpointAuth:
    """Test authentication and authorization for calendar endpoint."""

    def test_calendar_requires_authentication(self, client: TestClient):
        """Test that unauthenticated requests are rejected."""
        now = datetime.now(UTC)
        start = now - timedelta(days=7)
        end = now + timedelta(days=7)

        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
        )
        assert response.status_code == 401

    def test_calendar_requires_teacher_role(
        self, client: TestClient, student_token: str
    ):
        """Test that non-teacher users cannot access calendar."""
        now = datetime.now(UTC)
        start = now - timedelta(days=7)
        end = now + timedelta(days=7)

        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert response.status_code == 403


class TestCalendarEndpointBasic:
    """Test basic calendar endpoint functionality."""

    def test_calendar_returns_empty_for_no_assignments(
        self, client: TestClient, calendar_teacher_setup: dict
    ):
        """Test that calendar returns empty when no assignments exist."""
        # Get token for the calendar teacher
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": calendar_teacher_setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        assert response.status_code == 200
        token = response.json()["access_token"]

        now = datetime.now(UTC)
        start = now - timedelta(days=7)
        end = now + timedelta(days=7)

        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_assignments"] == 0
        assert data["assignments_by_date"] == {}

    def test_calendar_returns_assignment_in_date_range(
        self, client: TestClient, session: Session, calendar_teacher_setup: dict
    ):
        """Test that calendar returns assignments within the date range."""
        setup = calendar_teacher_setup
        now = datetime.now(UTC)
        due_date = now + timedelta(days=3)

        # Create an assignment
        create_assignment_with_student(
            session,
            setup["teacher"],
            setup["book"],
            setup["activity"],
            setup["student"],
            "Test Assignment 1",
            due_date=due_date,
            status=AssignmentPublishStatus.published,
        )

        # Get token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        token = response.json()["access_token"]

        start = now - timedelta(days=1)
        end = now + timedelta(days=7)

        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_assignments"] == 1

        # Check the assignment is grouped by the due date
        date_key = due_date.strftime("%Y-%m-%d")
        assert date_key in data["assignments_by_date"]
        assert len(data["assignments_by_date"][date_key]) == 1
        assert data["assignments_by_date"][date_key][0]["name"] == "Test Assignment 1"

    def test_calendar_excludes_assignments_outside_date_range(
        self, client: TestClient, session: Session, calendar_teacher_setup: dict
    ):
        """
        Test that assignments outside date range are excluded.

        Note: The calendar endpoint includes assignments based on due_date,
        scheduled_publish_date, OR created_at. Since assignments created "now"
        have a created_at within the query range, we need to query a range
        that explicitly excludes the created_at date.
        """
        setup = calendar_teacher_setup
        now = datetime.now(UTC)

        # Create assignment far in the future (outside range)
        create_assignment_with_student(
            session,
            setup["teacher"],
            setup["book"],
            setup["activity"],
            setup["student"],
            "Future Assignment",
            due_date=now + timedelta(days=60),
            status=AssignmentPublishStatus.published,
        )

        # Get token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        token = response.json()["access_token"]

        # Query for a date range in the PAST (before assignment was created)
        # This ensures the created_at is outside the range
        start = now - timedelta(days=30)
        end = now - timedelta(days=14)

        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_assignments"] == 0


class TestCalendarEndpointFilters:
    """Test calendar filtering functionality."""

    def test_calendar_filter_by_status(
        self, client: TestClient, session: Session, calendar_teacher_setup: dict
    ):
        """Test filtering assignments by status."""
        setup = calendar_teacher_setup
        now = datetime.now(UTC)
        due_date = now + timedelta(days=3)

        # Create published assignment
        create_assignment_with_student(
            session,
            setup["teacher"],
            setup["book"],
            setup["activity"],
            setup["student"],
            "Published Assignment",
            due_date=due_date,
            status=AssignmentPublishStatus.published,
        )

        # Create scheduled assignment
        create_assignment_with_student(
            session,
            setup["teacher"],
            setup["book"],
            setup["activity"],
            setup["student"],
            "Scheduled Assignment",
            scheduled_publish_date=due_date,
            due_date=due_date + timedelta(days=7),
            status=AssignmentPublishStatus.scheduled,
        )

        # Get token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        token = response.json()["access_token"]

        start = now - timedelta(days=1)
        end = now + timedelta(days=30)

        # Filter by scheduled status only
        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "status": "scheduled",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_assignments"] == 1

        # Check all assignments in response have scheduled status
        for date_key, assignments in data["assignments_by_date"].items():
            for assignment in assignments:
                assert assignment["status"] == "scheduled"

    def test_calendar_filter_by_book(
        self, client: TestClient, session: Session, calendar_teacher_setup: dict
    ):
        """Test filtering assignments by book_id."""
        setup = calendar_teacher_setup
        now = datetime.now(UTC)
        due_date = now + timedelta(days=3)

        # Create assignment with the test book
        create_assignment_with_student(
            session,
            setup["teacher"],
            setup["book"],
            setup["activity"],
            setup["student"],
            "Book 1 Assignment",
            due_date=due_date,
            status=AssignmentPublishStatus.published,
        )

        # Get token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        token = response.json()["access_token"]

        start = now - timedelta(days=1)
        end = now + timedelta(days=30)

        # Filter by book_id
        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "book_id": str(setup["book"].id),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_assignments"] == 1

        # Filter by non-existent book should return 0
        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "book_id": str(uuid.uuid4()),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_assignments"] == 0


class TestCalendarResponseStructure:
    """Test the response structure of the calendar endpoint."""

    def test_calendar_response_includes_required_fields(
        self, client: TestClient, session: Session, calendar_teacher_setup: dict
    ):
        """Test that response includes all required fields."""
        setup = calendar_teacher_setup
        now = datetime.now(UTC)
        due_date = now + timedelta(days=3)

        create_assignment_with_student(
            session,
            setup["teacher"],
            setup["book"],
            setup["activity"],
            setup["student"],
            "Complete Assignment",
            due_date=due_date,
            scheduled_publish_date=now - timedelta(days=1),
            status=AssignmentPublishStatus.published,
        )

        # Get token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        token = response.json()["access_token"]

        start = now - timedelta(days=7)
        end = now + timedelta(days=14)

        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()

        # Check top-level response structure
        assert "start_date" in data
        assert "end_date" in data
        assert "total_assignments" in data
        assert "assignments_by_date" in data

        # Check assignment item structure
        assert data["total_assignments"] >= 1
        for date_key, assignments in data["assignments_by_date"].items():
            for assignment in assignments:
                assert "id" in assignment
                assert "name" in assignment
                assert "status" in assignment
                assert "activity_count" in assignment
                assert "class_names" in assignment
                assert "book_id" in assignment
                assert "book_title" in assignment

    def test_calendar_includes_scheduled_assignments_for_teacher(
        self, client: TestClient, session: Session, calendar_teacher_setup: dict
    ):
        """Test that teachers can see their scheduled (unpublished) assignments."""
        setup = calendar_teacher_setup
        now = datetime.now(UTC)

        # Create a scheduled assignment (not yet published)
        create_assignment_with_student(
            session,
            setup["teacher"],
            setup["book"],
            setup["activity"],
            setup["student"],
            "Scheduled Future Assignment",
            scheduled_publish_date=now + timedelta(days=5),
            due_date=now + timedelta(days=12),
            status=AssignmentPublishStatus.scheduled,
        )

        # Get token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        token = response.json()["access_token"]

        start = now - timedelta(days=1)
        end = now + timedelta(days=30)

        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()

        # Teacher should see the scheduled assignment
        assert data["total_assignments"] == 1
        found = False
        for assignments in data["assignments_by_date"].values():
            for assignment in assignments:
                if assignment["name"] == "Scheduled Future Assignment":
                    assert assignment["status"] == "scheduled"
                    found = True
        assert found, "Scheduled assignment should be visible to teacher"

    def test_calendar_groups_multiple_assignments_by_date(
        self, client: TestClient, session: Session, calendar_teacher_setup: dict
    ):
        """Test that multiple assignments on same date are grouped correctly."""
        setup = calendar_teacher_setup
        now = datetime.now(UTC)
        target_date = now + timedelta(days=5)

        # Create 3 assignments with the same due date
        for i in range(3):
            create_assignment_with_student(
                session,
                setup["teacher"],
                setup["book"],
                setup["activity"],
                setup["student"],
                f"Assignment {i + 1}",
                due_date=target_date,
                status=AssignmentPublishStatus.published,
            )

        # Get token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        token = response.json()["access_token"]

        start = now - timedelta(days=1)
        end = now + timedelta(days=14)

        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()

        assert data["total_assignments"] == 3

        # All 3 should be under the same date key
        date_key = target_date.strftime("%Y-%m-%d")
        assert date_key in data["assignments_by_date"]
        assert len(data["assignments_by_date"][date_key]) == 3


class TestCalendarDateRangeValidation:
    """Test date range parameter validation."""

    def test_calendar_requires_start_date(
        self, client: TestClient, calendar_teacher_setup: dict
    ):
        """Test that start_date is required."""
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": calendar_teacher_setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        token = response.json()["access_token"]

        now = datetime.now(UTC)
        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "end_date": now.isoformat(),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422  # Validation error

    def test_calendar_requires_end_date(
        self, client: TestClient, calendar_teacher_setup: dict
    ):
        """Test that end_date is required."""
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": calendar_teacher_setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        token = response.json()["access_token"]

        now = datetime.now(UTC)
        response = client.get(
            f"{settings.API_V1_STR}/assignments/calendar",
            params={
                "start_date": now.isoformat(),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422  # Validation error
