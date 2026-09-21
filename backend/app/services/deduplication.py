"""CLINOVA AI — Patient Deduplication & Chart Reconciliation Engine.

Implements multi-factor deterministic and fuzzy matching to detect potential
duplicate charts across high-volume patient databases, and provides clinician-directed
provenance-preserving chart merging.
"""

import difflib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.case import TriageCase
from app.models.consultation import Consultation
from app.models.diagnosis import Diagnosis
from app.models.document import Document
from app.models.encounter import Encounter
from app.models.identifier import IdentifierType, PatientIdentifier
from app.models.note import ClinicalNote
from app.models.observation import ClinicalObservation
from app.models.patient import Patient
from app.models.referral import Referral
from app.models.user import User
from app.services.audit import AuditService

logger = logging.getLogger("clinova")


class DuplicateMatchPair(BaseModel):
    primary_patient_id: str
    primary_mrn: str
    primary_name: str
    duplicate_patient_id: str
    duplicate_mrn: str
    duplicate_name: str
    confidence_score: float
    match_level: str  # "HIGH", "MEDIUM", "LOW"
    matching_signals: List[str]


class MergeRequest(BaseModel):
    primary_patient_id: str
    secondary_patient_id: str
    merge_reason: str


class MergeResult(BaseModel):
    primary_patient_id: str
    merged_patient_id: str
    encounters_moved: int
    observations_moved: int
    notes_moved: int
    documents_moved: int
    cases_moved: int
    status: str


