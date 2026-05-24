import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_user, get_db
from app.models.player import Player
from app.models.team import Team, TeamJoinRequest, TeamPlayer
from app.models.tournament import Tournament
from app.models.user import User
from app.schemas.team import JoinRequestResponse, TeamCreate, TeamPlayerResponse, TeamResponse, TeamUpdate

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("", response_model=TeamResponse, status_code=201)
async def create_team(
    data: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = Team(
        name=data.name,
        owner_id=current_user.id,
        tournament_id=data.tournament_id,
        total_budget=data.total_budget,
        remaining_budget=data.total_budget,
        city=data.city,
        description=data.description,
        open_to_challenges=data.open_to_challenges,
    )
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return team


@router.get("", response_model=list[TeamResponse])
async def list_teams(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).order_by(Team.created_at))
    return result.scalars().all()


@router.get("/standings")
async def team_standings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).order_by(Team.remaining_budget.desc()))
    teams = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "logo_url": t.logo_url,
            "total_budget": float(t.total_budget),
            "remaining_budget": float(t.remaining_budget),
            "spent": float(t.total_budget - t.remaining_budget),
        }
        for t in teams
    ]


@router.get("/my", response_model=list[TeamResponse])
async def my_teams(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Team).where(Team.owner_id == current_user.id).order_by(Team.created_at))
    return result.scalars().all()


