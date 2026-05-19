import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.team import Team
from app.models.user import User
from app.schemas.challenge import AvailabilityRespond, AvailabilityResponse, ChallengeCreate, ChallengeResponse
from app.services import challenge_service

router = APIRouter(prefix="/challenges", tags=["challenges"])


@router.post("", response_model=ChallengeResponse, status_code=201)
async def create_challenge(
    team_a_id: uuid.UUID = Query(..., description="Your team's ID"),
    body: ChallengeCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await challenge_service.create_challenge(
        team_a_id=team_a_id,
        team_b_id=body.team_b_id,
        created_by=current_user.id,
        venue=body.venue,
        match_date=body.match_date,
        overs=body.overs,
        prize_amount=body.prize_amount,
        db=db,
    )


@router.get("", response_model=list[ChallengeResponse])
async def list_challenges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await challenge_service.list_challenges(current_user.id, db)


@router.get("/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge(
    challenge_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await challenge_service.get_challenge(challenge_id, db)


@router.patch("/{challenge_id}/accept", response_model=ChallengeResponse)
async def accept_challenge(
    challenge_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await challenge_service.accept_challenge(challenge_id, current_user.id, db)


@router.patch("/{challenge_id}/reject", response_model=ChallengeResponse)
async def reject_challenge(
    challenge_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await challenge_service.reject_challenge(challenge_id, current_user.id, db)


@router.post("/{challenge_id}/poll-availability", response_model=list[AvailabilityResponse])
async def poll_availability(
    challenge_id: uuid.UUID,
    team_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ch = await challenge_service.get_challenge(challenge_id, db)
    if not ch.match_id:
        from fastapi import HTTPException
        raise HTTPException(400, "Challenge has not been accepted yet — no match created")
    return await challenge_service.poll_availability(ch.match_id, team_id, current_user.id, db)


@router.get("/{challenge_id}/availability", response_model=list[AvailabilityResponse])
async def get_availability(
    challenge_id: uuid.UUID,
    team_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ch = await challenge_service.get_challenge(challenge_id, db)
    if not ch.match_id:
        return []
    return await challenge_service.get_availability(ch.match_id, team_id, db)


@router.patch("/{challenge_id}/availability/respond", response_model=AvailabilityResponse)
async def respond_availability(
    challenge_id: uuid.UUID,
    body: AvailabilityRespond,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ch = await challenge_service.get_challenge(challenge_id, db)
    if not ch.match_id:
        from fastapi import HTTPException
        raise HTTPException(400, "Challenge not yet accepted")
    return await challenge_service.respond_availability(ch.match_id, current_user.id, body.status, db)
