from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.job import BackgroundJob
from app.models.user import User
from app.schemas.job import JobCreateRequest, JobResponse
from app.services.tasks import task_manager

router = APIRouter()


@router.post("", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def enqueue_background_job(
    req: JobCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Enqueues an expensive clinical job (OCR, AI synthesis, transcription) to run asynchronously."""
    job = await task_manager.create_job(
        db=db,
        job_type=req.job_type,
        payload=req.payload,
        user_id=current_user.id,
        resource_type=req.resource_type,
        resource_id=req.resource_id,
    )

    # Dispatch to background task runner
    background_tasks.add_task(task_manager.execute_job_async, job.id)

    return job


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Polls progress, status, and result of an asynchronous background job."""
    stmt = select(BackgroundJob).where(BackgroundJob.id == job_id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Background job not found.")
    return job
