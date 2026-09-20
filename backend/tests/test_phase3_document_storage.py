import io
import uuid
import hashlib
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.storage import EICAR_SIGNATURE


@pytest.mark.asyncio
async def test_valid_pdf_and_image_upload():
    """Verify upload of valid PDF, PNG, and JPEG documents with SHA-256 and metadata persistence."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        # 1. Valid PDF
        pdf_bytes = b"%PDF-1.4\n%Clinova Clinical Discharge Summary\nPatient: John Doe\n%%EOF"
        pdf_upload = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("discharge_summary.pdf", pdf_bytes, "application/pdf")},
            data={"document_type": "discharge_summary"},
            headers=headers,
        )
        assert pdf_upload.status_code == 201
        pdf_data = pdf_upload.json()
        assert pdf_data["filename"] == "discharge_summary.pdf"
        assert pdf_data["safe_filename"] == "discharge_summary.pdf"
        assert pdf_data["mime_type"] == "application/pdf"
        assert pdf_data["checksum_sha256"] == hashlib.sha256(pdf_bytes).hexdigest()
        assert pdf_data["scan_status"] == "clean"
        assert pdf_data["status"] == "stored"
        assert pdf_data["version"] == 1
        assert pdf_data["is_current_version"] is True

        # 2. Valid PNG Image
        png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        png_upload = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("dermatology_scan.png", png_bytes, "image/png")},
            data={"document_type": "clinical_note"},
            headers=headers,
        )
        assert png_upload.status_code == 201
        assert png_upload.json()["mime_type"] == "image/png"
        assert png_upload.json()["scan_status"] == "clean"


@pytest.mark.asyncio
async def test_file_validation_and_mime_spoofing_defense():
    """Verify that disguised executables, corrupted files, and unsupported types are strictly rejected."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        # 1. Reject 0-byte file
        res_empty = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("empty.pdf", b"", "application/pdf")},
            headers=headers,
        )
        assert res_empty.status_code == 400
        assert "empty" in res_empty.json()["detail"].lower()

        # 2. Reject unsupported MIME type
        res_bad_mime = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("script.py", b"print('hello')", "application/x-python")},
            headers=headers,
        )
        assert res_bad_mime.status_code == 415

        # 3. MIME Spoofing Defense: Executable disguised as PDF
        disguised_exe = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00This is malicious binary disguised as report"
        res_spoof = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("lab_report.pdf", disguised_exe, "application/pdf")},
            headers=headers,
        )
        assert res_spoof.status_code == 415
        assert "Security violation" in res_spoof.json()["detail"] or "prohibited" in res_spoof.json()["detail"].lower()

        # 4. Linux ELF disguised as image
        disguised_elf = b"\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00fake_elf"
        res_elf = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("scan.png", disguised_elf, "image/png")},
            headers=headers,
        )
        assert res_elf.status_code == 415


@pytest.mark.asyncio
async def test_path_traversal_filename_sanitization():
    """Verify that dangerous directory traversal filenames are strictly sanitized before storage."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        pdf_bytes = b"%PDF-1.4\nSafe content for traversal test\n%%EOF"
        traversal_upload = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("../../../../etc/passwd.pdf", pdf_bytes, "application/pdf")},
            headers=headers,
        )
        assert traversal_upload.status_code == 201
        data = traversal_upload.json()
        assert ".." not in data["safe_filename"]
        assert "/" not in data["safe_filename"]
        assert "\\" not in data["safe_filename"]
        assert "passwd.pdf" in data["safe_filename"]
        assert "facilities/" in data["storage_key"]


@pytest.mark.asyncio
async def test_malware_detection_and_quarantine_isolation():
    """Verify that files containing antivirus test patterns (EICAR) are quarantined and blocked from download."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        # Prepare EICAR payload formatted as text/plain
        eicar_payload = b"%PDF-1.4\n" + EICAR_SIGNATURE + b"\n%%EOF"
        upload_res = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("infected_report.pdf", eicar_payload, "application/pdf")},
            headers=headers,
        )
        assert upload_res.status_code == 201
        doc_data = upload_res.json()
        doc_id = doc_data["id"]

        # 1. State must be QUARANTINED and scan_status INFECTED
        assert doc_data["status"] == "quarantined"
        assert doc_data["scan_status"] == "infected"
        assert "EICAR" in doc_data["scan_details"]
        assert doc_data["quarantined_at"] is not None

        # 2. Downloading quarantined document MUST be forbidden (HTTP 403)
        download_res = await ac.get(f"/api/v1/documents/{doc_id}/download", headers=headers)
        assert download_res.status_code == 403
        assert "quarantined" in download_res.json()["detail"].lower()

        # 3. Generating presigned URL for quarantined document MUST be rejected (HTTP 403)
        url_res = await ac.get(f"/api/v1/documents/{doc_id}/presigned-url", headers=headers)
        assert url_res.status_code == 403


