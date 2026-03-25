"""enhance_direct_messages

Revision ID: l1626850m4n4
Revises: k0515739l3m3
Create Date: 2026-03-04

"""

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "l1626850m4n4"
down_revision = "k0515739l3m3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add system message columns to direct_messages
    op.add_column(
        "direct_messages",
        sa.Column(
            "is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
    )
    op.add_column(
        "direct_messages",
        sa.Column("context_type", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "direct_messages",
        sa.Column("context_id", sa.Uuid(), nullable=True),
    )
    op.add_column(
        "direct_messages",
        sa.Column("message_category", sa.String(length=50), nullable=True),
    )

    # Add indexes
    op.create_index("ix_direct_messages_is_system", "direct_messages", ["is_system"])
    op.create_index("ix_direct_messages_context_id", "direct_messages", ["context_id"])
    op.create_index(
        "ix_direct_messages_context_type_context_id",
        "direct_messages",
        ["context_type", "context_id"],
    )

    # Drop old constraint and recreate with is_system exemption
    op.drop_constraint("no_self_messaging", "direct_messages", type_="check")
    op.create_check_constraint(
        "no_self_messaging",
        "direct_messages",
        "sender_id != recipient_id OR is_system = true",
    )


def downgrade() -> None:
    op.drop_constraint("no_self_messaging", "direct_messages", type_="check")
    op.create_check_constraint(
        "no_self_messaging",
        "direct_messages",
        "sender_id != recipient_id",
    )
    op.drop_index("ix_direct_messages_context_type_context_id", "direct_messages")
    op.drop_index("ix_direct_messages_context_id", "direct_messages")
    op.drop_index("ix_direct_messages_is_system", "direct_messages")
    op.drop_column("direct_messages", "message_category")
    op.drop_column("direct_messages", "context_id")
    op.drop_column("direct_messages", "context_type")
    op.drop_column("direct_messages", "is_system")
