"""Tests for Book Assignment API endpoints - Story 9.4."""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    Book,
    BookAssignment,
    BookAssignmentCreate,
    BookAssignmentListResponse,
    BookAssignmentPublic,
    BulkBookAssignmentCreate,
    Publisher,
    School,
    Teacher,
    User,
    UserRole,
)


class TestBookAssignmentSchemas:
    """Test BookAssignment schema validation"""

    def test_create_schema_requires_target(self):
        """Test that at least one of school_id or teacher_id is required"""
        with pytest.raises(ValueError):
            BookAssignmentCreate(
                book_id=uuid.uuid4(),
                school_id=None,
                teacher_id=None
            )

    def test_create_schema_with_school_only(self):
        """Test creating with school_id only"""
        schema = BookAssignmentCreate(
            book_id=uuid.uuid4(),
            school_id=uuid.uuid4(),
            teacher_id=None
        )
        assert schema.school_id is not None
        assert schema.teacher_id is None

    def test_create_schema_with_teacher_only(self):
        """Test creating with teacher_id only"""
        schema = BookAssignmentCreate(
            book_id=uuid.uuid4(),
            school_id=None,
            teacher_id=uuid.uuid4()
        )
        assert schema.school_id is None
        assert schema.teacher_id is not None

    def test_bulk_create_schema(self):
        """Test bulk create schema"""
        teacher_ids = [uuid.uuid4(), uuid.uuid4()]
        schema = BulkBookAssignmentCreate(
            book_id=uuid.uuid4(),
            school_id=uuid.uuid4(),
            teacher_ids=teacher_ids,
            assign_to_all_teachers=False
        )
        assert len(schema.teacher_ids) == 2
        assert schema.assign_to_all_teachers is False


class TestBookAssignmentModel:
    """Test BookAssignment model"""

    def test_model_fields_exist(self):
        """Test model has all required fields"""
        assert hasattr(BookAssignment, 'id')
        assert hasattr(BookAssignment, 'book_id')
        assert hasattr(BookAssignment, 'school_id')
        assert hasattr(BookAssignment, 'teacher_id')
        assert hasattr(BookAssignment, 'assigned_by')
        assert hasattr(BookAssignment, 'assigned_at')

    def test_model_tablename(self):
        """Test model uses correct table name"""
        assert BookAssignment.__tablename__ == "book_assignments"


class TestBookAssignmentResponseSchemas:
    """Test response schema structures"""

    def test_book_assignment_public_fields(self):
        """Test BookAssignmentPublic has expected fields"""
        fields = BookAssignmentPublic.model_fields
        assert 'id' in fields
        assert 'book_id' in fields
        assert 'school_id' in fields
        assert 'teacher_id' in fields
        assert 'assigned_by' in fields
        assert 'assigned_at' in fields

    def test_book_assignment_list_response_fields(self):
        """Test BookAssignmentListResponse has pagination fields"""
        fields = BookAssignmentListResponse.model_fields
        assert 'items' in fields
        assert 'total' in fields
        assert 'skip' in fields
        assert 'limit' in fields


# --- API Integration Tests (QA Fix) ---


@pytest.fixture(name="publisher_with_book_and_school")
def publisher_with_book_and_school_fixture(session: Session):
    """Create a publisher with a book and school for API testing."""
    # Create publisher user
    pub_user = User(
        id=uuid.uuid4(),
        email="api_test_publisher@example.com",
        username="apitestpub",
        hashed_password=get_password_hash("publisherpass"),
        role=UserRole.publisher,
        is_active=True,
        full_name="API Test Publisher"
    )
    session.add(pub_user)
    session.commit()
    session.refresh(pub_user)

    # Create publisher record
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=pub_user.id,
        name="API Test Publisher Co"
    )
    session.add(publisher)
    session.commit()
    session.refresh(publisher)

    # Create school
    school = School(
        id=uuid.uuid4(),
        name="API Test School",
        publisher_id=publisher.id
    )
    session.add(school)
    session.commit()
    session.refresh(school)

    # Create book with all required fields
    book = Book(
        id=uuid.uuid4(),
        dream_storage_id=f"test-book-{uuid.uuid4().hex[:8]}",
        title="API Test Book",
        book_name="api_test_book",
        publisher_name="API Test Publisher Co",
        publisher_id=publisher.id,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )
    session.add(book)
    session.commit()
    session.refresh(book)

    # Create teacher user and record
    teacher_user = User(
        id=uuid.uuid4(),
        email="api_test_teacher@example.com",
        username="apitestteacher",
        hashed_password=get_password_hash("teacherpass"),
        role=UserRole.teacher,
        is_active=True,
        full_name="API Test Teacher"
    )
    session.add(teacher_user)
    session.commit()
    session.refresh(teacher_user)

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        school_id=school.id
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    return {
        "user": pub_user,
        "publisher": publisher,
        "school": school,
        "book": book,
        "teacher_user": teacher_user,
        "teacher": teacher
    }


@pytest.fixture(name="publisher_api_token")
def publisher_api_token_fixture(client: TestClient, publisher_with_book_and_school) -> str:
    """Get access token for the API test publisher."""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": "api_test_publisher@example.com", "password": "publisherpass"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


