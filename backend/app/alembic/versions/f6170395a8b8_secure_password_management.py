"""secure_password_management

Revision ID: f6170395a8b8
Revises: 9fff7de2bcfa
Create Date: 2025-12-08 22:20:00.000000

This migration removes the insecure initial_password field and adds
must_change_password flag for secure password management.

Security: Removes plaintext password storage from database.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f6170395a8b8'
down_revision = '9fff7de2bcfa'
branch_labels = None
depends_on = None


def upgrade():
    # Add new column first (non-breaking change)
    op.add_column(
        'user',
        sa.Column(
            'must_change_password',
            sa.Boolean(),
            nullable=False,
            server_default='false'
        )
    )

    # Remove old column (breaking change for security)
    op.drop_column('user', 'initial_password')


def downgrade():
    # Add back initial_password column
    op.add_column(
        'user',
        sa.Column(
            'initial_password',
            sa.String(255),
            nullable=True
        )
    )

    # Remove must_change_password column
    op.drop_column('user', 'must_change_password')
