"""add_publisher_id_to_webhook_event_logs

Revision ID: a68a623c28cd
Revises: 74fccd3da614
Create Date: 2025-12-21 00:57:54.054400

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a68a623c28cd'
down_revision = '74fccd3da614'
branch_labels = None
depends_on = None


def upgrade():
    # Add publisher_id column to webhook_event_logs table
    op.add_column('webhook_event_logs', sa.Column('publisher_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_webhook_event_logs_publisher_id'), 'webhook_event_logs', ['publisher_id'], unique=False)


def downgrade():
    # Remove publisher_id column from webhook_event_logs table
    op.drop_index(op.f('ix_webhook_event_logs_publisher_id'), table_name='webhook_event_logs')
    op.drop_column('webhook_event_logs', 'publisher_id')
