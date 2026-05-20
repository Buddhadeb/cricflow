"""add_tournament_end_date

Revision ID: a1b2c3d4e5f6
Revises: 092f9e710a20
Create Date: 2026-05-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'c0b1a2d3e4f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tournaments', sa.Column('end_date', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('tournaments', 'end_date')
