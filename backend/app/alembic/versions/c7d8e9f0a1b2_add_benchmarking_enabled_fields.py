"""Add benchmarking_enabled fields to schools and publishers

Revision ID: c7d8e9f0a1b2
Revises: b5c6d7e8f9a0
Create Date: 2025-11-29

Story 5.7: Performance Comparison & Benchmarking - AC: 9
Adds benchmarking_enabled boolean field to schools and publishers tables
to allow privacy controls for benchmark data display.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c7d8e9f0a1b2"
down_revision = "b5c6d7e8f9a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add benchmarking_enabled to schools table (default True)
    op.add_column(
        "schools",
        sa.Column(
            "benchmarking_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )

    # Add benchmarking_enabled to publishers table (default True)
    op.add_column(
        "publishers",
        sa.Column(
            "benchmarking_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )


def downgrade() -> None:
    op.drop_column("publishers", "benchmarking_enabled")
    op.drop_column("schools", "benchmarking_enabled")
