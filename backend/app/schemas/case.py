from datetime import datetime
from typing import List, Optional, Any, Dict, Literal
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# OCR & Report Schemas
# ---------------------------------------------------------------------------
class OCRFieldSchema(BaseModel):
    field_name: str
    value: str
    unit: Optional[str] = None
    confidence: float = Field(default=0.95, ge=0.0, le=1.0)
    bounding_box: Optional[List[int]] = None
    verification_status: str = Field(default="pending", description="pending, verified, rejected")
    source_reference: Optional[str] = None


class ReportOCRResponse(BaseModel):
    report_filename: str
    fields: List[OCRFieldSchema]
    raw_extracted_text: str
    confidence_average: float
    is_synthetic_sample: bool = True
    status: str = "success"
    disclaimer: str = "Synthetic sample — not a real medical record. Requires qualified reviewer verification."


# ---------------------------------------------------------------------------
# Speech & Translation Schemas
# ---------------------------------------------------------------------------
class SpeechTranscribeResponse(BaseModel):
    transcript: str
    detected_language: str
    confidence: float = 0.94
    duration_seconds: float = 12.5
    is_demo_fallback: bool = True
    disclaimer: str = "Speech transcription — review before submission."


class TranslationResponse(BaseModel):
    original_text: str
    original_language: str
    translated_text: str
    target_language: str = "en"
    normalization_summary: str
    is_demo_fallback: bool = True


# ---------------------------------------------------------------------------
# Timeline & Risk Signals
# ---------------------------------------------------------------------------
class TimelineEventSchema(BaseModel):
    day: str
    description: str
    source: str = "Patient reported"


class RiskSignalSchema(BaseModel):
    rule_id: str
    signal: str
    source_text: str
    severity: str = "URGENT REVIEW"  # "URGENT REVIEW", "PRIORITY", "ROUTINE"
    timestamp: str
    reviewer_confirmation_required: bool = True
    status: str = "pending_confirmation"


# ---------------------------------------------------------------------------
# Structured Triage Note (Strictly Non-Diagnostic)
# ---------------------------------------------------------------------------
class StructuredTriageNote(BaseModel):
    case_id: str
    chief_concern: str
    symptom_summary: str
    timeline: List[TimelineEventSchema] = []
    reported_symptoms: List[str] = []
    relevant_history: List[str] = []
    extracted_report_data: List[OCRFieldSchema] = []
    visual_inputs: List[Dict[str, Any]] = []
    missing_information: List[str] = []
    follow_up_questions: List[str] = []
    risk_signals: List[RiskSignalSchema] = []
    queue_category: str = "routine"  # "urgent-review", "priority", "routine"
    queue_reason: str = ""
    sources: List[str] = []
    ai_generated: bool = True
    requires_human_review: bool = True
    is_diagnostic: bool = False
    disclaimer: str = (
        "Educational prototype and triage-support purposes only. "
        "This system does not diagnose, prescribe treatment, or replace a qualified healthcare professional. "
        "All AI-generated information requires human review."
    )


# ---------------------------------------------------------------------------
# Triage Case CRUD Schemas
# ---------------------------------------------------------------------------
class CaseCreateRequest(BaseModel):
    preferred_language: str = "en"
    facility_type: str = "Government Hospital"
    visit_type: str = "Outpatient"
    approximate_age: Optional[int] = None
    gender: Optional[str] = None
    context_notes: Optional[str] = None
    raw_symptoms: str
    speech_transcript: Optional[str] = None
    detected_language: Optional[str] = "en"
    report_filename: Optional[str] = None
    report_ocr_data: Optional[List[OCRFieldSchema]] = None
    image_reference: Optional[str] = None
    consent_acknowledged: bool = False


class CaseReviewActionRequest(BaseModel):
    action: Literal["approve", "edit", "reject", "escalate"]
    reviewer_notes: Optional[str] = None
    edited_summary: Optional[str] = None
    confirmed_queue_category: Optional[Literal["routine", "priority", "urgent-review"]] = None
    verified_ocr_fields: Optional[List[OCRFieldSchema]] = None


class ReferralNoteResponse(BaseModel):
    case_id: str
    synthetic_case_id: str
    facility: str
    visit_type: str
    patient_reported_symptoms: str
    timeline: List[TimelineEventSchema]
    available_report_data: List[OCRFieldSchema]
    reviewer_confirmed_summary: str
    outstanding_questions: List[str]
    review_signals: List[RiskSignalSchema]
    reviewer_reason: str
    reviewer_name: str
    reviewer_role: str
    timestamp: str
    footer_disclaimer: str = (
        "AI-assisted organization of information. Not a diagnosis or treatment recommendation. "
        "Final referral decision is made by qualified healthcare staff."
    )


class CaseResponse(BaseModel):
    id: str
    synthetic_case_id: str
    language: str
    facility_type: str
    visit_type: str
    status: str
    queue_category: str
    queue_reason: Optional[str] = None
    consent_status: bool
    approximate_age: Optional[int] = None
    gender: Optional[str] = None
    context_notes: Optional[str] = None
    raw_symptoms: Optional[str] = None
    normalized_symptoms: Optional[str] = None
    speech_transcript: Optional[str] = None
    detected_language: Optional[str] = None
    report_filename: Optional[str] = None
    report_ocr_data: Optional[List[Dict[str, Any]]] = None
    image_reference: Optional[str] = None
    triage_summary: Optional[Dict[str, Any]] = None
    missing_information: Optional[List[str]] = None
    follow_up_questions: Optional[List[str]] = None
    risk_signals: Optional[List[Dict[str, Any]]] = None
    timeline_events: Optional[List[Dict[str, Any]]] = None
    reviewer_notes: Optional[str] = None
    reviewer_id: Optional[str] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    waiting_minutes: Optional[int] = None
    is_deleted: bool = False

    class Config:
        from_attributes = True