from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_clinician, get_current_doctor, get_client_ip
from app.core.access import check_encounter_access
from app.db.session import get_db
from app.models.consultation import Consultation, ConsultationStatus, TriageLevel
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.schemas.consultation import (
    ConsultationCreate,
    ConsultationUpdate,
    ConsultationResponse,
    ConsultationListResponse,
    SOAPNotesUpdate,
)
from app.services.audit import AuditService

router = APIRouter()


@router.get("", response_model=ConsultationListResponse)
async def list_consultations(
    request: Request,
    patient_id: Optional[str] = Query(None),
    status_filter: Optional[ConsultationStatus] = Query(None, alias="status"),
    triage_level: Optional[TriageLevel] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """List clinical consultations with optional filtering."""
    stmt = (
        select(Consultation)
        .options(selectinload(Consultation.patient), selectinload(Consultation.doctor))
    )

    # Doctors see assigned encounters; nurses support the shared clinical team.
    if current_user.role == UserRole.DOCTOR:
        stmt = stmt.where(Consultation.doctor_id == current_user.id)
    if patient_id:
        stmt = stmt.where(Consultation.patient_id == patient_id)

    if status_filter:
        stmt = stmt.where(Consultation.status == status_filter)
    if triage_level:
        stmt = stmt.where(Consultation.triage_level == triage_level)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Consultation.scheduled_at.desc()).offset(skip).limit(limit)
    res = await db.execute(stmt)
    consultations = res.scalars().all()

    return ConsultationListResponse(total=total, items=list(consultations))


@router.post("", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
async def create_consultation(
    consultation_in: ConsultationCreate,
    request: Request,
    current_user: User = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Schedule or initiate a new clinical consultation encounter."""
    # Verify patient exists
    stmt = select(Patient).where(Patient.id == consultation_in.patient_id)
    patient = (await db.execute(stmt)).scalar_one_or_none()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified patient does not exist.",
        )

    # Assign doctor: specified doctor or currently logged-in clinician
    if consultation_in.doctor_id and consultation_in.doctor_id != current_user.id:
        raise HTTPException(403, "You can create encounters only for yourself.")
    doctor_id = current_user.id
    scheduled_at = consultation_in.scheduled_at or datetime.now(timezone.utc)

    consultation = Consultation(
        patient_id=consultation_in.patient_id,
        doctor_id=doctor_id,
        scheduled_at=scheduled_at,
        chief_complaint=consultation_in.chief_complaint,
        vitals_data=consultation_in.vitals_data,
        triage_level=consultation_in.triage_level or TriageLevel.UNASSIGNED,
        status=ConsultationStatus.SCHEDULED,
    )
    db.add(consultation)
    await db.commit()

    # Re-fetch with relations
    stmt = (
        select(Consultation)
        .options(selectinload(Consultation.patient), selectinload(Consultation.doctor))
        .where(Consultation.id == consultation.id)
    )
    consultation = (await db.execute(stmt)).scalar_one()

    await AuditService.log_event(
        db=db,
        action="CONSULTATION_CREATE",
        resource_type="CONSULTATION",
        resource_id=consultation.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Created consultation for MRN {patient.mrn}: '{consultation.chief_complaint}'",
    )

    return consultation


@router.get("/{consultation_id}", response_model=ConsultationResponse)
async def get_consultation(
    consultation_id: str,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full consultation details, clinical notes, and AI synthesis."""
    stmt = (
        select(Consultation)
        .options(selectinload(Consultation.patient), selectinload(Consultation.doctor))
        .where(Consultation.id == consultation_id)
    )
    result = await db.execute(stmt)
    consultation = result.scalar_one_or_none()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation record not found.",
        )

    check_encounter_access(current_user, consultation)
    # Resource-level authorization (IDOR protection):
    # Patient role can ONLY view their own consultation records
    if current_user.role == UserRole.PATIENT:
        if not consultation.patient or consultation.patient.email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to another patient's consultation records.",
            )

    await AuditService.log_event(
        db=db,
        action="CONSULTATION_READ",
        resource_type="CONSULTATION",
        resource_id=consultation.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Viewed encounter notes for consultation {consultation.id}",
    )

    return consultation


@router.put("/{consultation_id}", response_model=ConsultationResponse)
async def update_consultation(
    consultation_id: str,
    consultation_in: ConsultationUpdate,
    request: Request,
    current_user: User = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Update consultation notes, triage severity, or status."""
    stmt = (
        select(Consultation)
        .options(selectinload(Consultation.patient), selectinload(Consultation.doctor))
        .where(Consultation.id == consultation_id)
    )
    result = await db.execute(stmt)
    consultation = result.scalar_one_or_none()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation record not found.",
        )

    check_encounter_access(current_user, consultation)
    update_data = consultation_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(consultation, field, value)

    await db.commit()
    await db.refresh(consultation)

    await AuditService.log_event(
        db=db,
        action="CONSULTATION_UPDATE",
        resource_type="CONSULTATION",
        resource_id=consultation.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Updated consultation fields: {list(update_data.keys())}",
    )

    return consultation


@router.put("/{consultation_id}/soap", response_model=ConsultationResponse)
async def update_soap_notes(
    consultation_id: str,
    soap_in: SOAPNotesUpdate,
    request: Request,
    current_user: User = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Directly save Subjective, Objective, Assessment, and Plan (SOAP) clinical notes."""
    stmt = (
        select(Consultation)
        .options(selectinload(Consultation.patient), selectinload(Consultation.doctor))
        .where(Consultation.id == consultation_id)
    )
    result = await db.execute(stmt)
    consultation = result.scalar_one_or_none()

    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation record not found.",
        )

    check_encounter_access(current_user, consultation)
    consultation.subjective = soap_in.subjective
    consultation.objective = soap_in.objective
    consultation.assessment = soap_in.assessment
    consultation.plan = soap_in.plan

    await db.commit()
    await db.refresh(consultation)

    await AuditService.log_event(
        db=db,
        action="SOAP_NOTES_SIGNED",
        resource_type="CONSULTATION",
        resource_id=consultation.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Clinician updated SOAP documentation for encounter {consultation.id}",
    )

    return consultation