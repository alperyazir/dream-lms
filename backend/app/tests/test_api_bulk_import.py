"""Integration tests for bulk import API endpoints."""
import io
import uuid
from datetime import timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlmodel import Session, select

from app.core.security import create_access_token
from app.models import Publisher, School, Student, Teacher, User, UserRole


def create_excel_file(data: list[dict[str, Any]]) -> bytes:
    """Create an Excel file in memory with given data."""
    workbook = Workbook()
    sheet = workbook.active

    if data:
        # Write headers
        headers = list(data[0].keys())
        sheet.append(headers)

        # Write data rows
        for row in data:
            sheet.append([row.get(h) for h in headers])

    excel_bytes = io.BytesIO()
    workbook.save(excel_bytes)
    excel_bytes.seek(0)
    return excel_bytes.read()


def create_auth_headers(user: User) -> dict[str, str]:
    """Create authorization headers for a user."""
    token = create_access_token(subject=str(user.id), expires_delta=timedelta(hours=1))
    return {"Authorization": f"Bearer {token}"}


def test_teacher_bulk_import_students_success(
    client: TestClient,
    session: Session,
    teacher_user_with_record: User
) -> None:
    """Test teacher can successfully bulk import students."""
    # Create valid student data
    student_data = [
        {
            "First Name": "John",
            "Last Name": "Doe",
            "Email": "john.doe@test.com",
            "Grade Level": "5",
            "Parent Email": "parent.doe@test.com"
        },
        {
            "First Name": "Jane",
            "Last Name": "Smith",
            "Email": "jane.smith@test.com",
            "Grade Level": "6",
            "Parent Email": "parent.smith@test.com"
        }
    ]

    excel_content = create_excel_file(student_data)

    headers = create_auth_headers(teacher_user_with_record)

    response = client.post(
        "/api/v1/teachers/me/students/bulk-import",
        files={"file": ("students.xlsx", excel_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["created_count"] == 2
    assert data["error_count"] == 0
    assert len(data["credentials"]) == 2
    assert "initial_password" in data["credentials"][0]
    assert "email" in data["credentials"][0]

    # Verify students were created in database
    students = session.exec(select(Student)).all()
    assert len(students) == 2


def test_teacher_bulk_import_validation_errors(
    client: TestClient,
    session: Session,
    teacher_user_with_record: User
) -> None:
    """Test bulk import returns detailed validation errors."""
    # Create data with invalid emails and missing fields
    student_data = [
        {
            "First Name": "John",
            "Last Name": "Doe",
            "Email": "invalid-email",  # Invalid format
            "Grade Level": "5",
            "Parent Email": "parent@test.com"
        },
        {
            "First Name": "Jane",
            # Missing Last Name
            "Email": "jane@test.com",
            "Grade Level": "6",
            "Parent Email": "parent2@test.com"
        }
    ]

    excel_content = create_excel_file(student_data)
    headers = create_auth_headers(teacher_user_with_record)

    response = client.post(
        "/api/v1/teachers/me/students/bulk-import",
        files={"file": ("students.xlsx", excel_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers
    )

    assert response.status_code == 201  # Endpoint returns 201 even with validation errors
    data = response.json()
    assert data["success"] is False
    assert data["error_count"] == 2
    assert data["created_count"] == 0
    assert len(data["errors"]) == 2

    # Verify no students were created
    students = session.exec(select(Student)).all()
    assert len(students) == 0


def test_teacher_bulk_import_file_too_large(
    client: TestClient,
    teacher_user_with_record: User
) -> None:
    """Test bulk import rejects files exceeding 5MB."""
    # Create file > 5MB
    large_content = b"x" * (6 * 1024 * 1024)

    headers = create_auth_headers(teacher_user_with_record)

    response = client.post(
        "/api/v1/teachers/me/students/bulk-import",
        files={"file": ("large.xlsx", large_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers
    )

    assert response.status_code == 413
    assert "5MB" in response.json()["detail"]


def test_teacher_bulk_import_wrong_file_type(
    client: TestClient,
    teacher_user_with_record: User
) -> None:
    """Test bulk import rejects non-Excel files."""
    content = b"This is not an Excel file"

    headers = create_auth_headers(teacher_user_with_record)

    response = client.post(
        "/api/v1/teachers/me/students/bulk-import",
        files={"file": ("file.txt", content, "text/plain")},
        headers=headers
    )

    assert response.status_code == 400
    assert "Excel" in response.json()["detail"]


def test_teacher_bulk_import_duplicate_emails(
    client: TestClient,
    session: Session,
    teacher_user_with_record: User
) -> None:
    """Test bulk import detects duplicate emails within file."""
    student_data = [
        {
            "First Name": "John",
            "Last Name": "Doe",
            "Email": "duplicate@test.com",
            "Grade Level": "5",
            "Parent Email": "parent@test.com"
        },
        {
            "First Name": "Jane",
            "Last Name": "Smith",
            "Email": "duplicate@test.com",  # Duplicate
            "Grade Level": "6",
            "Parent Email": "parent2@test.com"
        }
    ]

    excel_content = create_excel_file(student_data)
    headers = create_auth_headers(teacher_user_with_record)

    response = client.post(
        "/api/v1/teachers/me/students/bulk-import",
        files={"file": ("students.xlsx", excel_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers
    )

    data = response.json()
    assert data["success"] is False
    assert any("Duplicate email" in str(err) for err in data["errors"])


def test_admin_bulk_import_publishers_success(
    client: TestClient,
    session: Session,
    admin_user: User
) -> None:
    """Test admin can successfully bulk import publishers."""
    publisher_data = [
        {
            "First Name": "Alice",
            "Last Name": "Publisher",
            "Email": "alice@publisher.com",
            "Company Name": "Alice Publishing",
            "Contact Email": "contact@alice.com"
        },
        {
            "First Name": "Bob",
            "Last Name": "Books",
            "Email": "bob@publisher.com",
            "Company Name": "Bob Books Inc",
            "Contact Email": "contact@bob.com"
        }
    ]

    excel_content = create_excel_file(publisher_data)
    headers = create_auth_headers(admin_user)

    response = client.post(
        "/api/v1/admin/bulk-import/publishers",
        files={"file": ("publishers.xlsx", excel_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["created_count"] == 2

    # Verify publishers were created
    publishers = session.exec(select(Publisher)).all()
    assert len(publishers) == 2


def test_admin_bulk_import_teachers_success(
    client: TestClient,
    session: Session,
    admin_user: User,
    publisher_user_with_record: User
) -> None:
    """Test admin can successfully bulk import teachers."""
    # First create a school for teachers
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        publisher_id=publisher_user_with_record.publisher.id
    )
    session.add(school)
    session.commit()

    teacher_data = [
        {
            "First Name": "Teacher",
            "Last Name": "One",
            "Email": "teacher1@school.com",
            "School ID": str(school.id),
            "Subject Specialization": "Math"
        },
        {
            "First Name": "Teacher",
            "Last Name": "Two",
            "Email": "teacher2@school.com",
            "School ID": str(school.id),
            "Subject Specialization": "Science"
        }
    ]

    excel_content = create_excel_file(teacher_data)
    headers = create_auth_headers(admin_user)

    response = client.post(
        "/api/v1/admin/bulk-import/teachers",
        files={"file": ("teachers.xlsx", excel_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["created_count"] == 2

    # Verify teachers were created
    teachers = session.exec(select(Teacher)).all()
    assert len(teachers) >= 2  # >= because teacher_user fixture also creates a teacher


def test_admin_bulk_import_students_success(
    client: TestClient,
    session: Session,
    admin_user: User
) -> None:
    """Test admin can successfully bulk import students."""
    student_data = [
        {
            "First Name": "Student",
            "Last Name": "One",
            "Email": "student1@test.com",
            "Grade Level": "7",
            "Parent Email": "parent1@test.com"
        },
        {
            "First Name": "Student",
            "Last Name": "Two",
            "Email": "student2@test.com",
            "Grade Level": "8",
            "Parent Email": "parent2@test.com"
        }
    ]

    excel_content = create_excel_file(student_data)
    headers = create_auth_headers(admin_user)

    response = client.post(
        "/api/v1/admin/bulk-import/students",
        files={"file": ("students.xlsx", excel_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["created_count"] == 2


def test_student_cannot_bulk_import(
    client: TestClient,
    student_user: User
) -> None:
    """Test student role cannot access bulk import endpoints."""
    student_data = [
        {
            "First Name": "Test",
            "Last Name": "Student",
            "Email": "test@test.com",
            "Grade Level": "5",
            "Parent Email": "parent@test.com"
        }
    ]

    excel_content = create_excel_file(student_data)
    headers = create_auth_headers(student_user)

    # Try teacher endpoint
    response = client.post(
        "/api/v1/teachers/me/students/bulk-import",
        files={"file": ("students.xlsx", excel_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers
    )

    assert response.status_code == 403


def test_teacher_cannot_access_admin_bulk_import(
    client: TestClient,
    teacher_user_with_record: User
) -> None:
    """Test teacher cannot access admin bulk import endpoints."""
    publisher_data = [
        {
            "First Name": "Test",
            "Last Name": "Publisher",
            "Email": "test@publisher.com",
            "Company Name": "Test Co",
            "Contact Email": "contact@test.com"
        }
    ]

    excel_content = create_excel_file(publisher_data)
    headers = create_auth_headers(teacher_user_with_record)

    response = client.post(
        "/api/v1/admin/bulk-import/publishers",
        files={"file": ("publishers.xlsx", excel_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers
    )

    assert response.status_code == 403
