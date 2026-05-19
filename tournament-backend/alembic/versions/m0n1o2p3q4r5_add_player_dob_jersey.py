"""add dob and jersey_number to players

Revision ID: m0n1o2p3q4r5
Revises: l9i0j1k2l3m4
Create Date: 2026-05-19
"""
from alembic import op
import sqlalchemy as sa

revision = 'm0n1o2p3q4r5'
down_revision = 'l9i0j1k2l3m4'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('players', sa.Column('dob', sa.Date(), nullable=True))
    op.add_column('players', sa.Column('jersey_number', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('players', 'jersey_number')
    op.drop_column('players', 'dob')
