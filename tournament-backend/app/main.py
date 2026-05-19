from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.limiter import limiter
from app.redis_client import close_redis, init_redis
from app.routers import admin, auction, auth, challenges, matches, payments, players, scoring, stats, teams, tournaments
from app.websockets.auction_ws import auction_router
from app.websockets.scoring_ws import scoring_router

MEDIA_ROOT = Path(__file__).resolve().parent.parent / "media"
MEDIA_ROOT.mkdir(exist_ok=True)
(MEDIA_ROOT / "players").mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    yield
    await close_redis()


app = FastAPI(title="Tournament API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    allow_credentials=True,
)

# Serve locally-uploaded player photos
app.mount("/media", StaticFiles(directory=str(MEDIA_ROOT)), name="media")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(players.router, prefix="/api/v1")
app.include_router(teams.router, prefix="/api/v1")
app.include_router(auction.router, prefix="/api/v1")
app.include_router(matches.router, prefix="/api/v1")
app.include_router(scoring.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(tournaments.router, prefix="/api/v1")
app.include_router(challenges.router, prefix="/api/v1")
app.include_router(auction_router)   # /ws/auction
app.include_router(scoring_router)   # /ws/scores/{match_id}


@app.get("/health")
async def health():
    return {"status": "ok"}
