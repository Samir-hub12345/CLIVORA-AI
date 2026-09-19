import random
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_current_clinician, get_current_doctor, get_client_ip
from app.db.session import get_db
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse, PatientListResponse
from app.services.audit import AuditService

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
    patient = Patient(**patient_data, mrn=mrn)
    db.add(patient)
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
    current_user: User = Depends(get_current_user),
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
        if current_user.email != patient.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to another patient's medical records.",
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
