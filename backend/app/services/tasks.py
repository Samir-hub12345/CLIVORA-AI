import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import BackgroundJob, JobStatus, JobType
from app.db.session import async_session_factory

logger = logging.getLogger("clinova")


class TaskManager:
    """Manages creation, execution, and lifecycle of asynchronous background jobs."""

    @staticmethod
    async def create_job(
        db: AsyncSession,
        job_type: JobType,
        payload: Dict[str, Any],
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
    ) -> BackgroundJob:
        """Enqueues a new background job with status QUEUED."""
        job = BackgroundJob(
            job_type=job_type,
            status=JobStatus.QUEUED,
            payload_json=json.dumps(payload),
            created_by=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        logger.info(f"Background job enqueued: {job.id} (Type: {job.job_type.value})")
        return job

    @staticmethod
    async def execute_job_async(job_id: str):
        """Asynchronous execution worker for background processing."""
        async with async_session_factory() as db:
            stmt = select(BackgroundJob).where(BackgroundJob.id == job_id)
            job = (await db.execute(stmt)).scalar_one_or_none()
            if not job:
                logger.error(f"Job {job_id} not found for background execution.")
                return

            job.status = JobStatus.RUNNING
            job.started_at = datetime.now(timezone.utc)
            await db.commit()

            try:
                payload = json.loads(job.payload_json or "{}")
                result = {}

                # Dispatch according to job type
                if job.job_type == JobType.DOCUMENT_OCR:
                    from app.services.ocr_service import ocr_service
                    # In real worker, processes document bytes from storage or payload
                    ocr_res = await ocr_service.process_report(
                        file_bytes=b"",
                        filename=payload.get("filename", "report.pdf"),
                    )
                    result = ocr_res.model_dump()

                elif job.job_type == JobType.AUDIO_TRANSCRIPTION:
                    from app.services.speech_service import speech_service
                    trans_res = await speech_service.transcribe_audio(
                        audio_bytes=b"",
                        filename=payload.get("filename", "audio.wav"),
                        language_hint=payload.get("language_hint", "en"),
                    )
                    result = trans_res.model_dump()

                elif job.job_type == JobType.AI_TRIAGE_SYNTHESIS:
                    from app.services.ai.gemini_service import ai_service
                    triage_res = await ai_service.synthesize_triage_note(
                        case_id=payload.get("case_id", "ASYNC-CASE"),
                        symptoms=payload.get("symptoms", ""),
                        patient_age=payload.get("patient_age"),
                        gender=payload.get("gender"),
                    )
                    result = triage_res

                else:
                    result = {"status": "success", "message": f"Processed job {job.id}"}

                job.status = JobStatus.COMPLETED
                job.result_json = json.dumps(result)
                job.completed_at = datetime.now(timezone.utc)
                await db.commit()
                logger.info(f"Background job completed: {job.id}")

            except Exception as e:
                logger.error(f"Background job {job_id} failed: {e}", exc_info=True)
                job.status = JobStatus.FAILED
                job.error_message = str(e)
                job.completed_at = datetime.now(timezone.utc)
                job.retry_count += 1
                await db.commit()


task_manager = TaskManager()
