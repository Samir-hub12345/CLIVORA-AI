from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_current_clinician, get_current_doctor, get_client_ip
from app.db.session import get_db
from app.models.patient import Patient
from app.models.encounter import Encounter
from app.models.observation import ClinicalObservation, ObservationType, ObservationSource, VerificationStatus
from app.models.allergy import Allergy, AllergySeverity, AllergyStatus
from app.models.medication import Medication, MedicationType, MedicationStatus
from app.models.diagnosis import Diagnosis, DiagnosisType, DiagnosisStatus
from app.models.note import ClinicalNote, NoteType, NoteStatus
from app.models.referral import Referral, ReferralPriority, ReferralStatus
from app.models.facility import Facility
from app.models.user import User, UserRole
from app.schemas.clinical import (
    ObservationCreate, ObservationResponse,
    AllergyCreate, AllergyResponse,
    MedicationCreate, MedicationResponse,
    DiagnosisCreate, DiagnosisResponse,
    ClinicalNoteCreate, ClinicalNoteResponse, NoteAmendmentCreate,
    ReferralCreate, ReferralResponse, ReferralUpdate,
    PatientTimelineItem, PatientTimelineResponse
)
from app.services.audit import AuditService

router = APIRouter()


# ==================== OBSERVATIONS / VITALS ====================

