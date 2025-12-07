"""add_password_reset_notification_type

Revision ID: e3b6a15801b5
Revises: 2be781174e86
Create Date: 2025-12-04 00:49:30.733245

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'e3b6a15801b5'
down_revision = '2be781174e86'
branch_labels = None
depends_on = None


def upgrade():
    # Add 'password_reset' value to notification_type enum
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'password_reset'")


def downgrade():
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum type, which is complex
    # For safety, we leave this as a no-op
    pass
