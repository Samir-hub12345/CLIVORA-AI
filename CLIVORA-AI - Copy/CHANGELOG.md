# Changelog

All notable changes to the **CLINOVA AI** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

> [!WARNING]
> ### 🔒 Clinical Safety & Non-Diagnostic Notice
> **Educational prototype and triage-support purposes only.** CLINOVA AI does not diagnose, prescribe treatment, or replace a qualified medical professional. All AI-generated triage suggestions require human review and clinician sign-off prior to medical action.

---

## Status Matrix: Implemented vs. Planned Capabilities

| Capability Domain | Implemented & Verified in Codebase | Planned Architecture Roadmap |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 14 App Router, Tailwind CSS, Lucide Icons, Clinical Amber Disclaimer, 6-state Voice Capture, CBC OCR Uploader, Timeline View, Referral Note Generator. | Mobile-optimized PWA for offline ASHA worker tablet deployment. |
| **Backend REST API** | FastAPI (Python 3.12/3.14), Uvicorn ASGI, Pydantic v2 validation, Async SQLAlchemy 2.0. | Streaming WebSocket endpoint for live speech transcription chunking. |
| **Database & Cache** | PostgreSQL 16 (EHR, Cases, Consultations, Audit logs) + Redis 7 caching. | IndexedDB / SQLite with CRDTs for local offline multi-device sync. |
| **Authentication & RBAC** | JWT (HS256) with role enforcement (`doctor`, `nurse`, `patient`, `admin`). | ABHA (Ayushman Bharat Health Account) / ABDM federated login integration. |
| **Triage & Acuity** | Deterministic Risk Signal Engine (`TRIAGE-R01` to `TRIAGE-R06`) with transparent provenance tags. | Manchester Triage System (MTS) expanded pediatric scoring matrix. |
| **Speech Processing** | Multilingual browser audio capture with Odia and Hindi test playback & mock STT. | Dedicated local OpenAI Whisper or Bhashini STT container runtime. |
| **Language Support** | Odia, Hindi, and English symptom normalization preserving raw vernacular inputs. | Local IndicTrans2 neural translation service for 22 scheduled Indian languages. |
| **Report Processing** | CBC blood panel OCR extraction with confidence metrics and human verification checks. | Full multi-page PDF & handwritten doctor prescription parsing via PaddleOCR/Tesseract. |
| **AI Integration** | Google Gemini API integration with instant local fallback (`DEMO_MODE=True`). | Local fine-tuned SLM (Small Language Model) inference container for zero-cloud PHCs. |
| **Privacy & Security** | In-flight PII redaction for phone numbers, emails, and 12-digit Indian government IDs (Aadhaar). | Cryptographic zero-knowledge verification of patient consent. |
| **Quality Assurance** | 15 automated Pytest unit/integration tests covering core endpoints, models, and rules. | End-to-end Playwright UI test suite and load simulation for high-volume disaster triage. |

---

## [Unreleased] - Planned Features & Roadmap

The following capabilities are specified in the system architecture blueprints but are not yet implemented in the current codebase:

### Planned
- **Dedicated Neural Speech-to-Text Pipeline**: Deployment of an on-premise OpenAI Whisper or Government of India Bhashini STT service for live acoustic audio ingestion.
- **IndicTrans2 Translation Engine**: Integration of local open-weight IndicTrans2 models for high-fidelity translation across scheduled Indian languages.
- **Handwritten Prescription OCR**: Vision model fine-tuning with PaddleOCR and Tesseract to extract doctor handwriting from physical OPD paper slips.
- **Zero-Connectivity CRDT Synchronization**: Client-side IndexedDB caching and Conflict-Free Replicated Data Types (CRDT) to allow health workers to intake patients in rural areas without cellular network coverage and auto-sync when online.
- **ABDM / ABHA Sandbox Integration**: Direct Ayushman Bharat Digital Mission interoperability for pulling patient health records (PHR) via Unified Health Interface (UHI).
- **Acoustic Biomarker Harvesting**: Machine-learning acoustic profiling of respiratory sounds and cough spectral patterns for non-invasive respiratory triage assistance.
- **Hospital Bed & Oxygen Telemetry**: Real-time referral capacity matching with regional district hospital bed availability.

---

## [0.2.0] - 2026-09-18

### Context
Major milestone adding the complete multimodal triage intake pipeline, public health demo scenarios, deterministic clinical risk engine, case review human gate, and printable referral notes in accordance with the Multimodal Healthcare Triage Specification (PS03).

### Added
- **4-Step Multimodal Intake Wizard (`/intake`)**:
  - Step 1: Demo consent acknowledgement and clinical demographic context (age, gender, facility type, visit type, language).
  - Step 2: Symptom capture supporting autosizing text narrative and 6-state audio recording with Odia/Hindi sample playback.
  - Step 3: Complete Blood Count (CBC) report OCR uploader with auto-extracted parameters, confidence scores, and manual correction checkboxes.
  - Step 4: Verification review and submission to the prioritized clinical queue.
