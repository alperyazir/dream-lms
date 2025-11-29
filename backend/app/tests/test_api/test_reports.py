"""
Integration tests for report generation API - Story 5.6
"""

import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

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
    ReportFormatEnum,
    ReportJob,
    ReportJobStatusEnum,
    ReportTypeEnum,
    SavedReportConfig,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)
from app.services.report_service import (
    calculate_trend,
    generate_narrative_summary,
    get_period_dates,
)
from app.schemas.reports import ReportPeriod


@pytest.fixture(name="reports_publisher")
def publisher_fixture(session: Session) -> Publisher:
    """Create a test publisher."""
    publisher_user = User(
        email="reports_publisher@test.com",
        username="reports_publisher",
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
        name="Reports Test Publisher",
        contact_email="reports@publisher.com",
    )
    session.add(publisher)
    session.commit()
    session.refresh(publisher)
    return publisher


@pytest.fixture(name="reports_school")
def school_fixture(session: Session, reports_publisher: Publisher) -> School:
    """Create a test school."""
    school = School(
        id=uuid.uuid4(),
        name="Reports Test School",
        address="123 Test St",
        contact_info="reports@school.com",
        publisher_id=reports_publisher.id,
    )
    session.add(school)
    session.commit()
    session.refresh(school)
    return school


@pytest.fixture(name="reports_teacher")
def teacher_fixture(session: Session, reports_school: School) -> tuple[Teacher, User, str]:
    """Create teacher with token."""
    teacher_user = User(
        email="reports.teacher@test.com",
        username="reports_teacher",
        hashed_password="hashed",
        role=UserRole.teacher,
        is_active=True,
        full_name="Reports Teacher",
    )
    session.add(teacher_user)
    session.commit()
    session.refresh(teacher_user)

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=reports_school.id,
        subject_specialization="Math",
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    token = create_access_token(teacher_user.id, timedelta(minutes=30))
    return teacher, teacher_user, token


@pytest.fixture(name="reports_class")
def class_fixture(session: Session, reports_teacher: tuple[Teacher, User, str]) -> Class:
    """Create a test class."""
    teacher, _, _ = reports_teacher
    test_class = Class(
        id=uuid.uuid4(),
        name="Reports Test Class",
        grade_level="5",
        subject="Mathematics",
        teacher_id=teacher.id,
    )
    session.add(test_class)
    session.commit()
    session.refresh(test_class)
    return test_class


@pytest.fixture(name="reports_student")
def student_fixture(
    session: Session, reports_school: School, reports_class: Class
) -> tuple[Student, User]:
    """Create a test student."""
    student_user = User(
        email="reports.student@test.com",
        username="reports_student",
        hashed_password="hashed",
        role=UserRole.student,
        is_active=True,
        full_name="Reports Student",
    )
    session.add(student_user)
    session.commit()
    session.refresh(student_user)

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        school_id=reports_school.id,
        grade_level="5",
    )
    session.add(student)
    session.commit()
    session.refresh(student)

    # Add student to class
    class_student = ClassStudent(
        id=uuid.uuid4(),
        class_id=reports_class.id,
        student_id=student.id,
    )
    session.add(class_student)
    session.commit()

    return student, student_user


@pytest.fixture(name="reports_book")
def book_fixture(session: Session, reports_publisher: Publisher) -> Book:
    """Create a test book."""
    book = Book(
        id=uuid.uuid4(),
        external_id="reports-test-book",
        title="Reports Test Book",
        publisher_id=reports_publisher.id,
        status="active",
    )
    session.add(book)
    session.commit()
    session.refresh(book)
    return book


