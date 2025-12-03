"""fix_feedback_columns_to_jsonb

Revision ID: e5169284f7d7
Revises: d4058193f6c6
Create Date: 2025-12-02 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e5169284f7d7'
down_revision = 'd4058193f6c6'
branch_labels = None
depends_on = None


def upgrade():
    """
    Fix feedback table columns from ARRAY to JSONB.

    This migration handles the case where the feedback table was created
    with text[] columns instead of JSONB.
    """
    bind = op.get_bind()

    # Check if table exists
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback')"
    ))
    table_exists = result.scalar()

    if not table_exists:
        return  # Table doesn't exist, nothing to fix

    # Check current column type for badges
    result = bind.execute(sa.text("""
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'feedback' AND column_name = 'badges'
    """))
    row = result.fetchone()

    if row and row[0] == 'ARRAY':
        # Need to fix the column types
        bind.execute(sa.text("ALTER TABLE feedback ALTER COLUMN badges DROP DEFAULT"))
        bind.execute(sa.text("ALTER TABLE feedback ALTER COLUMN emoji_reactions DROP DEFAULT"))
        bind.execute(sa.text("""
            ALTER TABLE feedback ALTER COLUMN badges
            TYPE JSONB USING COALESCE(to_jsonb(badges), '[]'::jsonb)
        """))
        bind.execute(sa.text("""
            ALTER TABLE feedback ALTER COLUMN emoji_reactions
            TYPE JSONB USING COALESCE(to_jsonb(emoji_reactions), '[]'::jsonb)
        """))
        bind.execute(sa.text("ALTER TABLE feedback ALTER COLUMN badges SET DEFAULT '[]'::jsonb"))
        bind.execute(sa.text("ALTER TABLE feedback ALTER COLUMN emoji_reactions SET DEFAULT '[]'::jsonb"))


def downgrade():
    """
    Revert to ARRAY columns if needed.
    Note: This may lose data if JSONB contains non-array values.
    """
    bind = op.get_bind()

    # Check if table exists
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback')"
    ))
    table_exists = result.scalar()

    if not table_exists:
        return

    # Check current column type for badges
    result = bind.execute(sa.text("""
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'feedback' AND column_name = 'badges'
    """))
    row = result.fetchone()

    if row and row[0] == 'jsonb':
        bind.execute(sa.text("ALTER TABLE feedback ALTER COLUMN badges DROP DEFAULT"))
        bind.execute(sa.text("ALTER TABLE feedback ALTER COLUMN emoji_reactions DROP DEFAULT"))
        bind.execute(sa.text("""
            ALTER TABLE feedback ALTER COLUMN badges
            TYPE TEXT[] USING ARRAY(SELECT jsonb_array_elements_text(badges))
        """))
        bind.execute(sa.text("""
            ALTER TABLE feedback ALTER COLUMN emoji_reactions
            TYPE TEXT[] USING ARRAY(SELECT jsonb_array_elements_text(emoji_reactions))
        """))
        bind.execute(sa.text("ALTER TABLE feedback ALTER COLUMN badges SET DEFAULT '{}'"))
        bind.execute(sa.text("ALTER TABLE feedback ALTER COLUMN emoji_reactions SET DEFAULT '{}'"))
