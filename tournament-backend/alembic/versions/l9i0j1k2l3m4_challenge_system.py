"""challenge system - standalone matches, availability polling, team discovery

Revision ID: l9i0j1k2l3m4
Revises: k8h9i0j1k2l3
Create Date: 2026-05-18 04:00:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "l9i0j1k2l3m4"
down_revision: Union[str, None] = "k8h9i0j1k2l3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # match_challenges — challenge invitation between two teams
    op.create_table(
        "match_challenges",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("team_a_id", sa.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_b_id", sa.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", sa.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("venue", sa.String(200), nullable=True),
        sa.Column("match_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("overs", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("prize_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("match_id", sa.UUID(as_uuid=True), nullable=True),   # set after acceptance
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("status IN ('pending','accepted','rejected')", name="challenge_status_check"),
    )
    op.create_index("ix_challenges_team_a", "match_challenges", ["team_a_id"])
    op.create_index("ix_challenges_team_b", "match_challenges", ["team_b_id"])
    op.create_index("ix_challenges_status", "match_challenges", ["status"])

    # player_availability — per-match availability response per player
    op.create_table(
        "player_availability",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("match_id", sa.UUID(as_uuid=True), sa.ForeignKey("matches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_id", sa.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("player_id", sa.UUID(as_uuid=True), sa.ForeignKey("players.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("match_id", "player_id", name="uq_availability_match_player"),
        sa.CheckConstraint("status IN ('pending','available','unavailable')", name="availability_status_check"),
    )
    op.create_index("ix_availability_match_id", "player_availability", ["match_id"])
    op.create_index("ix_availability_player_id", "player_availability", ["player_id"])

    # matches: add prize_amount
    op.add_column("matches", sa.Column("prize_amount", sa.Numeric(12, 2), nullable=True))

    # teams: city, description, open_to_challenges
    op.add_column("teams", sa.Column("city", sa.String(100), nullable=True))
    op.add_column("teams", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("teams", sa.Column("open_to_challenges", sa.Boolean(), nullable=False, server_default="false"))

    # players: phone
    op.add_column("players", sa.Column("phone", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("players", "phone")
    op.drop_column("teams", "open_to_challenges")
    op.drop_column("teams", "description")
    op.drop_column("teams", "city")
    op.drop_column("matches", "prize_amount")
    op.drop_index("ix_availability_player_id", "player_availability")
    op.drop_index("ix_availability_match_id", "player_availability")
    op.drop_table("player_availability")
    op.drop_index("ix_challenges_status", "match_challenges")
    op.drop_index("ix_challenges_team_b", "match_challenges")
    op.drop_index("ix_challenges_team_a", "match_challenges")
    op.drop_table("match_challenges")
