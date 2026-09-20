import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Patient(Base):
    """Clinical patient entity representing the healthcare subject with longitudinal health record linkage."""
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    facility_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("facilities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    mrn: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[str] = mapped_column(String(20), nullable=False)  # YYYY-MM-DD
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Preserved longitudinal text snapshots (backward compatibility during migration)
    allergies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_medications: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    medical_history: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    facility = relationship("Facility", back_populates="patients")
    user = relationship("User", foreign_keys=[user_id])
    identifiers = relationship("PatientIdentifier", back_populates="patient", cascade="all, delete-orphan")
    encounters = relationship("Encounter", back_populates="patient", cascade="save-update, merge")
    observations = relationship("ClinicalObservation", back_populates="patient", cascade="save-update, merge")
    allergies_list = relationship("Allergy", back_populates="patient", cascade="save-update, merge")
    medications_list = relationship("Medication", back_populates="patient", cascade="save-update, merge")
    conditions_list = relationship("MedicalCondition", back_populates="patient", cascade="save-update, merge")
    diagnoses_list = relationship("Diagnosis", back_populates="patient", cascade="save-update, merge")
    notes = relationship("ClinicalNote", back_populates="patient", cascade="save-update, merge")
    consultations: Mapped[List["Consultation"]] = relationship(
        "Consultation", back_populates="patient", cascade="save-update, merge"
    )
