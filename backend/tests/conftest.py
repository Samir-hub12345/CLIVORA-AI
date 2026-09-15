import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.security import create_access_token


@pytest_asyncio.fixture
async def async_client():
    """Async test client fixture for FastAPI app testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def doctor_auth_headers():
    """Header fixture for Doctor role."""
    token = create_access_token(subject="doctor-test-id", role="doctor")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def patient_auth_headers():
    """Header fixture for Patient role."""
    token = create_access_token(subject="patient-test-id", role="patient")
    return {"Authorization": f"Bearer {token}"}
