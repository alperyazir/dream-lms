"""add_book_assignments_table

Revision ID: 0d7c5fecad93
Revises: e3b6a15801b5
Create Date: 2025-12-04 02:03:11.753484

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0d7c5fecad93'
down_revision = 'e3b6a15801b5'
branch_labels = None
depends_on = None


def upgrade():
    # Create book_assignments table
    op.create_table('book_assignments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('book_id', sa.Uuid(), nullable=False),
        sa.Column('school_id', sa.Uuid(), nullable=True),
        sa.Column('teacher_id', sa.Uuid(), nullable=True),
        sa.Column('assigned_by', sa.Uuid(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False),
        sa.CheckConstraint('school_id IS NOT NULL OR teacher_id IS NOT NULL', name='ck_book_assignment_target'),
        sa.ForeignKeyConstraint(['assigned_by'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('book_id', 'school_id', 'teacher_id', name='uq_book_assignment')
    )
    op.create_index(op.f('ix_book_assignments_assigned_by'), 'book_assignments', ['assigned_by'], unique=False)
    op.create_index(op.f('ix_book_assignments_book_id'), 'book_assignments', ['book_id'], unique=False)
    op.create_index(op.f('ix_book_assignments_school_id'), 'book_assignments', ['school_id'], unique=False)
    op.create_index(op.f('ix_book_assignments_teacher_id'), 'book_assignments', ['teacher_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_book_assignments_teacher_id'), table_name='book_assignments')
    op.drop_index(op.f('ix_book_assignments_school_id'), table_name='book_assignments')
    op.drop_index(op.f('ix_book_assignments_book_id'), table_name='book_assignments')
    op.drop_index(op.f('ix_book_assignments_assigned_by'), table_name='book_assignments')
    op.drop_table('book_assignments')
