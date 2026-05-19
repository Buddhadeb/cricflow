import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.match import Match, MatchPlayingXI, Scorecard  # noqa: F401 Scorecard used in points table
from app.models.team import Team


async def _get_match(match_id: uuid.UUID, db: AsyncSession) -> Match:
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(404, "Match not found")
    return match


async def generate_fixtures(
    db: AsyncSession,
    total_overs: int = 20,
    venues: list[str] | None = None,
) -> list[Match]:
    existing = await db.execute(select(Match).limit(1))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Fixtures already generated. Delete existing matches first.")

    result = await db.execute(select(Team).order_by(Team.created_at))
    teams = result.scalars().all()
    if len(teams) < 2:
        raise HTTPException(400, "Need at least 2 teams to generate fixtures")

    venue_list = venues or ["Stadium A", "Stadium B", "Cricket Ground", "Sports Arena"]
    start_date = datetime.now(timezone.utc).replace(hour=14, minute=0, second=0, microsecond=0) + timedelta(days=1)

    matches: list[Match] = []
    idx = 0
    for i, team_a in enumerate(teams):
        for team_b in teams[i + 1 :]:
            m = Match(
                team_a_id=team_a.id,
                team_b_id=team_b.id,
                venue=venue_list[idx % len(venue_list)],
                stage="league",
                match_date=start_date + timedelta(days=idx * 2),
                total_overs=total_overs,
                status="scheduled",
            )
            db.add(m)
            matches.append(m)
            idx += 1

    await db.commit()
    for m in matches:
        await db.refresh(m)
    return matches


