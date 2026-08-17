"""initial_terrascope_schema

Revision ID: c9b51209683c
Revises: 
Create Date: 2026-08-13 08:57:11.832775

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9b51209683c'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade database schema: creates users, saved_views, and cache_entries tables."""
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # Create saved_views table
    op.create_table(
        'saved_views',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('camera_position', sa.JSON(), nullable=True),
        sa.Column('camera_target', sa.JSON(), nullable=True),
        sa.Column('active_layers', sa.JSON(), nullable=True),
        sa.Column('layer_filters', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_saved_views_id'), 'saved_views', ['id'], unique=False)
    op.create_index(op.f('ix_saved_views_name'), 'saved_views', ['name'], unique=False)

    # Create cache_entries table
    op.create_table(
        'cache_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cache_key', sa.String(), nullable=False),
        sa.Column('data', sa.Text(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cache_entries_cache_key'), 'cache_entries', ['cache_key'], unique=True)
    op.create_index(op.f('ix_cache_entries_id'), 'cache_entries', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade database schema: drops cache_entries, saved_views, and users tables."""
    op.drop_index(op.f('ix_cache_entries_id'), table_name='cache_entries')
    op.drop_index(op.f('ix_cache_entries_cache_key'), table_name='cache_entries')
    op.drop_table('cache_entries')

    op.drop_index(op.f('ix_saved_views_name'), table_name='saved_views')
    op.drop_index(op.f('ix_saved_views_id'), table_name='saved_views')
    op.drop_table('saved_views')

    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
