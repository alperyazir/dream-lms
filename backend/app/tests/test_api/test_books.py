"""
Tests for Book API endpoints (Story 3.6).

Tests cover:
- Authorization: Teacher role required, publisher-based access control
- Functionality: Pagination, search, filters, activity listing
- Validation: Input parameter validation

NOTE: These tests may have sync/async database fixture isolation issues
(documented in Story 3.5). Tests provide documentation value and test structure,
but may require test infrastructure improvements to execute reliably.
"""

import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import (
    Activity,
    ActivityType,
    Book,
    BookAccess,
    BookStatus,
    Publisher,
    School,
    Teacher,
    User,
    UserRole,
)


class TestListBooksAuthorization:
    """Test authorization for GET /api/v1/books endpoint."""

    def test_list_books_requires_authentication(self, client: TestClient):
        """Test that unauthenticated requests are rejected."""
        response = client.get(f"{settings.API_V1_STR}/books")
        assert response.status_code == 401

    def test_list_books_requires_teacher_role(
        self, client: TestClient, student_token: str
    ):
        """Test that non-teacher users cannot access book catalog."""
        response = client.get(
            f"{settings.API_V1_STR}/books",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert response.status_code == 403
        detail = response.json()["detail"].lower()
        assert "forbidden" in detail or "permissions" in detail

    def test_list_books_filters_by_publisher(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test that teachers only see books from their publisher."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Get teacher's school and publisher
        teacher = session.exec(select(Teacher).where(Teacher.user_id == teacher_user_with_record.id)).first()
        school = session.exec(select(School).where(School.id == teacher.school_id)).first()
        teacher_publisher = session.exec(select(Publisher).where(Publisher.id == school.publisher_id)).first()

        # Create another publisher
        other_pub_user = User(
            id=uuid.uuid4(),
            email="otherpub@example.com",
            username="otherpub",
            hashed_password="hashed",
            role=UserRole.publisher,
        )
        session.add(other_pub_user)
        session.commit()

        other_publisher = Publisher(
            id=uuid.uuid4(),
            user_id=other_pub_user.id,
            name="Other Publisher",
        )
        session.add(other_publisher)
        session.commit()

        # Create books for both publishers
        teacher_book = Book(
            id=uuid.uuid4(),
            dream_storage_id="book-teacher-pub",
            title="Teacher's Book",
            book_name="Teacher Book",
            publisher_name=teacher_publisher.name,
            publisher_id=teacher_publisher.id,
        )
        other_book = Book(
            id=uuid.uuid4(),
            dream_storage_id="book-other-pub",
            title="Other Publisher's Book",
            book_name="Other Book",
            publisher_name=other_publisher.name,
            publisher_id=other_publisher.id,
        )
        session.add_all([teacher_book, other_book])
        session.commit()

        # Grant access via BookAccess
        teacher_access = BookAccess(
            id=uuid.uuid4(),
            book_id=teacher_book.id,
            publisher_id=teacher_publisher.id,
        )
        other_access = BookAccess(
            id=uuid.uuid4(),
            book_id=other_book.id,
            publisher_id=other_publisher.id,
        )
        session.add_all([teacher_access, other_access])
        session.commit()

        # Request books as teacher
        response = client.get(
            f"{settings.API_V1_STR}/books",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Teacher's Book"


class TestListBooksFunctionality:
    """Test functionality of GET /api/v1/books endpoint."""

    def test_list_books_returns_paginated_results(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test pagination parameters work correctly."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Get teacher's publisher
        teacher = session.exec(select(Teacher).where(Teacher.user_id == teacher_user_with_record.id)).first()
        school = session.exec(select(School).where(School.id == teacher.school_id)).first()
        publisher = session.exec(select(Publisher).where(Publisher.id == school.publisher_id)).first()

        # Create 5 books
        for i in range(5):
            book = Book(
                id=uuid.uuid4(),
                dream_storage_id=f"book-{i}",
                title=f"Book {i}",
                book_name=f"Book {i}",
                publisher_name=publisher.name,
                publisher_id=publisher.id,
            )
            session.add(book)
            session.commit()

            # Grant access
            access = BookAccess(
                id=uuid.uuid4(),
                book_id=book.id,
                publisher_id=publisher.id,
            )
            session.add(access)

        session.commit()

        # Request first 3 books
        response = client.get(
            f"{settings.API_V1_STR}/books?skip=0&limit=3",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 3
        assert data["total"] == 5
        assert data["skip"] == 0
        assert data["limit"] == 3

    def test_list_books_search_by_title(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test search filter works on title."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Get teacher's publisher
        teacher = session.exec(select(Teacher).where(Teacher.user_id == teacher_user_with_record.id)).first()
        school = session.exec(select(School).where(School.id == teacher.school_id)).first()
        publisher = session.exec(select(Publisher).where(Publisher.id == school.publisher_id)).first()

        # Create books with different titles
        book1 = Book(
            id=uuid.uuid4(),
            dream_storage_id="book-math",
            title="Math Workbook",
            book_name="Math",
            publisher_name=publisher.name,
            publisher_id=publisher.id,
        )
        book2 = Book(
            id=uuid.uuid4(),
            dream_storage_id="book-science",
            title="Science Adventures",
            book_name="Science",
            publisher_name=publisher.name,
            publisher_id=publisher.id,
        )
        session.add_all([book1, book2])
        session.commit()

        # Grant access
        for book in [book1, book2]:
            access = BookAccess(
                id=uuid.uuid4(),
                book_id=book.id,
                publisher_id=publisher.id,
            )
            session.add(access)
        session.commit()

        # Search for "math"
        response = client.get(
            f"{settings.API_V1_STR}/books?search=math",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert "Math" in data["items"][0]["title"]

    def test_list_books_returns_empty_when_no_books(
        self,
        client: TestClient,
        teacher_user_with_record: User,
    ):
        """Test empty result when publisher has no books."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Request books (none exist)
        response = client.get(
            f"{settings.API_V1_STR}/books",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 0
        assert data["total"] == 0


class TestListBooksValidation:
    """Test input validation for GET /api/v1/books endpoint."""

    def test_list_books_rejects_negative_skip(
        self,
        client: TestClient,
        teacher_user_with_record: User,
    ):
        """Test that negative skip parameter is rejected."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Request with negative skip
        response = client.get(
            f"{settings.API_V1_STR}/books?skip=-1",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 400
        assert "non-negative" in response.json()["detail"].lower()

    def test_list_books_rejects_limit_too_high(
        self,
        client: TestClient,
        teacher_user_with_record: User,
    ):
        """Test that limit > 100 is rejected."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Request with limit > 100
        response = client.get(
            f"{settings.API_V1_STR}/books?limit=101",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 400
        assert "between 1 and 100" in response.json()["detail"].lower()

    def test_list_books_rejects_limit_zero(
        self,
        client: TestClient,
        teacher_user_with_record: User,
    ):
        """Test that limit < 1 is rejected."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Request with limit = 0
        response = client.get(
            f"{settings.API_V1_STR}/books?limit=0",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 400
        assert "between 1 and 100" in response.json()["detail"].lower()


class TestGetBookActivities:
    """Test GET /api/v1/books/{book_id}/activities endpoint."""

    def test_get_activities_requires_authentication(self, client: TestClient):
        """Test that unauthenticated requests are rejected."""
        book_id = uuid.uuid4()
        response = client.get(f"{settings.API_V1_STR}/books/{book_id}/activities")
        assert response.status_code == 401

    def test_get_activities_returns_404_for_other_publisher_book(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test that teachers cannot access books from other publishers."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Create another publisher and book
        other_pub_user = User(
            id=uuid.uuid4(),
            email="otherpub2@example.com",
            username="otherpub2",
            hashed_password="hashed",
            role=UserRole.publisher,
        )
        session.add(other_pub_user)
        session.commit()

        other_publisher = Publisher(
            id=uuid.uuid4(),
            user_id=other_pub_user.id,
            name="Other Publisher 2",
        )
        session.add(other_publisher)
        session.commit()

        other_book = Book(
            id=uuid.uuid4(),
            dream_storage_id="other-book",
            title="Other Book",
            book_name="Other",
            publisher_name=other_publisher.name,
            publisher_id=other_publisher.id,
        )
        session.add(other_book)
        session.commit()

        # Grant access to other publisher only
        other_access = BookAccess(
            id=uuid.uuid4(),
            book_id=other_book.id,
            publisher_id=other_publisher.id,
        )
        session.add(other_access)
        session.commit()

        # Request activities (should get 404)
        response = client.get(
            f"{settings.API_V1_STR}/books/{other_book.id}/activities",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_activities_returns_ordered_activities(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test activities are returned ordered by order_index."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Get teacher's publisher
        teacher = session.exec(select(Teacher).where(Teacher.user_id == teacher_user_with_record.id)).first()
        school = session.exec(select(School).where(School.id == teacher.school_id)).first()
        publisher = session.exec(select(Publisher).where(Publisher.id == school.publisher_id)).first()

        # Create book
        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="book-with-activities",
            title="Activity Book",
            book_name="Activity Book",
            publisher_name=publisher.name,
            publisher_id=publisher.id,
        )
        session.add(book)
        session.commit()

        # Grant access
        access = BookAccess(
            id=uuid.uuid4(),
            book_id=book.id,
            publisher_id=publisher.id,
        )
        session.add(access)
        session.commit()

        # Create activities with different order_index
        activity1 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 1",
            page_number=1,
            section_index=0,
            activity_type=ActivityType.matchTheWords,
            title="Activity 1",
            config_json={"test": "data1"},
            order_index=2,
        )
        activity2 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 1",
            page_number=1,
            section_index=1,
            activity_type=ActivityType.dragdroppicture,
            title="Activity 2",
            config_json={"test": "data2"},
            order_index=1,
        )
        activity3 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 1",
            page_number=2,
            section_index=0,
            activity_type=ActivityType.circle,
            title="Activity 3",
            config_json={"test": "data3"},
            order_index=3,
        )
        session.add_all([activity1, activity2, activity3])
        session.commit()

        # Get activities
        response = client.get(
            f"{settings.API_V1_STR}/books/{book.id}/activities",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        activities = response.json()
        assert len(activities) == 3

        # Verify order
        assert activities[0]["order_index"] == 1
        assert activities[0]["title"] == "Activity 2"
        assert activities[1]["order_index"] == 2
        assert activities[1]["title"] == "Activity 1"
        assert activities[2]["order_index"] == 3
        assert activities[2]["title"] == "Activity 3"

        # Verify config_json is included
        assert "config_json" in activities[0]
        assert activities[0]["config_json"] == {"test": "data2"}

    def test_get_activities_returns_404_for_nonexistent_book(
        self,
        client: TestClient,
        teacher_user_with_record: User,
    ):
        """Test 404 response for non-existent book."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Request activities for non-existent book
        fake_book_id = uuid.uuid4()
        response = client.get(
            f"{settings.API_V1_STR}/books/{fake_book_id}/activities",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
