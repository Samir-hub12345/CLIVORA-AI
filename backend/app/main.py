import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import engine, async_session_factory
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.consultation import Consultation, ConsultationStatus, TriageLevel

logger = logging.getLogger("clinova")


async def seed_initial_data():
    """Seed initial clinical demo accounts and patients if database is fresh."""
    async with async_session_factory() as db:
        # Check if users exist
        res = await db.execute(select(User).limit(1))
        if res.scalar_one_or_none() is not None:
            return  # Already seeded

        logger.info("Fresh database detected. Seeding Clinova AI demo data...")

        # 1. Demo Users
        doctor = User(
            email="doctor@clinova.ai",
            hashed_password=get_password_hash("ClinovaDoctor2026!"),
            full_name="Dr. Sarah Chen, MD",
            role=UserRole.DOCTOR,
            is_active=True,
        )
        patient_user = User(
            email="patient@clinova.ai",
            hashed_password=get_password_hash("ClinovaPatient2026!"),
            full_name="James Miller",
            role=UserRole.PATIENT,
            is_active=True,
        )
        admin = User(
            email="admin@clinova.ai",
            hashed_password=get_password_hash("ClinovaAdmin2026!"),
            full_name="Clinical Administrator",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add_all([doctor, patient_user, admin])
        await db.flush()

        # 2. Demo Patients
        patient1 = Patient(
            mrn="CLN-2026-10482",
            first_name="James",
            last_name="Miller",
            date_of_birth="1982-06-14",
            gender="Male",
            blood_group="O+",
            phone="+1 (555) 234-5678",
            email="patient@clinova.ai",
            emergency_contact="Sarah Miller (Spouse): +1 (555) 234-5679",
            allergies="Penicillin (Anaphylaxis)",
            current_medications="Lisinopril 10mg daily, Atorvastatin 20mg daily",
            medical_history="Hypertension (dx 2018), Hyperlipidemia, Former smoker (quit 2021)",
        )
        patient2 = Patient(
            mrn="CLN-2026-21890",
            first_name="Elena",
            last_name="Rostova",
            date_of_birth="1995-11-03",
            gender="Female",
            blood_group="A-",
            phone="+1 (555) 876-5432",
            email="elena.rostova@example.com",
            emergency_contact="Dmitri Rostov (Brother): +1 (555) 876-5433",
            allergies="Sulfa drugs (Rash)",
            current_medications="Albuterol inhaler PRN",
            medical_history="Mild intermittent asthma since childhood",
        )
        patient3 = Patient(
            mrn="CLN-2026-34901",
            first_name="Marcus",
            last_name="Vance",
            date_of_birth="1960-03-22",
            gender="Male",
            blood_group="B+",
            phone="+1 (555) 432-1098",
            email="marcus.vance@example.com",
            emergency_contact="Patricia Vance: +1 (555) 432-1099",
            allergies="None known",
            current_medications="Metformin 500mg BID, Amlodipine 5mg",
            medical_history="Type 2 Diabetes Mellitus (dx 2015), Stage 1 Hypertension",
        )
        db.add_all([patient1, patient2, patient3])
        await db.flush()

        # 3. Demo Consultation
        consultation = Consultation(
            patient_id=patient1.id,
            doctor_id=doctor.id,
            scheduled_at=datetime.now(timezone.utc),
            status=ConsultationStatus.COMPLETED,
            triage_level=TriageLevel.ROUTINE,
            chief_complaint="Follow-up on blood pressure control and routine medication review",
            vitals_data='{"blood_pressure_systolic":132,"blood_pressure_diastolic":84,"heart_rate":72,"respiratory_rate":16,"oxygen_saturation":98,"temperature":36.8}',
            subjective="Patient reports feeling well overall. Complies with daily Lisinopril and Atorvastatin. Denies chest pain, shortness of breath, palpitations, or lightheadedness.",
            objective="BP: 132/84 mmHg, HR: 72 bpm regular, SpO2: 98% room air, Temp: 36.8C. Cardiovascular: S1/S2 present, no murmurs. Lungs: Clear to auscultation bilaterally. No peripheral edema.",
            assessment="Essential Hypertension, stable on current monotherapy. Hyperlipidemia, controlled.",
            plan="1. Continue Lisinopril 10mg PO daily.\n2. Repeat basic metabolic panel and lipid panel in 6 months.\n3. Return to clinic in 6 months or sooner if symptomatic.",
            ai_generated_summary="Routine hypertensive follow-up with good medication compliance and stable physiological vitals.",
        )
        db.add(consultation)
        await db.commit()
        logger.info("Clinova AI demo data seeded successfully.")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan manager to ensure database tables and initial seeds exist."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await seed_initial_data()
    except Exception as e:
        logger.error(f"Error during database initialization/seeding: {e}", exc_info=True)

    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Next-generation healthcare intelligence and clinical decision support API.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount API routers
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint welcoming clients."""
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "version": "0.1.0",
        "status": "online",
    }
