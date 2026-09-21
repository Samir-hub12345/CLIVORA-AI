import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_full_role_workflow_and_rbac():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 1. Authenticate Doctor
        doc_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "doctor@clinova.ai", "password": "ClinovaDoctor2026!"},
        )
        assert doc_login.status_code == 200
        doc_token = doc_login.json()["access_token"]
        doc_headers = {"Authorization": f"Bearer {doc_token}"}

        # 2. Authenticate Staff (Nurse)
        staff_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "staff@clinova.ai", "password": "ClinovaStaff2026!"},
        )
        assert staff_login.status_code == 200
        staff_token = staff_login.json()["access_token"]
        staff_headers = {"Authorization": f"Bearer {staff_token}"}

        # 3. Authenticate Patient
        pat_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "patient@clinova.ai", "password": "ClinovaPatient2026!"},
        )
        assert pat_login.status_code == 200
        pat_token = pat_login.json()["access_token"]
        pat_headers = {"Authorization": f"Bearer {pat_token}"}

        # 4. Authenticate Admin
        admin_login = await ac.post(
            "/api/v1/auth/login",
            json={"email": "admin@clinova.ai", "password": "ClinovaAdmin2026!"},
        )
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # -------------------------------------------------------------
        # STEP A: PATIENT INTAKE CREATION & PATIENT ME PROFILE
        # -------------------------------------------------------------
        # Verify patient chart profile
        pat_me = await ac.get("/api/v1/patients/me", headers=pat_headers)
        assert pat_me.status_code == 200
        assert pat_me.json()["email"] == "patient@clinova.ai"

        # Patient creates new intake
        intake_payload = {
            "raw_symptoms": "Mild persistent headache for 2 days, no fever, BP normal.",
            "preferred_language": "en",
            "facility_type": "Government Hospital",
            "visit_type": "Outpatient",
            "approximate_age": 35,
            "gender": "Male",
            "consent_acknowledged": True,
        }
        create_res = await ac.post(
            "/api/v1/cases", json=intake_payload, headers=pat_headers
        )
        assert create_res.status_code == 201
        case_data = create_res.json()
        case_id = case_data["synthetic_case_id"]
        assert case_data["status"] == "awaiting_review"
        assert case_data["patient_id"] is not None

        # Patient lists their own cases
        pat_cases = await ac.get("/api/v1/portal/cases", headers=pat_headers)
        assert pat_cases.status_code == 200
        case_ids = [c["synthetic_case_id"] for c in pat_cases.json()]
        assert case_id in case_ids

        # -------------------------------------------------------------
        # STEP B: STAFF INTAKE VERIFICATION & VITALS CAPTURE
        # -------------------------------------------------------------
        verify_payload = {
            "verified": True,
            "vitals": {
                "blood_pressure": "122/80",
                "heart_rate": "74",
                "oxygen_saturation": "99",
                "temperature": "36.8",
            },
            "staff_notes": "Patient seated in bay 2. Vitals stable. Alert and oriented.",
            "route_to_doctor_name": "Dr. Sarah Chen, MD",
            "route_to_department": "General Medicine",
        }
        verify_res = await ac.post(
            f"/api/v1/cases/{case_id}/verify-intake",
            json=verify_payload,
            headers=staff_headers,
        )
        assert verify_res.status_code == 200
        verified_case = verify_res.json()
        assert verified_case["status"] == "ready_for_doctor"
        assert verified_case["intake_verified"] is True
        assert verified_case["vitals"]["blood_pressure"] == "122/80"
        assert verified_case["assigned_doctor_name"] == "Dr. Sarah Chen, MD"

        # -------------------------------------------------------------
        # STEP C: DOCTOR CLINICAL DECISION & REVIEW ACTION
        # -------------------------------------------------------------
        # Unauthenticated review action must be rejected (401)
        unauth_action = await ac.post(
            f"/api/v1/cases/{case_id}/verify-intake",
            json={"verified": True},
        )
        assert unauth_action.status_code == 401

        # Patient attempting clinician action must be denied (403)
        patient_review = await ac.post(
            f"/api/v1/review/{case_id}/action",
            json={"action": "approve", "reviewer_notes": "Attempting illegal review"},
            headers=pat_headers,
        )
        assert patient_review.status_code == 403

        # Doctor performs authorized approval
        doc_review = await ac.post(
            f"/api/v1/review/{case_id}/action",
            json={
                "action": "approve",
                "reviewer_notes": "Tension headache presentation. Hydration and rest advised.",
            },
            headers=doc_headers,
        )
        assert doc_review.status_code == 200
        approved_case = doc_review.json()
        assert approved_case["status"] == "approved"
        assert approved_case["reviewer_name"] == "Dr. Sarah Chen, MD"
        assert approved_case["approved_at"] is not None

        # -------------------------------------------------------------
        # STEP D: REFERRAL NOTE GENERATION
        # -------------------------------------------------------------
        referral_res = await ac.get(
            f"/api/v1/review/{case_id}/referral", headers=doc_headers
        )
        assert referral_res.status_code == 200
        ref_data = referral_res.json()
        assert ref_data["synthetic_case_id"] == case_id
        assert "disclaimer" in ref_data["footer_disclaimer"].lower() or "not a diagnosis" in ref_data["footer_disclaimer"].lower()

        # -------------------------------------------------------------
        # STEP E: ADMIN FACILITY & USER GOVERNANCE
        # -------------------------------------------------------------
        # Non-admin attempting to list users is denied (403)
        unauth_users = await ac.get("/api/v1/auth/users", headers=pat_headers)
        assert unauth_users.status_code == 403

        # Admin lists facility users
        admin_users = await ac.get("/api/v1/auth/users", headers=admin_headers)
        assert admin_users.status_code == 200
        users_list = admin_users.json()
        assert len(users_list) >= 4
        emails = [u["email"] for u in users_list]
        assert "doctor@clinova.ai" in emails
        assert "staff@clinova.ai" in emails
        assert "patient@clinova.ai" in emails
        assert "admin@clinova.ai" in emails
