"""remove_must_change_password_from_user

Revision ID: c1ef839a2e4a
Revises: 03abe89005ac
Create Date: 2025-11-10 22:47:35.947541

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'c1ef839a2e4a'
down_revision = '03abe89005ac'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column('user', 'must_change_password')


def downgrade():
    op.add_column('user', sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default='false'))
