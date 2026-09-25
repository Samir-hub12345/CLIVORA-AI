import json
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.case import TriageCase
from app.models.user import User, UserRole
from app.core.deps import get_client_ip, get_current_clinician, get_current_doctor, get_current_user_optional
from app.schemas.case import (
    CaseReviewActionRequest,
    CaseResponse,
    ReferralNoteResponse,
    TimelineEventSchema,
    OCRFieldSchema,
    RiskSignalSchema,
)
from app.services.audit import AuditService

logger = logging.getLogger("clinova")
router = APIRouter()


@router.post("/{case_id}/action", response_model=CaseResponse)
async def perform_review_action(
    case_id: str,
    req: CaseReviewActionRequest,
    request: Request,
<<<<<<< HEAD
    current_user: User = Depends(get_current_clinician),
=======
    current_user: User = Depends(get_current_doctor),
>>>>>>> 3f0d7e13b81af3a543752df1631a7635a59ff0fc
    db: AsyncSession = Depends(get_db),
):
    """Executes human-in-the-loop review action: approve, edit, reject, or escalate."""
    stmt = select(TriageCase).where(
        (TriageCase.id == case_id) | (TriageCase.synthetic_case_id == case_id),
        TriageCase.is_deleted.is_(False),
    )
    case = (await db.execute(stmt)).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Triage case not found.")

    reviewer_name = current_user.full_name
    case.reviewer_id = current_user.id
    case.reviewer_name = reviewer_name
    action = req.action.lower()
    now = datetime.now(timezone.utc)

    if action in ("approve", "edit", "escalate"):
        if req.edited_summary:
            case.normalized_symptoms = req.edited_summary
        if req.confirmed_queue_category:
            case.queue_category = req.confirmed_queue_category
        if req.verified_ocr_fields is not None:
            case.report_ocr_data = json.dumps([field.model_dump() for field in req.verified_ocr_fields])

    if action == "approve":
        case.status = "approved"
        case.approved_at = now
        case.reviewed_at = now
        if req.reviewer_notes:
            case.reviewer_notes = req.reviewer_notes

    elif action == "edit":
        case.status = "in_review"
        case.approved_at = None
        case.reviewed_at = now
        case.reviewer_name = reviewer_name
        if req.edited_summary:
            case.normalized_symptoms = req.edited_summary
        if req.confirmed_queue_category:
            case.queue_category = req.confirmed_queue_category
        if req.reviewer_notes:
            case.reviewer_notes = req.reviewer_notes

    elif action == "reject":
        case.status = "rejected"
        case.approved_at = None
        case.reviewed_at = now
        case.reviewer_name = reviewer_name
        case.reviewer_notes = req.reviewer_notes or "Rejected by reviewer: requires re-intake or manual physician exam."

    elif action == "escalate":
        case.status = "referred"
        case.reviewed_at = now
        case.reviewer_name = reviewer_name
        if req.confirmed_queue_category:
            case.queue_category = req.confirmed_queue_category

        # Generate referral support note
        timeline_list = json.loads(case.timeline_events) if case.timeline_events else []
        ocr_list = json.loads(case.report_ocr_data) if case.report_ocr_data else []
        signals_list = json.loads(case.risk_signals) if case.risk_signals else []
        questions_list = json.loads(case.follow_up_questions) if case.follow_up_questions else []

        ref_note = {
            "case_id": case.id,
            "synthetic_case_id": case.synthetic_case_id,
            "facility": case.facility_type,
            "visit_type": case.visit_type,
            "patient_reported_symptoms": case.raw_symptoms or "None recorded",
            "timeline": timeline_list,
            "available_report_data": ocr_list,
            "reviewer_confirmed_summary": req.edited_summary or case.normalized_symptoms or "Pending",
            "outstanding_questions": questions_list,
            "review_signals": signals_list,
            "reviewer_reason": req.reviewer_notes or "Clinical referral prepared for secondary healthcare facility review.",
            "reviewer_name": reviewer_name,
            "reviewer_role": current_user.role.value,
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "footer_disclaimer": (
                "AI-assisted organization of information. Not a diagnosis or treatment recommendation. "
                "Final referral decision is made by qualified healthcare staff."
            ),
        }
        case.referral_note = json.dumps(ref_note)

    else:
        raise HTTPException(status_code=400, detail=f"Invalid action: {req.action}")

    await db.commit()

    await AuditService.log_event(
        db=db,
        action=f"REVIEW_ACTION_{action.upper()}",
        resource_type="TRIAGE_CASE",
        resource_id=case.synthetic_case_id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Reviewer: {reviewer_name} ({current_user.role.value}) | Action: {action.upper()} | Case: {case.synthetic_case_id}",
    )

    from app.api.v1.endpoints.cases import _format_case_response
    return _format_case_response(case)


