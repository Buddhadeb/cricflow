import uuid
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.match import Match, MatchPlayingXI, Scorecard, Delivery
from app.models.player import Player
from app.models.team import Team
from app.schemas.match import DeliveryInput

LEGAL_TYPES = frozenset({"normal", "bye", "leg_bye"})
EXTRA_TYPES = frozenset({"wide", "no_ball"})


def _overs_decimal(legal_balls: int) -> Decimal:
    return Decimal(f"{legal_balls // 6}.{legal_balls % 6}")


async def _active_scorecard(match_id: uuid.UUID, db: AsyncSession) -> Scorecard:
    res = await db.execute(
        select(Scorecard)
        .where(Scorecard.match_id == match_id, Scorecard.is_complete == False)
        .order_by(Scorecard.innings_number)
    )
    sc = res.scalars().first()
    if sc is None:
        raise HTTPException(409, "No active innings for this match")
    return sc


async def record_delivery(match_id: uuid.UUID, payload: DeliveryInput, db: AsyncSession) -> dict:
    match = await db.get(Match, match_id)
    if match is None:
        raise HTTPException(404, "Match not found")
    if match.status != "live":
        raise HTTPException(409, "Match is not live")

    sc = await _active_scorecard(match_id, db)

    # Validate batsman and bowler are in their team's playing XI
    if payload.batsman_id:
        bat_xi = await db.execute(
            select(MatchPlayingXI).where(
                MatchPlayingXI.match_id == match_id,
                MatchPlayingXI.player_id == payload.batsman_id,
            )
        )
        if not bat_xi.scalar_one_or_none():
            raise HTTPException(400, "Batsman is not in the playing XI for this match")
    if payload.bowler_id:
        bowl_xi = await db.execute(
            select(MatchPlayingXI).where(
                MatchPlayingXI.match_id == match_id,
                MatchPlayingXI.player_id == payload.bowler_id,
            )
        )
        if not bowl_xi.scalar_one_or_none():
            raise HTTPException(400, "Bowler is not in the playing XI for this match")

    res = await db.execute(select(Delivery).where(Delivery.scorecard_id == sc.id))
    existing = res.scalars().all()
    prev_legal = sum(1 for d in existing if d.delivery_type in LEGAL_TYPES)

    is_legal = payload.delivery_type in LEGAL_TYPES
    over_num = prev_legal // 6
    ball_num = (prev_legal % 6 + 1) if is_legal else 0

    delivery = Delivery(
        scorecard_id=sc.id,
        bowler_id=payload.bowler_id,
        batsman_id=payload.batsman_id,
        non_striker_id=payload.non_striker_id,
        over_number=over_num,
        ball_number=ball_num,
        runs_batsman=payload.runs_batsman,
        runs_extras=payload.runs_extras,
        total_runs=payload.runs_batsman + payload.runs_extras,
        delivery_type=payload.delivery_type,
        is_wicket=payload.is_wicket,
        wicket_type=payload.wicket_type,
        fielder_id=payload.fielder_id,
    )
    db.add(delivery)
    await db.flush()

    new_legal = prev_legal + (1 if is_legal else 0)
    sc.total_runs += delivery.total_runs
    sc.total_wickets += 1 if payload.is_wicket else 0
    sc.extras += payload.runs_extras
    sc.total_overs = _overs_decimal(new_legal)
    db.add(sc)

    events = []
    events.append({
        "type": "DELIVERY",
        "innings": sc.innings_number,
        "over": over_num,
        "ball": ball_num,
        "delivery_type": payload.delivery_type,
        "runs_batsman": payload.runs_batsman,
        "runs_extras": payload.runs_extras,
        "total": delivery.total_runs,
        "is_wicket": payload.is_wicket,
        "wicket_type": payload.wicket_type,
        "score": f"{sc.total_runs}/{sc.total_wickets}",
        "overs": str(sc.total_overs),
    })

    if payload.is_wicket:
        events.append({"type": "WICKET", "wicket_type": payload.wicket_type, "batsman_id": str(payload.batsman_id)})

    if is_legal and new_legal > 0 and new_legal % 6 == 0:
        events.append({"type": "OVER_COMPLETE", "over": over_num})

    innings_done = sc.total_wickets >= 10 or new_legal >= match.total_overs * 6
    if innings_done:
        sc.is_complete = True
        db.add(sc)

        if sc.innings_number == 1:
            events.append({
                "type": "INNINGS_COMPLETE",
                "innings": 1,
                "runs": sc.total_runs,
                "target": sc.total_runs + 1,
            })
        else:
            inn1_res = await db.execute(
                select(Scorecard).where(Scorecard.match_id == match_id, Scorecard.innings_number == 1)
            )
            inn1 = inn1_res.scalars().first()
            inn1_runs = inn1.total_runs if inn1 else 0

            if sc.total_runs > inn1_runs:
                winner_id = sc.batting_team_id
                margin = f"{10 - sc.total_wickets} wicket(s)"
            elif sc.total_runs == inn1_runs:
                winner_id = None
                margin = "tied"
            else:
                bowling_team = match.team_a_id if sc.batting_team_id == match.team_b_id else match.team_b_id
                winner_id = bowling_team
                margin = f"{inn1_runs - sc.total_runs} run(s)"

            winner_name = ""
            if winner_id:
                team = await db.get(Team, winner_id)
                winner_name = team.name if team else str(winner_id)

            result_summary = f"{winner_name} won by {margin}" if winner_id else "Match tied"
            match.status = "completed"
            match.winner_id = winner_id
            match.result_summary = result_summary
            db.add(match)

            events.append({
                "type": "MATCH_COMPLETE",
                "winner_id": str(winner_id) if winner_id else None,
                "result_summary": result_summary,
            })

    await db.commit()
    return {"events": events}


