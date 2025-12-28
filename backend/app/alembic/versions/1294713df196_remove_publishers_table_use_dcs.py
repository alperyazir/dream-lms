"""remove_publishers_table_use_dcs

Revision ID: 1294713df196
Revises: a68a623c28cd
Create Date: 2025-12-21 21:52:35.436521

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '1294713df196'
down_revision = 'a68a623c28cd'
branch_labels = None
depends_on = None


def upgrade():
    """
    Remove publishers table and migrate to DCS IDs.

    Steps:
    1. Add dcs_publisher_id to schools and books
    2. Migrate data from publisher.dcs_id to school/book.dcs_publisher_id
    3. Drop foreign key constraints
    4. Drop publisher_id columns
    5. Drop publishers table
    """
    # Step 1: Add dcs_publisher_id columns
    op.add_column('schools', sa.Column('dcs_publisher_id', sa.Integer(), nullable=True))
    op.add_column('books', sa.Column('dcs_publisher_id', sa.Integer(), nullable=True))

    # Step 2: Migrate data - copy publisher.dcs_id to schools/books.dcs_publisher_id
    op.execute("""
        UPDATE schools s
        SET dcs_publisher_id = p.dcs_id
        FROM publishers p
        WHERE s.publisher_id = p.id
    """)

    op.execute("""
        UPDATE books b
        SET dcs_publisher_id = p.dcs_id
        FROM publishers p
        WHERE b.publisher_id = p.id
    """)

    # Step 3: Drop foreign key constraints
    op.drop_constraint('schools_publisher_id_fkey', 'schools', type_='foreignkey')
    op.drop_constraint('books_publisher_id_fkey', 'books', type_='foreignkey')

    # Step 4: Drop old publisher_id columns
    op.drop_column('schools', 'publisher_id')
    op.drop_column('books', 'publisher_id')

    # Step 5: Drop book_access table (no longer needed without publishers table)
    op.drop_table('book_access')

    # Step 6: Drop publishers table
    op.drop_table('publishers')


def downgrade():
    """
    Downgrade is complex and would require re-fetching data from DCS.
    Not fully implemented as this is a one-way migration.
    """
    # Would need to:
    # 1. Recreate publishers table
    # 2. Fetch publishers from DCS
    # 3. Recreate publisher_id columns
    # 4. Migrate data back
    # This is left unimplemented as rolling back would require DCS access
    raise NotImplementedError(
        "Downgrade not supported - publishers data comes from DCS. "
        "To rollback, restore database from backup."
    )
