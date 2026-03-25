"""add_composite_indexes_for_scaling

Revision ID: k0515739l3m3
Revises: j0414628k2l2
Create Date: 2026-03-03

"""

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "k0515739l3m3"
down_revision = "j0414628k2l2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # P0: hottest paths
    op.create_index(
        "ix_assignment_students_student_assignment",
        "assignment_students",
        ["student_id", "assignment_id"],
        unique=False,
    )
    # P1
    op.create_index(
        "ix_assignments_teacher_created",
        "assignments",
        ["teacher_id", sa.text("created_at DESC")],
        unique=False,
    )
    op.create_index(
        "ix_direct_messages_recipient_unread",
        "direct_messages",
        ["recipient_id"],
        unique=False,
        postgresql_where=sa.text("is_read = false"),
    )
    op.create_index(
        "ix_direct_messages_sender_recipient_sent",
        "direct_messages",
        ["sender_id", "recipient_id", sa.text("sent_at DESC")],
        unique=False,
    )

    # Covering index for assignment list SQL aggregation (status counts)
    op.create_index(
        "ix_assignment_students_assignment_status_score",
        "assignment_students",
        ["assignment_id", "status", "score"],
        unique=False,
    )

    # P2
    op.create_index(
        "ix_student_skill_scores_student_skill_recorded",
        "student_skill_scores",
        ["student_id", "skill_id", sa.text("recorded_at DESC")],
        unique=False,
    )
    op.create_index(
        "ix_feedback_student_draft",
        "feedback",
        ["assignment_student_id", "is_draft"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_feedback_student_draft", table_name="feedback")
    op.drop_index(
        "ix_student_skill_scores_student_skill_recorded",
        table_name="student_skill_scores",
    )
    op.drop_index(
        "ix_direct_messages_sender_recipient_sent", table_name="direct_messages"
    )
    op.drop_index("ix_direct_messages_recipient_unread", table_name="direct_messages")
    op.drop_index("ix_assignments_teacher_created", table_name="assignments")
    op.drop_index(
        "ix_assignment_students_assignment_status_score",
        table_name="assignment_students",
    )
    op.drop_index(
        "ix_assignment_students_student_assignment", table_name="assignment_students"
    )
