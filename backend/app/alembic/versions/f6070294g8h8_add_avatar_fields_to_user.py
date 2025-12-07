"""Add avatar fields to user

Revision ID: f6070294g8h8
Revises: 30d090fa740d
Create Date: 2025-12-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f6070294g8h8'
down_revision = '30d090fa740d'
branch_labels = None
depends_on = None


def upgrade():
    # Create avatar_type enum
    avatar_type_enum = sa.Enum('custom', 'predefined', name='avatartype')
    avatar_type_enum.create(op.get_bind(), checkfirst=True)

    # Add avatar_url column
    op.add_column('user', sa.Column('avatar_url', sa.String(length=500), nullable=True))

    # Add avatar_type column
    op.add_column('user', sa.Column('avatar_type', avatar_type_enum, nullable=True))


def downgrade():
    # Remove columns
    op.drop_column('user', 'avatar_type')
    op.drop_column('user', 'avatar_url')

    # Drop the enum type
    sa.Enum(name='avatartype').drop(op.get_bind(), checkfirst=True)
