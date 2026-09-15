# Clinova AI - Full-Stack Healthcare AI Web Application

Clinova AI is a clinical intelligence and patient care platform designed to empower healthcare providers and patients with AI-augmented clinical decision support, triage assistance, and medical workflow optimization.

---

## 🏛️ Architecture Overview

The system uses a decoupled full-stack architecture:
* **Frontend**: Next.js 14+ (App Router), React, TypeScript, and Tailwind CSS.
* **Backend**: FastAPI (Python 3.14), Pydantic v2, SQLAlchemy 2.0 (async), and Google Gemini AI integration.
* **Database & Cache**: PostgreSQL (relational clinical records and vector storage) and Redis (session & background caching).

---

## 📁 Repository Structure

```text
CLIVORA-AI/
├── frontend/               # Next.js / React client application
│   ├── public/             # Static assets
│   └── src/
│       ├── app/            # App Router pages and layouts
│       ├── components/     # Modular and reusable UI components
│       ├── lib/            # Utility helpers, API clients
│       └── types/          # TypeScript domain definitions
│
├── backend/                # FastAPI Python server application
│   └── app/
│       ├── api/            # Versioned API routes (v1 endpoints)
│       ├── core/           # Configuration, security, logging
│       ├── db/             # Database connection and session management
│       ├── models/         # SQLAlchemy ORM models
│       ├── schemas/        # Pydantic data schemas
│       ├── services/       # Core business logic & AI pipelines
│       └── tests/          # Pytest automated test suites
│
├── docker-compose.yml      # Local development container orchestration
├── .gitignore              # Git ignore configuration
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** >= 18 (Recommended: v20 or v24) & **npm**
* **Python** >= 3.11 (Recommended: 3.12 - 3.14)
* **Docker & Docker Compose** (optional, for containerized run)

### Running with Docker Compose
```bash
docker-compose up --build
```
* Frontend: `http://localhost:3000`
* Backend API Docs: `http://localhost:8000/docs`

### Manual Local Setup

#### Backend
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Healthcare & Security Standards
* **Data Security**: Designed with HIPAA data privacy principles in mind.
* **Role-Based Access Control (RBAC)**: Fine-grained permissions for Patients, Clinicians, and Administrators.
* **Audit Logging**: Immutable tracking of medical record and consultation access.
