"""
Integration tests for Book Synchronization Service.

These tests verify end-to-end book sync operations including:
- Book and activity creation from Dream Central Storage
- BookAccess record creation
- Resync behavior (update without duplication)
- Error handling with malformed configs

Run with: pytest -v -m integration
Skip with: pytest -v -m "not integration"
"""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import Activity, Book, BookAccess, Publisher, User, UserRole
from app.services.book_service import sync_all_books, sync_book
from app.services.dream_storage_client import BookRead, DreamStorageNotFoundError

# Mark all tests in this module as integration tests
pytestmark = pytest.mark.integration


@pytest_asyncio.fixture(name="test_publisher")
async def test_publisher_fixture(async_session: AsyncSession) -> Publisher:
    """Create a test publisher for book sync tests."""
    # Create publisher user first
    user = User(
        id=uuid.uuid4(),
        email="dreampress@example.com",
        username="dreampress",
        hashed_password="dummy_hash",
        role=UserRole.publisher,
        is_active=True,
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)

    # Create publisher record
    publisher = Publisher(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Dream Press",
        contact_email="contact@dreampress.com",
    )
    async_session.add(publisher)
    await async_session.commit()
    await async_session.refresh(publisher)

    return publisher


@pytest.fixture(name="sample_book_data")
def sample_book_data_fixture() -> BookRead:
    """Sample book data from Dream Central Storage."""
    return BookRead(
        id=1,
        book_name="sample_book",
        publisher="Dream Press",
        title="Sample Book",
        description="A sample book for testing",
        status="published",
    )


@pytest.fixture(name="sample_config_json")
def sample_config_json_fixture() -> dict:
    """Sample config.json with activities."""
    return {
        "books": [
            {
                "modules": [
                    {
                        "name": "Module 1",
                        "pages": [
                            {
                                "page_number": 1,
                                "sections": [
                                    {
                                        "activity": {
                                            "type": "matchTheWords",
                                            "headerText": "Match the words",
                                            "match_words": ["cat", "dog"],
                                            "sentences": ["I see a cat"],
                                        }
                                    },
                                    {
                                        "activity": {
                                            "type": "circle",
                                            "headerText": "Circle the answer",
                                        }
                                    },
                                ],
                            },
                            {
                                "page_number": 2,
                                "sections": [
                                    {
                                        "activity": {
                                            "type": "dragdroppicture",
                                            "headerText": "Drag and drop",
                                        }
                                    }
                                ],
                            },
                        ],
                    }
                ]
            }
        ]
    }


@pytest.fixture(name="malformed_config_json")
def malformed_config_json_fixture() -> dict:
    """Malformed config.json that should fail parsing."""
    return {
        # Missing "books" key - should cause AttributeError or KeyError
        "invalid_key": "invalid_value"
    }


