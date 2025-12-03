"""add_notification_model

Revision ID: b2036082d2a4
Revises: d8e9f0a1b2c3
Create Date: 2025-12-01 23:28:35.899839

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b2036082d2a4'
down_revision = 'd8e9f0a1b2c3'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()

    # Check if enum exists
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = 'notification_type')"
    ))
    enum_exists = result.scalar()

    if not enum_exists:
        bind.execute(sa.text("""
            CREATE TYPE notification_type AS ENUM (
                'assignment_created',
                'deadline_approaching',
                'feedback_received',
                'message_received',
                'student_completed',
                'past_due',
                'material_shared',
                'system_announcement'
            )
        """))

    # Check if table exists
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications')"
    ))
    table_exists = result.scalar()

    if not table_exists:
        bind.execute(sa.text("""
            CREATE TABLE notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                type notification_type NOT NULL,
                title VARCHAR(500) NOT NULL,
                message TEXT NOT NULL,
                link VARCHAR(500),
                is_read BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Create indexes
        bind.execute(sa.text('CREATE INDEX ix_notifications_user_id ON notifications(user_id)'))
        bind.execute(sa.text('CREATE INDEX ix_notifications_is_read ON notifications(is_read)'))
        bind.execute(sa.text('CREATE INDEX ix_notifications_created_at ON notifications(created_at DESC)'))
        bind.execute(sa.text('CREATE INDEX ix_notifications_type ON notifications(type)'))


def downgrade():
    bind = op.get_bind()

    # Check if table exists before dropping
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications')"
    ))
    table_exists = result.scalar()

    if table_exists:
        bind.execute(sa.text('DROP TABLE notifications'))

    # Check if enum exists before dropping
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = 'notification_type')"
    ))
    enum_exists = result.scalar()

    if enum_exists:
        bind.execute(sa.text('DROP TYPE notification_type'))
