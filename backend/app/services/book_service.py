"""
Book Service for syncing books from Dream Central Storage.

This service handles synchronization of books and activities from Dream Central Storage.
"""

import logging
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import delete, select

from app.models import Activity, Book, BookAccess, BookStatus, Publisher
from app.services.config_parser import parse_book_config
from app.services.dream_storage_client import (
    DreamStorageNotFoundError,
    get_dream_storage_client,
)

logger = logging.getLogger(__name__)


class BookConfigSchema(BaseModel):
    """
    Pydantic schema for validating book config.json structure.

    This prevents JSONB injection attacks by:
    - Allowing all fields from Dream Central Storage (extra="allow")
    - Limiting JSON string lengths (1MB max)
    - Validating required structure
    """

    model_config = ConfigDict(
        extra="allow",  # Allow extra fields from Dream Central Storage (fullscreen, language, etc.)
        str_max_length=1_000_000,  # Max 1MB for any string field
    )

    books: list[dict]  # Require "books" key with list of dicts
    book_title: str | None = None
    book_cover: str | None = None

    @field_validator("books")
    @classmethod
    def validate_books_not_empty(cls, v: list[dict]) -> list[dict]:
        """Ensure books array is not empty."""
        if not v:
            raise ValueError("books array cannot be empty")
        return v


class BookSyncResult(BaseModel):
    """Result of book synchronization operation."""

    success: bool
    books_synced: int = 0
    books_created: int = 0
    books_updated: int = 0
    activities_created: int = 0
    errors: list[str] = []


async def _map_publisher_to_entity(publisher_name: str, db: AsyncSession) -> Publisher:
    """
    Map publisher string to Publisher entity (lookup or create).

    Args:
        publisher_name: Publisher name from Dream Central Storage
        db: Database session

    Returns:
        Publisher entity with matching name

    Raises:
        ValueError: If publisher not found in database
    """
    # Lookup existing publisher by name
    result = await db.execute(select(Publisher).where(Publisher.name == publisher_name))
    publisher = result.scalar_one_or_none()

    if publisher is None:
        # Publisher doesn't exist - this shouldn't happen in normal flow
        logger.warning(f"Publisher '{publisher_name}' not found in database")
        raise ValueError(f"Publisher '{publisher_name}' must be created by admin first")

    return publisher


def _set_cover_image_url(book: Book) -> None:
    """
    Set cover image URL to use book asset proxy endpoint.

    Instead of downloading and caching covers locally, we use the authenticated
    proxy endpoint which fetches covers from Dream Central Storage on-demand.

    Args:
        book: Book record with id set
    """
    # Set URL to use our proxy endpoint
    # The proxy will handle 404s if the cover doesn't exist in DCS
    book.cover_image_url = f"/api/v1/books/{book.id}/assets/images/book_cover.png"
    logger.debug(f"Set cover image URL for book {book.id}")


