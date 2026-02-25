"""
Migrate existing AI-generated content from LMS DB to DCS.

For each TeacherGeneratedContent record with a book_id:
  1. POST content JSON to DCS → get dcs_content_id
  2. For audio activity types: generate TTS audio, upload to DCS
  3. Update audio_url fields to point to LMS proxy (stable URLs)
  4. Store dcs_content_id in the LMS record

Usage:
    cd backend
    python -m app.scripts.migrate_ai_content_to_dcs [--dry-run] [--limit N]
"""

import argparse
import asyncio
import logging
import sys
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

# Ensure app modules are importable
sys.path.insert(0, ".")

from app.core.config import settings  # noqa: E402
from app.core.db import async_engine  # noqa: E402
from app.models import TeacherGeneratedContent  # noqa: E402
from app.services.dcs_ai_content_client import DCSAIContentClient  # noqa: E402
from app.services.dream_storage_client import DreamCentralStorageClient  # noqa: E402
from app.services.tts.base import AudioGenerationOptions  # noqa: E402
from app.services.tts.manager import create_default_manager  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger("migrate_ai_content")

# Activity types that have audio and need TTS generation + upload
_AUDIO_ACTIVITY_MAP: dict[str, tuple[str, str]] = {
    # activity_type → (items_key, text_field)
    "vocabulary_quiz": ("questions", "question"),
    "listening_quiz": ("questions", "audio_text"),
    "sentence_builder": ("sentences", "correct_sentence"),
    "listening_sentence_builder": ("sentences", "correct_sentence"),
    "word_builder": ("words", "correct_word"),
    "listening_word_builder": ("words", "correct_word"),
    "vocabulary_matching": ("pairs", "term"),
}

# Proxy URL pattern (served by ai_content_proxy.py)
_PROXY_URL_TEMPLATE = "/api/v1/ai/content/{book_id}/{content_id}/audio/{filename}"


def _build_dcs_payload(record: TeacherGeneratedContent) -> dict:
    """Build the payload for POST /books/{book_id}/ai-content/.

    DCS expects: { "manifest": { ... }, "content": { ... } }
    """
    content = record.content or {}
    activity_type = record.activity_type
    has_audio = activity_type in _AUDIO_ACTIVITY_MAP
    has_passage = activity_type in ("reading_comprehension", "reading")

    return {
        "manifest": {
            "activity_type": activity_type,
            "title": record.title,
            "item_count": _count_items(activity_type, content),
            "has_audio": has_audio,
            "has_passage": has_passage,
            "difficulty": content.get("difficulty", content.get("level", None)),
            "language": content.get("language", "en"),
            "created_by": str(record.teacher_id),
            "created_at": record.created_at.isoformat() if record.created_at else None,
        },
        "content": content,
    }


def _count_items(activity_type: str, content: dict) -> int:
    """Count the number of items/questions in the content."""
    mapping = {
        "vocabulary_quiz": "questions",
        "listening_quiz": "questions",
        "ai_quiz": "questions",
        "reading_comprehension": "questions",
        "reading": "questions",
        "sentence_builder": "sentences",
        "listening_sentence_builder": "sentences",
        "word_builder": "words",
        "listening_word_builder": "words",
        "vocabulary_matching": "pairs",
    }
    key = mapping.get(activity_type, "questions")
    return len(content.get(key, []))


