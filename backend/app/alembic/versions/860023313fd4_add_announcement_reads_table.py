"""add_announcement_reads_table

Revision ID: 860023313fd4
Revises: 46e079c79945
Create Date: 2025-12-29 00:45:20.942457

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '860023313fd4'
down_revision = '46e079c79945'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()

    # Check if announcement_reads table exists
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'announcement_reads')"
    ))
    table_exists = result.scalar()

    if not table_exists:
        bind.execute(sa.text("""
            CREATE TABLE announcement_reads (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
                student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_announcement_read UNIQUE (announcement_id, student_id)
            )
        """))

        # Create indexes
        bind.execute(sa.text('CREATE INDEX ix_announcement_reads_announcement_id ON announcement_reads(announcement_id)'))
        bind.execute(sa.text('CREATE INDEX ix_announcement_reads_student_id ON announcement_reads(student_id)'))
        bind.execute(sa.text('CREATE INDEX idx_student_read_at ON announcement_reads(student_id, read_at DESC)'))


def downgrade():
    bind = op.get_bind()

    # Check if announcement_reads table exists before dropping
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'announcement_reads')"
    ))
    table_exists = result.scalar()

    if table_exists:
        bind.execute(sa.text('DROP TABLE announcement_reads'))
