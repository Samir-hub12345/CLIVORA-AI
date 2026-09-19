# CLINOVA AI â€” Testing & Quality Assurance Handbook

**Document Version:** 1.0.0  
**Target Audience:** Software developers, clinical informatics testers, DevOps engineers, and QA reviewers  
**Current Release:** v0.2.0 (Integrated Staging)  

---

> [!WARNING]
> ### ðŸ”’ Clinical Safety & Testing Philosophy
> **Zero-Risk Testing Mandate.** CLINOVA AI enforces a strict synthetic-only testing policy. Real patient health information (PHI) or identifiable clinical data must never be used in unit tests, integration tests, or mock datasets. Every clinical urgency rule must be rigorously tested against deterministic criteria to prevent clinical triage regressions.

---

## Table of Contents

1. [Testing Philosophy & Quality Principles](#1-testing-philosophy--quality-principles)
2. [Backend Test Suite Inventory](#2-backend-test-suite-inventory)
3. [Running Tests Locally](#3-running-tests-locally)
4. [Standalone Unit Testing (Zero Backing Services)](#4-standalone-unit-testing-zero-backing-services)
5. [Full Integration Testing (Docker Backed)](#5-full-integration-testing-docker-backed)
6. [Frontend Testing & Static Analysis](#6-frontend-testing--static-analysis)
7. [Clinical Safety Regression Checklist](#7-clinical-safety-regression-checklist)

---

## 1. Testing Philosophy & Quality Principles

Testing clinical decision support software carries profound ethical and clinical responsibilities:
- **Zero Real PHI / PII**: All test suites utilize purely synthetic clinical presentations (`CLV-DEMO-xxx`) and fictitious laboratory values.
- **Deterministic Triage Invariants**: Clinical urgency rules (`TRIAGE-R01` to `TRIAGE-R06`) are deterministic and auditable. Tests must assert that life-threatening symptoms (dyspnea, acute chest pain, active hemorrhage) *always* trigger `URGENT REVIEW` without exception.
- **Offline Resiliency Verification**: Tests must prove that the system functions correctly in air-gapped rural deployments when external AI cloud APIs are unavailable.

---

## 2. Backend Test Suite Inventory

The backend test suite (`backend/tests/`) contains 15 automated test cases executed via Pytest and `pytest-asyncio`:

```text
backend/tests/
â”œâ”€â”€ conftest.py               # Shared test fixtures & async database engine
â”œâ”€â”€ test_risk_engine.py       # Deterministic clinical risk rules & PII redaction (6 tests)
â”œâ”€â”€ test_health.py            # Service health probe & root metadata (2 tests)
â”œâ”€â”€ test_ai.py                # AI clinical triage & SOAP note synthesis (2 tests)
â”œâ”€â”€ test_auth.py              # JWT authentication & credential validation (2 tests)
â”œâ”€â”€ test_patients.py          # EHR patient registry CRUD lifecycle (1 test)
â”œâ”€â”€ test_consultations.py     # Clinical consultation management (1 test)
â””â”€â”€ test_audit.py             # Medicolegal audit logging persistence (1 test)
```

### 2.1 Test Module Breakdown

| Test File | Test Case Name | Target Subsystem | Description |
| :--- | :--- | :--- | :--- |
| `test_risk_engine.py` | `test_anonymizer_phone_and_email` | PII Anonymizer | Verifies masking of 10-digit Indian phones and emails. |
| `test_risk_engine.py` | `test_anonymizer_aadhaar` | PII Anonymizer | Verifies that 12-digit Indian Aadhaar sequences are redacted. |
| `test_risk_engine.py` | `test_risk_engine_breathing_urgency` | Risk Engine | Verifies dyspnea triggers `TRIAGE-R01` and `urgent-review`. |
| `test_risk_engine.py` | `test_risk_engine_chest_pain_urgency` | Risk Engine | Verifies crushing chest pain triggers `TRIAGE-R04` and `urgent-review`. |
| `test_risk_engine.py` | `test_risk_engine_routine_presentation`| Risk Engine | Verifies mild non-acute symptoms default to `routine`. |
| `test_risk_engine.py` | `test_non_diagnostic_triage_note_structure`| AI Synthesizer | Asserts non-diagnostic disclaimer and timeline schema. |
| `test_health.py` | `test_root_endpoint` | Health Probes | Validates `GET /` returns status online and CLINOVA AI message. |
| `test_health.py` | `test_health_check_endpoint` | Health Probes | Validates `GET /api/v1/health` reports status healthy. |
| `test_ai.py` | `test_ai_triage_clinical_decision_support` | AI Endpoints | Validates decision support recommendations. |
| `test_ai.py` | `test_ai_soap_synthesis` | AI Endpoints | Asserts structured SOAP format output from narrative synthesizer. |
| `test_auth.py` | `test_auth_flow` | Security / Auth | Tests user registration, login, and HS256 JWT generation. |
| `test_auth.py` | `test_login_invalid_credentials` | Security / Auth | Asserts HTTP 401 Unauthorized upon submitting incorrect passwords. |
| `test_patients.py` | `test_patient_crud_flow` | EHR Registry | Tests patient creation, retrieval, updating, and search. |
| `test_consultations.py`| `test_consultation_lifecycle` | EHR Registry | Tests consultation creation, status transitions, and clinician binding. |
| `test_audit.py` | `test_audit_logging_trail` | Audit Logging | Confirms append-only audit events are immutably persisted. |

---

## 3. Running Tests Locally

### 3.1 Prerequisites
- Python 3.12+ (or 3.14) with virtual environment active.
- Dependencies installed via `pip install -r requirements.txt`.

### 3.2 Configuration (`backend/pytest.ini`)
```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --tb=short
```

---

## 4. Standalone Unit Testing (Zero Backing Services)

The deterministic risk engine, PII security sanitizer, and basic health endpoints run without database or Redis connectivity. You can execute them instantly:

```bash
# From backend/ directory
python -m pytest tests/test_risk_engine.py tests/test_health.py -v
```

Expected output:
```text
tests/test_risk_engine.py::test_anonymizer_phone_and_email PASSED        [ 12%]
tests/test_risk_engine.py::test_anonymizer_aadhaar PASSED                [ 25%]
tests/test_risk_engine.py::test_risk_engine_breathing_urgency PASSED     [ 37%]
tests/test_risk_engine.py::test_risk_engine_chest_pain_urgency PASSED    [ 50%]
tests/test_risk_engine.py::test_risk_engine_routine_presentation PASSED  [ 62%]
tests/test_risk_engine.py::test_non_diagnostic_triage_note_structure PASSED [ 75%]
tests/test_health.py::test_root_endpoint PASSED                          [ 87%]
tests/test_health.py::test_health_check_endpoint PASSED                  [100%]
============================== 8 passed in 0.09s ==============================
```

---

## 5. Full Integration Testing (Docker Backed)

For tests involving PostgreSQL EHR persistence, authentication, and audit trails:

### Step 1: Start Backing Services
```bash
# From project root
docker compose up -d db redis
```

### Step 2: Run Complete Pytest Suite
```bash
# Windows PowerShell
cd backend
python -m pytest -v

# macOS / Linux
cd backend
pytest -v
```

### Step 3: Run In-Container (Alternative)
```bash
# Run tests directly inside the running backend container
docker compose exec backend pytest -v
```

---

## 6. Frontend Testing & Static Analysis

Frontend testing focuses on TypeScript type correctness, lint standards, and build bundle integrity:

```bash
cd frontend

# 1. Run ESLint checks
npm run lint

# 2. Run TypeScript build verification
npm run build
```

---

## 7. Clinical Safety Regression Checklist

Before submitting a Pull Request or promoting code to staging, verify each item:

- [ ] **Deterministic Rules Intact**: All 6 triage rules (`TRIAGE-R01`â€“`TRIAGE-R06`) correctly trigger their designated priority levels.
- [ ] **PII Scrubbing Enforced**: Phone numbers, email addresses, and 12-digit Aadhaar numbers are masked before database insertion.
- [ ] **Persistent Disclaimer Visible**: Amber clinical safety banner renders across all frontend pages (`/`, `/intake`, `/review`, `/demo`).
- [ ] **Human-in-the-Loop Active**: Automated endpoints do not autonomously write approved clinical notes without clinician action.
- [ ] **Demo Mode Fallback**: Application functions cleanly when `GEMINI_API_KEY` is omitted (`DEMO_MODE=True`).
- [ ] **Voice State Resilience**: 6-state audio capture machine gracefully handles microphone permission denials.
- [ ] **OCR Verification Checkboxes**: Lab values require explicit manual or verified checkboxes before submission.
- [ ] **Referral Note Formatting**: Printable referral page (`/referral`) renders with high contrast and without layout clipping.
- [ ] **Audit Trail Non-Repudiation**: All clinical approvals and edits log the attending user ID, IP address, and UTC timestamp.
- [ ] **Purge Endpoint Functional**: `DELETE /api/v1/cases/{case_id}` permanently purges transient audio recordings and raw scans.
