import json
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.case import TriageCase
from app.models.user import User
from app.core.deps import get_current_user, get_client_ip
from app.schemas.case import (
    CaseCreateRequest,
    CaseResponse,
    StructuredTriageNote,
)
from app.services.anonymizer import anonymizer
from app.services.ai.gemini_service import ai_service
from app.services.audit import AuditService

logger = logging.getLogger("clinova")
router = APIRouter()


@router.post("/", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_triage_case(
    req: CaseCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Create a new multimodal triage case with anonymization and structured decision support."""
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

    # 3. Create case record
    case = TriageCase(
        synthetic_case_id=synthetic_case_id,
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
        user=None,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=(
            f"Case: {case.synthetic_case_id} | Queue: {case.queue_category.upper()} | "
            f"Lang: {case.language} | Redacted: {was_redacted}"
        ),
    )

    return _format_case_response(case)


@router.get("/", response_model=List[CaseResponse])
async def list_cases(
    queue_category: Optional[str] = Query(None, description="urgent-review, priority, routine"),
    status_filter: Optional[str] = Query(None, description="awaiting_review, in_review, approved, rejected, referred"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve prioritized queue of triage cases."""
    stmt = select(TriageCase).where(TriageCase.is_deleted == False)

    if queue_category:
        stmt = stmt.where(TriageCase.queue_category == queue_category)
    if status_filter:
        stmt = stmt.where(TriageCase.status == status_filter)

    # Sort: Urgent first, then priority, then routine, then by creation date
    stmt = stmt.order_by(desc(TriageCase.created_at)).limit(limit)
    cases = (await db.execute(stmt)).scalars().all()

    return [_format_case_response(c) for c in cases]


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve single case by ID or synthetic_case_id."""
    stmt = select(TriageCase).where(
        (TriageCase.id == case_id) | (TriageCase.synthetic_case_id == case_id),
        TriageCase.is_deleted == False,
    )
    case = (await db.execute(stmt)).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Triage case not found.")

    return _format_case_response(case)


@router.delete("/{case_id}")
async def delete_case_data(
    case_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Data retention mockup: delete temporary media and anonymize/purge case record."""
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
    await db.commit()

    await AuditService.log_event(
        db=db,
        action="CASE_DATA_DELETED",
        resource_type="TRIAGE_CASE",
        resource_id=case.synthetic_case_id,
        user=None,
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
