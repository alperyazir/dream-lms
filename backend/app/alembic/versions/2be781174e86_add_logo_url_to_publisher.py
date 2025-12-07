"""add_logo_url_to_publisher

Revision ID: 2be781174e86
Revises: f6070294g8h8
Create Date: 2025-12-04 00:00:33.814207

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = '2be781174e86'
down_revision = 'f6070294g8h8'
branch_labels = None
depends_on = None


def upgrade():
    # Add logo_url column to publishers table
    op.add_column('publishers', sa.Column('logo_url', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True))


def downgrade():
    op.drop_column('publishers', 'logo_url')
