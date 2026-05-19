"""add team_join_requests table and make sold_price nullable

Revision ID: k8h9i0j1k2l3
Revises: j7g8h9i0j1k2
Create Date: 2026-05-18 03:00:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "k8h9i0j1k2l3"
down_revision: Union[str, None] = "j7g8h9i0j1k2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "team_join_requests",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("team_id", sa.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("player_id", sa.UUID(as_uuid=True), sa.ForeignKey("players.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tournament_id", sa.UUID(as_uuid=True), sa.ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("team_id", "player_id", name="uq_join_request_team_player"),
        sa.CheckConstraint("status IN ('pending','approved','rejected')", name="join_request_status_check"),
    )
    op.create_index("ix_join_requests_team_id", "team_join_requests", ["team_id"])
    op.create_index("ix_join_requests_player_id", "team_join_requests", ["player_id"])
    op.create_index("ix_join_requests_status", "team_join_requests", ["status"])

    # Make sold_price nullable so direct joins don't require an auction price
    op.alter_column("team_players", "sold_price", nullable=True)


def downgrade() -> None:
    op.alter_column("team_players", "sold_price", nullable=False)
    op.drop_index("ix_join_requests_status", "team_join_requests")
    op.drop_index("ix_join_requests_player_id", "team_join_requests")
    op.drop_index("ix_join_requests_team_id", "team_join_requests")
    op.drop_table("team_join_requests")
