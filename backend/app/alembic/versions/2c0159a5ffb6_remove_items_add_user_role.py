"""remove_items_add_user_role

Revision ID: 2c0159a5ffb6
Revises: 1a31ce608336
Create Date: 2025-10-26 23:30:56.853569

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '2c0159a5ffb6'
down_revision = '1a31ce608336'
branch_labels = None
depends_on = None


def upgrade():
    # Drop items table
    op.drop_table('item')

    # Create user_role enum type
    op.execute("CREATE TYPE userrole AS ENUM ('admin', 'publisher', 'teacher', 'student')")

    # Add role column to user table with default 'student'
    op.add_column('user', sa.Column('role', sa.Enum('admin', 'publisher', 'teacher', 'student', name='userrole'), nullable=False, server_default='student'))

    # Add index on role column
    op.create_index('idx_user_role', 'user', ['role'])


def downgrade():
    # Remove index
    op.drop_index('idx_user_role', table_name='user')

    # Drop role column
    op.drop_column('user', 'role')

    # Drop enum type
    op.execute('DROP TYPE userrole')

    # Recreate items table (reverse of drop)
    op.create_table(
        'item',
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id')
    )
