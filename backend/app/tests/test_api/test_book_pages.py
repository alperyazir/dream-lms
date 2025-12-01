"""
Tests for Book Pages API endpoints (Story 8.2).

Tests cover:
- GET /api/v1/books/{book_id}/pages - Get pages grouped by module
- GET /api/v1/books/{book_id}/pages/{page_number}/activities - Get activities on a page
- Module name to folder conversion helper function
"""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.api.routes.books import _extract_page_image_paths, _module_name_to_folder
from app.core.config import settings
from app.models import (
    Activity,
    ActivityType,
    Book,
    BookAccess,
    Publisher,
    School,
    Teacher,
    User,
    UserRole,
)


class TestModuleNameToFolder:
    """Test the _module_name_to_folder helper function."""

    def test_module_name_standard_format(self):
        """Test 'Module X' format converts to 'MX'."""
        assert _module_name_to_folder("Module 1") == "M1"
        assert _module_name_to_folder("Module 3") == "M3"
        assert _module_name_to_folder("Module 10") == "M10"

    def test_module_name_already_short(self):
        """Test already short format returns as-is."""
        assert _module_name_to_folder("M1") == "M1"
        assert _module_name_to_folder("M3") == "M3"
        assert _module_name_to_folder("M10") == "M10"

    def test_module_name_non_standard(self):
        """Test non-standard names return as-is."""
        assert _module_name_to_folder("Intro") == "Intro"
        assert _module_name_to_folder("Appendix") == "Appendix"
        assert _module_name_to_folder("Review") == "Review"

    def test_module_name_case_insensitive(self):
        """Test module pattern matching is case insensitive."""
        assert _module_name_to_folder("module 5") == "M5"
        assert _module_name_to_folder("MODULE 2") == "M2"


class TestExtractPageImagePaths:
    """Test the _extract_page_image_paths helper function."""

    def test_extract_image_paths_from_config(self):
        """Test extracting image paths from config.json structure with books wrapper."""
        config = {
            "books": [
                {
                    "modules": [
                        {
                            "name": "Module 1",
                            "pages": [
                                {
                                    "page_number": 7,
                                    "image_path": "./books/TestBook/images/HB/modules/M1/pages/07.png",
                                },
                                {
                                    "page_number": 8,
                                    "image_path": "./books/TestBook/images/HB/modules/M1/pages/08.png",
                                },
                            ],
                        },
                        {
                            "name": "Module 2",
                            "pages": [
                                {
                                    "page_number": 15,
                                    "image_path": "./books/TestBook/images/HB/modules/M2/pages/15.png",
                                },
                            ],
                        },
                    ]
                }
            ]
        }
        result = _extract_page_image_paths(config)

        assert result[("Module 1", 7)] == "images/HB/modules/M1/pages/07.png"
        assert result[("Module 1", 8)] == "images/HB/modules/M1/pages/08.png"
        assert result[("Module 2", 15)] == "images/HB/modules/M2/pages/15.png"
        # Also check fallback keys (empty module name)
        assert result[("", 7)] == "images/HB/modules/M1/pages/07.png"
        assert result[("", 8)] == "images/HB/modules/M1/pages/08.png"
        assert result[("", 15)] == "images/HB/modules/M2/pages/15.png"

    def test_extract_different_path_formats(self):
        """Test extraction handles different image path formats."""
        config = {
            "books": [
                {
                    "modules": [
                        {
                            "name": "Module 1",
                            "pages": [
                                {
                                    "page_number": 7,
                                    "image_path": "./books/BookA/images/HB/modules/M1/pages/07.png",
                                },
                                {
                                    "page_number": 8,
                                    "image_path": "./books/BookB/images/units/M1/08.png",
                                },
                            ],
                        },
                    ]
                }
            ]
        }
        result = _extract_page_image_paths(config)
        # Both formats should extract correctly
        assert result[("Module 1", 7)] == "images/HB/modules/M1/pages/07.png"
        assert result[("Module 1", 8)] == "images/units/M1/08.png"

    def test_extract_empty_config(self):
        """Test with empty config returns empty dict."""
        assert _extract_page_image_paths({}) == {}
        assert _extract_page_image_paths({"books": []}) == {}
        assert _extract_page_image_paths({"books": [{"modules": []}]}) == {}

    def test_extract_handles_missing_fields(self):
        """Test graceful handling of missing fields."""
        config = {
            "modules": [
                {
                    "name": "Module 1",
                    "pages": [
                        {"page_number": 7},  # Missing image_path
                        {"image_path": "./books/Test/images/page.png"},  # Missing page_number
                    ],
                },
            ]
        }
        result = _extract_page_image_paths(config)
        assert len(result) == 0  # Both should be skipped


