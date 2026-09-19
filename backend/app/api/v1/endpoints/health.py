from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.schemas.health import HealthCheckResponse

router = APIRouter()


@router.get("/health", response_model=HealthCheckResponse, tags=["Health"])
async def check_health() -> HealthCheckResponse:
    """Return health status of the CLINOVA AI API service."""
    return HealthCheckResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        environment=settings.ENVIRONMENT,
        version="0.1.0",
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/ping", tags=["Health"])
async def ping_health():
    """Ultra-lightweight ping endpoint for client latency measurement (no DB overhead)."""
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

