import uuid
from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ConditionClinicalStatus(str, enum.Enum):
    ACTIVE = "active"
    RECURRENCE = "recurrence"
    REMISSION = "remission"
    RESOLVED = "resolved"


class ConditionVerificationStatus(str, enum.Enum):
    CONFIRMED = "confirmed"
    PROVISIONAL = "provisional"
    DIFFERENTIAL = "differential"
    REFUTED = "refuted"


class MedicalCondition(Base):
    """Longitudinal medical conditions, chronic illnesses, and past medical history."""
    __tablename__ = "medical_conditions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    condition_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # ICD-10 or clinical code
    clinical_status: Mapped[ConditionClinicalStatus] = mapped_column(
        Enum(ConditionClinicalStatus), default=ConditionClinicalStatus.ACTIVE, nullable=False, index=True
    )
    verification_status: Mapped[ConditionVerificationStatus] = mapped_column(
        Enum(ConditionVerificationStatus), default=ConditionVerificationStatus.CONFIRMED, nullable=False
    )
    severity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    onset_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # e.g., '2018', 'childhood'
    resolution_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    recorded_by: Mapped[Optional[str]] = mapped_column(
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
    patient = relationship("Patient", back_populates="conditions_list")
    recorder = relationship("User", foreign_keys=[recorded_by])
