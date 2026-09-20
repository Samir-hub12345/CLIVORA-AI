from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class HealthCheckResponse(BaseModel):
    """Schema for service health check response."""
    status: str = Field(default="healthy", description="Operational status of CLINOVA AI API")
    app_name: str = Field(..., description="Name of the application")
    environment: str = Field(..., description="Current running environment")
    version: str = Field(default="0.1.0", description="API version")
    timestamp: datetime = Field(description="UTC timestamp of the status check")


class DependencyStatus(BaseModel):
    healthy: bool
    message: str
    latency_ms: Optional[float] = None


class ReadinessCheckResponse(BaseModel):
    """Schema for comprehensive readiness probe verifying dependencies."""
    status: str  # "ready" or "degraded" or "not_ready"
    timestamp: datetime
    dependencies: Dict[str, DependencyStatus]
