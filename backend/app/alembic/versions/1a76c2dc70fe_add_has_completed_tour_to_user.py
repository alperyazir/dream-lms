"""add_has_completed_tour_to_user

Revision ID: 1a76c2dc70fe
Revises: f6170395a8b8
Create Date: 2025-12-09 17:27:50.019113

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1a76c2dc70fe'
down_revision = 'f6170395a8b8'
branch_labels = None
depends_on = None


def upgrade():
    # Add has_completed_tour column to user table with default False
    op.add_column('user', sa.Column('has_completed_tour', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade():
    op.drop_column('user', 'has_completed_tour')
