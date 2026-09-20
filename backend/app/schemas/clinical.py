from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.encounter import EncounterType, EncounterStatus
from app.models.observation import ObservationType, ObservationSource, VerificationStatus
from app.models.allergy import AllergySeverity, AllergyStatus
from app.models.medication import MedicationType, MedicationStatus
from app.models.condition import ConditionClinicalStatus, ConditionVerificationStatus
from app.models.diagnosis import DiagnosisType, DiagnosisStatus
from app.models.note import NoteType, NoteStatus
from app.models.ai_run import AIRunStatus, AIReviewStatus
from app.models.referral import ReferralPriority, ReferralStatus


# ==================== ENCOUNTER SCHEMAS ====================

class EncounterBase(BaseModel):
    patient_id: str
    facility_id: Optional[str] = None
    attending_clinician_id: Optional[str] = None
    encounter_type: EncounterType = EncounterType.OUTPATIENT
    status: EncounterStatus = EncounterStatus.IN_PROGRESS
    reason_for_visit: Optional[str] = None
    clinical_summary: Optional[str] = None
    start_time: Optional[datetime] = None


class EncounterCreate(EncounterBase):
    pass


class EncounterUpdate(BaseModel):
    status: Optional[EncounterStatus] = None
    clinical_summary: Optional[str] = None
    end_time: Optional[datetime] = None
    attending_clinician_id: Optional[str] = None


class EncounterResponse(EncounterBase):
    id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EncounterListResponse(BaseModel):
    total: int
    items: List[EncounterResponse]


# ==================== OBSERVATION / VITALS SCHEMAS ====================

class ObservationCreate(BaseModel):
    patient_id: str
    encounter_id: Optional[str] = None
    observation_type: ObservationType
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    unit: str = Field(..., description="Measurement unit e.g. bpm, mmHg, °C, %")
    reference_range_low: Optional[float] = None
    reference_range_high: Optional[float] = None
    interpretation: Optional[str] = None
    observed_at: Optional[datetime] = None
    source: ObservationSource = ObservationSource.HUMAN_ENTERED


class ObservationResponse(BaseModel):
    id: str
    patient_id: str
    encounter_id: Optional[str] = None
    observation_type: ObservationType
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    unit: str
    reference_range_low: Optional[float] = None
    reference_range_high: Optional[float] = None
    interpretation: Optional[str] = None
    observed_at: datetime
    source: ObservationSource
    verification_status: VerificationStatus
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== ALLERGY SCHEMAS ====================

class AllergyCreate(BaseModel):
    patient_id: str
    substance: str = Field(..., min_length=1, max_length=255)
    reaction: Optional[str] = None
    severity: AllergySeverity = AllergySeverity.UNKNOWN
    status: AllergyStatus = AllergyStatus.ACTIVE
    onset_date: Optional[str] = None
    notes: Optional[str] = None


class AllergyResponse(AllergyCreate):
    id: str
    verification_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== MEDICATION SCHEMAS ====================

class MedicationCreate(BaseModel):
    patient_id: str
    encounter_id: Optional[str] = None
    medication_name: str = Field(..., min_length=1, max_length=255)
    dosage: Optional[str] = None
    route: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    medication_type: MedicationType = MedicationType.CURRENT
    status: MedicationStatus = MedicationStatus.ACTIVE
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    instructions: Optional[str] = None


class MedicationResponse(MedicationCreate):
    id: str
    prescribed_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== CONDITION SCHEMAS ====================

class ConditionCreate(BaseModel):
    patient_id: str
    condition_name: str = Field(..., min_length=1, max_length=255)
    code: Optional[str] = None
    clinical_status: ConditionClinicalStatus = ConditionClinicalStatus.ACTIVE
    verification_status: ConditionVerificationStatus = ConditionVerificationStatus.CONFIRMED
    severity: Optional[str] = None
    onset_date: Optional[str] = None
    notes: Optional[str] = None


class ConditionResponse(ConditionCreate):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== DIAGNOSIS SCHEMAS ====================

class DiagnosisCreate(BaseModel):
    patient_id: str
    encounter_id: Optional[str] = None
    description: str = Field(..., min_length=1, max_length=500)
    code: Optional[str] = None
    diagnosis_type: DiagnosisType = DiagnosisType.CLINICIAN_CONFIRMED
    status: DiagnosisStatus = DiagnosisStatus.ACTIVE
    is_primary: bool = False
    ai_confidence_score: Optional[float] = None
    notes: Optional[str] = None


class DiagnosisResponse(DiagnosisCreate):
    id: str
    verification_status: str
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    diagnosed_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== CLINICAL NOTE SCHEMAS ====================

class ClinicalNoteCreate(BaseModel):
    patient_id: str
    encounter_id: Optional[str] = None
    consultation_id: Optional[str] = None
    note_type: NoteType = NoteType.SOAP
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    is_signed: bool = True


class NoteAmendmentCreate(BaseModel):
    amendment_reason: str = Field(..., min_length=3, description="Justification for amendment")
    new_content: str = Field(..., min_length=1, description="Amended note content")


class ClinicalNoteResponse(BaseModel):
    id: str
    patient_id: str
    encounter_id: Optional[str] = None
    consultation_id: Optional[str] = None
    author_id: str
    note_type: NoteType
    status: NoteStatus
    title: str
    content: str
    version: int
    parent_note_id: Optional[str] = None
    amendment_reason: Optional[str] = None
    is_signed: bool
    signed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== AI RUN SCHEMAS ====================

class AIRunCreate(BaseModel):
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None
    case_id: Optional[str] = None
    task_type: str
    model_provider: str
    model_name: str
    prompt_version: Optional[str] = None
    input_payload_hash: Optional[str] = None
    status: AIRunStatus = AIRunStatus.QUEUED
    output_data: Optional[str] = None
    latency_ms: Optional[int] = None


class AIRunResponse(BaseModel):
    id: str
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None
    case_id: Optional[str] = None
    task_type: str
    model_provider: str
    model_name: str
    prompt_version: Optional[str] = None
    status: AIRunStatus
    output_data: Optional[str] = None
    error_message: Optional[str] = None
    latency_ms: Optional[int] = None
    review_status: AIReviewStatus
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== REFERRAL SCHEMAS ====================

class ReferralCreate(BaseModel):
    patient_id: str
    encounter_id: Optional[str] = None
    case_id: Optional[str] = None
    origin_facility_id: Optional[str] = None
    destination_facility_id: Optional[str] = None
    specialty_requested: Optional[str] = None
    priority: ReferralPriority = ReferralPriority.ROUTINE
    reason_for_referral: str = Field(..., min_length=1)
    clinical_summary: Optional[str] = None
    transport_requirements: Optional[str] = None


class ReferralResponse(ReferralCreate):
    id: str
    referring_doctor_id: str
    status: ReferralStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReferralUpdate(BaseModel):
    status: Optional[ReferralStatus] = None
    clinical_summary: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== PATIENT TIMELINE SCHEMA ====================

class PatientTimelineItem(BaseModel):
    event_id: str
    event_type: str  # 'encounter', 'observation', 'diagnosis', 'clinical_note', 'referral', 'allergy'
    title: str
    timestamp: datetime
    status: Optional[str] = None
    details: Optional[str] = None
    author_or_provider: Optional[str] = None
    facility_name: Optional[str] = None


class PatientTimelineResponse(BaseModel):
    patient_id: str
    mrn: str
    patient_name: str
    total_events: int
    timeline: List[PatientTimelineItem]