@pytest.mark.asyncio
async def test_idor_protection_cross_patient_isolation():
    """Verify that Patient A cannot read, download, or inspect documents belonging to Patient B."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Doctor uploads document for Patient 1 (James Miller)
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        # Fetch patients
        pat_res = await ac.get("/api/v1/patients", headers=doc_headers)
        assert pat_res.status_code == 200
        patients = pat_res.json()["items"]
        patient1_id = next(p["id"] for p in patients if p["email"] == "patient@clinova.ai")
        patient2_id = next(p["id"] for p in patients if p["email"] != "patient@clinova.ai")

        # Upload doc for Patient 2 (NOT James Miller)
        upload_res = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("confidential_patient2_ecg.pdf", b"%PDF-1.4 ECG Heart Waveform Normal%%EOF", "application/pdf")},
            data={"patient_id": patient2_id, "document_type": "imaging_scan"},
            headers=doc_headers,
        )
        assert upload_res.status_code == 201
        doc2_id = upload_res.json()["id"]

        # 2. Patient 1 (James Miller) attempts to access Patient 2's document
        pat1_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "patient@clinova.ai", "password": "ClinovaPatient2026!"},
        )
        pat1_headers = {"Authorization": f"Bearer {pat1_login.json()['access_token']}"}

        # Attempt metadata read -> HTTP 403
        meta_res = await ac.get(f"/api/v1/documents/{doc2_id}", headers=pat1_headers)
        assert meta_res.status_code == 403

        # Attempt download -> HTTP 403
        dl_res = await ac.get(f"/api/v1/documents/{doc2_id}/download", headers=pat1_headers)
        assert dl_res.status_code == 403

        # Attempt presigned url generation -> HTTP 403
        pre_res = await ac.get(f"/api/v1/documents/{doc2_id}/presigned-url", headers=pat1_headers)
        assert pre_res.status_code == 403


@pytest.mark.asyncio
async def test_presigned_time_limited_access_token():
    """Verify generation of HMAC-signed presigned download URLs and expired/tampered token rejection."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        pdf_bytes = b"%PDF-1.4 Presigned Access Test Content%%EOF"
        upload_res = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("presigned_test.pdf", pdf_bytes, "application/pdf")},
            headers=headers,
        )
        doc_id = upload_res.json()["id"]

        # 1. Generate presigned URL (TTL = 300s)
        presigned_res = await ac.get(f"/api/v1/documents/{doc_id}/presigned-url?ttl=300", headers=headers)
        assert presigned_res.status_code == 200
        token_data = presigned_res.json()
        token = token_data["token"]
        assert token_data["ttl_seconds"] == 300

        # 2. Access document WITHOUT Authorization header using token
        access_res = await ac.get(f"/api/v1/documents/{doc_id}/access?token={token}")
        assert access_res.status_code == 200
        assert access_res.content == pdf_bytes
        assert access_res.headers["X-Checksum-SHA256"] == hashlib.sha256(pdf_bytes).hexdigest()

        # 3. Tampered token rejected (HTTP 401)
        tampered_token = token[:-5] + "XXXXX"
        bad_access = await ac.get(f"/api/v1/documents/{doc_id}/access?token={tampered_token}")
        assert bad_access.status_code == 401


