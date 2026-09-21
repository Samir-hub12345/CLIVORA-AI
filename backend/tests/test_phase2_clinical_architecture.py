import pytest
import time
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete, func

from app.main import app
from app.db import session as session_module
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.facility import Facility
from app.models.patient import Patient
from app.models.identifier import PatientIdentifier, IdentifierType
from app.models.encounter import Encounter, EncounterType, EncounterStatus
from app.models.observation import ClinicalObservation, ObservationType, ObservationSource, VerificationStatus
from app.models.allergy import Allergy, AllergySeverity, AllergyStatus
from app.models.medication import Medication, MedicationType, MedicationStatus
from app.models.diagnosis import Diagnosis, DiagnosisType, DiagnosisStatus
from app.models.note import ClinicalNote, NoteType, NoteStatus
from app.models.referral import Referral, ReferralPriority, ReferralStatus


@pytest.mark.asyncio
async def test_clinical_encounters_lifecycle():
    """Verify encounter creation, retrieval, and status transitions."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as doctor
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        assert doc_login.status_code == 200
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        # 2. Get a patient
        pat_list = await ac.get("/api/v1/patients", headers=doc_headers)
        assert pat_list.status_code == 200
        patients = pat_list.json()["items"]
        assert len(patients) > 0
        patient_id = patients[0]["id"]

        # 3. Create Encounter
        encounter_data = {
            "patient_id": patient_id,
            "encounter_type": EncounterType.OUTPATIENT.value,
            "status": EncounterStatus.PLANNED.value,
            "reason_for_visit": "Annual comprehensive cardiovascular evaluation and medication review.",
            "clinical_summary": "Cardiology evaluation and follow-up",
        }
        create_res = await ac.post("/api/v1/encounters", json=encounter_data, headers=doc_headers)
        assert create_res.status_code == 201
        encounter = create_res.json()
        assert encounter["status"] == EncounterStatus.PLANNED.value
        assert encounter["patient_id"] == patient_id
        encounter_id = encounter["id"]

        # 4. Transition Encounter: PLANNED -> IN_PROGRESS
        update_res = await ac.patch(
            f"/api/v1/encounters/{encounter_id}",
            json={"status": EncounterStatus.IN_PROGRESS.value},
            headers=doc_headers,
        )
        assert update_res.status_code == 200
        assert update_res.json()["status"] == EncounterStatus.IN_PROGRESS.value

        # 5. Transition Encounter: IN_PROGRESS -> COMPLETED with discharge summary
        complete_res = await ac.patch(
            f"/api/v1/encounters/{encounter_id}",
            json={
                "status": EncounterStatus.COMPLETED.value,
                "clinical_summary": "Discharged home with routine follow-up in 3 months.",
            },
            headers=doc_headers,
        )
        assert complete_res.status_code == 200
        assert complete_res.json()["status"] == EncounterStatus.COMPLETED.value
        assert "Discharged" in complete_res.json()["clinical_summary"]

        # 6. Query encounters filtered by patient_id
        list_res = await ac.get(f"/api/v1/encounters?patient_id={patient_id}", headers=doc_headers)
        assert list_res.status_code == 200
        items = list_res.json()["items"]
        assert any(e["id"] == encounter_id for e in items)


@pytest.mark.asyncio
async def test_clinical_observations_and_vitals():
    """Verify structured clinical observations recording and verification."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        pat_list = await ac.get("/api/v1/patients", headers=doc_headers)
        patient_id = pat_list.json()["items"][0]["id"]

        # Record Blood Pressure Systolic
        bp_sys = {
            "patient_id": patient_id,
            "observation_type": ObservationType.BLOOD_PRESSURE_SYSTOLIC.value,
            "value_numeric": 128.0,
            "unit": "mmHg",
            "source": ObservationSource.DEVICE_MEASURED.value,
        }
        res_sys = await ac.post("/api/v1/clinical/observations", json=bp_sys, headers=doc_headers)
        assert res_sys.status_code == 201
        sys_id = res_sys.json()["id"]

        # Record Heart Rate
        hr = {
            "patient_id": patient_id,
            "observation_type": ObservationType.HEART_RATE.value,
            "value_numeric": 72.0,
            "unit": "bpm",
            "source": ObservationSource.HUMAN_ENTERED.value,
        }
        res_hr = await ac.post("/api/v1/clinical/observations", json=hr, headers=doc_headers)
        assert res_hr.status_code == 201

        # Verify observation
        verify_res = await ac.patch(
            f"/api/v1/clinical/observations/{sys_id}/verify",
            headers=doc_headers,
        )
        assert verify_res.status_code == 200
        assert verify_res.json()["verification_status"] == VerificationStatus.VERIFIED.value
        assert verify_res.json()["verified_by"] is not None

        # Query patient observations
        query_res = await ac.get(f"/api/v1/clinical/patients/{patient_id}/observations", headers=doc_headers)
        assert query_res.status_code == 200
        assert len(query_res.json()) >= 2


