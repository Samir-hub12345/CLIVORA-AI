# CLINOVA AI

**Multimodal Healthcare Triage Assistant for Government and Institutional Health Facilities**  

---

> [!WARNING]
> ### ðŸ”’ Mandatory Safety & Non-Diagnostic Disclaimer
> **Educational prototype and triage-support purposes only.** This system does **not** diagnose, prescribe treatment, or replace a qualified healthcare professional. All AI-generated information requires human review before clinical action.

---

## ðŸ“‹ Executive Overview

**CLINOVA AI** is an explainable, multimodal, human-in-the-loop healthcare triage support platform engineered for government district hospitals, primary health centers (PHCs), public health outreach camps, industrial health units, and campus clinics. 

The system organizes high-volume patient inputs into structured, reviewer-facing notes to accelerate qualified clinician decision-making:
* **Multimodal Intake**: Voice recording (6-state audio capture), autosizing text symptom narratives, and sample pathology report uploads.
* **Multilingual Normalization**: Preserves regional languages (**Odia**, **Hindi**) while presenting structured English representations for clinician efficiency.
* **Deterministic Risk Signal Engine**: Transparent, explainable rule checks (`TRIAGE-R01` to `TRIAGE-R06`) for immediate breathing, cardiovascular, and hemorrhage attention flags.
* **Report OCR Extraction**: Automatic parameter parsing (e.g. Complete Blood Count / CBC) with confidence scores and verification states.
* **Human-in-the-Loop Review Gate**: Mandatory review interface where medical officers confirm, edit, reject, or escalate notes.
* **Referral Note Preparation**: One-click generation of printable referral support documents for secondary and tertiary healthcare handoffs.
* **Privacy by Design**: Anonymization layer redacting phone numbers, emails, and identification sequences; short retention policy with one-click data deletion.
* **100% Offline / DEMO MODE**: Operates out of the box with zero external API key requirements.

---

## ðŸ›ï¸ Architecture & Data Flow

