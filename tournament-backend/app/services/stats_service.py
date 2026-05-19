import uuid
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.match import Delivery, Match, Scorecard
from app.models.player import Player
from app.models.team import Team, TeamPlayer

LEGAL_TYPES = frozenset({"normal", "bye", "leg_bye"})
LEGAL_LIST = ["normal", "bye", "leg_bye"]


async def _load_players_and_teams(
    player_ids: list[uuid.UUID], db: AsyncSession
) -> tuple[dict, dict]:
    if not player_ids:
        return {}, {}
    p_res = await db.execute(select(Player).where(Player.id.in_(player_ids)))
    players = {p.id: p for p in p_res.scalars().all()}
    tp_res = await db.execute(
        select(TeamPlayer, Team)
        .join(Team, Team.id == TeamPlayer.team_id)
        .where(TeamPlayer.player_id.in_(player_ids))
    )
    teams_by_player = {tp.player_id: team for tp, team in tp_res.all()}
    return players, teams_by_player


async def _scorecard_ids_for_tournament(
    db: AsyncSession, tournament_id: uuid.UUID
) -> set[uuid.UUID]:
    res = await db.execute(
        select(Scorecard.id)
        .join(Match, Match.id == Scorecard.match_id)
        .where(Match.tournament_id == tournament_id)
    )
    return {row[0] for row in res.all()}


async def get_top_batsmen(
    db: AsyncSession, limit: int = 20, tournament_id: uuid.UUID | None = None
) -> list[dict]:
    sc_filter = None
    if tournament_id:
        sc_ids = await _scorecard_ids_for_tournament(db, tournament_id)
        if not sc_ids:
            return []
        sc_filter = Delivery.scorecard_id.in_(sc_ids)

    base = Delivery.batsman_id.isnot(None)
    where = [base, sc_filter] if sc_filter is not None else [base]

    # Main aggregation query
    bat_q = (
        select(
            Delivery.batsman_id,
            func.sum(Delivery.runs_batsman).label("runs"),
            func.count(case((Delivery.delivery_type.in_(LEGAL_LIST), 1))).label("balls"),
            func.count(case((Delivery.runs_batsman == 4, 1))).label("fours"),
            func.count(case((Delivery.runs_batsman == 6, 1))).label("sixes"),
            func.count(func.distinct(Delivery.scorecard_id)).label("innings"),
        )
        .where(*where)
        .group_by(Delivery.batsman_id)
        .order_by(func.sum(Delivery.runs_batsman).desc())
        .limit(limit)
    )
    bat_rows = (await db.execute(bat_q)).all()
    if not bat_rows:
        return []

    top_ids = [r.batsman_id for r in bat_rows]

    # High score per batsman — two-level aggregation
    inning_sq = (
        select(
            Delivery.batsman_id,
            func.sum(Delivery.runs_batsman).label("ir"),
        )
        .where(Delivery.batsman_id.in_(top_ids), *([sc_filter] if sc_filter is not None else []))
        .group_by(Delivery.batsman_id, Delivery.scorecard_id)
        .subquery()
    )
    hs_q = select(inning_sq.c.batsman_id, func.max(inning_sq.c.ir).label("hs")).group_by(inning_sq.c.batsman_id)
    hs_map = {r.batsman_id: r.hs for r in (await db.execute(hs_q)).all()}

    players, teams_by_player = await _load_players_and_teams(top_ids, db)

    result = []
    for r in bat_rows:
        player = players.get(r.batsman_id)
        if player is None:
            continue
        team = teams_by_player.get(r.batsman_id)
        balls = r.balls or 0
        runs = r.runs or 0
        innings = r.innings or 0
        result.append({
            "player_id": str(r.batsman_id),
            "name": player.name,
            "player_type": player.player_type,
            "photo_url": player.photo_url,
            "team_name": team.name if team else None,
            "innings": innings,
            "runs": runs,
            "balls": balls,
            "fours": r.fours or 0,
            "sixes": r.sixes or 0,
            "high_score": hs_map.get(r.batsman_id, 0),
            "average": round(runs / innings, 2) if innings > 0 else 0.0,
            "strike_rate": round((runs / balls) * 100, 2) if balls > 0 else 0.0,
        })
    return result


