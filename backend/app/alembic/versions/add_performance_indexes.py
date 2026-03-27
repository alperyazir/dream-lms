"""add performance indexes for analytics queries

Revision ID: perf001
Revises: i9303517j1k1
Create Date: 2026-03-26
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "perf001"
down_revision = "i9303517j1k1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PERF-H2: AssignmentStudent.status — used in WHERE clauses throughout analytics
    op.create_index("ix_assignment_students_status", "assignment_students", ["status"])
    # PERF-H3: AssignmentStudent.completed_at — used in ORDER BY and period filtering
    op.create_index(
        "ix_assignment_students_completed_at",
        "assignment_students",
        ["student_id", "completed_at"],
    )
    # Also add missing indexes from medium findings
    op.create_index(
        "ix_direct_messages_parent", "direct_messages", ["parent_message_id"]
    )
    op.create_index(
        "ix_generated_content_skill", "teacher_generated_content", ["skill_id"]
    )
    op.create_index(
        "ix_generated_content_format", "teacher_generated_content", ["format_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_generated_content_format", "teacher_generated_content")
    op.drop_index("ix_generated_content_skill", "teacher_generated_content")
    op.drop_index("ix_direct_messages_parent", "direct_messages")
    op.drop_index("ix_assignment_students_completed_at", "assignment_students")
    op.drop_index("ix_assignment_students_status", "assignment_students")