async def undo_last_delivery(match_id: uuid.UUID, db: AsyncSession) -> dict:
    match = await db.get(Match, match_id)
    if match is None:
        raise HTTPException(404, "Match not found")
    if match.status == "completed":
        raise HTTPException(409, "Cannot undo: match is already completed")
    if match.status != "live":
        raise HTTPException(409, "Cannot undo: match is not live")

    res = await db.execute(
        select(Delivery)
        .join(Scorecard, Delivery.scorecard_id == Scorecard.id)
        .where(Scorecard.match_id == match_id)
        .order_by(Delivery.created_at.desc())
        .limit(1)
    )
    last = res.scalars().first()
    if last is None:
        raise HTTPException(404, "No deliveries to undo")

    sc = await db.get(Scorecard, last.scorecard_id)
    await db.delete(last)
    await db.flush()

    res2 = await db.execute(select(Delivery).where(Delivery.scorecard_id == sc.id))
    remaining = res2.scalars().all()
    legal_after = sum(1 for d in remaining if d.delivery_type in LEGAL_TYPES)

    sc.total_runs = sum(d.total_runs for d in remaining)
    sc.total_wickets = sum(1 for d in remaining if d.is_wicket)
    sc.extras = sum(d.runs_extras for d in remaining)
    sc.total_overs = _overs_decimal(legal_after)
    db.add(sc)

    if sc.is_complete:
        still_complete = sc.total_wickets >= 10 or legal_after >= match.total_overs * 6
        if not still_complete:
            sc.is_complete = False
            db.add(sc)

    if match.status == "completed":
        match.status = "live"
        match.winner_id = None
        match.result_summary = None
        db.add(match)

    await db.commit()
    return {"type": "UNDO", "score": f"{sc.total_runs}/{sc.total_wickets}", "overs": str(sc.total_overs)}


async def _player_name_cache(player_ids: set[uuid.UUID], db: AsyncSession) -> dict[str, str]:
    """Return {str(player_id): player_name} for a set of IDs."""
    if not player_ids:
        return {}
    res = await db.execute(select(Player).where(Player.id.in_(player_ids)))
    return {str(p.id): p.name for p in res.scalars().all()}


async def get_scorecard(match_id: uuid.UUID, db: AsyncSession) -> dict:
    match = await db.get(Match, match_id)
    if match is None:
        raise HTTPException(404, "Match not found")

    res = await db.execute(
        select(Scorecard).where(Scorecard.match_id == match_id).order_by(Scorecard.innings_number)
    )
    scorecards = res.scalars().all()

    innings_list = []
    for sc in scorecards:
        del_res = await db.execute(
            select(Delivery).where(Delivery.scorecard_id == sc.id).order_by(Delivery.over_number, Delivery.created_at)
        )
        deliveries = del_res.scalars().all()

        # Collect all player IDs appearing in this innings
        all_pids: set[uuid.UUID] = set()
        for d in deliveries:
            for pid in (d.batsman_id, d.bowler_id, d.fielder_id):
                if pid:
                    all_pids.add(pid)
        names = await _player_name_cache(all_pids, db)

        batsmen: dict[str, dict] = {}
        for d in deliveries:
            if d.batsman_id:
                key = str(d.batsman_id)
                if key not in batsmen:
                    batsmen[key] = {"name": names.get(key, key[:8]), "runs": 0, "balls": 0, "fours": 0, "sixes": 0, "dismissed": False}
                b = batsmen[key]
                if d.delivery_type in LEGAL_TYPES:
                    b["balls"] += 1
                b["runs"] += d.runs_batsman
                if d.runs_batsman == 4:
                    b["fours"] += 1
                if d.runs_batsman == 6:
                    b["sixes"] += 1
                if d.is_wicket:
                    b["dismissed"] = True

        bowlers: dict[str, dict] = {}
        for d in deliveries:
            if d.bowler_id:
                key = str(d.bowler_id)
                if key not in bowlers:
                    bowlers[key] = {"name": names.get(key, key[:8]), "legal_balls": 0, "runs": 0, "wickets": 0, "extras": 0}
                bw = bowlers[key]
                if d.delivery_type in LEGAL_TYPES:
                    bw["legal_balls"] += 1
                bw["runs"] += d.total_runs
                if d.is_wicket:
                    bw["wickets"] += 1
                if d.delivery_type in EXTRA_TYPES:
                    bw["extras"] += d.runs_extras

        bowlers_fmt = {}
        for key, bw in bowlers.items():
            lb = bw.pop("legal_balls")
            bw["overs"] = f"{lb // 6}.{lb % 6}"
            bowlers_fmt[key] = bw

        innings_list.append({
            "innings_number": sc.innings_number,
            "batting_team_id": str(sc.batting_team_id) if sc.batting_team_id else None,
            "total_runs": sc.total_runs,
            "total_wickets": sc.total_wickets,
            "total_overs": str(sc.total_overs),
            "extras": sc.extras,
            "is_complete": sc.is_complete,
            "batsmen": batsmen,
            "bowlers": bowlers_fmt,
        })

    return {"match_id": str(match_id), "status": match.status, "innings": innings_list}


