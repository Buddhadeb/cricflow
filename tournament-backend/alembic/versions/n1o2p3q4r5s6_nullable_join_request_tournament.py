"""make team_join_requests.tournament_id nullable for standalone teams

Revision ID: n1o2p3q4r5s6
Revises: m0n1o2p3q4r5
Create Date: 2026-05-19
"""
from alembic import op
import sqlalchemy as sa

revision = 'n1o2p3q4r5s6'
down_revision = 'm0n1o2p3q4r5'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('team_join_requests', 'tournament_id', nullable=True)


def downgrade():
    op.alter_column('team_join_requests', 'tournament_id', nullable=False)