class DeduplicationService:
    """Multi-identifier clinical patient deduplication and merge manager."""

    @staticmethod
    def _normalize_name(first: str, last: str) -> str:
        return f"{first.strip().lower()} {last.strip().lower()}"

    @classmethod
    def calculate_name_similarity(cls, name1: str, name2: str) -> float:
        """Calculate normalized string similarity ratio."""
        return difflib.SequenceMatcher(None, name1.lower(), name2.lower()).ratio()

    @classmethod
    async def evaluate_pair(cls, p1: Patient, p2: Patient) -> Optional[DuplicateMatchPair]:
        """Evaluates two patient records and assigns duplicate match score."""
        if p1.id == p2.id or not p1.is_active or not p2.is_active:
            return None

        signals = []
        score = 0.0

        n1 = cls._normalize_name(p1.first_name, p1.last_name)
        n2 = cls._normalize_name(p2.first_name, p2.last_name)
        name_sim = cls.calculate_name_similarity(n1, n2)

        # 1. Exact Phone Match
        if p1.phone and p2.phone and p1.phone.strip() == p2.phone.strip():
            signals.append(f"Identical phone number: {p1.phone}")
            score += 0.45

        # 2. Exact Date of Birth Match
        if p1.date_of_birth and p2.date_of_birth and str(p1.date_of_birth) == str(p2.date_of_birth):
            signals.append(f"Identical Date of Birth: {p1.date_of_birth}")
            score += 0.35

        # 3. Name Similarity
        if name_sim >= 0.85:
            signals.append(f"High name similarity ({name_sim:.0%}): '{p1.first_name} {p1.last_name}' vs '{p2.first_name} {p2.last_name}'")
            score += 0.35
        elif name_sim >= 0.70:
            signals.append(f"Partial name similarity ({name_sim:.0%})")
            score += 0.15

        # 4. Gender Consistency
        if p1.gender and p2.gender and p1.gender.lower() == p2.gender.lower():
            score += 0.05

        if score >= 0.65:
            level = "HIGH" if score >= 0.85 else ("MEDIUM" if score >= 0.70 else "LOW")
            return DuplicateMatchPair(
                primary_patient_id=p1.id,
                primary_mrn=p1.mrn,
                primary_name=f"{p1.first_name} {p1.last_name}",
                duplicate_patient_id=p2.id,
                duplicate_mrn=p2.mrn,
                duplicate_name=f"{p2.first_name} {p2.last_name}",
                confidence_score=min(round(score, 2), 1.0),
                match_level=level,
                matching_signals=signals,
            )
        return None

    @classmethod
    async def find_duplicates_for_patient(
        cls, patient_id: str, db: AsyncSession
    ) -> List[DuplicateMatchPair]:
        """Find candidate duplicates for a specific patient."""
        target = (await db.execute(select(Patient).where(Patient.id == patient_id))).scalar_one_or_none()
        if not target:
            return []

        # Find candidates by phone or DOB
        stmt = select(Patient).where(
            Patient.id != patient_id,
            Patient.is_active == True,
            (Patient.phone == target.phone) | (Patient.date_of_birth == target.date_of_birth)
        ).limit(50)
        candidates = (await db.execute(stmt)).scalars().all()

        results = []
        for cand in candidates:
            match = await cls.evaluate_pair(target, cand)
            if match:
                results.append(match)
        return results

    @classmethod
    async def list_all_potential_duplicates(
        cls, facility_id: Optional[str], db: AsyncSession, limit: int = 50
    ) -> List[DuplicateMatchPair]:
        """Scans active patient directory for potential duplicate clusters."""
        stmt = select(Patient).where(Patient.is_active == True)
        if facility_id:
            stmt = stmt.where(Patient.facility_id == facility_id)
        stmt = stmt.order_by(Patient.created_at.desc()).limit(limit)

        patients = (await db.execute(stmt)).scalars().all()
        duplicates: List[DuplicateMatchPair] = []
        seen_pairs = set()

        for i, p1 in enumerate(patients):
            for p2 in patients[i + 1 :]:
                pair_key = tuple(sorted([p1.id, p2.id]))
                if pair_key in seen_pairs:
                    continue
                match = await cls.evaluate_pair(p1, p2)
                if match:
                    seen_pairs.add(pair_key)
                    duplicates.append(match)
        return duplicates

    @classmethod
    async def merge_patient_records(
        cls,
        primary_id: str,
        secondary_id: str,
        merge_reason: str,
        current_user: User,
        db: AsyncSession,
    ) -> MergeResult:
        """Merge secondary chart into primary chart, repointing all clinical history."""
        primary = (await db.execute(select(Patient).where(Patient.id == primary_id))).scalar_one_or_none()
        secondary = (await db.execute(select(Patient).where(Patient.id == secondary_id))).scalar_one_or_none()

        if not primary or not secondary:
            raise ValueError("Both primary and secondary patient records must exist.")
        if not secondary.is_active:
            raise ValueError(f"Patient {secondary_id} is already inactive/merged.")

        # 1. Repoint Encounters
        enc_res = await db.execute(
            update(Encounter).where(Encounter.patient_id == secondary_id).values(patient_id=primary_id)
        )
        enc_count = enc_res.rowcount or 0

        # 2. Repoint Observations
        obs_res = await db.execute(
            update(ClinicalObservation).where(ClinicalObservation.patient_id == secondary_id).values(patient_id=primary_id)
        )
        obs_count = obs_res.rowcount or 0

        # 3. Repoint Clinical Notes
        notes_res = await db.execute(
            update(ClinicalNote).where(ClinicalNote.patient_id == secondary_id).values(patient_id=primary_id)
        )
        notes_count = notes_res.rowcount or 0

        # 4. Repoint Documents
        doc_res = await db.execute(
            update(Document).where(Document.patient_id == secondary_id).values(patient_id=primary_id)
        )
        doc_count = doc_res.rowcount or 0

        # 5. Repoint Triage Cases & Consultations
        cases_res = await db.execute(
            update(TriageCase).where(TriageCase.patient_id == secondary_id).values(patient_id=primary_id)
        )
        cases_count = cases_res.rowcount or 0

        await db.execute(
            update(Consultation).where(Consultation.patient_id == secondary_id).values(patient_id=primary_id)
        )
        await db.execute(
            update(Diagnosis).where(Diagnosis.patient_id == secondary_id).values(patient_id=primary_id)
        )
        await db.execute(
            update(Referral).where(Referral.patient_id == secondary_id).values(patient_id=primary_id)
        )

        # 6. Preserve Secondary MRN as Secondary Identifier on Primary Chart
        secondary_mrn_ident = PatientIdentifier(
            patient_id=primary_id,
            identifier_type=IdentifierType.MRN,
            identifier_value=secondary.mrn,
            issuing_system="Clinova Merged Record",
            is_primary=False,
        )
        db.add(secondary_mrn_ident)

        # 7. Soft-Deactivate Secondary Chart
        secondary.is_active = False
        secondary.medical_history = (
            f"[MERGED into Primary MRN {primary.mrn} on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} "
            f"by {current_user.full_name} | Reason: {merge_reason}]\n"
            f"{secondary.medical_history or ''}"
        )
        await db.commit()

        # Audit Event
        await AuditService.log_event(
            db=db,
            action="PATIENT_CHART_MERGED",
            resource_type="PATIENT",
            resource_id=primary_id,
            user=current_user,
            details=f"Merged secondary patient {secondary_id} (MRN: {secondary.mrn}) into primary patient {primary_id} (MRN: {primary.mrn}). Reason: {merge_reason}",
        )

        return MergeResult(
            primary_patient_id=primary_id,
            merged_patient_id=secondary_id,
            encounters_moved=enc_count,
            observations_moved=obs_count,
            notes_moved=notes_count,
            documents_moved=doc_count,
            cases_moved=cases_count,
            status="MERGED_SUCCESSFULLY",
        )
