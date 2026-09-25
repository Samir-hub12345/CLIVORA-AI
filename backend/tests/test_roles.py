import pytest
from sqlalchemy import select
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.core.security import create_access_token

async def login(client, role):
    emails = {"nurse": "nurse@test.invalid", "second.doctor": "second.doctor@test.invalid"}
    passwords = {"patient": "ClinovaPatient2026!", "doctor": "ClinovaDoctor2026!", "admin": "ClinovaAdmin2026!"}
    res = await client.post("/api/v1/auth/login", json={"email": emails.get(role, role + "@clinova.ai"), "password": passwords.get(role, "TestPassword123!")})
    assert res.status_code == 200, res.text
    return {"Authorization": "Bearer " + res.json()["access_token"]}

@pytest.mark.asyncio
async def test_private_endpoints_require_auth(async_client):
    for path in ["/cases", "/cases/CLV-DEMO-001", "/review/CLV-DEMO-001/referral", "/portal/profile", "/portal/cases", "/portal/consultations", "/admin/overview", "/admin/users", "/patients", "/consultations", "/audit-logs"]:
        res = await async_client.get("/api/v1" + path)
        assert res.status_code == 401, (path, res.text)
    for path, body in [("/cases", {"raw_symptoms": "Test symptom", "consent_acknowledged": True}), ("/review/CLV-DEMO-001/action", {"action": "approve"}), ("/intake/translate", {"text": "Test"})]:
        assert (await async_client.post("/api/v1" + path, json=body)).status_code == 401
    assert (await async_client.delete("/api/v1/cases/CLV-DEMO-001")).status_code == 401

@pytest.mark.asyncio
async def test_role_endpoint_matrix(async_client):
    paths = {
        "/portal/profile": {"patient"},
        "/portal/consultations": {"patient"},
        "/portal/cases": {"patient"},
        "/patients": {"doctor", "nurse"},
        "/consultations": {"doctor", "nurse"},
        "/cases": {"doctor", "nurse"},
        "/cases/CLV-DEMO-001": {"doctor", "nurse"},
        "/review/CLV-DEMO-001/referral": {"doctor", "nurse"},
        "/audit-logs": {"admin"},
        "/admin/overview": {"admin"},
        "/admin/users": {"admin"},
    }
    for role in ["patient", "doctor", "nurse", "admin"]:
        headers = await login(async_client, role)
        for path, allowed in paths.items():
            res = await async_client.get("/api/v1" + path, headers=headers)
            expected = [200, 404] if role in allowed else [403]
            assert res.status_code in expected, (role, path, res.text)

@pytest.mark.asyncio
async def test_cannot_self_register_staff(async_client):
    for role in ["doctor", "nurse", "admin"]:
        res = await async_client.post("/api/v1/auth/register", json={"email": role + "@new.invalid", "full_name": "New User", "password": "StrongPassword123!", "role": role})
        assert res.status_code == 403

@pytest.mark.asyncio
async def test_patient_intake_review_and_isolation(async_client):
    patient = await login(async_client, "patient")
    doctor = await login(async_client, "doctor")
    assert (await async_client.post("/api/v1/cases", headers=patient, json={"raw_symptoms": "Mild headache"})).status_code == 422
    created = await async_client.post("/api/v1/cases", headers=patient, json={"raw_symptoms": "Mild headache for one day", "consent_acknowledged": True, "owner_user_id": "forged-owner"})
    assert created.status_code == 201, created.text
    case = created.json()
    assert case["summary"] is None
    for private in ["risk_signals", "triage_summary", "reviewer_notes", "reviewer_id"]:
        assert private not in case
    own = (await async_client.get("/api/v1/portal/cases", headers=patient)).json()
    assert case["id"] in [c["id"] for c in own]
    # Register another patient, with no EHR link. They must see no one else's data.
    await async_client.post("/api/v1/auth/register", json={"email": "other@test.invalid", "full_name": "Other Patient", "password": "StrongPassword123!", "role": "patient"})
    other_token = (await async_client.post("/api/v1/auth/login", json={"email": "other@test.invalid", "password": "StrongPassword123!"})).json()["access_token"]
    other = {"Authorization": "Bearer " + other_token}
    for path in ["/portal/cases", "/portal/consultations"]:
        assert (await async_client.get("/api/v1" + path, headers=other)).json() == []
    assert (await async_client.get("/api/v1/portal/profile", headers=other)).json() is None
    for role in ["patient", "nurse", "admin"]:
        headers = await login(async_client, role)
        res = await async_client.post("/api/v1/review/" + case["id"] + "/action", headers=headers, json={"action": "approve"})
        assert res.status_code == 403
        assert (await async_client.delete("/api/v1/cases/" + case["id"], headers=headers)).status_code == 403
    reviewed = await async_client.post("/api/v1/review/" + case["id"] + "/action?reviewer_name=Impersonated", headers=doctor, json={"action": "approve"})
    assert reviewed.status_code == 200, reviewed.text
    assert reviewed.json()["reviewer_name"] == "Dr. Sarah Chen, MD"
    assert reviewed.json()["reviewer_id"]
    own_cases = (await async_client.get("/api/v1/portal/cases", headers=patient)).json()
    own = next(c for c in own_cases if c["id"] == case["id"])
    assert own["status"] == "approved" and own["summary"]
    assert "reviewer_notes" not in own

