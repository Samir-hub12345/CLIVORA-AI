from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, patients, consultations, ai_assist, audit, cases, intake, review
from app.api.v1.endpoints import portal, admin
from app.api.v1.endpoints import (
    health,
    auth,
    patients,
    consultations,
    ai_assist,
    audit,
    cases,
    intake,
    review,
    documents,
    jobs,
    facilities,
    encounters,
    clinical,
)

api_router = APIRouter()
api_router.include_router(portal.router, prefix="/portal", tags=["Patient Portal"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administration"])

# Core Foundation & EHR
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(facilities.router, prefix="/facilities", tags=["Facilities & Multi-Tenant"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients EHR"])
api_router.include_router(consultations.router, prefix="/consultations", tags=["Consultations"])
api_router.include_router(encounters.router, prefix="/encounters", tags=["Clinical Encounters"])
api_router.include_router(clinical.router, prefix="/clinical", tags=["Clinical Records & Observations"])
api_router.include_router(documents.router, prefix="/documents", tags=["Medical Documents & Object Storage"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Background Tasks & Worker Queue"])

# Clinical Decision Support & Audit
api_router.include_router(ai_assist.router, prefix="/ai", tags=["AI Clinical Decision Support"])
api_router.include_router(audit.router, prefix="/audit-logs", tags=["Audit Trail"])

# Multimodal Intake & Review Workflows
api_router.include_router(cases.router, prefix="/cases", tags=["Triage Cases & Queue"])
api_router.include_router(intake.router, prefix="/intake", tags=["Multimodal Intake"])
api_router.include_router(review.router, prefix="/review", tags=["Reviewer & Referral"])
