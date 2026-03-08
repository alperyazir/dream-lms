"""drop_notification_tables

Revision ID: m2737961n5o5
Revises: l1626850m4n4
Create Date: 2026-03-04

"""
import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "m2737961n5o5"
down_revision = "l1626850m4n4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("notification_mutes")
    op.drop_table("notification_preferences")
    op.drop_table("notifications")
    # Drop the enum type used by notification columns
    sa.Enum(name="notification_type").drop(op.get_bind(), checkfirst=True)
    # Also drop the notificationtype enum if it exists (some ORMs create both)
    sa.Enum(name="notificationtype").drop(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    # Recreate enum type
    notification_type = sa.Enum(
        "assignment_created",
        "deadline_approaching",
        "feedback_received",
        "message_received",
        "student_completed",
        "past_due",
        "material_shared",
        "system_announcement",
        "password_reset",
        "announcement",
        name="notification_type",
    )
    notification_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", notification_type, nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("link", sa.String(500), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])

    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("notification_type", notification_type, nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.UniqueConstraint("user_id", "notification_type", name="uq_user_notification_type"),
    )
    op.create_index("ix_notification_preferences_user_id", "notification_preferences", ["user_id"])

    op.create_table(
        "notification_mutes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("muted_until", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_notification_mutes_user_id", "notification_mutes", ["user_id"])
