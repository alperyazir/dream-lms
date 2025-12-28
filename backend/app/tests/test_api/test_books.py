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

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import (
    Activity,
    ActivityType,
    Book,
    BookAssignment,
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

        # Grant access via BookAssignment (Story 9.4)
        # Assign teacher_book to teacher's school
        teacher_assignment = BookAssignment(
            id=uuid.uuid4(),
            book_id=teacher_book.id,
            school_id=school.id,
            assigned_by=teacher_user_with_record.id,
        )
        # other_book is NOT assigned to teacher, so should not be visible
        session.add(teacher_assignment)
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

        # Create 5 books with BookAssignment
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

            # Grant access via BookAssignment (Story 9.4)
            assignment = BookAssignment(
                id=uuid.uuid4(),
                book_id=book.id,
                school_id=school.id,
                assigned_by=teacher_user_with_record.id,
            )
            session.add(assignment)

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

        # Grant access via BookAssignment (Story 9.4)
        for book in [book1, book2]:
            assignment = BookAssignment(
                id=uuid.uuid4(),
                book_id=book.id,
                school_id=school.id,
                assigned_by=teacher_user_with_record.id,
            )
            session.add(assignment)
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

        # other_book is NOT assigned to the teacher's school, so should not be accessible
        # (No BookAssignment record is created for this book)

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

        # Grant access via BookAssignment (Story 9.4)
        assignment = BookAssignment(
            id=uuid.uuid4(),
            book_id=book.id,
            school_id=school.id,
            assigned_by=teacher_user_with_record.id,
        )
        session.add(assignment)
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


class TestGetBookStructure:
    """Test GET /api/v1/books/{book_id}/structure endpoint (Story 9.5)."""

    def test_get_structure_requires_authentication(self, client: TestClient):
        """Test that unauthenticated requests are rejected."""
        book_id = uuid.uuid4()
        response = client.get(f"{settings.API_V1_STR}/books/{book_id}/structure")
        assert response.status_code == 401

    def test_get_structure_returns_module_and_page_data(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test that structure endpoint returns modules, pages, and activity IDs."""
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

        # Create book with config_json
        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="book-structure-test",
            title="Structure Test Book",
            book_name="Structure Test",
            publisher_name=publisher.name,
            publisher_id=publisher.id,
            config_json={},
        )
        session.add(book)
        session.commit()

        # Grant access via BookAssignment
        assignment = BookAssignment(
            id=uuid.uuid4(),
            book_id=book.id,
            school_id=school.id,
            assigned_by=teacher_user_with_record.id,
        )
        session.add(assignment)
        session.commit()

        # Create activities in different modules and pages
        activity1 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 1",
            page_number=1,
            section_index=0,
            activity_type=ActivityType.matchTheWords,
            title="Activity 1",
            config_json={},
            order_index=0,
        )
        activity2 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 1",
            page_number=1,
            section_index=1,
            activity_type=ActivityType.circle,
            title="Activity 2",
            config_json={},
            order_index=1,
        )
        activity3 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 1",
            page_number=2,
            section_index=0,
            activity_type=ActivityType.fillpicture,
            title="Activity 3",
            config_json={},
            order_index=2,
        )
        activity4 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 2",
            page_number=5,
            section_index=0,
            activity_type=ActivityType.puzzleFindWords,
            title="Activity 4",
            config_json={},
            order_index=3,
        )
        session.add_all([activity1, activity2, activity3, activity4])
        session.commit()

        # Get book structure
        response = client.get(
            f"{settings.API_V1_STR}/books/{book.id}/structure",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert data["book_id"] == str(book.id)
        assert data["total_pages"] == 3  # Pages 1, 2, 5
        assert data["total_activities"] == 4

        # Verify modules
        assert len(data["modules"]) == 2
        module_names = {m["name"] for m in data["modules"]}
        assert "Module 1" in module_names
        assert "Module 2" in module_names

        # Find Module 1
        module1 = next(m for m in data["modules"] if m["name"] == "Module 1")
        assert module1["page_start"] == 1
        assert module1["page_end"] == 2
        assert module1["activity_count"] == 3
        assert len(module1["activity_ids"]) == 3

        # Verify pages in Module 1
        assert len(module1["pages"]) == 2
        page1 = next(p for p in module1["pages"] if p["page_number"] == 1)
        assert page1["activity_count"] == 2
        assert len(page1["activity_ids"]) == 2

        page2 = next(p for p in module1["pages"] if p["page_number"] == 2)
        assert page2["activity_count"] == 1
        assert len(page2["activity_ids"]) == 1

        # Find Module 2
        module2 = next(m for m in data["modules"] if m["name"] == "Module 2")
        assert module2["page_start"] == 5
        assert module2["page_end"] == 5
        assert module2["activity_count"] == 1
        assert len(module2["activity_ids"]) == 1

    def test_get_structure_returns_404_for_inaccessible_book(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test that teachers cannot access structure of books they don't have access to."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Create another publisher and book
        other_pub_user = User(
            id=uuid.uuid4(),
            email="otherpub3@example.com",
            username="otherpub3",
            hashed_password="hashed",
            role=UserRole.publisher,
        )
        session.add(other_pub_user)
        session.commit()

        other_publisher = Publisher(
            id=uuid.uuid4(),
            user_id=other_pub_user.id,
            name="Other Publisher 3",
        )
        session.add(other_publisher)
        session.commit()

        other_book = Book(
            id=uuid.uuid4(),
            dream_storage_id="other-book-structure",
            title="Other Book Structure",
            book_name="Other Structure",
            publisher_name=other_publisher.name,
            publisher_id=other_publisher.id,
        )
        session.add(other_book)
        session.commit()

        # No BookAssignment created - teacher should not have access

        # Request structure (should get 404)
        response = client.get(
            f"{settings.API_V1_STR}/books/{other_book.id}/structure",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestListBookVideos:
    """Test GET /api/v1/books/{book_id}/videos endpoint (Story 10.3)."""

    def test_get_videos_requires_authentication(self, client: TestClient):
        """Test that unauthenticated requests are rejected."""
        book_id = uuid.uuid4()
        response = client.get(f"{settings.API_V1_STR}/books/{book_id}/videos")
        assert response.status_code == 401

    def test_get_videos_requires_teacher_role(
        self, client: TestClient, student_token: str
    ):
        """Test that non-teacher users cannot access book videos."""
        book_id = uuid.uuid4()
        response = client.get(
            f"{settings.API_V1_STR}/books/{book_id}/videos",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert response.status_code == 403
        detail = response.json()["detail"].lower()
        assert "forbidden" in detail or "permissions" in detail

    def test_get_videos_returns_404_for_inaccessible_book(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test that teachers cannot access videos of books they don't have access to."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Create another publisher and book
        other_pub_user = User(
            id=uuid.uuid4(),
            email="otherpub_video@example.com",
            username="otherpub_video",
            hashed_password="hashed",
            role=UserRole.publisher,
        )
        session.add(other_pub_user)
        session.commit()

        other_publisher = Publisher(
            id=uuid.uuid4(),
            user_id=other_pub_user.id,
            name="Other Publisher Video",
        )
        session.add(other_publisher)
        session.commit()

        other_book = Book(
            id=uuid.uuid4(),
            dream_storage_id="other-book-video",
            title="Other Book Video",
            book_name="Other Video",
            publisher_name=other_publisher.name,
            publisher_id=other_publisher.id,
        )
        session.add(other_book)
        session.commit()

        # No BookAssignment created - teacher should not have access

        # Request videos (should get 404)
        response = client.get(
            f"{settings.API_V1_STR}/books/{other_book.id}/videos",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_videos_returns_404_for_nonexistent_book(
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

        # Request videos for non-existent book
        fake_book_id = uuid.uuid4()
        response = client.get(
            f"{settings.API_V1_STR}/books/{fake_book_id}/videos",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_videos_returns_empty_list_on_dcs_error(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
        mocker,
    ):
        """Test that DCS errors result in empty list rather than server error."""
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
            dream_storage_id="book-video-test",
            title="Video Test Book",
            book_name="Video Test",
            publisher_name=publisher.name,
            publisher_id=publisher.id,
        )
        session.add(book)
        session.commit()

        # Grant access via BookAssignment
        assignment = BookAssignment(
            id=uuid.uuid4(),
            book_id=book.id,
            school_id=school.id,
            assigned_by=teacher_user_with_record.id,
        )
        session.add(assignment)
        session.commit()

        # Mock DCS client to raise an error
        mock_client = mocker.Mock()
        mock_client.list_videos = mocker.AsyncMock(side_effect=Exception("DCS error"))
        mocker.patch(
            "app.api.routes.books.get_dream_storage_client",
            return_value=mock_client
        )

        # Request videos - should return empty list, not 500
        response = client.get(
            f"{settings.API_V1_STR}/books/{book.id}/videos",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["videos"] == []
        assert data["total_count"] == 0

    def test_get_videos_returns_video_list(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
        mocker,
    ):
        """Test that videos endpoint returns list of videos from DCS."""
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
            dream_storage_id="book-video-list-test",
            title="Video List Test Book",
            book_name="Video List Test",
            publisher_name=publisher.name,
            publisher_id=publisher.id,
        )
        session.add(book)
        session.commit()

        # Grant access via BookAssignment
        assignment = BookAssignment(
            id=uuid.uuid4(),
            book_id=book.id,
            school_id=school.id,
            assigned_by=teacher_user_with_record.id,
        )
        session.add(assignment)
        session.commit()

        # Mock DCS client to return video list
        mock_videos = [
            {
                "path": "videos/intro.mp4",
                "name": "intro.mp4",
                "size_bytes": 1024000,
                "has_subtitles": True,
            },
            {
                "path": "videos/chapter1.mp4",
                "name": "chapter1.mp4",
                "size_bytes": 2048000,
                "has_subtitles": False,
            },
        ]
        mock_client = mocker.Mock()
        mock_client.list_videos = mocker.AsyncMock(return_value=mock_videos)
        mocker.patch(
            "app.api.routes.books.get_dream_storage_client",
            return_value=mock_client
        )

        # Request videos
        response = client.get(
            f"{settings.API_V1_STR}/books/{book.id}/videos",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["book_id"] == str(book.id)
        assert data["total_count"] == 2
        assert len(data["videos"]) == 2

        # Verify first video
        video1 = data["videos"][0]
        assert video1["path"] == "videos/intro.mp4"
        assert video1["name"] == "intro.mp4"
        assert video1["size_bytes"] == 1024000
        assert video1["has_subtitles"] is True

        # Verify second video
        video2 = data["videos"][1]
        assert video2["path"] == "videos/chapter1.mp4"
        assert video2["name"] == "chapter1.mp4"
        assert video2["size_bytes"] == 2048000
        assert video2["has_subtitles"] is False
