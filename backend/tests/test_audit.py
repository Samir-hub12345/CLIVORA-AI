import pytest
from httpx import AsyncClient


async def get_doctor_token(client: AsyncClient) -> str:
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
    )
    return login_res.json()["access_token"]


@pytest.mark.asyncio
async def test_audit_logging_trail(async_client: AsyncClient):
    token = await get_doctor_token(async_client)
    headers = {"Authorization": f"Bearer {token}"}

    # Query audit logs
    response = await async_client.get("/api/v1/audit-logs", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    items = data["items"]
    # Check that previous login/seed actions generated an audit entry
    assert any(log["action"] in ["LOGIN_SUCCESS", "PATIENT_DIRECTORY_QUERY", "AI_TRIAGE_INFERENCE"] for log in items)
