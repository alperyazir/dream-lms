"""add_video_path_to_assignment

Revision ID: h8292406i0j0
Revises: g7181395h9i9
Create Date: 2025-12-08

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h8292406i0j0'
down_revision = 'g7181395h9i9'
branch_labels = None
depends_on = None


def upgrade():
    # Add video_path column to assignments table
    # Stores relative path like "videos/chapter1.mp4"
    op.add_column('assignments', sa.Column('video_path', sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column('assignments', 'video_path')
