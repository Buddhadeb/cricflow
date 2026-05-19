import uuid

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_admin
from app.models.payment import Payment
from app.models.player import Player
from app.models.tournament import Tournament
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/admin", tags=["admin"])

class RoleUpdate(BaseModel):
    role: Literal["admin", "user"]


@router.get("/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()

    rows = (await db.execute(
        select(
            Tournament.id,
            Tournament.name,
            Tournament.status,
            func.count(Payment.id).filter(Payment.status == "success").label("registrations"),
            func.coalesce(
                func.sum(Payment.amount).filter(Payment.status == "success"), 0
            ).label("amount_collected"),
        )
        .outerjoin(Player, Player.tournament_id == Tournament.id)
        .outerjoin(Payment, Payment.player_id == Player.id)
        .group_by(Tournament.id, Tournament.name, Tournament.status)
        .order_by(Tournament.created_at.desc())
    )).all()

    tournaments = [
        {
            "id": str(r.id),
            "name": r.name,
            "status": r.status,
            "registrations": r.registrations,
            "amount_collected": float(r.amount_collected),
        }
        for r in rows
    ]

    STATUS_ORDER = {"auction": 0, "registration": 1, "league": 2, "playoffs": 3, "completed": 4}
    tournaments.sort(key=lambda t: (STATUS_ORDER.get(t["status"], 9), t["name"]))

    return {
        "total_users": total_users,
        "total_registrations": sum(t["registrations"] for t in tournaments),
        "total_amount_collected": sum(t["amount_collected"] for t in tournaments),
        "tournaments": tournaments,
    }


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).order_by(User.created_at))
    return result.scalars().all()


@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: uuid.UUID,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.role = body.role
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}/toggle-active", response_model=UserResponse)
async def toggle_user_active(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = not user.is_active
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
