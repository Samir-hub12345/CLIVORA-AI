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
| **[FEATURES.md](FEATURES.md)** | Multimodal intake, risk engine, queue, review gate, referrals, demo hub. | Clinicians, Product Owners, Developers |
| **[INFRASTRUCTURE.md](INFRASTRUCTURE.md)** | Topology, Docker Compose, ports, PM2, systemd, TLS, hardware profiles. | DevOps, SREs, Systems Administrators |
| **[SECURITY.md](SECURITY.md)** | DISHA/ABDM compliance, PII/Aadhaar scrubbing, JWT, audit logs, purge. | Security Engineers, Compliance Officers |
| **[TESTING.md](TESTING.md)** | 15 backend tests, standalone vs. Docker testing, frontend lint, checklist. | QA Engineers, Backend Developers |
| **[ROADMAP.md](ROADMAP.md)** | Phased roadmap: MTS pediatric matrix, PWA, Bhashini, ABDM, biomarkers. | Clinical Informatics, Engineering Leads |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | End-to-end data flow, neuro-symbolic patterns, subsystem architecture. | Software Architects, Full-Stack Devs |
| **[API_SPECIFICATION.md](API_SPECIFICATION.md)**| REST API endpoints, schemas, authentication, status codes, examples. | Backend & Frontend API Integrators |
| **[clinical-rules.md](clinical-rules.md)** | Deterministic triage rules (`TRIAGE-R01`â€“`R06`), safety thresholds. | Medical Officers, Informatics Reviewers |
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
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ api/v1/endpoints/
â”‚   â”‚   â”‚   â”œâ”€â”€ cases.py                    # Triage cases CRUD & queue
â”‚   â”‚   â”‚   â”œâ”€â”€ intake.py                   # Speech, translation & OCR endpoints
â”‚   â”‚   â”‚   â”œâ”€â”€ review.py                   # Review actions & referral generation
â”‚   â”‚   â”‚   â”œâ”€â”€ auth.py                     # Authentication & JWT
â”‚   â”‚   â”‚   â”œâ”€â”€ patients.py                 # EHR patient charts
â”‚   â”‚   â”‚   â””â”€â”€ audit.py                    # HIPAA-ready audit logging
â”‚   â”‚   â”œâ”€â”€ core/                           # Config, security, dependencies
â”‚   â”‚   â”œâ”€â”€ models/                         # TriageCase, User, Patient, Consultation, AuditLog
â”‚   â”‚   â”œâ”€â”€ schemas/                        # Pydantic request/response models
â”‚   â”‚   â”œâ”€â”€ services/                       # Anonymizer, RiskEngine, Speech, Translation, OCR, Gemini
â”‚   â”‚   â””â”€â”€ main.py                         # FastAPI factory & synthetic seed data
â”‚   â”œâ”€â”€ tests/                              # Automated Pytest suite (15 passing tests)
â”‚   â”œâ”€â”€ requirements.txt
â”‚   â””â”€â”€ Dockerfile
â”‚
â”œâ”€â”€ docker-compose.yml
â”œâ”€â”€ .env.example
â”œâ”€â”€ README.md
â”œâ”€â”€ FEATURES.md
â”œâ”€â”€ INFRASTRUCTURE.md
â”œâ”€â”€ SECURITY.md
â”œâ”€â”€ TESTING.md
â”œâ”€â”€ ROADMAP.md
â”œâ”€â”€ ARCHITECTURE.md
â”œâ”€â”€ API_SPECIFICATION.md
â”œâ”€â”€ clinical-rules.md
â”œâ”€â”€ deploy.md
â”œâ”€â”€ CONTRIBUTING.md
â””â”€â”€ CHANGELOG.md
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
* **Backend Health**: [http://localhost:8000/health](http://localhost:8000/health)

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

## ðŸ§ª Running Automated Tests

Run the complete 15-test automated backend test suite:

```powershell
docker compose exec backend pytest -v
```

*Tests cover: Anonymization, Aadhaar redaction, Risk engine breathing/cardiovascular rules, Routine presentations, Non-diagnostic triage note synthesis, Consultation lifecycle, EHR patient CRUD, and Authentication.*

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