async def sync_book(
    dream_storage_id: str,
    db: AsyncSession,
    *,
    commit: bool = True,
    force_refresh: bool = False,
) -> Book:
    """
    Synchronize single book from Dream Central Storage.

    Args:
        dream_storage_id: External ID from Dream Central Storage
        db: Database session
        commit: Whether to commit the transaction (default: True).
                Set to False when batching multiple syncs.
        force_refresh: Whether to force refresh even if book was recently synced.
                      When True, always re-downloads and updates the book.
                      When False (default), may skip sync if recently updated.

    Returns:
        Book: Synchronized book record

    Raises:
        DreamStorageNotFoundError: If book not found in Dream Central Storage
        ValueError: If publisher not found in database
    """
    logger.info(
        f"Starting sync for book with dream_storage_id: {dream_storage_id}"
        f"{' (forced refresh)' if force_refresh else ''}"
    )

    # Fetch book details from Dream Central Storage
    client = await get_dream_storage_client()
    book_data = await client.get_book_by_id(int(dream_storage_id))

    if book_data is None:
        raise DreamStorageNotFoundError(f"Book {dream_storage_id} not found in Dream Central Storage")

    # Fetch config.json (optional - some books may not have activities yet)
    config_json = None
    try:
        config_json_raw = await client.get_book_config(publisher=book_data.publisher, book_name=book_data.book_name)

        # Validate config.json structure to prevent JSONB injection
        try:
            validated_config = BookConfigSchema(**config_json_raw)
            config_json = config_json_raw  # Use raw dict for storage (already validated)
            logger.debug(f"Config validation passed for book {dream_storage_id}")
        except Exception as e:
            logger.error(f"Config validation failed for book {dream_storage_id}: {e}")
            raise ValueError(f"Invalid config.json structure for book {dream_storage_id}: {e}") from e
    except DreamStorageNotFoundError:
        logger.warning(f"No config.json found for book {dream_storage_id} ({book_data.book_name}) - syncing without activities")
        config_json = None

    # Map publisher string to Publisher entity
    publisher_entity = await _map_publisher_to_entity(book_data.publisher, db)

    # Check if book already exists
    result = await db.execute(select(Book).where(Book.dream_storage_id == dream_storage_id))
    existing_book = result.scalar_one_or_none()

    if existing_book:
        # Update existing book
        logger.info(f"Updating existing book: {existing_book.id}")
        existing_book.title = book_data.title or book_data.book_name
        existing_book.book_name = book_data.book_name
        existing_book.publisher_name = book_data.publisher
        existing_book.publisher_id = publisher_entity.id
        existing_book.description = book_data.description
        existing_book.language = book_data.language
        existing_book.category = book_data.category
        existing_book.status = BookStatus(book_data.status) if book_data.status else BookStatus.published
        existing_book.config_json = config_json
        # Store DCS activity metadata (source of truth for counts)
        existing_book.dcs_activity_count = book_data.activity_count
        existing_book.dcs_activity_details = book_data.activity_details
        existing_book.updated_at = datetime.now(UTC)
        existing_book.synced_at = datetime.now(UTC)
        book = existing_book
    else:
        # Create new book
        logger.info(f"Creating new book: {book_data.book_name}")
        book = Book(
            dream_storage_id=dream_storage_id,
            title=book_data.title or book_data.book_name,
            book_name=book_data.book_name,
            publisher_name=book_data.publisher,
            publisher_id=publisher_entity.id,
            description=book_data.description,
            language=book_data.language,
            category=book_data.category,
            status=BookStatus(book_data.status) if book_data.status else BookStatus.published,
            config_json=config_json,
            # Store DCS activity metadata (source of truth for counts)
            dcs_activity_count=book_data.activity_count,
            dcs_activity_details=book_data.activity_details,
            synced_at=datetime.now(UTC),
        )
        db.add(book)
        await db.flush()  # Flush to get book.id

    # Set cover image URL to use proxy endpoint
    _set_cover_image_url(book)

    # Parse config.json to extract activities (only if config exists)
    if config_json is not None:
        try:
            activity_data_list = parse_book_config(config_json)

            # Delete old activities for this book (bulk delete for performance)
            if existing_book:
                await db.execute(delete(Activity).where(Activity.book_id == book.id))

            # Create new activities
            for activity_data in activity_data_list:
                activity = Activity(
                    book_id=book.id,
                    module_name=activity_data.module_name,
                    page_number=activity_data.page_number,
                    section_index=activity_data.section_index,
                    activity_type=activity_data.activity_type,
                    title=activity_data.title,
                    config_json=activity_data.config_json,
                    order_index=activity_data.order_index,
                )
                db.add(activity)

            logger.info(f"Created {len(activity_data_list)} activities for book {book.id}")

        except Exception as e:
            logger.error(f"Failed to parse config.json for book {book.id}: {e}")
            # Continue without activities if parsing fails
    else:
        # No config.json - book has no activities
        logger.info(f"Book {book.id} ({book.book_name}) has no config.json - 0 activities")

    # Flush book and activities before checking BookAccess (prevents autoflush errors)
    await db.flush()

    # Create BookAccess record if not exists
    result = await db.execute(
        select(BookAccess).where(
            BookAccess.book_id == book.id, BookAccess.publisher_id == publisher_entity.id
        )
    )
    book_access = result.scalar_one_or_none()

    if not book_access:
        book_access = BookAccess(book_id=book.id, publisher_id=publisher_entity.id)
        db.add(book_access)

    # Commit transaction (if not batching)
    if commit:
        await db.commit()
        await db.refresh(book)
    else:
        # Flush to get IDs assigned without committing
        await db.flush()

    logger.info(f"Successfully synced book {book.id} ({book.book_name})")
    return book


