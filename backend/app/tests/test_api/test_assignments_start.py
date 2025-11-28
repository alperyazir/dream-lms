"""
Tests for assignment start API endpoint - Story 4.1
GET /api/v1/assignments/{assignment_id}/start
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
    AssignmentStatus,
    AssignmentStudent,
    Book,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


class TestStartAssignment:
    """Tests for GET /api/v1/assignments/{assignment_id}/start endpoint."""

    @pytest.fixture(name="test_assignment")
    def test_assignment_fixture(
        self,
        session: Session,
        student_user: User,
        student_token: str,  # Ensure student_token is created
    ) -> tuple[Assignment, AssignmentStudent, Student]:
        """Create a test assignment with all necessary relationships."""
        # Create publisher
        pub_user = User(
            id=uuid.uuid4(),
            email="pub_start@test.com",
            username="pubstart",
            hashed_password="hash",
            role=UserRole.publisher,
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
            publisher_id=publisher.id,
            name="Test School",
        )
        session.add(school)
        session.commit()

        # Create teacher
        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher_start@test.com",
            username="teacherstart",
            hashed_password="hash",
            role=UserRole.teacher,
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

        # Create student linked to student_user
        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            school_id=school.id,
        )
        session.add(student)
        session.commit()
        session.refresh(student)

        # Create book
        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="test-book-123",
            title="Test Book",
            book_name="Test Book Name",
            publisher_name="Test Publisher",
            publisher_id=publisher.id,
            cover_image_url="https://example.com/cover.jpg",
        )
        session.add(book)
        session.commit()

        # Create activity
        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            dream_activity_id="test-activity-123",
            module_name="Test Module",
            page_number=1,
            section_index=1,
            activity_type=ActivityType.circle,
            title="Test Activity",
            config_json={"questions": [{"id": 1, "text": "Sample question"}]},
            order_index=0,
        )
        session.add(activity)
        session.commit()

        # Create assignment
        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            activity_id=activity.id,
            book_id=book.id,
            name="Test Assignment",
            instructions="Complete the activity",
            due_date=datetime.now(UTC) + timedelta(days=7),
            time_limit_minutes=30,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(assignment)
        session.commit()

        # Create assignment-student relationship
        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.not_started,
            score=None,
            answers_json=None,
            progress_json=None,
            started_at=None,
            completed_at=None,
            time_spent_minutes=0,
            last_saved_at=None,
        )
        session.add(assignment_student)
        session.commit()

        # Refresh to load relationships
        session.refresh(assignment)
        session.refresh(assignment_student)
        session.refresh(student)

        return assignment, assignment_student, student

    def test_start_assignment_requires_authentication(
        self, client: TestClient, test_assignment: tuple
    ):
        """Test that unauthenticated requests are rejected (401)."""
        # Given: Test assignment exists
        assignment, _, _ = test_assignment

        # When: Request endpoint without auth
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start"
        )

        # Then: Returns 401 Unauthorized
        assert response.status_code == 401

    def test_start_assignment_requires_student_role(
        self, client: TestClient, teacher_token: str, test_assignment: tuple
    ):
        """Test that non-student users cannot start assignments (403)."""
        # Given: Teacher user authenticated and assignment exists
        assignment, _, _ = test_assignment

        # When: Teacher tries to start student assignment
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        # Then: Returns 403 Forbidden
        assert response.status_code == 403
        assert "Required roles" in response.json()["detail"]

    def test_student_can_start_assigned_assignment(
        self,
        client: TestClient,
        session: Session,
        student_token: str,
        test_assignment: tuple,
    ):
        """Test that student can start their assigned assignment (200, status→in_progress)."""
        # Given: Student has assignment in not_started state
        assignment, assignment_student, student = test_assignment

        # When: Student starts the assignment
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        # Then: Returns 200 OK with activity data
        if response.status_code != 200:
            print(f"Error response: {response.json()}")
            print(f"Assignment ID: {assignment.id}")
            print(f"Student ID from fixture: {student.id}")
            print(f"Assignment Student ID: {assignment_student.student_id}")
        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert data["assignment_id"] == str(assignment.id)
        assert data["assignment_name"] == "Test Assignment"
        assert data["instructions"] == "Complete the activity"
        assert data["time_limit_minutes"] == 30
        assert data["book_title"] == "Test Book"
        assert data["activity_title"] == "Test Activity"
        assert data["activity_type"] == "circle"
        assert "config_json" in data
        assert data["config_json"]["questions"][0]["text"] == "Sample question"
        assert data["current_status"] == "in_progress"
        assert data["time_spent_minutes"] == 0
        assert data["progress_json"] is None

        # Verify database update
        session.refresh(assignment_student)
        assert assignment_student.status == AssignmentStatus.in_progress
        assert assignment_student.started_at is not None

    def test_student_cannot_start_unassigned_assignment(
        self,
        client: TestClient,
        session: Session,
        student_user: User,
        student_token: str,
    ):
        """Test that student cannot start assignment not assigned to them (404)."""
        # Given: Assignment exists but not assigned to this student
        # Create a different student and assignment
        pub_user = User(
            id=uuid.uuid4(),
            email="pub2@test.com",
            username="pub2",
            hashed_password="hash",
            role=UserRole.publisher,
        )
        session.add(pub_user)
        session.commit()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=pub_user.id,
            name="Publisher 2",
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            name="School 2",
        )
        session.add(school)
        session.commit()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher2@test.com",
            username="teacher2",
            hashed_password="hash",
            role=UserRole.teacher,
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

        # Create another student
        other_student_user = User(
            id=uuid.uuid4(),
            email="student2@test.com",
            username="student2",
            hashed_password="hash",
            role=UserRole.student,
        )
        session.add(other_student_user)
        session.commit()

        other_student = Student(
            id=uuid.uuid4(),
            user_id=other_student_user.id,
            school_id=school.id,
        )
        session.add(other_student)
        session.commit()

        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="test-book-2",
            title="Book 2",
            book_name="Book 2 Name",
            publisher_name="Publisher 2",
            publisher_id=publisher.id,
        )
        session.add(book)
        session.commit()

        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 2",
            page_number=1,
            section_index=1,
            activity_type=ActivityType.circle,
            title="Activity 2",
            config_json={},
        )
        session.add(activity)
        session.commit()

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            activity_id=activity.id,
            book_id=book.id,
            name="Other Assignment",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(assignment)
        session.commit()

        # Assign to OTHER student (not current student)
        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=other_student.id,
            status=AssignmentStatus.not_started,
        )
        session.add(assignment_student)
        session.commit()

        # When: Current student tries to start assignment not assigned to them
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        # Then: Returns 404 Not Found
        assert response.status_code == 404
        assert "Assignment not found" in response.json()["detail"]

    def test_student_cannot_start_completed_assignment(
        self,
        client: TestClient,
        session: Session,
        student_token: str,
        test_assignment: tuple,
    ):
        """Test that student cannot restart completed assignment (409)."""
        # Given: Student has assignment in completed state
        assignment, assignment_student, student = test_assignment

        # Mark assignment as completed
        assignment_student.status = AssignmentStatus.completed
        assignment_student.started_at = datetime.now(UTC) - timedelta(hours=1)
        assignment_student.completed_at = datetime.now(UTC)
        assignment_student.score = 85
        session.add(assignment_student)
        session.commit()

        # When: Student tries to start completed assignment
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        # Then: Returns 409 Conflict
        assert response.status_code == 409
        assert "already completed" in response.json()["detail"]

    def test_started_at_set_on_first_start(
        self,
        client: TestClient,
        session: Session,
        student_token: str,
        test_assignment: tuple,
    ):
        """Test that started_at timestamp is set correctly on first start."""
        # Given: Assignment in not_started state
        assignment, assignment_student, student = test_assignment
        assert assignment_student.started_at is None

        # When: Student starts assignment
        before_start = datetime.now(UTC)
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        after_start = datetime.now(UTC)

        # Then: started_at is set
        assert response.status_code == 200
        session.refresh(assignment_student)
        assert assignment_student.started_at is not None
        assert before_start <= assignment_student.started_at <= after_start

    def test_resume_in_progress_returns_saved_progress(
        self,
        client: TestClient,
        session: Session,
        student_token: str,
        test_assignment: tuple,
    ):
        """Test that resuming in_progress assignment returns saved progress_json."""
        # Given: Assignment in in_progress state with saved progress
        assignment, assignment_student, student = test_assignment

        assignment_student.status = AssignmentStatus.in_progress
        assignment_student.started_at = datetime.now(UTC) - timedelta(minutes=10)
        assignment_student.time_spent_minutes = 5
        assignment_student.progress_json = {
            "current_question": 2,
            "answers": {"q1": "answer1"},
        }
        session.add(assignment_student)
        session.commit()

        # When: Student resumes assignment
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        # Then: Returns progress_json
        assert response.status_code == 200
        data = response.json()
        assert data["current_status"] == "in_progress"
        assert data["time_spent_minutes"] == 5
        assert data["progress_json"] is not None
        assert data["progress_json"]["current_question"] == 2
        assert data["progress_json"]["answers"]["q1"] == "answer1"

        # Verify status didn't change (still in_progress)
        session.refresh(assignment_student)
        assert assignment_student.status == AssignmentStatus.in_progress

    def test_response_includes_activity_config(
        self,
        client: TestClient,
        student_token: str,
        test_assignment: tuple,
    ):
        """Test that response includes complete activity config_json."""
        # Given: Assignment with activity config
        assignment, assignment_student, student = test_assignment

        # When: Student starts assignment
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        # Then: config_json is included in response
        assert response.status_code == 200
        data = response.json()
        assert "config_json" in data
        assert isinstance(data["config_json"], dict)
        assert "questions" in data["config_json"]
