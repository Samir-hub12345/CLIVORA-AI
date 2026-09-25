import json
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.case import TriageCase
from app.models.user import User, UserRole
from app.core.deps import (
    get_client_ip,
    get_current_clinician,
    get_current_doctor,
    get_current_user,
    get_current_user_optional,
    get_intake_user,
)
from app.schemas.portal import PatientCaseResponse
from app.api.v1.endpoints.portal import patient_case_response
from app.schemas.case import (
    CaseCreateRequest,
    CaseResponse,
    CaseAssignRequest,
    CaseVerifyIntakeRequest,
    StructuredTriageNote,
)
from app.services.anonymizer import anonymizer
from app.services.ai.gemini_service import ai_service
from app.services.audit import AuditService

logger = logging.getLogger("clinova")
router = APIRouter()


@router.post("", response_model=PatientCaseResponse | CaseResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PatientCaseResponse | CaseResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_triage_case(
    req: CaseCreateRequest,
    request: Request,
    current_user: User = Depends(get_intake_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new multimodal triage case with anonymization and structured decision support."""
    if not req.consent_acknowledged or not req.raw_symptoms.strip():
        raise HTTPException(422, "Consent and a symptom description are required.")
    if req.report_ocr_data:
        for field in req.report_ocr_data:
            field.verification_status = "pending"
    # 1. Anonymize patient reported text
    sanitized_symptoms, was_redacted = anonymizer.sanitize_text(req.raw_symptoms)
    synthetic_case_id = anonymizer.generate_synthetic_case_id()

    # 2. Synthesize structured non-diagnostic triage note
    triage_note = await ai_service.synthesize_triage_note(
        case_id=synthetic_case_id,
        symptoms=sanitized_symptoms,
        speech_transcript=req.speech_transcript,
        report_fields=req.report_ocr_data,
        patient_age=req.approximate_age,
        gender=req.gender,
        facility_type=req.facility_type,
        visit_type=req.visit_type,
    )

    ocr_json = json.dumps([f.model_dump() for f in req.report_ocr_data]) if req.report_ocr_data else None
    vitals_json = json.dumps(req.vitals) if req.vitals else None

    # Determine patient ID (either explicit, or authenticated user if patient)
    resolved_patient_id = req.patient_id
    if not resolved_patient_id and current_user and current_user.role == UserRole.PATIENT:
        resolved_patient_id = current_user.id

    # 3. Create case record
    case = TriageCase(
        owner_user_id=current_user.id,
        synthetic_case_id=synthetic_case_id,
        patient_id=resolved_patient_id,
        language=req.preferred_language,
        facility_type=req.facility_type,
        visit_type=req.visit_type,
        status="awaiting_review",
        queue_category=triage_note["queue_category"],
        queue_reason=triage_note["queue_reason"],
        consent_status=req.consent_acknowledged,
        approximate_age=req.approximate_age,
        gender=req.gender,
        context_notes=req.context_notes,
        vitals=vitals_json,
        intake_verified=False,
        raw_symptoms=sanitized_symptoms,
        normalized_symptoms=triage_note["symptom_summary"],
        speech_transcript=req.speech_transcript,
        detected_language=req.detected_language,
        report_filename=req.report_filename,
        report_ocr_data=ocr_json,
        image_reference=req.image_reference,
        triage_summary=json.dumps(triage_note),
        missing_information=json.dumps(triage_note["missing_information"]),
        follow_up_questions=json.dumps(triage_note["follow_up_questions"]),
        risk_signals=json.dumps(triage_note["risk_signals"]),
        timeline_events=json.dumps(triage_note["timeline"]),
    )

    db.add(case)
    await db.commit()
    await db.refresh(case)

    # 4. Audit trail logging
    await AuditService.log_event(
        db=db,
        action="CASE_INTAKE_CREATED",
        resource_type="TRIAGE_CASE",
        resource_id=case.synthetic_case_id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=(
            f"Case: {case.synthetic_case_id} | Queue: {case.queue_category.upper()} | "
            f"PatientID: {case.patient_id or 'Anonymous'} | Redacted: {was_redacted}"
        ),
    )

    return patient_case_response(case) if current_user.role == UserRole.PATIENT else _format_case_response(case)


@router.get("", response_model=List[CaseResponse])
@router.get("/", response_model=List[CaseResponse], include_in_schema=False)
async def list_cases(
    queue_category: Optional[str] = Query(None, description="urgent-review, priority, routine"),
    status_filter: Optional[str] = Query(None, description="awaiting_review, in_review, ready_for_doctor, approved, rejected, referred"),
    assigned_doctor_id: Optional[str] = Query(None, description="Filter by assigned clinician ID"),
    patient_id: Optional[str] = Query(None, description="Filter by patient record ID"),
    limit: int = Query(50, ge=1, le=100),
<<<<<<< HEAD
    current_user: Optional[User] = Depends(get_current_user_optional),
=======
    current_user: User = Depends(get_current_clinician),
>>>>>>> 3f0d7e13b81af3a543752df1631a7635a59ff0fc
    db: AsyncSession = Depends(get_db),
):
    """Retrieve prioritized queue of triage cases with backend role isolation."""
    stmt = select(TriageCase).where(TriageCase.is_deleted == False)

    if patient_id:
        stmt = stmt.where(TriageCase.patient_id == patient_id)

    if assigned_doctor_id:
        stmt = stmt.where(TriageCase.assigned_doctor_id == assigned_doctor_id)
    if queue_category:
        stmt = stmt.where(TriageCase.queue_category == queue_category)
    if status_filter:
        stmt = stmt.where(TriageCase.status == status_filter)

    # Sort: Most recently created first
    stmt = stmt.order_by(desc(TriageCase.created_at)).limit(limit)
    cases = (await db.execute(stmt)).scalars().all()

    return [_format_case_response(c) for c in cases]


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
<<<<<<< HEAD
    current_user: Optional[User] = Depends(get_current_user_optional),
=======
    current_user: User = Depends(get_current_clinician),
>>>>>>> 3f0d7e13b81af3a543752df1631a7635a59ff0fc
    db: AsyncSession = Depends(get_db),
):
    """Retrieve single case by ID or synthetic_case_id with patient isolation checks."""
    stmt = select(TriageCase).where(
        (TriageCase.id == case_id) | (TriageCase.synthetic_case_id == case_id),
        TriageCase.is_deleted == False,
    )
    case = (await db.execute(stmt)).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Triage case not found.")

    # Patient role check
    if current_user and current_user.role == UserRole.PATIENT:
        if case.patient_id and case.patient_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to another patient's triage case.",
            )

    return _format_case_response(case)


@router.post("/{case_id}/assign", response_model=CaseResponse)
async def assign_case(
    case_id: str,
    req: CaseAssignRequest,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Staff/Admin: Assign patient case to a doctor and department."""
    stmt = select(TriageCase).where(
        (TriageCase.id == case_id) | (TriageCase.synthetic_case_id == case_id),
        TriageCase.is_deleted == False,
    )
    case = (await db.execute(stmt)).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Triage case not found.")

    if req.assigned_doctor_id:
        case.assigned_doctor_id = req.assigned_doctor_id
    if req.assigned_doctor_name:
        case.assigned_doctor_name = req.assigned_doctor_name
    if req.assigned_department:
        case.assigned_department = req.assigned_department
    if req.priority_category:
        case.queue_category = req.priority_category
    if req.notes:
        existing_notes = case.reviewer_notes or ""
        case.reviewer_notes = f"{existing_notes}\n[Staff Routing]: {req.notes}".strip()

    case.status = "ready_for_doctor"
    await db.commit()
    await db.refresh(case)

    await AuditService.log_event(
        db=db,
        action="CASE_ASSIGNED",
        resource_type="TRIAGE_CASE",
        resource_id=case.synthetic_case_id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=(
            f"Assigned by {current_user.full_name} to Doctor: {case.assigned_doctor_name or case.assigned_doctor_id} "
            f"| Dept: {case.assigned_department}"
        ),
    )

    return _format_case_response(case)


@router.post("/{case_id}/verify-intake", response_model=CaseResponse)
async def verify_case_intake(
    case_id: str,
    req: CaseVerifyIntakeRequest,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Staff: Verify patient reported intake, record baseline vitals, and hand off to doctor queue."""
    stmt = select(TriageCase).where(
        (TriageCase.id == case_id) | (TriageCase.synthetic_case_id == case_id),
        TriageCase.is_deleted == False,
    )
    case = (await db.execute(stmt)).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Triage case not found.")

    case.intake_verified = req.verified
    if req.vitals:
        # Merge existing vitals if present
        existing_vitals = json.loads(case.vitals) if case.vitals else {}
        existing_vitals.update(req.vitals)
        case.vitals = json.dumps(existing_vitals)

    if req.staff_notes:
        existing_notes = case.reviewer_notes or ""
        case.reviewer_notes = f"{existing_notes}\n[Staff Verification]: {req.staff_notes}".strip()

    if req.route_to_doctor_id:
        case.assigned_doctor_id = req.route_to_doctor_id
    if req.route_to_doctor_name:
        case.assigned_doctor_name = req.route_to_doctor_name
    if req.route_to_department:
        case.assigned_department = req.route_to_department

    case.status = "ready_for_doctor"
    await db.commit()
    await db.refresh(case)

    await AuditService.log_event(
        db=db,
        action="CASE_INTAKE_VERIFIED",
        resource_type="TRIAGE_CASE",
        resource_id=case.synthetic_case_id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Intake verified by {current_user.full_name} ({current_user.role}). Status: ready_for_doctor",
    )

    return _format_case_response(case)


@router.delete("/{case_id}")
async def delete_case_data(
    case_id: str,
    request: Request,
<<<<<<< HEAD
    current_user: User = Depends(get_current_clinician),
=======
    current_user: User = Depends(get_current_doctor),
>>>>>>> 3f0d7e13b81af3a543752df1631a7635a59ff0fc
    db: AsyncSession = Depends(get_db),
):
    """Data retention: delete temporary media and anonymize/purge case record."""
    stmt = select(TriageCase).where(
        (TriageCase.id == case_id) | (TriageCase.synthetic_case_id == case_id)
    )
    case = (await db.execute(stmt)).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    case.is_deleted = True
    case.raw_symptoms = "[DELETED PER RETENTION POLICY]"
    case.speech_transcript = None
    case.report_ocr_data = None
    case.status = "deleted"
    case.normalized_symptoms = None
    case.context_notes = None
    case.triage_summary = None
    case.missing_information = None
    case.follow_up_questions = None
    case.risk_signals = None
    case.timeline_events = None
    case.report_filename = None
    case.image_reference = None
    case.referral_note = None
    case.reviewer_notes = None
    await db.commit()

    await AuditService.log_event(
        db=db,
        action="CASE_DATA_DELETED",
        resource_type="TRIAGE_CASE",
        resource_id=case.synthetic_case_id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Permanent deletion of temporary media & symptoms for {case.synthetic_case_id}",
    )

    return {
        "status": "success",
        "case_id": case.synthetic_case_id,
        "message": "Temporary media and intake symptoms purged successfully per privacy policy.",
    }


def _format_case_response(c: TriageCase) -> CaseResponse:
    """Helper to deserialize JSON fields and compute wait time."""
    now = datetime.now(timezone.utc)
    created = c.created_at.replace(tzinfo=timezone.utc) if c.created_at.tzinfo is None else c.created_at
    waiting_mins = max(0, int((now - created).total_seconds() / 60))

    return CaseResponse(
        id=c.id,
        synthetic_case_id=c.synthetic_case_id,
        patient_id=c.patient_id,
        language=c.language,
        facility_type=c.facility_type,
        visit_type=c.visit_type,
        status=c.status,
        queue_category=c.queue_category,
        queue_reason=c.queue_reason,
        consent_status=c.consent_status,
        approximate_age=c.approximate_age,
        gender=c.gender,
        context_notes=c.context_notes,
        raw_symptoms=c.raw_symptoms,
        normalized_symptoms=c.normalized_symptoms,
        speech_transcript=c.speech_transcript,
        detected_language=c.detected_language,
        report_filename=c.report_filename,
        report_ocr_data=json.loads(c.report_ocr_data) if c.report_ocr_data else None,
        image_reference=c.image_reference,
        triage_summary=json.loads(c.triage_summary) if c.triage_summary else None,
        missing_information=json.loads(c.missing_information) if c.missing_information else None,
        follow_up_questions=json.loads(c.follow_up_questions) if c.follow_up_questions else None,
        risk_signals=json.loads(c.risk_signals) if c.risk_signals else None,
        timeline_events=json.loads(c.timeline_events) if c.timeline_events else None,
        vitals=json.loads(c.vitals) if c.vitals else None,
        intake_verified=c.intake_verified,
        assigned_doctor_id=c.assigned_doctor_id,
        assigned_doctor_name=c.assigned_doctor_name,
        assigned_department=c.assigned_department,
        reviewer_notes=c.reviewer_notes,
        reviewer_id=c.reviewer_id,
        reviewer_name=c.reviewer_name,
        reviewed_at=c.reviewed_at,
        approved_at=c.approved_at,
        created_at=c.created_at,
        updated_at=c.updated_at,
        waiting_minutes=waiting_mins,
        is_deleted=c.is_deleted,
    )