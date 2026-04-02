"""Add system_settings table

Revision ID: o4959183p7q7
Revises: n3848072o6p6
Create Date: 2026-04-02
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel

revision = "o4959183p7q7"
down_revision = "n3848072o6p6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.String(2000), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    # Seed default LLM settings
    op.execute(
        """
        INSERT INTO system_settings (key, value, updated_at) VALUES
        ('llm_primary_provider', 'deepseek', NOW()),
        ('llm_fallback_provider', 'gemini', NOW()),
        ('llm_deepseek_model', 'deepseek-chat', NOW()),
        ('llm_gemini_model', 'gemini-2.5-flash', NOW())
        """
    )


def downgrade() -> None:
    op.drop_table("system_settings")
