"""add_must_change_password_to_user

Revision ID: 06e0a67e5e16
Revises: 3c04a1c1d4b4
Create Date: 2025-11-10 21:40:29.784506

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '06e0a67e5e16'
down_revision = '3c04a1c1d4b4'
branch_labels = None
depends_on = None


def upgrade():
    # Add must_change_password column to user table
    op.add_column('user', sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    # Remove must_change_password column from user table
    op.drop_column('user', 'must_change_password')
