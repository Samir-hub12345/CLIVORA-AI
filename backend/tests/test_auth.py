import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_flow(async_client: AsyncClient):
    """Test user registration and subsequent login."""
    # 1. Register a new clinician
    email = "test.cardiologist@clinova.ai"
    reg_payload = {
        "email": email,
        "password": "SecurePassword123!",
        "full_name": "Dr. Alex Taylor",
        "role": "doctor",
    }
    response = await async_client.post("/api/v1/auth/register", json=reg_payload)
    assert response.status_code in [201, 400]  # 201 if first time, 400 if already exists

    # 2. Login with registered credentials
    login_payload = {
        "email": email,
        "password": "SecurePassword123!",
    }
    login_res = await async_client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    token = token_data["access_token"]

    # 3. Access protected /me endpoint
    me_res = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["email"] == email
    assert user_data["role"] == "doctor"


@pytest.mark.asyncio
async def test_login_invalid_credentials(async_client: AsyncClient):
    """Test login failure on incorrect password."""
    payload = {
        "email": "doctor@clinova.ai",
        "password": "WrongPassword!",
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
