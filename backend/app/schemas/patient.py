from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class PatientBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: str = Field(..., description="Date of birth in YYYY-MM-DD format")
    gender: str = Field(..., description="Gender (e.g., Male, Female, Other)")
    blood_group: Optional[str] = Field(None, max_length=10)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    emergency_contact: Optional[str] = Field(None, max_length=255)
    allergies: Optional[str] = None
    current_medications: Optional[str] = None
    medical_history: Optional[str] = None


class PatientCreate(PatientBase):
    mrn: Optional[str] = Field(None, description="Optional custom MRN. Generated automatically if omitted.")


class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    emergency_contact: Optional[str] = None
    allergies: Optional[str] = None
    current_medications: Optional[str] = None
    medical_history: Optional[str] = None


class PatientResponse(PatientBase):
    id: str
    mrn: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PatientListResponse(BaseModel):
    total: int
    items: List[PatientResponse]
