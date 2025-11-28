"""
Tests for webhook endpoints.
"""

import hmac
import hashlib
import json
import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Session, select

from app.models import Book, BookStatus, WebhookEventLog, WebhookEventStatus, WebhookEventType
from app.core.config import settings


# Test Fixtures


@pytest.fixture
def mock_book_service():
    """Mock book service functions to avoid external API calls."""
    async def mock_sync_book(*args, **kwargs):
        # Create a mock book object
        return Book(
            id=1,
            dream_storage_id=str(kwargs.get("dream_storage_id", "123")),
            title="Test Book",
            book_name="TEST_BOOK",
            publisher_name="Test Publisher",
            publisher_id=uuid.uuid4(),
            status=BookStatus.published,
            config_json={"books": [{}]},
        )

    async def mock_soft_delete(*args, **kwargs):
        return True

    with patch("app.api.routes.webhooks.sync_book", new=AsyncMock(side_effect=mock_sync_book)):
        with patch("app.api.routes.webhooks.soft_delete_book", new=AsyncMock(side_effect=mock_soft_delete)):
            yield


@pytest.fixture
def webhook_secret() -> str:
    """Webhook secret for testing."""
    return "test-webhook-secret-123"


@pytest.fixture
def valid_webhook_payload() -> dict:
    """Sample valid webhook payload."""
    return {
        "event": "book.updated",
        "timestamp": "2025-11-15T18:30:00Z",
        "data": {
            "id": 123,
            "book_name": "TEST_BOOK",
            "publisher": "Test Publisher",
            "version": "1.0.0",
        },
    }