@pytest.fixture(name="reports_activity")
def activity_fixture(session: Session, reports_book: Book) -> Activity:
    """Create a test activity."""
    activity = Activity(
        id=uuid.uuid4(),
        book_id=reports_book.id,
        external_id="reports-test-activity",
        title="Reports Test Activity",
        activity_type=ActivityType.circle,
        page_number=1,
        order_index=1,
        config_json={},
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity


@pytest.fixture(name="reports_assignment")
def assignment_fixture(
    session: Session,
    reports_teacher: tuple[Teacher, User, str],
    reports_class: Class,
    reports_book: Book,
    reports_activity: Activity,
    reports_student: tuple[Student, User],
) -> Assignment:
    """Create a test assignment with student submission."""
    teacher, _, _ = reports_teacher
    student, _ = reports_student

    assignment = Assignment(
        id=uuid.uuid4(),
        name="Reports Test Assignment",
        instructions="Test instructions",
        teacher_id=teacher.id,
        class_id=reports_class.id,
        book_id=reports_book.id,
        activity_id=reports_activity.id,
        due_date=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    # Add completed student submission
    assignment_student = AssignmentStudent(
        id=uuid.uuid4(),
        assignment_id=assignment.id,
        student_id=student.id,
        status=AssignmentStatus.completed,
        score=85,
        started_at=datetime.now(UTC) - timedelta(hours=1),
        completed_at=datetime.now(UTC),
        time_spent_minutes=30,
        answers_json={"answer1": "correct"},
    )
    session.add(assignment_student)
    session.commit()

    return assignment


class TestReportGeneration:
    """Tests for report generation endpoint."""

    def test_generate_student_report(
        self,
        client: TestClient,
        reports_teacher: tuple[Teacher, User, str],
        reports_student: tuple[Student, User],
        reports_assignment: Assignment,
    ):
        """Test initiating student report generation."""
        _, _, token = reports_teacher
        student, _ = reports_student

        response = client.post(
            f"{settings.API_V1_STR}/reports/generate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "report_type": "student",
                "period": "month",
                "target_id": str(student.id),
                "format": "pdf",
            },
        )

        assert response.status_code == 202
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "pending"
        assert "created_at" in data

    def test_generate_class_report(
        self,
        client: TestClient,
        reports_teacher: tuple[Teacher, User, str],
        reports_class: Class,
        reports_assignment: Assignment,
    ):
        """Test initiating class report generation."""
        _, _, token = reports_teacher

        response = client.post(
            f"{settings.API_V1_STR}/reports/generate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "report_type": "class",
                "period": "week",
                "target_id": str(reports_class.id),
                "format": "excel",
            },
        )

        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "pending"

    def test_generate_assignment_report(
        self,
        client: TestClient,
        reports_teacher: tuple[Teacher, User, str],
        reports_assignment: Assignment,
    ):
        """Test initiating assignment overview report generation."""
        teacher, _, token = reports_teacher

        response = client.post(
            f"{settings.API_V1_STR}/reports/generate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "report_type": "assignment",
                "period": "month",
                "target_id": str(teacher.id),  # For assignment reports, use teacher_id
                "format": "pdf",
                "template_type": "monthly_assignment_overview",
            },
        )

        assert response.status_code == 202

    def test_generate_report_unauthorized(
        self,
        client: TestClient,
        reports_student: tuple[Student, User],
    ):
        """Test that students cannot generate reports."""
        student, student_user = reports_student
        token = create_access_token(student_user.id, timedelta(minutes=30))

        response = client.post(
            f"{settings.API_V1_STR}/reports/generate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "report_type": "student",
                "period": "month",
                "target_id": str(student.id),
                "format": "pdf",
            },
        )

        assert response.status_code == 403


