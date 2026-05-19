"""add indexes on foreign keys and frequently filtered columns

Revision ID: j7g8h9i0j1k2
Revises: i6f7g8h9i0j1
Create Date: 2026-05-18 02:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = "j7g8h9i0j1k2"
down_revision: Union[str, None] = "i6f7g8h9i0j1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("ix_players_user_id", "players", ["user_id"])
    op.create_index("ix_players_tournament_id", "players", ["tournament_id"])
    op.create_index("ix_players_status", "players", ["status"])
    op.create_index("ix_teams_owner_id", "teams", ["owner_id"])
    op.create_index("ix_teams_tournament_id", "teams", ["tournament_id"])
    op.create_index("ix_matches_tournament_id", "matches", ["tournament_id"])
    op.create_index("ix_matches_status", "matches", ["status"])
    op.create_index("ix_matches_team_a_id", "matches", ["team_a_id"])
    op.create_index("ix_matches_team_b_id", "matches", ["team_b_id"])
    op.create_index("ix_scorecards_match_id", "scorecards", ["match_id"])
    op.create_index("ix_deliveries_scorecard_id", "deliveries", ["scorecard_id"])
    op.create_index("ix_deliveries_batsman_id", "deliveries", ["batsman_id"])
    op.create_index("ix_deliveries_bowler_id", "deliveries", ["bowler_id"])
    op.create_index("ix_team_players_team_id", "team_players", ["team_id"])
    op.create_index("ix_match_playing_xi_match_id", "match_playing_xi", ["match_id"])
    op.create_index("ix_match_playing_xi_team_id", "match_playing_xi", ["team_id"])
    op.create_index("ix_payments_player_id", "payments", ["player_id"])
    op.create_index("ix_payments_status", "payments", ["status"])


def downgrade() -> None:
    op.drop_index("ix_payments_status", "payments")
    op.drop_index("ix_payments_player_id", "payments")
    op.drop_index("ix_match_playing_xi_team_id", "match_playing_xi")
    op.drop_index("ix_match_playing_xi_match_id", "match_playing_xi")
    op.drop_index("ix_team_players_team_id", "team_players")
    op.drop_index("ix_deliveries_bowler_id", "deliveries")
    op.drop_index("ix_deliveries_batsman_id", "deliveries")
    op.drop_index("ix_deliveries_scorecard_id", "deliveries")
    op.drop_index("ix_scorecards_match_id", "scorecards")
    op.drop_index("ix_matches_team_b_id", "matches")
    op.drop_index("ix_matches_team_a_id", "matches")
    op.drop_index("ix_matches_status", "matches")
    op.drop_index("ix_matches_tournament_id", "matches")
    op.drop_index("ix_teams_tournament_id", "teams")
    op.drop_index("ix_teams_owner_id", "teams")
    op.drop_index("ix_players_status", "players")
    op.drop_index("ix_players_tournament_id", "players")
    op.drop_index("ix_players_user_id", "players")
