from typing import Optional, List
from pydantic import BaseModel, Field


class VitalsInput(BaseModel):
    blood_pressure_systolic: Optional[int] = Field(None, ge=40, le=300, description="Systolic BP (mmHg)")
    blood_pressure_diastolic: Optional[int] = Field(None, ge=20, le=200, description="Diastolic BP (mmHg)")
    heart_rate: Optional[int] = Field(None, ge=30, le=250, description="BPM")
    respiratory_rate: Optional[int] = Field(None, ge=5, le=80, description="Breaths per min")
    oxygen_saturation: Optional[float] = Field(None, ge=50, le=100, description="SpO2 (%)")
    temperature: Optional[float] = Field(None, ge=30.0, le=45.0, description="Body temp in Celsius")
    pain_score: Optional[int] = Field(None, ge=0, le=10, description="Subjective pain scale (0-10)")


class TriageRequest(BaseModel):
    patient_id: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[str] = None
    chief_complaint: str = Field(..., min_length=3, max_length=500)
    symptoms: List[str] = Field(..., min_items=1)
    symptom_duration: Optional[str] = Field(None, description="e.g. '2 hours', '3 days'")
    vitals: Optional[VitalsInput] = None
    relevant_medical_history: Optional[str] = None
    known_allergies: Optional[str] = None


class DifferentialDiagnosisItem(BaseModel):
    condition: str
    probability: str = Field(..., description="High, Moderate, or Low")
    rationale: str
    recommended_workup: List[str] = Field(default_factory=list)


class TriageResponse(BaseModel):
    urgency_level: str = Field(..., description="CRITICAL, URGENT, ROUTINE, or LOW")
    urgency_color: str = Field(..., description="Red, Amber, Teal, or Slate")
    emergency_red_flags: List[str] = Field(default_factory=list)
    differential_diagnoses: List[DifferentialDiagnosisItem] = Field(default_factory=list)
    immediate_actions: List[str] = Field(default_factory=list)
    clinical_reasoning: str
    suggested_monitoring: List[str] = Field(default_factory=list)
    disclaimer: str = (
        "CLINICAL DECISION SUPPORT NOTICE: Clinova AI is an investigative decision aid and does not replace "
        "physician judgment. All recommendations, triage stratifications, and differential diagnoses must be "
        "independently verified by a licensed healthcare professional before taking clinical action."
    )
    source: str = "Gemini AI Medical Intelligence Engine"


class SOAPGenerateRequest(BaseModel):
    patient_name: Optional[str] = "Patient"
    age_and_gender: Optional[str] = None
    chief_complaint: str
    encounter_notes: str = Field(..., min_length=10, description="Raw transcription, doctor notes, or conversation")
    vitals: Optional[VitalsInput] = None
    medical_history: Optional[str] = None


class SOAPGenerateResponse(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str
    patient_friendly_summary: str
    disclaimer: str = (
        "AI Generated Clinical Draft. Requires review and signed authorization by the attending physician."
    )