class TestReportStatus:
    """Tests for report status endpoint."""

    def test_get_report_status(
        self,
        client: TestClient,
        session: Session,
        reports_teacher: tuple[Teacher, User, str],
    ):
        """Test checking report job status."""
        teacher, _, token = reports_teacher

        # Create a job directly
        job = ReportJob(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            status=ReportJobStatusEnum.processing.value,
            report_type=ReportTypeEnum.student.value,
            config_json={"format": "pdf"},
            progress_percentage=50,
        )
        session.add(job)
        session.commit()
        session.refresh(job)

        response = client.get(
            f"{settings.API_V1_STR}/reports/{job.id}/status",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == str(job.id)
        assert data["status"] == "processing"
        assert data["progress_percentage"] == 50

    def test_get_report_status_not_found(
        self,
        client: TestClient,
        reports_teacher: tuple[Teacher, User, str],
    ):
        """Test status check for non-existent job."""
        _, _, token = reports_teacher

        response = client.get(
            f"{settings.API_V1_STR}/reports/{uuid.uuid4()}/status",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404

    def test_get_report_status_other_teacher(
        self,
        client: TestClient,
        session: Session,
        reports_teacher: tuple[Teacher, User, str],
        reports_school: School,
    ):
        """Test that teachers cannot see other teachers' reports."""
        teacher1, _, token1 = reports_teacher

        # Create another teacher
        teacher2_user = User(
            email="other.teacher@test.com",
            username="other_teacher",
            hashed_password="hashed",
            role=UserRole.teacher,
            is_active=True,
        )
        session.add(teacher2_user)
        session.commit()
        session.refresh(teacher2_user)

        teacher2 = Teacher(
            id=uuid.uuid4(),
            user_id=teacher2_user.id,
            school_id=reports_school.id,
        )
        session.add(teacher2)
        session.commit()
        session.refresh(teacher2)

        # Create job for teacher2
        job = ReportJob(
            id=uuid.uuid4(),
            teacher_id=teacher2.id,
            status=ReportJobStatusEnum.completed.value,
            report_type=ReportTypeEnum.class_.value,
            config_json={},
        )
        session.add(job)
        session.commit()

        # Try to access with teacher1's token
        response = client.get(
            f"{settings.API_V1_STR}/reports/{job.id}/status",
            headers={"Authorization": f"Bearer {token1}"},
        )

        assert response.status_code == 404


class TestReportHistory:
    """Tests for report history endpoint."""

    def test_get_report_history(
        self,
        client: TestClient,
        session: Session,
        reports_teacher: tuple[Teacher, User, str],
    ):
        """Test getting report history."""
        teacher, _, token = reports_teacher

        # Create some jobs
        for i in range(3):
            job = ReportJob(
                id=uuid.uuid4(),
                teacher_id=teacher.id,
                status=ReportJobStatusEnum.completed.value,
                report_type=ReportTypeEnum.student.value,
                config_json={"format": "pdf", "target_id": str(uuid.uuid4())},
                expires_at=datetime.now(UTC) + timedelta(days=7),
            )
            session.add(job)
        session.commit()

        response = client.get(
            f"{settings.API_V1_STR}/reports/history",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "reports" in data
        assert len(data["reports"]) == 3

    def test_get_report_history_empty(
        self,
        client: TestClient,
        reports_teacher: tuple[Teacher, User, str],
    ):
        """Test getting empty report history."""
        _, _, token = reports_teacher

        response = client.get(
            f"{settings.API_V1_STR}/reports/history",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["reports"] == []


class TestReportTemplates:
    """Tests for saved report templates."""

    def test_save_report_template(
        self,
        client: TestClient,
        reports_teacher: tuple[Teacher, User, str],
        reports_student: tuple[Student, User],
    ):
        """Test saving a report template."""
        _, _, token = reports_teacher
        student, _ = reports_student

        response = client.post(
            f"{settings.API_V1_STR}/reports/templates",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Weekly Student Report",
                "config": {
                    "report_type": "student",
                    "period": "week",
                    "target_id": str(student.id),
                    "format": "pdf",
                },
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Weekly Student Report"
        assert "id" in data
        assert "created_at" in data

    def test_list_report_templates(
        self,
        client: TestClient,
        session: Session,
        reports_teacher: tuple[Teacher, User, str],
    ):
        """Test listing saved templates."""
        teacher, _, token = reports_teacher

        # Create templates
        for name in ["Template 1", "Template 2"]:
            config = SavedReportConfig(
                id=uuid.uuid4(),
                teacher_id=teacher.id,
                name=name,
                config_json={"report_type": "student", "period": "week", "format": "pdf"},
            )
            session.add(config)
        session.commit()

        response = client.get(
            f"{settings.API_V1_STR}/reports/templates",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_delete_report_template(
        self,
        client: TestClient,
        session: Session,
        reports_teacher: tuple[Teacher, User, str],
    ):
        """Test deleting a template."""
        teacher, _, token = reports_teacher

        config = SavedReportConfig(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            name="To Delete",
            config_json={},
        )
        session.add(config)
        session.commit()
        session.refresh(config)

        response = client.delete(
            f"{settings.API_V1_STR}/reports/templates/{config.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 204

        # Verify deleted
        result = session.get(SavedReportConfig, config.id)
        assert result is None

    def test_delete_template_not_found(
        self,
        client: TestClient,
        reports_teacher: tuple[Teacher, User, str],
    ):
        """Test deleting non-existent template."""
        _, _, token = reports_teacher

        response = client.delete(
            f"{settings.API_V1_STR}/reports/templates/{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404


class TestTrendAnalysis:
    """Tests for trend calculation logic."""

    def test_trend_calculation_up(self):
        """Test trend calculation for improvement."""
        trend = calculate_trend(85.0, 75.0)

        assert trend.current == 85.0
        assert trend.previous == 75.0
        assert trend.direction == "up"
        assert trend.change is not None
        assert trend.change > 0

    def test_trend_calculation_down(self):
        """Test trend calculation for decline."""
        trend = calculate_trend(70.0, 80.0)

        assert trend.direction == "down"
        assert trend.change is not None
        assert trend.change < 0

    def test_trend_calculation_stable(self):
        """Test trend calculation for stable performance."""
        trend = calculate_trend(80.0, 80.0)

        assert trend.direction == "stable"
        assert trend.change is not None
        assert abs(trend.change) < 1

    def test_trend_calculation_new(self):
        """Test trend calculation when no previous data."""
        trend = calculate_trend(85.0, None)

        assert trend.direction == "new"
        assert trend.change is None

    def test_trend_calculation_zero_previous(self):
        """Test trend calculation when previous is zero."""
        trend = calculate_trend(85.0, 0)

        assert trend.direction == "new"
        assert trend.change is None


class TestNarrativeSummary:
    """Tests for narrative summary generation."""

    def test_narrative_improvement(self):
        """Test narrative for improvement."""
        data = {
            "trend": {"direction": "up", "change": 10.5},
            "summary": {"completion_rate": 0.95},
            "activity_breakdown": [
                {"label": "Word Matching", "avg_score": 90},
                {"label": "Word Search", "avg_score": 70},
            ],
        }

        narrative = generate_narrative_summary(data, "student")

        assert "improved" in narrative.lower()
        assert "10.5%" in narrative
        assert "Word Matching" in narrative
        assert "Excellent" in narrative

    def test_narrative_decline(self):
        """Test narrative for decline."""
        data = {
            "trend": {"direction": "down", "change": -5.0},
            "summary": {"completion_rate": 0.65},
            "activity_breakdown": [],
        }

        narrative = generate_narrative_summary(data, "student")

        assert "decreased" in narrative.lower()
        assert "completion" in narrative.lower()

    def test_narrative_stable(self):
        """Test narrative for stable performance."""
        data = {
            "trend": {"direction": "stable", "change": 0.5},
            "summary": {"completion_rate": 0.80},
            "activity_breakdown": [],
        }

        narrative = generate_narrative_summary(data, "student")

        assert "stable" in narrative.lower()


class TestPeriodDates:
    """Tests for period date calculation."""

    def test_period_week(self):
        """Test week period calculation."""
        current_start, current_end, previous_start, previous_end = get_period_dates(
            ReportPeriod.WEEK
        )

        assert (current_end - current_start).days == 7
        assert previous_end < current_start

    def test_period_month(self):
        """Test month period calculation."""
        current_start, current_end, previous_start, previous_end = get_period_dates(
            ReportPeriod.MONTH
        )

        assert (current_end - current_start).days == 30

    def test_period_custom(self):
        """Test custom period calculation."""
        current_start, current_end, previous_start, previous_end = get_period_dates(
            ReportPeriod.CUSTOM,
            start_date="2025-01-01",
            end_date="2025-01-31",
        )

        assert current_start.year == 2025
        assert current_start.month == 1
        assert current_start.day == 1


class TestReportDownload:
    """Tests for report download endpoint."""

    def test_download_not_ready(
        self,
        client: TestClient,
        session: Session,
        reports_teacher: tuple[Teacher, User, str],
    ):
        """Test downloading report that's not ready."""
        teacher, _, token = reports_teacher

        job = ReportJob(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            status=ReportJobStatusEnum.processing.value,
            report_type=ReportTypeEnum.student.value,
            config_json={"format": "pdf"},
        )
        session.add(job)
        session.commit()

        response = client.get(
            f"{settings.API_V1_STR}/reports/{job.id}/download",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert "not ready" in response.json()["detail"].lower()

    def test_download_file_missing(
        self,
        client: TestClient,
        session: Session,
        reports_teacher: tuple[Teacher, User, str],
    ):
        """Test downloading when file doesn't exist."""
        teacher, _, token = reports_teacher

        job = ReportJob(
            id=uuid.uuid4(),
            teacher_id=teacher.id,
            status=ReportJobStatusEnum.completed.value,
            report_type=ReportTypeEnum.student.value,
            config_json={"format": "pdf"},
            file_path="/nonexistent/path/report.pdf",
        )
        session.add(job)
        session.commit()

        response = client.get(
            f"{settings.API_V1_STR}/reports/{job.id}/download",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
