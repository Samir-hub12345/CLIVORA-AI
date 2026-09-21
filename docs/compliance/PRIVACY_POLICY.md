# CLINOVA AI — Patient Privacy & Data Protection Policy

**Document Reference:** CLN-POL-PRIV-001  
**Version:** 1.0.0  
**Effective Date:** September 2026  
**Applicability:** All CLINOVA AI Deployments, Healthcare Practitioners, Facility Operators, and System Administrators  

---

## 1. Executive Summary & Purpose

CLINOVA AI is committed to safeguarding patient privacy, Protected Health Information (PHI), and Personally Identifiable Information (PII) in compliance with the **Health Insurance Portability and Accountability Act (HIPAA)**, the **General Data Protection Regulation (GDPR)**, and national digital healthcare data regulations.

This policy specifies the procedures, technical controls, and obligations governing the intake, storage, transmission, processing, anonymization, and disposal of clinical and patient data across CLINOVA AI.

---

## 2. Scope & Categories of Data Collected

CLINOVA AI processes data across the following clinical categories:

| Category | Description | Storage Location | Protection Level |
|---|---|---|---|
| **Direct Identifiers (PII)** | Patient full name, national ID, phone number, physical address, email. | AES-256 PostgreSQL (Encrypted at Rest) | Highest / Strictly Restricted RBAC |
| **Protected Health Information (PHI)** | Symptoms, triage assessments, clinical notes, diagnosis codes, vital signs, encounters. | PostgreSQL (Tenant & Facility Isolated) | HIPAA Confidential |
| **Diagnostic Binaries & Scans** | Pathology reports, blood work PDFs, imaging scans (DICOM/JPEG/PNG). | Partitioned Object Storage (`storage_data/documents/`) | AES-256, Scanned with ClamAV |
| **De-Identified Clinical Payloads** | Scrubbed clinical narratives sent to AI synthesis engines. | Ephemeral In-Memory Only | Zero-Retention / Scrubbed Regex & NLP |
| **Audit Logs** | Immutable chronological logs of all PHI reads, writes, updates, and deletes. | PostgreSQL `audit_logs` (Append-Only) | Immutable / Tamper-evident |

---

## 3. Core Privacy Principles

### 3.1 Data Minimization & De-Identification
- Prior to transmitting clinical symptoms or intake transcripts to Large Language Models (LLMs) or external inference endpoints, all direct identifiers (names, dates, phone numbers, addresses, social IDs) are irreversibly redacted or masked using the in-engine regex and NLP anonymizer (`app/services/anonymizer.py`).
- LLM inference is configured with zero-data-retention agreements; vendor logging of clinical inference payloads is strictly disabled.

### 3.2 Role-Based Access Control (RBAC) & Principle of Least Privilege
- Access to patient records is enforced through fine-grained RBAC with cryptographic JWT authorization:
  - **Doctor / Medical Officer:** Full read/write access to assigned facility patients, clinical notes, orders, and consultations.
  - **Nurse / Triage Officer:** Intake vitals, symptom recording, and referral packet initiation.
  - **Reviewer / Specialist:** Secondary consultation confirmation, risk overrides, and telemetry review.
  - **Administrator:** Facility configuration, user provisioning, and audit oversight without direct clinical narrative access.
  - **Patient:** Read-only access to their personal medical records, active encounters, and published summaries.

### 3.3 Patient Consent & Revocation
- Patient consent must be recorded prior to intake processing or data ingestion.
- Patients retain the right to request access, correction, or export of their medical data in HL7 FHIR standard format.
- In accordance with medical record retention regulations, historical records are retained as required by clinical safety laws but marked as restricted if consent is revoked.

---

## 4. Cryptographic & Security Safeguards

1. **Encryption in Transit:** Mandatory TLS 1.3 / TLS 1.2 with strict cipher suites across all external API endpoints, reverse proxies, and internal microservices. HTTP Strict Transport Security (HSTS) enforced with `max-age=63072000; includeSubDomains; preload`.
2. **Encryption at Rest:** Storage volumes and database files encrypted using AES-256-GCM.
3. **Presigned Ephemeral Access:** Document downloads and artifact viewing are gated by HMAC-SHA256 presigned access tokens with an expiry ceiling of 900 seconds (15 minutes). Direct unauthenticated public URL access is permanently disabled.
4. **Malware & Anti-Exploit Scanning:** Every binary medical file uploaded to CLINOVA AI is parsed with magic byte validation, quarantined upon upload, scanned for malware signatures (ClamAV / EICAR), and cleared before ingestion.

---

## 5. Breach Notification Protocol

In the event of an identified security incident or unauthorized PHI disclosure:
1. The Incident Response Team is mobilized within **15 minutes** of discovery.
2. Compromised credentials or sessions are invalidated globally via Redis token blacklisting.
3. Affected clinical facilities, data protection authorities, and patients are notified within **72 hours** in accordance with HIPAA §164.404 and GDPR Article 33.

---

## 6. Document Authority & Review Cycle

This policy is maintained by the Clinical Governance Committee and Chief Information Security Officer (CISO). It undergoes mandatory annual audits and immediate review upon regulatory shifts.
