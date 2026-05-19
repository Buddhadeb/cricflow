import json
import uuid
from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auction import AuctionBid, AuctionSession
from app.models.player import Player
from app.models.team import Team, TeamPlayer
from app.models.tournament import Tournament

AUCTION_STATE_KEY = "auction:state"


async def get_auction_state(redis) -> dict | None:
    data = await redis.get(AUCTION_STATE_KEY)
    return json.loads(data) if data else None


async def set_auction_state(redis, state: dict) -> None:
    await redis.set(AUCTION_STATE_KEY, json.dumps(state))


async def start_auction(db: AsyncSession, redis, config: dict) -> dict:
    result = await db.execute(
        select(AuctionSession).where(AuctionSession.status.in_(["active", "paused"]))
    )
    if result.scalar_one_or_none():
        raise ValueError("An auction session is already active or paused")

    tournament_id = uuid.UUID(str(config["tournament_id"])) if config.get("tournament_id") else None

    # Auto-populate pricing limits from tournament if not explicitly provided
    player_base_price: Decimal | None = None
    team_budget_limit: Decimal | None = None
    upper_limit = Decimal(str(config["upper_limit"])) if config.get("upper_limit") else None
    if tournament_id:
        t_result = await db.execute(select(Tournament).where(Tournament.id == tournament_id))
        tournament = t_result.scalar_one_or_none()
        if tournament:
            if upper_limit is None and tournament.player_upper_price is not None:
                upper_limit = tournament.player_upper_price
            if tournament.player_base_price is not None:
                player_base_price = tournament.player_base_price
            if tournament.team_budget_limit is not None:
                team_budget_limit = tournament.team_budget_limit

    session = AuctionSession(
        status="active",
        tournament_id=tournament_id,
        timer_seconds=config.get("timer_seconds", 30),
        upper_limit=upper_limit,
        bid_increment=Decimal(str(config.get("bid_increment", "100.00"))),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    state = {
        "session_id": str(session.id),
        "tournament_id": str(tournament_id) if tournament_id else None,
        "status": "active",
        "current_player_id": None,
        "current_bid": None,
        "current_bidder_id": None,
        "timer_remaining": session.timer_seconds,
        "timer_seconds": session.timer_seconds,
        "bid_increment": float(session.bid_increment),
        "upper_limit": float(session.upper_limit) if session.upper_limit else None,
        "player_base_price": float(player_base_price) if player_base_price else None,
        "team_budget_limit": float(team_budget_limit) if team_budget_limit else None,
    }
    await set_auction_state(redis, state)
    return state


async def pause_auction(db: AsyncSession, redis) -> dict:
    state = await get_auction_state(redis)
    if not state:
        raise ValueError("No active auction")
    if state["status"] != "active":
        raise ValueError(f"Cannot pause auction in status: {state['status']}")

    state["status"] = "paused"
    await set_auction_state(redis, state)
    await db.execute(
        update(AuctionSession)
        .where(AuctionSession.id == uuid.UUID(state["session_id"]))
        .values(status="paused")
    )
    await db.commit()
    return state


async def resume_auction(db: AsyncSession, redis) -> dict:
    state = await get_auction_state(redis)
    if not state:
        raise ValueError("No active auction")
    if state["status"] != "paused":
        raise ValueError(f"Auction is not paused, current status: {state['status']}")

    state["status"] = "active"
    await set_auction_state(redis, state)
    await db.execute(
        update(AuctionSession)
        .where(AuctionSession.id == uuid.UUID(state["session_id"]))
        .values(status="active")
    )
    await db.commit()
    return state


async def next_player(db: AsyncSession, redis) -> dict:
    state = await get_auction_state(redis)
    if not state:
        raise ValueError("No active auction")
    if state["status"] not in ("active", "paused"):
        raise ValueError("Auction is not active")

    tournament_id = state.get("tournament_id")
    q = select(Player).where(Player.status == "available", Player.is_approved == True)
    if tournament_id:
        q = q.where(Player.tournament_id == uuid.UUID(tournament_id))
    result = await db.execute(q.order_by(Player.registered_at).limit(1))
    player = result.scalar_one_or_none()
    if not player:
        raise ValueError("No available players left in this tournament")

    # Tournament player_base_price overrides individual player base prices when set
    tournament_base = state.get("player_base_price")
    starting_bid = tournament_base if tournament_base else float(player.base_price)

    state.update(
        {
            "current_player_id": str(player.id),
            "current_player_name": player.name,
            "current_player_type": player.player_type,
            "current_player_photo": player.photo_url,
            "current_bid": starting_bid,
            "current_bidder_id": None,
            "timer_remaining": state["timer_seconds"],
            "status": "active",
        }
    )
    await set_auction_state(redis, state)
    await db.execute(
        update(AuctionSession)
        .where(AuctionSession.id == uuid.UUID(state["session_id"]))
        .values(
            status="active",
            current_player_id=player.id,
            current_bid=player.base_price,
            current_bidder_id=None,
        )
    )
    await db.commit()

    return {
        **state,
        "player": {
            "id": str(player.id),
            "name": player.name,
            "player_type": player.player_type,
            "base_price": float(player.base_price),
            "photo_url": player.photo_url,
        },
    }


async def place_bid(db: AsyncSession, redis, team_id: str, amount: float) -> dict:
    state = await get_auction_state(redis)
    if not state:
        raise ValueError("No active auction")
    if state["status"] != "active":
        raise ValueError("Auction is not active")
    if not state["current_player_id"]:
        raise ValueError("No player up for bidding")

    current_bid = state["current_bid"] or 0
    min_bid = current_bid + state["bid_increment"]
    if amount < min_bid:
        raise ValueError(f"Bid must be at least {min_bid}")
    if state["upper_limit"] and amount > state["upper_limit"]:
        raise ValueError(f"Bid exceeds upper limit of {state['upper_limit']}")

    result = await db.execute(select(Team.id, Team.remaining_budget, Team.name, Team.total_budget).where(Team.id == uuid.UUID(team_id)))
    team_row = result.one_or_none()
    if not team_row:
        raise ValueError("Team not found")
    if float(team_row.remaining_budget) < amount:
        raise ValueError("Insufficient budget")
    team_budget_limit = state.get("team_budget_limit")
    if team_budget_limit is not None:
        spent = float(team_row.total_budget) - float(team_row.remaining_budget)
        if spent + amount > team_budget_limit:
            raise ValueError(f"Bid would exceed team budget limit of ₹{team_budget_limit:,.0f}")

    bid = AuctionBid(
        session_id=uuid.UUID(state["session_id"]),
        player_id=uuid.UUID(state["current_player_id"]),
        team_id=uuid.UUID(team_id),
        amount=Decimal(str(amount)),
    )
    db.add(bid)

    state.update(
        {
            "current_bid": amount,
            "current_bidder_id": team_id,
            "timer_remaining": state["timer_seconds"],
        }
    )
    await set_auction_state(redis, state)
    await db.execute(
        update(AuctionSession)
        .where(AuctionSession.id == uuid.UUID(state["session_id"]))
        .values(current_bid=Decimal(str(amount)), current_bidder_id=uuid.UUID(team_id))
    )
    await db.commit()

    return {**state, "team_name": team_row.name}


async def sell_current_player(db: AsyncSession, redis) -> dict:
    state = await get_auction_state(redis)
    if not state:
        raise ValueError("No active auction")
    if not state["current_player_id"]:
        raise ValueError("No player up for auction")
    if not state["current_bidder_id"]:
        raise ValueError("No bids placed — use mark_unsold instead")

    player_id = uuid.UUID(state["current_player_id"])
    team_id = uuid.UUID(state["current_bidder_id"])
    sold_price = Decimal(str(state["current_bid"]))

    # Idempotency guard — prevent double-sell on network retry
    existing_tp = await db.execute(select(TeamPlayer).where(TeamPlayer.player_id == player_id))
    if existing_tp.scalar_one_or_none():
        raise ValueError("Player has already been sold")

    await db.execute(update(Player).where(Player.id == player_id).values(status="sold"))
    db.add(TeamPlayer(team_id=team_id, player_id=player_id, sold_price=sold_price))
    # Atomic decrement — avoids race condition from read-then-write
    updated = await db.execute(
        update(Team)
        .where(Team.id == team_id, Team.remaining_budget >= sold_price)
        .values(remaining_budget=Team.remaining_budget - sold_price)
        .returning(Team.name, Team.remaining_budget)
    )
    row = updated.one_or_none()
    if row is None:
        raise ValueError("Insufficient budget or team not found")

    sold_to = str(team_id)
    sold_at = float(sold_price)
    team_name = row.name
    state.update({"current_player_id": None, "current_bid": None, "current_bidder_id": None})
    await set_auction_state(redis, state)
    await db.commit()

    return {**state, "sold_to_team_id": sold_to, "sold_price": sold_at, "team_name": team_name}


async def mark_unsold(db: AsyncSession, redis) -> dict:
    state = await get_auction_state(redis)
    if not state:
        raise ValueError("No active auction")
    if not state["current_player_id"]:
        raise ValueError("No player up for auction")

    player_id = uuid.UUID(state["current_player_id"])
    unsold_player_id = str(player_id)
    await db.execute(update(Player).where(Player.id == player_id).values(status="unsold"))
    await db.commit()

    state.update({"current_player_id": None, "current_bid": None, "current_bidder_id": None})
    await set_auction_state(redis, state)
    return {**state, "unsold_player_id": unsold_player_id}


async def complete_auction(db: AsyncSession, redis) -> dict:
    state = await get_auction_state(redis)
    if not state:
        raise ValueError("No active auction")

    state["status"] = "completed"
    await set_auction_state(redis, state)
    await db.execute(
        update(AuctionSession)
        .where(AuctionSession.id == uuid.UUID(state["session_id"]))
        .values(status="completed")
    )
    await db.commit()
    return state