@pytest.mark.asyncio
async def test_allergies_and_intolerances():
    """Verify recording and querying of patient allergies."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        pat_list = await ac.get("/api/v1/patients", headers=doc_headers)
        patient_id = pat_list.json()["items"][0]["id"]

        allergy_payload = {
            "patient_id": patient_id,
            "substance": "Amoxicillin / Penicillin Class",
            "reaction": "Diffuse urticaria, facial angioedema, respiratory wheezing",
            "severity": AllergySeverity.SEVERE.value,
            "status": AllergyStatus.ACTIVE.value,
        }
        create_res = await ac.post("/api/v1/clinical/allergies", json=allergy_payload, headers=doc_headers)
        assert create_res.status_code == 201
        created_allergy = create_res.json()
        assert created_allergy["substance"] == "Amoxicillin / Penicillin Class"
        assert created_allergy["severity"] == AllergySeverity.SEVERE.value

        # Query allergies for patient
        get_res = await ac.get(f"/api/v1/clinical/patients/{patient_id}/allergies", headers=doc_headers)
        assert get_res.status_code == 200
        allergies = get_res.json()
        assert any(a["id"] == created_allergy["id"] for a in allergies)


@pytest.mark.asyncio
async def test_medication_regimens():
    """Verify medication prescription and status management."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        pat_list = await ac.get("/api/v1/patients", headers=doc_headers)
        patient_id = pat_list.json()["items"][0]["id"]

        med_payload = {
            "patient_id": patient_id,
            "medication_name": "Metformin Hydrochloride",
            "dosage": "500 mg",
            "frequency": "Twice daily with meals",
            "route": "Oral",
            "medication_type": MedicationType.CURRENT.value,
            "status": MedicationStatus.ACTIVE.value,
            "instructions": "Take with breakfast and dinner",
        }
        res_med = await ac.post("/api/v1/clinical/medications", json=med_payload, headers=doc_headers)
        assert res_med.status_code == 201
        med_id = res_med.json()["id"]

        # Query patient medications
        res_list = await ac.get(f"/api/v1/clinical/patients/{patient_id}/medications", headers=doc_headers)
        assert res_list.status_code == 200
        assert any(m["id"] == med_id for m in res_list.json())


@pytest.mark.asyncio
async def test_diagnoses_ai_attribution_and_clinician_verification():
    """Verify AI-generated diagnostic attribution and clinician confirmation workflow."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        pat_list = await ac.get("/api/v1/patients", headers=doc_headers)
        patient_id = pat_list.json()["items"][0]["id"]

        # 1. Post AI-suggested diagnosis
        ai_diag_payload = {
            "patient_id": patient_id,
            "description": "Acute Bronchitis, unspecified (ICD-10 J20.9)",
            "code": "J20.9",
            "diagnosis_type": DiagnosisType.AI_SUGGESTION.value,
            "status": DiagnosisStatus.ACTIVE.value,
            "ai_confidence_score": 0.88,
        }
        create_res = await ac.post("/api/v1/clinical/diagnoses", json=ai_diag_payload, headers=doc_headers)
        assert create_res.status_code == 201
        diag_data = create_res.json()
        assert diag_data["ai_confidence_score"] == 0.88
        assert diag_data["verification_status"] == "unverified"
        assert diag_data["verified_by"] is None
        diag_id = diag_data["id"]

        # 2. Clinician reviews and confirms AI diagnosis
        verify_res = await ac.patch(
            f"/api/v1/clinical/diagnoses/{diag_id}/verify",
            headers=doc_headers,
        )
        assert verify_res.status_code == 200
        verified_data = verify_res.json()
        assert verified_data["verification_status"] == "verified"
        assert verified_data["verified_by"] is not None
        assert verified_data["verified_at"] is not None


@pytest.mark.asyncio
async def test_clinical_notes_immutability_and_amendments():
    """Verify clinical notes versioning, immutability, and amendment chain."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        pat_list = await ac.get("/api/v1/patients", headers=doc_headers)
        patient_id = pat_list.json()["items"][0]["id"]

        # 1. Create original note (Version 1)
        v1_payload = {
            "patient_id": patient_id,
            "note_type": NoteType.SOAP.value,
            "title": "Initial Outpatient Cardiology Consultation",
            "content": "Subjective: Chest discomfort on exertion. Objective: Normal sinus rhythm on ECG. Assessment: Atypical angina. Plan: Stress test.",
            "is_signed": True,
        }
        v1_res = await ac.post("/api/v1/clinical/notes", json=v1_payload, headers=doc_headers)
        assert v1_res.status_code == 201
        v1_note = v1_res.json()
        assert v1_note["version"] == 1
        assert v1_note["parent_note_id"] is None
        v1_id = v1_note["id"]

        # 2. Add an Addendum / Amendment (Version 2 pointing to v1)
        v2_payload = {
            "amendment_reason": "Patient provided additional medication history",
            "new_content": "Amended: Patient reports taking sublingual nitroglycerin with symptom relief. Exercise tolerance test scheduled for next Tuesday.",
        }
        v2_res = await ac.post(f"/api/v1/clinical/notes/{v1_id}/amend", json=v2_payload, headers=doc_headers)
        assert v2_res.status_code == 201
        v2_note = v2_res.json()
        assert v2_note["version"] == 2
        assert v2_note["parent_note_id"] == v1_id

        # 3. Verify original note v1 remains unchanged and marked amended
        get_v1 = await ac.get(f"/api/v1/clinical/notes/{v1_id}", headers=doc_headers)
        assert get_v1.status_code == 200
        assert get_v1.json()["status"] == NoteStatus.AMENDED.value
        assert get_v1.json()["version"] == 1


