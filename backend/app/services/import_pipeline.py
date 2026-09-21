"""CLINOVA AI — Bulk Patient Ingestion Pipeline.

Supports high-volume clinical patient onboarding via CSV, JSON, and HL7 FHIR
R4 Patient resource bundles with dry-run schema validation and error reporting.
"""

import csv
import io
import json
import logging
import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, ConfigDict, EmailStr, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.identifier import IdentifierType, PatientIdentifier
from app.models.patient import Patient
from app.models.user import User
from app.services.audit import AuditService

logger = logging.getLogger("clinova")


class ParsedPatientRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    first_name: str
    last_name: str
    date_of_birth: str  # YYYY-MM-DD
    gender: str
    phone: Optional[str] = None
    email: Optional[str] = None
    blood_group: Optional[str] = "Unknown"
    emergency_contact: Optional[str] = None
    allergies: Optional[str] = None
    current_medications: Optional[str] = None
    medical_history: Optional[str] = None
    mrn: Optional[str] = None


class ImportErrorItem(BaseModel):
    row_number: int
    raw_data: Dict[str, Any]
    errors: List[str]


class ImportPreviewResult(BaseModel):
    total_records: int
    valid_count: int
    invalid_count: int
    preview_items: List[ParsedPatientRecord]
    validation_errors: List[ImportErrorItem]


class ImportExecutionResult(BaseModel):
    total_processed: int
    created_count: int
    skipped_count: int
    duplicate_count: int
    created_patient_ids: List[str]


