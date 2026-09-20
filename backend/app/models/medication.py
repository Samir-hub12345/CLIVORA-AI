import uuid
from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class MedicationType(str, enum.Enum):
    CURRENT = "current"
    HISTORICAL = "historical"
    PRESCRIBED = "prescribed"
    PATIENT_REPORTED = "patient_reported"


class MedicationStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    DISCONTINUED = "discontinued"
    ON_HOLD = "on_hold"


class Medication(Base):
    """Structured patient medication and prescription record."""
    __tablename__ = "medications"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    encounter_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    medication_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    dosage: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., '10mg', '500mg'
    route: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)    # e.g., 'ORAL', 'IV', 'TOPICAL'
    frequency: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # e.g., 'Once daily', 'BID'
    duration: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    medication_type: Mapped[MedicationType] = mapped_column(
        Enum(MedicationType), default=MedicationType.CURRENT, nullable=False
    )
    status: Mapped[MedicationStatus] = mapped_column(
        Enum(MedicationStatus), default=MedicationStatus.ACTIVE, nullable=False, index=True
    )
    start_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    prescribed_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
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
    patient = relationship("Patient", back_populates="medications_list")
    encounter = relationship("Encounter", back_populates="medications")
    prescriber = relationship("User", foreign_keys=[prescribed_by])
