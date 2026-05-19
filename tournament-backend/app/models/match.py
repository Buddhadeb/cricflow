import uuid
from decimal import Decimal
from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.database import Base


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        CheckConstraint(
            "stage IN ('league','quarter_final','semi_final','final')",
            name="matches_stage_check",
        ),
        CheckConstraint(
            "status IN ('scheduled','live','completed','cancelled')",
            name="matches_status_check",
        ),
        CheckConstraint(
            "toss_decision IN ('bat','bowl')",
            name="matches_toss_decision_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tournament_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tournaments.id"), nullable=True)
    team_a_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    team_b_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    venue: Mapped[str | None] = mapped_column(String(200), nullable=True)
    stage: Mapped[str | None] = mapped_column(String(30), nullable=True)
    match_date: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_overs: Mapped[int] = mapped_column(Integer, default=20)
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
    toss_winner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    toss_decision: Mapped[str | None] = mapped_column(String(10), nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    winner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    prize_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tournament = relationship("Tournament", back_populates="matches", foreign_keys=[tournament_id])
    team_a = relationship("Team", foreign_keys=[team_a_id])
    team_b = relationship("Team", foreign_keys=[team_b_id])
    toss_winner = relationship("Team", foreign_keys=[toss_winner_id])
    winner = relationship("Team", foreign_keys=[winner_id])
    scorecards = relationship("Scorecard", back_populates="match")
    playing_xi = relationship("MatchPlayingXI", back_populates="match")


class Scorecard(Base):
    __tablename__ = "scorecards"
    __table_args__ = (
        CheckConstraint("innings_number IN (1,2)", name="scorecards_innings_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("matches.id"), nullable=False)
    batting_team_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    innings_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_runs: Mapped[int] = mapped_column(Integer, default=0)
    total_wickets: Mapped[int] = mapped_column(Integer, default=0)
    total_overs: Mapped[Decimal] = mapped_column(Numeric(5, 1), default=Decimal("0.0"))
    extras: Mapped[int] = mapped_column(Integer, default=0)
    is_complete: Mapped[bool] = mapped_column(Boolean, default=False)

    match = relationship("Match", back_populates="scorecards")
    batting_team = relationship("Team", foreign_keys=[batting_team_id])
    deliveries = relationship("Delivery", back_populates="scorecard")


class Delivery(Base):
    __tablename__ = "deliveries"
    __table_args__ = (
        CheckConstraint(
            "delivery_type IN ('normal','wide','no_ball','bye','leg_bye')",
            name="deliveries_type_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scorecard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scorecards.id"), nullable=False)
    bowler_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("players.id"), nullable=True)
    batsman_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("players.id"), nullable=True)
    non_striker_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("players.id"), nullable=True)
    over_number: Mapped[int] = mapped_column(Integer, nullable=False)
    ball_number: Mapped[int] = mapped_column(Integer, nullable=False)
    runs_batsman: Mapped[int] = mapped_column(Integer, default=0)
    runs_extras: Mapped[int] = mapped_column(Integer, default=0)
    total_runs: Mapped[int] = mapped_column(Integer, default=0)
    delivery_type: Mapped[str] = mapped_column(String(20), default="normal")
    is_wicket: Mapped[bool] = mapped_column(Boolean, default=False)
    wicket_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    fielder_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("players.id"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    scorecard = relationship("Scorecard", back_populates="deliveries")
    bowler = relationship("Player", foreign_keys=[bowler_id])
    batsman = relationship("Player", foreign_keys=[batsman_id])
    non_striker = relationship("Player", foreign_keys=[non_striker_id])
    fielder = relationship("Player", foreign_keys=[fielder_id])


class MatchPlayingXI(Base):
    __tablename__ = "match_playing_xi"
    __table_args__ = (
        UniqueConstraint("match_id", "player_id", name="uq_match_player"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("matches.id"), nullable=False)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    player_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("players.id"), nullable=False)
    batting_order: Mapped[int | None] = mapped_column(Integer, nullable=True)

    match = relationship("Match", back_populates="playing_xi")
    team = relationship("Team", foreign_keys=[team_id])
    player = relationship("Player", foreign_keys=[player_id])
