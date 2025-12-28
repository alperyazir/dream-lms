"""Tests for admin assignment management endpoints (Story 20.1)."""
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.security import create_access_token
from app.models import (
    Assignment,
    AssignmentStudent,
    School,
    Student,
    Teacher,
    User,
    UserRole,
)


def create_auth_headers(user: User) -> dict[str, str]:
    """Create authorization headers for a user."""
    token = create_access_token(subject=str(user.id), expires_delta=timedelta(hours=1))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(admin_user: User) -> dict[str, str]:
    """Create admin authorization headers."""
    return create_auth_headers(admin_user)


@pytest.fixture
def teacher_headers(teacher_user_with_record: User) -> dict[str, str]:
    """Create teacher authorization headers."""
    return create_auth_headers(teacher_user_with_record)


@pytest.fixture
def student_headers(student_user: User) -> dict[str, str]:
    """Create student authorization headers."""
    return create_auth_headers(student_user)


@pytest.fixture
def sample_assignments(
    session: Session,
    teacher_user_with_record: User,
    student_user: User,
) -> list[Assignment]:
    """Create sample assignments for testing."""
    # Get teacher record
    teacher = session.exec(
        select(Teacher).where(Teacher.user_id == teacher_user_with_record.id)
    ).first()
    assert teacher is not None

    # Create 3 test assignments
    assignments = []
    for i in range(3):
        assignment = Assignment(
            name=f"Test Assignment {i+1}",
            instructions=f"Instructions for assignment {i+1}",
            teacher_id=teacher.id,
            dcs_book_id=1,  # Dummy book ID
            due_date=datetime.now(UTC) + timedelta(days=7),
            status="published" if i < 2 else "draft",
        )
        session.add(assignment)
        assignments.append(assignment)

    session.commit()

    # Get student record
    student = session.exec(
        select(Student).where(Student.user_id == student_user.id)
    ).first()

    if student:
        # Assign first assignment to student
        assignment_student = AssignmentStudent(
            assignment_id=assignments[0].id,
            student_id=student.id,
            status="completed",
        )
        session.add(assignment_student)
        session.commit()

    for assignment in assignments:
        session.refresh(assignment)

    return assignments


