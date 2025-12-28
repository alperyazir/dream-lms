"""add_supervisor_role

Revision ID: 3f90262da238
Revises: f799d50fa1c7
Create Date: 2025-12-20 00:27:43.182738

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '3f90262da238'
down_revision = 'f799d50fa1c7'
branch_labels = None
depends_on = None


def upgrade():
    # Add 'supervisor' value to the userrole enum after 'admin'
    op.execute("ALTER TYPE userrole ADD VALUE 'supervisor' AFTER 'admin'")


def downgrade():
    # PostgreSQL doesn't support removing enum values easily
    # Would require: create new enum, update column, drop old enum
    # For safety, log warning and skip
    print("WARNING: Downgrade does not remove 'supervisor' from enum. Manual cleanup required if needed.")