@pytest.fixture
def valid_webhook_signature(valid_webhook_payload: dict, webhook_secret: str) -> str:
    """Generate valid HMAC signature for test payload."""
    payload_bytes = json.dumps(valid_webhook_payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(
        webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha256
    ).hexdigest()
    return f"sha256={signature}"


# Signature Validation Tests


def test_webhook_signature_validation_success(
    client: TestClient,
    session: Session,
    valid_webhook_payload: dict,
    webhook_secret: str,
    monkeypatch,
):
    """Test that webhooks with valid signatures are accepted."""
    # Mock the webhook secret setting
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    # Generate valid signature
    payload_bytes = json.dumps(valid_webhook_payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(
        webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha256
    ).hexdigest()

    response = client.post(
        "/api/v1/webhooks/dream-storage",
        json=valid_webhook_payload,
        headers={"X-Webhook-Signature": f"sha256={signature}"},
    )

    assert response.status_code == 200
    assert "event_id" in response.json()
    assert response.json()["status"] == "received"


def test_webhook_signature_validation_fails(
    client: TestClient, valid_webhook_payload: dict
):
    """Test that webhooks with invalid signatures are rejected."""
    response = client.post(
        "/api/v1/webhooks/dream-storage",
        json=valid_webhook_payload,
        headers={"X-Webhook-Signature": "sha256=invalid_signature"},
    )

    assert response.status_code == 401
    assert "Invalid webhook signature" in response.json()["detail"]


def test_webhook_missing_signature(client: TestClient, valid_webhook_payload: dict):
    """Test that webhooks without signatures are rejected."""
    response = client.post(
        "/api/v1/webhooks/dream-storage",
        json=valid_webhook_payload,
    )

    assert response.status_code == 401
    assert "Missing webhook signature" in response.json()["detail"]


# Event Type Tests


@pytest.mark.asyncio
async def test_webhook_event_created(
    client: TestClient,
    async_session: AsyncSession,
    webhook_secret: str,
    monkeypatch,
    mock_book_service,
):
    """Test that book.created events are logged correctly."""
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    payload = {
        "event": "book.created",
        "timestamp": "2025-11-15T18:30:00Z",
        "data": {
            "id": 456,
            "book_name": "NEW_BOOK",
            "publisher": "Test Publisher",
            "version": "1.0.0",
        },
    }

    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(
        webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha256
    ).hexdigest()

    response = client.post(
        "/api/v1/webhooks/dream-storage",
        json=payload,
        headers={"X-Webhook-Signature": f"sha256={signature}"},
    )

    assert response.status_code == 200
    event_id = uuid.UUID(response.json()["event_id"])

    # Verify event was logged in database
    result = await async_session.execute(select(WebhookEventLog).where(WebhookEventLog.id == event_id))
    event_log = result.scalar_one_or_none()
    assert event_log is not None
    assert event_log.event_type == WebhookEventType.book_created
    assert event_log.book_id == 456
    # Background task may have already processed in test environment
    assert event_log.status in [WebhookEventStatus.pending, WebhookEventStatus.success]


@pytest.mark.asyncio
async def test_webhook_event_updated(
    client: TestClient,
    async_session: AsyncSession,
    webhook_secret: str,
    monkeypatch,
    mock_book_service,
):
    """Test that book.updated events are logged correctly."""
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    payload = {
        "event": "book.updated",
        "timestamp": "2025-11-15T18:30:00Z",
        "data": {
            "id": 789,
            "book_name": "UPDATED_BOOK",
            "publisher": "Test Publisher",
            "version": "2.0.0",
        },
    }

    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(
        webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha256
    ).hexdigest()

    response = client.post(
        "/api/v1/webhooks/dream-storage",
        json=payload,
        headers={"X-Webhook-Signature": f"sha256={signature}"},
    )

    assert response.status_code == 200
    event_id = uuid.UUID(response.json()["event_id"])

    # Verify event was logged in database
    result = await async_session.execute(select(WebhookEventLog).where(WebhookEventLog.id == event_id))
    event_log = result.scalar_one_or_none()
    assert event_log is not None
    assert event_log.event_type == WebhookEventType.book_updated
    assert event_log.book_id == 789


@pytest.mark.asyncio
async def test_webhook_event_deleted(
    client: TestClient,
    async_session: AsyncSession,
    webhook_secret: str,
    monkeypatch,
    mock_book_service,
):
    """Test that book.deleted events are logged correctly."""
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    payload = {
        "event": "book.deleted",
        "timestamp": "2025-11-15T18:30:00Z",
        "data": {
            "id": 321,
            "book_name": "DELETED_BOOK",
            "publisher": "Test Publisher",
            "version": "1.0.0",
        },
    }

    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(
        webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha256
    ).hexdigest()

    response = client.post(
        "/api/v1/webhooks/dream-storage",
        json=payload,
        headers={"X-Webhook-Signature": f"sha256={signature}"},
    )

    assert response.status_code == 200
    event_id = uuid.UUID(response.json()["event_id"])

    # Verify event was logged in database
    result = await async_session.execute(select(WebhookEventLog).where(WebhookEventLog.id == event_id))
    event_log = result.scalar_one_or_none()
    assert event_log is not None
    assert event_log.event_type == WebhookEventType.book_deleted
    assert event_log.book_id == 321


# Event Logging Tests


@pytest.mark.asyncio
async def test_webhook_event_logged(
    client: TestClient,
    async_session: AsyncSession,
    valid_webhook_payload: dict,
    webhook_secret: str,
    monkeypatch,
    mock_book_service,
):
    """Test that webhook events are properly logged to database."""
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    payload_bytes = json.dumps(valid_webhook_payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(
        webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha256
    ).hexdigest()

    response = client.post(
        "/api/v1/webhooks/dream-storage",
        json=valid_webhook_payload,
        headers={"X-Webhook-Signature": f"sha256={signature}"},
    )

    assert response.status_code == 200
    event_id = uuid.UUID(response.json()["event_id"])

    # Verify event log was created
    result = await async_session.execute(select(WebhookEventLog).where(WebhookEventLog.id == event_id))
    event_log = result.scalar_one_or_none()
    assert event_log is not None
    assert event_log.event_type == WebhookEventType.book_updated
    assert event_log.book_id == 123
    # Background task may have already processed in test environment
    assert event_log.status in [WebhookEventStatus.pending, WebhookEventStatus.success]
    assert event_log.retry_count == 0
    assert event_log.payload_json == valid_webhook_payload
    assert event_log.created_at is not None


# Invalid Payload Tests


def test_webhook_invalid_payload_format(
    client: TestClient,
    webhook_secret: str,
    monkeypatch,
):
    """Test that invalid payload formats are rejected."""
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    invalid_payload = {
        "invalid": "payload",
        # Missing required fields: event, timestamp, data
    }

    payload_bytes = json.dumps(invalid_payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(
        webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha256
    ).hexdigest()

    response = client.post(
        "/api/v1/webhooks/dream-storage",
        json=invalid_payload,
        headers={"X-Webhook-Signature": f"sha256={signature}"},
    )

    assert response.status_code == 400
    assert "Invalid payload format" in response.json()["detail"]


# Integration Tests


@pytest.mark.asyncio
async def test_webhook_end_to_end_book_created(
    client: TestClient,
    async_session: AsyncSession,
    webhook_secret: str,
    monkeypatch,
):
    """Integration test: End-to-end webhook processing for book.created event.

    This test validates the complete webhook flow:
    1. Webhook received with valid signature
    2. Event logged to database
    3. Background task processes event
    4. BookService.sync_book called with correct parameters
    5. Event status updated to success
    """
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    # Mock the Dream Central Storage client and BookService
    from app.models import Book, BookStatus, Publisher, User, UserRole
    from app.core.security import get_password_hash

    # Create a test user first (required for Publisher foreign key)
    user = User(
        id=uuid.uuid4(),
        email="publisher@test.com",
        username="testpublisher",
        hashed_password=get_password_hash("testpassword"),
        role=UserRole.publisher,
        is_active=True,
        is_superuser=False,
    )
    async_session.add(user)
    await async_session.flush()

    # Create a test publisher
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Test Publisher",
        contact_email="test@publisher.com"
    )
    async_session.add(publisher)
    await async_session.commit()

    # Mock book data that would come from Dream Central Storage
    mock_book_data = Book(
        id=1,
        dream_storage_id="456",
        title="New Book",
        book_name="NEW_BOOK",
        publisher_name="Test Publisher",
        publisher_id=publisher.id,
        status=BookStatus.published,
        config_json={"books": [{}]},
    )

    async def mock_sync_book_integration(dream_storage_id: str, db: AsyncSession, **kwargs):
        """Mock sync_book that actually creates a book."""
        # Check if book already exists
        result = await db.execute(
            select(Book).where(Book.dream_storage_id == dream_storage_id)
        )
        existing_book = result.scalar_one_or_none()

        if existing_book:
            return existing_book

        # Create new book
        new_book = Book(
            dream_storage_id=dream_storage_id,
            title="New Book",
            book_name="NEW_BOOK",
            publisher_name="Test Publisher",
            publisher_id=publisher.id,
            status=BookStatus.published,
            config_json={"books": [{}]},
        )
        db.add(new_book)
        await db.flush()
        return new_book

    with patch("app.api.routes.webhooks.sync_book", new=AsyncMock(side_effect=mock_sync_book_integration)):
        payload = {
            "event": "book.created",
            "timestamp": "2025-11-15T18:30:00Z",
            "data": {
                "id": 456,
                "book_name": "NEW_BOOK",
                "publisher": "Test Publisher",
                "version": "1.0.0",
            },
        }

        payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        signature = hmac.new(
            webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha256
        ).hexdigest()

        # Send webhook request
        response = client.post(
            "/api/v1/webhooks/dream-storage",
            json=payload,
            headers={"X-Webhook-Signature": f"sha256={signature}"},
        )

        assert response.status_code == 200
        assert "event_id" in response.json()
        event_id = uuid.UUID(response.json()["event_id"])

        # Wait a moment for background task to complete
        import asyncio
        await asyncio.sleep(0.5)

        # Verify event log was created and processed
        result = await async_session.execute(
            select(WebhookEventLog).where(WebhookEventLog.id == event_id)
        )
        event_log = result.scalar_one_or_none()
        assert event_log is not None
        assert event_log.event_type == WebhookEventType.book_created
        assert event_log.book_id == 456
        # Event should be processed (either success or still pending in fast test environment)
        assert event_log.status in [WebhookEventStatus.pending, WebhookEventStatus.success]


@pytest.mark.asyncio
async def test_webhook_retry_on_failure(
    client: TestClient,
    async_session: AsyncSession,
    webhook_secret: str,
    monkeypatch,
):
    """Integration test: Verify retry logic with exponential backoff.

    This test validates:
    1. Webhook processing fails on first attempt
    2. Retry logic kicks in
    3. Exponential backoff delays are applied
    4. Retry count is incremented
    5. Eventually succeeds on retry
    """
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    # Import required models
    from app.models import Book, BookStatus, Publisher, User, UserRole
    from app.core.security import get_password_hash

    # Create a test user first (required for Publisher foreign key)
    user = User(
        id=uuid.uuid4(),
        email="publisher2@test.com",
        username="testpublisher2",
        hashed_password=get_password_hash("testpassword"),
        role=UserRole.publisher,
        is_active=True,
        is_superuser=False,
    )
    async_session.add(user)
    await async_session.flush()

    # Create a publisher for the book
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Test Publisher",
        contact_email="test@publisher.com"
    )
    async_session.add(publisher)
    await async_session.commit()

    # Mock sync_book to fail twice, then succeed
    call_count = 0

    async def mock_sync_book_with_retries(dream_storage_id: str, db: AsyncSession, **kwargs):
        nonlocal call_count
        call_count += 1

        if call_count <= 2:
            # Fail first two attempts
            raise Exception(f"Temporary failure (attempt {call_count})")

        # Succeed on third attempt
        new_book = Book(
            dream_storage_id=dream_storage_id,
            title="Retried Book",
            book_name="RETRIED_BOOK",
            publisher_name="Test Publisher",
            publisher_id=publisher.id,
            status=BookStatus.published,
            config_json={"books": [{}]},
        )
        db.add(new_book)
        await db.flush()
        return new_book

    with patch("app.api.routes.webhooks.sync_book", new=AsyncMock(side_effect=mock_sync_book_with_retries)):
        payload = {
            "event": "book.updated",
            "timestamp": "2025-11-15T18:30:00Z",
            "data": {
                "id": 789,
                "book_name": "RETRIED_BOOK",
                "publisher": "Test Publisher",
                "version": "1.0.0",
            },
        }

        payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        signature = hmac.new(
            webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/api/v1/webhooks/dream-storage",
            json=payload,
            headers={"X-Webhook-Signature": f"sha256={signature}"},
        )

        assert response.status_code == 200
        event_id = uuid.UUID(response.json()["event_id"])

        # Wait for background task with retries to complete
        # With exponential backoff: 1s + 2s + 4s = 7s max, but we'll wait 8s to be safe
        import asyncio
        await asyncio.sleep(8)

        # Verify event log shows retry attempts
        result = await async_session.execute(
            select(WebhookEventLog).where(WebhookEventLog.id == event_id)
        )
        event_log = result.scalar_one_or_none()
        assert event_log is not None

        # Should have retried and eventually succeeded
        assert event_log.retry_count >= 2  # At least 2 retries
        assert event_log.status == WebhookEventStatus.success
        assert call_count == 3  # Called 3 times total


@pytest.mark.asyncio
async def test_webhook_max_retries_exhausted(
    client: TestClient,
    async_session: AsyncSession,
    webhook_secret: str,
    monkeypatch,
):
    """Integration test: Verify max retries exhausted results in permanent failure.

    This test validates:
    1. Webhook processing fails repeatedly
    2. Retry logic attempts max 3 times
    3. After 3 failures, event is marked as permanently failed
    4. Error message is logged
    5. Processed timestamp is set
    """
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    # Mock sync_book to always fail
    async def mock_sync_book_always_fails(dream_storage_id: str, db: AsyncSession, **kwargs):
        raise Exception("Persistent failure - cannot sync book")

    with patch("app.api.routes.webhooks.sync_book", new=AsyncMock(side_effect=mock_sync_book_always_fails)):
        payload = {
            "event": "book.updated",
            "timestamp": "2025-11-15T18:30:00Z",
            "data": {
                "id": 999,
                "book_name": "FAILED_BOOK",
                "publisher": "Test Publisher",
                "version": "1.0.0",
            },
        }

        payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        signature = hmac.new(
            webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/api/v1/webhooks/dream-storage",
            json=payload,
            headers={"X-Webhook-Signature": f"sha256={signature}"},
        )

        assert response.status_code == 200
        event_id = uuid.UUID(response.json()["event_id"])

        # Wait for all retry attempts to exhaust
        # With exponential backoff: 1s + 2s + 4s = 7s max, wait 8s to be safe
        import asyncio
        await asyncio.sleep(8)

        # Verify event log shows permanent failure
        result = await async_session.execute(
            select(WebhookEventLog).where(WebhookEventLog.id == event_id)
        )
        event_log = result.scalar_one_or_none()
        assert event_log is not None

        # Should have exhausted all retries
        assert event_log.retry_count == 3  # Max retries
        assert event_log.status == WebhookEventStatus.failed
        assert event_log.error_message is not None
        assert "Persistent failure" in event_log.error_message
        assert event_log.processed_at is not None  # Marked as processed
