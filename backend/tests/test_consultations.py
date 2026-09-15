import pytest
from httpx import AsyncClient


async def get_doctor_token(client: AsyncClient) -> str:
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
    )
    return login_res.json()["access_token"]


@pytest.mark.asyncio
async def test_consultation_lifecycle(async_client: AsyncClient):
    token = await get_doctor_token(async_client)
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch a patient to link consultation
    patients_res = await async_client.get("/api/v1/patients", headers=headers)
    patient = patients_res.json()["items"][0]

    # 1. Create a consultation
    consultation_payload = {
        "patient_id": patient["id"],
        "chief_complaint": "Persistent productive cough with low-grade fever x 4 days",
        "triage_level": "routine",
        "vitals_data": '{"temperature": 37.8, "heart_rate": 84}',
    }
    create_res = await async_client.post(
        "/api/v1/consultations",
        json=consultation_payload,
        headers=headers,
    )
    assert create_res.status_code == 201
    consultation = create_res.json()
    consultation_id = consultation["id"]
    assert consultation["chief_complaint"] == consultation_payload["chief_complaint"]

    # 2. Update SOAP notes
    soap_payload = {
        "subjective": "Productive cough with yellow sputum for 4 days.",
        "objective": "T: 37.8C, HR: 84, RR: 18. Lungs: Mild scattered crackles right base.",
        "assessment": "Likely early Community Acquired Pneumonia.",
        "plan": "Chest X-ray PA/LAT, Amoxicillin-Clavulanate 875/125mg BID x 7 days.",
    }
    soap_res = await async_client.put(
        f"/api/v1/consultations/{consultation_id}/soap",
        json=soap_payload,
        headers=headers,
    )
    assert soap_res.status_code == 200
    updated = soap_res.json()
    assert updated["subjective"] == soap_payload["subjective"]
    assert updated["assessment"] == soap_payload["assessment"]
