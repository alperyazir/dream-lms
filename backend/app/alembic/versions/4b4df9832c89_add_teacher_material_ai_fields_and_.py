"""add_teacher_material_ai_fields_and_generated_content

Revision ID: 4b4df9832c89
Revises: 8a9c7956a1ab
Create Date: 2026-01-02 18:49:34.943528

Story 27.15: Teacher Materials Processing
- Add AI processing fields to teacher_materials (extracted_text, word_count, language)
- Create teacher_generated_content table for storing AI-generated activities
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '4b4df9832c89'
down_revision = '8a9c7956a1ab'
branch_labels = None
depends_on = None


def upgrade():
    # Create teacher_generated_content table
    op.create_table('teacher_generated_content',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('teacher_id', sa.Uuid(), nullable=False),
        sa.Column('material_id', sa.Uuid(), nullable=True),
        sa.Column('book_id', sa.Integer(), nullable=True),
        sa.Column('activity_type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('content', sa.JSON(), nullable=True),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('assignment_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['material_id'], ['teacher_materials.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_generated_content_material', 'teacher_generated_content', ['material_id'], unique=False)
    op.create_index('idx_generated_content_teacher', 'teacher_generated_content', ['teacher_id'], unique=False)

    # Add AI processing fields to teacher_materials
    op.add_column('teacher_materials', sa.Column('extracted_text', sa.Text(), nullable=True))
    op.add_column('teacher_materials', sa.Column('word_count', sa.Integer(), nullable=True))
    op.add_column('teacher_materials', sa.Column('language', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=True))


def downgrade():
    # Remove AI processing fields from teacher_materials
    op.drop_column('teacher_materials', 'language')
    op.drop_column('teacher_materials', 'word_count')
    op.drop_column('teacher_materials', 'extracted_text')

    # Drop teacher_generated_content table
    op.drop_index('idx_generated_content_teacher', table_name='teacher_generated_content')
    op.drop_index('idx_generated_content_material', table_name='teacher_generated_content')
    op.drop_table('teacher_generated_content')
