"""add_resources_json_to_assignments

Revision ID: 9fff7de2bcfa
Revises: h8292406i0j0
Create Date: 2025-12-08 18:13:57.490164

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9fff7de2bcfa'
down_revision = 'h8292406i0j0'
branch_labels = None
depends_on = None


def upgrade():
    # Add resources JSON column to assignments table
    # Stores additional resources like videos with subtitle settings
    op.add_column('assignments', sa.Column('resources', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('assignments', 'resources')
