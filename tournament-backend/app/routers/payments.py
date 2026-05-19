import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_admin
from app.models.payment import Payment
from app.models.player import Player
from app.models.user import User
from app.schemas.payment import (
    CreateOrderRequest,
    CreateOrderResponse,
    PaymentResponse,
    VerifyPaymentRequest,
)
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_order(
    body: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify the player belongs to the requesting user
    player = await db.get(Player, body.player_id)
    if not player:
        raise HTTPException(404, "Player not found")
    if current_user.role != "admin" and player.user_id != current_user.id:
        raise HTTPException(403, "You can only create orders for your own player registration")
    payment = await payment_service.create_order(body.player_id, db)
    return CreateOrderResponse(
        razorpay_order_id=payment.razorpay_order_id,
        amount=int(payment.amount * 100),
        currency=payment.currency,
        payment_id=payment.id,
    )


@router.post("/verify", response_model=PaymentResponse)
async def verify_payment(
    body: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Resolve player from the order to verify ownership
    result = await db.execute(
        select(Payment).where(Payment.razorpay_order_id == body.razorpay_order_id)
    )
    payment = result.scalar_one_or_none()
    if payment:
        player = await db.get(Player, payment.player_id)
        if player and current_user.role != "admin" and player.user_id != current_user.id:
            raise HTTPException(403, "You can only verify your own payments")
    return await payment_service.verify_payment(
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature,
        db,
    )


@router.post("/mock-complete/{player_id}", response_model=PaymentResponse)
async def mock_complete(
    player_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await payment_service.mock_complete(player_id, db)


@router.get("/status/{player_id}", response_model=PaymentResponse)
async def payment_status(
    player_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payment)
        .where(Payment.player_id == player_id)
        .order_by(Payment.paid_at.desc())
    )
    payment = result.scalars().first()
    if not payment:
        raise HTTPException(404, "No payment found for this player")
    return payment
