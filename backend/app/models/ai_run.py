import uuid
from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class AIRunStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AIReviewStatus(str, enum.Enum):
    UNREVIEWED = "unreviewed"
    ACCEPTED = "accepted"
    MODIFIED = "modified"
    REJECTED = "rejected"


class AIRun(Base):
    """Tracks AI model inferences, prompt templates, latency, outputs, and clinical human-in-the-loop review status."""
    __tablename__ = "ai_runs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="SET NULL"), nullable=True, index=True
    )
    encounter_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    case_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("triage_cases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    task_type: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )  # e.g., 'triage_decision_support', 'soap_synthesis', 'pathology_ocr'
    
    model_provider: Mapped[str] = mapped_column(String(50), nullable=False)  # 'google_gemini', 'local_deterministic'
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)    # 'gemini-1.5-flash', 'rule-engine-v1'
    prompt_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    input_payload_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # SHA-256 for idempotency

    status: Mapped[AIRunStatus] = mapped_column(
        Enum(AIRunStatus), default=AIRunStatus.QUEUED, nullable=False, index=True
    )
    output_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON derived draft
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Human-in-the-Loop Review
    review_status: Mapped[AIReviewStatus] = mapped_column(
        Enum(AIReviewStatus), default=AIReviewStatus.UNREVIEWED, nullable=False, index=True
    )
    reviewed_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    patient = relationship("Patient")
    encounter = relationship("Encounter")
    case = relationship("TriageCase")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
