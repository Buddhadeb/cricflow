import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_admin
from app.models.user import User
from app.schemas.match import (
    CompleteMatchInput,
    GenerateFixturesInput,
    MatchResponse,
    PlayingXIEntryResponse,
    PlayingXIInput,
    TossInput,
)
from app.services import match_service

router = APIRouter(prefix="/matches", tags=["matches"])


@router.post("/generate", response_model=list[MatchResponse], status_code=201)
async def generate_fixtures(
    body: GenerateFixturesInput,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    return await match_service.generate_fixtures(db, body.total_overs, body.venues)


# /points-table must be defined before /{match_id} to avoid UUID conflict
@router.get("/points-table")
async def points_table(
    tournament_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await match_service.get_points_table(db, tournament_id)


@router.get("", response_model=list[MatchResponse])
async def list_matches(
    status: str | None = None,
    tournament_id: Optional[uuid.UUID] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await match_service.list_matches(db, status, tournament_id, limit, offset)


@router.get("/{match_id}", response_model=MatchResponse)
async def get_match(
    match_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await match_service.get_match_detail(match_id, db)


@router.post("/{match_id}/toss", response_model=MatchResponse)
async def record_toss(
    match_id: uuid.UUID,
    body: TossInput,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await match_service.record_toss(match_id, body.toss_winner_id, body.toss_decision, db)


@router.post("/{match_id}/playing-xi", response_model=list[PlayingXIEntryResponse])
async def set_playing_xi(
    match_id: uuid.UUID,
    body: PlayingXIInput,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await match_service.set_playing_xi(match_id, body.team_id, body.player_ids, db)


@router.get("/{match_id}/playing-xi/{team_id}", response_model=list[PlayingXIEntryResponse])
async def get_playing_xi(
    match_id: uuid.UUID,
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await match_service.get_playing_xi(match_id, team_id, db)


@router.post("/{match_id}/start", response_model=MatchResponse)
async def start_match(
    match_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await match_service.start_match(match_id, db)


@router.post("/{match_id}/complete", response_model=MatchResponse)
async def complete_match(
    match_id: uuid.UUID,
    body: CompleteMatchInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import select as _select
    from app.models.match import Match as _Match
    from app.models.tournament import Tournament as _Tournament
    if current_user.role != "admin":
        res = await db.execute(
            _select(_Tournament.organizer_id)
            .join(_Match, _Match.tournament_id == _Tournament.id)
            .where(_Match.id == match_id)
        )
        organizer_id = res.scalar_one_or_none()
        if organizer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only the tournament organizer or an admin can complete a match")
    return await match_service.complete_match(match_id, body.winner_id, body.result_summary, db)
