from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class FacilityBase(BaseModel):
    facility_code: str = Field(..., max_length=64)
    name: str = Field(..., max_length=255)
    facility_type: str = Field("Primary Health Center", max_length=100)
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: bool = True


class FacilityCreate(FacilityBase):
    pass


class FacilityResponse(FacilityBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FacilityListResponse(BaseModel):
    total: int
    items: List[FacilityResponse]
