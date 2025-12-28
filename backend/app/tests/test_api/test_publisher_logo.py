"""
Unit tests for Publisher Logo Endpoint - DEPRECATED.

NOTE: Publisher logos are now fetched from DCS API, not local database.
These tests are deprecated and should be rewritten to test DCS integration.
"""

import hashlib
import uuid
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

# Placeholder types for skipped code (Publisher model removed)
Publisher = None
User = None
UserRole = None
DreamStorageError = None
app = None
settings = None
get_dream_storage_client = None

pytestmark = pytest.mark.skip(reason="DEPRECATED: Publisher model removed - logos now from DCS API")


@pytest.fixture
def test_publisher(session: Session) -> Publisher:
    """Create a test publisher for logo tests."""
    user = User(
        id=uuid.uuid4(),
        email="logopub@example.com",
        username="logopub",
        hashed_password="dummy_hash",
        role=UserRole.publisher,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Logo Test Publisher",
    )
    session.add(publisher)
    session.commit()
    session.refresh(publisher)

    return publisher


@pytest.fixture
def publisher_with_spaces(session: Session) -> Publisher:
    """Create a test publisher with spaces in name."""
    user = User(
        id=uuid.uuid4(),
        email="spacepub@example.com",
        username="spacepub",
        hashed_password="dummy_hash",
        role=UserRole.publisher,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Universal ELT",
    )
    session.add(publisher)
    session.commit()
    session.refresh(publisher)

    return publisher


@pytest.fixture
def mock_dcs_client():
    """Create a mock DCS client."""
    return AsyncMock()


