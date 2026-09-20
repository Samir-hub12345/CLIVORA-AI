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