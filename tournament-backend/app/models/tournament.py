import uuid
from decimal import Decimal
from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.database import Base


class Tournament(Base):
    __tablename__ = "tournaments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('registration','auction','league','playoffs','completed')",
            name="tournaments_status_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    organizer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    registration_fee: Mapped[int] = mapped_column(Integer, nullable=False, default=150)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="registration")
    max_teams: Mapped[int] = mapped_column(Integer, nullable=False, default=8)
    overs: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    venue: Mapped[str | None] = mapped_column(String(200), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Dates
    registration_start_date: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    registration_end_date: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    auction_date: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    start_date: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Auction pricing
    player_base_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    player_upper_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    team_budget_limit: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organizer = relationship("User", foreign_keys=[organizer_id])
    players = relationship("Player", back_populates="tournament", foreign_keys="Player.tournament_id")
    teams = relationship("Team", back_populates="tournament", foreign_keys="Team.tournament_id")
    matches = relationship("Match", back_populates="tournament", foreign_keys="Match.tournament_id")
