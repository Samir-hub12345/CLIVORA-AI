import uuid
from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, Float, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class DiagnosisType(str, enum.Enum):
    CLINICIAN_CONFIRMED = "clinician_confirmed"
    PROVISIONAL = "provisional"
    DIFFERENTIAL = "differential"
    AI_SUGGESTION = "ai_suggestion"
    DISCHARGE = "discharge"


class DiagnosisStatus(str, enum.Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    RULED_OUT = "ruled_out"


class Diagnosis(Base):
    """Clinical diagnoses, impressions, and AI differential suggestions with strict source and verification separation."""
    __tablename__ = "diagnoses"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    encounter_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # ICD-10 or clinical concept code
    
    diagnosis_type: Mapped[DiagnosisType] = mapped_column(
        Enum(DiagnosisType), default=DiagnosisType.CLINICIAN_CONFIRMED, nullable=False, index=True
    )
    status: Mapped[DiagnosisStatus] = mapped_column(
        Enum(DiagnosisStatus), default=DiagnosisStatus.ACTIVE, nullable=False, index=True
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # AI Clinical Decision Support attribution
    ai_confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    verification_status: Mapped[str] = mapped_column(
        String(50), default="unverified", nullable=False
    )  # 'unverified', 'verified', 'rejected'
    verified_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    diagnosed_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

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
    patient = relationship("Patient", back_populates="diagnoses_list")
    encounter = relationship("Encounter", back_populates="diagnoses")
    diagnostician = relationship("User", foreign_keys=[diagnosed_by])
    verifier = relationship("User", foreign_keys=[verified_by])