class PatientImportService:
    """Service to parse, validate, and ingest batches of clinical patient records."""

    @staticmethod
    def _parse_fhir_patient(resource: Dict[str, Any]) -> ParsedPatientRecord:
        """Extract standardized demographics from HL7 FHIR R4 Patient resource."""
        name_obj = resource.get("name", [{}])[0]
        family = name_obj.get("family", "Unknown")
        given_list = name_obj.get("given", ["Unknown"])
        given = " ".join(given_list) if isinstance(given_list, list) else str(given_list)

        telecom = resource.get("telecom", [])
        phone = None
        email = None
        for t in telecom:
            if t.get("system") == "phone":
                phone = t.get("value")
            elif t.get("system") == "email":
                email = t.get("value")

        birth_date = resource.get("birthDate", "1990-01-01")
        gender_raw = resource.get("gender", "other")
        gender_map = {"male": "Male", "female": "Female", "other": "Other", "unknown": "Unknown"}
        gender = gender_map.get(gender_raw.lower(), "Other")

        # Identifier
        mrn = None
        for ident in resource.get("identifier", []):
            if ident.get("value"):
                mrn = ident.get("value")
                break

        return ParsedPatientRecord(
            first_name=given,
            last_name=family,
            date_of_birth=birth_date,
            gender=gender,
            phone=phone,
            email=email,
            mrn=mrn,
        )

    @classmethod
    def parse_and_validate(
        cls, file_bytes: bytes, file_type: str
    ) -> ImportPreviewResult:
        """Parse raw file content (CSV, JSON, or FHIR) and validate each record."""
        valid_items: List[ParsedPatientRecord] = []
        errors: List[ImportErrorItem] = []
        file_type = file_type.lower()

        if file_type in ("csv", "text/csv"):
            text_stream = io.StringIO(file_bytes.decode("utf-8-sig", errors="replace"))
            reader = csv.DictReader(text_stream)
            for row_idx, row in enumerate(reader, start=1):
                clean_row = {k.strip(): v.strip() for k, v in row.items() if k}
                # Normalize DOB alias
                if "date_of_birth" not in clean_row and "dob" in clean_row:
                    clean_row["date_of_birth"] = clean_row["dob"]
                # Normalize name aliases
                if "first_name" not in clean_row:
                    candidate_name = clean_row.get("full_name") or clean_row.get("name")
                    if candidate_name:
                        parts = candidate_name.strip().split(" ", 1)
                        clean_row["first_name"] = parts[0]
                        clean_row["last_name"] = parts[1] if len(parts) > 1 else "Unknown"

                try:
                    # Validate date format
                    dob_str = clean_row.get("date_of_birth", "")
                    date.fromisoformat(dob_str)
                    record = ParsedPatientRecord(**clean_row)
                    valid_items.append(record)
                except Exception as e:
                    errors.append(
                        ImportErrorItem(
                            row_number=row_idx,
                            raw_data=clean_row,
                            errors=[str(e)],
                        )
                    )

        elif file_type in ("json", "application/json"):
            try:
                data = json.loads(file_bytes.decode("utf-8"))
            except Exception as e:
                return ImportPreviewResult(
                    total_records=0,
                    valid_count=0,
                    invalid_count=1,
                    preview_items=[],
                    validation_errors=[
                        ImportErrorItem(row_number=0, raw_data={}, errors=[f"Invalid JSON: {e}"])
                    ],
                )

            # FHIR Bundle Support
            if isinstance(data, dict) and data.get("resourceType") == "Bundle":
                entries = data.get("entry", [])
                for idx, entry in enumerate(entries, start=1):
                    res = entry.get("resource", {})
                    if res.get("resourceType") == "Patient":
                        try:
                            record = cls._parse_fhir_patient(res)
                            valid_items.append(record)
                        except Exception as e:
                            errors.append(
                                ImportErrorItem(row_number=idx, raw_data=res, errors=[str(e)])
                            )
            elif isinstance(data, list):
                for idx, row in enumerate(data, start=1):
                    try:
                        record = ParsedPatientRecord(**row)
                        valid_items.append(record)
                    except Exception as e:
                        errors.append(
                            ImportErrorItem(row_number=idx, raw_data=row, errors=[str(e)])
                        )

        return ImportPreviewResult(
            total_records=len(valid_items) + len(errors),
            valid_count=len(valid_items),
            invalid_count=len(errors),
            preview_items=valid_items[:20],  # Return first 20 for preview
            validation_errors=errors[:50],
        )

    @classmethod
    async def execute_batch_import(
        cls,
        records: List[ParsedPatientRecord],
        facility_id: str,
        current_user: User,
        db: AsyncSession,
    ) -> ImportExecutionResult:
        """Commit validated patient records into the database with primary MRNs."""
        import uuid
        created_ids = []
        skipped = 0

        for r in records:
            # Generate unique MRN if not supplied
            mrn = r.mrn or f"CLN-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:8].upper()}"

            # Verify MRN uniqueness
            stmt = select(Patient).where(Patient.mrn == mrn)
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if existing:
                mrn = f"CLN-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:8].upper()}"

            patient = Patient(
                facility_id=facility_id,
                mrn=mrn,
                first_name=r.first_name,
                last_name=r.last_name,
                date_of_birth=r.date_of_birth,
                gender=r.gender,
                blood_group=r.blood_group or "Unknown",
                phone=r.phone,
                email=r.email,
                emergency_contact=r.emergency_contact,
                allergies=r.allergies,
                current_medications=r.current_medications,
                medical_history=r.medical_history or "Imported via clinical batch ingestion.",
                is_active=True,
            )
            db.add(patient)
            await db.flush()

            # Create Primary MRN Identifier
            primary_id = PatientIdentifier(
                patient_id=patient.id,
                identifier_type=IdentifierType.MRN,
                identifier_value=mrn,
                issuing_system="Clinova Ingestion Pipeline",
                is_primary=True,
            )
            db.add(primary_id)
            created_ids.append(patient.id)

        await db.commit()

        # Audit log batch execution
        await AuditService.log_event(
            db=db,
            action="PATIENT_BATCH_IMPORT",
            resource_type="PATIENT_BATCH",
            user=current_user,
            details=f"Bulk imported {len(created_ids)} patients into facility {facility_id}.",
        )

        return ImportExecutionResult(
            total_processed=len(records),
            created_count=len(created_ids),
            skipped_count=skipped,
            duplicate_count=0,
            created_patient_ids=created_ids,
        )