async def _generate_and_upload_audio(
    ai_client: DCSAIContentClient,
    tts_manager,
    book_id: int,
    content_id: str,
    activity_type: str,
    content: dict,
) -> dict:
    """Generate TTS audio for each item and upload to DCS.

    Returns the updated content dict with new audio_url values.
    """
    if activity_type not in _AUDIO_ACTIVITY_MAP:
        return content

    items_key, text_field = _AUDIO_ACTIVITY_MAP[activity_type]
    items = content.get(items_key, [])
    if not items:
        return content

    lang = content.get("language", "en")
    options = AudioGenerationOptions(language=lang, format="mp3")

    # Collect audio files for batch upload
    audio_files: list[tuple[str, bytes]] = []

    for idx, item in enumerate(items):
        text = item.get(text_field, "")
        if not text:
            continue

        filename = f"item_{idx}.mp3"
        try:
            result = await tts_manager.generate_audio(text, options)
            audio_files.append((filename, result.audio_data))

            # Update the item's audio_url to point to the LMS proxy
            item["audio_url"] = _PROXY_URL_TEMPLATE.format(
                book_id=book_id, content_id=content_id, filename=filename
            )
            item["audio_status"] = "ready"
        except Exception as e:
            logger.warning(f"TTS failed for item {idx} ('{text[:40]}…'): {e}")
            # Keep existing audio_url (dynamic TTS) as fallback
            continue

    # Batch upload to DCS
    if audio_files:
        try:
            await ai_client.upload_audio_batch(book_id, content_id, audio_files)
            logger.info(
                f"Uploaded {len(audio_files)} audio files for content_id={content_id}"
            )
        except Exception as e:
            logger.error(f"Batch audio upload failed for content_id={content_id}: {e}")
            # Revert audio_url changes on failure
            for idx, item in enumerate(items):
                text = item.get(text_field, "")
                if text:
                    from urllib.parse import quote

                    item["audio_url"] = (
                        f"/api/v1/ai/tts/audio?text={quote(text, safe='')}&lang={lang}"
                    )

    return content


