"""Drop email columns from user and student tables

Revision ID: p5060294q8r8
Revises: o4959183p7q7
Create Date: 2026-04-03
"""

from alembic import op

revision = "p5060294q8r8"
down_revision = "o4959183p7q7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop email index first, then column
    op.drop_index("ix_user_email", table_name="user", if_exists=True)
    op.drop_column("user", "email")
    op.drop_column("students", "parent_email")


def downgrade() -> None:
    import sqlalchemy as sa

    op.add_column("user", sa.Column("email", sa.String(255), nullable=True))
    op.create_index("ix_user_email", "user", ["email"], unique=True)
    op.add_column("students", sa.Column("parent_email", sa.String(255), nullable=True))
