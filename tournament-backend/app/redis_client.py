import redis.asyncio as aioredis

from app.config import settings

_redis_client = None


async def init_redis() -> None:
    global _redis_client
    try:
        client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
        )
        await client.ping()
        _redis_client = client
    except Exception:
        import fakeredis
        import fakeredis.aioredis

        _fake_server = fakeredis.FakeServer()
        _redis_client = fakeredis.aioredis.FakeRedis(server=_fake_server, decode_responses=True)


async def get_redis():
    if _redis_client is None:
        await init_redis()
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.aclose()
        except Exception:
            pass
        _redis_client = None
