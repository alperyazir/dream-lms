"""add_ai_usage_log_table

Revision ID: 387cc48be471
Revises: ab7fc7b881d2
Create Date: 2026-01-02 22:50:37.275921

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = '387cc48be471'
down_revision = 'ab7fc7b881d2'
branch_labels = None
depends_on = None


def upgrade():
    # Create ai_usage_logs table
    op.create_table('ai_usage_logs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('teacher_id', sa.Uuid(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('operation_type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('activity_type', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('provider', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('input_tokens', sa.Integer(), nullable=False),
        sa.Column('output_tokens', sa.Integer(), nullable=False),
        sa.Column('audio_characters', sa.Integer(), nullable=False),
        sa.Column('estimated_cost', sa.Float(), nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('error_message', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_ai_usage_activity_type', 'ai_usage_logs', ['activity_type'], unique=False)
    op.create_index('idx_ai_usage_provider', 'ai_usage_logs', ['provider'], unique=False)
    op.create_index('idx_ai_usage_teacher', 'ai_usage_logs', ['teacher_id'], unique=False)
    op.create_index('idx_ai_usage_timestamp', 'ai_usage_logs', ['timestamp'], unique=False)
    op.create_index(op.f('ix_ai_usage_logs_teacher_id'), 'ai_usage_logs', ['teacher_id'], unique=False)
    op.create_index(op.f('ix_ai_usage_logs_timestamp'), 'ai_usage_logs', ['timestamp'], unique=False)


def downgrade():
    # Drop ai_usage_logs table
    op.drop_index(op.f('ix_ai_usage_logs_timestamp'), table_name='ai_usage_logs')
    op.drop_index(op.f('ix_ai_usage_logs_teacher_id'), table_name='ai_usage_logs')
    op.drop_index('idx_ai_usage_timestamp', table_name='ai_usage_logs')
    op.drop_index('idx_ai_usage_teacher', table_name='ai_usage_logs')
    op.drop_index('idx_ai_usage_provider', table_name='ai_usage_logs')
    op.drop_index('idx_ai_usage_activity_type', table_name='ai_usage_logs')
    op.drop_table('ai_usage_logs')
