# CLINOVA AI — Data Retention & Disposal Policy

**Document Reference:** CLN-POL-RET-003  
**Classification:** Clinical Governance & Information Security  
**Effective Date:** September 2026  
**Implementation Service:** `backend/app/services/retention.py`  

---

## 1. Objectives & Regulatory Framework

This policy defines the mandatory retention schedules, archival tiers, and sanitization protocols for digital health assets managed by CLINOVA AI. It balances compliance with medical record retention mandates (e.g., 7-year minimum clinical retention) against privacy regulations requiring timely deletion of temporary, orphaned, or infected files.

---

## 2. Retention Schedules by Asset Classification

| Data Classification | Description | Minimum Retention Period | Disposal Window | Disposal Action |
|---|---|---|---|---|
| **Active Medical Records** | Diagnoses, encounters, clinical notes, consultations, vitals, allergy lists. | 7 years from last encounter (or adult majority + 7 years for pediatric records). | On formal patient deletion request or post-statutory period. | Medical Board reviewed de-identification or hard delete. |
| **Diagnostic Binaries** | Validated pathology PDFs, radiology scans, lab result attachments. | 7 years concurrent with parent medical record. | Post-statutory period or explicit record purge. | File unlinked, binary block overwritten, DB metadata pruned. |
| **Soft-Deleted Documents** | Documents marked deleted by clinicians (`deleted_at` timestamp). | 30 days (Cool-off / recovery grace period). | Day 31+ | Automated permanent purge of files and DB rows. |
| **Quarantined Files** | Files tagged infected by ClamAV / scanner (`DocumentStatus.QUARANTINED`). | 90 days (Forensic analysis window). | Day 91+ | Secure unlinking from quarantine partition. |
| **Failed Ingestion Artifacts** | Unparseable files or crashed processing jobs (`DocumentStatus.FAILED`). | 14 days. | Day 15+ | Pruning of temporary tables and partial artifacts. |
| **Ephemeral OCR & AI Text** | Intermediate JSON tokens, transcription scratchpad buffers. | 7 days. | Day 8+ | Cache invalidation and memory flush. |
| **Clinical Audit Logs** | Immutable logs in `audit_logs` tracking PHI access and authentication. | 10 years minimum (Indefinite recommended). | Never purged automatically. | Immutable archive / WORM storage. |

---

## 3. Two-Stage Disposal Architecture

### Stage 1: Logical (Soft) Deletion
- When a document or case is deleted in the user interface, it is marked with an ISO 8601 UTC timestamp (`deleted_at`).
- All queries, dashboards, and search endpoints filter out soft-deleted records (`WHERE deleted_at IS NULL`).
- Records can be restored by an authorized Clinical Administrator during the 30-day grace period if deletion was inadvertent.

### Stage 2: Physical (Hard) Purge & Sanitization
- Once the retention window expires (e.g. 30 days post soft-delete), the automated `RetentionService` identifies the candidates.
- Physical binary files on the object store / disk are safely unlinked via `storage_service.backend.delete_object(storage_key)`.
- Associated database records (`documents`, `document_artifacts`) are deleted through relational cascades.
- An immutable audit entry (`action="DATA_RETENTION_PURGE"`) is committed with item counts and freed byte telemetry.

---

## 4. Automated Retention Worker Execution

The retention lifecycle is executed via `RetentionService.run_retention_sweep()`:
- **Dry-Run Mode (`dry_run=True`):** Computes affected candidate counts and reclaimable disk storage without modifying records or disk.
- **Enforcement Mode (`dry_run=False`):** Deletes binary objects, executes transactional SQL deletion, and writes the audit log.

Administrators can execute sweeps via API:
```http
POST /api/v1/admin/retention/sweep?dry_run=false
Authorization: Bearer <ADMIN_JWT_TOKEN>
```
Or via automated scheduled task (`cron` or background maintenance worker).
