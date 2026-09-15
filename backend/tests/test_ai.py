import pytest
from httpx import AsyncClient


async def get_doctor_token(client: AsyncClient) -> str:
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
    )
    return login_res.json()["access_token"]


@pytest.mark.asyncio
async def test_ai_triage_clinical_decision_support(async_client: AsyncClient):
    token = await get_doctor_token(async_client)
    headers = {"Authorization": f"Bearer {token}"}

    # Severe chest pain presentation
    triage_payload = {
        "chief_complaint": "Acute substernal crushing chest pain radiating to left arm",
        "symptoms": ["chest pain", "shortness of breath", "diaphoresis"],
        "symptom_duration": "45 minutes",
        "vitals": {
            "blood_pressure_systolic": 182,
            "blood_pressure_diastolic": 104,
            "heart_rate": 118,
            "oxygen_saturation": 92.0,
            "temperature": 37.0,
            "pain_score": 9,
        },
        "relevant_medical_history": "Hypertension, Hyperlipidemia",
    }

    response = await async_client.post("/api/v1/ai/triage", json=triage_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()

    # Verify triage categorization
    assert data["urgency_level"] in ["CRITICAL", "URGENT"]
    assert len(data["differential_diagnoses"]) >= 1
    assert any("coronary" in d["condition"].lower() or "angina" in d["condition"].lower() for d in data["differential_diagnoses"])
    assert len(data["immediate_actions"]) >= 1
    # Clinical disclaimer must be present
    assert "CLINICAL DECISION SUPPORT NOTICE" in data["disclaimer"]


@pytest.mark.asyncio
async def test_ai_soap_synthesis(async_client: AsyncClient):
    token = await get_doctor_token(async_client)
    headers = {"Authorization": f"Bearer {token}"}

    soap_payload = {
        "patient_name": "James Miller",
        "chief_complaint": "Follow-up hypertension",
        "encounter_notes": "Patient reports adherence to meds. No headache, vision changes, or chest pain. Diet low sodium.",
        "vitals": {
            "blood_pressure_systolic": 130,
            "blood_pressure_diastolic": 82,
            "heart_rate": 70,
        },
    }

    response = await async_client.post("/api/v1/ai/soap-summary", json=soap_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "subjective" in data
    assert "objective" in data
    assert "assessment" in data
    assert "plan" in data
    assert "patient_friendly_summary" in data
