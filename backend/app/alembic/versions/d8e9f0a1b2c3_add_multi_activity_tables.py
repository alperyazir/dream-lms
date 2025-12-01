"""Add multi-activity assignment tables

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
Create Date: 2025-11-29

Story 8.1: Multi-Activity Assignment Data Model
- Creates assignment_activities junction table
- Creates assignment_student_activities table for per-activity progress
- Migrates existing single-activity assignments to use junction table
- Makes activity_id nullable on assignments table for backward compatibility
"""

import json

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "d8e9f0a1b2c3"
down_revision = "c7d8e9f0a1b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create assignment_student_activity_status enum (if not exists)
    connection = op.get_bind()
    connection.execute(
        sa.text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignmentstudentactivitystatus') THEN
                    CREATE TYPE assignmentstudentactivitystatus AS ENUM ('not_started', 'in_progress', 'completed');
                END IF;
            END
            $$;
        """)
    )

    # Create assignment_activities junction table
    op.create_table(
        'assignment_activities',
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('assignment_id', sa.Uuid(), nullable=False),
        sa.Column('activity_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('assignment_id', 'activity_id', name='uq_assignment_activity')
    )
    op.create_index(
        op.f('ix_assignment_activities_assignment_id'),
        'assignment_activities',
        ['assignment_id'],
        unique=False
    )
    op.create_index(
        op.f('ix_assignment_activities_activity_id'),
        'assignment_activities',
        ['activity_id'],
        unique=False
    )

    # Create assignment_student_activities table
    op.create_table(
        'assignment_student_activities',
        sa.Column('status', postgresql.ENUM('not_started', 'in_progress', 'completed', name='assignmentstudentactivitystatus', create_type=False), nullable=False, server_default='not_started'),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('max_score', sa.Float(), nullable=False, server_default='100.0'),
        sa.Column('response_data', sa.JSON(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('assignment_student_id', sa.Uuid(), nullable=False),
        sa.Column('activity_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['assignment_student_id'], ['assignment_students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('assignment_student_id', 'activity_id', name='uq_assignment_student_activity')
    )
    op.create_index(
        op.f('ix_assignment_student_activities_assignment_student_id'),
        'assignment_student_activities',
        ['assignment_student_id'],
        unique=False
    )
    op.create_index(
        op.f('ix_assignment_student_activities_activity_id'),
        'assignment_student_activities',
        ['activity_id'],
        unique=False
    )

    # Data migration: Create AssignmentActivity records for existing assignments
    # For each existing assignment with activity_id, create junction table record
    # Get all existing assignments with activity_id
    assignments = connection.execute(
        sa.text("SELECT id, activity_id FROM assignments WHERE activity_id IS NOT NULL")
    ).fetchall()

    # Insert into assignment_activities junction table
    for assignment in assignments:
        connection.execute(
            sa.text("""
                INSERT INTO assignment_activities (id, assignment_id, activity_id, order_index)
                VALUES (gen_random_uuid(), :assignment_id, :activity_id, 0)
            """),
            {"assignment_id": assignment.id, "activity_id": assignment.activity_id}
        )

    # Data migration: Create AssignmentStudentActivity records for existing assignment_students
    # Copy status, score, and answers from assignment_students to assignment_student_activities
    assignment_students = connection.execute(
        sa.text("""
            SELECT
                ast.id as assignment_student_id,
                a.activity_id,
                ast.status,
                ast.score,
                ast.answers_json,
                ast.started_at,
                ast.completed_at
            FROM assignment_students ast
            JOIN assignments a ON ast.assignment_id = a.id
            WHERE a.activity_id IS NOT NULL
        """)
    ).fetchall()

    for as_record in assignment_students:
        # Map AssignmentStatus to AssignmentStudentActivityStatus (they have same values)
        status = as_record.status if as_record.status else 'not_started'
        # Convert dict to JSON string for proper insertion
        response_data_json = json.dumps(as_record.answers_json) if as_record.answers_json else None

        connection.execute(
            sa.text("""
                INSERT INTO assignment_student_activities
                (id, assignment_student_id, activity_id, status, score, max_score, response_data, started_at, completed_at)
                VALUES (
                    gen_random_uuid(),
                    :assignment_student_id,
                    :activity_id,
                    :status,
                    :score,
                    100.0,
                    CAST(:response_data AS jsonb),
                    :started_at,
                    :completed_at
                )
            """),
            {
                "assignment_student_id": as_record.assignment_student_id,
                "activity_id": as_record.activity_id,
                "status": status,
                "score": as_record.score,
                "response_data": response_data_json,
                "started_at": as_record.started_at,
                "completed_at": as_record.completed_at
            }
        )

    # Make activity_id nullable on assignments table (keeping for backward compatibility)
    op.alter_column(
        'assignments',
        'activity_id',
        existing_type=sa.Uuid(),
        nullable=True
    )


def downgrade() -> None:
    # Make activity_id NOT NULL again on assignments table
    # First, ensure all assignments have an activity_id from the junction table
    connection = op.get_bind()

    # Update assignments with activity_id from junction table (first activity)
    connection.execute(
        sa.text("""
            UPDATE assignments a
            SET activity_id = (
                SELECT aa.activity_id
                FROM assignment_activities aa
                WHERE aa.assignment_id = a.id
                ORDER BY aa.order_index
                LIMIT 1
            )
            WHERE a.activity_id IS NULL
        """)
    )

    op.alter_column(
        'assignments',
        'activity_id',
        existing_type=sa.Uuid(),
        nullable=False
    )

    # Drop assignment_student_activities table
    op.drop_index(op.f('ix_assignment_student_activities_activity_id'), table_name='assignment_student_activities')
    op.drop_index(op.f('ix_assignment_student_activities_assignment_student_id'), table_name='assignment_student_activities')
    op.drop_table('assignment_student_activities')

    # Drop assignment_activities junction table
    op.drop_index(op.f('ix_assignment_activities_activity_id'), table_name='assignment_activities')
    op.drop_index(op.f('ix_assignment_activities_assignment_id'), table_name='assignment_activities')
    op.drop_table('assignment_activities')

    # Drop the enum type
    op.execute("DROP TYPE IF EXISTS assignmentstudentactivitystatus")
