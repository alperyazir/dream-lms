"""add_feedback_table

Revision ID: d4058193f6c6
Revises: c3047193e5b5
Create Date: 2025-12-02 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd4058193f6c6'
down_revision = 'c3047193e5b5'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()

    # Check if table exists
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback')"
    ))
    table_exists = result.scalar()

    if not table_exists:
        bind.execute(sa.text("""
            CREATE TABLE feedback (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                assignment_student_id UUID UNIQUE NOT NULL REFERENCES assignment_students(id) ON DELETE CASCADE,
                teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
                feedback_text TEXT,
                badges JSONB DEFAULT '[]',
                emoji_reactions JSONB DEFAULT '[]',
                is_draft BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Create indexes
        bind.execute(sa.text('CREATE INDEX ix_feedback_assignment_student_id ON feedback(assignment_student_id)'))
        bind.execute(sa.text('CREATE INDEX ix_feedback_teacher_id ON feedback(teacher_id)'))


def downgrade():
    bind = op.get_bind()

    # Check if table exists before dropping
    result = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'feedback')"
    ))
    table_exists = result.scalar()

    if table_exists:
        bind.execute(sa.text('DROP TABLE feedback'))
