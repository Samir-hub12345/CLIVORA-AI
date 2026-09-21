# CLINOVA AI — Security Incident Response & Breach Notification Policy

**Document Reference:** CLN-POL-IR-004  
**Severity Classification Framework:** US-CERT / NIST SP 800-61 Rev. 2  
**Effective Date:** September 2026  
**Incident Hotline / Alerting:** `security-team@clinova.ai`  

---

## 1. Incident Classification & Severity Levels

Security and clinical incidents in CLINOVA AI are categorized into four severity tiers:

| Severity | Definition | Examples | SLA: Response Target | SLA: Resolution Target |
|---|---|---|---|---|
| **SEV-1 (Critical)** | Active compromise of PHI, widespread database corruption, ransomware, or full service outage in acute triage facilities. | Unauthorized bulk export of patient records; database encryption key compromise; complete API outage during clinical operations. | **< 15 minutes** | **< 4 hours** |
| **SEV-2 (High)** | Localized unauthorized access to clinical records, malware detection in document storage, or single facility failure. | Infected document detected in quarantine; credential stuffing against clinician accounts; AI hallucination generating unsafe triage recommendations. | **< 30 minutes** | **< 12 hours** |
| **SEV-3 (Medium)** | Minor policy violation, isolated software bug without data leakage, or degraded performance. | Slow API latency (>2000ms); non-critical dashboard visualization error; transient Redis connectivity drops. | **< 2 hours** | **< 48 hours** |
| **SEV-4 (Low)** | Informational inquiry, cosmetic UI defect, or minor linting/telemetry warning. | Broken external hyperlink; minor styling bug on mobile landing page. | **< 24 hours** | **Next release sprint** |

---

## 2. Six-Phase Incident Response Lifecycle

```
[Phase 1: Preparation] ────► [Phase 2: Detection & Analysis] ────► [Phase 3: Containment]
                                                                        │
[Phase 6: Post-Mortem] ◄─── [Phase 5: Recovery & Verification] ◄──────── [Phase 4: Eradication]
```

### Phase 1: Preparation
- Continuous Prometheus telemetry (`/api/v1/health/metrics`) and automated health checks.
- Daily automated point-in-time PostgreSQL backups and restore verifications (`scripts/backup_db.ps1`).
- Multi-factor authentication, secret rotation protocols, and immutable audit logging.

### Phase 2: Detection & Analysis
- Monitored signals: spikes in HTTP 401/403 status codes, unexpected database query volume, ClamAV infected alerts, disk usage spikes, and clinician-reported triage anomalies.
- Evidence preservation: snapshotting affected container disks, extracting immutable `audit_logs` entries, and freezing application logs without altering timestamps.

### Phase 3: Containment (Short-Term & Long-Term)
- **Short-Term Containment:**
  - Invalidate compromised clinician sessions via Redis token blacklisting.
  - Quarantining infected files immediately into `storage_data/quarantine/`.
  - Isolate compromised network containers via Docker network disconnection.
- **Long-Term Containment:**
  - Rotate database passwords and JWT signing secrets (`SECRET_KEY`).
  - Deploy emergency firewall rules blocking malicious IP ranges.

### Phase 4: Eradication
- Purge malware binaries using `RetentionService` or file deletion utilities.
- Apply security patches to backend FastAPI dependencies or Docker base images.
- Re-run static analysis and vulnerability scans.

### Phase 5: Recovery & Verification
- Restore data from verified clean backup (`scripts/verify_restore.ps1`) if corruption occurred.
- Gradually restore clinical network traffic, validating health and Prometheus metrics.
- Enforce mandatory password resets on all affected clinical user accounts.

### Phase 6: Post-Incident Review & Compliance Filing
- Complete Root Cause Analysis (RCA) within 5 business days.
- If PHI breach is confirmed, notify HHS Office for Civil Rights (OCR) and affected individuals within 60 calendar days (HIPAA § 164.404) or national authorities within 72 hours (GDPR Article 33).
