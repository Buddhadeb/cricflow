import hashlib
import hmac
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


def _is_mock() -> bool:
    return settings.PAYMENT_MOCK


def _razorpay_client():
    import razorpay
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


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

    # Use tournament-specific fee if player belongs to a tournament
    fee = settings.REGISTRATION_FEE
    if player.tournament_id:
        t_result = await db.execute(select(Tournament).where(Tournament.id == player.tournament_id))
        t = t_result.scalar_one_or_none()
        if t:
            fee = t.registration_fee

    # Reuse an existing pending order so we don't accumulate duplicate records
    result = await db.execute(
        select(Payment)
        .where(Payment.player_id == player_id, Payment.status == "pending")
        .order_by(Payment.id.desc())
    )
    existing = result.scalars().first()
    if existing and _is_mock():
        return existing

    if _is_mock():
        order_id = f"mock_order_{uuid.uuid4().hex[:16]}"
    else:
        amount_paise = fee * 100
        order = _razorpay_client().order.create(
            {"amount": amount_paise, "currency": "INR", "payment_capture": 1}
        )
        order_id = order["id"]
        # Update existing pending record with new Razorpay order instead of creating duplicate
        if existing:
            existing.razorpay_order_id = order_id
            existing.amount = Decimal(str(fee))
            await db.commit()
            await db.refresh(existing)
            return existing

    payment = Payment(
        id=uuid.uuid4(),
        player_id=player_id,
        amount=Decimal(str(fee)),
        currency="INR",
        razorpay_order_id=order_id,
        status="pending",
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


async def mock_complete(player_id: uuid.UUID, db: AsyncSession) -> Payment:
    """Instantly mark payment as success — only available when PAYMENT_MOCK=true."""
    if not _is_mock():
        raise HTTPException(403, "Mock payments are disabled")

    result = await db.execute(
        select(Payment).where(Payment.player_id == player_id, Payment.status == "success")
    )
    if result.scalar_one_or_none():
        raise HTTPException(400, "Registration fee already paid")

    result = await db.execute(
        select(Payment)
        .where(Payment.player_id == player_id)
        .order_by(Payment.id)
    )
    payment = result.scalars().first()
    if not payment:
        # create one on the fly if create-order wasn't called
        result2 = await db.execute(select(Player).where(Player.id == player_id))
        player = result2.scalar_one_or_none()
        if not player:
            raise HTTPException(404, "Player not found")
        fee = settings.REGISTRATION_FEE
        if player.tournament_id:
            t_result = await db.execute(select(Tournament).where(Tournament.id == player.tournament_id))
            t = t_result.scalar_one_or_none()
            if t:
                fee = t.registration_fee
        payment = Payment(
            id=uuid.uuid4(),
            player_id=player_id,
            amount=Decimal(str(fee)),
            currency="INR",
            razorpay_order_id=f"mock_order_{uuid.uuid4().hex[:16]}",
            status="pending",
        )
        db.add(payment)

    payment.razorpay_payment_id = f"mock_pay_{uuid.uuid4().hex[:16]}"
    payment.razorpay_signature = "mock_signature"
    payment.status = "success"
    payment.paid_at = datetime.now(timezone.utc)
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


def _verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    message = f"{order_id}|{payment_id}"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def verify_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    db: AsyncSession,
) -> Payment:
    result = await db.execute(
        select(Payment).where(Payment.razorpay_order_id == razorpay_order_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(404, "Payment record not found")

    # In mock mode skip signature check
    if not _is_mock():
        if not _verify_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
            payment.status = "failed"
            await db.commit()
            raise HTTPException(400, "Invalid payment signature")

    payment.razorpay_payment_id = razorpay_payment_id
    payment.razorpay_signature = razorpay_signature
    payment.status = "success"
    payment.paid_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(payment)
    return payment
