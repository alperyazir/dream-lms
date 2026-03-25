"""drop_announcement_tables

Revision ID: n3848072o6p6
Revises: m2737961n5o5
Create Date: 2026-03-05

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "n3848072o6p6"
down_revision = "m2737961n5o5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS announcement_reads")
    op.execute("DROP TABLE IF EXISTS announcement_recipients")
    op.execute("DROP TABLE IF EXISTS announcements")


def downgrade() -> None:
    # Announcements feature removed — no downgrade path.
    pass
