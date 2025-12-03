"""add_notification_preferences_tables

Revision ID: 30d090fa740d
Revises: e5169284f7d7
Create Date: 2025-12-02 23:17:53.912247

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '30d090fa740d'
down_revision = 'e5169284f7d7'
branch_labels = None
depends_on = None


# Reuse the existing notification_type enum
notification_type_enum = postgresql.ENUM(
    'assignment_created', 'deadline_approaching', 'feedback_received',
    'message_received', 'student_completed', 'past_due',
    'material_shared', 'system_announcement',
    name='notification_type',
    create_type=False  # The enum already exists from Story 6.1
)


def upgrade():
    # Create notification_mutes table for global mute feature
    op.create_table('notification_mutes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('muted_until', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notification_mutes_user_id'), 'notification_mutes', ['user_id'], unique=True)

    # Create notification_preferences table
    op.create_table('notification_preferences',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('notification_type', notification_type_enum, nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('email_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'notification_type', name='uq_user_notification_type')
    )
    op.create_index(op.f('ix_notification_preferences_user_id'), 'notification_preferences', ['user_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_notification_preferences_user_id'), table_name='notification_preferences')
    op.drop_table('notification_preferences')
    op.drop_index(op.f('ix_notification_mutes_user_id'), table_name='notification_mutes')
    op.drop_table('notification_mutes')
