from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_current_admin
from app.db.session import get_db
from app.models.facility import Facility
from app.models.user import User
from app.schemas.facility import FacilityCreate, FacilityResponse, FacilityListResponse

router = APIRouter()


@router.get("", response_model=FacilityListResponse)
async def list_facilities(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List registered healthcare facilities / tenants."""
    stmt = select(Facility).where(Facility.is_active == True)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    res = await db.execute(stmt)
    facilities = res.scalars().all()
    return FacilityListResponse(total=total, items=list(facilities))


@router.post("", response_model=FacilityResponse, status_code=status.HTTP_201_CREATED)
async def create_facility(
    facility_in: FacilityCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Admin only: Register a new healthcare facility / clinic node."""
    stmt = select(Facility).where(Facility.facility_code == facility_in.facility_code)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Facility with code '{facility_in.facility_code}' already exists.",
        )

    facility = Facility(**facility_in.model_dump())
    db.add(facility)
    await db.commit()
    await db.refresh(facility)
    return facility


@router.get("/{facility_id}", response_model=FacilityResponse)
async def get_facility(
    facility_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve details for a specific healthcare facility."""
    stmt = select(Facility).where(
        (Facility.id == facility_id) | (Facility.facility_code == facility_id)
    )
    facility = (await db.execute(stmt)).scalar_one_or_none()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found.")
    return facility
