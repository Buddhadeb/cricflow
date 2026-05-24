import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.payment import Payment
from app.models.player import Player
from app.models.tournament import Tournament


async def _get_fee(player: Player, db: AsyncSession) -> int:
    if player.tournament_id:
        t_result = await db.execute(select(Tournament).where(Tournament.id == player.tournament_id))
        t = t_result.scalar_one_or_none()
        if t:
            return t.registration_fee
    return settings.REGISTRATION_FEE


async def create_order(player_id: uuid.UUID, db: AsyncSession) -> Payment:
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(404, "Player not found")

    result = await db.execute(
        select(Payment).where(Payment.player_id == player_id, Payment.status == "success")
    )
    if result.scalar_one_or_none():
        raise HTTPException(400, "Registration fee already paid")

    # Reuse existing pending record
    result = await db.execute(
        select(Payment)
        .where(Payment.player_id == player_id, Payment.status == "pending")
        .order_by(Payment.id.desc())
    )
    existing = result.scalars().first()
    if existing:
        return existing

    fee = await _get_fee(player, db)
    payment = Payment(
        id=uuid.uuid4(),
        player_id=player_id,
        amount=Decimal(str(fee)),
        currency="INR",
        razorpay_order_id=f"manual_{uuid.uuid4().hex[:16]}",
        status="pending",
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


async def approve_payment(player_id: uuid.UUID, db: AsyncSession) -> Payment:
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(404, "Player not found")

    result = await db.execute(
        select(Payment).where(Payment.player_id == player_id, Payment.status == "success")
    )
    if result.scalar_one_or_none():
        raise HTTPException(400, "Payment already approved")

    result = await db.execute(
        select(Payment)
        .where(Payment.player_id == player_id)
        .order_by(Payment.id.desc())
    )
    payment = result.scalars().first()
    if not payment:
        fee = await _get_fee(player, db)
        payment = Payment(
            id=uuid.uuid4(),
            player_id=player_id,
            amount=Decimal(str(fee)),
            currency="INR",
            razorpay_order_id=f"manual_{uuid.uuid4().hex[:16]}",
            status="pending",
        )
        db.add(payment)

    payment.status = "success"
    payment.paid_at = datetime.now(timezone.utc)

    player.is_approved = True
    player.status = "available"

    await db.commit()
    await db.refresh(payment)
    return payment
