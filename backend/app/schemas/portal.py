from datetime import datetime
from pydantic import BaseModel, Field
from app.models.consultation import ConsultationStatus


class PatientCaseResponse(BaseModel):
    id: str
    synthetic_case_id: str
    patient_id: str | None = None
    language: str
    facility_type: str
    visit_type: str
    status: str
    raw_symptoms: str | None
    report_filename: str | None
    summary: str | None
    created_at: datetime
    updated_at: datetime


class PatientConsultationResponse(BaseModel):
    id: str
    scheduled_at: datetime
    chief_complaint: str
    status: ConsultationStatus
    doctor_name: str
    # Only completed clinician notes are released. AI drafts are never returned.
    summary: str | None


class PortalProfileInput(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    date_of_birth: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    gender: str = Field(min_length=1, max_length=20)
    phone: str | None = Field(default=None, max_length=50)
    emergency_contact: str | None = Field(default=None, max_length=255)


class AdminOverview(BaseModel):
    users: int
    patients: int
    consultations: int
    cases: int
    awaiting_review: int
    audit_records: int