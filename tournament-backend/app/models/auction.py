import uuid
from decimal import Decimal
from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.database import Base


class AuctionSession(Base):
    __tablename__ = "auction_sessions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('waiting','active','paused','completed')",
            name="auction_sessions_status_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tournament_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tournaments.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="waiting")
    current_player_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("players.id"), nullable=True)
    current_bid: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    current_bidder_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    timer_seconds: Mapped[int] = mapped_column(Integer, default=30)
    upper_limit: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    bid_increment: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("100.00"))
    started_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    current_player = relationship("Player", foreign_keys=[current_player_id])
    current_bidder = relationship("Team", foreign_keys=[current_bidder_id])
    bids = relationship("AuctionBid", back_populates="session")


class AuctionBid(Base):
    __tablename__ = "auction_bids"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("auction_sessions.id"), nullable=False)
    player_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("players.id"), nullable=False)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    bid_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session = relationship("AuctionSession", back_populates="bids")
    player = relationship("Player", foreign_keys=[player_id])
    team = relationship("Team", foreign_keys=[team_id])
