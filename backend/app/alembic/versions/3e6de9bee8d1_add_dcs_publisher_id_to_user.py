"""add_dcs_publisher_id_to_user

Revision ID: 3e6de9bee8d1
Revises: 72e10c4c221a
Create Date: 2025-12-22 03:06:00.446869

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '3e6de9bee8d1'
down_revision = '72e10c4c221a'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'user',
        sa.Column('dcs_publisher_id', sa.Integer(), nullable=True)
    )
    op.create_index(
        'ix_user_dcs_publisher_id',
        'user',
        ['dcs_publisher_id']
    )


def downgrade():
    op.drop_index('ix_user_dcs_publisher_id', table_name='user')
    op.drop_column('user', 'dcs_publisher_id')
