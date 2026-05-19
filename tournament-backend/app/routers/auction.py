from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.auction import AuctionBid
from app.models.user import User
from app.redis_client import get_redis
from app.schemas.auction import AuctionBidResponse, AuctionSessionCreate
from app.services import auction_service
from app.websockets.auction_ws import manager

router = APIRouter(prefix="/auction", tags=["auction"])


@router.post("/start")
async def start_auction(
    config: AuctionSessionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    redis = await get_redis()
    try:
        state = await auction_service.start_auction(db, redis, config.model_dump())
    except ValueError as e:
        raise HTTPException(400, str(e))
    await manager.broadcast({"type": "AUCTION_STARTED", **state})
    return state


@router.post("/pause")
async def pause_auction(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    redis = await get_redis()
    manager.stop_timer()
    try:
        state = await auction_service.pause_auction(db, redis)
    except ValueError as e:
        raise HTTPException(400, str(e))
    await manager.broadcast({"type": "AUCTION_PAUSED", **state})
    return state


@router.post("/resume")
async def resume_auction(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    redis = await get_redis()
    try:
        state = await auction_service.resume_auction(db, redis)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if state.get("current_player_id"):
        await manager.start_timer()
    await manager.broadcast({"type": "AUCTION_RESUMED", **state})
    return state


@router.post("/next-player")
async def next_player(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    redis = await get_redis()
    manager.stop_timer()
    try:
        result = await auction_service.next_player(db, redis)
    except ValueError as e:
        raise HTTPException(400, str(e))
    await manager.start_timer()
    await manager.broadcast({"type": "PLAYER_UP", **result})
    return result


@router.post("/sell")
async def sell_player(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    redis = await get_redis()
    manager.stop_timer()
    try:
        result = await auction_service.sell_current_player(db, redis)
    except ValueError as e:
        raise HTTPException(400, str(e))
    await manager.broadcast({"type": "PLAYER_SOLD", **result})
    return result


@router.post("/unsold")
async def mark_unsold(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    redis = await get_redis()
    manager.stop_timer()
    try:
        result = await auction_service.mark_unsold(db, redis)
    except ValueError as e:
        raise HTTPException(400, str(e))
    await manager.broadcast({"type": "PLAYER_UNSOLD", **result})
    return result


@router.post("/complete")
async def complete_auction(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    redis = await get_redis()
    manager.stop_timer()
    try:
        result = await auction_service.complete_auction(db, redis)
    except ValueError as e:
        raise HTTPException(400, str(e))
    await manager.broadcast({"type": "AUCTION_COMPLETED", **result})
    return result


@router.get("/status")
async def auction_status():
    redis = await get_redis()
    state = await auction_service.get_auction_state(redis)
    return state or {"status": "no_active_auction"}


@router.get("/history", response_model=list[AuctionBidResponse])
async def auction_history(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AuctionBid).order_by(AuctionBid.bid_at.desc()).limit(100)
    )
    return result.scalars().all()
