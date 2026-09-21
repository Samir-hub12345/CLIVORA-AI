# CLINOVA AI — Disaster Recovery & Business Continuity Runbook

## 1. Operational Objectives

| Metric | Target Objective | Definition |
| :--- | :--- | :--- |
| **RPO** (Recovery Point Objective) | **< 1 Hour** | Maximum acceptable data loss duration during a catastrophic failure. |
| **RTO** (Recovery Time Objective) | **< 15 Minutes** | Target duration to restore full operational services after incident declared. |

---

## 2. Recovery Procedures by Incident Scenario

### Scenario A: Primary Database Node Failure
1. **Detection**: Healthcheck monitor on `http://backend:8000/api/v1/health/ready` returns `503 Service Unavailable`.
2. **Immediate Action**:
   - Inspect PostgreSQL service logs: `docker compose logs postgres` or Windows service.
   - If unrecoverable corruption detected, trigger restore from latest verified backup:
     ```powershell
     powershell -ExecutionPolicy Bypass -File scripts/verify_restore.ps1
     ```
3. **Failover**:
   - Switch `DATABASE_URL` in `.env` to point to warm standby replica or restored cluster.
   - Run `python -m alembic upgrade head` to ensure all migration revisions match.
   - Restart backend instances.

### Scenario B: Storage System / File Corruption
1. **Detection**: Document download requests return `404` or checksum verification fails in `app.services.storage`.
2. **Recovery**:
   - Original document files are mirrored across redundant block storage / S3 buckets.
   - Download missing storage keys using synchronization scripts.
   - Verify file checksums against `documents.checksum_sha256` stored in PostgreSQL.

### Scenario C: LLM / External AI Service Outage
1. **Automatic Fallback**:
   - `gemini_service.py` detects timeout, rate-limit, or connection rejection.
   - Clinova automatically switches to local heuristic SOAP synthesis and rule-engine processing.
   - Clinicians receive notification: `"AI decision support operating in offline fallback mode. Clinical rules R01-R06 active."`
   - Clinical triage continues without disruption.

### Scenario D: Total Network Outage (Edge Health Center)
1. **Offline Mode**:
   - Next.js client switches to `OFFLINE` state via `ConnectivityProvider`.
   - New patient intakes and vitals are committed locally into browser `IndexedDB`.
   - Upon network restoration, `syncOfflineQueue` replays queued requests with timestamp/version verification.

---

## 3. Scheduled Verification Testing

- **Daily**: Automated backup creation via `scripts/backup_db.ps1`.
- **Weekly**: Automated restore verification test into isolated temporary database (`scripts/verify_restore.ps1`).
- **Quarterly**: Table-top disaster recovery exercise simulating complete primary server loss.
