"""add google auth

Revision ID: h5e6f7g8h9i0
Revises: g4d5e6f7a8b9
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h5e6f7g8h9i0"
down_revision: Union[str, None] = "g4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "password_hash", nullable=True)
    op.add_column("users", sa.Column("google_id", sa.String(255), nullable=True))
    op.create_unique_constraint("uq_users_google_id", "users", ["google_id"])


def downgrade() -> None:
    op.drop_constraint("uq_users_google_id", "users", type_="unique")
    op.drop_column("users", "google_id")
    op.alter_column("users", "password_hash", nullable=False)
