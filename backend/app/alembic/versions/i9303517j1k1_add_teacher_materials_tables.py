"""add_teacher_materials_tables

Revision ID: i9303517j1k1
Revises: h8292406i0j0
Create Date: 2025-12-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'i9303517j1k1'
down_revision = '1a76c2dc70fe'
branch_labels = None
depends_on = None


def upgrade():
    # Create MaterialType enum (use create_type=False to avoid SQLAlchemy auto-creation)
    material_type_enum = postgresql.ENUM(
        'document', 'image', 'audio', 'video', 'url', 'text_note',
        name='materialtype',
        create_type=False
    )

    # Create the enum type explicitly (checking if it exists first)
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'materialtype'"))
    if not result.fetchone():
        material_type_enum.create(conn)

    # Create teacher_materials table
    op.create_table(
        'teacher_materials',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('teacher_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('type', material_type_enum, nullable=False),
        sa.Column('storage_path', sa.String(500), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('original_filename', sa.String(255), nullable=True),
        sa.Column('url', sa.String(2000), nullable=True),
        sa.Column('text_content', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Create teacher_storage_quotas table
    op.create_table(
        'teacher_storage_quotas',
        sa.Column('teacher_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teachers.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('used_bytes', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('quota_bytes', sa.BigInteger(), nullable=False, server_default='524288000'),  # 500MB
    )

    # Add indexes for common queries
    op.create_index('ix_teacher_materials_type', 'teacher_materials', ['type'])
    op.create_index('ix_teacher_materials_created_at', 'teacher_materials', ['created_at'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_teacher_materials_created_at', table_name='teacher_materials')
    op.drop_index('ix_teacher_materials_type', table_name='teacher_materials')

    # Drop tables
    op.drop_table('teacher_storage_quotas')
    op.drop_table('teacher_materials')

    # Drop enum type
    op.execute('DROP TYPE IF EXISTS materialtype')
