"""tournament pricing and dates

Revision ID: g4d5e6f7a8b9
Revises: f3c9d1e2a4b5
Create Date: 2026-05-17 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "g4d5e6f7a8b9"
down_revision: Union[str, None] = "f3c9d1e2a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tournaments", sa.Column("registration_start_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tournaments", sa.Column("registration_end_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tournaments", sa.Column("auction_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tournaments", sa.Column("player_base_price", sa.Numeric(12, 2), nullable=True))
    op.add_column("tournaments", sa.Column("player_upper_price", sa.Numeric(12, 2), nullable=True))
    op.add_column("tournaments", sa.Column("team_budget_limit", sa.Numeric(12, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("tournaments", "team_budget_limit")
    op.drop_column("tournaments", "player_upper_price")
    op.drop_column("tournaments", "player_base_price")
    op.drop_column("tournaments", "auction_date")
    op.drop_column("tournaments", "registration_end_date")
    op.drop_column("tournaments", "registration_start_date")