@pytest.mark.asyncio
async def test_patient_records_use_id_not_email(async_client, database):
    patient = await login(async_client, "patient")
    doctor = await login(async_client, "doctor")
    own = (await async_client.get("/api/v1/portal/profile", headers=patient)).json()
    assert own["first_name"] == "James"
    visits = (await async_client.get("/api/v1/portal/consultations", headers=patient)).json()
    summary_visit = next((v for v in visits if v.get("summary")), visits[0])
    assert len(visits) >= 1 and summary_visit["summary"]
    assert "ai_differential_diagnosis" not in summary_visit
    # The old full-detail endpoints are now restricted to staff.
    assert (await async_client.get("/api/v1/consultations/" + summary_visit["id"], headers=patient)).status_code == 403
    assert (await async_client.get("/api/v1/patients/" + own["id"], headers=patient)).status_code == 403
    async with database() as db:
        user = (await db.execute(select(User).where(User.email == "patient@clinova.ai"))).scalar_one()
        user.email = "changed@example.invalid"
        await db.commit()
    assert (await async_client.get("/api/v1/portal/profile", headers=patient)).json()["id"] == own["id"]
    assert len((await async_client.get("/api/v1/portal/consultations", headers=patient)).json()) >= 1
    # A token with a forged role claim still resolves the patient role from the DB.
    async with database() as db:
        user = (await db.execute(select(User).where(User.email == "changed@example.invalid"))).scalar_one()
        forged = {"Authorization": "Bearer " + create_access_token(user.id, role="admin")}
    assert (await async_client.get("/api/v1/admin/overview", headers=forged)).status_code == 403
    # Restore original email
    async with database() as db:
        user = (await db.execute(select(User).where(User.email == "changed@example.invalid"))).scalar_one()
        user.email = "patient@clinova.ai"
        await db.commit()

@pytest.mark.asyncio
async def test_doctor_encounter_ownership(async_client):
    doctor = await login(async_client, "doctor")
    second = await login(async_client, "second.doctor")
    nurse = await login(async_client, "nurse")
    encounters = (await async_client.get("/api/v1/consultations", headers=doctor)).json()["items"]
    encounter = encounters[0]
    assert (await async_client.get("/api/v1/consultations", headers=second)).json()["total"] == 0
    assert (await async_client.get("/api/v1/consultations/" + encounter["id"], headers=second)).status_code == 403
    assert (await async_client.put("/api/v1/consultations/" + encounter["id"], headers=second, json={"status": "completed"})).status_code == 403
    soap = {"subjective": "s", "objective": "o", "assessment": "a", "plan": "p"}
    for headers in [second, nurse]:
        assert (await async_client.put("/api/v1/consultations/" + encounter["id"] + "/soap", headers=headers, json=soap)).status_code == 403
    assert (await async_client.post("/api/v1/consultations", headers=second, json={"patient_id": encounter["patient_id"], "doctor_id": encounter["doctor_id"], "chief_complaint": "Test concern"})).status_code == 403
    assert (await async_client.post("/api/v1/ai/triage?consultation_id=" + encounter["id"], headers=second, json={"chief_complaint": "Headache", "symptoms": ["headache"]})).status_code == 403

@pytest.mark.asyncio
async def test_patient_profile_cannot_change_identity_or_medical_notes(async_client):
    patient = await login(async_client, "patient")
    before = (await async_client.get("/api/v1/portal/profile", headers=patient)).json()
    payload = {k: before[k] for k in ["first_name", "last_name", "date_of_birth", "gender", "phone", "emergency_contact"]}
    payload.update({"phone": "0123456789", "id": "someone-else", "user_id": "someone-else", "allergies": "Fake change"})
    res = await async_client.put("/api/v1/portal/profile", headers=patient, json=payload)
    assert res.status_code == 200, res.text
    after = res.json()
    assert after["id"] == before["id"] and after["allergies"] == before["allergies"]
    assert after["phone"] == "0123456789"