class TestGetBookPages:
    """Test GET /api/v1/books/{book_id}/pages endpoint."""

    def test_get_pages_requires_authentication(self, client: TestClient):
        """Test that unauthenticated requests are rejected."""
        book_id = uuid.uuid4()
        response = client.get(f"{settings.API_V1_STR}/books/{book_id}/pages")
        assert response.status_code == 401

    def test_get_pages_returns_modules_and_pages(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test that pages are returned grouped by module."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Get teacher's publisher
        teacher = session.exec(
            select(Teacher).where(Teacher.user_id == teacher_user_with_record.id)
        ).first()
        school = session.exec(select(School).where(School.id == teacher.school_id)).first()
        publisher = session.exec(
            select(Publisher).where(Publisher.id == school.publisher_id)
        ).first()

        # Create book with config_json containing page image_path values
        book_config = {
            "modules": [
                {
                    "name": "Module 1",
                    "pages": [
                        {
                            "page_number": 7,
                            "image_path": "./books/PagesTest/images/HB/modules/M1/pages/07.png",
                        },
                        {
                            "page_number": 8,
                            "image_path": "./books/PagesTest/images/HB/modules/M1/pages/08.png",
                        },
                    ],
                },
                {
                    "name": "Module 2",
                    "pages": [
                        {
                            "page_number": 15,
                            "image_path": "./books/PagesTest/images/HB/modules/M2/pages/15.png",
                        },
                    ],
                },
            ]
        }
        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="book-pages-test",
            title="Pages Test Book",
            book_name="Pages Test",
            publisher_name=publisher.name,
            publisher_id=publisher.id,
            config_json=book_config,
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

        # Create activities on different pages/modules
        activities = [
            Activity(
                id=uuid.uuid4(),
                book_id=book.id,
                module_name="Module 1",
                page_number=7,
                section_index=0,
                activity_type=ActivityType.matchTheWords,
                title="Activity 1",
                config_json={},
                order_index=70,
            ),
            Activity(
                id=uuid.uuid4(),
                book_id=book.id,
                module_name="Module 1",
                page_number=7,
                section_index=1,
                activity_type=ActivityType.circle,
                title="Activity 2",
                config_json={},
                order_index=71,
            ),
            Activity(
                id=uuid.uuid4(),
                book_id=book.id,
                module_name="Module 1",
                page_number=8,
                section_index=0,
                activity_type=ActivityType.dragdroppicture,
                title="Activity 3",
                config_json={},
                order_index=80,
            ),
            Activity(
                id=uuid.uuid4(),
                book_id=book.id,
                module_name="Module 2",
                page_number=15,
                section_index=0,
                activity_type=ActivityType.puzzleFindWords,
                title="Activity 4",
                config_json={},
                order_index=1150,
            ),
        ]
        session.add_all(activities)
        session.commit()

        # Get pages
        response = client.get(
            f"{settings.API_V1_STR}/books/{book.id}/pages",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "modules" in data
        assert "total_pages" in data
        assert "total_activities" in data
        assert data["total_pages"] == 3  # Page 7, 8, 15
        assert data["total_activities"] == 4

        # Verify modules
        modules = {m["name"]: m for m in data["modules"]}
        assert "Module 1" in modules
        assert "Module 2" in modules

        # Verify Module 1 pages
        m1_pages = {p["page_number"]: p for p in modules["Module 1"]["pages"]}
        assert 7 in m1_pages
        assert 8 in m1_pages
        assert m1_pages[7]["activity_count"] == 2
        assert m1_pages[8]["activity_count"] == 1

        # Verify thumbnail URLs from config.json image_path
        # Format: /api/v1/books/{book_id}/assets/images/HB/modules/M1/pages/07.png
        assert "/assets/images/HB/modules/M1/pages/07.png" in m1_pages[7]["thumbnail_url"]
        assert "/assets/images/HB/modules/M1/pages/08.png" in m1_pages[8]["thumbnail_url"]

        # Verify Module 2 pages
        m2_pages = {p["page_number"]: p for p in modules["Module 2"]["pages"]}
        assert 15 in m2_pages
        assert m2_pages[15]["activity_count"] == 1
        assert "/assets/images/HB/modules/M2/pages/15.png" in m2_pages[15]["thumbnail_url"]

    def test_get_pages_returns_404_for_other_publisher_book(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test that teachers cannot access pages from other publishers."""
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
            dream_storage_id="other-book-pages",
            title="Other Book Pages",
            book_name="Other Pages",
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

        # Request pages (should get 404)
        response = client.get(
            f"{settings.API_V1_STR}/books/{other_book.id}/pages",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 404


class TestGetPageActivities:
    """Test GET /api/v1/books/{book_id}/pages/{page_number}/activities endpoint."""

    def test_get_page_activities_returns_ordered_by_section(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test activities are returned ordered by section_index."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Get teacher's publisher
        teacher = session.exec(
            select(Teacher).where(Teacher.user_id == teacher_user_with_record.id)
        ).first()
        school = session.exec(select(School).where(School.id == teacher.school_id)).first()
        publisher = session.exec(
            select(Publisher).where(Publisher.id == school.publisher_id)
        ).first()

        # Create book
        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="book-page-activities",
            title="Page Activities Book",
            book_name="Page Activities",
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

        # Create activities on the same page with different section_index
        activity1 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 1",
            page_number=10,
            section_index=2,  # Third
            activity_type=ActivityType.circle,
            title="Third Activity",
            config_json={},
            order_index=102,
        )
        activity2 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 1",
            page_number=10,
            section_index=0,  # First
            activity_type=ActivityType.matchTheWords,
            title="First Activity",
            config_json={},
            order_index=100,
        )
        activity3 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 1",
            page_number=10,
            section_index=1,  # Second
            activity_type=ActivityType.dragdroppicture,
            title="Second Activity",
            config_json={},
            order_index=101,
        )
        # Activity on different page (should not be returned)
        activity4 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 1",
            page_number=11,
            section_index=0,
            activity_type=ActivityType.puzzleFindWords,
            title="Different Page Activity",
            config_json={},
            order_index=110,
        )
        session.add_all([activity1, activity2, activity3, activity4])
        session.commit()

        # Get activities for page 10
        response = client.get(
            f"{settings.API_V1_STR}/books/{book.id}/pages/10/activities",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        activities = response.json()

        # Should only have 3 activities from page 10
        assert len(activities) == 3

        # Verify order by section_index
        assert activities[0]["section_index"] == 0
        assert activities[0]["title"] == "First Activity"
        assert activities[1]["section_index"] == 1
        assert activities[1]["title"] == "Second Activity"
        assert activities[2]["section_index"] == 2
        assert activities[2]["title"] == "Third Activity"

        # Verify response includes required fields
        assert "id" in activities[0]
        assert "activity_type" in activities[0]
        assert "order_index" in activities[0]

    def test_get_page_activities_with_module_filter(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test filtering activities by module name."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Get teacher's publisher
        teacher = session.exec(
            select(Teacher).where(Teacher.user_id == teacher_user_with_record.id)
        ).first()
        school = session.exec(select(School).where(School.id == teacher.school_id)).first()
        publisher = session.exec(
            select(Publisher).where(Publisher.id == school.publisher_id)
        ).first()

        # Create book
        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="book-module-filter",
            title="Module Filter Book",
            book_name="Module Filter",
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

        # Create activities on same page but different modules
        activity1 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 1",
            page_number=5,
            section_index=0,
            activity_type=ActivityType.matchTheWords,
            title="Module 1 Activity",
            config_json={},
            order_index=50,
        )
        activity2 = Activity(
            id=uuid.uuid4(),
            book_id=book.id,
            module_name="Module 2",
            page_number=5,  # Same page number, different module
            section_index=0,
            activity_type=ActivityType.circle,
            title="Module 2 Activity",
            config_json={},
            order_index=1050,
        )
        session.add_all([activity1, activity2])
        session.commit()

        # Get activities for page 5 filtered by Module 1
        response = client.get(
            f"{settings.API_V1_STR}/books/{book.id}/pages/5/activities?module_name=Module 1",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        activities = response.json()

        # Should only have Module 1 activity
        assert len(activities) == 1
        assert activities[0]["title"] == "Module 1 Activity"

    def test_get_page_activities_returns_empty_for_page_without_activities(
        self,
        client: TestClient,
        session: Session,
        teacher_user_with_record: User,
    ):
        """Test empty array returned for page with no activities."""
        # Get teacher token
        response = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": teacher_user_with_record.email, "password": "teacherpassword"},
        )
        teacher_token = response.json()["access_token"]

        # Get teacher's publisher
        teacher = session.exec(
            select(Teacher).where(Teacher.user_id == teacher_user_with_record.id)
        ).first()
        school = session.exec(select(School).where(School.id == teacher.school_id)).first()
        publisher = session.exec(
            select(Publisher).where(Publisher.id == school.publisher_id)
        ).first()

        # Create book without activities
        book = Book(
            id=uuid.uuid4(),
            dream_storage_id="book-no-activities",
            title="Empty Book",
            book_name="Empty",
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

        # Get activities for page 99 (doesn't exist)
        response = client.get(
            f"{settings.API_V1_STR}/books/{book.id}/pages/99/activities",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 200
        activities = response.json()
        assert len(activities) == 0
