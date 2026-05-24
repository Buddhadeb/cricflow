import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_user, get_db
from app.models.match import Match
from app.models.player import Player
from app.models.team import Team
from app.models.tournament import Tournament
from app.models.user import User
from app.schemas.match import MatchResponse
from app.schemas.player import PlayerResponse
from app.schemas.tournament import TournamentCreate, TournamentResponse, TournamentUpdate
from app.utils.upload import upload_player_photo


class TournamentTeamCreate(BaseModel):
    name: str
    owner_email: Optional[str] = None
    total_budget: Optional[Decimal] = None


class TeamOwnerAssign(BaseModel):
    owner_email: str


class ManualPlayerCreate(BaseModel):
    name: str
    age: int
    dob: Optional[date] = None
    address: str
    phone: Optional[str] = None
    player_type: Literal["batsman", "bowler", "all_rounder", "wicket_keeper"]
    tshirt_size: Literal["S", "M", "L", "XL", "XXL"] = "M"
    jersey_number: Optional[int] = None
    base_price: Optional[Decimal] = None


class TournamentMatchCreate(BaseModel):
    team_a_id: uuid.UUID
    team_b_id: uuid.UUID
    match_date: Optional[datetime] = None
    venue: Optional[str] = None
    stage: str = "league"
    total_overs: Optional[int] = None


class TournamentFixturesGenerate(BaseModel):
    total_overs: Optional[int] = None
    venues: Optional[List[str]] = None

router = APIRouter(prefix="/tournaments", tags=["tournaments"])


@router.get("", response_model=List[TournamentResponse])
async def list_tournaments(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Tournament).where(Tournament.is_public == True)
    if status:
        q = q.where(Tournament.status == status)
    result = await db.execute(q.order_by(Tournament.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=TournamentResponse)
async def create_tournament(
    body: TournamentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tournament = Tournament(
        id=uuid.uuid4(),
        organizer_id=current_user.id,
        **body.model_dump(),
    )
    db.add(tournament)
    await db.commit()
    await db.refresh(tournament)
    return tournament


@router.get("/my", response_model=List[TournamentResponse])
async def my_tournaments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(
            Tournament,
            func.count(func.distinct(Player.id)).label("player_count"),
            func.count(func.distinct(Team.id)).label("team_count"),
        )
        .outerjoin(Player, Player.tournament_id == Tournament.id)
        .outerjoin(Team, Team.tournament_id == Tournament.id)
        .where(Tournament.organizer_id == current_user.id)
        .group_by(Tournament.id)
        .order_by(Tournament.created_at.desc())
    )).all()

    result = []
    for t, pc, tc in rows:
        d = TournamentResponse.model_validate(t).model_dump()
        d["player_count"] = pc
        d["team_count"] = tc
        result.append(d)
    return result


@router.get("/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(
    tournament_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tournament).where(Tournament.id == tournament_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tournament not found")
    return t


@router.patch("/{tournament_id}", response_model=TournamentResponse)
async def update_tournament(
    tournament_id: uuid.UUID,
    body: TournamentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tournament).where(Tournament.id == tournament_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tournament not found")
    if t.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Not your tournament")

    for field, val in body.model_dump(exclude_none=True).items():
        setattr(t, field, val)
    await db.commit()
    await db.refresh(t)
    return t


@router.delete("/{tournament_id}", status_code=204)
async def delete_tournament(
    tournament_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tournament).where(Tournament.id == tournament_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tournament not found")
    if t.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Not your tournament")
    await db.delete(t)
    await db.commit()


# ── Players in tournament ───────────────────────────────────────────────────


@router.get("/{tournament_id}/players")
async def list_tournament_players(
    tournament_id: uuid.UUID,
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Player)
        .where(Player.tournament_id == tournament_id)
        .options(selectinload(Player.payment))
    )
    if status:
        q = q.where(Player.status == status)
    result = await db.execute(q.order_by(Player.name))
    players = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "user_id": str(p.user_id) if p.user_id else None,
            "name": p.name,
            "player_type": p.player_type,
            "base_price": float(p.base_price),
            "status": p.status,
            "photo_url": p.photo_url,
            "age": p.age,
            "payment_status": p.payment.status if p.payment else None,
        }
        for p in players
    ]