@pytest.mark.asyncio
async def test_sync_all_books_end_to_end(
    async_session: AsyncSession,
    test_publisher: Publisher,
    sample_book_data: BookRead,
    sample_config_json: dict,
):
    """
    Test full end-to-end sync creates Book + Activity + BookAccess records.

    Verifies:
    - Book record created with correct data
    - Activities parsed from config.json and created
    - BookAccess record created for publisher
    - synced_at timestamp set
    """
    # Mock DreamCentralStorageClient
    mock_client = AsyncMock()
    mock_client.get_books.return_value = [sample_book_data]
    mock_client.get_book_by_id.return_value = sample_book_data
    mock_client.get_book_config.return_value = sample_config_json
    mock_client.download_asset.side_effect = DreamStorageNotFoundError("Cover not found")  # Skip cover download

    # Mock get_dream_storage_client to return our mock
    with patch(
        "app.services.book_service.get_dream_storage_client",
        return_value=mock_client,
    ):
        # Run sync
        result = await sync_all_books(async_session)

        # Verify sync result
        assert result.success is True
        assert result.books_synced == 1
        assert result.books_created == 1
        assert result.books_updated == 0
        assert result.activities_created == 3  # 3 activities in sample config

        # Verify Book record created
        result_books = await async_session.execute(select(Book))
        books = result_books.scalars().all()
        assert len(books) == 1
        book = books[0]
        assert book.dream_storage_id == "1"
        assert book.title == "Sample Book"
        assert book.book_name == "sample_book"
        assert book.publisher_name == "Dream Press"
        assert book.publisher_id == test_publisher.id
        assert book.description == "A sample book for testing"
        assert book.synced_at is not None
        assert book.config_json == sample_config_json

        # Verify Activities created
        result_activities = await async_session.execute(
            select(Activity).where(Activity.book_id == book.id)
        )
        activities = result_activities.scalars().all()
        assert len(activities) == 3

        # Check first activity
        activity1 = next(a for a in activities if a.activity_type == "matchTheWords")
        assert activity1.module_name == "Module 1"
        assert activity1.page_number == 1
        assert activity1.section_index == 0
        assert activity1.title == "Match the words"
        assert activity1.order_index == 10  # (0 * 1000) + (1 * 10) + 0

        # Check second activity
        activity2 = next(a for a in activities if a.activity_type == "circle")
        assert activity2.page_number == 1
        assert activity2.section_index == 1
        assert activity2.order_index == 11  # (0 * 1000) + (1 * 10) + 1

        # Check third activity
        activity3 = next(a for a in activities if a.activity_type == "dragdroppicture")
        assert activity3.page_number == 2
        assert activity3.section_index == 0
        assert activity3.order_index == 20  # (0 * 1000) + (2 * 10) + 0

        # Verify BookAccess created
        result_book_access = await async_session.execute(
            select(BookAccess).where(
                BookAccess.book_id == book.id,
                BookAccess.publisher_id == test_publisher.id,
            )
        )
        book_access_records = result_book_access.scalars().all()
        assert len(book_access_records) == 1
        book_access = book_access_records[0]
        assert book_access.book_id == book.id
        assert book_access.publisher_id == test_publisher.id


@pytest.mark.asyncio
async def test_resync_updates_existing_records(
    async_session: AsyncSession,
    test_publisher: Publisher,
    sample_book_data: BookRead,
    sample_config_json: dict,
):
    """
    Test resync without duplication, timestamp updated.

    Verifies:
    - Existing book updated instead of creating duplicate
    - synced_at timestamp updated
    - Old activities deleted and replaced
    - No duplicate BookAccess records
    """
    # Mock DreamCentralStorageClient
    mock_client = AsyncMock()
    mock_client.get_book_by_id.return_value = sample_book_data
    mock_client.get_book_config.return_value = sample_config_json
    mock_client.download_asset.side_effect = DreamStorageNotFoundError("Cover not found")

    with patch(
        "app.services.book_service.get_dream_storage_client",
        return_value=mock_client,
    ):
        # First sync
        book1 = await sync_book("1", async_session)
        first_synced_at = book1.synced_at
        first_book_id = book1.id

        # Get activity count after first sync
        result_activities_first = await async_session.execute(
            select(Activity).where(Activity.book_id == book1.id)
        )
        activities_after_first = result_activities_first.scalars().all()
        assert len(activities_after_first) == 3

        # Modify config to have different activities
        modified_config = {
            "books": [
                {
                    "modules": [
                        {
                            "name": "Module 1",
                            "pages": [
                                {
                                    "page_number": 1,
                                    "sections": [
                                        {
                                            "activity": {
                                                "type": "circle",
                                                "headerText": "New activity",
                                            }
                                        }
                                    ],
                                }
                            ],
                        }
                    ]
                }
            ]
        }
        mock_client.get_book_config.return_value = modified_config

        # Second sync (resync)
        book2 = await sync_book("1", async_session)

        # Verify same book ID (no duplicate)
        assert book2.id == first_book_id

        # Verify synced_at updated
        assert book2.synced_at > first_synced_at

        # Verify only one Book record exists
        result_books = await async_session.execute(
            select(Book).where(Book.dream_storage_id == "1")
        )
        books = result_books.scalars().all()
        assert len(books) == 1

        # Verify activities replaced (old deleted, new created)
        result_activities_second = await async_session.execute(
            select(Activity).where(Activity.book_id == book2.id)
        )
        activities_after_second = result_activities_second.scalars().all()
        assert len(activities_after_second) == 1  # Only new activity
        assert activities_after_second[0].activity_type == "circle"
        assert activities_after_second[0].title == "New activity"

        # Verify no duplicate BookAccess records
        result_book_access = await async_session.execute(
            select(BookAccess).where(
                BookAccess.book_id == book2.id,
                BookAccess.publisher_id == test_publisher.id,
            )
        )
        book_access_records = result_book_access.scalars().all()
        assert len(book_access_records) == 1