async def get_live_snapshot(match_id: uuid.UUID, db: AsyncSession) -> dict:
    match = await db.get(Match, match_id)
    if match is None:
        raise HTTPException(404, "Match not found")

    res = await db.execute(
        select(Scorecard).where(Scorecard.match_id == match_id).order_by(Scorecard.innings_number)
    )
    scorecards = res.scalars().all()
    active_sc = next((sc for sc in scorecards if not sc.is_complete), None)

    snapshot: dict = {"match_id": str(match_id), "status": match.status, "innings": []}

    for sc in scorecards:
        del_res = await db.execute(
            select(Delivery).where(Delivery.scorecard_id == sc.id).order_by(Delivery.created_at)
        )
        deliveries = del_res.scalars().all()
        legal_balls = sum(1 for d in deliveries if d.delivery_type in LEGAL_TYPES)

        inn_snap: dict = {
            "innings_number": sc.innings_number,
            "batting_team_id": str(sc.batting_team_id) if sc.batting_team_id else None,
            "score": f"{sc.total_runs}/{sc.total_wickets}",
            "overs": str(sc.total_overs),
            "is_complete": sc.is_complete,
        }

        if sc == active_sc and deliveries:
            last_d = deliveries[-1]
            # Resolve names for current players
            cur_pids: set[uuid.UUID] = set()
            for pid in (last_d.batsman_id, last_d.non_striker_id, last_d.bowler_id):
                if pid:
                    cur_pids.add(pid)
            cur_names = await _player_name_cache(cur_pids, db)

            inn_snap["striker_id"] = str(last_d.batsman_id) if last_d.batsman_id else None
            inn_snap["striker_name"] = cur_names.get(str(last_d.batsman_id)) if last_d.batsman_id else None
            inn_snap["non_striker_id"] = str(last_d.non_striker_id) if last_d.non_striker_id else None
            inn_snap["non_striker_name"] = cur_names.get(str(last_d.non_striker_id)) if last_d.non_striker_id else None
            inn_snap["current_bowler_id"] = str(last_d.bowler_id) if last_d.bowler_id else None
            inn_snap["current_bowler_name"] = cur_names.get(str(last_d.bowler_id)) if last_d.bowler_id else None

            # Recent balls (last 8 deliveries, latest first then reversed for display)
            recent_raw = deliveries[-8:]
            recent: list[str] = []
            for d in recent_raw:
                if d.is_wicket:
                    recent.append("W")
                elif d.delivery_type == "wide":
                    recent.append(f"wd+{d.runs_extras}")
                elif d.delivery_type == "no_ball":
                    recent.append(f"nb+{d.runs_batsman}")
                elif d.delivery_type in ("bye", "leg_bye"):
                    recent.append(f"B{d.runs_extras}")
                else:
                    recent.append(str(d.runs_batsman))
            inn_snap["recent_balls"] = recent

            if legal_balls > 0:
                inn_snap["crr"] = round(sc.total_runs / (legal_balls / 6), 2)
            else:
                inn_snap["crr"] = 0.0

            if sc.innings_number == 2:
                inn1 = next((s for s in scorecards if s.innings_number == 1), None)
                if inn1:
                    target = inn1.total_runs + 1
                    runs_needed = target - sc.total_runs
                    balls_remaining = match.total_overs * 6 - legal_balls
                    inn_snap["target"] = target
                    inn_snap["runs_needed"] = max(runs_needed, 0)
                    if balls_remaining > 0 and runs_needed > 0:
                        inn_snap["rrr"] = round(runs_needed / (balls_remaining / 6), 2)
                    else:
                        inn_snap["rrr"] = 0.0

        snapshot["innings"].append(inn_snap)

    return snapshot
