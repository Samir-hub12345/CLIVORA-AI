import pytest
from httpx import AsyncClient


async def get_doctor_token(client: AsyncClient) -> str:
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
    )
    return login_res.json()["access_token"]


@pytest.mark.asyncio
async def test_patient_crud_flow(async_client: AsyncClient):
    token = await get_doctor_token(async_client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List patients
    list_res = await async_client.get("/api/v1/patients", headers=headers)
    assert list_res.status_code == 200
    initial_count = list_res.json()["total"]
    assert initial_count >= 1

    # 2. Create a new patient
    new_patient = {
        "first_name": "Clara",
        "last_name": "Oswald",
        "date_of_birth": "1991-04-12",
        "gender": "Female",
        "blood_group": "AB+",
        "phone": "+1 (555) 345-6789",
        "email": "clara.oswald@example.com",
        "allergies": "Aspirin",
        "medical_history": "Seasonal allergies",
    }
    create_res = await async_client.post("/api/v1/patients", json=new_patient, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["first_name"] == "Clara"
    assert created_data["mrn"].startswith("CLN-")
    patient_id = created_data["id"]

    # 3. Retrieve patient profile
    get_res = await async_client.get(f"/api/v1/patients/{patient_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["mrn"] == created_data["mrn"]

    # 4. Search patient by name
    search_res = await async_client.get("/api/v1/patients?q=Oswald", headers=headers)
    assert search_res.status_code == 200
    items = search_res.json()["items"]
    assert any(p["last_name"] == "Oswald" for p in items)
