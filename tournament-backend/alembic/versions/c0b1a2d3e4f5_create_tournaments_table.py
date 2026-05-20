"""create_tournaments_table

Revision ID: c0b1a2d3e4f5
Revises: 092f9e710a20
Create Date: 2026-05-20 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = 'c0b1a2d3e4f5'
down_revision: Union[str, None] = '092f9e710a20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tournaments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('organizer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('registration_fee', sa.Integer(), nullable=False, server_default='150'),
        sa.Column('status', sa.String(30), nullable=False, server_default='registration'),
        sa.Column('max_teams', sa.Integer(), nullable=False, server_default='8'),
        sa.Column('overs', sa.Integer(), nullable=False, server_default='20'),
        sa.Column('venue', sa.String(200), nullable=True),
        sa.Column('banner_url', sa.Text(), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "status IN ('registration','auction','league','playoffs','completed')",
            name='tournaments_status_check',
        ),
    )

    op.add_column('players', sa.Column('tournament_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'players_tournament_id_fkey',
        'players', 'tournaments',
        ['tournament_id'], ['id'],
    )

    op.add_column('teams', sa.Column('tournament_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'teams_tournament_id_fkey',
        'teams', 'tournaments',
        ['tournament_id'], ['id'],
    )

    op.add_column('matches', sa.Column('tournament_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'matches_tournament_id_fkey',
        'matches', 'tournaments',
        ['tournament_id'], ['id'],
    )

    op.add_column('auction_sessions', sa.Column('tournament_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'auction_sessions_tournament_id_fkey',
        'auction_sessions', 'tournaments',
        ['tournament_id'], ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('auction_sessions_tournament_id_fkey', 'auction_sessions', type_='foreignkey')
    op.drop_column('auction_sessions', 'tournament_id')

    op.drop_constraint('matches_tournament_id_fkey', 'matches', type_='foreignkey')
    op.drop_column('matches', 'tournament_id')

    op.drop_constraint('teams_tournament_id_fkey', 'teams', type_='foreignkey')
    op.drop_column('teams', 'tournament_id')

    op.drop_constraint('players_tournament_id_fkey', 'players', type_='foreignkey')
    op.drop_column('players', 'tournament_id')

    op.drop_table('tournaments')
