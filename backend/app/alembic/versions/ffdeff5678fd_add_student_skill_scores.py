"""add_student_skill_scores

Revision ID: ffdeff5678fd
Revises: c3d4e5f6a7b8
Create Date: 2026-02-13 02:05:12.024662

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = 'ffdeff5678fd'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('student_skill_scores',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('student_id', sa.Uuid(), nullable=False),
    sa.Column('skill_id', sa.Uuid(), nullable=False),
    sa.Column('assignment_id', sa.Uuid(), nullable=False),
    sa.Column('assignment_student_id', sa.Uuid(), nullable=False),
    sa.Column('attributed_score', sa.Float(), nullable=False),
    sa.Column('attributed_max_score', sa.Float(), nullable=False),
    sa.Column('weight', sa.Float(), nullable=False),
    sa.Column('cefr_level', sqlmodel.sql.sqltypes.AutoString(length=5), nullable=True),
    sa.Column('recorded_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['assignment_student_id'], ['assignment_students.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['skill_id'], ['skill_categories.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('assignment_student_id', 'skill_id', name='uq_student_skill_score_assignment_skill')
    )
    op.create_index(op.f('ix_student_skill_scores_assignment_id'), 'student_skill_scores', ['assignment_id'], unique=False)
    op.create_index(op.f('ix_student_skill_scores_assignment_student_id'), 'student_skill_scores', ['assignment_student_id'], unique=False)
    op.create_index(op.f('ix_student_skill_scores_skill_id'), 'student_skill_scores', ['skill_id'], unique=False)
    op.create_index(op.f('ix_student_skill_scores_student_id'), 'student_skill_scores', ['student_id'], unique=False)
    op.create_index('ix_student_skill_scores_student_recorded', 'student_skill_scores', ['student_id', 'recorded_at'], unique=False)
    op.create_index('ix_student_skill_scores_student_skill', 'student_skill_scores', ['student_id', 'skill_id'], unique=False)


def downgrade():
    op.drop_index('ix_student_skill_scores_student_skill', table_name='student_skill_scores')
    op.drop_index('ix_student_skill_scores_student_recorded', table_name='student_skill_scores')
    op.drop_index(op.f('ix_student_skill_scores_student_id'), table_name='student_skill_scores')
    op.drop_index(op.f('ix_student_skill_scores_skill_id'), table_name='student_skill_scores')
    op.drop_index(op.f('ix_student_skill_scores_assignment_student_id'), table_name='student_skill_scores')
    op.drop_index(op.f('ix_student_skill_scores_assignment_id'), table_name='student_skill_scores')
    op.drop_table('student_skill_scores')
