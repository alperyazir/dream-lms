"""add_dcs_id_to_publishers

Revision ID: 74fccd3da614
Revises: 3f90262da238
Create Date: 2025-12-21 00:24:00.885733

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '74fccd3da614'
down_revision = '3f90262da238'
branch_labels = None
depends_on = None


def upgrade():
    # Add dcs_id column to publishers table
    op.add_column('publishers', sa.Column('dcs_id', sa.Integer(), nullable=True))


def downgrade():
    # Remove dcs_id column from publishers table
    op.drop_column('publishers', 'dcs_id')
