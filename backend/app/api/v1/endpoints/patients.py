import random
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_current_clinician, get_current_doctor, require_roles, get_client_ip
from app.db.session import get_db
from app.models.patient import Patient
from app.models.identifier import PatientIdentifier, IdentifierType
from app.models.facility import Facility
from app.models.user import User, UserRole
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse, PatientListResponse
from app.services.audit import AuditService
from app.services.import_pipeline import (
    PatientImportService,
    ImportPreviewResult,
    ImportExecutionResult,
    ParsedPatientRecord,
)
from app.services.deduplication import (
    DeduplicationService,
    DuplicateMatchPair,
    MergeRequest,
    MergeResult,
)

router = APIRouter()


def generate_mrn() -> str:
    """Generate a unique clinical Medical Record Number."""
    year = datetime.now(timezone.utc).year
    rand_id = f"{random.randint(10000, 99999)}"
    return f"CLN-{year}-{rand_id}"


@router.get("", response_model=PatientListResponse)
async def list_patients(
    request: Request,
    q: Optional[str] = Query(None, description="Search by name or MRN"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Search and retrieve patient directory records (Clinicians only)."""
    stmt = select(Patient)

    # Multi-tenant facility isolation for non-admin clinicians
    if current_user.role != UserRole.ADMIN and current_user.facility_id:
        stmt = stmt.where(
            or_(
                Patient.facility_id == current_user.facility_id,
                Patient.facility_id.is_(None),
            )
        )

    if q and q.strip():
        search = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Patient.first_name.ilike(search),
                Patient.last_name.ilike(search),
                Patient.mrn.ilike(search),
            )
        )

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    # Get items
    stmt = stmt.order_by(Patient.last_name.asc()).offset(skip).limit(limit)
    res = await db.execute(stmt)
    patients = res.scalars().all()

    await AuditService.log_event(
        db=db,
        action="PATIENT_DIRECTORY_QUERY",
        resource_type="PATIENT_LIST",
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Query: '{q or ''}', Results count: {len(patients)}",
    )

    return PatientListResponse(total=total, items=list(patients))


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_in: PatientCreate,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Register a new patient into the EHR system."""
    mrn = patient_in.mrn or generate_mrn()

    # Check MRN uniqueness
    stmt = select(Patient).where(Patient.mrn == mrn)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        if patient_in.mrn:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient with MRN {mrn} already exists.",
            )
        mrn = generate_mrn()

    patient_data = patient_in.model_dump(exclude={"mrn"})
    if not patient_data.get("facility_id") and current_user.facility_id:
        patient_data["facility_id"] = current_user.facility_id

    patient = Patient(**patient_data, mrn=mrn)
    db.add(patient)
    await db.flush()

    # Automatically create primary MRN identifier in patient_identifiers
    primary_id = PatientIdentifier(
        patient_id=patient.id,
        identifier_type=IdentifierType.MRN,
        identifier_value=mrn,
        issuing_system="Clinova EHR",
        is_primary=True,
    )
    db.add(primary_id)
    await db.commit()
    await db.refresh(patient)

    await AuditService.log_event(
        db=db,
        action="PATIENT_CREATE",
        resource_type="PATIENT",
        resource_id=patient.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Created patient MRN: {patient.mrn} ({patient.last_name}, {patient.first_name})",
    )

    return patient


@router.get("/me", response_model=PatientResponse)
async def get_my_patient_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the logged-in user's linked clinical patient record."""
    stmt = (
        select(Patient)
        .options(selectinload(Patient.consultations))
        .where(Patient.email == current_user.email)
    )
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()

    if not patient:
        name_parts = current_user.full_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else "Patient"
        mrn = generate_mrn()
        patient = Patient(
            mrn=mrn,
            first_name=first_name,
            last_name=last_name,
            date_of_birth="1990-01-01",
            gender="Unspecified",
            blood_group="Unknown",
            email=current_user.email,
            medical_history="No recorded chronic conditions.",
        )
        db.add(patient)
        await db.commit()
        await db.refresh(patient)

    await AuditService.log_event(
        db=db,
        action="PATIENT_PHI_READ",
        resource_type="PATIENT",
        resource_id=patient.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Patient {current_user.full_name} accessed their own chart (MRN: {patient.mrn})",
    )

    return patient


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient_profile(
    patient_id: str,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full clinical patient chart and past medical history."""
    stmt = (
        select(Patient)
        .options(selectinload(Patient.consultations))
        .where(Patient.id == patient_id)
    )
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found.",
        )

    # Patient role can only view their own linked record (if applicable)
    if current_user.role == UserRole.PATIENT:
        if current_user.id != patient.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to another patient's medical records.",
            )
    elif current_user.role != UserRole.ADMIN and current_user.facility_id and patient.facility_id:
        if current_user.facility_id != patient.facility_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Patient belongs to another healthcare facility.",
            )

    await AuditService.log_event(
        db=db,
        action="PATIENT_PHI_READ",
        resource_type="PATIENT",
        resource_id=patient.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Accessed medical chart of MRN {patient.mrn}",
    )

    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    patient_in: PatientUpdate,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Update patient demographic and clinical history details."""
    stmt = select(Patient).where(Patient.id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found.",
        )

    if current_user.role != UserRole.ADMIN and current_user.facility_id and patient.facility_id:
        if current_user.facility_id != patient.facility_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Patient belongs to another healthcare facility.",
            )

    update_data = patient_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    await db.commit()
    await db.refresh(patient)

    await AuditService.log_event(
        db=db,
        action="PATIENT_UPDATE",
        resource_type="PATIENT",
        resource_id=patient.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Updated fields: {list(update_data.keys())}",
    )

    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(
    patient_id: str,
    request: Request,
    current_user: User = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Archive / Delete a patient record (Doctors / Admins only)."""
    stmt = select(Patient).where(Patient.id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found.",
        )

    if current_user.role != UserRole.ADMIN and current_user.facility_id and patient.facility_id:
        if current_user.facility_id != patient.facility_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Patient belongs to another healthcare facility.",
            )

    mrn = patient.mrn
    await db.delete(patient)
    await db.commit()

    await AuditService.log_event(
        db=db,
        action="PATIENT_DELETE",
        resource_type="PATIENT",
        resource_id=patient_id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Deleted patient MRN {mrn}",
    )

    return None


# ==================== BULK IMPORT & DEDUPLICATION ====================

@router.post("/import/preview", response_model=ImportPreviewResult)
async def preview_patient_import(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_clinician),
):
    """Dry-run validation preview for bulk patient import (CSV, JSON, or FHIR)."""
    file_bytes = await file.read()
    file_type = file.filename.split(".")[-1] if file.filename and "." in file.filename else "csv"
    return PatientImportService.parse_and_validate(file_bytes=file_bytes, file_type=file_type)


@router.post("/import/execute", response_model=ImportExecutionResult)
async def execute_patient_import(
    records: List[ParsedPatientRecord],
    facility_id: Optional[str] = None,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Execute batch insertion of validated clinical patient records."""
    target_facility = facility_id or current_user.facility_id
    if not target_facility:
        fac = (await db.execute(select(Facility).limit(1))).scalar_one_or_none()
        target_facility = fac.id if fac else "FAC-DISTRICT-01"

    return await PatientImportService.execute_batch_import(
        records=records,
        facility_id=target_facility,
        current_user=current_user,
        db=db,
    )


@router.get("/duplicates/candidates", response_model=List[DuplicateMatchPair])
async def list_duplicate_candidates(
    facility_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Scan patient directory for potential duplicate charts requiring clinician review."""
    scoped_facility = facility_id or (current_user.facility_id if current_user.role != UserRole.ADMIN else None)
    return await DeduplicationService.list_all_potential_duplicates(
        facility_id=scoped_facility,
        db=db,
        limit=limit,
    )


@router.post("/merge", response_model=MergeResult)
async def merge_patient_records(
    req: MergeRequest,
    current_user: User = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """Reconcile and merge duplicate patient chart into primary record with historical provenance."""
    try:
        return await DeduplicationService.merge_patient_records(
            primary_id=req.primary_patient_id,
            secondary_id=req.secondary_patient_id,
            merge_reason=req.merge_reason,
            current_user=current_user,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))