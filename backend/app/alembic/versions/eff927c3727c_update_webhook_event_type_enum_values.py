"""update_webhook_event_type_enum_values

Revision ID: eff927c3727c
Revises: 31457c3673aa
Create Date: 2025-11-17 18:14:52.490787

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'eff927c3727c'
down_revision = '31457c3673aa'
branch_labels = None
depends_on = None


def upgrade():
    # Update enum values to match Python enum (with underscores instead of dots)
    # PostgreSQL 10+ supports ALTER TYPE ... RENAME VALUE
    op.execute("ALTER TYPE webhookeventtype RENAME VALUE 'book.created' TO 'book_created'")
    op.execute("ALTER TYPE webhookeventtype RENAME VALUE 'book.updated' TO 'book_updated'")
    op.execute("ALTER TYPE webhookeventtype RENAME VALUE 'book.deleted' TO 'book_deleted'")


def downgrade():
    # Revert to dot notation
    op.execute("ALTER TYPE webhookeventtype RENAME VALUE 'book_created' TO 'book.created'")
    op.execute("ALTER TYPE webhookeventtype RENAME VALUE 'book_updated' TO 'book.updated'")
    op.execute("ALTER TYPE webhookeventtype RENAME VALUE 'book_deleted' TO 'book.deleted'")
