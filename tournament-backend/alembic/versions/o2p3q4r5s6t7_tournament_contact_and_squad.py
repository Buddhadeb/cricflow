"""tournament contact info and squad size

Revision ID: o2p3q4r5s6t7
Revises: n1o2p3q4r5s6
Create Date: 2026-05-20 00:00:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = 'o2p3q4r5s6t7'
down_revision: Union[str, None] = 'n1o2p3q4r5s6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tournaments', sa.Column('upi_id', sa.String(100), nullable=True))
    op.add_column('tournaments', sa.Column('contact_phone', sa.String(20), nullable=True))
    op.add_column('tournaments', sa.Column('max_squad_size', sa.Integer(), nullable=False, server_default='15'))


def downgrade() -> None:
    op.drop_column('tournaments', 'max_squad_size')
    op.drop_column('tournaments', 'contact_phone')
    op.drop_column('tournaments', 'upi_id')
