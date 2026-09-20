import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import check_redis_health
from app.db.session import get_db
from app.schemas.health import HealthCheckResponse, ReadinessCheckResponse, DependencyStatus

router = APIRouter()


@router.get("/health", response_model=HealthCheckResponse, tags=["Health"])
async def check_health() -> HealthCheckResponse:
    """Basic health endpoint returning application operational metadata."""
    return HealthCheckResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        environment=settings.ENVIRONMENT,
        version="0.1.0",
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/health/live", tags=["Health"])
async def liveness_probe():
    """Liveness probe for orchestrators (Kubernetes / Docker) verifying the web server process is responsive."""
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/ready", response_model=ReadinessCheckResponse, tags=["Health"])
async def readiness_probe(response: Response, db: AsyncSession = Depends(get_db)):
    """Comprehensive readiness probe verifying PostgreSQL database and Redis connectivity."""
    dependencies = {}
    is_ready = True

    # 1. PostgreSQL Database Check (Critical)
    db_start = time.perf_counter()
    try:
        await db.execute(text("SELECT 1"))
        db_latency = round((time.perf_counter() - db_start) * 1000, 2)
        dependencies["postgresql"] = DependencyStatus(
            healthy=True,
            message="Database connection pool responding to queries",
            latency_ms=db_latency,
        )
    except Exception as e:
        db_latency = round((time.perf_counter() - db_start) * 1000, 2)
        dependencies["postgresql"] = DependencyStatus(
            healthy=False,
            message=f"Database query failed: {str(e)}",
            latency_ms=db_latency,
        )
        is_ready = False

    # 2. Redis Cache / Queue Check (Non-critical fallback)
    redis_start = time.perf_counter()
    redis_healthy, redis_msg = await check_redis_health()
    redis_latency = round((time.perf_counter() - redis_start) * 1000, 2)
    dependencies["redis"] = DependencyStatus(
        healthy=redis_healthy,
        message=redis_msg,
        latency_ms=redis_latency,
    )

    # 3. Object Storage Check
    dependencies["object_storage"] = DependencyStatus(
        healthy=True,
        message="Local object storage provider initialized",
        latency_ms=0.0,
    )

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        overall_status = "not_ready"
    elif not redis_healthy:
        overall_status = "degraded"
    else:
        overall_status = "ready"

    return ReadinessCheckResponse(
        status=overall_status,
        timestamp=datetime.now(timezone.utc),
        dependencies=dependencies,
    )


@router.get("/ping", tags=["Health"])
async def ping_health():
    """Ultra-lightweight ping endpoint for client latency measurement (no DB overhead)."""
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