async def sync_all_books(db: AsyncSession) -> BookSyncResult:
    """
    Sync all books from Dream Central Storage.

    Args:
        db: Database session

    Returns:
        BookSyncResult: Summary of sync operation
    """
    logger.info("Starting sync of all books from Dream Central Storage")

    result = BookSyncResult(success=True)

    try:
        # Fetch all books from Dream Central Storage
        client = await get_dream_storage_client()
        books = await client.get_books()

        logger.info(f"Found {len(books)} books in Dream Central Storage")

        # Track initial counts
        initial_result = await db.execute(select(Book))
        initial_books = initial_result.scalars().all()
        initial_book_ids = {b.dream_storage_id for b in initial_books}

        # Sync books in batches for better performance (reduce N+1 commits)
        BATCH_SIZE = 10
        for i in range(0, len(books), BATCH_SIZE):
            batch = books[i : i + BATCH_SIZE]
            batch_failed = False

            try:
                # Try to process batch without committing
                for book_data in batch:
                    # Check if book already exists
                    is_new = str(book_data.id) not in initial_book_ids

                    try:
                        await sync_book(str(book_data.id), db, commit=False)

                        result.books_synced += 1
                        if is_new:
                            result.books_created += 1
                        else:
                            result.books_updated += 1

                    except Exception as e:
                        error_msg = f"Failed to sync book {book_data.id}: {e}"
                        logger.error(error_msg)
                        result.errors.append(error_msg)
                        batch_failed = True
                        break  # Stop processing this batch

                # If batch succeeded, commit it
                if not batch_failed:
                    await db.commit()
                    logger.debug(f"Committed batch of {len(batch)} books")
                else:
                    # Batch failed - rollback and retry each book individually with commits
                    await db.rollback()
                    logger.warning(
                        f"Batch failed, retrying {i} processed books individually for partial success"
                    )

                    # Retry successful books from batch individually
                    for book_data in batch:
                        try:
                            # Check if book already exists
                            is_new = str(book_data.id) not in initial_book_ids

                            # Sync with commit=True for individual retry
                            await sync_book(str(book_data.id), db, commit=True)

                            # Only count if not already counted above
                            if str(book_data.id) not in [
                                e.split()[3] for e in result.errors if "Failed to sync book" in e
                            ]:
                                result.books_synced += 1
                                if is_new:
                                    result.books_created += 1
                                else:
                                    result.books_updated += 1

                        except Exception as e:
                            # Book failed again, already logged above or log new error
                            error_msg = f"Failed to sync book {book_data.id}: {e}"
                            if error_msg not in result.errors:
                                logger.error(error_msg)
                                result.errors.append(error_msg)
                            result.success = False

            except Exception as e:
                # Batch-level error (shouldn't happen, but handle gracefully)
                error_msg = f"Batch processing error: {e}"
                logger.error(error_msg)
                result.errors.append(error_msg)
                result.success = False
                try:
                    await db.rollback()
                except Exception:
                    pass  # Already rolled back or session closed

        # Handle deletions: soft-delete books that no longer exist in DCS
        dcs_book_ids = {str(book.id) for book in books}
        all_books_result = await db.execute(select(Book))
        all_books = all_books_result.scalars().all()

        books_deleted = 0
        for book in all_books:
            if book.dream_storage_id not in dcs_book_ids and book.status != BookStatus.archived:
                logger.info(f"Book {book.dream_storage_id} ({book.title}) no longer in DCS - soft deleting")
                book.status = BookStatus.archived
                books_deleted += 1

        if books_deleted > 0:
            await db.commit()
            logger.info(f"Soft deleted {books_deleted} books no longer in DCS")

        # Count total activities created
        final_result = await db.execute(select(Activity))
        final_activities = final_result.scalars().all()
        result.activities_created = len(final_activities)

        logger.info(
            f"Sync complete: {result.books_synced} books synced "
            f"({result.books_created} created, {result.books_updated} updated), "
            f"{result.activities_created} total activities, "
            f"{len(result.errors)} errors"
        )

    except Exception as e:
        error_msg = f"Fatal error during book sync: {e}"
        logger.error(error_msg)
        result.success = False
        result.errors.append(error_msg)

    return result


async def soft_delete_book(dream_storage_id: str, db: AsyncSession) -> bool:
    """
    Soft delete a book by marking it as deleted/archived.

    Args:
        dream_storage_id: External ID from Dream Central Storage
        db: Database session

    Returns:
        bool: True if book was soft-deleted, False if not found

    Note:
        This doesn't actually delete the book from the database.
        It updates the status to mark it as no longer available.
        This preserves student progress and historical data.
    """
    logger.info(f"Soft deleting book with dream_storage_id: {dream_storage_id}")

    # Find the book
    result = await db.execute(select(Book).where(Book.dream_storage_id == dream_storage_id))
    book = result.scalar_one_or_none()

    if not book:
        logger.warning(f"Book {dream_storage_id} not found for soft delete")
        return False

    # Update status to archived
    book.status = BookStatus.archived
    book.updated_at = datetime.now(UTC)

    await db.commit()
    logger.info(f"Soft deleted book {book.id} ({book.book_name})")

    return True
