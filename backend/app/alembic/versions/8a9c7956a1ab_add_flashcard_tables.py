"""add_flashcard_tables

Revision ID: 8a9c7956a1ab
Revises: cf986708f683
Create Date: 2026-01-02 16:21:24.233832

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = '8a9c7956a1ab'
down_revision = 'cf986708f683'
branch_labels = None
depends_on = None


def upgrade():
    # Create flashcard_sets table
    op.create_table('flashcard_sets',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column('teacher_id', sa.Uuid(), nullable=False),
        sa.Column('class_id', sa.Uuid(), nullable=True),
        sa.Column('book_id', sa.Integer(), nullable=True),
        sa.Column('module_ids', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_flashcard_set_class', 'flashcard_sets', ['class_id'], unique=False)
    op.create_index('idx_flashcard_set_teacher', 'flashcard_sets', ['teacher_id'], unique=False)

    # Create flashcards table
    op.create_table('flashcards',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('set_id', sa.Uuid(), nullable=False),
        sa.Column('word', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('definition', sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=False),
        sa.Column('translation', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('example', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column('part_of_speech', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column('audio_url', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('cefr_level', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=True),
        sa.Column('vocabulary_id', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['set_id'], ['flashcard_sets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_flashcard_set', 'flashcards', ['set_id'], unique=False)

    # Create student_flashcard_progress table (enum is created automatically)
    op.create_table('student_flashcard_progress',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('student_id', sa.Uuid(), nullable=False),
        sa.Column('flashcard_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.Enum('new', 'learning', 'known', name='flashcard_progress_status'), nullable=False),
        sa.Column('correct_count', sa.Integer(), nullable=False),
        sa.Column('incorrect_count', sa.Integer(), nullable=False),
        sa.Column('last_reviewed', sa.DateTime(), nullable=True),
        sa.Column('next_review', sa.DateTime(), nullable=True),
        sa.Column('ease_factor', sa.Float(), nullable=False),
        sa.Column('interval', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['flashcard_id'], ['flashcards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'flashcard_id', name='uq_student_flashcard_progress')
    )
    op.create_index('idx_progress_next_review', 'student_flashcard_progress', ['next_review'], unique=False)
    op.create_index('idx_progress_student', 'student_flashcard_progress', ['student_id'], unique=False)


def downgrade():
    # Drop student_flashcard_progress table
    op.drop_index('idx_progress_student', table_name='student_flashcard_progress')
    op.drop_index('idx_progress_next_review', table_name='student_flashcard_progress')
    op.drop_table('student_flashcard_progress')

    # Drop flashcards table
    op.drop_index('idx_flashcard_set', table_name='flashcards')
    op.drop_table('flashcards')

    # Drop flashcard_sets table
    op.drop_index('idx_flashcard_set_teacher', table_name='flashcard_sets')
    op.drop_index('idx_flashcard_set_class', table_name='flashcard_sets')
    op.drop_table('flashcard_sets')

    # Drop enum type
    sa.Enum(name='flashcard_progress_status').drop(op.get_bind(), checkfirst=True)
