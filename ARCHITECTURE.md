# Clivora AI - System Architecture Document

## 1. Document Overview
This document defines the architectural foundation and structural design of Clivora AI (built upon the blueprints of the BPUT HACKATHON HEALTH ASSISTANT). Its purpose is to provide a comprehensive map of the system's infrastructure, data flow, and component responsibilities for current developers and future maintainers. 

* **Project Name:** Clivora AI
* **Current Architecture Status:** Initial implementation phase (Core frontend and backend scaffolding established; AI and multimodal integrations are in active development/planned).
* **Last Updated Date:** September 18, 2026
* **Current vs. Planned Implementation:** The basic REST API and Next.js UI are currently implemented. Advanced neuro-symbolic AI modules, offline CRDT synchronization, and acoustic/visual biomarker harvesting are planned architecture goals.
* **Intended Audience:** Full-stack developers, AI engineers, clinical workflow designers, and hackathon judges.

## 2. System Goals
Clivora AI is engineered to achieve the following functional and technical objectives:
* **Healthcare Triage Assistance:** Organize high patient loads into a priority-stratified queue based on immediate physiological urgency.
* **Human-in-the-loop Operation:** Ensure a qualified medical professional reviews, approves, or overrides every AI-generated triage recommendation.
* **Patient Intake:** Provide a dynamic, non-blocking intake flow that handles both documented patients and zero-history walk-ins.
* **Multilingual Interaction:** Support native-language speech and text inputs (e.g., Odia, Hindi) to serve diverse rural populations.
* **Medical Document Processing:** Extract historical baselines and active prescriptions via OCR.
* **AI-Assisted Summarization:** Clean conversational disfluencies and summarize symptoms into structured clinical formats (SOAP).
* **Explainable Triage:** Use a deterministic rules engine alongside LLMs to ensure all acuity flags are traceable and clinically justifiable.
* **Patient/Session History:** Maintain an immutable, cryptographically hashed audit trail of all patient encounters.
* **Privacy & Security:** Adhere to DISHA/ABDM standards with Role-Based Access Control (RBAC) and automated PII scrubbing.
* **Offline/Low-Connectivity Support:** Enable continuous operation during network blackouts using local caching and CRDT-based synchronization.
* **Scalability:** Utilize asynchronous microservices to handle concurrent high-volume triage processing in district hospitals.
* **Auditability:** Log every data extraction, rule trigger, and human override for epidemiological and medicolegal review.

## 3. Non-Goals
Clivora AI operates within strict clinical safety boundaries and is explicitly **NOT** intended to:
* **Replace Doctors:** The system acts as a pre-consultation intake filter and queue manager, not an autonomous physician.
* **Make Unsupervised Final Medical Decisions:** The AI cannot independently discharge patients, order high-risk procedures, or finalize diagnoses without human sign-off.
* **Provide Guaranteed Diagnosis:** The platform performs "syndromic triage" (categorizing acuity based on symptom clusters) rather than attempting to definitively name a disease.
* **Automatically Prescribe Medication:** While it anticipates resource needs (like IV fluids or basic first aid), it does not autonomously prescribe therapeutic regimens.
* **Operate Without Human Oversight:** The workflow strictly mandates physical vital verification by clinical staff before a patient progresses through the queue.

## 4. Current Technology Stack

### Frontend UI & Client
* **Framework:** Next.js 14 (App Router) / React (*CURRENT*) - Used for SSR, optimized routing, and building the isolated portals.
* **Language:** TypeScript (*CURRENT*) - Provides static typing for robust, error-free component development.
* **Styling:** Tailwind CSS & shadcn/ui (*CURRENT*) - Used for rapid, accessible, and high-contrast UI component design.
* **State Management/Data Fetching:** React Hooks & Axios/Fetch (*CURRENT*) - Handles API communication with the backend.

### Backend API & Core Logic
* **Framework:** FastAPI (*CURRENT*) - High-performance asynchronous Python web framework for handling RESTful API routes.
* **Server:** Uvicorn (*CURRENT*) - ASGI web server implementation.
* **Language:** Python 3.10+ (*CURRENT*) - Chosen for native compatibility with data science, ML, and AI libraries.