class TestListAllAssignments:
    """Test GET /api/v1/admin/assignments endpoint."""

    def test_admin_can_list_assignments(
        self,
        client: TestClient,
        session: Session,
        admin_headers: dict[str, str],
        sample_assignments: list[Assignment],
    ):
        """Test that admin can list all assignments."""
        response = client.get(
            "/api/v1/admin/assignments",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 3
        assert len(data["items"]) >= 3

        # Verify structure
        first_item = data["items"][0]
        assert "id" in first_item
        assert "title" in first_item
        assert "teacher_name" in first_item
        assert "teacher_email" in first_item
        assert "recipient_count" in first_item
        assert "completed_count" in first_item
        assert "status" in first_item

    def test_filter_by_teacher_id(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        sample_assignments: list[Assignment],
    ):
        """Test filtering assignments by teacher_id."""
        teacher_id = sample_assignments[0].teacher_id

        response = client.get(
            f"/api/v1/admin/assignments?teacher_id={teacher_id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 3
        # All returned assignments should belong to this teacher
        for item in data["items"]:
            assert item["teacher_id"] == str(teacher_id)

    def test_filter_by_status(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        sample_assignments: list[Assignment],
    ):
        """Test filtering assignments by status."""
        response = client.get(
            "/api/v1/admin/assignments?status=published",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        # Should have at least 2 published assignments
        assert data["total"] >= 2
        for item in data["items"]:
            assert item["status"] == "published"

    def test_search_by_title(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        sample_assignments: list[Assignment],
    ):
        """Test searching assignments by title."""
        response = client.get(
            "/api/v1/admin/assignments?search=Test Assignment 1",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        # Should find "Test Assignment 1"
        titles = [item["title"] for item in data["items"]]
        assert any("Test Assignment 1" in title for title in titles)

    def test_pagination(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        sample_assignments: list[Assignment],
    ):
        """Test pagination parameters."""
        # First page
        response = client.get(
            "/api/v1/admin/assignments?skip=0&limit=2",
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["skip"] == 0
        assert data["limit"] == 2
        assert len(data["items"]) <= 2

        # Second page
        response = client.get(
            "/api/v1/admin/assignments?skip=2&limit=2",
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["skip"] == 2
        assert data["limit"] == 2

    def test_teacher_cannot_access(
        self,
        client: TestClient,
        teacher_headers: dict[str, str],
    ):
        """Test that teachers cannot access admin endpoint."""
        response = client.get(
            "/api/v1/admin/assignments",
            headers=teacher_headers,
        )
        assert response.status_code == 403

    def test_student_cannot_access(
        self,
        client: TestClient,
        student_headers: dict[str, str],
    ):
        """Test that students cannot access admin endpoint."""
        response = client.get(
            "/api/v1/admin/assignments",
            headers=student_headers,
        )
        assert response.status_code == 403

    def test_unauthenticated_cannot_access(
        self,
        client: TestClient,
    ):
        """Test that unauthenticated users cannot access."""
        response = client.get("/api/v1/admin/assignments")
        assert response.status_code == 401


class TestDeleteAssignment:
    """Test DELETE /api/v1/admin/assignments/{assignment_id} endpoint."""

    def test_admin_can_delete_assignment(
        self,
        client: TestClient,
        session: Session,
        admin_headers: dict[str, str],
        sample_assignments: list[Assignment],
    ):
        """Test that admin can delete an assignment."""
        assignment_id = sample_assignments[0].id

        response = client.delete(
            f"/api/v1/admin/assignments/{assignment_id}",
            headers=admin_headers,
        )

        assert response.status_code == 204

        # Verify assignment is deleted
        assignment = session.get(Assignment, assignment_id)
        assert assignment is None

    def test_delete_cascades_to_assignment_students(
        self,
        client: TestClient,
        session: Session,
        admin_headers: dict[str, str],
        sample_assignments: list[Assignment],
    ):
        """Test that deleting assignment cascades to AssignmentStudent records."""
        assignment_id = sample_assignments[0].id

        # Check if AssignmentStudent exists
        assignment_student_before = session.exec(
            select(AssignmentStudent).where(
                AssignmentStudent.assignment_id == assignment_id
            )
        ).first()

        # Delete assignment
        response = client.delete(
            f"/api/v1/admin/assignments/{assignment_id}",
            headers=admin_headers,
        )
        assert response.status_code == 204

        # Verify assignment is deleted
        assignment = session.get(Assignment, assignment_id)
        assert assignment is None

        # If AssignmentStudent existed, verify it's also deleted (cascade)
        if assignment_student_before:
            assignment_student = session.exec(
                select(AssignmentStudent).where(
                    AssignmentStudent.assignment_id == assignment_id
                )
            ).first()
            assert assignment_student is None

    def test_delete_nonexistent_assignment(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ):
        """Test deleting non-existent assignment returns 404."""
        fake_id = uuid.uuid4()
        response = client.delete(
            f"/api/v1/admin/assignments/{fake_id}",
            headers=admin_headers,
        )
        assert response.status_code == 404

    def test_teacher_cannot_delete(
        self,
        client: TestClient,
        teacher_headers: dict[str, str],
        sample_assignments: list[Assignment],
    ):
        """Test that teachers cannot delete assignments via admin endpoint."""
        assignment_id = sample_assignments[0].id
        response = client.delete(
            f"/api/v1/admin/assignments/{assignment_id}",
            headers=teacher_headers,
        )
        assert response.status_code == 403

    def test_student_cannot_delete(
        self,
        client: TestClient,
        student_headers: dict[str, str],
        sample_assignments: list[Assignment],
    ):
        """Test that students cannot delete assignments."""
        assignment_id = sample_assignments[0].id
        response = client.delete(
            f"/api/v1/admin/assignments/{assignment_id}",
            headers=student_headers,
        )
        assert response.status_code == 403
