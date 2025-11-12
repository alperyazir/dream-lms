"""add_initial_password_to_user

Revision ID: 03abe89005ac
Revises: 06e0a67e5e16
Create Date: 2025-11-10 22:10:40.285105

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '03abe89005ac'
down_revision = '06e0a67e5e16'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user', sa.Column('initial_password', sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column('user', 'initial_password')
