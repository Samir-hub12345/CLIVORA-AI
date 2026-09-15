import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_clinician, get_client_ip
from app.db.session import get_db
from app.models.consultation import Consultation, TriageLevel
from app.models.user import User
from app.schemas.ai import (
    TriageRequest,
    TriageResponse,
    SOAPGenerateRequest,
    SOAPGenerateResponse,
)
from app.services.ai.gemini_service import ai_service
from app.services.audit import AuditService

router = APIRouter()


@router.post("/triage", response_model=TriageResponse)
async def perform_clinical_triage(
    req: TriageRequest,
    request: Request,
    consultation_id: Optional[str] = None,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Execute AI clinical decision support triage, emergency red flag detection, and differential diagnosis."""
    # Analyze with Gemini (or fallback rule engine)
    result = await ai_service.analyze_triage(req)

    # If linked to an active consultation, persist the assessment
    if consultation_id:
        stmt = select(Consultation).where(Consultation.id == consultation_id)
        consultation = (await db.execute(stmt)).scalar_one_or_none()
        if consultation:
            urgency_map = {
                "CRITICAL": TriageLevel.CRITICAL,
                "URGENT": TriageLevel.URGENT,
                "ROUTINE": TriageLevel.ROUTINE,
                "LOW": TriageLevel.LOW,
            }
            consultation.triage_level = urgency_map.get(result.urgency_level, TriageLevel.UNASSIGNED)
            consultation.ai_differential_diagnosis = json.dumps(
                [d.model_dump() for d in result.differential_diagnoses]
            )
            consultation.ai_generated_summary = result.clinical_reasoning
            await db.commit()

    await AuditService.log_event(
        db=db,
        action="AI_TRIAGE_INFERENCE",
        resource_type="TRIAGE_DECISION_SUPPORT",
        resource_id=consultation_id or req.patient_id,
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=(
            f"Triage Urgency: {result.urgency_level} | "
            f"Chief Complaint: {req.chief_complaint} | "
            f"Engine: {result.source}"
        ),
    )

    return result


@router.post("/soap-summary", response_model=SOAPGenerateResponse)
async def generate_soap_notes(
    req: SOAPGenerateRequest,
    request: Request,
    current_user: User = Depends(get_current_clinician),
    db: AsyncSession = Depends(get_db),
):
    """Synthesize clinical encounter notes or patient transcripts into formatted SOAP documentation."""
    result = await ai_service.generate_soap_notes(req)

    await AuditService.log_event(
        db=db,
        action="AI_SOAP_SYNTHESIS",
        resource_type="SOAP_GENERATION",
        user=current_user,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        details=f"Synthesized SOAP draft for complaint: {req.chief_complaint}",
    )

    return result
