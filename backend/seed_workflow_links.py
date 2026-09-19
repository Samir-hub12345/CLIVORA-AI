import asyncio
from sqlalchemy import select
from app.db.session import async_session_factory
from app.models.user import User, UserRole
from app.models.case import TriageCase

async def link_seeds():
    async with async_session_factory() as db:
        doctor_res = await db.execute(select(User).where(User.role == UserRole.DOCTOR))
        doctor = doctor_res.scalars().first()
        
        patient_res = await db.execute(select(User).where(User.role == UserRole.PATIENT))
        patient = patient_res.scalars().first()
        
        if not doctor or not patient:
            print("Doctor or Patient user not found.")
            return

        cases_res = await db.execute(select(TriageCase))
        cases = cases_res.scalars().all()
        
        for c in cases:
            # Associate patient
            if c.synthetic_case_id in ["CLV-DEMO-001", "CLV-DEMO-003", "CLV-DEMO-006"]:
                c.patient_id = patient.id
            
            # Associate assigned doctor
            if c.synthetic_case_id in ["CLV-DEMO-001", "CLV-DEMO-002", "CLV-DEMO-005"]:
                c.assigned_doctor_id = doctor.id
                c.assigned_doctor_name = doctor.full_name
                c.assigned_department = "General Medicine" if c.synthetic_case_id != "CLV-DEMO-005" else "Cardiology"
                c.intake_verified = True
            
            if not c.vitals:
                c.vitals = '{"blood_pressure": "124/82", "heart_rate": "76", "oxygen_saturation": "98", "temperature": "37.1"}'

        await db.commit()
        print(f"Successfully updated {len(cases)} seed cases with role workflow relationships.")

if __name__ == "__main__":
    asyncio.run(link_seeds())
