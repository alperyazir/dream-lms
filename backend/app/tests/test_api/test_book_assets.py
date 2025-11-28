"""
Unit tests for Book Asset Proxy Routes.

Tests cover:
- Authorization (publisher-based access control)
- Security (path traversal prevention)
- Asset serving (streaming, content-type, caching)
- Error handling (404, 403, 500)
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.security import create_access_token
from app.models import (
    Book,
    BookAccess,
    BookStatus,
    Publisher,
    School,
    Teacher,
    User,
    UserRole,
)
from app.services.dream_storage_client import (
    DreamStorageError,
    DreamStorageNotFoundError,
)

# Fixtures


@pytest.fixture
def test_publisher(session: Session) -> Publisher:
    """Create a test publisher for asset serving tests."""
    # Create publisher user first
    user = User(
        id=uuid.uuid4(),
        email="assetpub@example.com",
        username="assetpub",
        hashed_password="dummy_hash",
        role=UserRole.publisher,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Create publisher record
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Asset Test Publisher",
        domain="assettest.com",
    )
    session.add(publisher)
    session.commit()
    session.refresh(publisher)

    return publisher


@pytest.fixture
def sample_book(session: Session, test_publisher: Publisher) -> Book:
    """Create a sample book for testing."""
    book = Book(
        id=uuid.uuid4(),
        dream_storage_id="test-book-1",
        title="Test Asset Book",
        description="A test book for asset serving",
        publisher_name="Asset Test Publisher",
        publisher_id=test_publisher.id,
        book_name="TestBook1",
        status=BookStatus.published,
        config_json={"books": [{"modules": [{"name": "Module 1", "pages": ["1", "2", "3"]}]}]},
    )
    session.add(book)
    session.commit()
    session.refresh(book)

    return book


@pytest.fixture
def book_access(session: Session, sample_book: Book, test_publisher: Publisher) -> BookAccess:
    """Grant publisher access to the book."""
    access = BookAccess(
        book_id=sample_book.id,
        publisher_id=test_publisher.id,
        granted_at=datetime.now(timezone.utc),
    )
    session.add(access)
    session.commit()
    session.refresh(access)

    return access


@pytest.fixture
def teacher_user(session: Session, test_publisher: Publisher) -> User:
    """Create a teacher user linked to the test publisher through a school."""
    # Create user
    user = User(
        id=uuid.uuid4(),
        email="assetteacher@example.com",
        username="assetteacher",
        hashed_password="dummy_hash",
        role=UserRole.teacher,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Create school linked to publisher
    school = School(
        id=uuid.uuid4(),
        name="Test School",
        publisher_id=test_publisher.id,
    )
    session.add(school)
    session.commit()
    session.refresh(school)

    # Create teacher record linking user to school
    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=user.id,
        school_id=school.id,
    )
    session.add(teacher)
    session.commit()
    session.refresh(teacher)

    return user


# Authorization Tests


def test_serve_asset_success_with_authorization(
    client: TestClient,
    sample_book: Book,
    book_access: BookAccess,
    teacher_user: User,
):
    """Test successful asset fetch for authorized user."""
    # Mock DreamCentralStorageClient
    mock_client = AsyncMock()
    mock_client.download_asset.return_value = b"fake_image_data"

    with patch(
        "app.api.routes.book_assets.get_dream_storage_client",
        return_value=mock_client,
    ):
        # Create auth token for teacher
        token = create_access_token(
            subject=str(teacher_user.id), expires_delta=timedelta(hours=1)
        )

        response = client.get(
            f"/api/v1/books/{sample_book.id}/assets/images/M1/7.png",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Assert
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert response.headers["Cache-Control"] == "max-age=86400"
        assert response.content == b"fake_image_data"

        # Verify client was called with correct params
        mock_client.download_asset.assert_called_once_with(
            publisher="Asset Test Publisher",
            book_name="TestBook1",
            asset_path="images/M1/7.png",
        )


def test_serve_asset_forbidden_without_book_access(
    client: TestClient,
    sample_book: Book,
    session: Session,
    test_publisher: Publisher,
):
    """Test that user without BookAccess cannot fetch assets."""
    # Create a different publisher
    other_user = User(
        id=uuid.uuid4(),
        email="otherpub@example.com",
        username="otherpub",
        hashed_password="dummy_hash",
        role=UserRole.publisher,
        is_active=True,
    )
    session.add(other_user)
    session.commit()

    other_publisher = Publisher(
        id=uuid.uuid4(),
        user_id=other_user.id,
        name="Other Publisher",
        domain="other.com",
    )
    session.add(other_publisher)
    session.commit()

    # Create teacher user
    unauthorized_teacher = User(
        id=uuid.uuid4(),
        email="unauthorized@example.com",
        username="unauthorized",
        hashed_password="dummy_hash",
        role=UserRole.teacher,
        is_active=True,
    )
    session.add(unauthorized_teacher)
    session.commit()

    # Create school for other publisher
    other_school = School(
        id=uuid.uuid4(),
        name="Other School",
        publisher_id=other_publisher.id,
    )
    session.add(other_school)
    session.commit()

    # Create teacher record linking to other publisher's school
    other_teacher = Teacher(
        id=uuid.uuid4(),
        user_id=unauthorized_teacher.id,
        school_id=other_school.id,
    )
    session.add(other_teacher)
    session.commit()

    token = create_access_token(
        subject=str(unauthorized_teacher.id), expires_delta=timedelta(hours=1)
    )

    response = client.get(
        f"/api/v1/books/{sample_book.id}/assets/images/M1/7.png",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert "You do not have access to this book" in response.json()["detail"]


def test_serve_asset_requires_authentication(client: TestClient, sample_book: Book):
    """Test that unauthenticated requests are rejected."""
    response = client.get(f"/api/v1/books/{sample_book.id}/assets/images/M1/7.png")

    assert response.status_code == 401


def test_admin_can_access_any_book_asset(
    client: TestClient,
    sample_book: Book,
    session: Session,
):
    """Test that admin users can access any book without BookAccess."""
    # Create admin user
    admin = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        username="admin",
        hashed_password="dummy_hash",
        role=UserRole.admin,
        is_active=True,
        is_superuser=True,
    )
    session.add(admin)
    session.commit()

    mock_client = AsyncMock()
    mock_client.download_asset.return_value = b"admin_asset_data"

    with patch(
        "app.api.routes.book_assets.get_dream_storage_client",
        return_value=mock_client,
    ):
        token = create_access_token(
            subject=str(admin.id), expires_delta=timedelta(hours=1)
        )

        response = client.get(
            f"/api/v1/books/{sample_book.id}/assets/images/M1/1.png",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.content == b"admin_asset_data"


# Security Tests


def test_path_traversal_blocked_double_dots(
    client: TestClient,  # noqa: ARG001 - Unused but required by pytest fixtures
    sample_book: Book,  # noqa: ARG001 - Unused but required by pytest fixtures
    book_access: BookAccess,  # noqa: ARG001 - Unused but required by pytest fixtures
    teacher_user: User,  # noqa: ARG001 - Unused but required by pytest fixtures
):
    """Test that path traversal with .. is blocked.

    Note: FastAPI normalizes paths before they reach our validation function,
    providing defense-in-depth. Our validation catches any .. that might bypass
    framework-level normalization.
    """
    # Test our validation function directly by calling it
    import pytest as pytest_module

    from app.api.routes.book_assets import _validate_asset_path

    # Should raise HTTPException for paths with ..
    with pytest_module.raises(Exception) as exc_info:
        _validate_asset_path("images/../config/secret.txt")

    assert exc_info.value.status_code == 400
    assert "path traversal not allowed" in str(exc_info.value.detail)


def test_absolute_path_blocked(
    client: TestClient,
    sample_book: Book,
    book_access: BookAccess,
    teacher_user: User,
):
    """Test that absolute paths are blocked."""
    token = create_access_token(
        subject=str(teacher_user.id), expires_delta=timedelta(hours=1)
    )

    response = client.get(
        f"/api/v1/books/{sample_book.id}/assets//etc/passwd",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert "absolute paths not allowed" in response.json()["detail"]


def test_null_byte_injection_blocked(
    client: TestClient,
    sample_book: Book,
    book_access: BookAccess,
    teacher_user: User,
):
    """Test that null byte injection is blocked."""
    token = create_access_token(
        subject=str(teacher_user.id), expires_delta=timedelta(hours=1)
    )

    response = client.get(
        f"/api/v1/books/{sample_book.id}/assets/image.png%00.txt",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert "null bytes not allowed" in response.json()["detail"]


def test_invalid_characters_blocked(
    client: TestClient,
    sample_book: Book,
    book_access: BookAccess,
    teacher_user: User,
):
    """Test that invalid characters are blocked."""
    token = create_access_token(
        subject=str(teacher_user.id), expires_delta=timedelta(hours=1)
    )

    response = client.get(
        f"/api/v1/books/{sample_book.id}/assets/image;rm -rf.png",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert "invalid characters" in response.json()["detail"]


# Error Handling Tests


def test_asset_not_found_returns_404(
    client: TestClient,
    sample_book: Book,
    book_access: BookAccess,
    teacher_user: User,
):
    """Test that missing assets return 404."""
    mock_client = AsyncMock()
    mock_client.download_asset.side_effect = DreamStorageNotFoundError("Asset not found")

    with patch(
        "app.api.routes.book_assets.get_dream_storage_client",
        return_value=mock_client,
    ):
        token = create_access_token(
            subject=str(teacher_user.id), expires_delta=timedelta(hours=1)
        )

        response = client.get(
            f"/api/v1/books/{sample_book.id}/assets/images/nonexistent.png",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
        assert "Asset not found" in response.json()["detail"]


def test_book_not_found_returns_404(
    client: TestClient,
    teacher_user: User,
):
    """Test that non-existent book returns 404."""
    token = create_access_token(
        subject=str(teacher_user.id), expires_delta=timedelta(hours=1)
    )

    fake_book_id = uuid.uuid4()
    response = client.get(
        f"/api/v1/books/{fake_book_id}/assets/images/M1/1.png",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    assert "Book not found" in response.json()["detail"]


def test_dream_storage_error_returns_500(
    client: TestClient,
    sample_book: Book,
    book_access: BookAccess,
    teacher_user: User,
):
    """Test that Dream Central Storage errors return 500."""
    mock_client = AsyncMock()
    mock_client.download_asset.side_effect = DreamStorageError("Connection failed")

    with patch(
        "app.api.routes.book_assets.get_dream_storage_client",
        return_value=mock_client,
    ):
        token = create_access_token(
            subject=str(teacher_user.id), expires_delta=timedelta(hours=1)
        )

        response = client.get(
            f"/api/v1/books/{sample_book.id}/assets/images/M1/1.png",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 500
        assert "Failed to fetch asset from storage" in response.json()["detail"]


# Content-Type Detection Tests


def test_content_type_detection_png(
    client: TestClient,
    sample_book: Book,
    book_access: BookAccess,
    teacher_user: User,
):
    """Test that PNG images get correct content-type."""
    mock_client = AsyncMock()
    mock_client.download_asset.return_value = b"fake_png_data"

    with patch(
        "app.api.routes.book_assets.get_dream_storage_client",
        return_value=mock_client,
    ):
        token = create_access_token(
            subject=str(teacher_user.id), expires_delta=timedelta(hours=1)
        )

        response = client.get(
            f"/api/v1/books/{sample_book.id}/assets/images/M1/7.png",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"


def test_content_type_detection_jpg(
    client: TestClient,
    sample_book: Book,
    book_access: BookAccess,
    teacher_user: User,
):
    """Test that JPEG images get correct content-type."""
    mock_client = AsyncMock()
    mock_client.download_asset.return_value = b"fake_jpg_data"

    with patch(
        "app.api.routes.book_assets.get_dream_storage_client",
        return_value=mock_client,
    ):
        token = create_access_token(
            subject=str(teacher_user.id), expires_delta=timedelta(hours=1)
        )

        response = client.get(
            f"/api/v1/books/{sample_book.id}/assets/images/M1/p7m5.jpg",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "image/jpeg"


def test_content_type_detection_mp3(
    client: TestClient,
    sample_book: Book,
    book_access: BookAccess,
    teacher_user: User,
):
    """Test that MP3 audio gets correct content-type."""
    mock_client = AsyncMock()
    mock_client.download_asset.return_value = b"fake_mp3_data"

    with patch(
        "app.api.routes.book_assets.get_dream_storage_client",
        return_value=mock_client,
    ):
        token = create_access_token(
            subject=str(teacher_user.id), expires_delta=timedelta(hours=1)
        )

        response = client.get(
            f"/api/v1/books/{sample_book.id}/assets/audio/6a.mp3",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/mpeg"


# Page Image Endpoint Tests


def test_page_image_endpoint_success(
    client: TestClient,
    sample_book: Book,
    book_access: BookAccess,
    teacher_user: User,
):
    """Test page image convenience endpoint."""
    mock_client = AsyncMock()
    mock_client.download_asset.return_value = b"page_image"

    with patch(
        "app.api.routes.book_assets.get_dream_storage_client",
        return_value=mock_client,
    ):
        token = create_access_token(
            subject=str(teacher_user.id), expires_delta=timedelta(hours=1)
        )

        response = client.get(
            f"/api/v1/books/{sample_book.id}/page-image/7",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.content == b"page_image"

        # Verify it constructs the correct path
        mock_client.download_asset.assert_called_once_with(
            publisher="Asset Test Publisher",
            book_name="TestBook1",
            asset_path="images/M1/7.png",
        )


def test_page_image_endpoint_validates_page_number(
    client: TestClient,
    sample_book: Book,
    book_access: BookAccess,
    teacher_user: User,
):
    """Test page image endpoint rejects invalid page numbers."""
    token = create_access_token(
        subject=str(teacher_user.id), expires_delta=timedelta(hours=1)
    )

    # Page number must be >= 1
    response = client.get(
        f"/api/v1/books/{sample_book.id}/page-image/0",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422  # Validation error
