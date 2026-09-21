"""CLINOVA AI — Phase 4 Enterprise Scale & Operational Readiness Test Suite.

Validates:
1. Keyset Cursor-based Pagination (Phase 22)
2. Prometheus Telemetry & Metrics Exposition (Phase 43)
3. Bulk Patient Registry Ingestion & FHIR R4 Parsing (Phase 47)
4. Multi-factor Patient Deduplication & Safe Merge Engine (Phase 48)
5. Automated Data Retention & Disposal Lifecycle Sweep (Phase 49)
"""

import json
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.core.pagination import CursorPaginationHelper
from app.core.metrics import metrics_collector
from app.models.patient import Patient
from app.models.document import Document, DocumentStatus
from app.models.audit import AuditLog
from app.services.deduplication import DeduplicationService
from app.services.import_pipeline import PatientImportService
from app.services.retention import RetentionService


@pytest.mark.asyncio
async def test_keyset_cursor_pagination_encode_decode():
    """Verify keyset cursor encoding, decoding, and fallback handling."""
    sample_dt = datetime(2026, 9, 21, 12, 0, 0, tzinfo=timezone.utc)
    sample_id = "test-item-uuid-1234"

    # 1. Encode
    cursor_str = CursorPaginationHelper.encode_cursor(sample_dt, sample_id)
    assert isinstance(cursor_str, str)
    assert len(cursor_str) > 10

    # 2. Decode
    decoded = CursorPaginationHelper.decode_cursor(cursor_str)
    assert decoded is not None
    dec_dt, dec_id = decoded
    assert dec_id == sample_id
    assert dec_dt.year == 2026

    # 3. Invalid cursor raises ValueError
    with pytest.raises(ValueError):
        CursorPaginationHelper.decode_cursor("not-a-valid-cursor-string!!!")


@pytest.mark.asyncio
async def test_prometheus_telemetry_metrics_collection():
    """Verify Prometheus metrics middleware, endpoint generation, and latency tracking."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Trigger an endpoint to record request
        res = await ac.get("/")
        assert res.status_code == 200

        # Query health metrics endpoint
        metrics_res = await ac.get("/api/v1/health/metrics")
        assert metrics_res.status_code == 200
        text = metrics_res.text
        assert "clinova_http_requests_total" in text
        assert "clinova_http_request_duration_seconds" in text
        assert "clinova_ocr_processing_duration_seconds" in text
        assert "clinova_ai_synthesis_duration_seconds" in text

        # Verify direct root /metrics alias
        root_metrics_res = await ac.get("/api/v1/metrics")
        assert root_metrics_res.status_code == 200
        assert "clinova_http_requests_total" in root_metrics_res.text


@pytest.mark.asyncio
async def test_bulk_csv_patient_import_preview_and_execute():
    """Verify CSV patient ingestion, field normalization, and execution."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        csv_content = (
            "full_name,dob,gender,phone,blood_group,address\n"
            "Ananya Sen,1988-04-12,Female,+91 98765 43210,O+,Bhubaneswar Sector 5\n"
            "Rajesh Nayak,1975-11-23,Male,+91 98765 12345,B+,Cuttack Badambadi\n"
        )

        # 1. Preview
        preview_res = await ac.post(
            "/api/v1/patients/import/preview",
            files={"file": ("patients.csv", csv_content.encode("utf-8"), "text/csv")},
            headers=headers,
        )
        assert preview_res.status_code == 200
        preview_data = preview_res.json()
        assert preview_data["total_records"] == 2
        assert preview_data["valid_count"] == 2
        assert preview_data["invalid_count"] == 0
        assert len(preview_data["preview_items"]) == 2
        assert preview_data["preview_items"][0]["first_name"] == "Ananya"
        assert preview_data["preview_items"][0]["last_name"] == "Sen"
        assert preview_data["preview_items"][0]["gender"] == "Female"

        # 2. Execute
        exec_res = await ac.post(
            "/api/v1/patients/import/execute",
            json=preview_data["preview_items"],
            headers=headers,
        )
        assert exec_res.status_code == 200
        exec_data = exec_res.json()
        assert exec_data["created_count"] == 2
        assert len(exec_data["created_patient_ids"]) == 2


