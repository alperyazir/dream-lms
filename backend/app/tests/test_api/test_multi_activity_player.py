"""
Tests for Multi-Activity Player API endpoints (Story 8.3).

Tests cover:
- GET /api/v1/assignments/{assignment_id}/start-multi
- PATCH /api/v1/assignments/{assignment_id}/students/me/activities/{activity_id}
- POST /api/v1/assignments/{assignment_id}/students/me/submit-multi
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
    AssignmentStatus,
    AssignmentStudent,
    AssignmentStudentActivity,
    AssignmentStudentActivityStatus,
    Book,
    BookStatus,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


class TestStartMultiActivityAssignment:
    """Tests for GET /api/v1/assignments/{assignment_id}/start-multi endpoint."""

    @pytest.fixture(name="multi_activity_assignment")
    def multi_activity_assignment_fixture(
        self,
        session: Session,
        student_user: User,
        student_token: str,
    ) -> tuple[Assignment, AssignmentStudent, Student, list[Activity]]:
        """Create a multi-activity assignment with 3 activities."""
        # Create publisher
        pub_user = User(
            id=uuid.uuid4(),
            email="pub_multi@test.com",
            username="pubmulti",
            hashed_password="hash",
            role=UserRole.publisher,
        )
        session.add(pub_user)
        session.commit()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=pub_user.id,
            name="Test Publisher Multi",
        )
        session.add(publisher)
        session.commit()

        # Create school
        school = School(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            name="Test School Multi",
        )
        session.add(school)
        session.commit()

        # Create teacher
        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher_multi@test.com",
            username="teachermulti",
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
            dream_storage_id="test-book-multi",
            title="Multi-Activity Book",
            book_name="multi-book",
            publisher_name="Test Publisher Multi",
            publisher_id=publisher.id,
            cover_image_url="https://example.com/cover.jpg",
            status=BookStatus.published,
        )
        session.add(book)
        session.commit()

        # Create 3 activities
        activities = []
        for i in range(3):
            activity = Activity(
                id=uuid.uuid4(),
                book_id=book.id,
                dream_activity_id=f"activity-{i}",
                module_name="Test Module",
                page_number=i + 1,
                section_index=0,
                activity_type=ActivityType.circle if i == 0 else ActivityType.matchTheWords,
                title=f"Activity {i + 1}",
                config_json={"questions": [{"id": 1, "text": f"Question {i + 1}"}]},
                order_index=i,
            )
            session.add(activity)
            activities.append(activity)
        session.commit()

        # Create assignment (with first activity as legacy activity_id)
        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            activity_id=activities[0].id,
            book_id=book.id,
            name="Multi-Activity Assignment",
            instructions="Complete all activities",
            due_date=datetime.now(UTC) + timedelta(days=7),
            time_limit_minutes=60,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(assignment)
        session.commit()

        # Create AssignmentActivity junction records
        for i, activity in enumerate(activities):
            aa = AssignmentActivity(
                id=uuid.uuid4(),
                assignment_id=assignment.id,
                activity_id=activity.id,
                order_index=i,
            )
            session.add(aa)
        session.commit()

        # Create assignment-student relationship
        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.not_started,
        )
        session.add(assignment_student)
        session.commit()
        session.refresh(assignment_student)

        return assignment, assignment_student, student, activities

    def test_start_multi_returns_all_activities(
        self,
        client: TestClient,
        student_token: str,
        multi_activity_assignment: tuple,
    ):
        """Test that start-multi returns all activities with configs."""
        assignment, _, _, activities = multi_activity_assignment

        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start-multi",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["assignment_id"] == str(assignment.id)
        assert data["total_activities"] == 3
        assert len(data["activities"]) == 3
        assert len(data["activity_progress"]) == 3

        # Verify activities are in order
        for i, act in enumerate(data["activities"]):
            assert act["order_index"] == i
            assert "config_json" in act

    def test_start_multi_initializes_activity_progress(
        self,
        client: TestClient,
        student_token: str,
        multi_activity_assignment: tuple,
    ):
        """Test that start-multi initializes AssignmentStudentActivity records."""
        assignment, _, _, _ = multi_activity_assignment

        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start-multi",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # All progress records should be initialized as not_started
        for progress in data["activity_progress"]:
            assert progress["status"] == "not_started"
            assert progress["score"] is None

    def test_start_multi_sets_status_to_in_progress(
        self,
        client: TestClient,
        student_token: str,
        multi_activity_assignment: tuple,
    ):
        """Test that start-multi changes status to in_progress."""
        assignment, _, _, _ = multi_activity_assignment

        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start-multi",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["current_status"] == "in_progress"

    def test_start_multi_resume_returns_existing_progress(
        self,
        client: TestClient,
        session: Session,
        student_token: str,
        multi_activity_assignment: tuple,
    ):
        """Test that resuming returns previous progress."""
        assignment, assignment_student, _, activities = multi_activity_assignment

        # Manually create some progress
        progress = AssignmentStudentActivity(
            id=uuid.uuid4(),
            assignment_student_id=assignment_student.id,
            activity_id=activities[0].id,
            status=AssignmentStudentActivityStatus.completed,
            score=80.0,
            max_score=100.0,
            response_data={"answer": "test"},
            started_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )
        session.add(progress)
        assignment_student.status = AssignmentStatus.in_progress
        session.commit()

        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start-multi",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Find the completed activity
        completed = next(
            p for p in data["activity_progress"]
            if p["activity_id"] == str(activities[0].id)
        )
        assert completed["status"] == "completed"
        assert completed["score"] == 80.0

    def test_start_multi_completed_assignment_returns_409(
        self,
        client: TestClient,
        session: Session,
        student_token: str,
        multi_activity_assignment: tuple,
    ):
        """Test that starting a completed assignment returns 409."""
        assignment, assignment_student, _, _ = multi_activity_assignment

        # Mark assignment as completed
        assignment_student.status = AssignmentStatus.completed
        session.commit()

        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/start-multi",
            headers={"Authorization": f"Bearer {student_token}"},
        )

        assert response.status_code == 409


class TestSaveActivityProgress:
    """Tests for PATCH /api/v1/assignments/{id}/students/me/activities/{activity_id}."""

    @pytest.fixture(name="started_assignment")
    def started_assignment_fixture(
        self,
        session: Session,
        student_user: User,
        student_token: str,
    ) -> tuple[Assignment, AssignmentStudent, Student, list[Activity]]:
        """Create an in-progress multi-activity assignment."""
        # Create all required entities (similar to above)
        pub_user = User(
            id=uuid.uuid4(),
            email="pub_save@test.com",
            username="pubsave",
            hashed_password="hash",
            role=UserRole.publisher,
        )
        session.add(pub_user)
        session.commit()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=pub_user.id,
            name="Test Publisher Save",
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            name="Test School Save",
        )
        session.add(school)
        session.commit()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher_save@test.com",
            username="teachersave",
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

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            school_id=school.id,
        )
        session.add(student)
        session.commit()

        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="test-book-save",
            title="Save Test Book",
            book_name="save-book",
            publisher_name="Test Publisher Save",
            publisher_id=publisher.id,
            status=BookStatus.published,
        )
        session.add(book)
        session.commit()

        activities = []
        for i in range(2):
            activity = Activity(
                id=uuid.uuid4(),
                book_id=book.id,
                dream_activity_id=f"save-activity-{i}",
                module_name="Test Module",
                page_number=i + 1,
                section_index=0,
                activity_type=ActivityType.circle,
                title=f"Save Activity {i + 1}",
                config_json={},
                order_index=i,
            )
            session.add(activity)
            activities.append(activity)
        session.commit()

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            activity_id=activities[0].id,
            book_id=book.id,
            name="Save Test Assignment",
        )
        session.add(assignment)
        session.commit()

        for i, activity in enumerate(activities):
            aa = AssignmentActivity(
                id=uuid.uuid4(),
                assignment_id=assignment.id,
                activity_id=activity.id,
                order_index=i,
            )
            session.add(aa)
        session.commit()

        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.in_progress,
            started_at=datetime.now(UTC),
        )
        session.add(assignment_student)
        session.commit()

        return assignment, assignment_student, student, activities

    def test_save_progress_updates_record(
        self,
        client: TestClient,
        student_token: str,
        started_assignment: tuple,
    ):
        """Test that saving progress updates the correct record."""
        assignment, _, _, activities = started_assignment

        response = client.patch(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/activities/{activities[0].id}",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "response_data": {"answer": "test answer"},
                "time_spent_seconds": 120,
                "status": "in_progress",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"
        assert data["activity_id"] == str(activities[0].id)

    def test_save_progress_sets_started_at_on_first_save(
        self,
        client: TestClient,
        session: Session,
        student_token: str,
        started_assignment: tuple,
    ):
        """Test that first save sets started_at."""
        assignment, assignment_student, _, activities = started_assignment

        response = client.patch(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/activities/{activities[0].id}",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "response_data": {"answer": "test"},
                "status": "in_progress",
            },
        )

        assert response.status_code == 200

        # Verify started_at was set
        session.refresh(assignment_student, ["activity_progress"])
        progress = next(
            p for p in assignment_student.activity_progress
            if p.activity_id == activities[0].id
        )
        assert progress.started_at is not None

    def test_save_progress_completed_status_requires_score(
        self,
        client: TestClient,
        student_token: str,
        started_assignment: tuple,
    ):
        """Test that completing an activity requires a score."""
        assignment, _, _, activities = started_assignment

        response = client.patch(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/activities/{activities[0].id}",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "response_data": {"answer": "final"},
                "status": "completed",
                # No score provided
            },
        )

        assert response.status_code == 422  # Validation error

    def test_save_progress_completed_with_score(
        self,
        client: TestClient,
        student_token: str,
        started_assignment: tuple,
    ):
        """Test completing an activity with score."""
        assignment, _, _, activities = started_assignment

        response = client.patch(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/activities/{activities[0].id}",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "response_data": {"answer": "final"},
                "status": "completed",
                "score": 85.0,
                "max_score": 100.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["score"] == 85.0


class TestSubmitMultiActivityAssignment:
    """Tests for POST /api/v1/assignments/{id}/students/me/submit-multi."""

    @pytest.fixture(name="completed_activities_assignment")
    def completed_activities_assignment_fixture(
        self,
        session: Session,
        student_user: User,
        student_token: str,
    ) -> tuple[Assignment, AssignmentStudent, Student, list[Activity]]:
        """Create an assignment with all activities completed."""
        pub_user = User(
            id=uuid.uuid4(),
            email="pub_submit@test.com",
            username="pubsubmit",
            hashed_password="hash",
            role=UserRole.publisher,
        )
        session.add(pub_user)
        session.commit()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=pub_user.id,
            name="Test Publisher Submit",
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            name="Test School Submit",
        )
        session.add(school)
        session.commit()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher_submit@test.com",
            username="teachersubmit",
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

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            school_id=school.id,
        )
        session.add(student)
        session.commit()

        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="test-book-submit",
            title="Submit Test Book",
            book_name="submit-book",
            publisher_name="Test Publisher Submit",
            publisher_id=publisher.id,
            status=BookStatus.published,
        )
        session.add(book)
        session.commit()

        activities = []
        for i in range(2):
            activity = Activity(
                id=uuid.uuid4(),
                book_id=book.id,
                dream_activity_id=f"submit-activity-{i}",
                module_name="Test Module",
                page_number=i + 1,
                section_index=0,
                activity_type=ActivityType.circle,
                title=f"Submit Activity {i + 1}",
                config_json={},
                order_index=i,
            )
            session.add(activity)
            activities.append(activity)
        session.commit()

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            activity_id=activities[0].id,
            book_id=book.id,
            name="Submit Test Assignment",
        )
        session.add(assignment)
        session.commit()

        for i, activity in enumerate(activities):
            aa = AssignmentActivity(
                id=uuid.uuid4(),
                assignment_id=assignment.id,
                activity_id=activity.id,
                order_index=i,
            )
            session.add(aa)
        session.commit()

        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.in_progress,
            started_at=datetime.now(UTC),
        )
        session.add(assignment_student)
        session.commit()

        # Create completed activity progress
        for i, activity in enumerate(activities):
            progress = AssignmentStudentActivity(
                id=uuid.uuid4(),
                assignment_student_id=assignment_student.id,
                activity_id=activity.id,
                status=AssignmentStudentActivityStatus.completed,
                score=80.0 + i * 10,  # 80 and 90
                max_score=100.0,
                started_at=datetime.now(UTC),
                completed_at=datetime.now(UTC),
            )
            session.add(progress)
        session.commit()

        return assignment, assignment_student, student, activities

    def test_submit_multi_validates_all_completed(
        self,
        client: TestClient,
        student_token: str,
        completed_activities_assignment: tuple,
    ):
        """Test that submit validates all activities are completed."""
        assignment, _, _, _ = completed_activities_assignment

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/submit-multi",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"total_time_spent_minutes": 30},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_activities"] == 2
        assert data["completed_activities"] == 2

    def test_submit_multi_calculates_combined_score(
        self,
        client: TestClient,
        student_token: str,
        completed_activities_assignment: tuple,
    ):
        """Test that submit calculates correct combined score."""
        assignment, _, _, _ = completed_activities_assignment

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/submit-multi",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"total_time_spent_minutes": 30},
        )

        assert response.status_code == 200
        data = response.json()
        # (80 + 90) / (100 + 100) * 100 = 85%
        assert data["combined_score"] == 85.0

    def test_submit_multi_force_submit_with_partial_completion(
        self,
        client: TestClient,
        session: Session,
        student_token: str,
        completed_activities_assignment: tuple,
    ):
        """Test force_submit allows partial completion (for timer expiry)."""
        assignment, assignment_student, _, activities = completed_activities_assignment

        # Reset one activity to in_progress
        session.refresh(assignment_student, ["activity_progress"])
        for progress in assignment_student.activity_progress:
            if progress.activity_id == activities[1].id:
                progress.status = AssignmentStudentActivityStatus.in_progress
                progress.score = None
        session.commit()

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/submit-multi",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"force_submit": True, "total_time_spent_minutes": 30},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["completed_activities"] == 1
        assert data["total_activities"] == 2

    def test_submit_multi_rejects_incomplete_without_force(
        self,
        client: TestClient,
        session: Session,
        student_token: str,
        completed_activities_assignment: tuple,
    ):
        """Test that incomplete activities are rejected without force_submit."""
        assignment, assignment_student, _, activities = completed_activities_assignment

        # Reset one activity to in_progress
        session.refresh(assignment_student, ["activity_progress"])
        for progress in assignment_student.activity_progress:
            if progress.activity_id == activities[1].id:
                progress.status = AssignmentStudentActivityStatus.in_progress
                progress.score = None
        session.commit()

        response = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/submit-multi",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"force_submit": False, "total_time_spent_minutes": 30},
        )

        assert response.status_code == 400
        assert "Not all activities completed" in response.json()["detail"]

    def test_submit_multi_idempotent_for_completed(
        self,
        client: TestClient,
        session: Session,
        student_token: str,
        completed_activities_assignment: tuple,
    ):
        """Test that submitting an already completed assignment is idempotent."""
        assignment, assignment_student, _, _ = completed_activities_assignment

        # First submission
        response1 = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/submit-multi",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"total_time_spent_minutes": 30},
        )
        assert response1.status_code == 200

        # Second submission (should return same result)
        response2 = client.post(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/submit-multi",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"total_time_spent_minutes": 30},
        )
        assert response2.status_code == 200
        assert response2.json()["message"] == "Assignment already submitted"
