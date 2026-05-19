"""initial_schema

Revision ID: b22a8c130ebe
Revises: 
Create Date: 2026-05-16 20:22:10.939603

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "b22a8c130ebe"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="users_email_key"),
        sa.CheckConstraint(
            "role IN ('player','team_owner','scorer','admin')", name="users_role_check"
        ),
    )

    op.create_table(
        "teams",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("total_budget", sa.Numeric(12, 2), nullable=False, server_default="1000000.00"),
        sa.Column("remaining_budget", sa.Numeric(12, 2), nullable=False, server_default="1000000.00"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "players",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("player_type", sa.String(30), nullable=False),
        sa.Column("tshirt_size", sa.String(5), nullable=False),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("base_price", sa.Numeric(10, 2), nullable=False, server_default="1000.00"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("is_approved", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("registered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "player_type IN ('batsman','bowler','all_rounder','wicket_keeper')",
            name="players_type_check",
        ),
        sa.CheckConstraint("tshirt_size IN ('S','M','L','XL','XXL')", name="players_tshirt_check"),
        sa.CheckConstraint(
            "status IN ('pending','approved','available','sold','unsold')",
            name="players_status_check",
        ),
    )

    op.create_table(
        "team_players",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("player_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("players.id"), nullable=False),
        sa.Column("sold_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("acquired_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("player_id", name="team_players_player_id_key"),
    )

    op.create_table(
        "auction_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("status", sa.String(20), server_default="waiting"),
        sa.Column(
            "current_player_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("players.id"),
            nullable=True,
        ),
        sa.Column("current_bid", sa.Numeric(10, 2), nullable=True),
        sa.Column(
            "current_bidder_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("teams.id"),
            nullable=True,
        ),
        sa.Column("timer_seconds", sa.Integer(), server_default="30"),
        sa.Column("upper_limit", sa.Numeric(10, 2), nullable=True),
        sa.Column("bid_increment", sa.Numeric(10, 2), server_default="100.00"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "status IN ('waiting','active','paused','completed')",
            name="auction_sessions_status_check",
        ),
    )

    op.create_table(
        "auction_bids",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("auction_sessions.id"),
            nullable=False,
        ),
        sa.Column("player_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("players.id"), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("bid_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("team_a_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id"), nullable=True),
        sa.Column("team_b_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id"), nullable=True),
        sa.Column("venue", sa.String(200), nullable=True),
        sa.Column("stage", sa.String(30), nullable=True),
        sa.Column("match_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_overs", sa.Integer(), server_default="20"),
        sa.Column("status", sa.String(20), server_default="scheduled"),
        sa.Column(
            "toss_winner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("teams.id"),
            nullable=True,
        ),
        sa.Column("toss_decision", sa.String(10), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("winner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "stage IN ('league','quarter_final','semi_final','final')", name="matches_stage_check"
        ),
        sa.CheckConstraint(
            "status IN ('scheduled','live','completed','cancelled')", name="matches_status_check"
        ),
        sa.CheckConstraint("toss_decision IN ('bat','bowl')", name="matches_toss_decision_check"),
    )

    op.create_table(
        "scorecards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("match_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("matches.id"), nullable=False),
        sa.Column(
            "batting_team_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("teams.id"),
            nullable=True,
        ),
        sa.Column("innings_number", sa.Integer(), nullable=True),
        sa.Column("total_runs", sa.Integer(), server_default="0"),
        sa.Column("total_wickets", sa.Integer(), server_default="0"),
        sa.Column("total_overs", sa.Numeric(5, 1), server_default="0.0"),
        sa.Column("extras", sa.Integer(), server_default="0"),
        sa.Column("is_complete", sa.Boolean(), server_default=sa.false()),
        sa.CheckConstraint("innings_number IN (1,2)", name="scorecards_innings_check"),
    )

    op.create_table(
        "deliveries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "scorecard_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("scorecards.id"),
            nullable=False,
        ),
        sa.Column("bowler_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("players.id"), nullable=True),
        sa.Column("batsman_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("players.id"), nullable=True),
        sa.Column(
            "non_striker_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("players.id"),
            nullable=True,
        ),
        sa.Column("over_number", sa.Integer(), nullable=False),
        sa.Column("ball_number", sa.Integer(), nullable=False),
        sa.Column("runs_batsman", sa.Integer(), server_default="0"),
        sa.Column("runs_extras", sa.Integer(), server_default="0"),
        sa.Column("total_runs", sa.Integer(), server_default="0"),
        sa.Column("delivery_type", sa.String(20), server_default="normal"),
        sa.Column("is_wicket", sa.Boolean(), server_default=sa.false()),
        sa.Column("wicket_type", sa.String(30), nullable=True),
        sa.Column("fielder_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("players.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "delivery_type IN ('normal','wide','no_ball','bye','leg_bye')",
            name="deliveries_type_check",
        ),
    )

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("player_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("players.id"), nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="INR"),
        sa.Column("razorpay_order_id", sa.String(100), nullable=True),
        sa.Column("razorpay_payment_id", sa.String(100), nullable=True),
        sa.Column("razorpay_signature", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending','success','failed','refunded')", name="payments_status_check"
        ),
    )


def downgrade() -> None:
    op.drop_table("payments")
    op.drop_table("deliveries")
    op.drop_table("scorecards")
    op.drop_table("matches")
    op.drop_table("auction_bids")
    op.drop_table("auction_sessions")
    op.drop_table("team_players")
    op.drop_table("players")
    op.drop_table("teams")
    op.drop_table("users")