@pytest.mark.asyncio
async def test_bulk_fhir_bundle_import():
    """Verify HL7 FHIR R4 Bundle parsing and patient creation."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        fhir_bundle = {
            "resourceType": "Bundle",
            "type": "collection",
            "entry": [
                {
                    "resource": {
                        "resourceType": "Patient",
                        "id": "fhir-pat-001",
                        "name": [{"text": "Priyanka Mishra", "family": "Mishra", "given": ["Priyanka"]}],
                        "gender": "female",
                        "birthDate": "1992-06-15",
                        "telecom": [{"system": "phone", "value": "+91 99370 11223"}],
                        "address": [{"text": "Patia, Bhubaneswar"}],
                    }
                }
            ],
        }

        # 1. Preview
        preview_res = await ac.post(
            "/api/v1/patients/import/preview",
            files={"file": ("bundle.json", json.dumps(fhir_bundle).encode("utf-8"), "application/json")},
            headers=headers,
        )
        assert preview_res.status_code == 200
        preview_data = preview_res.json()
        assert preview_data["valid_count"] == 1
        assert preview_data["preview_items"][0]["first_name"] == "Priyanka"
        assert preview_data["preview_items"][0]["last_name"] == "Mishra"

        # 2. Execute
        exec_res = await ac.post(
            "/api/v1/patients/import/execute",
            json=preview_data["preview_items"],
            headers=headers,
        )
        assert exec_res.status_code == 200
        data = exec_res.json()
        assert data["created_count"] == 1


@pytest.mark.asyncio
async def test_patient_deduplication_and_chart_merge(database):
    """Verify duplicate candidate detection and safe patient chart merging."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        # Create two patients with matching demographics (likely duplicate)
        pat1_res = await ac.post(
            "/api/v1/patients",
            json={
                "first_name": "Debabrata",
                "last_name": "Mohapatra",
                "date_of_birth": "1980-01-15",
                "gender": "Male",
                "phone": "+91 91234 56789",
                "blood_group": "A+",
            },
            headers=headers,
        )
        assert pat1_res.status_code == 201
        p1_id = pat1_res.json()["id"]

        pat2_res = await ac.post(
            "/api/v1/patients",
            json={
                "first_name": "Debabrata",
                "last_name": "Mohapatra",
                "date_of_birth": "1980-01-15",
                "gender": "Male",
                "phone": "+91 91234 56789",
                "blood_group": "A+",
            },
            headers=headers,
        )
        assert pat2_res.status_code == 201
        p2_id = pat2_res.json()["id"]

        # 1. Detect duplicate candidates
        cand_res = await ac.get("/api/v1/patients/duplicates/candidates", headers=headers)
        assert cand_res.status_code == 200
        candidates = cand_res.json()
        assert len(candidates) >= 1
        matched = any(
            (c["primary_patient_id"] == p1_id and c["duplicate_patient_id"] == p2_id)
            or (c["primary_patient_id"] == p2_id and c["duplicate_patient_id"] == p1_id)
            for c in candidates
        )
        assert matched is True

        # 2. Merge secondary into primary
        merge_res = await ac.post(
            "/api/v1/patients/merge",
            json={
                "primary_patient_id": p1_id,
                "secondary_patient_id": p2_id,
                "merge_reason": "Duplicate registration during emergency intake",
            },
            headers=headers,
        )
        assert merge_res.status_code == 200
        merge_data = merge_res.json()
        assert merge_data["primary_patient_id"] == p1_id
        assert merge_data["merged_patient_id"] == p2_id
        assert merge_data["status"] == "MERGED_SUCCESSFULLY"


@pytest.mark.asyncio
async def test_retention_sweep_dry_run_and_admin_execution(database):
    """Verify Data Retention worker dry-run and admin trigger endpoint."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        admin_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "admin@clinova.ai", "password": "ClinovaAdmin2026!"},
        )
        admin_headers = {"Authorization": f"Bearer {admin_res.json()['access_token']}"}

        # 1. Dry-run sweep via Admin API
        sweep_res = await ac.post(
            "/api/v1/admin/retention/sweep?dry_run=true",
            headers=admin_headers,
        )
        assert sweep_res.status_code == 200
        sweep_data = sweep_res.json()
        assert sweep_data["dry_run"] is True
        assert "rules_executed" in sweep_data
        assert len(sweep_data["rules_executed"]) == 3

        # 2. Direct Service verification with an artificially aged soft-deleted document
        async with database() as db:
            past_date = datetime.now(timezone.utc) - timedelta(days=45)
            expired_doc = Document(
                filename="ancient_archive.pdf",
                mime_type="application/pdf",
                file_size_bytes=4096,
                checksum_sha256="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                storage_key="test/ancient_archive.pdf",
                status=DocumentStatus.STORED,
                deleted_at=past_date,
            )
            db.add(expired_doc)
            await db.commit()
            doc_id = expired_doc.id

            # Dry-run should count it
            dry_report = await RetentionService.run_retention_sweep(db=db, dry_run=True)
            assert dry_report.total_candidates >= 1

            # Enforcement run should purge it
            exec_report = await RetentionService.run_retention_sweep(db=db, dry_run=False)
            assert exec_report.total_purged >= 1

            # Verify document row is gone
            chk = await db.execute(select(Document).where(Document.id == doc_id))
            assert chk.scalar_one_or_none() is None
