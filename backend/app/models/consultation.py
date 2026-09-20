import uuid
from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ConsultationStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TriageLevel(str, enum.Enum):
    CRITICAL = "critical"      # Immediate resuscitation / emergency
    URGENT = "urgent"          # Severe illness / high risk
    ROUTINE = "routine"        # Standard clinical care needed
    LOW = "low"                # Minor / self-limiting
    UNASSIGNED = "unassigned"  # Pending assessment


class Consultation(Base):
    """Clinical consultation appointment and structured clinical assessment."""
    __tablename__ = "consultations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    facility_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("facilities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    encounter_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    status: Mapped[ConsultationStatus] = mapped_column(
        Enum(ConsultationStatus), default=ConsultationStatus.SCHEDULED, nullable=False
    )
    triage_level: Mapped[TriageLevel] = mapped_column(
        Enum(TriageLevel), default=TriageLevel.UNASSIGNED, nullable=False
    )

    chief_complaint: Mapped[str] = mapped_column(String(500), nullable=False)
    vitals_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON of BP, HR, Temp, SpO2, RR

    # SOAP Clinical Notes
    subjective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    objective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assessment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # AI Clinical Decision Support Output
    ai_generated_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_differential_diagnosis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    patient = relationship("Patient", back_populates="consultations")
    doctor = relationship("User", back_populates="consultations_as_doctor")
    facility = relationship("Facility")
    encounter = relationship("Encounter")

    __table_args__ = (
        Index("ix_consultations_patient_created", "patient_id", "created_at"),
    )
