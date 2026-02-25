"""add_dcs_content_id_to_generated_content

Revision ID: j0414628k2l2
Revises: i9303517j1k1
Create Date: 2026-02-22

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'j0414628k2l2'
down_revision = 'ffdeff5678fd'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'teacher_generated_content',
        sa.Column('dcs_content_id', sa.String(), nullable=True),
    )


def downgrade():
    op.drop_column('teacher_generated_content', 'dcs_content_id')
