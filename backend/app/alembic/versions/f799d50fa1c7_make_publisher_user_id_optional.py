"""make_publisher_user_id_optional

Revision ID: f799d50fa1c7
Revises: i9303517j1k1
Create Date: 2025-12-19 19:19:39.786238

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f799d50fa1c7'
down_revision = 'i9303517j1k1'
branch_labels = None
depends_on = None


def upgrade():
    # Make publisher.user_id nullable to allow publishers synced from DCS without user accounts
    op.alter_column('publishers', 'user_id',
               existing_type=sa.UUID(),
               nullable=True)


def downgrade():
    # Revert to required user_id (will fail if any null values exist)
    op.alter_column('publishers', 'user_id',
               existing_type=sa.UUID(),
               nullable=False)
