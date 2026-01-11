"""add_viewable_password_encrypted_to_user

Revision ID: 16568d74bed9
Revises: 859d23f2da10
Create Date: 2026-01-11 22:49:40.177660

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '16568d74bed9'
down_revision = '859d23f2da10'
branch_labels = None
depends_on = None


def upgrade():
    # Add viewable_password_encrypted column to user table
    # This stores Fernet-encrypted passwords for student accounts
    # so teachers can help students who forget their credentials
    op.add_column(
        'user',
        sa.Column('viewable_password_encrypted', sa.String(500), nullable=True)
    )


def downgrade():
    op.drop_column('user', 'viewable_password_encrypted')
