"""add_ai_activity_fields_to_assignments

Revision ID: ab7fc7b881d2
Revises: 4b4df9832c89
Create Date: 2026-01-02 20:56:29.430469

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'ab7fc7b881d2'
down_revision = '4b4df9832c89'
branch_labels = None
depends_on = None


def upgrade():
    # Add AI activity fields to assignments table
    op.add_column('assignments', sa.Column('activity_type', sa.String(length=50), nullable=True))
    op.add_column('assignments', sa.Column('activity_content', sa.JSON(), nullable=True))
    op.add_column('assignments', sa.Column('generation_source', sa.String(length=50), nullable=True))
    op.add_column('assignments', sa.Column('source_id', sa.String(length=255), nullable=True))


def downgrade():
    # Remove AI activity fields from assignments table
    op.drop_column('assignments', 'source_id')
    op.drop_column('assignments', 'generation_source')
    op.drop_column('assignments', 'activity_content')
    op.drop_column('assignments', 'activity_type')
