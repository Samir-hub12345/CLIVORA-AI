"""CLINOVA AI — Data Retention & Disposal Service.

Enforces HIPAA, GDPR, and clinical regulatory data lifecycle policies.
Handles automated purging of soft-deleted documents, expired quarantine files,
stale upload artifacts, and long-term archiving of closed records.
"""

import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.document import Document, DocumentStatus, DocumentArtifact
from app.models.case import TriageCase
from app.services.storage import storage_service
from app.services.audit import AuditService

logger = logging.getLogger("clinova.retention")


@dataclass
class RetentionRuleResult:
    rule_name: str
    candidates_count: int = 0
    purged_count: int = 0
    bytes_freed: int = 0
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RetentionSweepReport:
    timestamp: str
    dry_run: bool
    rules_executed: List[RetentionRuleResult] = field(default_factory=list)
    total_candidates: int = 0
    total_purged: int = 0
    total_bytes_freed: int = 0
    duration_seconds: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "dry_run": self.dry_run,
            "rules_executed": [asdict(r) for r in self.rules_executed],
            "total_candidates": self.total_candidates,
            "total_purged": self.total_purged,
            "total_bytes_freed": self.total_bytes_freed,
            "duration_seconds": round(self.duration_seconds, 4),
        }


class RetentionService:
    """Manages compliance data lifecycles, soft-deletion purge windows, and storage garbage collection."""

    # Default Retention Policy Rules
    SOFT_DELETED_RETENTION_DAYS = 30
    QUARANTINED_RETENTION_DAYS = 90
    FAILED_DOCUMENTS_RETENTION_DAYS = 14
    TEMP_ARTIFACT_RETENTION_DAYS = 7

    @classmethod
    async def run_retention_sweep(
        cls,
        db: AsyncSession,
        dry_run: bool = True,
        triggered_by_user_id: Optional[str] = None,
        triggered_by_email: Optional[str] = None,
    ) -> RetentionSweepReport:
        """Executes a full compliance retention sweep across documents, artifacts, and queues.

        Args:
            db: Active asynchronous database session.
            dry_run: If True, identifies and counts expired candidates without modifying files or rows.
            triggered_by_user_id: User ID initiating the retention sweep (or 'SYSTEM').
            triggered_by_email: User email initiating the sweep.

        Returns:
            RetentionSweepReport detailing execution metrics.
        """
        start_time = time.perf_counter()
        now = datetime.now(timezone.utc)
        report = RetentionSweepReport(
            timestamp=now.isoformat(),
            dry_run=dry_run,
        )

        logger.info(
            f"Starting data retention sweep (dry_run={dry_run}) triggered by {triggered_by_email or 'system'}"
        )

        # 1. Soft-deleted documents older than 30 days
        rule1 = await cls._purge_soft_deleted_documents(db, now, dry_run)
        report.rules_executed.append(rule1)

        # 2. Quarantined malware/corrupt documents older than 90 days
        rule2 = await cls._purge_expired_quarantine(db, now, dry_run)
        report.rules_executed.append(rule2)

        # 3. Failed document processing attempts older than 14 days
        rule3 = await cls._purge_failed_documents(db, now, dry_run)
        report.rules_executed.append(rule3)

        # Calculate totals
        for r in report.rules_executed:
            report.total_candidates += r.candidates_count
            report.total_purged += r.purged_count
            report.total_bytes_freed += r.bytes_freed

        report.duration_seconds = time.perf_counter() - start_time

        # Immutable HIPAA / Compliance Audit Record
        if not dry_run:
            await db.commit()
            await AuditService.log_event(
                action="DATA_RETENTION_PURGE",
                resource_type="system_storage",
                resource_id="retention_sweep",
                user_id=triggered_by_user_id,
                user_email=triggered_by_email or "system@clinova.ai",
                details=(
                    f"Retention sweep executed. Purged {report.total_purged} items, "
                    f"freed {report.total_bytes_freed} bytes in {report.duration_seconds:.2f}s."
                ),
            )
        else:
            await AuditService.log_event(
                action="DATA_RETENTION_DRY_RUN",
                resource_type="system_storage",
                resource_id="retention_sweep",
                user_id=triggered_by_user_id,
                user_email=triggered_by_email or "system@clinova.ai",
                details=(
                    f"Retention dry-run identified {report.total_candidates} candidates "
                    f"({report.total_bytes_freed} bytes reclaimable)."
                ),
            )

        logger.info(
            f"Retention sweep completed in {report.duration_seconds:.3f}s. "
            f"Candidates={report.total_candidates}, Purged={report.total_purged}, Bytes={report.total_bytes_freed}"
        )
        return report

    @classmethod
    async def _purge_soft_deleted_documents(
        cls, db: AsyncSession, now: datetime, dry_run: bool
    ) -> RetentionRuleResult:
        """Purge documents soft-deleted more than SOFT_DELETED_RETENTION_DAYS ago."""
        cutoff = now - timedelta(days=cls.SOFT_DELETED_RETENTION_DAYS)
        result = RetentionRuleResult(
            rule_name="soft_deleted_documents",
            details={"cutoff_date": cutoff.isoformat(), "policy_days": cls.SOFT_DELETED_RETENTION_DAYS},
        )

        query = (
            select(Document)
            .options(selectinload(Document.artifacts))
            .where(
                Document.deleted_at.is_not(None),
                Document.deleted_at <= cutoff,
            )
        )
        res = await db.execute(query)
        docs = res.scalars().all()

        result.candidates_count = len(docs)
        for doc in docs:
            result.bytes_freed += doc.file_size_bytes or 0
            for art in doc.artifacts:
                result.bytes_freed += art.file_size_bytes or 0

            if not dry_run:
                # Delete underlying storage files
                cls._delete_storage_file(doc.storage_key)
                for art in doc.artifacts:
                    cls._delete_storage_file(art.storage_key)
                # Remove document record (cascade deletes artifacts)
                await db.delete(doc)
                result.purged_count += 1

        return result

    @classmethod
    async def _purge_expired_quarantine(
        cls, db: AsyncSession, now: datetime, dry_run: bool
    ) -> RetentionRuleResult:
        """Purge quarantined documents older than QUARANTINED_RETENTION_DAYS."""
        cutoff = now - timedelta(days=cls.QUARANTINED_RETENTION_DAYS)
        result = RetentionRuleResult(
            rule_name="expired_quarantine",
            details={"cutoff_date": cutoff.isoformat(), "policy_days": cls.QUARANTINED_RETENTION_DAYS},
        )

        query = (
            select(Document)
            .options(selectinload(Document.artifacts))
            .where(
                Document.status == DocumentStatus.QUARANTINED,
                Document.quarantined_at.is_not(None),
                Document.quarantined_at <= cutoff,
            )
        )
        res = await db.execute(query)
        docs = res.scalars().all()

        result.candidates_count = len(docs)
        for doc in docs:
            result.bytes_freed += doc.file_size_bytes or 0
            for art in doc.artifacts:
                result.bytes_freed += art.file_size_bytes or 0

            if not dry_run:
                cls._delete_storage_file(doc.storage_key, is_quarantine=True)
                for art in doc.artifacts:
                    cls._delete_storage_file(art.storage_key)
                await db.delete(doc)
                result.purged_count += 1

        return result

    @classmethod
    async def _purge_failed_documents(
        cls, db: AsyncSession, now: datetime, dry_run: bool
    ) -> RetentionRuleResult:
        """Purge failed document processing attempts older than FAILED_DOCUMENTS_RETENTION_DAYS."""
        cutoff = now - timedelta(days=cls.FAILED_DOCUMENTS_RETENTION_DAYS)
        result = RetentionRuleResult(
            rule_name="failed_documents",
            details={"cutoff_date": cutoff.isoformat(), "policy_days": cls.FAILED_DOCUMENTS_RETENTION_DAYS},
        )

        query = (
            select(Document)
            .options(selectinload(Document.artifacts))
            .where(
                Document.status == DocumentStatus.FAILED,
                Document.created_at <= cutoff,
            )
        )
        res = await db.execute(query)
        docs = res.scalars().all()

        result.candidates_count = len(docs)
        for doc in docs:
            result.bytes_freed += doc.file_size_bytes or 0
            for art in doc.artifacts:
                result.bytes_freed += art.file_size_bytes or 0

            if not dry_run:
                cls._delete_storage_file(doc.storage_key)
                for art in doc.artifacts:
                    cls._delete_storage_file(art.storage_key)
                await db.delete(doc)
                result.purged_count += 1

        return result

    @staticmethod
    def _delete_storage_file(storage_key: Optional[str], is_quarantine: bool = False):
        """Safely removes object from underlying storage backend without raising fatal exceptions."""
        if not storage_key:
            return
        try:
            # Check backend delete
            storage_service.backend.delete_object(storage_key)
        except Exception as e:
            logger.warning(f"Could not delete storage object {storage_key}: {e}")