### Database & Storage
* **Primary Database:** PostgreSQL (*CURRENT*) - Relational database for storing user accounts, UFID health graphs, and audit trails.
* **Offline Cache:** IndexedDB / SQLite with CRDTs (*PLANNED*) - For zero-connectivity data persistence and auto-reconciliation.

### AI / ML Ecosystem
* **Speech-to-Text:** OpenAI Whisper / Bhashini API (*PLANNED*) - Transcribes regional dialects into text.
* **Translation:** IndicTrans2 (*PLANNED*) - Translates native languages (Odia/Hindi) to clinical English.
* **OCR/Document Processing:** PaddleOCR / Tesseract (*PLANNED*) - Extracts data from printed lab reports and handwritten prescriptions.
* **Triage Engine:** Python Deterministic Rules Engine (*PLANNED*) - Hardcoded clinical logic (Manchester Triage System) that overrides generative AI risk scores.

### Infrastructure & Deployment
* **Containerization:** Docker & Docker Compose (*CURRENT*) - Used to standardize local development environments.
* **Environment Management:** `python-dotenv` (*CURRENT*) - Manages secrets and API keys safely.

## 5. Repository / Directory Architecture

```text
clivora-ai/
├── frontend/                     # Next.js Application
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages (Portals: /patient, /doctor, /staff)
│   │   ├── components/           # Reusable UI components (shadcn, forms, layout)
│   │   ├── hooks/                # Custom React hooks for API calls and state
│   │   ├── lib/                  # Utility functions (formatting, validation)
│   │   └── types/                # TypeScript interfaces (FHIR schemas, internal types)
│   ├── public/                   # Static assets (images, icons)
│   ├── package.json              # Frontend dependencies
│   └── tailwind.config.ts        # UI styling configuration
│
├── backend/                      # FastAPI Python Server
│   ├── app/
│   │   ├── api/                  # API Route handlers (endpoints for intake, triage, auth)
│   │   ├── core/                 # Configuration, security, and environment settings
│   │   ├── db/                   # Database connection setup and ORM models
│   │   ├── schemas/              # Pydantic models for request/response validation
│   │   ├── services/             # Business logic (AI processing, OCR, CRDT sync)
│   │   └── rules/                # Deterministic clinical safety rules engine
│   ├── main.py                   # FastAPI application entry point
│   ├── requirements.txt          # Python dependencies
│   └── Dockerfile                # Backend containerization blueprint
│
├── docker-compose.yml            # Multi-container orchestration (DB, API, UI)
├── .env.example                  # Template for required environment variables
├── README.md                     # Project overview and quickstart instructions
└── architecture.md               # This document
[ PATIENT ARRIVAL ]
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │       FRONTEND / PATIENT INTERFACE           │
         │  (Next.js App: Native Language UI, Uploads)  │
         └──────────────────────┬───────────────────────┘
                                │ JSON / Form Data / Audio / Images
                                ▼
         ┌──────────────────────────────────────────────┐
         │                 BACKEND API                  │
         │           (FastAPI REST Gateway)             │
         └──────────────────────┬───────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌─────────────────┐      ┌───────────────┐
│ MULTIMODAL    │      │  DOCUMENT       │      │  SESSION &    │
│ INGESTION     │      │  PROCESSING     │      │  AUTH         │
│ - Whisper STT │      │ - PaddleOCR     │      │ - ABHA/JWT    │
│ - IndicTrans2 │      │ - Entity Parse  │      │ - Redis/CRDT  │
└───────┬───────┘      └────────┬────────┘      └───────┬───────┘
        │                       │                       │
        └───────────────┬───────┴───────────────────────┘
                        ▼
         ┌──────────────────────────────────────────────┐
         │           NEURO-SYMBOLIC TRIAGE              │
         │ 1. AI Summarization (LLM Structuring)        │
         │ 2. Safety Engine (Deterministic Overrides)   │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │             DATABASE & AUDIT                 │
         │   (PostgreSQL: Immutable Patient Dossiers)   │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │          CLINICAL STAFF / DOCTOR             │
         │      (Reviewer Dashboard: Sign-off,          │
         │       Diagnostic Orders, Dispatch)           │
         └──────────────────────────────────────────────┘
