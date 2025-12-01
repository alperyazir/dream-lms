"""
Tests for Multi-Activity Analytics API endpoints (Story 8.4).

Tests cover:
- GET /api/v1/assignments/{assignment_id}/analytics (teacher view)
- GET /api/v1/assignments/{assignment_id}/students/me/result (student view)
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash
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
    BookAccess,
    BookStatus,
    Class,
    ClassStudent,
    Publisher,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


class TestMultiActivityAnalytics:
    """Tests for GET /api/v1/assignments/{assignment_id}/analytics endpoint."""

    @pytest.fixture(name="analytics_setup")
    def analytics_setup_fixture(
        self,
        session: Session,
    ) -> dict:
        """
        Create a complete multi-activity assignment with multiple students
        and varying completion states for analytics testing.
        """
        # Create publisher
        pub_user = User(
            id=uuid.uuid4(),
            email="pub_analytics@test.com",
            username="pubanalytics",
            hashed_password="hash",
            role=UserRole.publisher,
        )
        session.add(pub_user)
        session.commit()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=pub_user.id,
            name="Analytics Test Publisher",
        )
        session.add(publisher)
        session.commit()

        # Create school
        school = School(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            name="Analytics Test School",
        )
        session.add(school)
        session.commit()

        # Create teacher user
        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher_analytics@test.com",
            username="teacheranalytics",
            hashed_password=get_password_hash("teacherpassword"),
            role=UserRole.teacher,
            full_name="Teacher Analytics",
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
            dream_storage_id="analytics-book",
            title="Analytics Test Book",
            book_name="analytics-book",
            publisher_name="Analytics Test Publisher",
            publisher_id=publisher.id,
            cover_image_url="https://example.com/cover.jpg",
            status=BookStatus.published,
        )
        session.add(book)
        session.commit()

        # Create book access
        book_access = BookAccess(
            id=uuid.uuid4(),
            book_id=book.id,
            publisher_id=publisher.id,
        )
        session.add(book_access)
        session.commit()

        # Create 3 activities
        activities = []
        for i in range(3):
            activity = Activity(
                id=uuid.uuid4(),
                book_id=book.id,
                dream_activity_id=f"analytics-activity-{i}",
                module_name="Analytics Module",
                page_number=i + 5,
                section_index=0,
                activity_type=ActivityType.circle if i == 0 else ActivityType.matchTheWords,
                title=f"Analytics Activity {i + 1}",
                config_json={"questions": [{"id": 1, "text": f"Question {i + 1}"}]},
                order_index=i,
            )
            session.add(activity)
            activities.append(activity)
        session.commit()

        # Create assignment
        assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            activity_id=activities[0].id,
            book_id=book.id,
            name="Analytics Test Assignment",
            instructions="Complete all analytics activities",
            due_date=datetime.now(UTC) + timedelta(days=7),
            time_limit_minutes=60,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(assignment)
        session.commit()

        # Link activities to assignment
        for i, activity in enumerate(activities):
            aa = AssignmentActivity(
                id=uuid.uuid4(),
                assignment_id=assignment.id,
                activity_id=activity.id,
                order_index=i,
            )
            session.add(aa)
        session.commit()

        # Create class
        test_class = Class(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            school_id=school.id,
            name="Analytics Test Class",
        )
        session.add(test_class)
        session.commit()

        # Create 3 students with varying completion states
        students = []
        assignment_students = []
        for i in range(3):
            student_user = User(
                id=uuid.uuid4(),
                email=f"student_analytics_{i}@test.com",
                username=f"studentanalytics{i}",
                hashed_password="hash",
                role=UserRole.student,
                full_name=f"Student Analytics {i + 1}",
            )
            session.add(student_user)
            session.commit()

            student = Student(
                id=uuid.uuid4(),
                user_id=student_user.id,
                school_id=school.id,
            )
            session.add(student)
            session.commit()
            students.append((student, student_user))

            # Add to class
            class_student = ClassStudent(
                id=uuid.uuid4(),
                class_id=test_class.id,
                student_id=student.id,
            )
            session.add(class_student)
            session.commit()

            # Create assignment student
            status = (
                AssignmentStatus.completed if i == 0
                else AssignmentStatus.in_progress if i == 1
                else AssignmentStatus.not_started
            )
            astu = AssignmentStudent(
                id=uuid.uuid4(),
                assignment_id=assignment.id,
                student_id=student.id,
                status=status,
                score=85.0 if i == 0 else None,
                started_at=datetime.now(UTC) if i < 2 else None,
                completed_at=datetime.now(UTC) if i == 0 else None,
                time_spent_minutes=30 if i == 0 else 10 if i == 1 else 0,
            )
            session.add(astu)
            session.commit()
            assignment_students.append(astu)

            # Create per-activity progress
            for j, activity in enumerate(activities):
                if i == 0:
                    # Student 0: all activities completed with scores
                    ap_status = AssignmentStudentActivityStatus.completed
                    ap_score = 80.0 + j * 5  # 80, 85, 90
                elif i == 1:
                    # Student 1: first activity completed, second in progress
                    if j == 0:
                        ap_status = AssignmentStudentActivityStatus.completed
                        ap_score = 70.0
                    elif j == 1:
                        ap_status = AssignmentStudentActivityStatus.in_progress
                        ap_score = None
                    else:
                        ap_status = AssignmentStudentActivityStatus.not_started
                        ap_score = None
                else:
                    # Student 2: not started
                    ap_status = AssignmentStudentActivityStatus.not_started
                    ap_score = None

                asa = AssignmentStudentActivity(
                    id=uuid.uuid4(),
                    assignment_student_id=astu.id,
                    activity_id=activity.id,
                    status=ap_status,
                    score=ap_score,
                    max_score=100.0,
                    started_at=datetime.now(UTC) - timedelta(minutes=10) if ap_status != AssignmentStudentActivityStatus.not_started else None,
                    completed_at=datetime.now(UTC) if ap_status == AssignmentStudentActivityStatus.completed else None,
                )
                session.add(asa)
        session.commit()

        return {
            "teacher_user": teacher_user,
            "teacher": teacher,
            "assignment": assignment,
            "activities": activities,
            "students": students,
            "assignment_students": assignment_students,
            "book": book,
            "school": school,
            "publisher": publisher,
        }

    def test_analytics_returns_correct_activity_count(
        self,
        client: TestClient,
        session: Session,
        analytics_setup: dict,
    ) -> None:
        """Test analytics endpoint returns correct number of activities."""
        # Login as teacher
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": analytics_setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        assert response.status_code == 200
        token = response.json()["access_token"]

        # Get analytics
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{analytics_setup['assignment'].id}/analytics",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()

        assert len(data["activities"]) == 3
        assert data["total_students"] == 3
        assert data["submitted_count"] == 1  # Only student 0 completed

    def test_analytics_class_average_calculation(
        self,
        client: TestClient,
        session: Session,
        analytics_setup: dict,
    ) -> None:
        """Test analytics endpoint calculates correct class average per activity."""
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": analytics_setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        assert response.status_code == 200
        token = response.json()["access_token"]

        response = client.get(
            f"{settings.API_V1_STR}/assignments/{analytics_setup['assignment'].id}/analytics",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()

        # Activity 1: scores 80 (student 0) and 70 (student 1) -> avg 75.0
        activity1 = data["activities"][0]
        assert activity1["class_average_score"] == 75.0
        assert activity1["completed_count"] == 2
        assert activity1["completion_rate"] == 0.67  # 2/3 rounded

        # Activity 2: only score 85 (student 0) -> avg 85.0
        activity2 = data["activities"][1]
        assert activity2["class_average_score"] == 85.0
        assert activity2["completed_count"] == 1

        # Activity 3: only score 90 (student 0) -> avg 90.0
        activity3 = data["activities"][2]
        assert activity3["class_average_score"] == 90.0
        assert activity3["completed_count"] == 1

    def test_analytics_expand_activity_id_returns_students(
        self,
        client: TestClient,
        session: Session,
        analytics_setup: dict,
    ) -> None:
        """Test expand_activity_id parameter returns per-student scores."""
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": analytics_setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        assert response.status_code == 200
        token = response.json()["access_token"]

        activity_id = analytics_setup["activities"][0].id
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{analytics_setup['assignment'].id}/analytics",
            params={"expand_activity_id": str(activity_id)},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()

        assert data["expanded_students"] is not None
        assert len(data["expanded_students"]) == 3

        # Verify student data
        completed_students = [s for s in data["expanded_students"] if s["status"] == "completed"]
        assert len(completed_students) == 2

    def test_analytics_authorization_teacher_only(
        self,
        client: TestClient,
        session: Session,
        analytics_setup: dict,
        student_token: str,
    ) -> None:
        """Test that students cannot access teacher analytics endpoint."""
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{analytics_setup['assignment'].id}/analytics",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert response.status_code == 403

    def test_analytics_not_found_for_other_teacher(
        self,
        client: TestClient,
        session: Session,
        analytics_setup: dict,
    ) -> None:
        """Test that teachers cannot see analytics for other teachers' assignments."""
        # Create another teacher
        other_teacher_user = User(
            id=uuid.uuid4(),
            email="other_teacher@test.com",
            username="otherteacher",
            hashed_password=get_password_hash("otherpassword"),
            role=UserRole.teacher,
        )
        session.add(other_teacher_user)
        session.commit()

        other_teacher = Teacher(
            id=uuid.uuid4(),
            user_id=other_teacher_user.id,
            school_id=analytics_setup["school"].id,
        )
        session.add(other_teacher)
        session.commit()

        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": other_teacher_user.email,
                "password": "otherpassword",
            },
        )
        assert response.status_code == 200
        token = response.json()["access_token"]

        response = client.get(
            f"{settings.API_V1_STR}/assignments/{analytics_setup['assignment'].id}/analytics",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404

    def test_analytics_empty_assignment_no_submissions(
        self,
        client: TestClient,
        session: Session,
        analytics_setup: dict,
    ) -> None:
        """Test analytics for assignment with no submissions yet."""
        # Create a new assignment with no student progress
        new_assignment = Assignment(
            id=uuid.uuid4(),
            teacher_id=analytics_setup["teacher"].id,
            activity_id=analytics_setup["activities"][0].id,
            book_id=analytics_setup["book"].id,
            name="Empty Assignment",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(new_assignment)
        session.commit()

        # Link activities
        for i, activity in enumerate(analytics_setup["activities"]):
            aa = AssignmentActivity(
                id=uuid.uuid4(),
                assignment_id=new_assignment.id,
                activity_id=activity.id,
                order_index=i,
            )
            session.add(aa)
        session.commit()

        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": analytics_setup["teacher_user"].email,
                "password": "teacherpassword",
            },
        )
        assert response.status_code == 200
        token = response.json()["access_token"]

        response = client.get(
            f"{settings.API_V1_STR}/assignments/{new_assignment.id}/analytics",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()

        assert data["total_students"] == 0
        assert data["submitted_count"] == 0
        assert len(data["activities"]) == 3
        for activity in data["activities"]:
            assert activity["class_average_score"] is None
            assert activity["completion_rate"] == 0.0


class TestStudentAssignmentResult:
    """Tests for GET /api/v1/assignments/{assignment_id}/students/me/result endpoint."""

    @pytest.fixture(name="student_result_setup")
    def student_result_setup_fixture(
        self,
        session: Session,
        student_user: User,
    ) -> dict:
        """Create a completed multi-activity assignment for student result testing."""
        # Create publisher
        pub_user = User(
            id=uuid.uuid4(),
            email="pub_result@test.com",
            username="pubresult",
            hashed_password="hash",
            role=UserRole.publisher,
        )
        session.add(pub_user)
        session.commit()

        publisher = Publisher(
            id=uuid.uuid4(),
            user_id=pub_user.id,
            name="Result Test Publisher",
        )
        session.add(publisher)
        session.commit()

        school = School(
            id=uuid.uuid4(),
            publisher_id=publisher.id,
            name="Result Test School",
        )
        session.add(school)
        session.commit()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher_result@test.com",
            username="teacherresult",
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
            dream_storage_id="result-book",
            title="Result Test Book",
            book_name="result-book",
            publisher_name="Result Test Publisher",
            publisher_id=publisher.id,
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
                dream_activity_id=f"result-activity-{i}",
                module_name="Result Module",
                page_number=i + 1,
                section_index=0,
                activity_type=ActivityType.circle,
                title=f"Result Activity {i + 1}",
                config_json={"questions": []},
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
            name="Result Test Assignment",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
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

        # Create completed assignment for student
        astu = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.completed,
            score=85.0,
            completed_at=datetime.now(UTC),
            time_spent_minutes=25,
        )
        session.add(astu)
        session.commit()

        # Create per-activity progress - all completed
        for i, activity in enumerate(activities):
            asa = AssignmentStudentActivity(
                id=uuid.uuid4(),
                assignment_student_id=astu.id,
                activity_id=activity.id,
                status=AssignmentStudentActivityStatus.completed,
                score=80.0 + i * 5,  # 80, 85, 90
                max_score=100.0,
                started_at=datetime.now(UTC) - timedelta(minutes=30),
                completed_at=datetime.now(UTC),
            )
            session.add(asa)
        session.commit()

        return {
            "student": student,
            "student_user": student_user,
            "assignment": assignment,
            "activities": activities,
            "assignment_student": astu,
        }

    def test_student_result_returns_score_breakdown(
        self,
        client: TestClient,
        session: Session,
        student_result_setup: dict,
        student_token: str,
    ) -> None:
        """Test student result endpoint returns correct score breakdown."""
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{student_result_setup['assignment'].id}/students/me/result",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert response.status_code == 200
        data = response.json()

        assert data["total_score"] == 85.0
        assert data["total_activities"] == 3
        assert data["completed_activities"] == 3
        assert len(data["activity_scores"]) == 3

        # Verify per-activity scores
        scores = sorted([a["score"] for a in data["activity_scores"]])
        assert scores == [80.0, 85.0, 90.0]

    def test_student_result_not_found_for_other_student(
        self,
        client: TestClient,
        session: Session,
        student_result_setup: dict,
    ) -> None:
        """Test student cannot see another student's result."""
        # Get the school from the student_result_setup
        # We need a school to create a Student record
        pub_user = User(
            id=uuid.uuid4(),
            email="pub_other@test.com",
            username="pubother",
            hashed_password="hash",
            role=UserRole.publisher,
        )
        session.add(pub_user)
        session.commit()

        publisher = Publisher(id=uuid.uuid4(), user_id=pub_user.id, name="Other Publisher")
        session.add(publisher)
        session.commit()

        school = School(id=uuid.uuid4(), publisher_id=publisher.id, name="Other School")
        session.add(school)
        session.commit()

        # Create another student user
        other_user = User(
            id=uuid.uuid4(),
            email="other_student_result@test.com",
            username="otherstudentresult",
            hashed_password=get_password_hash("studentpassword"),
            role=UserRole.student,
        )
        session.add(other_user)
        session.commit()

        # Create Student record for other user
        other_student = Student(
            id=uuid.uuid4(),
            user_id=other_user.id,
            school_id=school.id,
        )
        session.add(other_student)
        session.commit()

        # Login as other student
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={
                "username": other_user.email,
                "password": "studentpassword",
            },
        )
        assert response.status_code == 200
        token = response.json()["access_token"]

        response = client.get(
            f"{settings.API_V1_STR}/assignments/{student_result_setup['assignment'].id}/students/me/result",
            headers={"Authorization": f"Bearer {token}"},
        )
        # Should return 404 since assignment not assigned to this student
        assert response.status_code == 404

    def test_student_result_partial_completion(
        self,
        client: TestClient,
        session: Session,
        student_user: User,
        student_token: str,
    ) -> None:
        """Test student result shows partial scores after force_submit."""
        # Create a setup with partial completion
        pub_user = User(
            id=uuid.uuid4(),
            email="pub_partial@test.com",
            username="pubpartial",
            hashed_password="hash",
            role=UserRole.publisher,
        )
        session.add(pub_user)
        session.commit()

        publisher = Publisher(id=uuid.uuid4(), user_id=pub_user.id, name="Partial Publisher")
        session.add(publisher)
        session.commit()

        school = School(id=uuid.uuid4(), publisher_id=publisher.id, name="Partial School")
        session.add(school)
        session.commit()

        teacher_user = User(
            id=uuid.uuid4(),
            email="teacher_partial@test.com",
            username="teacherpartial",
            hashed_password="hash",
            role=UserRole.teacher,
        )
        session.add(teacher_user)
        session.commit()

        teacher = Teacher(id=uuid.uuid4(), user_id=teacher_user.id, school_id=school.id)
        session.add(teacher)
        session.commit()

        student = Student(id=uuid.uuid4(), user_id=student_user.id, school_id=school.id)
        session.add(student)
        session.commit()

        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="partial-book",
            title="Partial Book",
            book_name="partial-book",
            publisher_name="Partial Publisher",
            publisher_id=publisher.id,
            status=BookStatus.published,
        )
        session.add(book)
        session.commit()

        activities = []
        for i in range(3):
            activity = Activity(
                id=uuid.uuid4(),
                book_id=book.id,
                dream_activity_id=f"partial-activity-{i}",
                module_name="Partial Module",
                page_number=i + 1,
                section_index=0,
                activity_type=ActivityType.circle,
                title=f"Partial Activity {i + 1}",
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
            name="Partial Assignment",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
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

        # Create assignment student - submitted with partial completion
        astu = AssignmentStudent(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            student_id=student.id,
            status=AssignmentStatus.completed,
            score=40.0,  # Only 1 of 3 activities completed
            completed_at=datetime.now(UTC),
        )
        session.add(astu)
        session.commit()

        # Create per-activity progress - only first completed
        asa1 = AssignmentStudentActivity(
            id=uuid.uuid4(),
            assignment_student_id=astu.id,
            activity_id=activities[0].id,
            status=AssignmentStudentActivityStatus.completed,
            score=80.0,
            max_score=100.0,
            completed_at=datetime.now(UTC),
        )
        session.add(asa1)

        asa2 = AssignmentStudentActivity(
            id=uuid.uuid4(),
            assignment_student_id=astu.id,
            activity_id=activities[1].id,
            status=AssignmentStudentActivityStatus.in_progress,
            score=None,
            max_score=100.0,
        )
        session.add(asa2)

        asa3 = AssignmentStudentActivity(
            id=uuid.uuid4(),
            assignment_student_id=astu.id,
            activity_id=activities[2].id,
            status=AssignmentStudentActivityStatus.not_started,
            score=None,
            max_score=100.0,
        )
        session.add(asa3)
        session.commit()

        response = client.get(
            f"{settings.API_V1_STR}/assignments/{assignment.id}/students/me/result",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert response.status_code == 200
        data = response.json()

        assert data["total_score"] == 40.0
        assert data["total_activities"] == 3
        assert data["completed_activities"] == 1

        # Verify statuses
        statuses = {a["activity_title"]: a["status"] for a in data["activity_scores"]}
        assert statuses["Partial Activity 1"] == "completed"
        assert statuses["Partial Activity 2"] == "in_progress"
        assert statuses["Partial Activity 3"] == "not_started"

    def test_student_result_teacher_cannot_access(
        self,
        client: TestClient,
        session: Session,
        student_result_setup: dict,
        teacher_token: str,
    ) -> None:
        """Test that teachers cannot access student result endpoint."""
        response = client.get(
            f"{settings.API_V1_STR}/assignments/{student_result_setup['assignment'].id}/students/me/result",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert response.status_code == 403
