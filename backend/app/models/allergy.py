import uuid
from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class AllergySeverity(str, enum.Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    LIFE_THREATENING = "life_threatening"
    UNKNOWN = "unknown"


class AllergyStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    RESOLVED = "resolved"
    REFUTED = "refuted"


class Allergy(Base):
    """Structured patient allergy record with reaction, severity, and verification tracking."""
    __tablename__ = "allergies"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    substance: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    reaction: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    severity: Mapped[AllergySeverity] = mapped_column(
        Enum(AllergySeverity), default=AllergySeverity.UNKNOWN, nullable=False
    )
    status: Mapped[AllergyStatus] = mapped_column(
        Enum(AllergyStatus), default=AllergyStatus.ACTIVE, nullable=False, index=True
    )
    onset_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    recorded_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    verification_status: Mapped[str] = mapped_column(
        String(50), default="confirmed", nullable=False
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
    patient = relationship("Patient", back_populates="allergies_list")
    recorder = relationship("User", foreign_keys=[recorded_by])
