import uuid
from datetime import datetime, timezone
import enum
from typing import Optional, List
from sqlalchemy import String, Integer, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class DocumentType(str, enum.Enum):
    PATHOLOGY_REPORT = "pathology_report"
    LAB_RESULT = "lab_result"
    IMAGING_SCAN = "imaging_scan"
    CLINICAL_NOTE = "clinical_note"
    DISCHARGE_SUMMARY = "discharge_summary"
    REFERRAL_LETTER = "referral_letter"
    PRESCRIPTION = "prescription"
    OTHER = "other"


class DocumentStatus(str, enum.Enum):
    PENDING_SCAN = "pending_scan"
    STORED = "stored"
    PROCESSING = "processing"
    PROCESSED = "processed"
    QUARANTINED = "quarantined"
    FAILED = "failed"
    ARCHIVED = "archived"


class ScanStatus(str, enum.Enum):
    PENDING = "pending"
    SCANNING = "scanning"
    CLEAN = "clean"
    INFECTED = "infected"
    SCAN_FAILED = "scan_failed"
    SKIPPED = "skipped"


class ArtifactType(str, enum.Enum):
    OCR_TEXT = "ocr_text"
    OCR_JSON = "ocr_json"
    THUMBNAIL = "thumbnail"
    PREVIEW = "preview"
    EXTRACTED_ENTITIES = "extracted_entities"


class Document(Base):
    """Medical document metadata model separating binary file storage from PostgreSQL metadata."""
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
    safe_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    detected_mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    checksum_algorithm: Mapped[str] = mapped_column(String(32), default="SHA-256", nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    storage_provider: Mapped[str] = mapped_column(String(50), default="local_object_store", nullable=False)
    storage_bucket: Mapped[str] = mapped_column(String(100), default="medical-documents", nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus), default=DocumentStatus.STORED, nullable=False
    )
    scan_status: Mapped[str] = mapped_column(String(50), default="clean", nullable=False)
    scan_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quarantined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    parent_document_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    is_current_version: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
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
    artifacts = relationship("DocumentArtifact", back_populates="document", cascade="all, delete-orphan")


class DocumentArtifact(Base):
    """Stores metadata for derived processing artifacts (OCR text, OCR JSON, preview, thumbnails)."""
    __tablename__ = "document_artifacts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    artifact_type: Mapped[str] = mapped_column(String(50), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_provider: Mapped[str] = mapped_column(String(50), default="local_object_store", nullable=False)
    content_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    # Relationship to parent document
    document = relationship("Document", back_populates="artifacts")