@router.get("/discover", response_model=list[TeamResponse])
async def discover_teams(
    q: str | None = Query(None, description="Search by name"),
    city: str | None = Query(None),
    open_to_challenges: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Public team discovery — no auth required."""
    query = select(Team).order_by(Team.name)
    if q:
        query = query.where(Team.name.ilike(f"%{q}%"))
    if city:
        query = query.where(Team.city.ilike(f"%{city}%"))
    if open_to_challenges is not None:
        query = query.where(Team.open_to_challenges == open_to_challenges)
    result = await db.execute(query.limit(50))
    return result.scalars().all()


@router.get("/my-join-requests", response_model=list[JoinRequestResponse])
async def my_join_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Player sees the status of all their own join requests."""
    player_res = await db.execute(select(Player).where(Player.user_id == current_user.id))
    player_ids = [p.id for p in player_res.scalars().all()]
    if not player_ids:
        return []
    result = await db.execute(
        select(TeamJoinRequest)
        .where(TeamJoinRequest.player_id.in_(player_ids))
        .options(selectinload(TeamJoinRequest.player))
        .options(selectinload(TeamJoinRequest.team))
        .order_by(TeamJoinRequest.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(team_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team not found")
    return team


@router.get("/{team_id}/squad", response_model=list[TeamPlayerResponse])
async def get_squad(team_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TeamPlayer)
        .where(TeamPlayer.team_id == team_id)
        .options(selectinload(TeamPlayer.player))
    )
    return result.scalars().all()


@router.patch("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: uuid.UUID,
    body: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team not found")
    if team.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Only team owner can update team")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(team, field, value)
    await db.commit()
    await db.refresh(team)
    return team


@router.post("/{team_id}/join-request", response_model=JoinRequestResponse, status_code=201)
async def request_to_join(
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(404, "Team not found")

    # Find player profile belonging to this user in the same tournament
    player_res = await db.execute(
        select(Player).where(
            Player.user_id == current_user.id,
            Player.tournament_id == team.tournament_id,
        )
    )
    player = player_res.scalar_one_or_none()
    if not player:
        raise HTTPException(400, "You must register as a player in this tournament first")

    # Block if already in a team
    existing_tp = await db.execute(
        select(TeamPlayer).where(TeamPlayer.player_id == player.id)
    )
    if existing_tp.scalar_one_or_none():
        raise HTTPException(400, "You are already in a team for this tournament")

    # Block duplicate requests to the same team
    existing_req = await db.execute(
        select(TeamJoinRequest).where(
            TeamJoinRequest.team_id == team_id,
            TeamJoinRequest.player_id == player.id,
        )
    )
    if existing_req.scalar_one_or_none():
        raise HTTPException(400, "You have already requested to join this team")

    req = TeamJoinRequest(
        team_id=team_id,
        player_id=player.id,
        tournament_id=team.tournament_id,
        status="pending",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    # Load player relationship for response
    await db.refresh(req, ["player"])
    return req


@router.get("/{team_id}/join-requests", response_model=list[JoinRequestResponse])
async def list_join_requests(
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(404, "Team not found")
    if team.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Only the team owner can view join requests")

    result = await db.execute(
        select(TeamJoinRequest)
        .where(TeamJoinRequest.team_id == team_id)
        .options(selectinload(TeamJoinRequest.player))
        .options(selectinload(TeamJoinRequest.team))
        .order_by(TeamJoinRequest.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/{team_id}/join-requests/{request_id}/approve", response_model=JoinRequestResponse)
async def approve_join_request(
    team_id: uuid.UUID,
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(404, "Team not found")
    if team.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Only the team owner can approve requests")

    req_res = await db.execute(
        select(TeamJoinRequest)
        .where(TeamJoinRequest.id == request_id, TeamJoinRequest.team_id == team_id)
        .options(selectinload(TeamJoinRequest.player))
        .options(selectinload(TeamJoinRequest.team))
    )
    req = req_res.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Join request not found")
    if req.status != "pending":
        raise HTTPException(400, f"Request is already '{req.status}'")

    # Check player isn't already in a team (race condition guard)
    existing_tp = await db.execute(
        select(TeamPlayer).where(TeamPlayer.player_id == req.player_id)
    )
    if existing_tp.scalar_one_or_none():
        raise HTTPException(400, "Player is already assigned to a team")

    # Enforce squad size limit from tournament settings
    if team.tournament_id:
        tournament = await db.get(Tournament, team.tournament_id)
        if tournament and tournament.max_squad_size:
            squad_count_res = await db.execute(
                select(func.count()).where(TeamPlayer.team_id == team_id)
            )
            squad_count = squad_count_res.scalar_one()
            if squad_count >= tournament.max_squad_size:
                raise HTTPException(400, f"Squad is full ({tournament.max_squad_size} players max)")

    # Add to team
    db.add(TeamPlayer(team_id=team_id, player_id=req.player_id, sold_price=None))

    # Mark player as sold
    player = await db.get(Player, req.player_id)
    if player:
        player.status = "sold"

    # Approve this request, reject any others the player sent to different teams
    other_reqs = await db.execute(
        select(TeamJoinRequest).where(
            TeamJoinRequest.player_id == req.player_id,
            TeamJoinRequest.id != req.id,
            TeamJoinRequest.status == "pending",
        )
    )
    for other in other_reqs.scalars().all():
        other.status = "rejected"

    req.status = "approved"
    await db.commit()
    await db.refresh(req, ["player", "team"])
    return req


@router.patch("/{team_id}/join-requests/{request_id}/reject", response_model=JoinRequestResponse)
async def reject_join_request(
    team_id: uuid.UUID,
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(404, "Team not found")
    if team.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Only the team owner can reject requests")

    req_res = await db.execute(
        select(TeamJoinRequest)
        .where(TeamJoinRequest.id == request_id, TeamJoinRequest.team_id == team_id)
        .options(selectinload(TeamJoinRequest.player))
        .options(selectinload(TeamJoinRequest.team))
    )
    req = req_res.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Join request not found")
    if req.status != "pending":
        raise HTTPException(400, f"Request is already '{req.status}'")

    req.status = "rejected"
    await db.commit()
    await db.refresh(req, ["player", "team"])
    return req


@router.get("/{team_id}/budget")
async def get_budget(
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team not found")
    if team.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Access denied")
    return {
        "team_id": str(team.id),
        "name": team.name,
        "total_budget": float(team.total_budget),
        "remaining_budget": float(team.remaining_budget),
        "spent": float(team.total_budget - team.remaining_budget),
    }
