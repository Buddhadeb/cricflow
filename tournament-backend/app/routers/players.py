import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_admin
from app.models.player import Player
from app.models.team import Team, TeamPlayer
from app.models.tournament import Tournament
from app.models.user import User
from app.schemas.player import PlayerProfileUpdate, PlayerResponse
from app.services import player_service

router = APIRouter(prefix="/players", tags=["players"])


@router.post("/register", response_model=PlayerResponse, status_code=201)
async def register_player(
    name: str = Form(...),
    age: int = Form(...),
    address: str = Form(...),
    player_type: str = Form(...),
    tshirt_size: str = Form(...),
    tournament_id: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    photo: UploadFile | None = File(None),
    photo_url: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = uuid.UUID(tournament_id) if tournament_id else None
    return await player_service.register_player(
        user_id=current_user.id,
        name=name,
        age=age,
        address=address,
        player_type=player_type,
        tshirt_size=tshirt_size,
        tournament_id=tid,
        phone=phone,
        photo=photo,
        photo_url=photo_url,
        db=db,
    )


# /mine must be defined before /{player_id} to avoid UUID parse attempt
@router.get("/mine", response_model=list[PlayerResponse])
async def get_my_players(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Player).where(Player.user_id == current_user.id))
    players = result.scalars().all()

    enriched = []
    for p in players:
        item = PlayerResponse.model_validate(p)
        if p.tournament_id:
            t = await db.get(Tournament, p.tournament_id)
            if t:
                item.tournament_name = t.name
                item.registration_fee = t.registration_fee
        tp_res = await db.execute(
            select(TeamPlayer).where(TeamPlayer.player_id == p.id)
        )
        tp = tp_res.scalar_one_or_none()
        if tp:
            team = await db.get(Team, tp.team_id)
            if team:
                item.team_name = team.name
        enriched.append(item)
    return enriched


@router.patch("/mine", response_model=PlayerResponse)
async def update_my_player(
    data: PlayerProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await player_service.update_standalone_player(
        current_user.id, data.model_dump(exclude_none=True), db
    )


# /available must be defined before /{player_id} to avoid UUID parse attempt
@router.get("/available", response_model=list[PlayerResponse])
async def list_available_players(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Player).where(Player.status == "available"))
    return result.scalars().all()


@router.get("", response_model=list[PlayerResponse])
async def list_players(
    status: Optional[str] = None,
    player_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Player)
    if status:
        query = query.where(Player.status == status)
    if player_type:
        query = query.where(Player.player_type == player_type)
    result = await db.execute(query.order_by(Player.registered_at.desc()).limit(limit).offset(offset))
    return result.scalars().all()


@router.get("/{player_id}", response_model=PlayerResponse)
async def get_player(
    player_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await player_service.get_player_or_404(player_id, db)


@router.patch("/{player_id}/approve", response_model=PlayerResponse)
async def approve_player(
    player_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await player_service.approve_player(player_id, db)


@router.patch("/{player_id}/reject", response_model=PlayerResponse)
async def reject_player(
    player_id: uuid.UUID,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await player_service.reject_player(player_id, db)
