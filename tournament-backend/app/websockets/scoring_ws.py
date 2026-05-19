import uuid
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.services.scoring_service import get_live_snapshot

scoring_router = APIRouter()


class ScoringConnectionManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, match_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.connections.setdefault(match_id, []).append(ws)

    def disconnect(self, match_id: str, ws: WebSocket) -> None:
        conns = self.connections.get(match_id, [])
        if ws in conns:
            conns.remove(ws)

    async def broadcast(self, match_id: str, data: dict) -> None:
        import json
        payload = json.dumps(data)
        dead: List[WebSocket] = []
        for ws in self.connections.get(match_id, []):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(match_id, ws)


scoring_manager = ScoringConnectionManager()


@scoring_router.websocket("/ws/scores/{match_id}")
async def scoring_ws(match_id: uuid.UUID, ws: WebSocket):
    mid = str(match_id)
    await scoring_manager.connect(mid, ws)
    try:
        async with AsyncSessionLocal() as db:
            snapshot = await get_live_snapshot(match_id, db)
        await ws.send_json({"type": "SNAPSHOT", **snapshot})
        while True:
            # read-only for clients; keep alive
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        scoring_manager.disconnect(mid, ws)