```text
Patient / Kiosk / Health Worker
               â”‚
               â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚             DEMO CONSENT & CONTEXT           â”‚
â”‚  Age â€¢ Gender â€¢ Facility â€¢ Preferred Lang    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚           MULTIMODAL INTAKE PIPELINE         â”‚
â”‚  Voice (Speech-to-Text) â€¢ Typed Narrative    â”‚
â”‚  Report OCR (CBC Panel) â€¢ Basic Visuals      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚        ANONYMIZATION & PRIVACY LAYER         â”‚
â”‚  PII Redaction â€¢ Synthetic Case ID (CLV-xxx) â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚        INTELLIGENCE & EXTRACTION ENGINE      â”‚
â”‚  Language Normalization (Odia/Hindi -> Eng)  â”‚
â”‚  Timeline Synthesis â€¢ Missing Info Detection â”‚
â”‚  Deterministic Urgency Rules (R01 - R06)     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚          STRUCTURED REVIEWER NOTE            â”‚
â”‚  Chief Concern â€¢ Timeline â€¢ OCR Data â€¢ Flags â”‚
â”‚      *AI GENERATED â€” HUMAN REVIEW REQUIRED*  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
                       â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚             HUMAN REVIEW GATE                â”‚
â”‚       Medical Officer Review Dashboard       â”‚
â”‚    Confirm  â€¢  Edit  â€¢  Reject  â€¢  Escalate  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
               â”‚
               â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚           ACTION & REFERRAL HANDOFF          â”‚
â”‚   Official Referral Note â€¢ Facility Handoff  â”‚
â”‚      Immutable Audit Trail â€¢ Data Purge      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## ðŸ› ï¸ Technology Stack

* **Frontend**: Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons.
* **Backend**: FastAPI (Python 3.12/3.14 on Uvicorn ASGI), Pydantic v2 validation, SQLAlchemy 2.0 (async).
* **Database & Cache**: PostgreSQL 16 (relational EHR and triage records) & Redis 7 (caching and job state).
* **AI & Rules Engine**: Modular provider architecture with Gemini API integration and full deterministic local mock fallback (`DEMO_MODE=true`).
* **Containerization**: Docker & Docker Compose.

---

## ðŸ“š Documentation Index

CLINOVA AI maintains a comprehensive, production-grade technical and clinical documentation suite:

| Document | Primary Focus | Target Audience |
| :--- | :--- | :--- |
| **[docs/DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md)** | Phase 2 full clinical database spec: 18 tables, Mermaid ERD, lifecycles, and indexes. | System Architects, Database Engineers |
| **[docs/PHASE_2_COMPLETION_REPORT.md](docs/PHASE_2_COMPLETION_REPORT.md)** | Phase 2 completion declaration, migration verification, scaling benchmarks, GO verdict. | Technical Leads, Evaluators |
| **[docs/PHASE_2_INSPECTION_REPORT.md](docs/PHASE_2_INSPECTION_REPORT.md)** | Phase 2 pre/post audit, schema gap analysis, and before-vs-after comparison matrix. | System Architects, Auditors |
| **[docs/PHASE_1_COMPLETION_REPORT.md](docs/PHASE_1_COMPLETION_REPORT.md)** | Official Phase 1 completion declaration, verification matrix, test evidence, GO verdict. | Engineering Leads, Evaluators |
| **[docs/PHASE_1_FOUNDATION.md](docs/PHASE_1_FOUNDATION.md)** | Phase 1 technical specification: migrations, object storage, workers, multi-facility. | Backend Engineers, SREs |
| **[docs/PHASE_1_INSPECTION_REPORT.md](docs/PHASE_1_INSPECTION_REPORT.md)** | Baseline freeze and re-inspection matrix for Phase 1 foundation. | System Architects, Auditors |
| **[FEATURES.md](FEATURES.md)** | Multimodal intake, risk engine, queue, review gate, referrals, demo hub. | Clinicians, Product Owners, Developers |
| **[INFRASTRUCTURE.md](INFRASTRUCTURE.md)** | Topology, Docker Compose, ports, PM2, systemd, TLS, hardware profiles. | DevOps, SREs, Systems Administrators |
| **[SECURITY.md](SECURITY.md)** | DISHA/ABDM compliance, PII/Aadhaar scrubbing, JWT, audit logs, purge. | Security Engineers, Compliance Officers |
| **[TESTING.md](TESTING.md)** | Automated test suite (34 tests), Docker testing, frontend build, checklist. | QA Engineers, Backend Developers |
| **[ROADMAP.md](ROADMAP.md)** | Phased roadmap: MTS pediatric matrix, PWA, Bhashini, ABDM, biomarkers. | Clinical Informatics, Engineering Leads |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | End-to-end data flow, neuro-symbolic patterns, subsystem architecture. | Software Architects, Full-Stack Devs |
| **[API_SPECIFICATION.md](API_SPECIFICATION.md)**| REST API endpoints, schemas, authentication, status codes, examples. | Backend & Frontend API Integrators |
| **[clinical-rules.md](clinical-rules.md)** | Deterministic triage rules (`TRIAGE-R01`–`R06`), safety thresholds. | Medical Officers, Informatics Reviewers |
| **[deploy.md](deploy.md)** | Step-by-step production deployment, Docker, bare-metal, disaster recovery. | Infrastructure & DevOps Teams |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Contributor setup, branching, git guidelines, validation checklist. | Open-Source Contributors |
| **[CHANGELOG.md](CHANGELOG.md)** | Semantic release history and implemented vs. planned status matrix. | Maintainers & Evaluators |

---

## ðŸ“ Repository Structure

```text
CLINOVA-AI/
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx                    # Polished healthcare landing page
â”‚   â”‚   â”‚   â”œâ”€â”€ intake/page.tsx             # 4-step Multimodal Intake Wizard
â”‚   â”‚   â”‚   â”œâ”€â”€ review/page.tsx             # Prioritized Reviewer Queue
â”‚   â”‚   â”‚   â”œâ”€â”€ review/case/[caseId]/page.tsx # Case Review & Human Gate
â”‚   â”‚   â”‚   â”œâ”€â”€ review/case/[caseId]/referral/page.tsx # Printable Referral Note
â”‚   â”‚   â”‚   â”œâ”€â”€ demo/page.tsx               # 6 Public Health Demo Scenarios
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/page.tsx          # Provider metrics dashboard
â”‚   â”‚   â”‚   â””â”€â”€ audit/page.tsx              # Audit trail viewer
â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”œâ”€â”€ clinical/                   # Safety banner, voice recorder, OCR uploader, timeline
â”‚   â”‚   â”‚   â”œâ”€â”€ common/                     # Header, footer, navigation
â”‚   â”‚   â”‚   â””â”€â”€ ui/                         # Badges, buttons, cards
â”‚   â”‚   â”œâ”€â”€ lib/                            # API client & auth provider
â”‚   â”‚   â””â”€â”€ types/                          # TypeScript definitions
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ Dockerfile
â”‚
├── backend/
│   ├── alembic/                         # Database schema migrations (Alembic async)
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   │   ├── cases.py                 # Triage cases CRUD & queue
│   │   │   ├── intake.py                # Speech, translation & OCR endpoints
│   │   │   ├── review.py                # Review actions & referral generation
│   │   │   ├── auth.py                  # Authentication & JWT
│   │   │   ├── patients.py              # EHR patient charts & multi-identifiers
│   │   │   ├── encounters.py            # Clinical encounters lifecycle & visits
│   │   │   ├── clinical.py              # Observations/vitals, allergies, meds, notes, diagnoses, referrals, timeline
│   │   │   ├── audit.py                 # HIPAA-ready audit logging
│   │   │   ├── documents.py             # Object storage upload/download & metadata
│   │   │   ├── facilities.py            # Multi-facility & tenant management
│   │   │   ├── jobs.py                  # Background asynchronous task queue
│   │   │   └── health.py                # Liveness & Readiness health probes
│   │   ├── core/                        # Config, security, dependencies, Redis pool
│   │   ├── models/                      # 18 Normalized Entities: Facility, User, Patient, PatientIdentifier,
│   │   │                                # Encounter, ClinicalObservation, Allergy, Medication, Condition,
│   │   │                                # Diagnosis, ClinicalNote, NoteAmendment, AIRun, Referral,
│   │   │                                # TriageCase, Consultation, Document, BackgroundJob, AuditLog
│   │   ├── schemas/                     # Pydantic request/response models & clinical schemas
│   │   ├── services/                    # Anonymizer, RiskEngine, Speech, Translation, OCR, Gemini, Storage, TaskManager
│   │   └── main.py                      # FastAPI factory, DB lifecycle & synthetic seed data
│   ├── tests/                           # Automated Pytest suite (34 passing tests)
│   ├── requirements.txt
│   └── Dockerfile
│
├── docs/                                # Clinical architecture & phase reports
│   ├── DATABASE_ARCHITECTURE.md         # Comprehensive ER diagram, schemas, lifecycles, and indexes
│   ├── PHASE_2_COMPLETION_REPORT.md     # Phase 2 verification report & GO decision
│   ├── PHASE_2_INSPECTION_REPORT.md     # Phase 2 baseline freeze and re-inspection matrix
│   ├── PHASE_1_COMPLETION_REPORT.md     # Phase 1 verification report & GO decision
│   ├── PHASE_1_FOUNDATION.md            # Architecture, models, security & storage specs
│   └── PHASE_1_INSPECTION_REPORT.md     # Baseline freeze & re-inspection matrix for Phase 1
│
├── docker-compose.yml
├── .env.example
├── README.md
├── FEATURES.md
├── INFRASTRUCTURE.md
├── SECURITY.md
├── TESTING.md
├── ROADMAP.md
├── ARCHITECTURE.md
├── API_SPECIFICATION.md
├── clinical-rules.md
├── deploy.md
├── CONTRIBUTING.md
└── CHANGELOG.md
```

---

## âš¡ Quickstart Commands (Windows PowerShell)

### Option 1: One-Command Startup with Docker Compose (Recommended)

```powershell
docker compose up --build
```

Access the services:
* **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
* **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend Root Health**: [http://localhost:8000/health](http://localhost:8000/health)
* **Process Liveness Probe**: [http://localhost:8000/api/v1/health/live](http://localhost:8000/api/v1/health/live)
* **System Readiness Probe**: [http://localhost:8000/api/v1/health/ready](http://localhost:8000/api/v1/health/ready) *(validates PostgreSQL query + Redis ping)*

---

### Database Migrations (Alembic Async)

Apply all database schema migrations to head revision:

```powershell
docker compose exec backend alembic upgrade head
```

Verify current active migration revision:

```powershell
docker compose exec backend alembic current
```

---

### Option 2: Local Development Setup

#### Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

---

## 🧪 Running Automated Tests

### Backend Pytest Suite (34 Tests — 100% Pass Rate)

Run the full automated test suite inside the container:

```powershell
docker compose exec backend pytest -v
```

*Tests cover:*
* **Phase 2 Clinical Architecture (11 tests):** Clinical encounters lifecycle, discrete observations/vitals & LOINC verification, allergies & intolerances, medication regimens, diagnoses with AI attribution & clinician verification, clinical notes immutability & amendment audit tracking, referral management, multi-tenancy cross-facility isolation, patient multi-system identifiers & auto-MRN, longitudinal patient timeline aggregation, and synthetic scale benchmark (1,000+ observations < 5ms).
* **Phase 1 Foundation & Security (23 tests):** Anonymization, Aadhaar redaction, Risk engine breathing/cardiovascular rules, Routine presentations, Non-diagnostic triage note synthesis, Consultation lifecycle, EHR patient CRUD, Authentication, IDOR cross-patient isolation (OWASP API1:2023), Health liveness & readiness (PostgreSQL + Redis ping), Multi-facility scoping, Object storage lifecycle & MIME/traversal validation, and Asynchronous background task queues.

### Frontend TypeScript & Build Verification

```powershell
cd frontend
npx tsc --noEmit
npm run build
```

---

## ðŸŽ­ 3-Minute Clinical Demonstration Workflow

1. **Landing Page (`/`)**: Notice the prominent amber Non-Diagnostic Disclaimer, feature pillars, and India-wide facility relevance.
2. **Start Intake (`/intake`)**:
   * Review demo consent and proceed.
   * Select **Odia** or **Hindi** as patient language.
   * Click **Start Voice Recording** to demonstrate the 6-state speech capture engine.
   * Click **Load Synthetic CBC Sample** to extract lab report parameters with confidence scores and verification checkboxes.
   * Click **Submit for Qualified Review**.
3. **Reviewer Queue (`/review`)**:
   * Inspect prioritized sorting (`URGENT REVIEW`, `PRIORITY`, `ROUTINE`).
   * Observe transparent rule badges (`TRIAGE-R01`, `TRIAGE-R04`) based on deterministic criteria without black-box scores.
4. **Case Review & Human Gate (`/review/case/[caseId]`)**:
   * Verify the symptom progression timeline (Day 1, Day 2, Day 3).
   * Review the explainable provenance badges.
   * Click **Edit Summary** or **Confirm & Approve Note**.
5. **Referral Support Note (`/review/case/[caseId]/referral`)**:
   * Review the clean, printable referral support document ready for secondary care facility handoff.
   * Click **Print / Save Referral PDF**.
6. **Privacy & Data Purge**:
   * Return to the case review screen and click **Delete Case Data** to verify retention data purging.

---

## ðŸ”’ Security & Privacy Controls

* **Anonymization Layer**: Direct personal identifiers (phone numbers, email addresses, 12-digit Aadhaar sequences) are masked with `[PHONE_REMOVED]`, `[EMAIL_REDACTED]`, and `[GOVT_ID_REDACTED]`.
* **Synthetic Identifiers**: Cases use anonymous IDs (`CLV-DEMO-001`).
* **Data Retention Policy**: Audio recordings and report scans are stored in temporary buffers and can be purged via one-click retention controls.
* **Immutable Audit Trail**: All intake events, translations, OCR readings, and reviewer sign-offs are immutably logged with actor, timestamp, and IP address.
