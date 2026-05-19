import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services import stats_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/batsmen")
async def top_batsmen(
    limit: int = Query(20, ge=1, le=50),
    tournament_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await stats_service.get_top_batsmen(db, limit, tournament_id)


@router.get("/bowlers")
async def top_bowlers(
    limit: int = Query(20, ge=1, le=50),
    tournament_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await stats_service.get_top_bowlers(db, limit, tournament_id)


@router.get("/players/{player_id}")
async def player_stats(
    player_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await stats_service.get_player_stats(player_id, db)


@router.get("/teams")
async def team_stats(
    tournament_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await stats_service.get_team_stats(db, tournament_id)


@router.get("/players/{player_id}/form")
async def player_form(
    player_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Last 5 innings batting + last 5 bowling figures."""
    return await stats_service.get_player_form(player_id, db)