class TestBookAssignmentAPIEndpoints:
    """Integration tests for Book Assignment API endpoints."""

    def test_create_bulk_assignment_school_level(
        self, client: TestClient, publisher_api_token: str, publisher_with_book_and_school
    ):
        """Test creating a school-level bulk assignment via API."""
        book = publisher_with_book_and_school["book"]
        school = publisher_with_book_and_school["school"]

        response = client.post(
            f"{settings.API_V1_STR}/book-assignments/bulk",
            json={
                "book_id": str(book.id),
                "school_id": str(school.id),
                "assign_to_all_teachers": True
            },
            headers={"Authorization": f"Bearer {publisher_api_token}"}
        )

        assert response.status_code == 201
        data = response.json()
        assert len(data) >= 1
        assert data[0]["book_id"] == str(book.id)
        assert data[0]["school_id"] == str(school.id)

    def test_create_bulk_assignment_specific_teachers(
        self, client: TestClient, publisher_api_token: str, publisher_with_book_and_school
    ):
        """Test creating assignments for specific teachers via API."""
        book = publisher_with_book_and_school["book"]
        school = publisher_with_book_and_school["school"]
        teacher = publisher_with_book_and_school["teacher"]

        response = client.post(
            f"{settings.API_V1_STR}/book-assignments/bulk",
            json={
                "book_id": str(book.id),
                "school_id": str(school.id),
                "teacher_ids": [str(teacher.id)],
                "assign_to_all_teachers": False
            },
            headers={"Authorization": f"Bearer {publisher_api_token}"}
        )

        assert response.status_code == 201
        data = response.json()
        assert len(data) == 1
        assert data[0]["teacher_id"] == str(teacher.id)

    def test_list_book_assignments(
        self, client: TestClient, publisher_api_token: str, publisher_with_book_and_school
    ):
        """Test listing book assignments via API."""
        book = publisher_with_book_and_school["book"]
        school = publisher_with_book_and_school["school"]

        # First create an assignment
        client.post(
            f"{settings.API_V1_STR}/book-assignments/bulk",
            json={
                "book_id": str(book.id),
                "school_id": str(school.id),
                "assign_to_all_teachers": True
            },
            headers={"Authorization": f"Bearer {publisher_api_token}"}
        )

        # Then list assignments
        response = client.get(
            f"{settings.API_V1_STR}/book-assignments",
            headers={"Authorization": f"Bearer {publisher_api_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1

    def test_list_assignments_filter_by_book(
        self, client: TestClient, publisher_api_token: str, publisher_with_book_and_school
    ):
        """Test filtering assignments by book_id."""
        book = publisher_with_book_and_school["book"]
        school = publisher_with_book_and_school["school"]

        # Create assignment
        client.post(
            f"{settings.API_V1_STR}/book-assignments/bulk",
            json={
                "book_id": str(book.id),
                "school_id": str(school.id),
                "assign_to_all_teachers": True
            },
            headers={"Authorization": f"Bearer {publisher_api_token}"}
        )

        # List with filter
        response = client.get(
            f"{settings.API_V1_STR}/book-assignments?book_id={book.id}",
            headers={"Authorization": f"Bearer {publisher_api_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["book_id"] == str(book.id)

    def test_get_book_assignments_for_book(
        self, client: TestClient, publisher_api_token: str, publisher_with_book_and_school
    ):
        """Test getting assignments for a specific book."""
        book = publisher_with_book_and_school["book"]
        school = publisher_with_book_and_school["school"]

        # Create assignment
        client.post(
            f"{settings.API_V1_STR}/book-assignments/bulk",
            json={
                "book_id": str(book.id),
                "school_id": str(school.id),
                "assign_to_all_teachers": True
            },
            headers={"Authorization": f"Bearer {publisher_api_token}"}
        )

        # Get assignments for this book
        response = client.get(
            f"{settings.API_V1_STR}/book-assignments/book/{book.id}",
            headers={"Authorization": f"Bearer {publisher_api_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    def test_delete_book_assignment(
        self, client: TestClient, publisher_api_token: str, publisher_with_book_and_school
    ):
        """Test deleting a book assignment."""
        book = publisher_with_book_and_school["book"]
        school = publisher_with_book_and_school["school"]

        # Create assignment
        create_response = client.post(
            f"{settings.API_V1_STR}/book-assignments/bulk",
            json={
                "book_id": str(book.id),
                "school_id": str(school.id),
                "assign_to_all_teachers": True
            },
            headers={"Authorization": f"Bearer {publisher_api_token}"}
        )
        assignment_id = create_response.json()[0]["id"]

        # Delete it
        response = client.delete(
            f"{settings.API_V1_STR}/book-assignments/{assignment_id}",
            headers={"Authorization": f"Bearer {publisher_api_token}"}
        )

        assert response.status_code == 204

    def test_unauthorized_access_denied(
        self, client: TestClient, student_token: str
    ):
        """Test that non-publishers cannot access book assignment endpoints."""
        response = client.get(
            f"{settings.API_V1_STR}/book-assignments",
            headers={"Authorization": f"Bearer {student_token}"}
        )

        assert response.status_code == 403