- **Prioritized Reviewer Queue (`/review`)**:
  - Acuity-stratified queue views (`URGENT REVIEW`, `PRIORITY`, `ROUTINE`).
  - Deterministic rule attribution badges (`TRIAGE-R01` to `TRIAGE-R06`) displaying exact clinical triggers.
  - Quick action routing into individual case review sessions.
- **Medical Officer Case Review & Human Gate (`/review/case/[caseId]`)**:
  - Chronological symptom progression timeline view (Day 1, Day 2, Day 3).
  - Explainable provenance badges linking extracted notes to original source inputs (patient narrative, audio transcript, or lab report).
  - Interactive decision gate for attending clinicians: Confirm & Approve Note, Edit Summary, Reject, or Escalate.
  - One-click privacy data purge to securely erase audio transcripts and temporary case buffers.
- **Printable Referral Support Document (`/review/case/[caseId]/referral`)**:
  - Standardized, high-contrast referral document ready for district hospital transfer.
  - Browser print stylesheet with automatic PDF generation trigger.
- **6 Public Health Demo Scenarios (`/demo`)**:
  - Pre-configured clinical triage scenarios for interactive demonstration:
    1. *CLV-DEMO-001*: Campus acute fever outbreak with dyspnea (Odia).
    2. *CLV-DEMO-002*: Agrarian deep laceration with active hemorrhage (Hindi).
    3. *CLV-DEMO-003*: Pediatric high fever and dehydration alert (Odia).
    4. *CLV-DEMO-004*: Geriatric crushing retrosternal chest pain (English).
    5. *CLV-DEMO-005*: Thrombocytopenia / Platelet deficiency alert (CBC OCR).
    6. *CLV-DEMO-006*: Routine corporate occupational health follow-up.
- **Deterministic Risk Signal Engine (`backend/app/services/risk_engine.py`)**:
  - Transparent, explainable rule checks that evaluate symptom patterns and lab ranges:
    - `TRIAGE-R01`: Severe respiratory distress (stridor, cyanosis, severe dyspnea).
    - `TRIAGE-R02`: Acute cardiovascular emergency (crushing chest pain radiating to left arm/jaw).
    - `TRIAGE-R03`: Severe active hemorrhage or profuse bleeding.
    - `TRIAGE-R04`: Acute focal neurological deficit (facial droop, slurred speech).
    - `TRIAGE-R05`: High sustained infectious fever or epidemic outbreak signal.
    - `TRIAGE-R06`: Routine non-urgent clinical presentation.
- **In-Flight PII Anonymization Layer (`backend/app/services/anonymizer.py`)**:
  - Automated regex redaction scrubbing phone numbers (`[PHONE_REMOVED]`), email addresses (`[EMAIL_REDACTED]`), and 12-digit Indian government IDs / Aadhaar numbers (`[GOVT_ID_REDACTED]`) before database storage or AI processing.
- **Multilingual Normalization Services (`backend/app/services/`)**:
  - `speech_service.py`: 6-state speech transcription service with Odia and Hindi test simulations.
  - `translation_service.py`: Regional language translation normalizing vernacular input into concise clinical English while safeguarding raw transcripts.
  - `ocr_service.py`: CBC lab report parser evaluating Hemoglobin, Platelets, Total Leucocyte Count (WBC), and Red Blood Cells (RBC) with threshold anomaly alerts.
- **AI Integration with Zero-Cloud Fallback (`backend/app/services/ai/gemini_service.py`)**:
  - Google Gemini API integration for structured clinical summarization.
  - Built-in local mock fallback activating when `GEMINI_API_KEY` is empty, ensuring 100% offline demonstration capability.
- **New API Routes (`backend/app/api/v1/endpoints/`)**:
  - `cases.py`: CRUD endpoints and queue management for triage cases (`GET /api/v1/cases`, `GET /api/v1/cases/queue`, `POST /api/v1/cases`).
  - `intake.py`: Ingestion endpoints (`/api/v1/intake/transcribe`, `/api/v1/intake/translate`, `/api/v1/intake/ocr-report`).
  - `review.py`: Human gate review and referral endpoints (`/api/v1/review/{case_id}/approve`, `/api/v1/review/{case_id}/reject`, `/api/v1/review/{case_id}/escalate`, `/api/v1/review/{case_id}/generate-referral`).

### Changed
- **Landing Page (`frontend/src/app/page.tsx`)**:
  - Redesigned with prominent amber Non-Diagnostic Disclaimer, architecture diagrams, India-wide facility relevance (PHCs, outreach camps, district hospitals), and direct navigation to multimodal intake.
