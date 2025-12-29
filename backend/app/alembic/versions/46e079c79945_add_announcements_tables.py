"""add_announcements_tables

Revision ID: 46e079c79945
Revises: 3e6de9bee8d1
Create Date: 2025-12-29 00:12:57.115333

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '46e079c79945'
down_revision = '3e6de9bee8d1'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()

    # Check if announcements table exists
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements')"
    ))
    table_exists = result.scalar()

    if not table_exists:
        bind.execute(sa.text("""
            CREATE TABLE announcements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE
            )
        """))

        # Create indexes
        bind.execute(sa.text('CREATE INDEX ix_announcements_teacher_id ON announcements(teacher_id)'))
        bind.execute(sa.text('CREATE INDEX ix_announcements_created_at ON announcements(created_at DESC)'))
        bind.execute(sa.text('CREATE INDEX ix_announcements_deleted_at ON announcements(deleted_at)'))

    # Check if announcement_recipients table exists
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'announcement_recipients')"
    ))
    table_exists = result.scalar()

    if not table_exists:
        bind.execute(sa.text("""
            CREATE TABLE announcement_recipients (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
                student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Create indexes
        bind.execute(sa.text('CREATE INDEX ix_announcement_recipients_announcement_id ON announcement_recipients(announcement_id)'))
        bind.execute(sa.text('CREATE INDEX ix_announcement_recipients_student_id ON announcement_recipients(student_id)'))
        bind.execute(sa.text('CREATE INDEX idx_student_created ON announcement_recipients(student_id, created_at DESC)'))


def downgrade():
    bind = op.get_bind()

    # Check if announcement_recipients table exists before dropping
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'announcement_recipients')"
    ))
    table_exists = result.scalar()

    if table_exists:
        bind.execute(sa.text('DROP TABLE announcement_recipients'))

    # Check if announcements table exists before dropping
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements')"
    ))
    table_exists = result.scalar()

    if table_exists:
        bind.execute(sa.text('DROP TABLE announcements'))
