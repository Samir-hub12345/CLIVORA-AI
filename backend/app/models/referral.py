import uuid
from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ReferralPriority(str, enum.Enum):
    ROUTINE = "routine"
    PRIORITY = "priority"
    EMERGENCY = "emergency"


class ReferralStatus(str, enum.Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    ACKNOWLEDGED = "acknowledged"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Referral(Base):
    """Structured clinical referral note between facilities with immutable tracking and lifecycle."""
    __tablename__ = "referrals"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    encounter_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("triage_cases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    origin_facility_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("facilities.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    destination_facility_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("facilities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    referring_doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    specialty_requested: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    priority: Mapped[ReferralPriority] = mapped_column(
        Enum(ReferralPriority), default=ReferralPriority.ROUTINE, nullable=False, index=True
    )
    status: Mapped[ReferralStatus] = mapped_column(
        Enum(ReferralStatus), default=ReferralStatus.ISSUED, nullable=False, index=True
    )
    reason_for_referral: Mapped[str] = mapped_column(Text, nullable=False)
    clinical_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    transport_requirements: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    patient = relationship("Patient")
    encounter = relationship("Encounter")
    case = relationship("TriageCase")
    origin_facility = relationship("Facility", foreign_keys=[origin_facility_id])
    destination_facility = relationship("Facility", foreign_keys=[destination_facility_id])
    referring_doctor = relationship("User", foreign_keys=[referring_doctor_id])
