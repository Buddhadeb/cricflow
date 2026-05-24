import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.payment import Payment
from app.models.player import Player
from app.models.tournament import Tournament
from app.models.user import User
from app.schemas.payment import (
    CreateOrderRequest,
    CreateOrderResponse,
    PaymentResponse,
)
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_order(
    body: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    player = await db.get(Player, body.player_id)
    if not player:
        raise HTTPException(404, "Player not found")
    if current_user.role != "admin" and player.user_id != current_user.id:
        raise HTTPException(403, "You can only create orders for your own player registration")
    payment = await payment_service.create_order(body.player_id, db)
    return CreateOrderResponse(
        payment_id=payment.id,
        amount=int(payment.amount),
        currency=payment.currency,
    )


@router.post("/approve/{player_id}", response_model=PaymentResponse)
async def approve_payment(
    player_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == "admin":
        pass  # admin can approve anyone
    else:
        # Must be the tournament organizer for this player
        player = await db.get(Player, player_id)
        if not player:
            raise HTTPException(404, "Player not found")
        if not player.tournament_id:
            raise HTTPException(403, "Only admins can approve standalone player payments")
        result = await db.execute(
            select(Tournament).where(Tournament.id == player.tournament_id)
        )
        tournament = result.scalar_one_or_none()
        if not tournament or tournament.organizer_id != current_user.id:
            raise HTTPException(403, "Only the tournament organizer or admin can approve payments")
    return await payment_service.approve_payment(player_id, db)


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
