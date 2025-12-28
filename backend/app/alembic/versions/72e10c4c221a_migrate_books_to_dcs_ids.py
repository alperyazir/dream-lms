"""migrate_books_to_dcs_ids

Revision ID: 72e10c4c221a
Revises: 1294713df196
Create Date: 2025-12-21 22:49:23.198838

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '72e10c4c221a'
down_revision = '1294713df196'
branch_labels = None
depends_on = None


def upgrade():
    """
    Migrate from local books table to DCS-first architecture.

    This migration:
    1. Validates data integrity before migration
    2. Adds dcs_book_id columns to assignments and activities
    3. Migrates existing data from books.dream_storage_id
    4. Drops old book_id foreign keys and columns
    5. Drops the books table entirely

    CRITICAL: This migration is irreversible. Ensure you have a database backup!
    """
    from alembic import op
    import sqlalchemy as sa
    from sqlalchemy import text

    # PRE-MIGRATION VALIDATION
    print("\n" + "="*80)
    print("STARTING PRE-MIGRATION VALIDATION")
    print("="*80)

    conn = op.get_bind()

    # Validation 1: Check for NULL dream_storage_id
    print("\n[1/5] Checking for books with NULL dream_storage_id...")
    result = conn.execute(text("""
        SELECT COUNT(*) as count FROM books WHERE dream_storage_id IS NULL
    """))
    null_count = result.scalar()
    if null_count > 0:
        raise ValueError(
            f"MIGRATION ABORTED: Found {null_count} books with NULL dream_storage_id. "
            f"All books must have a valid DCS ID before migration."
        )
    print(f"✓ All books have dream_storage_id")

    # Validation 2: Check dream_storage_id can be cast to INTEGER
    print("\n[2/5] Validating dream_storage_id can be cast to INTEGER...")
    result = conn.execute(text("""
        SELECT dream_storage_id FROM books
        WHERE dream_storage_id !~ '^[0-9]+$'
        LIMIT 5
    """))
    invalid_ids = [row[0] for row in result]
    if invalid_ids:
        raise ValueError(
            f"MIGRATION ABORTED: Found books with non-numeric dream_storage_id: {invalid_ids}. "
            f"All dream_storage_id values must be numeric."
        )
    print(f"✓ All dream_storage_id values are numeric")

    # Validation 3: Check assignments have valid book_id
    print("\n[3/5] Checking assignments have valid book_id references...")
    result = conn.execute(text("""
        SELECT COUNT(*) as count FROM assignments a
        LEFT JOIN books b ON a.book_id = b.id
        WHERE a.book_id IS NOT NULL AND b.id IS NULL
    """))
    orphan_count = result.scalar()
    if orphan_count > 0:
        raise ValueError(
            f"MIGRATION ABORTED: Found {orphan_count} assignments with invalid book_id. "
            f"All assignments must reference valid books."
        )
    print(f"✓ All assignments have valid book references")

    # Validation 4: Check activities have valid book_id
    print("\n[4/5] Checking activities have valid book_id references...")
    result = conn.execute(text("""
        SELECT COUNT(*) as count FROM activities a
        LEFT JOIN books b ON a.book_id = b.id
        WHERE a.book_id IS NOT NULL AND b.id IS NULL
    """))
    orphan_count = result.scalar()
    if orphan_count > 0:
        raise ValueError(
            f"MIGRATION ABORTED: Found {orphan_count} activities with invalid book_id. "
            f"All activities must reference valid books."
        )
    print(f"✓ All activities have valid book references")

    # Validation 5: Get migration statistics
    print("\n[5/5] Gathering migration statistics...")
    stats = {}
    for table in ['assignments', 'activities', 'book_assignments']:
        result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
        stats[table] = result.scalar()

    result = conn.execute(text("SELECT COUNT(*) FROM books"))
    stats['books'] = result.scalar()

    print(f"\nMigration will affect:")
    print(f"  - {stats['books']} books (table will be DROPPED)")
    print(f"  - {stats['assignments']} assignments")
    print(f"  - {stats['activities']} activities")
    print(f"  - {stats['book_assignments']} book assignments")

    print("\n" + "="*80)
    print("PRE-MIGRATION VALIDATION PASSED")
    print("="*80 + "\n")

    # Step 1: Add dcs_book_id to assignments (nullable initially for data migration)
    op.add_column('assignments', sa.Column('dcs_book_id', sa.Integer(), nullable=True))
    op.create_index('ix_assignments_dcs_book_id', 'assignments', ['dcs_book_id'])

    # Step 2: Migrate assignment data - copy book.dream_storage_id (as int) to assignment.dcs_book_id
    op.execute("""
        UPDATE assignments a
        SET dcs_book_id = CAST(b.dream_storage_id AS INTEGER)
        FROM books b
        WHERE a.book_id = b.id
    """)

    # Step 3: Add dcs_book_id to activities (nullable initially)
    op.add_column('activities', sa.Column('dcs_book_id', sa.Integer(), nullable=True))
    op.create_index('ix_activities_dcs_book_id', 'activities', ['dcs_book_id'])

    # Step 4: Migrate activities data
    op.execute("""
        UPDATE activities a
        SET dcs_book_id = CAST(b.dream_storage_id AS INTEGER)
        FROM books b
        WHERE a.book_id = b.id
    """)

    # Step 4b: Add dcs_book_id to book_assignments (nullable initially)
    op.add_column('book_assignments', sa.Column('dcs_book_id', sa.Integer(), nullable=True))
    op.create_index('ix_book_assignments_dcs_book_id', 'book_assignments', ['dcs_book_id'])

    # Step 4c: Migrate book_assignments data
    op.execute("""
        UPDATE book_assignments ba
        SET dcs_book_id = CAST(b.dream_storage_id AS INTEGER)
        FROM books b
        WHERE ba.book_id = b.id
    """)

    # Step 5: Make dcs_book_id NOT NULL after data migration
    op.alter_column('assignments', 'dcs_book_id', nullable=False)
    op.alter_column('activities', 'dcs_book_id', nullable=False)
    op.alter_column('book_assignments', 'dcs_book_id', nullable=False)

    # Step 6: Drop old foreign key constraints
    op.drop_constraint('assignments_book_id_fkey', 'assignments', type_='foreignkey')
    op.drop_constraint('activities_book_id_fkey', 'activities', type_='foreignkey')
    op.drop_constraint('book_assignments_book_id_fkey', 'book_assignments', type_='foreignkey')

    # Step 7: Drop old book_id columns
    op.drop_index('ix_assignments_book_id', 'assignments')
    op.drop_column('assignments', 'book_id')

    op.drop_index('ix_activities_book_id', 'activities')
    op.drop_column('activities', 'book_id')

    op.drop_index('ix_book_assignments_book_id', 'book_assignments')
    op.drop_column('book_assignments', 'book_id')

    # Step 8: Drop books table (point of no return!)
    op.drop_table('books')


def downgrade():
    """
    Downgrade is complex and potentially lossy.

    Would require re-syncing all books from DCS to restore the books table,
    then re-establishing foreign keys. Not implemented due to complexity.
    """
    raise NotImplementedError(
        "Downgrade not supported - would require re-syncing all books from DCS. "
        "If you need to rollback, restore from backup."
    )
