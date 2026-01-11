"""add_ai_usage_tracking_to_teachers

Revision ID: d6c197a3345f
Revises: c5b086a2234e
Create Date: 2026-01-08 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd6c197a3345f'
down_revision = 'c5b086a2234e'
branch_labels = None
depends_on = None


def upgrade():
    # Add AI usage tracking columns to teachers table
    op.add_column('teachers', sa.Column('ai_generations_used', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('teachers', sa.Column('ai_quota_reset_date', sa.DateTime(), nullable=False, server_default=sa.func.now()))


def downgrade():
    # Remove AI usage tracking columns from teachers table
    op.drop_column('teachers', 'ai_quota_reset_date')
    op.drop_column('teachers', 'ai_generations_used')