async def list_matches(
    db: AsyncSession,
    status: str | None = None,
    tournament_id: uuid.UUID | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[Match]:
    q = select(Match).order_by(Match.match_date)
    if status:
        q = q.where(Match.status == status)
    if tournament_id:
        q = q.where(Match.tournament_id == tournament_id)
    result = await db.execute(q.limit(limit).offset(offset))
    return result.scalars().all()


async def get_match_detail(match_id: uuid.UUID, db: AsyncSession) -> Match:
    result = await db.execute(
        select(Match)
        .where(Match.id == match_id)
        .options(
            selectinload(Match.team_a),
            selectinload(Match.team_b),
            selectinload(Match.toss_winner),
            selectinload(Match.winner),
            selectinload(Match.scorecards),
            selectinload(Match.playing_xi).selectinload(MatchPlayingXI.player),
        )
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(404, "Match not found")
    return match


async def record_toss(
    match_id: uuid.UUID,
    toss_winner_id: uuid.UUID,
    toss_decision: str,
    db: AsyncSession,
) -> Match:
    match = await _get_match(match_id, db)
    if match.status != "scheduled":
        raise HTTPException(400, f"Cannot record toss for match with status '{match.status}'")
    if toss_winner_id not in (match.team_a_id, match.team_b_id):
        raise HTTPException(400, "Toss winner must be one of the two playing teams")

    match.toss_winner_id = toss_winner_id
    match.toss_decision = toss_decision
    await db.commit()
    await db.refresh(match)
    return match


async def set_playing_xi(
    match_id: uuid.UUID,
    team_id: uuid.UUID,
    player_ids: list[uuid.UUID],
    db: AsyncSession,
) -> list[MatchPlayingXI]:
    match = await _get_match(match_id, db)
    if match.status not in ("scheduled", "live"):
        raise HTTPException(400, f"Cannot set playing XI for match with status '{match.status}'")
    if team_id not in (match.team_a_id, match.team_b_id):
        raise HTTPException(400, "Team is not playing in this match")
    if len(player_ids) != 11:
        raise HTTPException(400, "Playing XI must have exactly 11 players")

    # Validate all players belong to the team
    from app.models.team import TeamPlayer
    squad_res = await db.execute(
        select(TeamPlayer.player_id).where(TeamPlayer.team_id == team_id)
    )
    squad_ids = {row[0] for row in squad_res.all()}
    invalid = [str(pid) for pid in player_ids if pid not in squad_ids]
    if invalid:
        raise HTTPException(400, f"Players not in team squad: {', '.join(invalid)}")

    # Clear existing XI for this team in this match
    await db.execute(
        delete(MatchPlayingXI).where(
            MatchPlayingXI.match_id == match_id,
            MatchPlayingXI.team_id == team_id,
        )
    )

    entries = [
        MatchPlayingXI(
            match_id=match_id,
            team_id=team_id,
            player_id=pid,
            batting_order=order + 1,
        )
        for order, pid in enumerate(player_ids)
    ]
    db.add_all(entries)
    await db.commit()
    for e in entries:
        await db.refresh(e)
    return entries


async def get_playing_xi(
    match_id: uuid.UUID, team_id: uuid.UUID, db: AsyncSession
) -> list[MatchPlayingXI]:
    result = await db.execute(
        select(MatchPlayingXI)
        .where(MatchPlayingXI.match_id == match_id, MatchPlayingXI.team_id == team_id)
        .options(selectinload(MatchPlayingXI.player))
        .order_by(MatchPlayingXI.batting_order)
    )
    return result.scalars().all()


async def start_match(match_id: uuid.UUID, db: AsyncSession) -> Match:
    match = await _get_match(match_id, db)
    if match.status != "scheduled":
        raise HTTPException(400, f"Match is already '{match.status}'")
    if not match.toss_winner_id or not match.toss_decision:
        raise HTTPException(400, "Record the toss before starting the match")

    # Determine batting order from toss
    if match.toss_decision == "bat":
        first_bat_id = match.toss_winner_id
    else:
        first_bat_id = (
            match.team_b_id if match.team_a_id == match.toss_winner_id else match.team_a_id
        )
    second_bat_id = match.team_b_id if first_bat_id == match.team_a_id else match.team_a_id

    db.add(Scorecard(match_id=match.id, batting_team_id=first_bat_id, innings_number=1))
    db.add(Scorecard(match_id=match.id, batting_team_id=second_bat_id, innings_number=2))
    match.status = "live"
    await db.commit()
    await db.refresh(match)
    return match


async def complete_match(
    match_id: uuid.UUID,
    winner_id: uuid.UUID | None,
    result_summary: str,
    db: AsyncSession,
) -> Match:
    match = await _get_match(match_id, db)
    if match.status != "live":
        raise HTTPException(400, f"Cannot complete match with status '{match.status}' — match must be live")
    if winner_id and winner_id not in (match.team_a_id, match.team_b_id):
        raise HTTPException(400, "Winner must be one of the two playing teams")

    match.status = "completed"
    match.winner_id = winner_id
    match.result_summary = result_summary
    await db.commit()
    await db.refresh(match)
    return match


def _overs_str_to_float(overs) -> float:
    """Convert '19.4' or Decimal('19.4') to 19.667 (proper fraction)."""
    parts = str(overs).split(".")
    full = int(parts[0])
    balls = int(parts[1]) if len(parts) > 1 else 0
    return full + balls / 6


async def get_points_table(db: AsyncSession, tournament_id: uuid.UUID | None = None) -> list[dict]:
    teams_q = select(Team).order_by(Team.name)
    if tournament_id:
        teams_q = teams_q.where(Team.tournament_id == tournament_id)
    teams_result = await db.execute(teams_q)
    teams = {t.id: t for t in teams_result.scalars().all()}

    matches_q = select(Match).where(Match.status == "completed")
    if tournament_id:
        matches_q = matches_q.where(Match.tournament_id == tournament_id)
    completed = (await db.execute(matches_q)).scalars().all()

    # Fetch completed scorecards for NRR calculation
    match_ids = [m.id for m in completed]
    scorecards: list[Scorecard] = []
    if match_ids:
        sc_res = await db.execute(
            select(Scorecard)
            .where(Scorecard.match_id.in_(match_ids), Scorecard.is_complete == True)
        )
        scorecards = sc_res.scalars().all()

    stats: dict[uuid.UUID, dict] = {
        tid: {
            "team_id": str(tid),
            "name": t.name,
            "logo_url": t.logo_url,
            "played": 0, "won": 0, "lost": 0, "no_result": 0, "points": 0,
            "_runs_scored": 0, "_overs_batted": 0.0,
            "_runs_conceded": 0, "_overs_bowled": 0.0,
        }
        for tid, t in teams.items()
    }

    for m in completed:
        for tid in (m.team_a_id, m.team_b_id):
            if tid and tid in stats:
                stats[tid]["played"] += 1
        if m.winner_id and m.winner_id in stats:
            loser_id = m.team_b_id if m.team_a_id == m.winner_id else m.team_a_id
            stats[m.winner_id]["won"] += 1
            stats[m.winner_id]["points"] += 2
            if loser_id and loser_id in stats:
                stats[loser_id]["lost"] += 1
        elif not m.winner_id:
            for tid in (m.team_a_id, m.team_b_id):
                if tid and tid in stats:
                    stats[tid]["no_result"] += 1
                    stats[tid]["points"] += 1

    # NRR from scorecards
    match_map = {m.id: m for m in completed}
    for sc in scorecards:
        m = match_map.get(sc.match_id)
        if not m or not sc.batting_team_id:
            continue
        overs = _overs_str_to_float(sc.total_overs)
        if overs == 0:
            continue
        batting_tid = sc.batting_team_id
        bowling_tid = m.team_b_id if m.team_a_id == batting_tid else m.team_a_id
        if batting_tid in stats:
            stats[batting_tid]["_runs_scored"] += sc.total_runs
            stats[batting_tid]["_overs_batted"] += overs
        if bowling_tid in stats:
            stats[bowling_tid]["_runs_conceded"] += sc.total_runs
            stats[bowling_tid]["_overs_bowled"] += overs

    result = []
    for s in stats.values():
        rpo_scored = s["_runs_scored"] / s["_overs_batted"] if s["_overs_batted"] > 0 else 0.0
        rpo_conceded = s["_runs_conceded"] / s["_overs_bowled"] if s["_overs_bowled"] > 0 else 0.0
        nrr = round(rpo_scored - rpo_conceded, 3)
        result.append({
            "team_id": s["team_id"],
            "name": s["name"],
            "logo_url": s["logo_url"],
            "played": s["played"],
            "won": s["won"],
            "lost": s["lost"],
            "no_result": s["no_result"],
            "points": s["points"],
            "nrr": nrr,
        })

    return sorted(result, key=lambda x: (-x["points"], -x["won"], -x["nrr"], x["name"]))
