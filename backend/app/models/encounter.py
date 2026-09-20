import uuid
from datetime import datetime, timezone
import enum
from typing import Optional, List
from sqlalchemy import String, DateTime, Enum, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class EncounterType(str, enum.Enum):
    OUTPATIENT = "outpatient"
    EMERGENCY = "emergency"
    TRIAGE = "triage"
    TELECONSULTATION = "teleconsultation"
    FOLLOW_UP = "follow_up"
    INPATIENT = "inpatient"


class EncounterStatus(str, enum.Enum):
    PLANNED = "planned"
    ARRIVED = "arrived"
    TRIAGED = "triaged"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Encounter(Base):
    """Encounter entity representing a distinct clinical interaction / episode between a patient and healthcare providers."""
    __tablename__ = "encounters"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    facility_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("facilities.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    attending_clinician_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    encounter_type: Mapped[EncounterType] = mapped_column(
        Enum(EncounterType), default=EncounterType.OUTPATIENT, nullable=False, index=True
    )
    status: Mapped[EncounterStatus] = mapped_column(
        Enum(EncounterStatus), default=EncounterStatus.IN_PROGRESS, nullable=False, index=True
    )
    reason_for_visit: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    clinical_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )
    end_time: Mapped[Optional[datetime]] = mapped_column(
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
    patient = relationship("Patient", back_populates="encounters")
    facility = relationship("Facility", back_populates="encounters")
    attending_clinician = relationship("User", foreign_keys=[attending_clinician_id])
    observations = relationship("ClinicalObservation", back_populates="encounter", cascade="save-update, merge")
    diagnoses = relationship("Diagnosis", back_populates="encounter", cascade="save-update, merge")
    medications = relationship("Medication", back_populates="encounter", cascade="save-update, merge")
    notes = relationship("ClinicalNote", back_populates="encounter", cascade="save-update, merge")
    documents = relationship("Document", back_populates="encounter")

    __table_args__ = (
        Index("ix_encounters_patient_start_time", "patient_id", "start_time"),
        Index("ix_encounters_facility_start_time", "facility_id", "start_time"),
    )
