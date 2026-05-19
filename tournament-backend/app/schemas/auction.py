import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict

AuctionStatus = Literal["waiting", "active", "paused", "completed"]


class AuctionSessionCreate(BaseModel):
    timer_seconds: int = 30
    upper_limit: Decimal | None = None
    bid_increment: Decimal = Decimal("100.00")
    tournament_id: uuid.UUID | None = None


class AuctionSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    current_player_id: uuid.UUID | None
    current_bid: Decimal | None
    current_bidder_id: uuid.UUID | None
    timer_seconds: int
    upper_limit: Decimal | None
    bid_increment: Decimal
    started_at: datetime | None
    updated_at: datetime


class BidRequest(BaseModel):
    amount: Decimal


class AuctionBidResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    player_id: uuid.UUID
    team_id: uuid.UUID
    amount: Decimal
    bid_at: datetime
