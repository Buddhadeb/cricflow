import uuid
from decimal import Decimal
from sqlalchemy import Boolean, CheckConstraint, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.database import Base


class Player(Base):
    __tablename__ = "players"
    __table_args__ = (
        CheckConstraint(
            "player_type IN ('batsman','bowler','all_rounder','wicket_keeper')",
            name="players_type_check",
        ),
        CheckConstraint(
            "tshirt_size IN ('S','M','L','XL','XXL')",
            name="players_tshirt_check",
        ),
        CheckConstraint(
            "status IN ('pending','approved','available','sold','unsold')",
            name="players_status_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    tournament_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tournaments.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    player_type: Mapped[str] = mapped_column(String(30), nullable=False)
    tshirt_size: Mapped[str] = mapped_column(String(5), nullable=False)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dob: Mapped[Date | None] = mapped_column(Date, nullable=True)
    jersey_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("1000.00"))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    registered_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="player")
    tournament = relationship("Tournament", back_populates="players", foreign_keys=[tournament_id])
    team_player = relationship("TeamPlayer", back_populates="player", uselist=False)
    payment = relationship("Payment", back_populates="player", uselist=False)
