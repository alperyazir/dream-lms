"""
Tests for Content Library API endpoints (Story 27.21).
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlmodel import Session

from app.core.config import settings
from app.main import app
from app.models import (
    School,
    Teacher,
    TeacherGeneratedContent,
    TeacherMaterial,
    User,
    UserRole,
)


@pytest.fixture
def test_school(session: Session) -> School:
    """Create a test school."""
    school = School(
        name="Test School",
        dcs_publisher_id=1,
        city="Test City",
        district="Test District",
    )
    session.add(school)
    session.commit()
    session.refresh(school)
    return school


@pytest.fixture
def content_teacher_user(session: Session) -> User:
    """Create a teacher user for content library tests."""
    user = User(
        email="contentteacher@test.com",
        username="contentteacher",
        hashed_password="hashed",
        role=UserRole.teacher,
        full_name="Content Teacher",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def content_teacher(session: Session, content_teacher_user: User, test_school: School) -> Teacher:
    """Create a teacher profile."""
    teacher = Teacher(
        user_id=content_teacher_user.id,
        school_id=test_school.id,
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)
    # Reload user to ensure teacher relationship is loaded
    session.refresh(content_teacher_user)
    return teacher


@pytest.fixture
def content_teacher_token(content_teacher_user: User, content_teacher: Teacher) -> str:
    """Get access token for content teacher."""
    # Ensure teacher profile is created before generating token
    # Generate a token manually for the content teacher
    from datetime import timedelta

    from app.core.security import create_access_token

    return create_access_token(
        str(content_teacher_user.id), expires_delta=timedelta(hours=1)
    )


@pytest.fixture
def second_teacher_user(session: Session) -> User:
    """Create a second teacher for isolation tests."""
    user = User(
        email="teacher2@test.com",
        username="teacher2",
        hashed_password="hashed",
        role=UserRole.teacher,
        full_name="Second Teacher",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def second_teacher(session: Session, second_teacher_user: User, test_school: School) -> Teacher:
    """Create a second teacher profile."""
    teacher = Teacher(
        user_id=second_teacher_user.id,
        school_id=test_school.id,
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)
    return teacher


@pytest.fixture
def book_content(session: Session, content_teacher: Teacher) -> TeacherGeneratedContent:
    """Create a book-based generated content."""
    content = TeacherGeneratedContent(
        teacher_id=content_teacher.id,
        book_id=123,
        activity_type="ai_quiz",
        title="Test Book Quiz",
        content={"questions": [{"question": "Q1", "answer": "A1"}]},
    )
    session.add(content)
    session.commit()
    session.refresh(content)
    return content


@pytest.fixture
def material_content(
    session: Session, content_teacher: Teacher
) -> TeacherGeneratedContent:
    """Create a material-based generated content."""
    # Create a material first
    material = TeacherMaterial(
        teacher_id=content_teacher.id,
        name="Test Material",
        type="document",
        file_path="/test/path.pdf",
        file_size=1000,
    )
    session.add(material)
    session.commit()
    session.refresh(material)

    content = TeacherGeneratedContent(
        teacher_id=content_teacher.id,
        material_id=material.id,
        activity_type="vocabulary_quiz",
        title="Test Material Quiz",
        content={"questions": [{"word": "test", "definition": "a test"}]},
    )
    session.add(content)
    session.commit()
    session.refresh(content)
    return content


class TestListLibraryContent:
    """Tests for GET /api/v1/ai/library endpoint."""

    @pytest.mark.asyncio
    async def test_list_library_empty(self, client, content_teacher_token: str):
        """Test listing library when empty."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(
                f"{settings.API_V1_STR}/ai/library",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["items"], list)
        assert data["page"] == 1

    @pytest.mark.asyncio
    async def test_list_library_with_content(
        self,
       client,
        content_teacher_token: str,
        book_content: TeacherGeneratedContent,
        material_content: TeacherGeneratedContent,
    ):
        """Test listing library with content."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(
                f"{settings.API_V1_STR}/ai/library",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 2
        assert data["total"] >= 2

        # Check that both book and material content are returned
        titles = {item["title"] for item in data["items"]}
        assert "Test Book Quiz" in titles
        assert "Test Material Quiz" in titles

    @pytest.mark.asyncio
    async def test_list_library_filter_by_type(
        self,
        client,
        content_teacher_token: str,
        book_content: TeacherGeneratedContent,
        material_content: TeacherGeneratedContent,
    ):
        """Test filtering by activity type."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(
                f"{settings.API_V1_STR}/ai/library?activity_type=ai_quiz",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert all(item["activity_type"] == "ai_quiz" for item in data["items"])

    @pytest.mark.asyncio
    async def test_list_library_filter_by_source_type(
        self,
        client,
        content_teacher_token: str,
        book_content: TeacherGeneratedContent,
        material_content: TeacherGeneratedContent,
    ):
        """Test filtering by source type."""
        # Filter for book-based content
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(
                f"{settings.API_V1_STR}/ai/library?source_type=book",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert all(item["source_type"] == "book" for item in data["items"])

    @pytest.mark.asyncio
    async def test_list_library_filter_by_book_id(
        self, client, content_teacher_token: str, book_content: TeacherGeneratedContent
    ):
        """Test filtering by book ID."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(
                f"{settings.API_V1_STR}/ai/library?book_id=123",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert all(item["book_id"] == 123 for item in data["items"])

    @pytest.mark.asyncio
    async def test_list_library_pagination(
        self,
        client,
        session: Session,
        content_teacher_token: str,
        content_teacher: Teacher,
    ):
        """Test pagination."""
        # Create multiple content items
        for i in range(25):
            content = TeacherGeneratedContent(
                teacher_id=content_teacher.id,
                book_id=i,
                activity_type="ai_quiz",
                title=f"Quiz {i}",
                content={"questions": []},
            )
            session.add(content)
        session.commit()

        # Page 1
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(
                f"{settings.API_V1_STR}/ai/library?page=1&page_size=10",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10
        assert data["page"] == 1
        assert data["has_more"] is True

    @pytest.mark.asyncio
    async def test_list_library_isolation_material_content(
        self,
        client,
        session: Session,
        content_teacher_token: str,
        second_teacher: Teacher,
    ):
        """Test that teachers can't see each other's material-based content."""
        # Create material-based content for second teacher
        material = TeacherMaterial(
            teacher_id=second_teacher.id,
            name="Second Teacher Material",
            type="document",
            file_path="/test/path2.pdf",
            file_size=1000,
        )
        session.add(material)
        session.commit()
        session.refresh(material)

        content = TeacherGeneratedContent(
            teacher_id=second_teacher.id,
            material_id=material.id,
            activity_type="ai_quiz",
            title="Second Teacher Quiz",
            content={"questions": []},
        )
        session.add(content)
        session.commit()

        # First teacher should NOT see second teacher's material content
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(
                f"{settings.API_V1_STR}/ai/library",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        titles = {item["title"] for item in data["items"]}
        assert "Second Teacher Quiz" not in titles

    @pytest.mark.asyncio
    async def test_list_library_shared_book_content(
        self,
        client,
        session: Session,
        content_teacher_token: str,
        second_teacher: Teacher,
    ):
        """Test that book-based content is shared between teachers."""
        # Create book-based content for second teacher
        content = TeacherGeneratedContent(
            teacher_id=second_teacher.id,
            book_id=999,
            activity_type="ai_quiz",
            title="Shared Book Quiz",
            content={"questions": []},
        )
        session.add(content)
        session.commit()

        # First teacher SHOULD see second teacher's book content
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(
                f"{settings.API_V1_STR}/ai/library",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        titles = {item["title"] for item in data["items"]}
        assert "Shared Book Quiz" in titles

    @pytest.mark.asyncio
    async def test_list_library_requires_auth(self):
        """Test that endpoint requires authentication."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(f"{settings.API_V1_STR}/ai/library")
        assert response.status_code == 401


class TestGetLibraryContentDetail:
    """Tests for GET /api/v1/ai/library/{content_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_content_detail(
        self,
        client,
        content_teacher_token: str,
        book_content: TeacherGeneratedContent,
    ):
        """Test getting content details."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(
                f"{settings.API_V1_STR}/ai/library/{book_content.id}",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(book_content.id)
        assert data["title"] == "Test Book Quiz"
        assert "content" in data
        assert data["content"]["questions"][0]["question"] == "Q1"

    @pytest.mark.asyncio
    async def test_get_content_not_found(self, content_teacher_token: str):
        """Test getting non-existent content."""
        random_id = uuid.uuid4()
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(
                f"{settings.API_V1_STR}/ai/library/{random_id}",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_content_access_denied_material(
        self,
        client,
        session: Session,
        content_teacher_token: str,
        second_teacher: Teacher,
    ):
        """Test access denied for other teacher's material content."""
        # Create material-based content for second teacher
        material = TeacherMaterial(
            teacher_id=second_teacher.id,
            name="Private Material",
            type="document",
            file_path="/test/private.pdf",
            file_size=1000,
        )
        session.add(material)
        session.commit()
        session.refresh(material)

        content = TeacherGeneratedContent(
            teacher_id=second_teacher.id,
            material_id=material.id,
            activity_type="ai_quiz",
            title="Private Quiz",
            content={"questions": []},
        )
        session.add(content)
        session.commit()
        session.refresh(content)

        # First teacher tries to access second teacher's material content
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(
                f"{settings.API_V1_STR}/ai/library/{content.id}",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_content_access_allowed_book(
        self,
        client,
        session: Session,
        content_teacher_token: str,
        second_teacher: Teacher,
    ):
        """Test access allowed for shared book content."""
        # Create book-based content for second teacher
        content = TeacherGeneratedContent(
            teacher_id=second_teacher.id,
            book_id=777,
            activity_type="ai_quiz",
            title="Shared Quiz",
            content={"questions": [{"q": "test"}]},
        )
        session.add(content)
        session.commit()
        session.refresh(content)

        # First teacher can access second teacher's book content
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.get(
                f"{settings.API_V1_STR}/ai/library/{content.id}",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Shared Quiz"


class TestDeleteLibraryContent:
    """Tests for DELETE /api/v1/ai/library/{content_id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_content_success(
        self,
        client,
        session: Session,
        content_teacher_token: str,
        book_content: TeacherGeneratedContent,
    ):
        """Test successful content deletion."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.delete(
                f"{settings.API_V1_STR}/ai/library/{book_content.id}",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Content deleted successfully"
        assert data["content_id"] == str(book_content.id)

    @pytest.mark.asyncio
    async def test_delete_content_not_found(self, content_teacher_token: str):
        """Test deleting non-existent content."""
        random_id = uuid.uuid4()
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.delete(
                f"{settings.API_V1_STR}/ai/library/{random_id}",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_content_not_owner(
        self,
        client,
        session: Session,
        content_teacher_token: str,
        second_teacher: Teacher,
    ):
        """Test that only owner can delete content."""
        # Create content owned by second teacher
        content = TeacherGeneratedContent(
            teacher_id=second_teacher.id,
            book_id=888,
            activity_type="ai_quiz",
            title="Not My Content",
            content={"questions": []},
        )
        session.add(content)
        session.commit()
        session.refresh(content)

        # First teacher tries to delete second teacher's content
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.delete(
                f"{settings.API_V1_STR}/ai/library/{content.id}",
                headers={"Authorization": f"Bearer {content_teacher_token}"},
            )
        assert response.status_code == 403
        assert "Only the creator can delete" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_delete_content_requires_auth(
        self, book_content: TeacherGeneratedContent
    ):
        """Test that deletion requires authentication."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as async_client:
            response = await async_client.delete(
                f"{settings.API_V1_STR}/ai/library/{book_content.id}"
            )
        assert response.status_code == 401
