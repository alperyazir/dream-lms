"""
API tests for publisher /me endpoints.
Story 25.3: Restore Publisher /me Endpoints
"""
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import School, Teacher, User, UserRole
from app.schemas.book import BookPublic
from app.schemas.publisher import PublisherPublic


@pytest.fixture
def mock_dcs_publisher():
    """Mock DCS publisher data."""
    return PublisherPublic(
        id=12345,
        name="Test Publisher Corp",
        contact_email="contact@testpub.com",
        logo_url="/api/v1/publishers/12345/logo",
    )


@pytest.fixture
def mock_dcs_books():
    """Mock DCS books for publisher."""
    return [
        BookPublic(
            id=1,
            name="book-one",
            title="Book One",
            publisher_id=12345,
            publisher_name="Test Publisher Corp",
            cover_url="/api/v1/books/1/cover",
            activity_count=10,
        ),
        BookPublic(
            id=2,
            name="book-two",
            title="Book Two",
            publisher_id=12345,
            publisher_name="Test Publisher Corp",
            cover_url="/api/v1/books/2/cover",
            activity_count=5,
        ),
    ]


@pytest.fixture
def publisher_user_with_dcs(session: Session) -> User:
    """Create a publisher user with dcs_publisher_id set."""
    user = User(
        id=uuid.uuid4(),
        email="pubuser@example.com",
        username="pubwithdc",
        hashed_password=get_password_hash("pubpassword"),
        role=UserRole.publisher,
        is_active=True,
        is_superuser=False,
        full_name="Publisher With DCS",
        dcs_publisher_id=12345,  # Linked to DCS publisher
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def publisher_user_no_dcs(session: Session) -> User:
    """Create a publisher user without dcs_publisher_id set."""
    user = User(
        id=uuid.uuid4(),
        email="pubnodcs@example.com",
        username="pubnodcs",
        hashed_password=get_password_hash("pubpassword"),
        role=UserRole.publisher,
        is_active=True,
        is_superuser=False,
        full_name="Publisher No DCS",
        dcs_publisher_id=None,  # NOT linked to DCS publisher
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def publisher_token_with_dcs(client: TestClient, publisher_user_with_dcs: User) -> str:
    """Get access token for publisher user with DCS link."""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": publisher_user_with_dcs.email, "password": "pubpassword"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def publisher_token_no_dcs(client: TestClient, publisher_user_no_dcs: User) -> str:
    """Get access token for publisher user without DCS link."""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": publisher_user_no_dcs.email, "password": "pubpassword"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def publisher_school(session: Session, publisher_user_with_dcs: User) -> School:  # noqa: ARG001
    """Create a school belonging to the publisher."""
    school = School(
        id=uuid.uuid4(),
        name="Publisher Test School",
        address="123 Test St",
        contact_info="school@test.com",
        dcs_publisher_id=12345,
    )
    session.add(school)
    session.commit()
    session.refresh(school)
    return school


@pytest.fixture
def another_publisher_school(session: Session) -> School:
    """Create a school belonging to a different publisher."""
    school = School(
        id=uuid.uuid4(),
        name="Other Publisher School",
        address="456 Other St",
        contact_info="other@test.com",
        dcs_publisher_id=99999,  # Different publisher
    )
    session.add(school)
    session.commit()
    session.refresh(school)
    return school


@pytest.fixture
def teacher_in_publisher_school(session: Session, publisher_school: School) -> tuple[User, Teacher]:
    """Create a teacher in the publisher's school."""
    user = User(
        id=uuid.uuid4(),
        email="teacher1@test.com",
        username="teacher1",
        hashed_password=get_password_hash("teacherpass"),
        role=UserRole.teacher,
        is_active=True,
        is_superuser=False,
        full_name="Teacher One",
    )
    session.add(user)
    session.flush()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=user.id,
        school_id=publisher_school.id,
        subject_specialization="Math",
    )
    session.add(teacher)
    session.commit()
    session.refresh(user)
    session.refresh(teacher)
    return user, teacher


class TestPublisherProfile:
    """Tests for GET /api/v1/publishers/me/profile"""

    def test_get_profile_success(
        self,
        client: TestClient,
        publisher_token_with_dcs: str,
        publisher_user_with_dcs: User,
        mock_dcs_publisher: PublisherPublic,
    ):
        """Test getting publisher profile successfully."""
        with patch("app.api.routes.publishers.get_publisher_service") as mock:
            service = AsyncMock()
            service.get_publisher = AsyncMock(return_value=mock_dcs_publisher)
            mock.return_value = service

            response = client.get(
                "/api/v1/publishers/me/profile",
                headers={"Authorization": f"Bearer {publisher_token_with_dcs}"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["id"] == 12345
            assert data["name"] == "Test Publisher Corp"
            assert data["contact_email"] == "contact@testpub.com"
            assert data["user_id"] == str(publisher_user_with_dcs.id)
            assert data["user_email"] == publisher_user_with_dcs.email
            assert data["user_full_name"] == publisher_user_with_dcs.full_name

    def test_get_profile_no_dcs_link_returns_403(
        self, client: TestClient, publisher_token_no_dcs: str
    ):
        """Test that 403 is returned when publisher has no DCS link."""
        response = client.get(
            "/api/v1/publishers/me/profile",
            headers={"Authorization": f"Bearer {publisher_token_no_dcs}"},
        )

        assert response.status_code == 403
        assert "not linked to a DCS publisher" in response.json()["detail"]

    def test_get_profile_publisher_not_found_in_dcs(
        self, client: TestClient, publisher_token_with_dcs: str
    ):
        """Test that 404 is returned when publisher not found in DCS."""
        with patch("app.api.routes.publishers.get_publisher_service") as mock:
            service = AsyncMock()
            service.get_publisher = AsyncMock(return_value=None)
            mock.return_value = service

            response = client.get(
                "/api/v1/publishers/me/profile",
                headers={"Authorization": f"Bearer {publisher_token_with_dcs}"},
            )

            assert response.status_code == 404
            assert "Publisher not found in DCS" in response.json()["detail"]

    def test_get_profile_requires_publisher_role(
        self, client: TestClient, teacher_token: str
    ):
        """Test that non-publisher users get 403."""
        response = client.get(
            "/api/v1/publishers/me/profile",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        assert response.status_code == 403


class TestPublisherStats:
    """Tests for GET /api/v1/publishers/me/stats"""

    def test_get_stats_success(
        self,
        client: TestClient,
        publisher_token_with_dcs: str,
        publisher_school: School,
        teacher_in_publisher_school: tuple,
        mock_dcs_books: list,
    ):
        """Test getting publisher stats successfully."""
        with patch("app.api.routes.publishers.get_book_service") as mock:
            service = AsyncMock()
            service.list_books = AsyncMock(return_value=mock_dcs_books)
            mock.return_value = service

            response = client.get(
                "/api/v1/publishers/me/stats",
                headers={"Authorization": f"Bearer {publisher_token_with_dcs}"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["schools_count"] == 1
            assert data["teachers_count"] == 1
            assert data["books_count"] == 2

    def test_get_stats_no_dcs_link_returns_403(
        self, client: TestClient, publisher_token_no_dcs: str
    ):
        """Test that 403 is returned when publisher has no DCS link."""
        response = client.get(
            "/api/v1/publishers/me/stats",
            headers={"Authorization": f"Bearer {publisher_token_no_dcs}"},
        )

        assert response.status_code == 403


class TestPublisherSchools:
    """Tests for GET/POST /api/v1/publishers/me/schools"""

    def test_list_schools_success(
        self,
        client: TestClient,
        publisher_token_with_dcs: str,
        publisher_school: School,
        another_publisher_school: School,
    ):
        """Test listing only publisher's schools."""
        response = client.get(
            "/api/v1/publishers/me/schools",
            headers={"Authorization": f"Bearer {publisher_token_with_dcs}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1  # Only the publisher's school
        assert data[0]["name"] == "Publisher Test School"

    def test_list_schools_empty(
        self, client: TestClient, publisher_token_with_dcs: str
    ):
        """Test listing schools when publisher has none."""
        response = client.get(
            "/api/v1/publishers/me/schools",
            headers={"Authorization": f"Bearer {publisher_token_with_dcs}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_create_school_success(
        self, client: TestClient, publisher_token_with_dcs: str
    ):
        """Test creating a school with auto-set publisher ID."""
        school_data = {
            "name": "New School",
            "address": "789 New St",
            "contact_info": "new@school.com",
        }

        response = client.post(
            "/api/v1/publishers/me/schools",
            headers={"Authorization": f"Bearer {publisher_token_with_dcs}"},
            json=school_data,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New School"
        assert data["address"] == "789 New St"
        assert data["dcs_publisher_id"] == 12345  # Auto-set

    def test_create_school_no_dcs_link_returns_403(
        self, client: TestClient, publisher_token_no_dcs: str
    ):
        """Test that 403 is returned when publisher has no DCS link."""
        school_data = {
            "name": "New School",
            "address": "789 New St",
            "contact_info": "new@school.com",
        }

        response = client.post(
            "/api/v1/publishers/me/schools",
            headers={"Authorization": f"Bearer {publisher_token_no_dcs}"},
            json=school_data,
        )

        assert response.status_code == 403


class TestPublisherTeachers:
    """Tests for GET/POST /api/v1/publishers/me/teachers"""

    def test_list_teachers_success(
        self,
        client: TestClient,
        publisher_token_with_dcs: str,
        publisher_school: School,
        teacher_in_publisher_school: tuple,
    ):
        """Test listing teachers in publisher's schools."""
        response = client.get(
            "/api/v1/publishers/me/teachers",
            headers={"Authorization": f"Bearer {publisher_token_with_dcs}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["user_full_name"] == "Teacher One"
        assert data[0]["school_id"] == str(publisher_school.id)

    def test_create_teacher_success(
        self,
        client: TestClient,
        publisher_token_with_dcs: str,
        publisher_school: School,
    ):
        """Test creating a teacher in publisher's school."""
        teacher_data = {
            "username": "newteacher",
            "user_email": "newteacher@test.com",
            "full_name": "New Teacher",
            "school_id": str(publisher_school.id),
            "subject_specialization": "English",
        }

        with patch("app.api.routes.publishers.send_email") as mock_email:
            mock_email.side_effect = Exception("Email disabled")

            response = client.post(
                "/api/v1/publishers/me/teachers",
                headers={"Authorization": f"Bearer {publisher_token_with_dcs}"},
                json=teacher_data,
            )

            assert response.status_code == 201
            data = response.json()
            assert data["user"]["username"] == "newteacher"
            assert data["role_record"]["school_id"] == str(publisher_school.id)
            assert data["role_record"]["user_full_name"] == "New Teacher"
            assert data["temporary_password"] is not None

    def test_create_teacher_in_other_publisher_school_returns_403(
        self,
        client: TestClient,
        publisher_token_with_dcs: str,
        another_publisher_school: School,
    ):
        """Test that creating teacher in another publisher's school fails."""
        teacher_data = {
            "username": "badteacher",
            "user_email": "badteacher@test.com",
            "full_name": "Bad Teacher",
            "school_id": str(another_publisher_school.id),
            "subject_specialization": "Science",
        }

        response = client.post(
            "/api/v1/publishers/me/teachers",
            headers={"Authorization": f"Bearer {publisher_token_with_dcs}"},
            json=teacher_data,
        )

        assert response.status_code == 403
        assert "does not belong to your organization" in response.json()["detail"]

    def test_create_teacher_school_not_found_returns_404(
        self, client: TestClient, publisher_token_with_dcs: str
    ):
        """Test that creating teacher for non-existent school fails."""
        teacher_data = {
            "username": "orphanteacher",
            "user_email": "orphan@test.com",
            "full_name": "Orphan Teacher",
            "school_id": str(uuid.uuid4()),
            "subject_specialization": "Art",
        }

        response = client.post(
            "/api/v1/publishers/me/teachers",
            headers={"Authorization": f"Bearer {publisher_token_with_dcs}"},
            json=teacher_data,
        )

        assert response.status_code == 404
        assert "School not found" in response.json()["detail"]


class TestPublisherBooks:
    """Tests for GET /api/v1/publishers/me/books"""

    def test_list_books_success(
        self,
        client: TestClient,
        publisher_token_with_dcs: str,
        mock_dcs_books: list,
    ):
        """Test listing books from DCS for publisher."""
        with patch("app.api.routes.publishers.get_book_service") as mock:
            service = AsyncMock()
            service.list_books = AsyncMock(return_value=mock_dcs_books)
            mock.return_value = service

            response = client.get(
                "/api/v1/publishers/me/books",
                headers={"Authorization": f"Bearer {publisher_token_with_dcs}"},
            )

            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["name"] == "book-one"
            assert data[1]["name"] == "book-two"

            # Verify service was called with publisher_id
            service.list_books.assert_called_once_with(publisher_id=12345)

    def test_list_books_no_dcs_link_returns_403(
        self, client: TestClient, publisher_token_no_dcs: str
    ):
        """Test that 403 is returned when publisher has no DCS link."""
        response = client.get(
            "/api/v1/publishers/me/books",
            headers={"Authorization": f"Bearer {publisher_token_no_dcs}"},
        )

        assert response.status_code == 403
