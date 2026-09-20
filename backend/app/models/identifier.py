import uuid
from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class IdentifierType(str, enum.Enum):
    MRN = "mrn"                           # Medical Record Number (local or internal)
    NATIONAL_ID = "national_id"           # National identification / government ID
    ABHA_ID = "abha_id"                   # Ayushman Bharat Health Account ID
    FACILITY_PATIENT_NO = "facility_no"   # Facility-specific serial patient number
    INSURANCE_ID = "insurance_id"         # Health insurance / policy ID
    PASSPORT = "passport"                 # Passport number
    OTHER = "other"


class PatientIdentifier(Base):
    """Normalized patient identifier entity supporting multiple identifier domains and issuing systems."""
    __tablename__ = "patient_identifiers"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    identifier_type: Mapped[IdentifierType] = mapped_column(
        Enum(IdentifierType), default=IdentifierType.MRN, nullable=False, index=True
    )
    identifier_value: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    issuing_system: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

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
    patient = relationship("Patient", back_populates="identifiers")

    __table_args__ = (
        UniqueConstraint("patient_id", "identifier_type", "identifier_value", name="uq_patient_identifier"),
    )
