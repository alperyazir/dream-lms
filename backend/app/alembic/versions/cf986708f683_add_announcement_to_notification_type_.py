"""add_announcement_to_notification_type_enum

Revision ID: cf986708f683
Revises: 860023313fd4
Create Date: 2025-12-29 01:02:18.872168

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'cf986708f683'
down_revision = '860023313fd4'
branch_labels = None
depends_on = None


def upgrade():
    # Add 'announcement' to the notification_type enum
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'announcement'")


def downgrade():
    # Note: PostgreSQL does not support removing enum values
    # This would require recreating the enum type, which is complex
    # For now, we'll leave the value in place during downgrade
    pass
