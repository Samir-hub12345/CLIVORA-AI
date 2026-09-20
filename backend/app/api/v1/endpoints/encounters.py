from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_current_clinician, get_client_ip
from app.db.session import get_db
from app.models.encounter import Encounter, EncounterStatus, EncounterType
from app.models.patient import Patient
from app.models.facility import Facility
from app.models.user import User, UserRole
from app.schemas.clinical import EncounterCreate, EncounterUpdate, EncounterResponse, EncounterListResponse
from app.services.audit import AuditService

router = APIRouter()


@router.post("", response_model=EncounterResponse, status_code=status.HTTP_201_CREATED)
async def create_encounter(
    encounter_in: EncounterCreate,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Create a new clinical encounter for a patient at a specific facility."""
    # Validate patient exists
    p_stmt = select(Patient).where(Patient.id == encounter_in.patient_id)
    patient = (await db.execute(p_stmt)).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    # Resolve facility ID
    target_facility_id = encounter_in.facility_id or patient.facility_id or current_user.facility_id
    if not target_facility_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Facility ID is required.")

    # Validate facility exists
    f_stmt = select(Facility).where(Facility.id == target_facility_id)
    facility = (await db.execute(f_stmt)).scalar_one_or_none()
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found.")

    # Enforce facility isolation: clinician must belong to the facility (unless admin)
    if current_user.role != UserRole.ADMIN and current_user.facility_id:
        if current_user.facility_id != target_facility_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-facility encounter creation denied.",
            )

    attending_id = encounter_in.attending_clinician_id or current_user.id
    encounter = Encounter(
        patient_id=encounter_in.patient_id,
        facility_id=target_facility_id,
        attending_clinician_id=attending_id,
        encounter_type=encounter_in.encounter_type,
        status=encounter_in.status,
        reason_for_visit=encounter_in.reason_for_visit,
        clinical_summary=encounter_in.clinical_summary,
        start_time=encounter_in.start_time or datetime.now(timezone.utc),
    )
    db.add(encounter)
    await db.commit()
    await db.refresh(encounter)

    await AuditService.log_event(
        db=db,
        action="ENCOUNTER_CREATE",
        resource_type="ENCOUNTER",
        resource_id=encounter.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Encounter ({encounter.encounter_type.value}) created for patient MRN {patient.mrn}",
    )

    return encounter


@router.get("", response_model=EncounterListResponse)
async def list_encounters(
    request: Request,
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    facility_id: Optional[str] = Query(None, description="Filter by facility ID"),
    encounter_status: Optional[EncounterStatus] = Query(None, description="Filter by encounter status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List clinical encounters with pagination and tenant scoping."""
    stmt = select(Encounter)

    # Patient isolation: patients can only query their own encounters
    if current_user.role == UserRole.PATIENT:
        p_res = await db.execute(select(Patient.id).where(Patient.email == current_user.email))
        user_patient_id = p_res.scalar_one_or_none()
        if not user_patient_id:
            return EncounterListResponse(total=0, items=[])
        stmt = stmt.where(Encounter.patient_id == user_patient_id)
    else:
        # Clinician facility scoping
        if current_user.role != UserRole.ADMIN and current_user.facility_id:
            stmt = stmt.where(Encounter.facility_id == current_user.facility_id)

    if patient_id:
        stmt = stmt.where(Encounter.patient_id == patient_id)
    if facility_id:
        stmt = stmt.where(Encounter.facility_id == facility_id)
    if encounter_status:
        stmt = stmt.where(Encounter.status == encounter_status)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(desc(Encounter.start_time)).offset(skip).limit(limit)
    res = await db.execute(stmt)
    encounters = res.scalars().all()

    return EncounterListResponse(total=total, items=list(encounters))


@router.get("/{encounter_id}", response_model=EncounterResponse)
async def get_encounter(
    encounter_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve encounter details by ID."""
    stmt = select(Encounter).where(Encounter.id == encounter_id)
    res = await db.execute(stmt)
    encounter = res.scalar_one_or_none()

    if not encounter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found.")

    # Patient ownership check
    if current_user.role == UserRole.PATIENT:
        p_res = await db.execute(select(Patient.id).where(Patient.email == current_user.email))
        user_patient_id = p_res.scalar_one_or_none()
        if encounter.patient_id != user_patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to encounter belonging to another patient.",
            )
    else:
        # Facility isolation check
        if current_user.role != UserRole.ADMIN and current_user.facility_id:
            if encounter.facility_id != current_user.facility_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-facility access denied. Encounter belongs to another facility.",
                )

    return encounter


@router.patch("/{encounter_id}", response_model=EncounterResponse)
@router.put("/{encounter_id}", response_model=EncounterResponse)
async def update_encounter(
    encounter_id: str,
    encounter_in: EncounterUpdate,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Update encounter status, clinical summary, or close the encounter."""
    stmt = select(Encounter).where(Encounter.id == encounter_id)
    encounter = (await db.execute(stmt)).scalar_one_or_none()
    if not encounter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found.")

    if current_user.role != UserRole.ADMIN and current_user.facility_id:
        if encounter.facility_id != current_user.facility_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-facility modification denied.",
            )

    if encounter_in.status is not None:
        encounter.status = encounter_in.status
        if encounter_in.status == EncounterStatus.COMPLETED and not encounter.end_time:
            encounter.end_time = datetime.now(timezone.utc)
    if encounter_in.clinical_summary is not None:
        encounter.clinical_summary = encounter_in.clinical_summary
    if encounter_in.end_time is not None:
        encounter.end_time = encounter_in.end_time
    if encounter_in.attending_clinician_id is not None:
        encounter.attending_clinician_id = encounter_in.attending_clinician_id

    encounter.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(encounter)

    await AuditService.log_event(
        db=db,
        action="ENCOUNTER_UPDATE",
        resource_type="ENCOUNTER",
        resource_id=encounter.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Updated encounter status: {encounter.status.value}",
    )

    return encounter
