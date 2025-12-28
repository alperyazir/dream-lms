# Migration Guide: Story 24.3 - Book Service Migration

## 📋 Overview

This migration transforms the LMS from a **sync-based architecture** to a **DCS-first architecture** for book data.

### What Changes:

**BEFORE:**
- Books synced from DCS → Stored in local `books` table → Referenced by UUID foreign keys
- Book sync required for catalog updates
- Local book data could drift from DCS

**AFTER:**
- Books fetched on-demand from DCS → Cached in memory → Referenced by DCS integer IDs
- No sync required - always shows latest DCS data
- Single source of truth

---

## ⚠️ CRITICAL WARNINGS

1. **IRREVERSIBLE**: This migration drops the `books` table. Cannot be rolled back without restoring from backup.
2. **BREAKING**: All code referencing `Book` model will break immediately after migration.
3. **DOWNTIME**: Service must be restarted after migration completes.
4. **BACKUP REQUIRED**: You MUST create a database backup before running this migration.

---

## 🔍 Pre-Migration Checklist

### [ ] 1. Create Database Backup

```bash
cd /Users/alperyazir/Dev/dream-lms/backend
./scripts/pre_migration_backup.sh
```

This script:
- Creates a timestamped database backup
- Validates data integrity
- Checks for common migration blockers

**Expected output:**
```
✓ Backup created successfully!
✓ Data validation passed
You can now safely run the migration
```

### [ ] 2. Verify Environment

Ensure these services are running:
- PostgreSQL database
- DCS API is accessible
- You have DCS credentials in `.env`

### [ ] 3. Review Migration Impact

Run this to see what will be affected:

```sql
-- Count of records to be migrated
SELECT
    (SELECT COUNT(*) FROM books) as books_to_drop,
    (SELECT COUNT(*) FROM assignments) as assignments_to_migrate,
    (SELECT COUNT(*) FROM activities) as activities_to_migrate,
    (SELECT COUNT(*) FROM book_assignments) as book_assignments_to_migrate;
```

### [ ] 4. Stop Application Services

```bash
# Stop backend if running
pkill -f "uvicorn"

# Or stop Docker containers
docker-compose down
```

---

## 🚀 Migration Execution

### Step 1: Run Migration

```bash
cd /Users/alperyazir/Dev/dream-lms/backend
alembic upgrade head
```

**Expected output:**
```
================================================================================
STARTING PRE-MIGRATION VALIDATION
================================================================================

[1/5] Checking for books with NULL dream_storage_id...
✓ All books have dream_storage_id

[2/5] Validating dream_storage_id can be cast to INTEGER...
✓ All dream_storage_id values are numeric

[3/5] Checking assignments have valid book_id references...
✓ All assignments have valid book references

[4/5] Checking activities have valid book_id references...
✓ All activities have valid book references

[5/5] Gathering migration statistics...

Migration will affect:
  - 15 books (table will be DROPPED)
  - 42 assignments
  - 238 activities
  - 8 book assignments

================================================================================
PRE-MIGRATION VALIDATION PASSED
================================================================================

INFO  [alembic.runtime.migration] Running upgrade... -> 72e10c4c221a, migrate_books_to_dcs_ids
```

### Step 2: Verify Migration

```sql
-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'assignments' AND column_name = 'dcs_book_id';

-- Verify data was migrated
SELECT COUNT(*) FROM assignments WHERE dcs_book_id IS NOT NULL;

-- Confirm books table is gone
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'books'
);  -- Should return 'false'
```

### Step 3: Restart Application

```bash
# Start backend
cd /Users/alperyazir/Dev/dream-lms/backend
uvicorn app.main:app --reload

# Or start Docker
docker-compose up -d
```

### Step 4: Smoke Test

```bash
# Test book list endpoint
curl http://localhost:8000/api/v1/books/

# Test assignment creation with DCS book ID
# (Should now accept integer book IDs instead of UUIDs)
```

---

## 🔄 Rollback Procedure

**IF MIGRATION FAILS:**

1. **Stop the migration** (Ctrl+C if still running)

2. **Restore from backup:**

```bash
# Find your backup file
ls -lh backend/backups/

# Restore (replace with your backup filename)
pg_restore -h localhost -p 5432 -U postgres -d app -c \
    backend/backups/pre_migration_24_3_YYYYMMDD_HHMMSS.sql
```

3. **Downgrade Alembic (if migration completed):**

```bash
cd backend
alembic downgrade -1
```

Note: The downgrade will fail with `NotImplementedError` because this migration is irreversible. You MUST restore from backup.

---

## 📊 Post-Migration Changes