- **Header Navigation (`frontend/src/components/common/header.tsx`)**:
  - Added dedicated navigation links for Intake, Review Queue, Demo Scenarios, and EHR portals with active route indicators and role displays.
- **Backend Startup Lifespan (`backend/app/main.py`)**:
  - Configured automatic table initialization via SQLAlchemy async metadata and pre-seeding of the 6 public health triage cases (`CLV-DEMO-001` through `CLV-DEMO-006`).
- **Configuration Management (`backend/app/core/config.py`)**:
  - Added prototype settings: `DEMO_MODE=True`, `LLM_PROVIDER`, `STT_PROVIDER`, `OCR_PROVIDER`, `TRANSLATION_PROVIDER`, and `DEFAULT_FACILITY`.

### Fixed
- **Audio Capture State Management**: Prevented unhandled microphone permission rejections by implementing a safe 6-state machine in `voice-recorder.tsx`.
- **Offline Reliability**: Resolved hard dependency on external cloud APIs by routing requests to local mock services when API keys are absent.

### Documentation
- **Architecture Specification (`ARCHITECTURE.md`)**: Comprehensive blueprint covering current vs. planned architecture, system goals, non-goals, data flow, and directory structure.
- **Contributor Handbook (`CONTRIBUTING.md`)**: Beginner-friendly 18-section guide detailing environment setup, Docker commands, branching conventions, validation checklists, and clinical safety tenets.
- **Readme Enhancement (`README.md`)**: Updated with 3-minute demonstration workflow, architecture schematics, and single-command startup instructions.

### Infrastructure
- **Docker Compose Stack (`docker-compose.yml`)**:
  - Orchestrated multi-service local environment with `backend` (FastAPI:8000), `frontend` (Next.js:3000), `db` (PostgreSQL 16:5432), and `redis` (Redis 7:6379).

---

## [0.1.0] - 2026-09-16

### Context
Initial foundational release establishing the core electronic health record (EHR) data models, authentication security, clinical consultation workflows, and initial REST API endpoints.

### Added
- **FastAPI Backend Framework**:
  - Asynchronous application setup with CORS middleware and modular v1 router hierarchy.
  - Database connectivity using SQLAlchemy 2.0 async engine and `asyncpg` driver.
  - Redis connection manager for cache and queue state.
- **Security & Authentication System**:
  - Password hashing with Bcrypt via `passlib`.
  - JWT token generation and validation (HS256) via `python-jose`.
  - Role-Based Access Control (RBAC) with 4 distinct roles: `doctor`, `nurse`, `patient`, `admin`.
  - Auth endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, and `GET /api/v1/auth/me`.
- **Patient EHR Records (`backend/app/api/v1/endpoints/patients.py`)**:
  - Relational `Patient` database model with Medical Record Number (MRN), demographics, blood group, allergies, active medications, and chronic medical history.
  - CRUD endpoints for patient chart creation, lookup, and updates.
- **Clinical Consultations (`backend/app/api/v1/endpoints/consultations.py`)**:
  - `Consultation` model recording chief complaints, physiological vitals, SOAP structure (Subjective, Objective, Assessment, Plan), and triage levels.
  - Endpoints to schedule, conduct, and finalize patient encounters.
- **Initial AI Decision Support (`backend/app/api/v1/endpoints/ai_assist.py`)**:
  - Basic clinical summarization and differential diagnosis suggestions with prominent non-diagnostic disclaimers.
- **Immutable Audit Logging (`backend/app/api/v1/endpoints/audit.py`)**:
  - `AuditLog` database model capturing user ID, client IP address, action performed, resource affected, and UTC timestamp for medicolegal compliance.
- **Next.js 14 Web Application**:
  - Initial pages for authentication (`/login`, `/register`), provider dashboard (`/dashboard`), patient registry (`/patients`), encounter history (`/consultations`), and compliance audit trail (`/audit`).
  - Tailwind CSS design system with customized clinical color tokens (teal, navy, emerald, amber, rose).
- **Automated Pytest Suite**:
  - Asynchronous HTTP test fixtures via `httpx.AsyncClient`.
  - Initial tests for health endpoints, authentication workflows, patient record manipulation, and audit generation.

### Infrastructure
- **Containerization**:
  - `backend/Dockerfile` with Python 3.12-slim base image.
  - `frontend/Dockerfile` with Node.js 18-alpine multi-stage build.
  - `docker-compose.yml` defining interconnected network and persistent volume mounts.
- **Environment Templates**:
  - Root `.env.example`, `backend/.env.example`, and `frontend/.env.example`.
- **Git Repository Configuration**:
  - Comprehensive `.gitignore` protecting secrets, build caches, virtual environments, and node modules.

---

[Unreleased]: https://github.com/Samir-hub12345/CLINOVA-AI/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Samir-hub12345/CLINOVA-AI/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Samir-hub12345/CLINOVA-AI/releases/tag/v0.1.0
