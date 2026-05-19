import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.challenge import MatchChallenge, PlayerAvailability
from app.models.match import Match
from app.models.player import Player
from app.models.team import Team, TeamPlayer


async def _get_my_team(team_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Team:
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(404, "Team not found")
    if team.owner_id != user_id:
        raise HTTPException(403, "Only the team captain can perform this action")
    return team


async def create_challenge(
    team_a_id: uuid.UUID,
    team_b_id: uuid.UUID,
    created_by: uuid.UUID,
    venue: str | None,
    match_date: datetime | None,
    overs: int,
    prize_amount: Decimal | None,
    db: AsyncSession,
) -> MatchChallenge:
    await _get_my_team(team_a_id, created_by, db)

    team_b = await db.get(Team, team_b_id)
    if not team_b:
        raise HTTPException(404, "Opponent team not found")
    if team_a_id == team_b_id:
        raise HTTPException(400, "A team cannot challenge itself")

    challenge = MatchChallenge(
        team_a_id=team_a_id,
        team_b_id=team_b_id,
        created_by=created_by,
        venue=venue,
        match_date=match_date,
        overs=overs,
        prize_amount=prize_amount,
        status="pending",
    )
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)
    await db.refresh(challenge, ["team_a", "team_b"])
    return challenge


async def list_challenges(user_id: uuid.UUID, db: AsyncSession) -> list[MatchChallenge]:
    # All challenges where I am captain of either team
    my_teams_res = await db.execute(select(Team.id).where(Team.owner_id == user_id))
    my_team_ids = [r[0] for r in my_teams_res.all()]
    if not my_team_ids:
        return []

    result = await db.execute(
        select(MatchChallenge)
        .where(
            (MatchChallenge.team_a_id.in_(my_team_ids)) |
            (MatchChallenge.team_b_id.in_(my_team_ids))
        )
        .options(selectinload(MatchChallenge.team_a), selectinload(MatchChallenge.team_b))
        .order_by(MatchChallenge.created_at.desc())
    )
    return result.scalars().all()


async def get_challenge(challenge_id: uuid.UUID, db: AsyncSession) -> MatchChallenge:
    result = await db.execute(
        select(MatchChallenge)
        .where(MatchChallenge.id == challenge_id)
        .options(selectinload(MatchChallenge.team_a), selectinload(MatchChallenge.team_b))
    )
    ch = result.scalar_one_or_none()
    if not ch:
        raise HTTPException(404, "Challenge not found")
    return ch


async def accept_challenge(challenge_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> MatchChallenge:
    ch = await get_challenge(challenge_id, db)
    if ch.status != "pending":
        raise HTTPException(400, f"Challenge is already '{ch.status}'")
    await _get_my_team(ch.team_b_id, user_id, db)

    # Create the match
    match = Match(
        team_a_id=ch.team_a_id,
        team_b_id=ch.team_b_id,
        venue=ch.venue,
        match_date=ch.match_date,
        total_overs=ch.overs,
        prize_amount=ch.prize_amount,
        status="scheduled",
        stage=None,
    )
    db.add(match)
    await db.flush()  # get match.id

    ch.status = "accepted"
    ch.match_id = match.id
    await db.commit()
    await db.refresh(ch)
    await db.refresh(ch, ["team_a", "team_b"])
    return ch


async def reject_challenge(challenge_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> MatchChallenge:
    ch = await get_challenge(challenge_id, db)
    if ch.status != "pending":
        raise HTTPException(400, f"Challenge is already '{ch.status}'")
    await _get_my_team(ch.team_b_id, user_id, db)

    ch.status = "rejected"
    await db.commit()
    await db.refresh(ch)
    await db.refresh(ch, ["team_a", "team_b"])
    return ch


async def poll_availability(
    match_id: uuid.UUID, team_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> list[PlayerAvailability]:
    await _get_my_team(team_id, user_id, db)

    # Verify team is part of this match
    match = await db.get(Match, match_id)
    if not match:
        raise HTTPException(404, "Match not found")
    if team_id not in (match.team_a_id, match.team_b_id):
        raise HTTPException(400, "Your team is not part of this match")

    # Get all squad members
    squad_res = await db.execute(
        select(TeamPlayer).where(TeamPlayer.team_id == team_id)
    )
    squad = squad_res.scalars().all()
    if not squad:
        raise HTTPException(400, "Your team has no players in the squad yet")

    # Create pending records for players not yet polled; skip existing
    existing_res = await db.execute(
        select(PlayerAvailability.player_id).where(
            PlayerAvailability.match_id == match_id,
            PlayerAvailability.team_id == team_id,
        )
    )
    already_polled = {r[0] for r in existing_res.all()}

    new_records = []
    for tp in squad:
        if tp.player_id not in already_polled:
            rec = PlayerAvailability(
                match_id=match_id,
                team_id=team_id,
                player_id=tp.player_id,
                status="pending",
            )
            db.add(rec)
            new_records.append(rec)

    await db.commit()

    # Return all availability records for this team/match
    result = await db.execute(
        select(PlayerAvailability)
        .where(PlayerAvailability.match_id == match_id, PlayerAvailability.team_id == team_id)
        .options(selectinload(PlayerAvailability.player))
        .order_by(PlayerAvailability.created_at)
    )
    return result.scalars().all()


async def get_availability(
    match_id: uuid.UUID, team_id: uuid.UUID, db: AsyncSession
) -> list[PlayerAvailability]:
    result = await db.execute(
        select(PlayerAvailability)
        .where(PlayerAvailability.match_id == match_id, PlayerAvailability.team_id == team_id)
        .options(selectinload(PlayerAvailability.player))
        .order_by(PlayerAvailability.created_at)
    )
    return result.scalars().all()


async def respond_availability(
    match_id: uuid.UUID, user_id: uuid.UUID, status: str, db: AsyncSession
) -> PlayerAvailability:
    if status not in ("available", "unavailable"):
        raise HTTPException(400, "status must be 'available' or 'unavailable'")

    # Find player profile for this user
    player_res = await db.execute(select(Player).where(Player.user_id == user_id))
    players = player_res.scalars().all()
    if not players:
        raise HTTPException(400, "You don't have a player profile")

    player_ids = [p.id for p in players]
    rec_res = await db.execute(
        select(PlayerAvailability)
        .where(
            PlayerAvailability.match_id == match_id,
            PlayerAvailability.player_id.in_(player_ids),
        )
        .options(selectinload(PlayerAvailability.player))
    )
    recs = rec_res.scalars().all()
    if not recs:
        raise HTTPException(404, "No availability request found for you in this match")

    now = datetime.now(timezone.utc)
    for rec in recs:
        rec.status = status
        rec.responded_at = now

    await db.commit()
    await db.refresh(recs[0], ["player"])
    return recs[0]