### Database Schema Changes

**Tables Modified:**
- `assignments`: Added `dcs_book_id INTEGER NOT NULL`, dropped `book_id UUID`
- `activities`: Added `dcs_book_id INTEGER NOT NULL`, dropped `book_id UUID`
- `book_assignments`: Added `dcs_book_id INTEGER NOT NULL`, dropped `book_id UUID`

**Tables Dropped:**
- `books` (all book data now fetched from DCS)

### Code Changes Required

**Backend:**
- `Book`, `BookBase`, `BookPublic` models → Use `schemas.book.BookPublic` instead
- `assignment.book` relationship → Use `BookService.get_book(assignment.dcs_book_id)` instead
- Book sync endpoints → Remove or replace with DCS pass-through

**Frontend:**
- Book ID type: `string` (UUID) → `number` (DCS ID)
- Book API responses now use `BookPublic` schema with integer IDs

---

## 🧪 Testing

### Unit Tests

Many existing tests will break because they reference the `Book` model. Update them to use `BookService`:

```python
# OLD
book = Book(...)
db.add(book)

# NEW
book_service = get_book_service()
book = await book_service.get_book(dcs_book_id=123)
```

### Integration Tests

Test the full flow:
1. Fetch books from DCS via BookService
2. Create assignment with `dcs_book_id`
3. Fetch assignment with book data
4. Verify book data is current from DCS

---

## 📈 Monitoring

### After Migration, Monitor:

1. **DCS API calls**: Should see requests to `/books/` endpoint
2. **Cache hit rate**: BookService caches for 10 minutes
3. **Errors**: Watch for "Book not found in DCS" errors
4. **Performance**: Book data now fetched on-demand (cached)

### Useful Queries:

```sql
-- Count assignments by DCS book ID
SELECT dcs_book_id, COUNT(*)
FROM assignments
GROUP BY dcs_book_id
ORDER BY COUNT(*) DESC;

-- Find assignments with potentially invalid DCS IDs
-- (Will need to verify against DCS API)
SELECT DISTINCT dcs_book_id FROM assignments;
```

---

## ❓ Troubleshooting

### "Book not found in DCS"

**Problem**: Assignment references a `dcs_book_id` that doesn't exist in DCS.

**Solution**:
1. Check if book was deleted from DCS
2. Verify `dream_storage_id` migration was correct
3. May need to archive/delete affected assignments

### "Cannot import Book from app.models"

**Problem**: Code still importing deprecated `Book` model.

**Solution**:
```python
# OLD
from app.models import Book, BookPublic

# NEW
from app.schemas.book import BookPublic
from app.services.book_service_v2 import get_book_service
```

### Migration Fails: "constraint does not exist"

**Problem**: Foreign key constraint names might differ in your database.

**Solution**:
```sql
-- Find actual constraint names
SELECT con.conname
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'assignments' AND con.contype = 'f';
```

Update migration with actual constraint names.

---

## 📝 Files Changed

### Created:
- `backend/app/services/book_service_v2.py` - New DCS-first book service
- `backend/app/alembic/versions/72e10c4c221a_migrate_books_to_dcs_ids.py` - Migration file
- `backend/scripts/pre_migration_backup.sh` - Backup script
- `backend/MIGRATION_24_3_GUIDE.md` - This file

### Modified:
- `backend/app/models.py` - Removed Book models, updated Assignment/Activity/BookAssignment
- `backend/app/schemas/book.py` - Added BookPublic schema
- `backend/app/services/dream_storage_client.py` - Added list_books() method

### To Be Updated (Phase 2):
- `backend/app/api/routes/books.py` - Use BookService instead of Book model
- `backend/app/api/routes/assignments.py` - Handle dcs_book_id
- `backend/app/tests/**/*.py` - Fix broken tests
- `frontend/src/types/book.ts` - Change ID type to number

---

## 🎯 Success Criteria

Migration is successful when:

✅ All validation checks pass
✅ Migration completes without errors
✅ `books` table no longer exists
✅ All `dcs_book_id` columns are populated
✅ Application starts without import errors
✅ Book list endpoint returns data from DCS
✅ Assignment creation works with integer book IDs

---

## 📞 Support

If you encounter issues:

1. **Check logs**: `backend/logs/` or console output
2. **Restore from backup**: Use the backup created in pre-flight
3. **Review this guide**: Ensure all steps were followed
4. **Check DCS API**: Verify DCS is accessible and returning data

---

**Migration prepared by:** James (Dev Agent)
**Story:** 24.3 - Book Service Migration
**Date:** 2025-12-21
**Alembic Revision:** 72e10c4c221a
