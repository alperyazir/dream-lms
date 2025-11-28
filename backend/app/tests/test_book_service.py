"""
Unit tests for Book Service.

Tests cover:
- Publisher entity mapping edge cases
- Book sync upsert logic (create vs update)
- Cover image download error handling
"""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import Book, Publisher, User, UserRole
from app.services.book_service import (
    _map_publisher_to_entity,
    sync_book,
)
from app.services.dream_storage_client import BookRead, DreamStorageNotFoundError


@pytest_asyncio.fixture(name="test_publisher")
async def test_publisher_fixture(async_session: AsyncSession) -> Publisher:
    """Create a test publisher for unit tests."""
    # Create publisher user first
    user = User(
        id=uuid.uuid4(),
        email="testpub@example.com",
        username="testpub",
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
        name="Test Publisher",
        contact_email="contact@testpub.com",
    )
    async_session.add(publisher)
    await async_session.commit()
    await async_session.refresh(publisher)

    return publisher


# Tests for _map_publisher_to_entity()


@pytest.mark.asyncio
async def test_map_publisher_to_entity_success(
    async_session: AsyncSession, test_publisher: Publisher
):
    """Test publisher mapping when publisher exists."""
    # Act
    result = await _map_publisher_to_entity("Test Publisher", async_session)

    # Assert
    assert result is not None
    assert result.id == test_publisher.id
    assert result.name == "Test Publisher"


@pytest.mark.asyncio
async def test_map_publisher_to_entity_not_found(async_session: AsyncSession):
    """Test publisher mapping when publisher does not exist."""
    # Act & Assert
    with pytest.raises(ValueError, match="Publisher 'Nonexistent Publisher' must be created by admin first"):
        await _map_publisher_to_entity("Nonexistent Publisher", async_session)


@pytest.mark.asyncio
async def test_map_publisher_to_entity_case_sensitive(
    async_session: AsyncSession, test_publisher: Publisher
):
    """Test that publisher lookup is case-sensitive."""
    # Act & Assert - different case should fail
    with pytest.raises(ValueError, match="Publisher 'test publisher' must be created by admin first"):
        await _map_publisher_to_entity("test publisher", async_session)


# Tests for sync_book() upsert logic


@pytest.mark.asyncio
async def test_sync_book_creates_new_book(
    async_session: AsyncSession, test_publisher: Publisher
):
    """Test sync_book creates a new book when it doesn't exist."""
    # Arrange
    book_data = BookRead(
        id=123,
        book_name="new_book",
        publisher="Test Publisher",
        title="New Book",
        description="A new test book",
        status="published",
    )

    config_json = {
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
                                            "headerText": "Test",
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

    # Mock Dream Storage Client
    mock_client = AsyncMock()
    mock_client.get_book_by_id.return_value = book_data
    mock_client.get_book_config.return_value = config_json
    mock_client.download_asset.side_effect = DreamStorageNotFoundError("Cover not found")

    with patch(
        "app.services.book_service.get_dream_storage_client",
        return_value=mock_client,
    ):
        # Act
        result = await sync_book("123", async_session)

        # Assert - book was created
        assert result is not None
        assert result.dream_storage_id == "123"
        assert result.title == "New Book"
        assert result.book_name == "new_book"
        assert result.publisher_id == test_publisher.id

        # Verify it's persisted in database
        db_result = await async_session.execute(
            select(Book).where(Book.dream_storage_id == "123")
        )
        db_book = db_result.scalar_one_or_none()
        assert db_book is not None
        assert db_book.id == result.id


@pytest.mark.asyncio
async def test_sync_book_updates_existing_book(
    async_session: AsyncSession, test_publisher: Publisher
):
    """Test sync_book updates an existing book instead of creating duplicate."""
    # Arrange - create existing book
    existing_book = Book(
        dream_storage_id="456",
        title="Old Title",
        book_name="test_book",
        publisher_name="Test Publisher",
        publisher_id=test_publisher.id,
        description="Old description",
        config_json={
            "books": [
                {
                    "modules": [
                        {
                            "name": "Old Module",
                            "pages": [
                                {
                                    "page_number": 1,
                                    "sections": [
                                        {
                                            "activity": {
                                                "type": "circle",
                                                "headerText": "Old Activity",
                                            }
                                        }
                                    ],
                                }
                            ],
                        }
                    ]
                }
            ]
        },
    )
    async_session.add(existing_book)
    await async_session.commit()
    await async_session.refresh(existing_book)
    original_id = existing_book.id

    # New data from Dream Storage
    updated_book_data = BookRead(
        id=456,
        book_name="test_book",
        publisher="Test Publisher",
        title="Updated Title",
        description="Updated description",
        status="published",
    )

    config_json = {
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
                                            "headerText": "Test",
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

    # Mock Dream Storage Client
    mock_client = AsyncMock()
    mock_client.get_book_by_id.return_value = updated_book_data
    mock_client.get_book_config.return_value = config_json
    mock_client.download_asset.side_effect = DreamStorageNotFoundError("Cover not found")

    with patch(
        "app.services.book_service.get_dream_storage_client",
        return_value=mock_client,
    ):
        # Act
        result = await sync_book("456", async_session)

        # Assert - book was updated, not duplicated
        assert result.id == original_id  # Same ID (not a new book)
        assert result.title == "Updated Title"  # Updated fields
        assert result.description == "Updated description"

        # Verify only one book exists with this dream_storage_id
        db_result = await async_session.execute(
            select(Book).where(Book.dream_storage_id == "456")
        )
        books = db_result.scalars().all()
        assert len(books) == 1
        assert books[0].id == original_id


@pytest.mark.asyncio
async def test_sync_book_with_commit_false(
    async_session: AsyncSession, test_publisher: Publisher
):
    """Test sync_book with commit=False does not commit transaction."""
    # Arrange
    book_data = BookRead(
        id=789,
        book_name="batch_book",
        publisher="Test Publisher",
        title="Batch Book",
        status="published",
    )

    config_json = {
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
                                            "headerText": "Test",
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

    mock_client = AsyncMock()
    mock_client.get_book_by_id.return_value = book_data
    mock_client.get_book_config.return_value = config_json
    mock_client.download_asset.side_effect = DreamStorageNotFoundError("Cover not found")

    with patch(
        "app.services.book_service.get_dream_storage_client",
        return_value=mock_client,
    ):
        # Act - call with commit=False
        result = await sync_book("789", async_session, commit=False)

        # Assert - book object returned
        assert result is not None
        assert result.dream_storage_id == "789"

        # Rollback the transaction
        await async_session.rollback()

        # Verify book was NOT committed (should not exist after rollback)
        db_result = await async_session.execute(
            select(Book).where(Book.dream_storage_id == "789")
        )
        db_book = db_result.scalar_one_or_none()
        assert db_book is None
