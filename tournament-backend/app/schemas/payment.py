import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict

PaymentStatus = Literal["pending", "success", "failed", "refunded"]


class CreateOrderRequest(BaseModel):
    player_id: uuid.UUID


class CreateOrderResponse(BaseModel):
    payment_id: uuid.UUID
    amount: int
    currency: str


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    player_id: uuid.UUID | None
    amount: Decimal
    currency: str
    razorpay_order_id: str | None
    razorpay_payment_id: str | None
    status: str
    paid_at: datetime | None
