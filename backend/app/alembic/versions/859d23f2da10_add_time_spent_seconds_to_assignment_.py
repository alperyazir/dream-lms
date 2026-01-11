"""add_time_spent_seconds_to_assignment_students

Revision ID: 859d23f2da10
Revises: f3018f9b6fe7
Create Date: 2026-01-10 00:46:04.163402

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '859d23f2da10'
down_revision = 'f3018f9b6fe7'
branch_labels = None
depends_on = None


def upgrade():
    # Add time_spent_seconds column with default 0
    op.add_column('assignment_students', sa.Column('time_spent_seconds', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    op.drop_column('assignment_students', 'time_spent_seconds')