@pytest.mark.asyncio
async def test_referral_management_lifecycle():
    """Verify referral creation, priority, and receiving clinician acceptance."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        pat_list = await ac.get("/api/v1/patients", headers=doc_headers)
        patient_id = pat_list.json()["items"][0]["id"]

        referral_payload = {
            "patient_id": patient_id,
            "specialty_requested": "Neurology",
            "priority": ReferralPriority.PRIORITY.value,
            "reason_for_referral": "Recurrent refractory migraine with transient visual aura; rule out vascular malformation.",
            "clinical_summary": "Patient failed first-line triptans. Normal non-contrast CT head. Requires MRI and specialist consultation.",
        }
        create_res = await ac.post("/api/v1/clinical/referrals", json=referral_payload, headers=doc_headers)
        assert create_res.status_code == 201
        referral = create_res.json()
        assert referral["status"] == ReferralStatus.ISSUED.value
        assert referral["priority"] == ReferralPriority.PRIORITY.value
        referral_id = referral["id"]

        # Specialist updates referral status: ISSUED -> ACCEPTED
        accept_res = await ac.patch(
            f"/api/v1/clinical/referrals/{referral_id}",
            json={"status": ReferralStatus.ACCEPTED.value},
            headers=doc_headers,
        )
        assert accept_res.status_code == 200
        assert accept_res.json()["status"] == ReferralStatus.ACCEPTED.value


@pytest.mark.asyncio
async def test_multi_tenancy_cross_facility_isolation():
    """Verify strict facility scoping: Clinicians in Facility A cannot read/modify Facility B patients."""
    # Seed Doctor in Facility 2 (FAC-PHC-RURAL-02)
    async with session_module.async_session_factory() as session:
        stmt = select(User).where(User.email == "phc.doctor@clinova.ai")
        u = (await session.execute(stmt)).scalar_one_or_none()
        if not u:
            u = User(
                id=str(uuid.uuid4()),
                email="phc.doctor@clinova.ai",
                hashed_password=get_password_hash("ClinovaPhcDoctor2026!"),
                full_name="Dr. Rural Practitioner",
                role=UserRole.DOCTOR,
                facility_id="b1fb2a91-0b97-41cc-8469-6d23a07e0fe6",  # Facility 2
                is_active=True,
            )
            session.add(u)
            await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login District Hospital Doctor (Facility 1)
        doc1_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        assert doc1_login.status_code == 200
        doc1_headers = {"Authorization": f"Bearer {doc1_login.json()['access_token']}"}

        # 2. Login PHC Doctor (Facility 2)
        doc2_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "phc.doctor@clinova.ai", "password": "ClinovaPhcDoctor2026!"},
        )
        assert doc2_login.status_code == 200
        doc2_headers = {"Authorization": f"Bearer {doc2_login.json()['access_token']}"}

        # 3. Create Patient in Facility 2 (PHC)
        pat2_payload = {
            "first_name": "Rural",
            "last_name": "Villager",
            "date_of_birth": "1985-05-12",
            "gender": "Female",
            "facility_id": "b1fb2a91-0b97-41cc-8469-6d23a07e0fe6",
        }
        res_p2 = await ac.post("/api/v1/patients", json=pat2_payload, headers=doc2_headers)
        assert res_p2.status_code == 201
        p2_id = res_p2.json()["id"]

        # 4. Doctor 1 (Facility 1) attempts to access Facility 2 patient -> MUST BE 403 FORBIDDEN
        cross_res = await ac.get(f"/api/v1/patients/{p2_id}", headers=doc1_headers)
        assert cross_res.status_code == 403
        assert "Access denied" in cross_res.json()["detail"]

        # 5. Doctor 1 attempts to record observation on Facility 2 patient -> MUST BE 403 FORBIDDEN
        cross_obs = await ac.post(
            "/api/v1/clinical/observations",
            json={
                "patient_id": p2_id,
                "observation_type": ObservationType.HEART_RATE.value,
                "value_numeric": 75.0,
                "unit": "bpm",
            },
            headers=doc1_headers,
        )
        assert cross_obs.status_code == 403

        # 6. Doctor 2 (Facility 2) can access their own patient -> 200 OK
        own_res = await ac.get(f"/api/v1/patients/{p2_id}", headers=doc2_headers)
        assert own_res.status_code == 200
        assert own_res.json()["id"] == p2_id

        # 7. Admin (SuperAdmin across facilities) can access patient -> 200 OK
        admin_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "admin@clinova.ai", "password": "ClinovaAdmin2026!"},
        )
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
        admin_res = await ac.get(f"/api/v1/patients/{p2_id}", headers=admin_headers)
        assert admin_res.status_code == 200


@pytest.mark.asyncio
async def test_patient_multi_identifiers_and_auto_mrn():
    """Verify auto-generation of primary MRN identifier and secondary identifier support."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        # 1. Register a new patient
        new_patient_payload = {
            "first_name": "Alexander",
            "last_name": "Pierce",
            "date_of_birth": "1978-11-23",
            "gender": "Male",
            "blood_group": "A+",
        }
        create_res = await ac.post("/api/v1/patients", json=new_patient_payload, headers=doc_headers)
        assert create_res.status_code == 201
        patient_data = create_res.json()
        patient_id = patient_data["id"]
        mrn = patient_data["mrn"]

        # 2. Check patient_identifiers table directly to verify auto-created primary MRN
        async with session_module.async_session_factory() as session:
            stmt = select(PatientIdentifier).where(PatientIdentifier.patient_id == patient_id)
            res = await session.execute(stmt)
            identifiers = res.scalars().all()
            assert len(identifiers) >= 1
            primary_id = next((i for i in identifiers if i.is_primary), None)
            assert primary_id is not None
            assert primary_id.identifier_type == IdentifierType.MRN
            assert primary_id.identifier_value == mrn


