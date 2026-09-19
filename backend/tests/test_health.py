import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    """Test that the root welcoming endpoint returns 200 OK."""
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "CLINOVA AI" in data["message"]


@pytest.mark.asyncio
async def test_health_check_endpoint(async_client: AsyncClient):
    """Test that the health endpoint returns status healthy and metadata."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "CLINOVA AI"
    assert "timestamp" in data
