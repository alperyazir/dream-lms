"""
Tests for student assignments API endpoint - Story 3.9
GET /api/v1/students/me/assignments
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import (
    Activity,
    Assignment,
    AssignmentStudent,
    Book,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


class TestGetStudentAssignments:
    """Tests for GET /api/v1/students/me/assignments endpoint."""

    def test_get_student_assignments_requires_authentication(
        self, client: TestClient
    ):
        """Test that unauthenticated requests are rejected (AC 13)."""
        # Given: No authentication token provided

        # When: Request endpoint without auth
        response = client.get(f"{settings.API_V1_STR}/students/me/assignments")

        # Then: Returns 401 Unauthorized
        assert response.status_code == 401

    def test_get_student_assignments_requires_student_role(
        self, client: TestClient, teacher_token: str
    ):
        """Test that non-student users cannot access endpoint (AC 13)."""
        # Given: Teacher user authenticated

        # When: Teacher tries to access student endpoint
        response = client.get(
            f"{settings.API_V1_STR}/students/me/assignments",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )

        # Then: Returns 403 Forbidden
        assert response.status_code == 403
        assert "Required roles" in response.json()["detail"]

    def test_student_can_fetch_own_assignments(
        self,
        client: TestClient,
        session: Session,
        student_user: User,
        student_token: str
    ):
        """Test that student can fetch their own assignments (AC 1, 9)."""
        # Given: Student with Student record and assignments
        # Create necessary test data structure
        pub_user = User(
            id=uuid.uuid4(),
            email="pub@test.com",
            username="pub",
            hashed_password="hash",
            role=UserRole.publisher
        )
        session.add(pub_user)
        session.commit()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=pub_user.id,
            name="Test Publisher"
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            name="Test School",
            publisher_id=publisher.id
        )
        session.add(school)
        session.commit()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher@test.com",
            username="teacher",
            hashed_password="hash",
            role=UserRole.teacher
        )
        session.add(teacher_user)
        session.commit()

        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id
        )
        session.add(teacher)
        session.commit()

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            grade_level="Grade 5"
        )
        session.add(student)
        session.commit()

        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="book-1",
            title="Test Book",
            book_name="Test Book",
            publisher_name="Test Publisher",
            publisher_id=publisher.id,
            cover_image_url="http://example.com/cover.jpg"
        )
        session.add(book)
        session.commit()

        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            dream_activity_id="activity-1",
            module_name="Module 1",
            page_number=1,
            section_index=1,
            activity_type="matchTheWords",
            title="Test Activity",
            config_json={}
        )
        session.add(activity)
        session.commit()

        # Create 3 assignments for this student
        for i in range(3):
            assignment = Assignment(
                id=uuid.uuid4(),
                teacher_id=teacher.id,
                activity_id=activity.id,
                book_id=book.id,
                name=f"Assignment {i+1}",
                instructions=f"Instructions {i+1}",
                due_date=datetime.now(UTC) + timedelta(days=i+1),
                time_limit_minutes=30,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC)
            )
            session.add(assignment)
            session.commit()

            assignment_student = AssignmentStudent(
                id=uuid.uuid4(),
                assignment_id=assignment.id,
                student_id=student.id,
                status="not_started",
                time_spent_minutes=0
            )
            session.add(assignment_student)

        session.commit()

        # When: Student requests their assignments
        response = client.get(
            f"{settings.API_V1_STR}/students/me/assignments",
            headers={"Authorization": f"Bearer {student_token}"}
        )

        # Then: Returns 200 with 3 assignments
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        # Verify response structure (AC 3, 9)
        for assignment_data in data:
            assert "assignment_id" in assignment_data
            assert "assignment_name" in assignment_data
            assert "book_id" in assignment_data
            assert "book_title" in assignment_data
            assert "book_cover_url" in assignment_data
            assert "activity_id" in assignment_data
            assert "activity_title" in assignment_data
            assert "activity_type" in assignment_data
            assert "status" in assignment_data
            assert "score" in assignment_data
            assert "is_past_due" in assignment_data
            assert "days_until_due" in assignment_data

    def test_student_cannot_see_other_students_assignments(
        self,
        client: TestClient,
        session: Session,
        student_user: User,
        student_token: str
    ):
        """Test cross-student data isolation (AC 13, 15)."""
        # Given: Two students with separate assignments
        # Setup publisher, school, teacher (reuse pattern from above)
        pub_user = User(
            id=uuid.uuid4(),
            email="pub2@test.com",
            username="pub2",
            hashed_password="hash",
            role=UserRole.publisher
        )
        session.add(pub_user)
        session.commit()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=pub_user.id,
            name="Test Publisher 2"
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            name="Test School 2",
            publisher_id=publisher.id
        )
        session.add(school)
        session.commit()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher2@test.com",
            username="teacher2",
            hashed_password="hash",
            role=UserRole.teacher
        )
        session.add(teacher_user)
        session.commit()

        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id
        )
        session.add(teacher)
        session.commit()

        # Student 1 (authenticated)
        student1 = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            grade_level="Grade 5"
        )
        session.add(student1)
        session.commit()

        # Student 2 (other student)
        student2_user = User(
            id=uuid.uuid4(),
            email="student2@test.com",
            username="student2",
            hashed_password="hash",
            role=UserRole.student
        )
        session.add(student2_user)
        session.commit()

        student2 = Student(
            id=uuid.uuid4(),
            user_id=student2_user.id,
            grade_level="Grade 5"
        )
        session.add(student2)
        session.commit()

        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="book-2",
            title="Test Book 2",
            book_name="Test Book 2",
            publisher_name="Test Publisher 2",
            publisher_id=publisher.id
        )
        session.add(book)
        session.commit()

        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            dream_activity_id="activity-2",
            module_name="Module 2",
            page_number=2,
            section_index=1,
            activity_type="dragdroppicture",
            title="Test Activity 2",
            config_json={}
        )
        session.add(activity)
        session.commit()

        # Create 2 assignments for student1
        for i in range(2):
            assignment = Assignment(
                id=uuid.uuid4(),
                teacher_id=teacher.id,
                activity_id=activity.id,
                book_id=book.id,
                name=f"Student1 Assignment {i+1}",
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC)
            )
            session.add(assignment)
            session.commit()

            assignment_student = AssignmentStudent(
                id=uuid.uuid4(),
                assignment_id=assignment.id,
                student_id=student1.id,
                status="not_started",
                time_spent_minutes=0
            )
            session.add(assignment_student)

        # Create 3 assignments for student2
        for i in range(3):
            assignment = Assignment(
                id=uuid.uuid4(),
                teacher_id=teacher.id,
                activity_id=activity.id,
                book_id=book.id,
                name=f"Student2 Assignment {i+1}",
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC)
            )
            session.add(assignment)
            session.commit()

            assignment_student = AssignmentStudent(
                id=uuid.uuid4(),
                assignment_id=assignment.id,
                student_id=student2.id,
                status="not_started",
                time_spent_minutes=0
            )
            session.add(assignment_student)

        session.commit()

        # When: Student1 requests their assignments
        response = client.get(
            f"{settings.API_V1_STR}/students/me/assignments",
            headers={"Authorization": f"Bearer {student_token}"}
        )

        # Then: Returns only student1's assignments (2), not student2's (3)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        # Verify names contain "Student1" not "Student2"
        for assignment in data:
            assert "Student1" in assignment["assignment_name"]
            assert "Student2" not in assignment["assignment_name"]

    def test_filter_by_status_not_started(
        self,
        client: TestClient,
        session: Session,
        student_user: User,
        student_token: str
    ):
        """Test filtering by status=not_started (AC 2, 9)."""
        # Given: Student with assignments in different statuses
        student, teacher, book, activity = self._create_test_data(session, student_user)

        # Create assignments with different statuses
        statuses = ["not_started", "not_started", "in_progress", "completed"]
        for i, status in enumerate(statuses):
            assignment = Assignment(
                id=uuid.uuid4(),
                teacher_id=teacher.id,
                activity_id=activity.id,
                book_id=book.id,
                name=f"Assignment {status} {i}",
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC)
            )
            session.add(assignment)
            session.commit()

            assignment_student = AssignmentStudent(
                id=uuid.uuid4(),
                assignment_id=assignment.id,
                student_id=student.id,
                status=status,
                time_spent_minutes=0
            )
            session.add(assignment_student)

        session.commit()

        # When: Filter by not_started
        response = client.get(
            f"{settings.API_V1_STR}/students/me/assignments?status=not_started",
            headers={"Authorization": f"Bearer {student_token}"}
        )

        # Then: Returns only 2 not_started assignments
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(a["status"] == "not_started" for a in data)

    def test_filter_by_status_completed(
        self,
        client: TestClient,
        session: Session,
        student_user: User,
        student_token: str
    ):
        """Test filtering by status=completed (AC 2, 9)."""
        # Given: Student with mixed status assignments
        student, teacher, book, activity = self._create_test_data(session, student_user)

        statuses = ["not_started", "in_progress", "completed", "completed"]
        for i, status in enumerate(statuses):
            assignment = Assignment(
                id=uuid.uuid4(),
                teacher_id=teacher.id,
                activity_id=activity.id,
                book_id=book.id,
                name=f"Assignment {status} {i}",
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC)
            )
            session.add(assignment)
            session.commit()

            assignment_student = AssignmentStudent(
                id=uuid.uuid4(),
                assignment_id=assignment.id,
                student_id=student.id,
                status=status,
                score=85 if status == "completed" else None,
                completed_at=datetime.now(UTC) if status == "completed" else None,
                time_spent_minutes=0
            )
            session.add(assignment_student)

        session.commit()

        # When: Filter by completed
        response = client.get(
            f"{settings.API_V1_STR}/students/me/assignments?status=completed",
            headers={"Authorization": f"Bearer {student_token}"}
        )

        # Then: Returns only 2 completed assignments
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(a["status"] == "completed" for a in data)
        assert all(a["score"] == 85 for a in data)

    def test_past_due_calculation(
        self,
        client: TestClient,
        session: Session,
        student_user: User,
        student_token: str
    ):
        """Test is_past_due computed field (AC 5, 10)."""
        # Given: Assignment with due date in past and not completed
        student, teacher, book, activity = self._create_test_data(session, student_user)

        past_due_date = datetime.now(UTC) - timedelta(days=2)
        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            activity_id=activity.id,
            book_id=book.id,
            name="Past Due Assignment",
            due_date=past_due_date,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC)
        )
        session.add(assignment)
        session.commit()

        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status="not_started",
            time_spent_minutes=0
        )
        session.add(assignment_student)
        session.commit()

        # When: Fetch assignments
        response = client.get(
            f"{settings.API_V1_STR}/students/me/assignments",
            headers={"Authorization": f"Bearer {student_token}"}
        )

        # Then: is_past_due should be True
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["is_past_due"] is True
        assert data[0]["days_until_due"] < 0  # Negative days = overdue

    def test_past_due_false_if_completed(
        self,
        client: TestClient,
        session: Session,
        student_user: User,
        student_token: str
    ):
        """Test that completed assignments are not marked past due (AC 5, 10)."""
        # Given: Assignment with past due date but status=completed
        student, teacher, book, activity = self._create_test_data(session, student_user)

        past_due_date = datetime.now(UTC) - timedelta(days=2)
        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            activity_id=activity.id,
            book_id=book.id,
            name="Completed Assignment",
            due_date=past_due_date,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC)
        )
        session.add(assignment)
        session.commit()

        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status="completed",
            score=90,
            completed_at=past_due_date - timedelta(days=1),  # Completed before due date
            time_spent_minutes=25
        )
        session.add(assignment_student)
        session.commit()

        # When: Fetch assignments
        response = client.get(
            f"{settings.API_V1_STR}/students/me/assignments",
            headers={"Authorization": f"Bearer {student_token}"}
        )

        # Then: is_past_due should be False (completed overrides past due)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["is_past_due"] is False
        assert data[0]["status"] == "completed"

    def test_empty_assignments_returns_empty_list(
        self,
        client: TestClient,
        session: Session,
        student_user: User,
        student_token: str
    ):
        """Test student with no assignments returns empty list (AC 11)."""
        # Given: Student with no assignments
        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            grade_level="Grade 5"
        )
        session.add(student)
        session.commit()

        # When: Request assignments
        response = client.get(
            f"{settings.API_V1_STR}/students/me/assignments",
            headers={"Authorization": f"Bearer {student_token}"}
        )

        # Then: Returns empty list (not 404)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_days_until_due_calculation(
        self,
        client: TestClient,
        session: Session,
        student_user: User,
        student_token: str
    ):
        """Test days_until_due computed field."""
        # Given: Assignment due in 3 days
        student, teacher, book, activity = self._create_test_data(session, student_user)

        future_due_date = datetime.now(UTC) + timedelta(days=3)
        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            activity_id=activity.id,
            book_id=book.id,
            name="Future Assignment",
            due_date=future_due_date,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC)
        )
        session.add(assignment)
        session.commit()

        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status="not_started",
            time_spent_minutes=0
        )
        session.add(assignment_student)
        session.commit()

        # When: Fetch assignments
        response = client.get(
            f"{settings.API_V1_STR}/students/me/assignments",
            headers={"Authorization": f"Bearer {student_token}"}
        )

        # Then: days_until_due should be approximately 3
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        # Allow for 2-3 days due to timing
        assert data[0]["days_until_due"] in [2, 3]
        assert data[0]["is_past_due"] is False

    def test_response_includes_book_and_activity_data(
        self,
        client: TestClient,
        session: Session,
        student_user: User,
        student_token: str
    ):
        """Test that response includes eager-loaded book and activity data (AC 3)."""
        # Given: Assignment with book and activity
        student, teacher, book, activity = self._create_test_data(session, student_user)

        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            activity_id=activity.id,
            book_id=book.id,
            name="Complete Data Assignment",
            instructions="Full instructions here",
            time_limit_minutes=45,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC)
        )
        session.add(assignment)
        session.commit()

        assignment_student = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status="in_progress",
            started_at=datetime.now(UTC) - timedelta(minutes=10),
            time_spent_minutes=10
        )
        session.add(assignment_student)
        session.commit()

        # When: Fetch assignments
        response = client.get(
            f"{settings.API_V1_STR}/students/me/assignments",
            headers={"Authorization": f"Bearer {student_token}"}
        )

        # Then: Response includes all book and activity data
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

        assignment_data = data[0]
        # Book data
        assert assignment_data["book_id"] == str(book.id)
        assert assignment_data["book_title"] == "Test Book"
        assert assignment_data["book_cover_url"] == "http://example.com/cover.jpg"

        # Activity data
        assert assignment_data["activity_id"] == str(activity.id)
        assert assignment_data["activity_title"] == "Test Activity"
        assert assignment_data["activity_type"] == "matchTheWords"

        # Assignment data
        assert assignment_data["assignment_name"] == "Complete Data Assignment"
        assert assignment_data["instructions"] == "Full instructions here"
        assert assignment_data["time_limit_minutes"] == 45

        # Student progress data
        assert assignment_data["status"] == "in_progress"
        assert assignment_data["time_spent_minutes"] == 10
        assert assignment_data["started_at"] is not None

    # Helper method
    def _create_test_data(self, session: Session, student_user: User):
        """Helper to create publisher, school, teacher, student, book, activity."""
        pub_user = User(
            id=uuid.uuid4(),
            email=f"pub_{uuid.uuid4()}@test.com",
            username=f"pub_{uuid.uuid4()}",
            hashed_password="hash",
            role=UserRole.publisher
        )
        session.add(pub_user)
        session.commit()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=pub_user.id,
            name="Test Publisher"
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            name="Test School",
            publisher_id=publisher.id
        )
        session.add(school)
        session.commit()

        teacher_user = User(
            id=uuid.uuid4(),
            email=f"teacher_{uuid.uuid4()}@test.com",
            username=f"teacher_{uuid.uuid4()}",
            hashed_password="hash",
            role=UserRole.teacher
        )
        session.add(teacher_user)
        session.commit()

        teacher = Teacher(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            school_id=school.id
        )
        session.add(teacher)
        session.commit()

        student = Student(
            id=uuid.uuid4(),
            user_id=student_user.id,
            grade_level="Grade 5"
        )
        session.add(student)
        session.commit()

        book = Book(
            id=uuid.uuid4(),
            dream_storage_id=f"book-{uuid.uuid4()}",
            title="Test Book",
            book_name="Test Book",
            publisher_name="Test Publisher",
            publisher_id=publisher.id,
            cover_image_url="http://example.com/cover.jpg"
        )
        session.add(book)
        session.commit()

        activity = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            dream_activity_id=f"activity-{uuid.uuid4()}",
            module_name="Module 1",
            page_number=1,
            section_index=1,
            activity_type="matchTheWords",
            title="Test Activity",
            config_json={}
        )
        session.add(activity)
        session.commit()

        return student, teacher, book, activity
