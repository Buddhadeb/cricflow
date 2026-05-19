import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.player import Player
from app.utils.upload import upload_player_photo

VALID_PLAYER_TYPES = {"batsman", "bowler", "all_rounder", "wicket_keeper"}
VALID_TSHIRT_SIZES = {"S", "M", "L", "XL", "XXL"}


async def register_player(
    *,
    user_id: uuid.UUID,
    name: str,
    age: int,
    address: str,
    player_type: str,
    tshirt_size: str,
    tournament_id: uuid.UUID | None = None,
    photo: UploadFile | None,
    photo_url: str | None = None,
    phone: str | None = None,
    db: AsyncSession,
) -> Player:
    if player_type not in VALID_PLAYER_TYPES:
        raise HTTPException(400, f"player_type must be one of {sorted(VALID_PLAYER_TYPES)}")
    if tshirt_size not in VALID_TSHIRT_SIZES:
        raise HTTPException(400, f"tshirt_size must be one of {sorted(VALID_TSHIRT_SIZES)}")
    if not (15 <= age <= 60):
        raise HTTPException(400, "Age must be between 15 and 60")
    name = name.strip()
    if len(name) < 2:
        raise HTTPException(400, "Name must be at least 2 characters")

    # Per-tournament registration: allow same user in different tournaments
    dup_q = select(Player).where(Player.user_id == user_id)
    if tournament_id:
        dup_q = dup_q.where(Player.tournament_id == tournament_id)
    else:
        dup_q = dup_q.where(Player.tournament_id.is_(None))
    result = await db.execute(dup_q)
    if result.scalar_one_or_none():
        raise HTTPException(400, "You are already registered as a player in this tournament")

    if photo and photo.filename:
        photo_url = await upload_player_photo(photo)
    # else keep photo_url as passed in (profile picture URL or None)

    player = Player(
        id=uuid.uuid4(),
        user_id=user_id,
        tournament_id=tournament_id,
        name=name,
        age=age,
        address=address.strip(),
        player_type=player_type,
        tshirt_size=tshirt_size,
        photo_url=photo_url,
        phone=phone,
        status="pending",
        is_approved=False,
    )
    db.add(player)
    await db.commit()
    await db.refresh(player)
    return player


async def get_player_or_404(player_id: uuid.UUID, db: AsyncSession) -> Player:
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(404, "Player not found")
    return player


async def update_standalone_player(user_id: uuid.UUID, data: dict, db: AsyncSession) -> Player:
    result = await db.execute(
        select(Player).where(Player.user_id == user_id, Player.tournament_id.is_(None))
    )
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(404, "No standalone player profile found")
    for field, value in data.items():
        if value is not None:
            setattr(player, field, value)
    await db.commit()
    await db.refresh(player)
    return player


async def approve_player(player_id: uuid.UUID, db: AsyncSession) -> Player:
    player = await get_player_or_404(player_id, db)
    player.is_approved = True
    player.status = "available"
    await db.commit()
    await db.refresh(player)
    return player


async def reject_player(player_id: uuid.UUID, db: AsyncSession) -> Player:
    player = await get_player_or_404(player_id, db)
    player.is_approved = False
    # No "rejected" status in schema — stays "pending" so admin can review again
    await db.commit()
    await db.refresh(player)
    return player