@router.post("/{tournament_id}/players/manual", response_model=PlayerResponse, status_code=201)
async def add_player_manually(
    tournament_id: uuid.UUID,
    first_name: str = Form(...),
    last_name: str = Form(...),
    age: int = Form(...),
    address: str = Form(...),
    player_type: str = Form(...),
    tshirt_size: str = Form("M"),
    dob: Optional[str] = Form(None),
    ps: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    jersey_number: Optional[int] = Form(None),
    base_price: Optional[Decimal] = Form(None),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Organizer manually registers a player from an offline form. Auto-approved, ready for auction."""
    tournament = await db.get(Tournament, tournament_id)
    if not tournament:
        raise HTTPException(404, "Tournament not found")
    if tournament.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Only the tournament organizer can add players manually")

    name = f"{first_name.strip()} {last_name.strip()}".strip()
    if len(name) < 2:
        raise HTTPException(400, "Name must be at least 2 characters")
    if not (15 <= age <= 60):
        raise HTTPException(400, "Age must be between 15 and 60")
    if player_type not in {"batsman", "bowler", "all_rounder", "wicket_keeper"}:
        raise HTTPException(400, "Invalid player_type")

    full_address = ", ".join(filter(None, [address.strip(), f"P.S. {ps.strip()}" if ps else None]))

    parsed_dob = None
    if dob:
        try:
            from datetime import date as date_type
            parsed_dob = date_type.fromisoformat(dob)
        except ValueError:
            pass

    photo_url = None
    if photo and photo.filename:
        photo_url = await upload_player_photo(photo)

    effective_base = base_price or tournament.player_base_price or Decimal("1000.00")

    player = Player(
        id=uuid.uuid4(),
        user_id=None,
        tournament_id=tournament_id,
        name=name,
        age=age,
        dob=parsed_dob,
        address=full_address,
        phone=phone or None,
        player_type=player_type,
        tshirt_size=tshirt_size,
        jersey_number=jersey_number,
        base_price=effective_base,
        photo_url=photo_url,
        status="available",
        is_approved=True,
    )
    db.add(player)
    await db.commit()
    await db.refresh(player)
    return player


@router.patch("/{tournament_id}/players/{player_id}/approve", status_code=200)
async def approve_player(
    tournament_id: uuid.UUID,
    player_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await _get_own_tournament(tournament_id, current_user, db)

    result = await db.execute(
        select(Player).where(Player.id == player_id, Player.tournament_id == tournament_id)
    )
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(404, "Player not found in this tournament")

    player.is_approved = True
    player.status = "available"
    await db.commit()
    return {"message": "Player approved"}


@router.patch("/{tournament_id}/players/{player_id}/reject", status_code=200)
async def reject_player(
    tournament_id: uuid.UUID,
    player_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_own_tournament(tournament_id, current_user, db)

    result = await db.execute(
        select(Player).where(Player.id == player_id, Player.tournament_id == tournament_id)
    )
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(404, "Player not found in this tournament")

    player.status = "pending"
    player.is_approved = False
    await db.commit()
    return {"message": "Player rejected"}


# ── Teams in tournament ─────────────────────────────────────────────────────


@router.get("/{tournament_id}/teams")
async def list_tournament_teams(
    tournament_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(Team, User.name.label("owner_name"), User.email.label("owner_email"))
        .outerjoin(User, User.id == Team.owner_id)
        .where(Team.tournament_id == tournament_id)
        .order_by(Team.name)
    )).all()
    return [
        {
            "id": str(t.id),
            "owner_id": str(t.owner_id) if t.owner_id else None,
            "owner_name": owner_name,
            "owner_email": owner_email,
            "name": t.name,
            "logo_url": t.logo_url,
            "total_budget": float(t.total_budget),
            "remaining_budget": float(t.remaining_budget),
        }
        for t, owner_name, owner_email in rows
    ]


@router.post("/{tournament_id}/teams", status_code=201)
async def create_tournament_team(
    tournament_id: uuid.UUID,
    body: TournamentTeamCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await _get_own_tournament(tournament_id, current_user, db)

    owner = None
    if body.owner_email:
        result = await db.execute(select(User).where(User.email == body.owner_email))
        owner = result.scalar_one_or_none()
        if not owner:
            raise HTTPException(404, f"No user found with email '{body.owner_email}'")

    budget = body.total_budget or t.team_budget_limit or Decimal("1000000.00")

    team = Team(
        name=body.name,
        owner_id=owner.id if owner else None,
        tournament_id=tournament_id,
        total_budget=budget,
        remaining_budget=budget,
    )
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return {
        "id": str(team.id),
        "name": team.name,
        "owner_id": str(owner.id) if owner else None,
        "owner_name": owner.name if owner else None,
        "owner_email": body.owner_email,
        "total_budget": float(team.total_budget),
        "remaining_budget": float(team.remaining_budget),
    }


@router.patch("/{tournament_id}/teams/{team_id}/owner", status_code=200)
async def assign_team_owner(
    tournament_id: uuid.UUID,
    team_id: uuid.UUID,
    body: TeamOwnerAssign,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_own_tournament(tournament_id, current_user, db)

    result = await db.execute(select(Team).where(Team.id == team_id, Team.tournament_id == tournament_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team not found in this tournament")

    user_result = await db.execute(select(User).where(User.email == body.owner_email))
    owner = user_result.scalar_one_or_none()
    if not owner:
        raise HTTPException(404, f"No user found with email '{body.owner_email}'")

    team.owner_id = owner.id
    await db.commit()
    return {
        "id": str(team.id),
        "name": team.name,
        "owner_id": str(owner.id),
        "owner_name": owner.name,
        "owner_email": owner.email,
    }


# ── Matches in tournament ───────────────────────────────────────────────────


@router.post("/{tournament_id}/matches/generate", response_model=list[MatchResponse], status_code=201)
async def generate_tournament_fixtures(
    tournament_id: uuid.UUID,
    body: TournamentFixturesGenerate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await _get_own_tournament(tournament_id, current_user, db)

    existing = await db.execute(select(Match).where(Match.tournament_id == tournament_id).limit(1))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Fixtures already generated for this tournament")

    teams_res = await db.execute(
        select(Team).where(Team.tournament_id == tournament_id).order_by(Team.created_at)
    )
    teams = teams_res.scalars().all()
    if len(teams) < 2:
        raise HTTPException(400, "Need at least 2 teams to generate fixtures")

    overs = body.total_overs or t.overs
    venue_list = body.venues or ([t.venue] if t.venue else ["Stadium A", "Stadium B", "Cricket Ground", "Sports Arena"])
    start_date = datetime.now(timezone.utc).replace(hour=14, minute=0, second=0, microsecond=0) + timedelta(days=1)

    matches: list[Match] = []
    idx = 0
    for i, team_a in enumerate(teams):
        for team_b in teams[i + 1:]:
            m = Match(
                tournament_id=tournament_id,
                team_a_id=team_a.id,
                team_b_id=team_b.id,
                venue=venue_list[idx % len(venue_list)],
                stage="league",
                match_date=start_date + timedelta(days=idx * 2),
                total_overs=overs,
                status="scheduled",
            )
            db.add(m)
            matches.append(m)
            idx += 1

    await db.commit()
    for m in matches:
        await db.refresh(m)
    return matches


@router.post("/{tournament_id}/matches", response_model=MatchResponse, status_code=201)
async def schedule_match(
    tournament_id: uuid.UUID,
    body: TournamentMatchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await _get_own_tournament(tournament_id, current_user, db)

    if body.team_a_id == body.team_b_id:
        raise HTTPException(400, "Team A and Team B must be different")

    for label, tid in [("Team A", body.team_a_id), ("Team B", body.team_b_id)]:
        team = await db.get(Team, tid)
        if not team or team.tournament_id != tournament_id:
            raise HTTPException(400, f"{label} does not belong to this tournament")

    match = Match(
        tournament_id=tournament_id,
        team_a_id=body.team_a_id,
        team_b_id=body.team_b_id,
        venue=body.venue or t.venue,
        stage=body.stage,
        match_date=body.match_date,
        total_overs=body.total_overs or t.overs,
        status="scheduled",
    )
    db.add(match)
    await db.commit()
    await db.refresh(match)
    return match


# ── Status transitions ──────────────────────────────────────────────────────


@router.post("/{tournament_id}/start-auction", status_code=200)
async def start_auction_phase(
    tournament_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await _get_own_tournament(tournament_id, current_user, db)
    if t.status != "registration":
        raise HTTPException(400, f"Cannot start auction from status '{t.status}'")
    t.status = "auction"
    await db.commit()
    return {"message": "Tournament moved to auction phase"}


@router.post("/{tournament_id}/start-league", status_code=200)
async def start_league_phase(
    tournament_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await _get_own_tournament(tournament_id, current_user, db)
    if t.status != "auction":
        raise HTTPException(400, f"Cannot start league from status '{t.status}'")
    t.status = "league"
    await db.commit()
    return {"message": "Tournament moved to league phase"}


@router.post("/{tournament_id}/complete", status_code=200)
async def complete_tournament(
    tournament_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await _get_own_tournament(tournament_id, current_user, db)
    t.status = "completed"
    await db.commit()
    return {"message": "Tournament completed"}


# ── Helper ──────────────────────────────────────────────────────────────────


async def _get_own_tournament(
    tournament_id: uuid.UUID, current_user: User, db: AsyncSession
) -> Tournament:
    result = await db.execute(select(Tournament).where(Tournament.id == tournament_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tournament not found")
    if t.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Not your tournament")
    return t
