import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ChallengeCreate(BaseModel):
    team_b_id: uuid.UUID
    venue: Optional[str] = None
    match_date: Optional[datetime] = None
    overs: int = 20
    prize_amount: Optional[Decimal] = None


class TeamBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    logo_url: Optional[str] = None
    city: Optional[str] = None


class ChallengeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    team_a_id: uuid.UUID
    team_b_id: uuid.UUID
    created_by: uuid.UUID
    venue: Optional[str] = None
    match_date: Optional[datetime] = None
    overs: int
    prize_amount: Optional[Decimal] = None
    status: str
    match_id: Optional[uuid.UUID] = None
    created_at: datetime
    team_a: Optional[TeamBrief] = None
    team_b: Optional[TeamBrief] = None


class PlayerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    player_type: str
    photo_url: Optional[str] = None
    age: Optional[int] = None
    tshirt_size: Optional[str] = None


class AvailabilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    match_id: uuid.UUID
    team_id: uuid.UUID
    player_id: uuid.UUID
    status: str
    responded_at: Optional[datetime] = None
    created_at: datetime
    player: Optional[PlayerBrief] = None


class AvailabilityRespond(BaseModel):
    status: str  # available | unavailable
