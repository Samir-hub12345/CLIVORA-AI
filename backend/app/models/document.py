import uuid
from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class DocumentType(str, enum.Enum):
    PATHOLOGY_REPORT = "pathology_report"
    LAB_RESULT = "lab_result"
    IMAGING_SCAN = "imaging_scan"
    CLINICAL_NOTE = "clinical_note"
    REFERRAL_LETTER = "referral_letter"
    PRESCRIPTION = "prescription"
    OTHER = "other"


class DocumentStatus(str, enum.Enum):
    PENDING_SCAN = "pending_scan"
    STORED = "stored"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"
    ARCHIVED = "archived"


class Document(Base):
    """Document metadata model separating file metadata from binary storage (Object Storage)."""
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="SET NULL"), nullable=True, index=True
    )
    encounter_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    consultation_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("consultations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("triage_cases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    facility_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("facilities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    document_type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType), default=DocumentType.PATHOLOGY_REPORT, nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    storage_provider: Mapped[str] = mapped_column(String(50), default="local_object_store", nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus), default=DocumentStatus.STORED, nullable=False
    )
    uploaded_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
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
    encounter = relationship("Encounter", back_populates="documents")
    patient = relationship("Patient")
    facility = relationship("Facility")
