"""Patient-only views. Ownership always comes from the verified token's user."""
import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.deps import get_current_patient, get_client_ip
from app.db.session import get_db
from app.models.patient import Patient
from app.models.user import User
from app.models.case import TriageCase
from app.models.consultation import Consultation, ConsultationStatus
from app.schemas.patient import PatientResponse
from app.schemas.portal import PortalProfileInput, PatientCaseResponse, PatientConsultationResponse
from app.services.audit import AuditService

router = APIRouter()


def patient_case_response(case: TriageCase) -> PatientCaseResponse:
    return PatientCaseResponse(
        id=case.id, synthetic_case_id=case.synthetic_case_id,
        patient_id=case.patient_id,
        language=case.language, facility_type=case.facility_type, visit_type=case.visit_type,
        status=case.status, raw_symptoms=case.raw_symptoms, report_filename=case.report_filename,
        summary=case.normalized_symptoms if case.status in ("approved", "referred") else None,
        created_at=case.created_at, updated_at=case.updated_at,
    )


@router.get("/profile", response_model=PatientResponse | None)
async def profile(user: User = Depends(get_current_patient), db: AsyncSession = Depends(get_db)):
    return (await db.execute(select(Patient).where(Patient.user_id == user.id))).scalar_one_or_none()


@router.put("/profile", response_model=PatientResponse)
async def save_profile(
    payload: PortalProfileInput, request: Request,
    user: User = Depends(get_current_patient), db: AsyncSession = Depends(get_db),
):
    try:
        dob = date.fromisoformat(payload.date_of_birth)
        if dob > date.today():
            raise ValueError()
    except ValueError:
        raise HTTPException(422, "Enter a valid date of birth that is not in the future.")
    patient = await profile(user, db)
    if patient is None:
        patient = Patient(user_id=user.id, mrn=f"CLN-{uuid.uuid4().hex[:12].upper()}", email=user.email, **payload.model_dump())
        db.add(patient)
    else:
        for key, value in payload.model_dump().items():
            setattr(patient, key, value)
    await db.commit()
    await db.refresh(patient)
    await AuditService.log_event(db=db, action="PATIENT_PROFILE_SAVED", resource_type="PATIENT", resource_id=patient.id, user=user, ip_address=get_client_ip(request))
    return patient


@router.get("/cases", response_model=list[PatientCaseResponse])
async def my_cases(user: User = Depends(get_current_patient), db: AsyncSession = Depends(get_db)):
    cases = (await db.execute(select(TriageCase).where(
        TriageCase.owner_user_id == user.id, TriageCase.is_deleted.is_(False)
    ).order_by(TriageCase.created_at.desc()))).scalars().all()
    return [patient_case_response(case) for case in cases]


@router.get("/consultations", response_model=list[PatientConsultationResponse])
async def my_consultations(user: User = Depends(get_current_patient), db: AsyncSession = Depends(get_db)):
    encounters = (await db.execute(select(Consultation).join(Consultation.patient).where(
        Patient.user_id == user.id
    ).options(selectinload(Consultation.doctor)).order_by(Consultation.scheduled_at.desc()))).scalars().all()
    return [PatientConsultationResponse(
        id=c.id, scheduled_at=c.scheduled_at, chief_complaint=c.chief_complaint,
        status=c.status, doctor_name=c.doctor.full_name,
        summary=c.assessment if c.status == ConsultationStatus.COMPLETED else None,
    ) for c in encounters]