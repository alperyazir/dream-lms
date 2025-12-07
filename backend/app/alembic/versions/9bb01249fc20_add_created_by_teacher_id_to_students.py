"""add_created_by_teacher_id_to_students

Revision ID: 9bb01249fc20
Revises: 0d7c5fecad93
Create Date: 2025-12-05 15:50:50.781311

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '9bb01249fc20'
down_revision = '0d7c5fecad93'
branch_labels = None
depends_on = None


def upgrade():
    # Add created_by_teacher_id column to students table
    op.add_column('students', sa.Column('created_by_teacher_id', sa.Uuid(), nullable=True))
    op.create_index(op.f('ix_students_created_by_teacher_id'), 'students', ['created_by_teacher_id'], unique=False)
    op.create_foreign_key('fk_students_created_by_teacher_id', 'students', 'teachers', ['created_by_teacher_id'], ['id'], ondelete='SET NULL')


def downgrade():
    op.drop_constraint('fk_students_created_by_teacher_id', 'students', type_='foreignkey')
    op.drop_index(op.f('ix_students_created_by_teacher_id'), table_name='students')
    op.drop_column('students', 'created_by_teacher_id')