async def get_top_bowlers(
    db: AsyncSession, limit: int = 20, tournament_id: uuid.UUID | None = None
) -> list[dict]:
    sc_filter = None
    if tournament_id:
        sc_ids = await _scorecard_ids_for_tournament(db, tournament_id)
        if not sc_ids:
            return []
        sc_filter = Delivery.scorecard_id.in_(sc_ids)

    base = Delivery.bowler_id.isnot(None)
    where = [base, sc_filter] if sc_filter is not None else [base]

    # Main bowling aggregation
    bowl_q = (
        select(
            Delivery.bowler_id,
            func.count(case((Delivery.delivery_type.in_(LEGAL_LIST), 1))).label("legal_balls"),
            func.sum(Delivery.total_runs).label("runs"),
            func.count(case((Delivery.is_wicket == True, 1))).label("wickets"),
            func.count(func.distinct(Delivery.scorecard_id)).label("innings"),
        )
        .where(*where)
        .group_by(Delivery.bowler_id)
        .order_by(func.count(case((Delivery.is_wicket == True, 1))).desc())
        .limit(limit)
    )
    bowl_rows = (await db.execute(bowl_q)).all()
    if not bowl_rows:
        return []

    top_ids = [r.bowler_id for r in bowl_rows]

    # Maidens: count overs where total runs == 0
    over_sq = (
        select(
            Delivery.bowler_id,
            func.sum(Delivery.total_runs).label("over_runs"),
        )
        .where(Delivery.bowler_id.in_(top_ids), *([sc_filter] if sc_filter is not None else []))
        .group_by(Delivery.bowler_id, Delivery.scorecard_id, Delivery.over_number)
        .subquery()
    )
    maiden_q = (
        select(
            over_sq.c.bowler_id,
            func.count(case((over_sq.c.over_runs == 0, 1))).label("maidens"),
        )
        .group_by(over_sq.c.bowler_id)
    )
    maiden_map = {r.bowler_id: r.maidens for r in (await db.execute(maiden_q)).all()}

    players, teams_by_player = await _load_players_and_teams(top_ids, db)

    result = []
    for r in bowl_rows:
        player = players.get(r.bowler_id)
        if player is None:
            continue
        team = teams_by_player.get(r.bowler_id)
        lb = r.legal_balls or 0
        runs = r.runs or 0
        wickets = r.wickets or 0
        overs_dec = lb / 6
        result.append({
            "player_id": str(r.bowler_id),
            "name": player.name,
            "player_type": player.player_type,
            "photo_url": player.photo_url,
            "team_name": team.name if team else None,
            "innings": r.innings or 0,
            "overs": f"{lb // 6}.{lb % 6}",
            "runs": runs,
            "wickets": wickets,
            "economy": round(runs / overs_dec, 2) if overs_dec > 0 else 0.0,
            "average": round(runs / wickets, 2) if wickets > 0 else None,
            "maidens": maiden_map.get(r.bowler_id, 0),
        })
    return result