@router.get("/{case_id}/referral", response_model=ReferralNoteResponse)
async def get_referral_note(
    case_id: str,
<<<<<<< HEAD
    current_user: Optional[User] = Depends(get_current_user_optional),
=======
    current_user: User = Depends(get_current_clinician),
>>>>>>> 3f0d7e13b81af3a543752df1631a7635a59ff0fc
    db: AsyncSession = Depends(get_db),
):
    """Retrieve structured referral note for export and printing."""
    stmt = select(TriageCase).where(
        (TriageCase.id == case_id) | (TriageCase.synthetic_case_id == case_id),
        TriageCase.is_deleted.is_(False),
    )
    case = (await db.execute(stmt)).scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    if not case.referral_note:
        # Generate default referral draft if not already generated
        now = datetime.now(timezone.utc)
        timeline_list = json.loads(case.timeline_events) if case.timeline_events else []
        ocr_list = json.loads(case.report_ocr_data) if case.report_ocr_data else []
        signals_list = json.loads(case.risk_signals) if case.risk_signals else []
        questions_list = json.loads(case.follow_up_questions) if case.follow_up_questions else []

        ref_dict = {
            "case_id": case.id,
            "synthetic_case_id": case.synthetic_case_id,
            "facility": case.facility_type,
            "visit_type": case.visit_type,
            "patient_reported_symptoms": case.raw_symptoms or "None recorded",
            "timeline": [TimelineEventSchema(**t) for t in timeline_list],
            "available_report_data": [OCRFieldSchema(**o) for o in ocr_list],
            "reviewer_confirmed_summary": case.normalized_symptoms or "Triage support summary organized for physician.",
            "outstanding_questions": questions_list,
            "review_signals": [RiskSignalSchema(**s) for s in signals_list],
            "reviewer_reason": case.reviewer_notes or "Prepared for institutional referral review.",
            "reviewer_name": case.reviewer_name or "Dr. S. Chen, Medical Officer",
            "reviewer_role": "Medical Officer",
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "footer_disclaimer": (
                "AI-assisted organization of information. Not a diagnosis or treatment recommendation. "
                "Final referral decision is made by qualified healthcare staff."
            ),
        }
        return ReferralNoteResponse(**ref_dict)

    data = json.loads(case.referral_note)
    return ReferralNoteResponse(
        case_id=data["case_id"],
        synthetic_case_id=data["synthetic_case_id"],
        facility=data["facility"],
        visit_type=data["visit_type"],
        patient_reported_symptoms=data["patient_reported_symptoms"],
        timeline=[TimelineEventSchema(**t) for t in data["timeline"]],
        available_report_data=[OCRFieldSchema(**o) for o in data["available_report_data"]],
        reviewer_confirmed_summary=data["reviewer_confirmed_summary"],
        outstanding_questions=data["outstanding_questions"],
        review_signals=[RiskSignalSchema(**s) for s in data["review_signals"]],
        reviewer_reason=data["reviewer_reason"],
        reviewer_name=data["reviewer_name"],
        reviewer_role=data["reviewer_role"],
        timestamp=data["timestamp"],
        footer_disclaimer=data.get(
            "footer_disclaimer",
            "AI-assisted organization of information. Not a diagnosis or treatment recommendation.",
        ),
    )