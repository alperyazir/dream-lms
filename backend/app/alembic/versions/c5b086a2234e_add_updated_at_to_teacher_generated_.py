"""add_updated_at_to_teacher_generated_content

Revision ID: c5b086a2234e
Revises: 387cc48be471
Create Date: 2026-01-06 15:58:25.507763

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c5b086a2234e'
down_revision = '387cc48be471'
branch_labels = None
depends_on = None


def upgrade():
    # Add updated_at column to teacher_generated_content table
    op.add_column('teacher_generated_content', sa.Column('updated_at', sa.DateTime(), nullable=True))


def downgrade():
    # Remove updated_at column from teacher_generated_content table
    op.drop_column('teacher_generated_content', 'updated_at')