@pytest.mark.asyncio
async def test_document_versioning_and_amendments():
    """Verify that amending a document increments version count, links parent pointer, and preserves history."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        # 1. Upload Version 1
        v1_bytes = b"%PDF-1.4 Pathology Report Revision 1 (Preliminary)%%EOF"
        v1_res = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("pathology_report.pdf", v1_bytes, "application/pdf")},
            data={"document_type": "pathology_report"},
            headers=headers,
        )
        v1_data = v1_res.json()
        v1_id = v1_data["id"]
        assert v1_data["version"] == 1
        assert v1_data["is_current_version"] is True

        # 2. Upload Version 2 via Amend endpoint
        v2_bytes = b"%PDF-1.4 Pathology Report Revision 2 (Confirmed Malignancy Negative)%%EOF"
        v2_res = await ac.post(
            f"/api/v1/documents/{v1_id}/amend",
            files={"file": ("pathology_report_amended.pdf", v2_bytes, "application/pdf")},
            headers=headers,
        )
        assert v2_res.status_code == 201
        v2_data = v2_res.json()
        v2_id = v2_data["id"]
        assert v2_data["version"] == 2
        assert v2_data["parent_document_id"] == v1_id
        assert v2_data["is_current_version"] is True

        # 3. Check that Version 1 is no longer current version
        v1_updated = (await ac.get(f"/api/v1/documents/{v1_id}", headers=headers)).json()
        assert v1_updated["is_current_version"] is False

        # 4. Both versions remain independently downloadable (historical preservation)
        dl_v1 = await ac.get(f"/api/v1/documents/{v1_id}/download", headers=headers)
        dl_v2 = await ac.get(f"/api/v1/documents/{v2_id}/download", headers=headers)
        assert dl_v1.content == v1_bytes
        assert dl_v2.content == v2_bytes


@pytest.mark.asyncio
async def test_derived_artifacts_linkage():
    """Verify that derived processing artifacts (OCR text and structured JSON) link correctly to parent document."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        pdf_bytes = b"%PDF-1.4 CBC Blood Analysis Lab Sample%%EOF"
        doc_res = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("blood_analysis.pdf", pdf_bytes, "application/pdf")},
            headers=headers,
        )
        doc_id = doc_res.json()["id"]

        # Attach OCR JSON artifact
        ocr_json_payload = {
            "artifact_type": "ocr_json",
            "filename": "blood_analysis_ocr.json",
            "mime_type": "application/json",
            "content_text": '{"test": "Hemoglobin", "value": 14.2, "unit": "g/dL", "confidence": 0.98}',
        }
        art_res = await ac.post(
            f"/api/v1/documents/{doc_id}/artifacts",
            json=ocr_json_payload,
            headers=headers,
        )
        assert art_res.status_code == 201
        art_data = art_res.json()
        assert art_data["document_id"] == doc_id
        assert art_data["artifact_type"] == "ocr_json"
        assert len(art_data["checksum_sha256"]) == 64

        # Retrieve detailed document with artifacts
        detail_res = await ac.get(f"/api/v1/documents/{doc_id}", headers=headers)
        detail_data = detail_res.json()
        assert len(detail_data["artifacts"]) == 1
        assert detail_data["artifacts"][0]["id"] == art_data["id"]


@pytest.mark.asyncio
async def test_soft_deletion_and_retention_compliance():
    """Verify that deleting a document performs a soft-deletion and marks it ARCHIVED without deleting evidence."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        pdf_bytes = b"%PDF-1.4 Document to be Archived%%EOF"
        doc_res = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("retention_test.pdf", pdf_bytes, "application/pdf")},
            headers=headers,
        )
        doc_id = doc_res.json()["id"]

        # 1. Soft-delete document
        del_res = await ac.delete(f"/api/v1/documents/{doc_id}", headers=headers)
        assert del_res.status_code == 200
        assert del_res.json()["message"] == "Document archived successfully."

        # 2. Excluded from default listing
        list_res = await ac.get("/api/v1/documents?include_deleted=false", headers=headers)
        doc_ids = [d["id"] for d in list_res.json()["items"]]
        assert doc_id not in doc_ids

        # 3. Included when include_deleted=true
        list_all = await ac.get("/api/v1/documents?include_deleted=true", headers=headers)
        all_doc_ids = [d["id"] for d in list_all.json()["items"]]
        assert doc_id in all_doc_ids

        # 4. Attempting to download deleted document returns HTTP 410 GONE
        dl_res = await ac.get(f"/api/v1/documents/{doc_id}/download", headers=headers)
        assert dl_res.status_code == 410


@pytest.mark.asyncio
async def test_large_file_streaming_benchmark():
    """Verify that large medical files (10MB+) stream through the upload and download pipeline without error."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        # Generate a 10MB synthetic medical scan (PDF header followed by patterned binary bytes)
        chunk = b"CLINOVA_DICOM_CHUNK_STREAMING_TEST_PATTERN_0123456789ABCDEF" * 16384  # ~1 MB
        ten_mb_stream = b"%PDF-1.4\n" + (chunk * 10) + b"\n%%EOF"
        expected_checksum = hashlib.sha256(ten_mb_stream).hexdigest()

        upload_res = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("high_res_mri_scan.pdf", ten_mb_stream, "application/pdf")},
            data={"document_type": "imaging_scan"},
            headers=headers,
        )
        assert upload_res.status_code == 201
        doc_data = upload_res.json()
        doc_id = doc_data["id"]
        assert doc_data["file_size_bytes"] == len(ten_mb_stream)
        assert doc_data["checksum_sha256"] == expected_checksum

        # Download and verify streaming response integrity
        download_res = await ac.get(f"/api/v1/documents/{doc_id}/download", headers=headers)
        assert download_res.status_code == 200
        assert download_res.headers["X-Checksum-SHA256"] == expected_checksum
        assert len(download_res.content) == len(ten_mb_stream)
        assert download_res.content == ten_mb_stream


