import pytest
import io
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_liveness_and_readiness():
    """Verify production liveness and dependency readiness probes."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 1. Liveness
        live_res = await ac.get("/api/v1/health/live")
        assert live_res.status_code == 200
        assert live_res.json()["status"] == "alive"

        # 2. Readiness (Checks active PostgreSQL & Redis)
        ready_res = await ac.get("/api/v1/health/ready")
        assert ready_res.status_code == 200
        data = ready_res.json()
        assert data["status"] in ("ready", "degraded")
        assert "postgresql" in data["dependencies"]
        assert data["dependencies"]["postgresql"]["healthy"] is True
        assert "redis" in data["dependencies"]


@pytest.mark.asyncio
async def test_idor_protection_cross_patient_access():
    """Verify IDOR protection: Patient cannot access another patient's records or consultations."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 1. Authenticate Doctor
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        assert doc_login.status_code == 200
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        # 2. Authenticate Patient (James Miller - patient@clinova.ai)
        pat_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "patient@clinova.ai", "password": "ClinovaPatient2026!"},
        )
        assert pat_login.status_code == 200
        pat_headers = {"Authorization": f"Bearer {pat_login.json()['access_token']}"}

        # 3. Doctor looks up a different patient (e.g. Elena Rostova) and creates a consultation
        pat_list_res = await ac.get("/api/v1/patients", headers=doc_headers)
        assert pat_list_res.status_code == 200
        patients = pat_list_res.json()["items"]
        other_patient = next((p for p in patients if p.get("email") != "patient@clinova.ai"), None)
        assert other_patient is not None, "Need at least one other patient in system"

        create_consult = await ac.post(
            "/api/v1/consultations",
            json={
                "patient_id": other_patient["id"],
                "chief_complaint": "Acute migraine and photosensitivity for 3 days",
            },
            headers=doc_headers,
        )
        assert create_consult.status_code == 201
        other_consult_id = create_consult.json()["id"]

        # 4. Patient tries to read another patient's consultation -> MUST BE 403 FORBIDDEN
        idor_res = await ac.get(f"/api/v1/consultations/{other_consult_id}", headers=pat_headers)
        assert idor_res.status_code == 403
        assert "Access denied" in idor_res.json()["detail"]


@pytest.mark.asyncio
async def test_rbac_patient_forbidden_endpoints():
    """Verify patients cannot access clinician/admin endpoints."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        pat_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "patient@clinova.ai", "password": "ClinovaPatient2026!"},
        )
        pat_headers = {"Authorization": f"Bearer {pat_login.json()['access_token']}"}

        # Patient cannot access audit logs
        audit_res = await ac.get("/api/v1/audit-logs", headers=pat_headers)
        assert audit_res.status_code == 403

        # Patient cannot list all facility users
        users_res = await ac.get("/api/v1/auth/users", headers=pat_headers)
        assert users_res.status_code == 403


@pytest.mark.asyncio
async def test_object_storage_document_lifecycle_and_validation():
    """Verify Object Storage document upload, MIME validation, and retrieval."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # Authenticate Doctor
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        # 1. Reject unsupported file type (.exe / application/x-msdownload)
        bad_files = {
            "file": ("malicious.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/x-msdownload")
        }
        res_bad_mime = await ac.post(
            "/api/v1/documents/upload",
            files=bad_files,
            data={"document_type": "pathology_report"},
            headers=doc_headers,
        )
        assert res_bad_mime.status_code == 415
        assert "Unsupported file type" in res_bad_mime.json()["detail"]

        # 2. Reject 0-byte file
        empty_files = {
            "file": ("empty.pdf", b"", "application/pdf")
        }
        res_empty = await ac.post(
            "/api/v1/documents/upload",
            files=empty_files,
            data={"document_type": "pathology_report"},
            headers=doc_headers,
        )
        assert res_empty.status_code == 400

        # 3. Successfully upload valid PDF
        pdf_content = b"%PDF-1.4 Clinical Blood Report Hemoglobin: 13.5 g/dL Platelets: 250,000"
        valid_files = {
            "file": ("blood_test_cbc.pdf", pdf_content, "application/pdf")
        }
        res_upload = await ac.post(
            "/api/v1/documents/upload",
            files=valid_files,
            data={"document_type": "lab_result"},
            headers=doc_headers,
        )
        assert res_upload.status_code == 201
        doc_data = res_upload.json()
        doc_id = doc_data["id"]
        assert doc_data["filename"] == "blood_test_cbc.pdf"
        assert doc_data["file_size_bytes"] == len(pdf_content)
        assert len(doc_data["checksum_sha256"]) == 64
        assert "facilities/" in doc_data["storage_key"]

        # 4. Download document
        res_download = await ac.get(f"/api/v1/documents/{doc_id}/download", headers=doc_headers)
        assert res_download.status_code == 200
        assert res_download.content == pdf_content


@pytest.mark.asyncio
async def test_background_job_queue():
    """Verify background job queuing and status inspection."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        # Enqueue background job
        job_req = {
            "job_type": "document_ocr",
            "payload": {"filename": "scan.pdf", "case_id": "TEST-ASYNC-01"},
            "resource_type": "DOCUMENT",
            "resource_id": "DOC-TEST-001",
        }
        enqueue_res = await ac.post("/api/v1/jobs", json=job_req, headers=doc_headers)
        assert enqueue_res.status_code == 202
        job_data = enqueue_res.json()
        assert job_data["status"] in ("queued", "running", "completed")
        job_id = job_data["id"]

        # Poll job status
        poll_res = await ac.get(f"/api/v1/jobs/{job_id}", headers=doc_headers)
        assert poll_res.status_code == 200
        assert poll_res.json()["id"] == job_id


@pytest.mark.asyncio
async def test_multi_facility_listing():
    """Verify multi-facility directory and tenant foundation."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        fac_res = await ac.get("/api/v1/facilities", headers=doc_headers)
        assert fac_res.status_code == 200
        fac_data = fac_res.json()
        assert fac_data["total"] >= 1
        codes = [f["facility_code"] for f in fac_data["items"]]
        assert "FAC-DISTRICT-01" in codes
