from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_admin
from app.db.session import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.consultation import Consultation
from app.models.case import TriageCase
from app.models.audit import AuditLog
from app.schemas.portal import AdminOverview
from app.schemas.user import UserResponse
from app.services.retention import RetentionService

router = APIRouter(dependencies=[Depends(get_current_admin)])


@router.get("/overview", response_model=AdminOverview)
async def overview(db: AsyncSession = Depends(get_db)):
    counts = {}
    for key, model in (("users", User), ("patients", Patient), ("consultations", Consultation), ("audit_records", AuditLog)):
        counts[key] = (await db.execute(select(func.count()).select_from(model))).scalar_one()
    counts["cases"] = (await db.execute(select(func.count()).select_from(TriageCase).where(TriageCase.is_deleted.is_(False)))).scalar_one()
    counts["awaiting_review"] = (await db.execute(select(func.count()).select_from(TriageCase).where(TriageCase.is_deleted.is_(False), TriageCase.status == "awaiting_review"))).scalar_one()
    return AdminOverview(**counts)


@router.get("/users", response_model=list[UserResponse])
async def users(db: AsyncSession = Depends(get_db)):
    return (await db.execute(select(User).order_by(User.full_name))).scalars().all()


@router.post("/retention/sweep")
async def trigger_retention_sweep(
    dry_run: bool = True,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Executes a HIPAA-compliant data retention and disposal lifecycle sweep."""
    report = await RetentionService.run_retention_sweep(
        db=db,
        dry_run=dry_run,
        triggered_by_user_id=current_admin.id,
        triggered_by_email=current_admin.email,
    )
    return report.to_dict()