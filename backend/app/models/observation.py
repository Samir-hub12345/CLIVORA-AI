import uuid
from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, Float, DateTime, Enum, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ObservationType(str, enum.Enum):
    HEART_RATE = "heart_rate"
    BLOOD_PRESSURE_SYSTOLIC = "bp_systolic"
    BLOOD_PRESSURE_DIASTOLIC = "bp_diastolic"
    TEMPERATURE = "temperature"
    OXYGEN_SATURATION = "oxygen_saturation"
    RESPIRATORY_RATE = "respiratory_rate"
    BLOOD_GLUCOSE = "blood_glucose"
    BODY_WEIGHT = "body_weight"
    BODY_HEIGHT = "body_height"
    PAIN_SCORE = "pain_score"
    OTHER = "other"


class ObservationSource(str, enum.Enum):
    HUMAN_ENTERED = "human_entered"
    PATIENT_REPORTED = "patient_reported"
    DEVICE_MEASURED = "device_measured"
    OCR_EXTRACTED = "ocr_extracted"
    AI_DERIVED = "ai_derived"
    IMPORTED = "imported"


class VerificationStatus(str, enum.Enum):
    UNVERIFIED = "unverified"
    VERIFIED = "verified"
    REJECTED = "rejected"


class ClinicalObservation(Base):
    """Structured clinical observations and physiological vital signs with units and provenance."""
    __tablename__ = "clinical_observations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    encounter_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    observation_type: Mapped[ObservationType] = mapped_column(
        Enum(ObservationType), nullable=False, index=True
    )
    value_numeric: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    value_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., 'bpm', 'mmHg', '°C', '%', 'mg/dL', 'kg'
    
    reference_range_low: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reference_range_high: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    interpretation: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 'NORMAL', 'ELEVATED', 'CRITICAL_HIGH', 'CRITICAL_LOW'
    
    observed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )
    recorded_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    source: Mapped[ObservationSource] = mapped_column(
        Enum(ObservationSource), default=ObservationSource.HUMAN_ENTERED, nullable=False
    )
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus), default=VerificationStatus.UNVERIFIED, nullable=False
    )
    verified_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    patient = relationship("Patient", back_populates="observations")
    encounter = relationship("Encounter", back_populates="observations")
    recorder = relationship("User", foreign_keys=[recorded_by])
    verifier = relationship("User", foreign_keys=[verified_by])

    __table_args__ = (
        Index("ix_obs_patient_type_date", "patient_id", "observation_type", "observed_at"),
    )
