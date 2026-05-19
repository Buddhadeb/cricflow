"""player unique(user_id, tournament_id) and cascade on tournament FK

Revision ID: f3c9d1e2a4b5
Revises: a1b2c3d4e5f6
Create Date: 2026-05-17 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'f3c9d1e2a4b5'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Unique registration per user per tournament (NULLs excluded by the partial index)
    op.create_index(
        'ix_players_user_tournament_unique',
        'players',
        ['user_id', 'tournament_id'],
        unique=True,
        postgresql_where=sa.text('tournament_id IS NOT NULL'),
    )

    # Drop and recreate tournament_id FK on players with CASCADE
    op.drop_constraint('players_tournament_id_fkey', 'players', type_='foreignkey')
    op.create_foreign_key(
        'players_tournament_id_fkey',
        'players', 'tournaments',
        ['tournament_id'], ['id'],
        ondelete='CASCADE',
    )

    # Drop and recreate tournament_id FK on teams with CASCADE
    op.drop_constraint('teams_tournament_id_fkey', 'teams', type_='foreignkey')
    op.create_foreign_key(
        'teams_tournament_id_fkey',
        'teams', 'tournaments',
        ['tournament_id'], ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    op.drop_index('ix_players_user_tournament_unique', 'players')

    op.drop_constraint('players_tournament_id_fkey', 'players', type_='foreignkey')
    op.create_foreign_key(
        'players_tournament_id_fkey',
        'players', 'tournaments',
        ['tournament_id'], ['id'],
    )

    op.drop_constraint('teams_tournament_id_fkey', 'teams', type_='foreignkey')
    op.create_foreign_key(
        'teams_tournament_id_fkey',
        'teams', 'tournaments',
        ['tournament_id'], ['id'],
    )
