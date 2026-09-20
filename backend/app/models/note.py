import uuid
from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class NoteType(str, enum.Enum):
    SOAP = "soap"
    TRIAGE_SUMMARY = "triage_summary"
    PROGRESS_NOTE = "progress_note"
    NURSING_NOTE = "nursing_note"
    DISCHARGE_SUMMARY = "discharge_summary"
    REFERRAL_SUMMARY = "referral_summary"


class NoteStatus(str, enum.Enum):
    DRAFT = "draft"
    FINALIZED = "finalized"
    AMENDED = "amended"
    VOIDED = "voided"


class ClinicalNote(Base):
    """Clinical documentation note supporting versioning, signing immutability, and amendments."""
    __tablename__ = "clinical_notes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    encounter_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    consultation_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("consultations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    author_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    note_type: Mapped[NoteType] = mapped_column(
        Enum(NoteType), default=NoteType.SOAP, nullable=False, index=True
    )
    status: Mapped[NoteStatus] = mapped_column(
        Enum(NoteStatus), default=NoteStatus.FINALIZED, nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Versioning & Immutability
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    parent_note_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("clinical_notes.id", ondelete="SET NULL"), nullable=True
    )
    amendment_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_signed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    signed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

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
    patient = relationship("Patient", back_populates="notes")
    encounter = relationship("Encounter", back_populates="notes")
    author = relationship("User", foreign_keys=[author_id])
