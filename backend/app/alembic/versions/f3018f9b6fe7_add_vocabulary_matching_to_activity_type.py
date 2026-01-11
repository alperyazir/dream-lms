"""add_vocabulary_matching_to_activity_type

Revision ID: f3018f9b6fe7
Revises: d6c197a3345f
Create Date: 2026-01-08 22:25:42.016178

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'f3018f9b6fe7'
down_revision = 'd6c197a3345f'
branch_labels = None
depends_on = None


def upgrade():
    # Add vocabulary_matching to the activitytype enum
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'vocabulary_matching'")


def downgrade():
    # PostgreSQL doesn't support removing enum values easily
    # Would require recreating the enum type and all dependent columns
    pass