@pytest.mark.asyncio
async def test_longitudinal_patient_timeline():
    """Verify unified chronological aggregation across clinical tables."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        pat_list = await ac.get("/api/v1/patients", headers=doc_headers)
        patient_id = pat_list.json()["items"][0]["id"]

        # Query patient timeline
        timeline_res = await ac.get(f"/api/v1/clinical/patients/{patient_id}/timeline", headers=doc_headers)
        assert timeline_res.status_code == 200
        data = timeline_res.json()
        assert data["patient_id"] == patient_id
        assert data["total_events"] >= 1
        assert len(data["timeline"]) > 0

        # Verify items have standardized schema
        first_event = data["timeline"][0]
        assert "event_id" in first_event
        assert "timestamp" in first_event
        assert "event_type" in first_event
        assert "title" in first_event


@pytest.mark.asyncio
async def test_synthetic_scale_and_index_performance():
    """Verify database query performance with 1,000+ synthetic clinical records."""
    # 1. Bulk insert 1,000 synthetic observations for performance testing
    async with session_module.async_session_factory() as session:
        stmt = select(Patient).limit(1)
        p = (await session.execute(stmt)).scalar_one()
        target_patient_id = p.id

        batch_size = 1000
        observations = []
        for i in range(batch_size):
            obs = ClinicalObservation(
                patient_id=target_patient_id,
                observation_type=ObservationType.HEART_RATE,
                value_numeric=60.0 + (i % 40),
                unit="bpm",
                source=ObservationSource.DEVICE_MEASURED,
                verification_status=VerificationStatus.VERIFIED,
            )
            observations.append(obs)

        session.add_all(observations)
        await session.commit()

    # 2. Benchmark paginated query response time via API
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        start_time = time.perf_counter()
        perf_res = await ac.get(
            f"/api/v1/clinical/patients/{target_patient_id}/observations?limit=50",
            headers=doc_headers,
        )
        latency_ms = (time.perf_counter() - start_time) * 1000

        assert perf_res.status_code == 200
        items = perf_res.json()
        assert len(items) == 50
        # Performance requirement: response under 500ms even with 1000+ records
        assert latency_ms < 500.0, f"Query latency {latency_ms:.2f}ms exceeded 500ms budget"

    # 3. Clean up the synthetic test records
    async with session_module.async_session_factory() as session:
        del_stmt = delete(ClinicalObservation).where(
            ClinicalObservation.patient_id == target_patient_id,
            ClinicalObservation.source == ObservationSource.DEVICE_MEASURED,
        )
        await session.execute(del_stmt)
        await session.commit()