async def get_player_stats(player_id: uuid.UUID, db: AsyncSession) -> dict:
    player = await db.get(Player, player_id)
    if player is None:
        raise HTTPException(404, "Player not found")

    team_player_res = await db.execute(select(TeamPlayer).where(TeamPlayer.player_id == player_id))
    tp = team_player_res.scalars().first()
    team = await db.get(Team, tp.team_id) if tp else None

    bat_res = await db.execute(select(Delivery).where(Delivery.batsman_id == player_id))
    bat_deliveries = bat_res.scalars().all()

    inning_runs: dict[uuid.UUID, int] = {}
    bat_runs = bat_balls = bat_fours = bat_sixes = 0
    for d in bat_deliveries:
        inning_runs[d.scorecard_id] = inning_runs.get(d.scorecard_id, 0) + d.runs_batsman
        if d.delivery_type in LEGAL_TYPES:
            bat_balls += 1
        bat_runs += d.runs_batsman
        if d.runs_batsman == 4:
            bat_fours += 1
        if d.runs_batsman == 6:
            bat_sixes += 1

    bat_innings = len(inning_runs)
    high_score = max(inning_runs.values()) if inning_runs else 0
    fifties = sum(1 for r in inning_runs.values() if 50 <= r < 100)
    hundreds = sum(1 for r in inning_runs.values() if r >= 100)

    bowl_res = await db.execute(select(Delivery).where(Delivery.bowler_id == player_id))
    bowl_deliveries = bowl_res.scalars().all()

    bowl_innings: set = set()
    bowl_legal = bowl_runs = bowl_wickets = 0
    over_runs: dict = {}
    for d in bowl_deliveries:
        bowl_innings.add(d.scorecard_id)
        if d.delivery_type in LEGAL_TYPES:
            bowl_legal += 1
        bowl_runs += d.total_runs
        if d.is_wicket:
            bowl_wickets += 1
        ok = (d.scorecard_id, d.over_number)
        over_runs[ok] = over_runs.get(ok, 0) + d.total_runs

    bowl_maidens = sum(1 for r in over_runs.values() if r == 0)
    bowl_overs = f"{bowl_legal // 6}.{bowl_legal % 6}"
    bowl_economy = round(bowl_runs / (bowl_legal / 6), 2) if bowl_legal > 0 else 0.0
    bowl_avg = round(bowl_runs / bowl_wickets, 2) if bowl_wickets > 0 else None

    field_res = await db.execute(
        select(Delivery).where(Delivery.fielder_id == player_id, Delivery.is_wicket == True)
    )
    field_deliveries = field_res.scalars().all()
    catches = sum(1 for d in field_deliveries if d.wicket_type == "caught")
    stumpings = sum(1 for d in field_deliveries if d.wicket_type == "stumped")

    sc_ids = list(set(d.scorecard_id for d in bat_deliveries) | set(d.scorecard_id for d in bowl_deliveries))
    if sc_ids:
        sc_res = await db.execute(select(Scorecard.match_id).where(Scorecard.id.in_(sc_ids)))
        match_ids = {row[0] for row in sc_res.all()}
    else:
        match_ids = set()

    return {
        "player_id": str(player_id),
        "name": player.name,
        "age": player.age,
        "player_type": player.player_type,
        "photo_url": player.photo_url,
        "team_name": team.name if team else None,
        "sold_price": float(tp.sold_price) if tp else None,
        "matches": len(match_ids),
        "batting": {
            "innings": bat_innings,
            "runs": bat_runs,
            "balls": bat_balls,
            "fours": bat_fours,
            "sixes": bat_sixes,
            "high_score": high_score,
            "fifties": fifties,
            "hundreds": hundreds,
            "average": round(bat_runs / bat_innings, 2) if bat_innings > 0 else 0.0,
            "strike_rate": round((bat_runs / bat_balls) * 100, 2) if bat_balls > 0 else 0.0,
        },
        "bowling": {
            "innings": len(bowl_innings),
            "overs": bowl_overs,
            "runs": bowl_runs,
            "wickets": bowl_wickets,
            "economy": bowl_economy,
            "average": bowl_avg,
            "maidens": bowl_maidens,
        },
        "fielding": {
            "catches": catches,
            "stumpings": stumpings,
        },
    }


