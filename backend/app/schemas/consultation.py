from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.consultation import ConsultationStatus, TriageLevel
from app.schemas.patient import PatientResponse
from app.schemas.user import UserResponse


class ConsultationBase(BaseModel):
    patient_id: str
    doctor_id: str
    scheduled_at: datetime
    chief_complaint: str = Field(..., min_length=3, max_length=500)
    status: ConsultationStatus = ConsultationStatus.SCHEDULED
    triage_level: TriageLevel = TriageLevel.UNASSIGNED
    vitals_data: Optional[str] = None
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    ai_generated_summary: Optional[str] = None
    ai_differential_diagnosis: Optional[str] = None


class ConsultationCreate(BaseModel):
    patient_id: str
    doctor_id: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    chief_complaint: str = Field(..., min_length=3, max_length=500)
    vitals_data: Optional[str] = None
    triage_level: Optional[TriageLevel] = TriageLevel.UNASSIGNED


class ConsultationUpdate(BaseModel):
    status: Optional[ConsultationStatus] = None
    triage_level: Optional[TriageLevel] = None
    chief_complaint: Optional[str] = None
    vitals_data: Optional[str] = None
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    ai_generated_summary: Optional[str] = None
    ai_differential_diagnosis: Optional[str] = None


class SOAPNotesUpdate(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str


class ConsultationResponse(ConsultationBase):
    id: str
    created_at: datetime
    updated_at: datetime
    patient: Optional[PatientResponse] = None
    doctor: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class ConsultationListResponse(BaseModel):
    total: int
    items: List[ConsultationResponse]
