#!/usr/bin/env python3
"""
One-time script to import activities for all books from DCS.

This script:
1. Fetches all books from DCS
2. For each book, parses config.json and imports activities
3. Logs progress and results

Run with: uv run python scripts/import_all_activities.py
"""
import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import select

from app.core.config import settings
from app.models import Activity
from app.services.book_service_v2 import get_book_service
from app.services.config_parser import parse_book_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Activity types that have implemented players
SUPPORTED_ACTIVITY_TYPES = {
    "dragdroppicture",
    "dragdroppicturegroup",
    "matchTheWords",
    "circle",
    "markwithx",
    "puzzleFindWords",
}


async def import_activities_for_book(book_id: int, session: AsyncSession) -> dict:
    """Import activities for a single book."""
    logger.info(f"Processing book {book_id}...")

    # Get book from DCS
    book_service = get_book_service()
    book = await book_service.get_book(book_id)
    if not book:
        logger.warning(f"Book {book_id} not found in DCS, skipping")
        return {"book_id": book_id, "status": "not_found"}

    logger.info(f"  Book: {book.title}")

    # Get book config from DCS
    book_config = await book_service.get_book_config(book_id)
    if not book_config:
        logger.warning(f"  Config not found for book {book_id}, skipping")
        return {"book_id": book_id, "status": "no_config"}

    # Parse activities from config.json
    try:
        activity_data_list = parse_book_config(book_config)
    except Exception as e:
        logger.error(f"  Failed to parse config for book {book_id}: {e}")
        return {"book_id": book_id, "status": "parse_error", "error": str(e)}

    # Filter for supported activity types only
    supported_activities = [
        a for a in activity_data_list
        if a.activity_type in SUPPORTED_ACTIVITY_TYPES
    ]

    logger.info(
        f"  Found {len(activity_data_list)} total activities, "
        f"{len(supported_activities)} supported"
    )

    # Delete existing activities for this book
    result = await session.execute(
        select(Activity).where(Activity.dcs_book_id == book_id)
    )
    existing_activities = result.scalars().all()
    deleted_count = len(existing_activities)
    for activity in existing_activities:
        await session.delete(activity)

    if deleted_count > 0:
        logger.info(f"  Deleted {deleted_count} existing activities")

    # Create new Activity records
    created_count = 0
    for activity_data in supported_activities:
        activity = Activity(
            dcs_book_id=book_id,
            module_name=activity_data.module_name,
            page_number=activity_data.page_number,
            section_index=activity_data.section_index,
            activity_type=activity_data.activity_type,
            title=activity_data.title,
            config_json=activity_data.config_json,
            order_index=activity_data.order_index,
        )
        session.add(activity)
        created_count += 1

    await session.commit()

    logger.info(f"  ✅ Imported {created_count} activities")

    return {
        "book_id": book_id,
        "book_title": book.title,
        "status": "success",
        "deleted": deleted_count,
        "created": created_count,
        "total_parsed": len(activity_data_list),
    }


async def main():
    """Main script execution."""
    logger.info("=" * 80)
    logger.info("Starting activity import for all books")
    logger.info("=" * 80)

    # Create database session
    engine = create_async_engine(str(settings.SQLALCHEMY_DATABASE_URI), echo=False)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    # Get all books from DCS
    logger.info("Fetching books from DCS...")
    book_service = get_book_service()
    books = await book_service.list_books()

    logger.info(f"Found {len(books)} books in DCS")
    logger.info("")

    # Process each book
    results = []
    async with async_session() as session:
        for i, book in enumerate(books, 1):
            logger.info(f"[{i}/{len(books)}] Processing book {book.id}: {book.title}")
            result = await import_activities_for_book(book.id, session)
            results.append(result)
            logger.info("")

    # Summary
    logger.info("=" * 80)
    logger.info("Import Summary")
    logger.info("=" * 80)

    success_count = sum(1 for r in results if r["status"] == "success")
    total_created = sum(r.get("created", 0) for r in results if r["status"] == "success")

    logger.info(f"Total books processed: {len(results)}")
    logger.info(f"Successful imports: {success_count}")
    logger.info(f"Total activities created: {total_created}")

    # Show any failures
    failures = [r for r in results if r["status"] != "success"]
    if failures:
        logger.warning(f"\nFailed imports: {len(failures)}")
        for failure in failures:
            logger.warning(
                f"  Book {failure['book_id']}: {failure['status']} "
                f"({failure.get('error', 'N/A')})"
            )

    logger.info("\n✅ Activity import complete!")
    logger.info("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
