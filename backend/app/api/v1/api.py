from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, patients, consultations, ai_assist, audit, cases, intake, review

api_router = APIRouter()

# Register v1 routes
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients EHR"])
api_router.include_router(consultations.router, prefix="/consultations", tags=["Consultations & Encounters"])
api_router.include_router(ai_assist.router, prefix="/ai", tags=["AI Clinical Decision Support"])
api_router.include_router(audit.router, prefix="/audit-logs", tags=["Audit Trail"])

# PS03 Triage, Multimodal Intake & Review Workflows
api_router.include_router(cases.router, prefix="/cases", tags=["Triage Cases & Queue"])
api_router.include_router(intake.router, prefix="/intake", tags=["Multimodal Intake"])
api_router.include_router(review.router, prefix="/review", tags=["Reviewer & Referral"])
