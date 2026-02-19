"""add_skill_categories_activity_formats

Revision ID: a1b2c3d4e5f6
Revises: 16568d74bed9
Create Date: 2026-02-12 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '16568d74bed9'
branch_labels = None
depends_on = None


def upgrade():
    # --- skill_categories ---
    op.create_table('skill_categories',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('slug', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('icon', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('color', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('parent_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['parent_id'], ['skill_categories.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(op.f('ix_skill_categories_slug'), 'skill_categories', ['slug'], unique=True)
    op.create_index('ix_skill_categories_is_active', 'skill_categories', ['is_active'], unique=False)

    # --- activity_formats ---
    op.create_table('activity_formats',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('slug', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(op.f('ix_activity_formats_slug'), 'activity_formats', ['slug'], unique=True)

    # --- skill_format_combinations ---
    op.create_table('skill_format_combinations',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('skill_id', sa.Uuid(), nullable=False),
        sa.Column('format_id', sa.Uuid(), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('generation_prompt_key', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.ForeignKeyConstraint(['format_id'], ['activity_formats.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['skill_id'], ['skill_categories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('skill_id', 'format_id', name='uq_skill_format'),
    )
    op.create_index(op.f('ix_skill_format_combinations_skill_id'), 'skill_format_combinations', ['skill_id'], unique=False)
    op.create_index(op.f('ix_skill_format_combinations_format_id'), 'skill_format_combinations', ['format_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_skill_format_combinations_format_id'), table_name='skill_format_combinations')
    op.drop_index(op.f('ix_skill_format_combinations_skill_id'), table_name='skill_format_combinations')
    op.drop_table('skill_format_combinations')
    op.drop_index(op.f('ix_activity_formats_slug'), table_name='activity_formats')
    op.drop_table('activity_formats')
    op.drop_index('ix_skill_categories_is_active', table_name='skill_categories')
    op.drop_index(op.f('ix_skill_categories_slug'), table_name='skill_categories')
    op.drop_table('skill_categories')
