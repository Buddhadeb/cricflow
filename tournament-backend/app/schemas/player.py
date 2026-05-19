import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator

PlayerType = Literal["batsman", "bowler", "all_rounder", "wicket_keeper"]
TshirtSize = Literal["S", "M", "L", "XL", "XXL"]
PlayerStatus = Literal["pending", "approved", "available", "sold", "unsold"]


class PlayerRegister(BaseModel):
    name: str
    age: int
    address: str
    player_type: PlayerType
    tshirt_size: TshirtSize

    @field_validator("age")
    @classmethod
    def age_range(cls, v: int) -> int:
        if not (15 <= v <= 60):
            raise ValueError("Age must be between 15 and 60")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 100:
            raise ValueError("Name must be 2-100 characters")
        return v


class PlayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    name: str
    age: int
    address: str
    player_type: str
    tshirt_size: str
    photo_url: str | None
    phone: str | None = None
    dob: Optional[date] = None
    jersey_number: Optional[int] = None
    base_price: Decimal
    status: str
    is_approved: bool
    registered_at: datetime
    tournament_id: Optional[uuid.UUID] = None


class PlayerProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    address: Optional[str] = None
    player_type: Optional[str] = None
    tshirt_size: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[date] = None
    jersey_number: Optional[int] = None


class PlayerStatusUpdate(BaseModel):
    status: PlayerStatus