@router.post("/observations", response_model=ObservationResponse, status_code=status.HTTP_201_CREATED)
async def record_observation(
    obs_in: ObservationCreate,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Record a structured clinical observation or physiological measurement."""
    # Verify patient exists
    p_res = await db.execute(select(Patient).where(Patient.id == obs_in.patient_id))
    patient = p_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    # Facility scoping check
    if current_user.role != UserRole.ADMIN and current_user.facility_id and patient.facility_id:
        if current_user.facility_id != patient.facility_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-facility observation creation denied.")

    observation = ClinicalObservation(
        patient_id=obs_in.patient_id,
        encounter_id=obs_in.encounter_id,
        observation_type=obs_in.observation_type,
        value_numeric=obs_in.value_numeric,
        value_text=obs_in.value_text,
        unit=obs_in.unit,
        reference_range_low=obs_in.reference_range_low,
        reference_range_high=obs_in.reference_range_high,
        interpretation=obs_in.interpretation,
        observed_at=obs_in.observed_at or datetime.now(timezone.utc),
        recorded_by=current_user.id,
        source=obs_in.source,
        verification_status=VerificationStatus.VERIFIED if current_user.role in [UserRole.DOCTOR, UserRole.NURSE] else VerificationStatus.UNVERIFIED,
        verified_by=current_user.id if current_user.role in [UserRole.DOCTOR, UserRole.NURSE] else None,
        verified_at=datetime.now(timezone.utc) if current_user.role in [UserRole.DOCTOR, UserRole.NURSE] else None,
    )
    db.add(observation)
    await db.commit()
    await db.refresh(observation)

    await AuditService.log_event(
        db=db,
        action="OBSERVATION_RECORD",
        resource_type="OBSERVATION",
        resource_id=observation.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Observation recorded: {observation.observation_type.value} = {observation.value_numeric or observation.value_text} {observation.unit}",
    )

    return observation


@router.patch("/observations/{observation_id}/verify", response_model=ObservationResponse)
@router.put("/observations/{observation_id}/verify", response_model=ObservationResponse)
async def verify_observation(
    observation_id: str,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Clinician confirms and signs off on a vital sign or clinical observation."""
    stmt = select(ClinicalObservation).where(ClinicalObservation.id == observation_id)
    obs = (await db.execute(stmt)).scalar_one_or_none()
    if not obs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Observation not found.")

    obs.verification_status = VerificationStatus.VERIFIED
    obs.verified_by = current_user.id
    obs.verified_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(obs)
    return obs


@router.get("/observations", response_model=List[ObservationResponse])
async def list_observations(
    patient_id: str = Query(..., description="Target patient UUID"),
    observation_type: Optional[ObservationType] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query structured clinical observations for a patient."""
    # Patient isolation
    if current_user.role == UserRole.PATIENT:
        p_res = await db.execute(select(Patient.id).where(Patient.email == current_user.email))
        user_p_id = p_res.scalar_one_or_none()
        if patient_id != user_p_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    stmt = select(ClinicalObservation).where(ClinicalObservation.patient_id == patient_id)
    if observation_type:
        stmt = stmt.where(ClinicalObservation.observation_type == observation_type)

    stmt = stmt.order_by(desc(ClinicalObservation.observed_at)).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/patients/{patient_id}/observations", response_model=List[ObservationResponse])
async def list_patient_observations(
    patient_id: str,
    observation_type: Optional[ObservationType] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Alias for querying observations by patient path parameter."""
    return await list_observations(
        patient_id=patient_id,
        observation_type=observation_type,
        limit=limit,
        current_user=current_user,
        db=db,
    )


# ==================== ALLERGIES ====================

@router.post("/allergies", response_model=AllergyResponse, status_code=status.HTTP_201_CREATED)
async def record_allergy(
    allergy_in: AllergyCreate,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Add a documented patient allergy with reaction and severity."""
    p_res = await db.execute(select(Patient).where(Patient.id == allergy_in.patient_id))
    patient = p_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    if current_user.role != UserRole.ADMIN and current_user.facility_id and patient.facility_id:
        if current_user.facility_id != patient.facility_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-facility allergy recording denied.")

    allergy = Allergy(
        patient_id=allergy_in.patient_id,
        substance=allergy_in.substance,
        reaction=allergy_in.reaction,
        severity=allergy_in.severity,
        status=allergy_in.status,
        onset_date=allergy_in.onset_date,
        notes=allergy_in.notes,
        recorded_by=current_user.id,
        verification_status="confirmed",
    )
    db.add(allergy)
    await db.commit()
    await db.refresh(allergy)

    await AuditService.log_event(
        db=db,
        action="ALLERGY_RECORD",
        resource_type="ALLERGY",
        resource_id=allergy.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Allergy added: {allergy.substance} ({allergy.severity.value})",
    )

    return allergy


@router.get("/allergies", response_model=List[AllergyResponse])
async def list_allergies(
    patient_id: str = Query(..., description="Target patient UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List documented allergies for a patient."""
    if current_user.role == UserRole.PATIENT:
        p_res = await db.execute(select(Patient.id).where(Patient.email == current_user.email))
        user_p_id = p_res.scalar_one_or_none()
        if patient_id != user_p_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    stmt = select(Allergy).where(Allergy.patient_id == patient_id).order_by(desc(Allergy.created_at))
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/patients/{patient_id}/allergies", response_model=List[AllergyResponse])
async def list_patient_allergies(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Alias for querying allergies by patient path parameter."""
    return await list_allergies(patient_id=patient_id, current_user=current_user, db=db)


# ==================== MEDICATIONS ====================

@router.post("/medications", response_model=MedicationResponse, status_code=status.HTTP_201_CREATED)
async def record_medication(
    med_in: MedicationCreate,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Record an active or prescribed patient medication."""
    p_res = await db.execute(select(Patient).where(Patient.id == med_in.patient_id))
    patient = p_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    if current_user.role != UserRole.ADMIN and current_user.facility_id and patient.facility_id:
        if current_user.facility_id != patient.facility_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-facility medication recording denied.")

    medication = Medication(
        patient_id=med_in.patient_id,
        encounter_id=med_in.encounter_id,
        medication_name=med_in.medication_name,
        dosage=med_in.dosage,
        route=med_in.route,
        frequency=med_in.frequency,
        duration=med_in.duration,
        medication_type=med_in.medication_type,
        status=med_in.status,
        start_date=med_in.start_date,
        end_date=med_in.end_date,
        instructions=med_in.instructions,
        prescribed_by=current_user.id if current_user.role == UserRole.DOCTOR else None,
    )
    db.add(medication)
    await db.commit()
    await db.refresh(medication)

    await AuditService.log_event(
        db=db,
        action="MEDICATION_RECORD",
        resource_type="MEDICATION",
        resource_id=medication.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Medication recorded: {medication.medication_name} ({medication.dosage or ''})",
    )

    return medication


@router.get("/medications", response_model=List[MedicationResponse])
async def list_medications(
    patient_id: str = Query(..., description="Target patient UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List medications for a patient."""
    if current_user.role == UserRole.PATIENT:
        p_res = await db.execute(select(Patient.id).where(Patient.email == current_user.email))
        user_p_id = p_res.scalar_one_or_none()
        if patient_id != user_p_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    stmt = select(Medication).where(Medication.patient_id == patient_id).order_by(desc(Medication.created_at))
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/patients/{patient_id}/medications", response_model=List[MedicationResponse])
async def list_patient_medications(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Alias for querying medications by patient path parameter."""
    return await list_medications(patient_id=patient_id, current_user=current_user, db=db)


# ==================== DIAGNOSES ====================

@router.post("/diagnoses", response_model=DiagnosisResponse, status_code=status.HTTP_201_CREATED)
async def record_diagnosis(
    diag_in: DiagnosisCreate,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Record a clinical diagnosis or AI suggestion."""
    p_res = await db.execute(select(Patient).where(Patient.id == diag_in.patient_id))
    patient = p_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    if current_user.role != UserRole.ADMIN and current_user.facility_id and patient.facility_id:
        if current_user.facility_id != patient.facility_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-facility diagnosis recording denied.")

    # Distinct separation: AI suggestions cannot masquerade as clinician-confirmed
    if diag_in.diagnosis_type == DiagnosisType.AI_SUGGESTION:
        verification = "unverified"
        diag_by = None
    else:
        verification = "verified" if current_user.role == UserRole.DOCTOR else "unverified"
        diag_by = current_user.id

    diagnosis = Diagnosis(
        patient_id=diag_in.patient_id,
        encounter_id=diag_in.encounter_id,
        description=diag_in.description,
        code=diag_in.code,
        diagnosis_type=diag_in.diagnosis_type,
        status=diag_in.status,
        is_primary=diag_in.is_primary,
        ai_confidence_score=diag_in.ai_confidence_score,
        verification_status=verification,
        verified_by=current_user.id if verification == "verified" else None,
        verified_at=datetime.now(timezone.utc) if verification == "verified" else None,
        diagnosed_by=diag_by,
        notes=diag_in.notes,
    )
    db.add(diagnosis)
    await db.commit()
    await db.refresh(diagnosis)

    await AuditService.log_event(
        db=db,
        action="DIAGNOSIS_RECORD",
        resource_type="DIAGNOSIS",
        resource_id=diagnosis.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Diagnosis recorded: {diagnosis.description} (Type: {diagnosis.diagnosis_type.value}, Verification: {diagnosis.verification_status})",
    )

    return diagnosis


@router.patch("/diagnoses/{diagnosis_id}/verify", response_model=DiagnosisResponse)
@router.put("/diagnoses/{diagnosis_id}/verify", response_model=DiagnosisResponse)
async def verify_diagnosis(
    diagnosis_id: str,
    action: str = Query("verify", description="Action: 'verify' or 'reject'"),
    request: Request = None,
    current_user: User = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Doctor verification or rejection of an AI-derived diagnosis suggestion."""
    stmt = select(Diagnosis).where(Diagnosis.id == diagnosis_id)
    diag = (await db.execute(stmt)).scalar_one_or_none()
    if not diag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagnosis record not found.")

    if action.lower() == "verify":
        diag.verification_status = "verified"
        diag.verified_by = current_user.id
        diag.verified_at = datetime.now(timezone.utc)
        diag.diagnosis_type = DiagnosisType.CLINICIAN_CONFIRMED
    elif action.lower() == "reject":
        diag.verification_status = "rejected"
        diag.status = DiagnosisStatus.RULED_OUT
        diag.verified_by = current_user.id
        diag.verified_at = datetime.now(timezone.utc)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Action must be 'verify' or 'reject'")

    diag.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(diag)

    await AuditService.log_event(
        db=db,
        action=f"DIAGNOSIS_{action.upper()}",
        resource_type="DIAGNOSIS",
        resource_id=diag.id,
        user=current_user,
        ip_address=get_client_ip(request) if request else None,
        details=f"Doctor {current_user.full_name} {action}ed diagnosis: {diag.description}",
    )

    return diag


@router.get("/diagnoses", response_model=List[DiagnosisResponse])
async def list_diagnoses(
    patient_id: str = Query(..., description="Target patient UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List clinical diagnoses for a patient."""
    if current_user.role == UserRole.PATIENT:
        p_res = await db.execute(select(Patient.id).where(Patient.email == current_user.email))
        user_p_id = p_res.scalar_one_or_none()
        if patient_id != user_p_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    stmt = select(Diagnosis).where(Diagnosis.patient_id == patient_id).order_by(desc(Diagnosis.created_at))
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/patients/{patient_id}/diagnoses", response_model=List[DiagnosisResponse])
async def list_patient_diagnoses(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Alias for querying diagnoses by patient path parameter."""
    return await list_diagnoses(patient_id=patient_id, current_user=current_user, db=db)


# ==================== CLINICAL NOTES & VERSIONING ====================

@router.post("/notes", response_model=ClinicalNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_clinical_note(
    note_in: ClinicalNoteCreate,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Create a signed clinical note."""
    p_res = await db.execute(select(Patient).where(Patient.id == note_in.patient_id))
    patient = p_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    if current_user.role != UserRole.ADMIN and current_user.facility_id and patient.facility_id:
        if current_user.facility_id != patient.facility_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-facility note creation denied.")

    note = ClinicalNote(
        patient_id=note_in.patient_id,
        encounter_id=note_in.encounter_id,
        consultation_id=note_in.consultation_id,
        author_id=current_user.id,
        note_type=note_in.note_type,
        status=NoteStatus.FINALIZED if note_in.is_signed else NoteStatus.DRAFT,
        title=note_in.title,
        content=note_in.content,
        version=1,
        is_signed=note_in.is_signed,
        signed_at=datetime.now(timezone.utc) if note_in.is_signed else None,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    await AuditService.log_event(
        db=db,
        action="CLINICAL_NOTE_CREATE",
        resource_type="CLINICAL_NOTE",
        resource_id=note.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Created clinical note: {note.title} (v{note.version})",
    )

    return note


@router.post("/notes/{note_id}/amend", response_model=ClinicalNoteResponse, status_code=status.HTTP_201_CREATED)
@router.put("/notes/{note_id}/amend", response_model=ClinicalNoteResponse, status_code=status.HTTP_201_CREATED)
async def amend_clinical_note(
    note_id: str,
    amend_in: NoteAmendmentCreate,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Amend an existing clinical note by creating a new version without destroying historical records."""
    stmt = select(ClinicalNote).where(ClinicalNote.id == note_id)
    orig_note = (await db.execute(stmt)).scalar_one_or_none()
    if not orig_note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original note not found.")

    # Mark original note as amended
    orig_note.status = NoteStatus.AMENDED
    orig_note.updated_at = datetime.now(timezone.utc)

    # Create new version
    amended_note = ClinicalNote(
        patient_id=orig_note.patient_id,
        encounter_id=orig_note.encounter_id,
        consultation_id=orig_note.consultation_id,
        author_id=current_user.id,
        note_type=orig_note.note_type,
        status=NoteStatus.FINALIZED,
        title=f"{orig_note.title} [Amended v{orig_note.version + 1}]",
        content=amend_in.new_content,
        version=orig_note.version + 1,
        parent_note_id=orig_note.id,
        amendment_reason=amend_in.amendment_reason,
        is_signed=True,
        signed_at=datetime.now(timezone.utc),
    )
    db.add(amended_note)
    await db.commit()
    await db.refresh(amended_note)

    await AuditService.log_event(
        db=db,
        action="CLINICAL_NOTE_AMEND",
        resource_type="CLINICAL_NOTE",
        resource_id=amended_note.id,
        user=current_user,
        ip_address=get_client_ip(request) if request else None,
        details=f"Amended note {orig_note.id} -> {amended_note.id} (v{amended_note.version}). Reason: {amend_in.amendment_reason}",
    )

    return amended_note


@router.get("/notes/{note_id}", response_model=ClinicalNoteResponse)
async def get_clinical_note(
    note_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a single clinical note by UUID."""
    stmt = select(ClinicalNote).where(ClinicalNote.id == note_id)
    note = (await db.execute(stmt)).scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinical note not found.")
    return note


# ==================== REFERRALS ====================

@router.post("/referrals", response_model=ReferralResponse, status_code=status.HTTP_201_CREATED)
async def create_referral(
    ref_in: ReferralCreate,
    request: Request,
    current_user: User = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Create a structured clinical referral letter between facilities."""
    p_res = await db.execute(select(Patient).where(Patient.id == ref_in.patient_id))
    patient = p_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    origin_facility = ref_in.origin_facility_id or patient.facility_id or current_user.facility_id
    if not origin_facility:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Origin facility ID required.")

    referral = Referral(
        patient_id=ref_in.patient_id,
        encounter_id=ref_in.encounter_id,
        case_id=ref_in.case_id,
        origin_facility_id=origin_facility,
        destination_facility_id=ref_in.destination_facility_id,
        referring_doctor_id=current_user.id,
        specialty_requested=ref_in.specialty_requested,
        priority=ref_in.priority,
        status=ReferralStatus.ISSUED,
        reason_for_referral=ref_in.reason_for_referral,
        clinical_summary=ref_in.clinical_summary,
        transport_requirements=ref_in.transport_requirements,
    )
    db.add(referral)
    await db.commit()
    await db.refresh(referral)

    await AuditService.log_event(
        db=db,
        action="REFERRAL_CREATE",
        resource_type="REFERRAL",
        resource_id=referral.id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Created referral to facility {referral.destination_facility_id or 'Specialist'} (Priority: {referral.priority.value})",
    )

    return referral


@router.patch("/referrals/{referral_id}", response_model=ReferralResponse)
@router.put("/referrals/{referral_id}", response_model=ReferralResponse)
async def update_referral(
    referral_id: str,
    ref_update: ReferralUpdate,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Update referral lifecycle status and specialist clinical notes."""
    stmt = select(Referral).where(Referral.id == referral_id)
    referral = (await db.execute(stmt)).scalar_one_or_none()
    if not referral:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referral not found.")

    if ref_update.status:
        referral.status = ref_update.status
    if ref_update.clinical_summary:
        referral.clinical_summary = ref_update.clinical_summary

    await db.commit()
    await db.refresh(referral)
    return referral


# ==================== LONGITUDINAL PATIENT TIMELINE ====================

@router.get("/timeline/{patient_id}", response_model=PatientTimelineResponse)
@router.get("/patients/{patient_id}/timeline", response_model=PatientTimelineResponse)
async def get_patient_timeline(
    patient_id: str,
    request: Request,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Construct a longitudinal clinical timeline synthesizing encounters, vitals, diagnoses, notes, and referrals."""
    # 1. Fetch patient
    p_stmt = select(Patient).where(Patient.id == patient_id)
    patient = (await db.execute(p_stmt)).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    # Authorization
    if current_user.role == UserRole.PATIENT:
        if current_user.email != patient.email:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to another patient's timeline.")
    else:
        if current_user.role != UserRole.ADMIN and current_user.facility_id and patient.facility_id:
            if current_user.facility_id != patient.facility_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-facility timeline access denied.")

    timeline_items: List[PatientTimelineItem] = []

    # 2. Encounters
    enc_stmt = select(Encounter).where(Encounter.patient_id == patient_id).order_by(desc(Encounter.start_time)).limit(limit)
    encs = (await db.execute(enc_stmt)).scalars().all()
    for e in encs:
        timeline_items.append(PatientTimelineItem(
            event_id=e.id,
            event_type="encounter",
            title=f"Clinical Encounter — {e.encounter_type.value.capitalize()}",
            timestamp=e.start_time,
            status=e.status.value,
            details=e.reason_for_visit or e.clinical_summary,
        ))

    # 3. Clinical Observations
    obs_stmt = select(ClinicalObservation).where(ClinicalObservation.patient_id == patient_id).order_by(desc(ClinicalObservation.observed_at)).limit(limit)
    obs = (await db.execute(obs_stmt)).scalars().all()
    for o in obs:
        val = f"{o.value_numeric} {o.unit}" if o.value_numeric is not None else f"{o.value_text} {o.unit}"
        timeline_items.append(PatientTimelineItem(
            event_id=o.id,
            event_type="observation",
            title=f"Vital Sign: {o.observation_type.value.replace('_', ' ').title()}",
            timestamp=o.observed_at,
            status=o.verification_status.value,
            details=f"Value: {val} (Interpretation: {o.interpretation or 'Recorded'})",
        ))

    # 4. Clinical Notes
    notes_stmt = select(ClinicalNote).where(ClinicalNote.patient_id == patient_id).order_by(desc(ClinicalNote.created_at)).limit(limit)
    notes = (await db.execute(notes_stmt)).scalars().all()
    for n in notes:
        timeline_items.append(PatientTimelineItem(
            event_id=n.id,
            event_type="clinical_note",
            title=n.title,
            timestamp=n.created_at,
            status=n.status.value,
            details=n.content[:200] + ("..." if len(n.content) > 200 else ""),
        ))

    # 5. Diagnoses
    diag_stmt = select(Diagnosis).where(Diagnosis.patient_id == patient_id).order_by(desc(Diagnosis.created_at)).limit(limit)
    diags = (await db.execute(diag_stmt)).scalars().all()
    for d in diags:
        timeline_items.append(PatientTimelineItem(
            event_id=d.id,
            event_type="diagnosis",
            title=f"Diagnosis: {d.description}",
            timestamp=d.created_at,
            status=d.status.value,
            details=f"Type: {d.diagnosis_type.value} | Status: {d.verification_status}",
        ))

    # 6. Referrals
    ref_stmt = select(Referral).where(Referral.patient_id == patient_id).order_by(desc(Referral.created_at)).limit(limit)
    refs = (await db.execute(ref_stmt)).scalars().all()
    for r in refs:
        timeline_items.append(PatientTimelineItem(
            event_id=r.id,
            event_type="referral",
            title=f"Facility Referral: {r.specialty_requested or 'Specialist Evaluation'}",
            timestamp=r.created_at,
            status=r.status.value,
            details=r.reason_for_referral,
        ))

    # Sort all events chronologically descending
    timeline_items.sort(key=lambda x: x.timestamp, reverse=True)
    timeline_items = timeline_items[:limit]

    return PatientTimelineResponse(
        patient_id=patient.id,
        mrn=patient.mrn,
        patient_name=f"{patient.first_name} {patient.last_name}",
        total_events=len(timeline_items),
        timeline=timeline_items,
    )