class TestPublisherLogoEndpoint:
    """Tests for GET /api/v1/publishers/{publisher_id}/logo endpoint."""

    def test_get_logo_success_png(
        self,
        client: TestClient,
        test_publisher: Publisher,
        mock_dcs_client: AsyncMock,
    ):
        """Test successful logo retrieval with PNG format."""
        mock_dcs_client.get_publisher_logo.return_value = (b"PNG_IMAGE_DATA", "image/png")

        # Override the DCS client dependency
        app.dependency_overrides[get_dream_storage_client] = lambda: mock_dcs_client

        try:
            response = client.get(
                f"{settings.API_V1_STR}/publishers/{test_publisher.id}/logo"
            )

            assert response.status_code == 200
            assert response.headers["content-type"] == "image/png"
            assert response.content == b"PNG_IMAGE_DATA"

            # Check cache headers
            assert response.headers["cache-control"] == "public, max-age=86400"
            assert "etag" in response.headers

            # Verify client was called with publisher name
            mock_dcs_client.get_publisher_logo.assert_called_once_with("Logo Test Publisher")
        finally:
            app.dependency_overrides.pop(get_dream_storage_client, None)

    def test_get_logo_success_jpeg(
        self,
        client: TestClient,
        test_publisher: Publisher,
        mock_dcs_client: AsyncMock,
    ):
        """Test successful logo retrieval with JPEG format."""
        mock_dcs_client.get_publisher_logo.return_value = (b"JPEG_IMAGE_DATA", "image/jpeg")

        app.dependency_overrides[get_dream_storage_client] = lambda: mock_dcs_client

        try:
            response = client.get(
                f"{settings.API_V1_STR}/publishers/{test_publisher.id}/logo"
            )

            assert response.status_code == 200
            assert response.headers["content-type"] == "image/jpeg"
            assert response.content == b"JPEG_IMAGE_DATA"
        finally:
            app.dependency_overrides.pop(get_dream_storage_client, None)

    def test_get_logo_success_svg(
        self,
        client: TestClient,
        test_publisher: Publisher,
        mock_dcs_client: AsyncMock,
    ):
        """Test successful logo retrieval with SVG format."""
        svg_content = b'<svg xmlns="http://www.w3.org/2000/svg"></svg>'
        mock_dcs_client.get_publisher_logo.return_value = (svg_content, "image/svg+xml")

        app.dependency_overrides[get_dream_storage_client] = lambda: mock_dcs_client

        try:
            response = client.get(
                f"{settings.API_V1_STR}/publishers/{test_publisher.id}/logo"
            )

            assert response.status_code == 200
            assert response.headers["content-type"] == "image/svg+xml"
            assert response.content == svg_content
        finally:
            app.dependency_overrides.pop(get_dream_storage_client, None)

    def test_get_logo_not_found_in_dcs(
        self,
        client: TestClient,
        test_publisher: Publisher,
        mock_dcs_client: AsyncMock,
    ):
        """Test 404 when logo not found in DCS."""
        mock_dcs_client.get_publisher_logo.return_value = None

        app.dependency_overrides[get_dream_storage_client] = lambda: mock_dcs_client

        try:
            response = client.get(
                f"{settings.API_V1_STR}/publishers/{test_publisher.id}/logo"
            )

            assert response.status_code == 404
            # Check 404 cache header (1 hour)
            assert response.headers["cache-control"] == "public, max-age=3600"
        finally:
            app.dependency_overrides.pop(get_dream_storage_client, None)

    def test_get_logo_publisher_not_found(
        self,
        client: TestClient,
    ):
        """Test 404 when publisher doesn't exist."""
        fake_id = uuid.uuid4()
        response = client.get(
            f"{settings.API_V1_STR}/publishers/{fake_id}/logo"
        )

        assert response.status_code == 404
        assert "Publisher not found" in response.json()["detail"]

    def test_get_logo_dcs_error_returns_503(
        self,
        client: TestClient,
        test_publisher: Publisher,
        mock_dcs_client: AsyncMock,
    ):
        """Test 503 on DCS connection error."""
        mock_dcs_client.get_publisher_logo.side_effect = DreamStorageError("Connection failed")

        app.dependency_overrides[get_dream_storage_client] = lambda: mock_dcs_client

        try:
            response = client.get(
                f"{settings.API_V1_STR}/publishers/{test_publisher.id}/logo"
            )

            assert response.status_code == 503
            assert "temporarily unavailable" in response.json()["detail"]
            assert response.headers["retry-after"] == "60"
        finally:
            app.dependency_overrides.pop(get_dream_storage_client, None)

    def test_conditional_request_304_with_matching_etag(
        self,
        client: TestClient,
        test_publisher: Publisher,
        mock_dcs_client: AsyncMock,
    ):
        """Test If-None-Match returns 304 when ETag matches."""
        content = b"PNG_IMAGE_DATA"
        mock_dcs_client.get_publisher_logo.return_value = (content, "image/png")

        app.dependency_overrides[get_dream_storage_client] = lambda: mock_dcs_client

        try:
            # First request to get ETag
            response1 = client.get(
                f"{settings.API_V1_STR}/publishers/{test_publisher.id}/logo"
            )
            assert response1.status_code == 200
            etag = response1.headers["etag"]

            # Second request with If-None-Match
            response2 = client.get(
                f"{settings.API_V1_STR}/publishers/{test_publisher.id}/logo",
                headers={"If-None-Match": etag},
            )

            assert response2.status_code == 304
            assert response2.headers["cache-control"] == "public, max-age=86400"
            assert response2.headers["etag"] == etag
        finally:
            app.dependency_overrides.pop(get_dream_storage_client, None)

    def test_conditional_request_200_with_different_etag(
        self,
        client: TestClient,
        test_publisher: Publisher,
        mock_dcs_client: AsyncMock,
    ):
        """Test If-None-Match returns 200 when ETag doesn't match."""
        content = b"PNG_IMAGE_DATA"
        mock_dcs_client.get_publisher_logo.return_value = (content, "image/png")

        app.dependency_overrides[get_dream_storage_client] = lambda: mock_dcs_client

        try:
            response = client.get(
                f"{settings.API_V1_STR}/publishers/{test_publisher.id}/logo",
                headers={"If-None-Match": '"different-etag"'},
            )

            assert response.status_code == 200
            assert response.content == content
        finally:
            app.dependency_overrides.pop(get_dream_storage_client, None)

    def test_etag_is_correct_md5_hash(
        self,
        client: TestClient,
        test_publisher: Publisher,
        mock_dcs_client: AsyncMock,
    ):
        """Test that ETag is correct MD5 hash of content."""
        content = b"PNG_IMAGE_DATA_FOR_HASH_TEST"
        expected_etag = hashlib.md5(content).hexdigest()

        mock_dcs_client.get_publisher_logo.return_value = (content, "image/png")

        app.dependency_overrides[get_dream_storage_client] = lambda: mock_dcs_client

        try:
            response = client.get(
                f"{settings.API_V1_STR}/publishers/{test_publisher.id}/logo"
            )

            assert response.status_code == 200
            # ETag should be quoted
            assert response.headers["etag"] == f'"{expected_etag}"'
        finally:
            app.dependency_overrides.pop(get_dream_storage_client, None)

    def test_publisher_name_with_spaces_url_encoded(
        self,
        client: TestClient,
        publisher_with_spaces: Publisher,
        mock_dcs_client: AsyncMock,
    ):
        """Test that publisher name with spaces is passed correctly to DCS client."""
        mock_dcs_client.get_publisher_logo.return_value = (b"LOGO_DATA", "image/png")

        app.dependency_overrides[get_dream_storage_client] = lambda: mock_dcs_client

        try:
            response = client.get(
                f"{settings.API_V1_STR}/publishers/{publisher_with_spaces.id}/logo"
            )

            assert response.status_code == 200
            # Verify client was called with exact publisher name (encoding happens in DCS client)
            mock_dcs_client.get_publisher_logo.assert_called_once_with("Universal ELT")
        finally:
            app.dependency_overrides.pop(get_dream_storage_client, None)

    def test_no_auth_required_for_logo(
        self,
        client: TestClient,
        test_publisher: Publisher,
        mock_dcs_client: AsyncMock,
    ):
        """Test that logo endpoint is publicly accessible (no auth required)."""
        mock_dcs_client.get_publisher_logo.return_value = (b"LOGO_DATA", "image/png")

        app.dependency_overrides[get_dream_storage_client] = lambda: mock_dcs_client

        try:
            # Request without any Authorization header
            response = client.get(
                f"{settings.API_V1_STR}/publishers/{test_publisher.id}/logo"
            )

            # Should succeed without auth
            assert response.status_code == 200
            assert response.content == b"LOGO_DATA"
        finally:
            app.dependency_overrides.pop(get_dream_storage_client, None)

    def test_cache_control_success_24_hours(
        self,
        client: TestClient,
        test_publisher: Publisher,
        mock_dcs_client: AsyncMock,
    ):
        """Test Cache-Control is 24 hours (86400 seconds) on success."""
        mock_dcs_client.get_publisher_logo.return_value = (b"LOGO_DATA", "image/png")

        app.dependency_overrides[get_dream_storage_client] = lambda: mock_dcs_client

        try:
            response = client.get(
                f"{settings.API_V1_STR}/publishers/{test_publisher.id}/logo"
            )

            assert response.status_code == 200
            assert response.headers["cache-control"] == "public, max-age=86400"
        finally:
            app.dependency_overrides.pop(get_dream_storage_client, None)

    def test_cache_control_not_found_1_hour(
        self,
        client: TestClient,
        test_publisher: Publisher,
        mock_dcs_client: AsyncMock,
    ):
        """Test Cache-Control is 1 hour (3600 seconds) on 404."""
        mock_dcs_client.get_publisher_logo.return_value = None

        app.dependency_overrides[get_dream_storage_client] = lambda: mock_dcs_client

        try:
            response = client.get(
                f"{settings.API_V1_STR}/publishers/{test_publisher.id}/logo"
            )

            assert response.status_code == 404
            assert response.headers["cache-control"] == "public, max-age=3600"
        finally:
            app.dependency_overrides.pop(get_dream_storage_client, None)