async def get_player_form(player_id: uuid.UUID, db: AsyncSession) -> dict:
    """Last 5 batting innings and last 5 bowling innings for a player."""
    player = await db.get(Player, player_id)
    if player is None:
        raise HTTPException(404, "Player not found")

    # Batting: last 5 distinct scorecards where player batted
    bat_res = await db.execute(
        select(
            Delivery.scorecard_id,
            func.sum(Delivery.runs_batsman).label("runs"),
            func.count(case((Delivery.delivery_type.in_(LEGAL_LIST), 1))).label("balls"),
        )
        .where(Delivery.batsman_id == player_id)
        .group_by(Delivery.scorecard_id)
        .order_by(Delivery.scorecard_id.desc())
        .limit(5)
    )
    batting_form = [{"scorecard_id": str(r.scorecard_id), "runs": r.runs or 0, "balls": r.balls or 0} for r in bat_res.all()]

    # Bowling: last 5 distinct scorecards where player bowled
    bowl_res = await db.execute(
        select(
            Delivery.scorecard_id,
            func.count(case((Delivery.delivery_type.in_(LEGAL_LIST), 1))).label("balls"),
            func.sum(Delivery.total_runs).label("runs"),
            func.count(case((Delivery.is_wicket == True, 1))).label("wickets"),
        )
        .where(Delivery.bowler_id == player_id)
        .group_by(Delivery.scorecard_id)
        .order_by(Delivery.scorecard_id.desc())
        .limit(5)
    )
    bowling_form = []
    for r in bowl_res.all():
        lb = r.balls or 0
        bowling_form.append({
            "scorecard_id": str(r.scorecard_id),
            "overs": f"{lb // 6}.{lb % 6}",
            "runs": r.runs or 0,
            "wickets": r.wickets or 0,
        })

    return {"batting": batting_form, "bowling": bowling_form}


async def get_team_stats(
    db: AsyncSession, tournament_id: uuid.UUID | None = None
) -> list[dict]:
    teams_q = select(Team)
    if tournament_id:
        teams_q = teams_q.where(Team.tournament_id == tournament_id)
    teams_res = await db.execute(teams_q)
    teams = teams_res.scalars().all()

    matches_q = select(Match).where(Match.status == "completed")
    if tournament_id:
        matches_q = matches_q.where(Match.tournament_id == tournament_id)
    matches_res = await db.execute(matches_q)
    completed_matches = matches_res.scalars().all()

    match_ids_all = [m.id for m in completed_matches]
    if match_ids_all:
        sc_res = await db.execute(
            select(Scorecard).where(Scorecard.match_id.in_(match_ids_all), Scorecard.is_complete == True)
        )
        all_scorecards = sc_res.scalars().all()
    else:
        all_scorecards = []

    squad_res = await db.execute(select(TeamPlayer.team_id, func.count().label("cnt")).group_by(TeamPlayer.team_id))
    squad_counts = {row.team_id: row.cnt for row in squad_res.all()}

    # Pre-index scorecards by match_id
    sc_by_match: dict = {}
    for sc in all_scorecards:
        sc_by_match.setdefault(sc.match_id, []).append(sc)

    result = []
    for team in teams:
        played = won = lost = tied = 0
        runs_scored = runs_conceded = wickets_taken = wickets_lost = 0

        for m in completed_matches:
            if m.team_a_id != team.id and m.team_b_id != team.id:
                continue
            played += 1
            if m.winner_id == team.id:
                won += 1
            elif m.winner_id is None:
                tied += 1
            else:
                lost += 1

            for sc in sc_by_match.get(m.id, []):
                if sc.batting_team_id == team.id:
                    runs_scored += sc.total_runs
                    wickets_lost += sc.total_wickets
                else:
                    runs_conceded += sc.total_runs
                    wickets_taken += sc.total_wickets

        result.append({
            "team_id": str(team.id),
            "name": team.name,
            "squad_size": squad_counts.get(team.id, 0),
            "total_budget": float(team.total_budget),
            "remaining_budget": float(team.remaining_budget),
            "spent": float(team.total_budget - team.remaining_budget),
            "matches": {
                "played": played, "won": won, "lost": lost, "tied": tied,
                "points": won * 2 + tied,
            },
            "batting": {
                "runs_scored": runs_scored, "wickets_lost": wickets_lost,
                "average_score": round(runs_scored / played, 1) if played > 0 else 0.0,
            },
            "bowling": {
                "runs_conceded": runs_conceded, "wickets_taken": wickets_taken,
                "average_conceded": round(runs_conceded / played, 1) if played > 0 else 0.0,
            },
        })

    result.sort(key=lambda x: (-x["matches"]["points"], -x["matches"]["won"]))
    return result