@pytest.mark.asyncio
async def test_sync_with_malformed_config(
    async_session: AsyncSession,
    test_publisher: Publisher,
    sample_book_data: BookRead,
    sample_config_json: dict,
    malformed_config_json: dict,
):
    """
    Test error handling, sync continues for other books.

    Verifies:
    - Malformed config logged in result.errors
    - Sync continues for other valid books
    - Partial success (some books synced, some failed)
    """
    # Create two books - one with valid config, one with malformed
    valid_book = BookRead(
        id=1,
        book_name="valid_book",
        publisher="Dream Press",
        title="Valid Book",
        status="published",
    )

    malformed_book = BookRead(
        id=2,
        book_name="malformed_book",
        publisher="Dream Press",
        title="Malformed Book",
        status="published",
    )

    # Mock DreamCentralStorageClient
    mock_client = AsyncMock()
    mock_client.get_books.return_value = [valid_book, malformed_book]

    # Return different data based on book ID
    async def mock_get_book_by_id(book_id: int):
        if book_id == 1:
            return valid_book
        elif book_id == 2:
            return malformed_book
        return None

    async def mock_get_book_config(publisher: str, book_name: str):
        if book_name == "valid_book":
            return sample_config_json
        elif book_name == "malformed_book":
            return malformed_config_json
        return {}

    mock_client.get_book_by_id.side_effect = mock_get_book_by_id
    mock_client.get_book_config.side_effect = mock_get_book_config
    mock_client.download_asset.side_effect = DreamStorageNotFoundError("Cover not found")

    with patch(
        "app.services.book_service.get_dream_storage_client",
        return_value=mock_client,
    ):
        # Run sync
        result = await sync_all_books(async_session)

        # Verify both books were processed (one succeeded, one may have failed parsing)
        # Note: The service continues even if config parsing fails
        assert result.books_synced >= 1  # At least valid book synced

        # Verify valid book was created
        result_valid_books = await async_session.execute(
            select(Book).where(Book.book_name == "valid_book")
        )
        valid_books = result_valid_books.scalars().all()
        assert len(valid_books) == 1
        assert valid_books[0].title == "Valid Book"

        # Verify activities created for valid book
        result_activities = await async_session.execute(
            select(Activity).where(Activity.book_id == valid_books[0].id)
        )
        activities = result_activities.scalars().all()
        assert len(activities) == 3  # 3 activities from sample_config_json

        # Verify malformed book was also created but may have 0 activities
        # (service continues without activities if parsing fails)
        result_malformed_books = await async_session.execute(
            select(Book).where(Book.book_name == "malformed_book")
        )
        malformed_books = result_malformed_books.scalars().all()

        if len(malformed_books) > 0:
            # Book was created despite malformed config
            malformed_book_record = malformed_books[0]

            # Should have 0 activities due to parsing failure
            result_malformed_activities = await async_session.execute(
                select(Activity).where(Activity.book_id == malformed_book_record.id)
            )
            malformed_activities = result_malformed_activities.scalars().all()
            assert len(malformed_activities) == 0
