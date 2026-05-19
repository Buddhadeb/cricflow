"""add avatar_url to users

Revision ID: i6f7g8h9i0j1
Revises: h5e6f7g8h9i0
Create Date: 2026-05-18 01:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "i6f7g8h9i0j1"
down_revision: Union[str, None] = "h5e6f7g8h9i0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.String(1024), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
