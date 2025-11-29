"""add_report_tables

Revision ID: b5c6d7e8f9a0
Revises: adbf3a221238
Create Date: 2025-11-29 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'b5c6d7e8f9a0'
down_revision = 'adbf3a221238'
branch_labels = None
depends_on = None


def upgrade():
    # Create report_jobs table
    op.create_table('report_jobs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('teacher_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'processing', 'completed', 'failed', name='reportjobstatusenum'), nullable=False),
        sa.Column('report_type', sa.Enum('student', 'class', 'assignment', name='reporttypeenum'), nullable=False),
        sa.Column('template_type', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('config_json', sa.JSON(), nullable=False),
        sa.Column('file_path', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('progress_percentage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_report_jobs_teacher_id'), 'report_jobs', ['teacher_id'], unique=False)
    op.create_index(op.f('ix_report_jobs_status'), 'report_jobs', ['status'], unique=False)
    op.create_index(op.f('ix_report_jobs_expires_at'), 'report_jobs', ['expires_at'], unique=False)

    # Create saved_report_configs table
    op.create_table('saved_report_configs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('teacher_id', sa.Uuid(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('config_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_saved_report_configs_teacher_id'), 'saved_report_configs', ['teacher_id'], unique=False)


def downgrade():
    # Drop saved_report_configs table
    op.drop_index(op.f('ix_saved_report_configs_teacher_id'), table_name='saved_report_configs')
    op.drop_table('saved_report_configs')

    # Drop report_jobs table
    op.drop_index(op.f('ix_report_jobs_expires_at'), table_name='report_jobs')
    op.drop_index(op.f('ix_report_jobs_status'), table_name='report_jobs')
    op.drop_index(op.f('ix_report_jobs_teacher_id'), table_name='report_jobs')
    op.drop_table('report_jobs')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS reportjobstatusenum')
    op.execute('DROP TYPE IF EXISTS reporttypeenum')
