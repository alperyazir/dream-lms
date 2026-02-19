"""add_skill_fields_to_content_library

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-02-13 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    # Add nullable skill classification columns to teacher_generated_content
    op.add_column('teacher_generated_content', sa.Column('skill_id', sa.Uuid(), nullable=True))
    op.add_column('teacher_generated_content', sa.Column('format_id', sa.Uuid(), nullable=True))

    op.create_foreign_key(
        'fk_generated_content_skill_id',
        'teacher_generated_content', 'skill_categories',
        ['skill_id'], ['id'],
    )
    op.create_foreign_key(
        'fk_generated_content_format_id',
        'teacher_generated_content', 'activity_formats',
        ['format_id'], ['id'],
    )


def downgrade():
    op.drop_constraint('fk_generated_content_format_id', 'teacher_generated_content', type_='foreignkey')
    op.drop_constraint('fk_generated_content_skill_id', 'teacher_generated_content', type_='foreignkey')
    op.drop_column('teacher_generated_content', 'format_id')
    op.drop_column('teacher_generated_content', 'skill_id')
