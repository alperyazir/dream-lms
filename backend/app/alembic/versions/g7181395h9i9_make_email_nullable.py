"""Make email nullable for students

Revision ID: g7181395h9i9
Revises: f6070294g8h8, df133772efdf
Create Date: 2025-12-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g7181395h9i9'
down_revision = ('f6070294g8h8', 'df133772efdf')
branch_labels = None
depends_on = None


def upgrade():
    # Make email column nullable
    op.alter_column('user', 'email',
                    existing_type=sa.String(length=255),
                    nullable=True)


def downgrade():
    # Make email column NOT NULL again
    # Note: This will fail if there are any NULL emails in the database
    op.alter_column('user', 'email',
                    existing_type=sa.String(length=255),
                    nullable=False)