async def migrate(dry_run: bool = False, limit: int | None = None, resync: bool = False) -> None:
    """Run the migration. Use resync=True to re-push already-synced audio records."""
    dcs = DreamCentralStorageClient()
    ai_client = DCSAIContentClient(dcs)
    tts_manager = create_default_manager()

    migrated = 0
    skipped = 0
    errors = 0

    try:
        async with AsyncSession(async_engine, expire_on_commit=False) as session:
            # Fetch records to migrate
            if resync:
                # Re-sync: process audio-type records that already have a dcs_content_id
                audio_types = list(_AUDIO_ACTIVITY_MAP.keys())
                stmt = (
                    select(TeacherGeneratedContent)
                    .where(
                        TeacherGeneratedContent.book_id.isnot(None),
                        TeacherGeneratedContent.dcs_content_id.isnot(None),
                        TeacherGeneratedContent.activity_type.in_(audio_types),
                    )
                    .order_by(TeacherGeneratedContent.created_at)
                )
            else:
                # Normal: only un-synced records
                stmt = (
                    select(TeacherGeneratedContent)
                    .where(
                        TeacherGeneratedContent.book_id.isnot(None),
                        TeacherGeneratedContent.dcs_content_id.is_(None),
                    )
                    .order_by(TeacherGeneratedContent.created_at)
                )
            if limit:
                stmt = stmt.limit(limit)

            result = await session.execute(stmt)
            records = result.scalars().all()

            logger.info(f"Found {len(records)} records to migrate (dry_run={dry_run})")

            for record in records:
                # Capture identifiers before any DB operations (avoid expired-state issues)
                rec_id = str(record.id)
                rec_type = record.activity_type
                rec_book_id = record.book_id
                old_dcs_id = record.dcs_content_id

                # For resync: fetch content from DCS (DB content was cleared)
                if resync and old_dcs_id:
                    try:
                        dcs_data = await ai_client.get_content(rec_book_id, old_dcs_id)
                        rec_content = dcs_data.get("content", {})
                    except Exception:
                        rec_content = dict(record.content) if record.content else {}
                else:
                    rec_content = dict(record.content) if record.content else {}

                try:
                    logger.info(
                        f"Processing record id={rec_id}, "
                        f"type={rec_type}, book_id={rec_book_id}"
                    )

                    if dry_run:
                        logger.info(f"  [DRY RUN] Would {'resync' if resync else 'create'} DCS content: {record.title}")
                        migrated += 1
                        continue

                    # For resync: delete old DCS entry (audio files get deleted too)
                    if resync and old_dcs_id:
                        try:
                            await ai_client.delete_content(rec_book_id, old_dcs_id)
                            logger.info(f"  Deleted old DCS entry: {old_dcs_id}")
                        except Exception as e:
                            logger.warning(f"  Could not delete old DCS entry {old_dcs_id}: {e}")

                    # 1. Generate audio FIRST so content has final URLs after DCS create
                    audio_files: list[tuple[str, bytes]] = []
                    audio_items: list[tuple[int, str]] = []  # (idx, filename)

                    if rec_type in _AUDIO_ACTIVITY_MAP:
                        items_key, text_field = _AUDIO_ACTIVITY_MAP[rec_type]
                        items = rec_content.get(items_key, [])
                        lang = rec_content.get("language", "en")
                        options = AudioGenerationOptions(language=lang, format="mp3")

                        for idx, item in enumerate(items):
                            text = item.get(text_field, "")
                            if not text:
                                continue
                            try:
                                result = await tts_manager.generate_audio(text, options)
                                filename = f"item_{idx}.mp3"
                                audio_files.append((filename, result.audio_data))
                                audio_items.append((idx, filename))
                            except Exception as e:
                                logger.warning(f"  TTS failed for item {idx}: {e}")

                    # 2. Create DCS content entry
                    payload = _build_dcs_payload(record)
                    # Override content with the fetched version (for resync)
                    payload["content"] = rec_content

                    dcs_result = await ai_client.create_content(rec_book_id, payload)
                    dcs_content_id = dcs_result.get("content_id") or dcs_result.get("id")

                    if not dcs_content_id:
                        logger.error(f"  DCS returned no content_id for record {rec_id}: {dcs_result}")
                        errors += 1
                        continue

                    logger.info(f"  DCS content created: {dcs_content_id}")

                    # 3. Set audio URLs in content using the DCS content_id
                    if audio_items and rec_type in _AUDIO_ACTIVITY_MAP:
                        items_key, _ = _AUDIO_ACTIVITY_MAP[rec_type]
                        items = rec_content.get(items_key, [])
                        for idx, filename in audio_items:
                            if idx < len(items):
                                items[idx]["audio_url"] = (
                                    f"/api/v1/ai/content/{rec_book_id}/{dcs_content_id}/audio/{filename}"
                                )
                                items[idx]["audio_status"] = "ready"

                    # 4. Upload audio files to DCS
                    if audio_files:
                        try:
                            await ai_client.upload_audio_batch(rec_book_id, dcs_content_id, audio_files)
                            logger.info(f"  Uploaded {len(audio_files)} audio files")
                        except Exception as e:
                            logger.error(f"  Audio upload failed: {e}")

                    # 5. Update LMS record
                    record.dcs_content_id = str(dcs_content_id)
                    record.content = {}  # DCS is source of truth
                    record.updated_at = datetime.now(UTC)
                    session.add(record)
                    await session.commit()

                    migrated += 1
                    logger.info(f"  Migrated record {rec_id} → DCS {dcs_content_id}")

                except Exception as e:
                    logger.error(f"  Failed to migrate record {rec_id}: {e}", exc_info=True)
                    errors += 1
                    await session.rollback()
                    continue

    finally:
        await dcs.close()

    logger.info(
        f"\nMigration complete: migrated={migrated}, skipped={skipped}, errors={errors}"
    )


def main():
    parser = argparse.ArgumentParser(description="Migrate AI content to DCS")
    parser.add_argument("--dry-run", action="store_true", help="Preview without making changes")
    parser.add_argument("--limit", type=int, default=None, help="Max records to process")
    parser.add_argument("--resync", action="store_true", help="Re-sync audio-type records that already have dcs_content_id")
    args = parser.parse_args()

    asyncio.run(migrate(dry_run=args.dry_run, limit=args.limit, resync=args.resync))


if __name__ == "__main__":
    main()
