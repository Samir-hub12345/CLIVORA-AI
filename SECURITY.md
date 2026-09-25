# CLINOVA AI — Healthcare Security, Safety & Privacy Policy

**Document Version:** 1.0.0  
**Target Audience:** Security engineers, clinical compliance officers, data protection officers, and infrastructure administrators  
**Current Release:** v0.2.0 (Integrated Staging)  

---

> [!WARNING]
> ### 🔒 Clinical Safety & Non-Diagnostic Mandate
> **Educational prototype and clinical decision support system only.** CLINOVA AI does not diagnose disease, prescribe pharmaceuticals, or make autonomous medical decisions. All AI-generated triage suggestions, risk flags, and clinical notes strictly require qualified medical professional validation and explicit human sign-off prior to clinical or administrative action.

---

## Table of Contents

1. [Security Philosophy & Regulatory Posture](#1-security-philosophy--regulatory-posture)
2. [Non-Diagnostic Safety Principles](#2-non-diagnostic-safety-principles)
3. [In-Flight PII Sanitization & De-Identification](#3-in-flight-pii-sanitization--de-identification)
4. [Authentication & Role-Based Access Control (RBAC)](#4-authentication--role-based-access-control-rbac)
5. [Immutable Medicolegal Audit Logging](#5-immutable-medicolegal-audit-logging)
6. [Data Retention Buffers & Cryptographic Purging](#6-data-retention-buffers--cryptographic-purging)
7. [Transport Security & Network Hardening](#7-transport-security--network-hardening)
8. [Vulnerability Disclosure & Security Reporting](#8-vulnerability-disclosure--security-reporting)

---

## 1. Security Philosophy & Regulatory Posture

CLINOVA AI is architected from the ground up under a **Privacy by Design** and **Defense-in-Depth** model specifically tailored to public health infrastructure in India:

### 1.1 DISHA Alignment
Designed to adhere to India's **Digital Information Security in Healthcare Act (DISHA)** principles:
- Absolute patient data privacy and strict purpose limitation.
- Explicit prohibition of transmitting unmasked personal health identifiers across untrusted public networks.
- Mandatory consent capture prior to processing patient narratives.

### 1.2 Ayushman Bharat Digital Mission (ABDM) Compatibility
Complies with the **ABDM Health Data Management Policy**:
- Generation of decoupled, synthetic patient identifiers (`CLV-DEMO-xxx`) for triage slips rather than direct personal identifiers.
- Architecture ready for future ABHA (Ayushman Bharat Health Account) federated token integration.

### 1.3 Indian IT Act & SPDI Rules
Meets standards under the **Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules**:
- Encryption of data in transit (TLS 1.3) and storage isolation.
- Comprehensive audit trails for all sensitive data access.

---

## 2. Non-Diagnostic Safety Principles

The primary patient safety risk in clinical AI systems is autonomous action or clinician over-reliance. CLINOVA AI mitigates this through architectural hard barriers:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    HUMAN-IN-THE-LOOP SAFETY GATEWAY                     │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                   [ Generative / Multimodal Intake ]
                                   │
                                   ▼
                  [ Deterministic Risk Signal Engine ]
                                   │
                                   ▼
                    [ Proposed Clinical Summary ]
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │       QUALIFIED ATTENDING CLINICIAN REVIEW GATE     │
        │  1. Inspect Timeline & Original Vernacular Audio    │
        │  2. Review Provenance-Linked Lab Parameters         │
        │  3. Edit Note / Override Triage Category            │
        │  4. Electronic Sign-Off / Confirm / Escalate        │
        └──────────────────────────┬──────────────────────────┘
                                   │ Explicit Clinician Signature
                                   ▼
                    [ Official Health Record / Transfer ]
```

1. **Strictly Non-Autonomous**: The system cannot discharge a patient, alter active medication dosages, or schedule invasive procedures.
2. **Persistent Warning Banners**: The amber clinical disclaimer banner must remain hardcoded and visible across all client application views.
3. **Traceable Explainability**: Every urgency classification is bound to a deterministic, audited rule code (`TRIAGE-R01` to `TRIAGE-R06`) rather than an opaque statistical confidence score.

---

## 3. In-Flight PII Sanitization & De-Identification

Before unstructured voice transcripts or typed narratives are stored in the database or forwarded to language model adapters, they pass through an in-flight sanitization pipeline (`backend/app/services/anonymizer.py`):

### 3.1 Sanitization Rules & Expressions

| Identifier Type | Detection Pattern | Replacement Mask |
| :--- | :--- | :--- |
| **Indian Mobile Number** | `(?:\+91\|0)?[6-9]\d{9}` | `[PHONE_REDACTED]` |
| **Email Address** | `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z\|a-z]{2,}` | `[EMAIL_REDACTED]` |
| **Indian Aadhaar Number**| `\b\d{4}[ -]?\d{4}[ -]?\d{4}\b` | `[AADHAAR_REDACTED]` |

### 3.2 Synthetic Identity Generation
In demonstration and public health outreach modes, patient charts are generated with synthetic tokens (`CLV-DEMO-001` through `CLV-DEMO-006`) to ensure no actual patient health information is exposed during clinical staff training or evaluation.

---

## 4. Authentication & Role-Based Access Control (RBAC)

### 4.1 Authentication Protocol
- **Token Format**: Standard JSON Web Tokens (JWT) signed via HMAC-SHA256 (`HS256`).
- **Signature Secret**: Controlled via `SECRET_KEY` environment variable. Production deployments require a 256-bit cryptographically random key generated via `openssl rand -hex 32`.
- **Token Lifespan**: Standard 60 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES = 60`).
- **Authorization Header**: `Bearer <token>` passed via HTTP `Authorization` header.

### 4.2 Password Hashing
- Utilizes **bcrypt** with an adaptive work factor of 12 rounds via Passlib.
- Cleartext passwords are never logged, cached, or persisted.

### 4.3 Role-Based Access Matrix

| Endpoint Group | `admin` | `doctor` | `nurse` | `patient` |
| :--- | :---: | :---: | :---: | :---: |
| `POST /api/v1/intake/process` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/v1/cases/` (Queue) | ✅ | ✅ | ✅ | ❌ |
| `POST /api/v1/review/action` | ✅ | ✅ | ❌ | ❌ |
| `DELETE /api/v1/cases/{id}` | ✅ | ✅ | ❌ | ❌ |
| `GET /api/v1/audit-logs/` | ✅ | ❌ | ❌ | ❌ |

---

## 5. Immutable Medicolegal Audit Logging

Every interaction with clinical data is recorded in the append-only `audit_logs` database table (`backend/app/services/audit.py`):

### 5.1 Audit Schema
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id INTEGER NULL,
    user_email VARCHAR(255) NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    details TEXT NULL
);
```

### 5.2 Mandatory Audit Events
- `CASE_INTAKE_SUBMITTED`: Logged when an intake case is registered.
- `VOICE_TRANSCRIBED`: Logged when audio is processed.
- `OCR_EXTRACTED`: Logged when a lab report is parsed.
- `REVIEW_ACTION_APPROVE`: Logged when a medical officer approves a note.
- `REVIEW_ACTION_EDIT`: Logged when a medical officer modifies a SOAP summary.
- `REVIEW_ACTION_ESCALATE`: Logged when a patient is escalated to secondary care.
- `CASE_DATA_PURGED`: Logged when temporary media and audio buffers are permanently destroyed.

---

## 6. Data Retention Buffers & Cryptographic Purging

To mitigate long-term storage risks in public health facilities:

### 6.1 24-Hour Default Retention
Temporary audio recordings and raw pathology report image files are retained for a maximum of 24 hours (`RETENTION_HOURS = 24`) in transient server storage. Once verified into structured clinical records, the raw binary assets are flagged for deletion.

### 6.2 Clinician-Triggered One-Click Purge
Attending medical officers have instant access to the **Delete Case Data** action (`DELETE /api/v1/cases/{case_id}`). This triggers:
1. Immediate unlink and overwrite of transient audio and OCR scans on disk.
2. Removal of vernacular audio transcripts from the active case record.
3. Generation of an immutable `CASE_DATA_PURGED` event in the audit trail.

---

## 7. Transport Security & Network Hardening

### 7.1 Mandatory TLS 1.3
In production, all incoming traffic must be encrypted with TLS 1.3 (fallback to TLS 1.2 minimum). Insecure HTTP connections on port 80 are permanently redirected via 301 responses to HTTPS on port 443.

### 7.2 Defensive HTTP Security Headers
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Enforces HTTPS across all subdomains).
- `X-Frame-Options: DENY` (Mitigates clickjacking attacks).
- `X-Content-Type-Options: nosniff` (Prevents MIME-sniffing exploits).
- `Referrer-Policy: strict-origin-when-cross-origin` (Protects query parameter leakages).

### 7.3 CORS Protection
FastAPI enforces strict CORS middleware restricting origins to authorized domain origins specified in the `CORS_ORIGINS` environment array (e.g., `["https://triage.hospital.gov.in"]`). Wildcard `*` origins are strictly forbidden in production.

---

## 8. Vulnerability Disclosure & Security Reporting

We welcome responsible security research on CLINOVA AI.

### 8.1 Reporting Security Issues
If you discover a security vulnerability or potential clinical data leakage:
- **Do NOT open a public GitHub issue.**
- Email the security team directly at `security@clinova-health.org` or notify repository administrators privately.
- Include a detailed description, proof of concept, and reproduction steps.

### 8.2 Response Timeline
- **Initial Acknowledgement**: Within 48 hours.
- **Triage & Impact Assessment**: Within 5 business days.
- **Remediation & Patch Release**: Within 14 business days.
