"""add webhook event logs table

Revision ID: 219e0abc2883
Revises: de763a3332c6
Create Date: 2025-11-15 23:07:39.821269

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '219e0abc2883'
down_revision = 'de763a3332c6'
branch_labels = None
depends_on = None


def upgrade():
    # Create webhook_event_logs table
    # Note: Enum types will be created automatically by SQLAlchemy if they don't exist
    op.create_table(
        'webhook_event_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('event_type', sa.Enum('book.created', 'book.updated', 'book.deleted', name='webhookeventtype', create_type=True), nullable=False),
        sa.Column('book_id', sa.Integer(), nullable=True),
        sa.Column('payload_json', sa.JSON(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'processing', 'success', 'failed', 'retrying', name='webhookeventstatus', create_type=True), nullable=False),
        sa.Column('retry_count', sa.Integer(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('idx_webhook_event_logs_event_type', 'webhook_event_logs', ['event_type'])
    op.create_index('idx_webhook_event_logs_book_id', 'webhook_event_logs', ['book_id'])
    op.create_index('idx_webhook_event_logs_status', 'webhook_event_logs', ['status'])
    op.create_index('idx_webhook_event_logs_created_at', 'webhook_event_logs', ['created_at'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_webhook_event_logs_created_at', table_name='webhook_event_logs')
    op.drop_index('idx_webhook_event_logs_status', table_name='webhook_event_logs')
    op.drop_index('idx_webhook_event_logs_book_id', table_name='webhook_event_logs')
    op.drop_index('idx_webhook_event_logs_event_type', table_name='webhook_event_logs')

    # Drop table
    op.drop_table('webhook_event_logs')

    # Drop enum types (if not used by other tables)
    op.execute('DROP TYPE IF EXISTS webhookeventstatus')
    op.execute('DROP TYPE IF EXISTS webhookeventtype')
