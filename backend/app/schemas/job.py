from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.job import JobStatus, JobType


class JobCreateRequest(BaseModel):
    job_type: JobType
    payload: Dict[str, Any] = Field(default_factory=dict)
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None


class JobResponse(BaseModel):
    id: str
    job_type: JobType
    status: JobStatus
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    payload_json: Optional[str] = None
    result_json: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int
    max_retries: int
    created_by: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
