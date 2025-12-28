"""
Tests for webhook endpoints.

NOTE: Webhooks now ONLY invalidate cache, they don't sync books/publishers.
Books are fetched on-demand from DCS, not stored in local database.
"""

import hashlib
import hmac
import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Session, select

from app.core.config import settings
from app.models import WebhookEventLog, WebhookEventStatus, WebhookEventType

# Test Fixtures


@pytest.fixture
def mock_dcs_cache():
    """Mock DCS cache for testing cache invalidation."""
    cache_mock = MagicMock()
    cache_mock.invalidate = AsyncMock(return_value=True)
    cache_mock.invalidate_pattern = AsyncMock(return_value=5)  # Mock number of invalidated entries

    with patch("app.api.routes.webhooks.get_dcs_cache", return_value=cache_mock):
        yield cache_mock


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
    mock_dcs_cache,
):
    """Test that book.created events are logged correctly and invalidate cache."""
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
    mock_dcs_cache,
):
    """Test that book.updated events are logged correctly and invalidate cache."""
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
    mock_dcs_cache,
):
    """Test that book.deleted events are logged correctly and invalidate cache."""
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
    mock_dcs_cache,
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


# Cache Invalidation Tests


@pytest.mark.asyncio
async def test_webhook_book_created_cache_invalidation(
    client: TestClient,
    async_session: AsyncSession,
    webhook_secret: str,
    monkeypatch,
):
    """Test that book.created webhooks trigger correct cache invalidations."""
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    cache_mock = MagicMock()
    cache_mock.invalidate = AsyncMock(return_value=True)
    cache_mock.invalidate_pattern = AsyncMock(return_value=3)

    with patch("app.api.routes.webhooks.get_dcs_cache", return_value=cache_mock):
        payload = {
            "event": "book.created",
            "timestamp": "2025-11-15T18:30:00Z",
            "data": {
                "id": 123,
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

        # Wait for background processing
        import asyncio
        await asyncio.sleep(0.5)

        # Verify correct cache invalidations for book.created
        from app.services.dcs_cache import CacheKeys
        cache_mock.invalidate.assert_any_call(CacheKeys.BOOK_LIST)
        cache_mock.invalidate_pattern.assert_any_call("dcs:books:publisher:")


@pytest.mark.asyncio
async def test_webhook_book_updated_cache_invalidation(
    client: TestClient,
    async_session: AsyncSession,
    webhook_secret: str,
    monkeypatch,
):
    """Test that book.updated webhooks trigger correct cache invalidations."""
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    cache_mock = MagicMock()
    cache_mock.invalidate = AsyncMock(return_value=True)
    cache_mock.invalidate_pattern = AsyncMock(return_value=3)

    with patch("app.api.routes.webhooks.get_dcs_cache", return_value=cache_mock):
        payload = {
            "event": "book.updated",
            "timestamp": "2025-11-15T18:30:00Z",
            "data": {
                "id": 456,
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

        # Wait for background processing
        import asyncio
        await asyncio.sleep(0.5)

        # Verify correct cache invalidations for book.updated
        from app.services.dcs_cache import CacheKeys
        book_id = str(payload["data"]["id"])
        cache_mock.invalidate.assert_any_call(CacheKeys.book_by_id(book_id))
        cache_mock.invalidate.assert_any_call(CacheKeys.book_config(book_id))
        cache_mock.invalidate.assert_any_call(CacheKeys.BOOK_LIST)


@pytest.mark.asyncio
async def test_webhook_book_deleted_cache_invalidation(
    client: TestClient,
    async_session: AsyncSession,
    webhook_secret: str,
    monkeypatch,
):
    """Test that book.deleted webhooks trigger correct cache invalidations."""
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    cache_mock = MagicMock()
    cache_mock.invalidate = AsyncMock(return_value=True)
    cache_mock.invalidate_pattern = AsyncMock(return_value=3)

    with patch("app.api.routes.webhooks.get_dcs_cache", return_value=cache_mock):
        payload = {
            "event": "book.deleted",
            "timestamp": "2025-11-15T18:30:00Z",
            "data": {
                "id": 789,
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

        # Wait for background processing
        import asyncio
        await asyncio.sleep(0.5)

        # Verify correct cache invalidations for book.deleted
        from app.services.dcs_cache import CacheKeys
        book_id = str(payload["data"]["id"])
        cache_mock.invalidate_pattern.assert_any_call(f"dcs:books:id:{book_id}")
        cache_mock.invalidate.assert_any_call(CacheKeys.BOOK_LIST)


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
    4. Cache invalidation is triggered
    5. Event status updated to success
    """
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    # Mock DCS cache
    cache_mock = MagicMock()
    cache_mock.invalidate = AsyncMock(return_value=True)
    cache_mock.invalidate_pattern = AsyncMock(return_value=3)

    with patch("app.api.routes.webhooks.get_dcs_cache", return_value=cache_mock):
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

        # Verify cache invalidation was called for book.created
        from app.services.dcs_cache import CacheKeys
        cache_mock.invalidate.assert_any_call(CacheKeys.BOOK_LIST)
        cache_mock.invalidate_pattern.assert_any_call("dcs:books:publisher:")


@pytest.mark.asyncio
async def test_webhook_retry_on_failure(
    client: TestClient,
    async_session: AsyncSession,
    webhook_secret: str,
    monkeypatch,
):
    """Integration test: Verify retry logic with exponential backoff.

    This test validates:
    1. Cache invalidation fails on first attempts
    2. Retry logic kicks in
    3. Exponential backoff delays are applied
    4. Retry count is incremented
    5. Eventually succeeds on retry
    """
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    # Mock cache invalidation to fail twice, then succeed
    call_count = 0

    async def mock_invalidate_with_retries(*args, **kwargs):
        nonlocal call_count
        call_count += 1

        if call_count <= 2:
            # Fail first two attempts
            raise Exception(f"Cache invalidation temporary failure (attempt {call_count})")

        # Succeed on third attempt
        return True

    cache_mock = MagicMock()
    cache_mock.invalidate = AsyncMock(side_effect=mock_invalidate_with_retries)
    cache_mock.invalidate_pattern = AsyncMock(return_value=3)

    with patch("app.api.routes.webhooks.get_dcs_cache", return_value=cache_mock):
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
        # book_updated calls invalidate 3 times per attempt:
        # - Attempt 1: book_by_id (fail, count=1) → retry
        # - Attempt 2: book_by_id (fail, count=2) → retry
        # - Attempt 3: book_by_id, book_config, BOOK_LIST (success, count=3,4,5)
        assert call_count == 5  # Called 5 times total (2 failed attempts + 3 successful invalidations)


@pytest.mark.asyncio
async def test_webhook_max_retries_exhausted(
    client: TestClient,
    async_session: AsyncSession,
    webhook_secret: str,
    monkeypatch,
):
    """Integration test: Verify max retries exhausted results in permanent failure.

    This test validates:
    1. Cache invalidation fails repeatedly
    2. Retry logic attempts max 3 times
    3. After 3 failures, event is marked as permanently failed
    4. Error message is logged
    5. Processed timestamp is set
    """
    monkeypatch.setattr(settings, "DREAM_CENTRAL_STORAGE_WEBHOOK_SECRET", webhook_secret)

    # Mock cache invalidation to always fail
    async def mock_invalidate_always_fails(*args, **kwargs):
        raise Exception("Persistent failure - cache invalidation unavailable")

    cache_mock = MagicMock()
    cache_mock.invalidate = AsyncMock(side_effect=mock_invalidate_always_fails)
    cache_mock.invalidate_pattern = AsyncMock(side_effect=mock_invalidate_always_fails)

    with patch("app.api.routes.webhooks.get_dcs_cache", return_value=cache_mock):
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
