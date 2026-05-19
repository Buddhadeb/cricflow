import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.match import Match
from app.models.tournament import Tournament
from app.models.user import User
from app.schemas.match import DeliveryInput
from app.services import scoring_service
from app.websockets.scoring_ws import scoring_manager

router = APIRouter(prefix="/scoring", tags=["scoring"])


async def _require_scorer(match_id: uuid.UUID, db: AsyncSession, user: User) -> None:
    if user.role == "admin":
        return
    res = await db.execute(
        select(Tournament.organizer_id)
        .join(Match, Match.tournament_id == Tournament.id)
        .where(Match.id == match_id)
    )
    organizer_id = res.scalar_one_or_none()
    if organizer_id != user.id:
        raise HTTPException(403, "Only the tournament organizer or an admin can record scoring")


@router.post("/{match_id}/delivery", status_code=201)
async def record_delivery(
    match_id: uuid.UUID,
    body: DeliveryInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_scorer(match_id, db, current_user)
    result = await scoring_service.record_delivery(match_id, body, db)
    for event in result["events"]:
        await scoring_manager.broadcast(str(match_id), event)
    return result


@router.delete("/{match_id}/delivery/last")
async def undo_delivery(
    match_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_scorer(match_id, db, current_user)
    result = await scoring_service.undo_last_delivery(match_id, db)
    await scoring_manager.broadcast(str(match_id), result)
    return result


@router.get("/{match_id}/scorecard")
async def get_scorecard(
    match_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await scoring_service.get_scorecard(match_id, db)


@router.get("/{match_id}/live")
async def get_live(
    match_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await scoring_service.get_live_snapshot(match_id, db)
