"""add_skill_fields_to_assignments

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-12 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Add nullable skill classification columns to assignments (backward compatible)
    op.add_column('assignments', sa.Column('primary_skill_id', sa.Uuid(), nullable=True))
    op.add_column('assignments', sa.Column('activity_format_id', sa.Uuid(), nullable=True))
    op.add_column('assignments', sa.Column('is_mix_mode', sa.Boolean(), nullable=False, server_default='false'))

    op.create_foreign_key(
        'fk_assignments_primary_skill_id',
        'assignments', 'skill_categories',
        ['primary_skill_id'], ['id'],
    )
    op.create_foreign_key(
        'fk_assignments_activity_format_id',
        'assignments', 'activity_formats',
        ['activity_format_id'], ['id'],
    )
    op.create_index(op.f('ix_assignments_primary_skill_id'), 'assignments', ['primary_skill_id'], unique=False)
    op.create_index(op.f('ix_assignments_activity_format_id'), 'assignments', ['activity_format_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_assignments_activity_format_id'), table_name='assignments')
    op.drop_index(op.f('ix_assignments_primary_skill_id'), table_name='assignments')
    op.drop_constraint('fk_assignments_activity_format_id', 'assignments', type_='foreignkey')
    op.drop_constraint('fk_assignments_primary_skill_id', 'assignments', type_='foreignkey')
    op.drop_column('assignments', 'is_mix_mode')
    op.drop_column('assignments', 'activity_format_id')
    op.drop_column('assignments', 'primary_skill_id')
