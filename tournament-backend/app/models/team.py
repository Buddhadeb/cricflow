import uuid
from decimal import Decimal
from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.database import Base


class TeamJoinRequest(Base):
    __tablename__ = "team_join_requests"
    __table_args__ = (
        CheckConstraint("status IN ('pending','approved','rejected')", name="join_request_status_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    player_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    tournament_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    team = relationship("Team", back_populates="join_requests")
    player = relationship("Player")


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    tournament_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tournaments.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_budget: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("1000000.00"))
    remaining_budget: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("1000000.00"))
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    open_to_challenges: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="team")
    tournament = relationship("Tournament", back_populates="teams", foreign_keys=[tournament_id])
    players = relationship("TeamPlayer", back_populates="team")
    join_requests = relationship("TeamJoinRequest", back_populates="team")


class TeamPlayer(Base):
    __tablename__ = "team_players"
    __table_args__ = (
        # UNIQUE on player_id enforced at DB level via unique=True on the column
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    player_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("players.id"), nullable=False, unique=True)
    sold_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    acquired_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    team = relationship("Team", back_populates="players")
    player = relationship("Player", back_populates="team_player")
