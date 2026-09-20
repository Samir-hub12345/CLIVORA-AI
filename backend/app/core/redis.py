import logging
from typing import Optional, Tuple
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("clinova")

_redis_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> Optional[aioredis.Redis]:
    """Retrieves or initializes the async Redis client with graceful failure handling."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
            # Test connection
            await _redis_client.ping()
            logger.info("Connected to Redis cache and task queue.")
        except Exception as e:
            logger.warning(f"Redis unavailable ({e}). Continuing with graceful local fallback.")
            _redis_client = None
    return _redis_client


async def check_redis_health() -> Tuple[bool, str]:
    """Tests active connectivity to Redis. Returns (is_healthy, message)."""
    try:
        client = aioredis.from_url(
            settings.REDIS_URL,
            socket_timeout=1.5,
            socket_connect_timeout=1.5,
        )
        await client.ping()
        await client.close()
        return True, "Redis connected and responding PONG"
    except Exception as e:
        return False, f"Redis unreachable: {str(e)}"


async def close_redis_client():
    """Gracefully closes Redis connection pool on application shutdown."""
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.close()
            logger.info("Closed Redis connection pool.")
        except Exception:
            pass
        _redis_client = None
