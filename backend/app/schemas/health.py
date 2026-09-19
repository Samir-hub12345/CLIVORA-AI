from datetime import datetime
from pydantic import BaseModel, Field


class HealthCheckResponse(BaseModel):
    """Schema for service health check response."""
    status: str = Field(default="healthy", description="Operational status of CLINOVA AI API")
    app_name: str = Field(..., description="Name of the application")
    environment: str = Field(..., description="Current running environment")
    version: str = Field(default="0.1.0", description="API version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC timestamp of the status check")