@pytest.mark.asyncio
async def test_cross_facility_document_isolation():
    """Verify that a doctor from Facility A cannot access documents from Facility B."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        admin_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "admin@clinova.ai", "password": "ClinovaAdmin2026!"},
        )
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # 1. Fetch facilities
        fac_res = await ac.get("/api/v1/facilities", headers=admin_headers)
        fac_data = fac_res.json()
        facilities = fac_data.get("items", fac_data) if isinstance(fac_data, dict) else fac_data
        assert len(facilities) >= 2
        fac1_id = facilities[0]["id"]
        fac2_id = facilities[1]["id"]

        # Create doctor in Facility 2 with unique email
        doc_f2_email = f"doctor_{uuid.uuid4().hex[:8]}@facility2.clinova.ai"
        reg_res = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": doc_f2_email,
                "password": "Password123!",
                "full_name": "Dr. Facility Two, MD",
                "role": "doctor",
                "facility_id": fac2_id,
            },
        )
        assert reg_res.status_code == 201
        doc_f2_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": doc_f2_email, "password": "Password123!"},
        )
        doc_f2_headers = {"Authorization": f"Bearer {doc_f2_login.json()['access_token']}"}

        # 2. Upload document explicitly assigned to Facility 1
        doc_f1_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        doc_f1_headers = {"Authorization": f"Bearer {doc_f1_login.json()['access_token']}"}

        f1_upload = await ac.post(
            "/api/v1/documents/upload",
            files={"file": ("facility1_record.pdf", b"%PDF-1.4 Facility 1 Exclusive Clinical Document%%EOF", "application/pdf")},
            data={"facility_id": fac1_id, "document_type": "clinical_note"},
            headers=doc_f1_headers,
        )
        assert f1_upload.status_code == 201
        f1_doc_id = f1_upload.json()["id"]

        # 3. Doctor from Facility 2 attempts to access Facility 1 document -> HTTP 403
        f2_access = await ac.get(f"/api/v1/documents/{f1_doc_id}", headers=doc_f2_headers)
        assert f2_access.status_code == 403
        assert "Cross-facility access denied" in f2_access.json()["detail"]

        f2_download = await ac.get(f"/api/v1/documents/{f1_doc_id}/download", headers=doc_f2_headers)
        assert f2_download.status_code == 403


@pytest.mark.asyncio
async def test_anonymous_access_strictly_denied():
    """Verify that unauthenticated requests to document endpoints are denied with HTTP 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Upload, list, read, download without token
        res_list = await ac.get("/api/v1/documents")
        assert res_list.status_code == 401

        res_read = await ac.get("/api/v1/documents/non-existent-id")
        assert res_read.status_code == 401

        res_dl = await ac.get("/api/v1/documents/non-existent-id/download")
        assert res_dl.status_code == 401


@pytest.mark.asyncio
async def test_document_search_filtering_and_pagination():
    """Verify document listing with filename search, document_type, and pagination."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        headers = {"Authorization": f"Bearer {doc_login.json()['access_token']}"}

        # Upload two uniquely named documents
        unique_name_1 = "unique_biopsy_histology_9912.pdf"
        unique_name_2 = "routine_urinalysis_panel_8821.pdf"

        await ac.post(
            "/api/v1/documents/upload",
            files={"file": (unique_name_1, b"%PDF-1.4 Biopsy Sample%%EOF", "application/pdf")},
            data={"document_type": "pathology_report"},
            headers=headers,
        )
        await ac.post(
            "/api/v1/documents/upload",
            files={"file": (unique_name_2, b"%PDF-1.4 Urinalysis Sample%%EOF", "application/pdf")},
            data={"document_type": "lab_result"},
            headers=headers,
        )

        # Search by term "biopsy"
        search_res = await ac.get("/api/v1/documents?search=biopsy", headers=headers)
        assert search_res.status_code == 200
        search_items = search_res.json()["items"]
        assert any(unique_name_1 in d["filename"] for d in search_items)
        assert not any(unique_name_2 in d["filename"] for d in search_items)

        # Filter by document_type = lab_result
        filter_res = await ac.get("/api/v1/documents?document_type=lab_result", headers=headers)
        assert filter_res.status_code == 200
        for doc in filter_res.json()["items"]:
            assert doc["document_type"] == "lab_result"

        # Pagination test limit=1
        page_res = await ac.get("/api/v1/documents?limit=1&skip=0", headers=headers)
        assert page_res.status_code == 200
        assert len(page_res.json()["items"]) == 1
        assert page_res.json()["total"] >= 2
