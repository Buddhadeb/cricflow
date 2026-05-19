import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

MatchStage = Literal["league", "quarter_final", "semi_final", "final"]
MatchStatus = Literal["scheduled", "live", "completed", "cancelled"]
TossDecision = Literal["bat", "bowl"]
DeliveryType = Literal["normal", "wide", "no_ball", "bye", "leg_bye"]


class GenerateFixturesInput(BaseModel):
    total_overs: int = 20
    venues: list[str] | None = None


class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tournament_id: uuid.UUID | None = None
    team_a_id: uuid.UUID | None
    team_b_id: uuid.UUID | None
    venue: str | None
    stage: str | None
    match_date: datetime | None
    total_overs: int
    status: str
    toss_winner_id: uuid.UUID | None
    toss_decision: str | None
    result_summary: str | None
    winner_id: uuid.UUID | None
    created_at: datetime


class TossInput(BaseModel):
    toss_winner_id: uuid.UUID
    toss_decision: TossDecision


class PlayingXIInput(BaseModel):
    team_id: uuid.UUID
    player_ids: list[uuid.UUID]

    @field_validator("player_ids")
    @classmethod
    def check_count(cls, v: list) -> list:
        if not (1 <= len(v) <= 11):
            raise ValueError("player_ids must contain 1–11 players")
        return v


class PlayerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    player_type: str
    photo_url: str | None = None


class PlayingXIEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    match_id: uuid.UUID
    team_id: uuid.UUID
    player_id: uuid.UUID
    batting_order: int | None
    player: PlayerBrief | None = None


class CompleteMatchInput(BaseModel):
    winner_id: uuid.UUID | None = None
    result_summary: str


class DeliveryInput(BaseModel):
    bowler_id: uuid.UUID
    batsman_id: uuid.UUID
    non_striker_id: uuid.UUID
    over_number: int
    ball_number: int
    runs_batsman: int = 0
    runs_extras: int = 0
    delivery_type: DeliveryType = "normal"
    is_wicket: bool = False
    wicket_type: str | None = None
    fielder_id: uuid.UUID | None = None


class ScorecardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    match_id: uuid.UUID
    batting_team_id: uuid.UUID | None
    innings_number: int | None
    total_runs: int
    total_wickets: int
    total_overs: Decimal
    extras: int
    is_complete: bool
