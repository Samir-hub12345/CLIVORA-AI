# CLINOVA AI

**Multimodal Healthcare Triage Assistant for Government and Institutional Health Facilities**  

---

> [!WARNING]
> ### 🔒 Mandatory Safety & Non-Diagnostic Disclaimer
> **Educational prototype and triage-support purposes only.** This system does **not** diagnose, prescribe treatment, or replace a qualified healthcare professional. All AI-generated information requires human review before clinical action.

---

## 📋 Executive Overview

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

## 🏛️ Architecture & Data Flow

```text
Patient / Kiosk / Health Worker
               │
               ▼
┌──────────────────────────────────────────────┐
│             DEMO CONSENT & CONTEXT           │
│  Age • Gender • Facility • Preferred Lang    │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│           MULTIMODAL INTAKE PIPELINE         │
│  Voice (Speech-to-Text) • Typed Narrative    │
│  Report OCR (CBC Panel) • Basic Visuals      │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│        ANONYMIZATION & PRIVACY LAYER         │
│  PII Redaction • Synthetic Case ID (CLV-xxx) │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│        INTELLIGENCE & EXTRACTION ENGINE      │
│  Language Normalization (Odia/Hindi -> Eng)  │
│  Timeline Synthesis • Missing Info Detection │
│  Deterministic Urgency Rules (R01 - R06)     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│          STRUCTURED REVIEWER NOTE            │
│  Chief Concern • Timeline • OCR Data • Flags │
│      *AI GENERATED — HUMAN REVIEW REQUIRED*  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│             HUMAN REVIEW GATE                │
│       Medical Officer Review Dashboard       │
│    Confirm  •  Edit  •  Reject  •  Escalate  │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│           ACTION & REFERRAL HANDOFF          │
│   Official Referral Note • Facility Handoff  │
│      Immutable Audit Trail • Data Purge      │
└──────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons.
* **Backend**: FastAPI (Python 3.12/3.14 on Uvicorn ASGI), Pydantic v2 validation, SQLAlchemy 2.0 (async).
* **Database & Cache**: PostgreSQL 16 (relational EHR and triage records) & Redis 7 (caching and job state).
* **AI & Rules Engine**: Modular provider architecture with Gemini API integration and full deterministic local mock fallback (`DEMO_MODE=true`).
* **Containerization**: Docker & Docker Compose.

---

## 📚 Documentation Index

Clinova AI maintains a comprehensive, production-grade technical and clinical documentation suite:

| Document | Primary Focus | Target Audience |
| :--- | :--- | :--- |
| **[FEATURES.md](FEATURES.md)** | Multimodal intake, risk engine, queue, review gate, referrals, demo hub. | Clinicians, Product Owners, Developers |
| **[INFRASTRUCTURE.md](INFRASTRUCTURE.md)** | Topology, Docker Compose, ports, PM2, systemd, TLS, hardware profiles. | DevOps, SREs, Systems Administrators |
| **[SECURITY.md](SECURITY.md)** | DISHA/ABDM compliance, PII/Aadhaar scrubbing, JWT, audit logs, purge. | Security Engineers, Compliance Officers |
| **[TESTING.md](TESTING.md)** | 15 backend tests, standalone vs. Docker testing, frontend lint, checklist. | QA Engineers, Backend Developers |
| **[ROADMAP.md](ROADMAP.md)** | Phased roadmap: MTS pediatric matrix, PWA, Bhashini, ABDM, biomarkers. | Clinical Informatics, Engineering Leads |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | End-to-end data flow, neuro-symbolic patterns, subsystem architecture. | Software Architects, Full-Stack Devs |
| **[API_SPECIFICATION.md](API_SPECIFICATION.md)**| REST API endpoints, schemas, authentication, status codes, examples. | Backend & Frontend API Integrators |
| **[clinical-rules.md](clinical-rules.md)** | Deterministic triage rules (`TRIAGE-R01`–`R06`), safety thresholds. | Medical Officers, Informatics Reviewers |
| **[deploy.md](deploy.md)** | Step-by-step production deployment, Docker, bare-metal, disaster recovery. | Infrastructure & DevOps Teams |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Contributor setup, branching, git guidelines, validation checklist. | Open-Source Contributors |
| **[CHANGELOG.md](CHANGELOG.md)** | Semantic release history and implemented vs. planned status matrix. | Maintainers & Evaluators |

---

## 📁 Repository Structure

```text
CLINOVA-AI/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                    # Polished healthcare landing page
│   │   │   ├── intake/page.tsx             # 4-step Multimodal Intake Wizard
│   │   │   ├── review/page.tsx             # Prioritized Reviewer Queue
│   │   │   ├── review/case/[caseId]/page.tsx # Case Review & Human Gate
│   │   │   ├── review/case/[caseId]/referral/page.tsx # Printable Referral Note
│   │   │   ├── demo/page.tsx               # 6 Public Health Demo Scenarios
│   │   │   ├── dashboard/page.tsx          # Provider metrics dashboard
│   │   │   └── audit/page.tsx              # Audit trail viewer
│   │   ├── components/
│   │   │   ├── clinical/                   # Safety banner, voice recorder, OCR uploader, timeline
│   │   │   ├── common/                     # Header, footer, navigation
│   │   │   └── ui/                         # Badges, buttons, cards
│   │   ├── lib/                            # API client & auth provider
│   │   └── types/                          # TypeScript definitions
│   ├── package.json
│   └── Dockerfile
│
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   │   ├── cases.py                    # Triage cases CRUD & queue
│   │   │   ├── intake.py                   # Speech, translation & OCR endpoints
│   │   │   ├── review.py                   # Review actions & referral generation
│   │   │   ├── auth.py                     # Authentication & JWT
│   │   │   ├── patients.py                 # EHR patient charts
│   │   │   └── audit.py                    # HIPAA-ready audit logging
│   │   ├── core/                           # Config, security, dependencies
│   │   ├── models/                         # TriageCase, User, Patient, Consultation, AuditLog
│   │   ├── schemas/                        # Pydantic request/response models
│   │   ├── services/                       # Anonymizer, RiskEngine, Speech, Translation, OCR, Gemini
│   │   └── main.py                         # FastAPI factory & synthetic seed data
│   ├── tests/                              # Automated Pytest suite (15 passing tests)
│   ├── requirements.txt
│   └── Dockerfile
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

## ⚡ Quickstart Commands (Windows PowerShell)

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

## 🧪 Running Automated Tests

Run the complete 15-test automated backend test suite:

```powershell
docker compose exec backend pytest -v
```

*Tests cover: Anonymization, Aadhaar redaction, Risk engine breathing/cardiovascular rules, Routine presentations, Non-diagnostic triage note synthesis, Consultation lifecycle, EHR patient CRUD, and Authentication.*

---

## 🎭 3-Minute Clinical Demonstration Workflow

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

## 🔒 Security & Privacy Controls

* **Anonymization Layer**: Direct personal identifiers (phone numbers, email addresses, 12-digit Aadhaar sequences) are masked with `[PHONE_REMOVED]`, `[EMAIL_REDACTED]`, and `[GOVT_ID_REDACTED]`.
* **Synthetic Identifiers**: Cases use anonymous IDs (`CLV-DEMO-001`).
* **Data Retention Policy**: Audio recordings and report scans are stored in temporary buffers and can be purged via one-click retention controls.
* **Immutable Audit Trail**: All intake events, translations, OCR readings, and reviewer sign-offs are immutably logged with actor, timestamp, and IP address.
