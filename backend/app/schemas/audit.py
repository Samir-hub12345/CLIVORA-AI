from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class AuditLogBase(BaseModel):
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    user_id: Optional[str] = None
    user_email: Optional[str] = None


class AuditLogResponse(AuditLogBase):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    total: int
    items: List[AuditLogResponse]
