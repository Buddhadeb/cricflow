import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class TournamentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    registration_fee: int = 150
    max_teams: int = 8
    overs: int = 20
    venue: Optional[str] = None
    banner_url: Optional[str] = None
    # Match dates
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    # Registration window
    registration_start_date: Optional[datetime] = None
    registration_end_date: Optional[datetime] = None
    # Auction date
    auction_date: Optional[datetime] = None
    # Auction pricing
    player_base_price: Optional[Decimal] = None
    player_upper_price: Optional[Decimal] = None
    team_budget_limit: Optional[Decimal] = None
    is_public: bool = True
    upi_id: Optional[str] = None
    contact_phone: Optional[str] = None
    max_squad_size: int = 15

    @field_validator("max_squad_size", mode="before")
    @classmethod
    def squad_size_default(cls, v):
        return v if v is not None else 15

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Name must be at least 3 characters")
        return v

    @field_validator("registration_fee")
    @classmethod
    def fee_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Registration fee cannot be negative")
        return v

    @model_validator(mode="after")
    def validate_prices(self):
        if self.player_base_price is not None and self.player_base_price < 0:
            raise ValueError("Player base price cannot be negative")
        if self.player_upper_price is not None and self.player_base_price is not None:
            if self.player_upper_price < self.player_base_price:
                raise ValueError("Upper price must be greater than or equal to base price")
        if self.team_budget_limit is not None and self.team_budget_limit <= 0:
            raise ValueError("Team budget limit must be positive")
        return self


class TournamentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    registration_fee: Optional[int] = None
    max_teams: Optional[int] = None
    overs: Optional[int] = None
    venue: Optional[str] = None
    banner_url: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    registration_start_date: Optional[datetime] = None
    registration_end_date: Optional[datetime] = None
    auction_date: Optional[datetime] = None
    player_base_price: Optional[Decimal] = None
    player_upper_price: Optional[Decimal] = None
    team_budget_limit: Optional[Decimal] = None
    is_public: Optional[bool] = None
    upi_id: Optional[str] = None
    contact_phone: Optional[str] = None
    max_squad_size: Optional[int] = None
    status: Optional[Literal["registration", "auction", "league", "playoffs", "completed"]] = None


class TournamentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str]
    organizer_id: uuid.UUID
    registration_fee: int
    status: str
    max_teams: int
    overs: int
    venue: Optional[str]
    banner_url: Optional[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    registration_start_date: Optional[datetime]
    registration_end_date: Optional[datetime]
    auction_date: Optional[datetime]
    player_base_price: Optional[Decimal]
    player_upper_price: Optional[Decimal]
    team_budget_limit: Optional[Decimal]
    is_public: bool
    upi_id: Optional[str]
    contact_phone: Optional[str]
    max_squad_size: int
    created_at: datetime
    # Aggregated counts (populated by specific queries)
    player_count: int = 0
    team_count: int = 0
