import asyncio
import json
from typing import Dict

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.services import auction_service
from app.utils.auth import decode_token

auction_router = APIRouter()


class AuctionConnectionManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        self._timer_task: asyncio.Task | None = None

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.connections[user_id] = websocket

    def disconnect(self, user_id: str):
        self.connections.pop(user_id, None)

    async def broadcast(self, data: dict):
        message = json.dumps(data)
        dead = []
        for uid, ws in list(self.connections.items()):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.connections.pop(uid, None)

    async def start_timer(self):
        if self._timer_task and not self._timer_task.done():
            return
        self._timer_task = asyncio.create_task(self._run_timer())

    def stop_timer(self):
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
        self._timer_task = None

    async def _run_timer(self):
        from app.database import AsyncSessionLocal
        from app.redis_client import get_redis

        redis = await get_redis()
        try:
            while True:
                await asyncio.sleep(1)
                state = await auction_service.get_auction_state(redis)
                if not state or state["status"] != "active":
                    break

                remaining = max(state.get("timer_remaining", 0) - 1, 0)
                state["timer_remaining"] = remaining
                await auction_service.set_auction_state(redis, state)
                await self.broadcast({"type": "TIMER_TICK", "remaining": remaining})

                if remaining <= 0:
                    async with AsyncSessionLocal() as db:
                        try:
                            if state.get("current_bidder_id"):
                                result = await auction_service.sell_current_player(db, redis)
                                await self.broadcast({"type": "PLAYER_SOLD", **result})
                            else:
                                result = await auction_service.mark_unsold(db, redis)
                                await self.broadcast({"type": "PLAYER_UNSOLD", **result})
                        except ValueError as e:
                            await self.broadcast({"type": "ERROR", "message": str(e)})
                    break
        except asyncio.CancelledError:
            pass


manager = AuctionConnectionManager()


@auction_router.websocket("/ws/auction")
async def auction_websocket(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
        user_id = str(payload.get("sub"))
    except Exception:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, user_id)

    # Push current auction state immediately so late-joining clients sync up
    try:
        from app.database import AsyncSessionLocal
        from app.redis_client import get_redis
        from app.models.player import Player

        redis = await get_redis()
        state = await auction_service.get_auction_state(redis)
        if state:
            player_data = None
            if state.get("current_player_id"):
                async with AsyncSessionLocal() as db:
                    import uuid as _uuid
                    from sqlalchemy import select as _select
                    result = await db.execute(
                        _select(Player).where(Player.id == _uuid.UUID(state["current_player_id"]))
                    )
                    p = result.scalar_one_or_none()
                    if p:
                        player_data = {
                            "id": str(p.id),
                            "name": p.name,
                            "player_type": p.player_type,
                            "base_price": float(p.base_price),
                            "photo_url": p.photo_url,
                        }
            await websocket.send_text(json.dumps({
                "type": "AUCTION_STATE",
                **state,
                "player": player_data,
            }))
    except Exception:
        pass  # non-fatal — client will see the live feed going forward

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if data.get("type") == "BID":
                from app.database import AsyncSessionLocal
                from app.redis_client import get_redis

                redis = await get_redis()
                async with AsyncSessionLocal() as db:
                    try:
                        result = await auction_service.place_bid(
                            db,
                            redis,
                            team_id=data["team_id"],
                            amount=float(data["amount"]),
                        )
                        await manager.broadcast({"type": "BID_PLACED", **result})
                    except (ValueError, KeyError) as e:
                        await websocket.send_text(
                            json.dumps({"type": "BID_REJECTED", "reason": str(e)})
                        )
    except WebSocketDisconnect:
        manager.disconnect(user_id)
