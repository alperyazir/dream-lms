"""add_direct_messages_table

Revision ID: c3047193e5b5
Revises: b2036082d2a4
Create Date: 2025-12-02 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c3047193e5b5'
down_revision = 'b2036082d2a4'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()

    # Check if table exists
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'direct_messages')"
    ))
    table_exists = result.scalar()

    if not table_exists:
        bind.execute(sa.text("""
            CREATE TABLE direct_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sender_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                recipient_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                subject VARCHAR(500),
                body TEXT NOT NULL,
                parent_message_id UUID REFERENCES direct_messages(id) ON DELETE SET NULL,
                is_read BOOLEAN NOT NULL DEFAULT false,
                sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT no_self_messaging CHECK (sender_id != recipient_id)
            )
        """))

        # Create indexes
        bind.execute(sa.text('CREATE INDEX ix_direct_messages_sender_id ON direct_messages(sender_id)'))
        bind.execute(sa.text('CREATE INDEX ix_direct_messages_recipient_id ON direct_messages(recipient_id)'))
        bind.execute(sa.text('CREATE INDEX ix_direct_messages_sent_at ON direct_messages(sent_at DESC)'))
        bind.execute(sa.text('CREATE INDEX ix_direct_messages_is_read ON direct_messages(is_read)'))


def downgrade():
    bind = op.get_bind()

    # Check if table exists before dropping
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'direct_messages')"
    ))
    table_exists = result.scalar()

    if table_exists:
        bind.execute(sa.text('DROP TABLE direct_messages'))
