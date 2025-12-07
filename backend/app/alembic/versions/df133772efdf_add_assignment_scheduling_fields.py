"""add_assignment_scheduling_fields

Revision ID: df133772efdf
Revises: 9bb01249fc20
Create Date: 2025-12-05 18:52:46.983623

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'df133772efdf'
down_revision = '9bb01249fc20'
branch_labels = None
depends_on = None


def upgrade():
    # Create assignmentpublishstatus enum type
    op.execute("CREATE TYPE assignmentpublishstatus AS ENUM ('draft', 'scheduled', 'published', 'archived')")

    # Add scheduled_publish_date column (nullable datetime)
    op.add_column('assignments', sa.Column('scheduled_publish_date', sa.DateTime(timezone=True), nullable=True))

    # Add status column with default 'published'
    op.add_column('assignments', sa.Column(
        'status',
        sa.Enum('draft', 'scheduled', 'published', 'archived', name='assignmentpublishstatus'),
        nullable=False,
        server_default='published'
    ))

    # Create index on status for filtering
    op.create_index('ix_assignments_status', 'assignments', ['status'], unique=False)

    # Create index on scheduled_publish_date for scheduler queries
    op.create_index('ix_assignments_scheduled_publish_date', 'assignments', ['scheduled_publish_date'], unique=False)


def downgrade():
    # Drop indexes
    op.drop_index('ix_assignments_scheduled_publish_date', table_name='assignments')
    op.drop_index('ix_assignments_status', table_name='assignments')

    # Drop columns
    op.drop_column('assignments', 'status')
    op.drop_column('assignments', 'scheduled_publish_date')

    # Drop enum type
    op.execute("DROP TYPE assignmentpublishstatus")
