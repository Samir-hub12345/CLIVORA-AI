from fastapi import HTTPException
from app.models.user import User, UserRole
from app.models.consultation import Consultation


def check_encounter_access(user: User, encounter: Consultation):
    # This prototype has one clinical team. Nurses can read team encounters;
    # doctors can read/write only their own encounters. Patients use /portal.
    if user.role == UserRole.NURSE:
        return
    if user.role == UserRole.DOCTOR and encounter.doctor_id == user.id:
        return
    raise HTTPException(status_code=403, detail="You do not have access to this encounter.")
