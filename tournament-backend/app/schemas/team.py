import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TeamCreate(BaseModel):
    name: str
    total_budget: Decimal = Decimal("1000000.00")
    tournament_id: Optional[uuid.UUID] = None
    city: Optional[str] = None
    description: Optional[str] = None
    open_to_challenges: bool = True


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    open_to_challenges: Optional[bool] = None


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID | None
    tournament_id: uuid.UUID | None = None
    name: str
    logo_url: str | None
    total_budget: Decimal
    remaining_budget: Decimal
    city: str | None = None
    description: str | None = None
    open_to_challenges: bool = False
    created_at: datetime


class PlayerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    player_type: str
    photo_url: str | None = None
    age: int | None = None
    tshirt_size: str | None = None


class TeamPlayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    team_id: uuid.UUID
    player_id: uuid.UUID
    sold_price: Decimal | None = None
    acquired_at: datetime
    player: PlayerBrief | None = None


class TeamBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    logo_url: str | None = None
    city: str | None = None


class JoinRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    team_id: uuid.UUID
    player_id: uuid.UUID
    tournament_id: Optional[uuid.UUID] = None
    status: str
    created_at: datetime
    player: PlayerBrief | None = None
    team: TeamBrief | None = None
