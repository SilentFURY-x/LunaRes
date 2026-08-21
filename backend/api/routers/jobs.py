"""
Job submission + status. A job enqueues one or more scenes for tiling + SR
inference + mosaic blending, executed asynchronously by Celery workers
(see backend/workers/tasks.py). This is what makes throughput scalable —
the API layer never blocks on inference.
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from api.dependencies import DbDep
from api.schemas import (
    JobCreate,
    JobStatus,
    JobStatusResponse,
    JobListResponse,
    SRModelInfo,
)
from db.models import Job, Scene, Product

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/models", response_model=list[SRModelInfo])
def list_sr_models():
    """List selectable engines and whether their external weights are installed."""
    from models.registry import list_model_availability

    return list_model_availability()


# ──────────────────────────────────────────────────────────────────────
# POST /jobs/ — submit a processing job
# ──────────────────────────────────────────────────────────────────────
@router.post("/", response_model=JobStatusResponse, status_code=201)
def submit_job(payload: JobCreate, db: DbDep):
    """
    Enqueue a job (single scene or batch).  Returns immediately with a job_id;
    poll GET /jobs/{job_id} or connect via WebSocket for live progress.

    Validates that all scene_ids exist before creating the job.
    """
    # Validate all scene IDs exist
    for sid in payload.scene_ids:
        scene = db.query(Scene).filter(Scene.id == sid).first()
        if not scene:
            raise HTTPException(
                status_code=404,
                detail=f"Scene {sid} not found. Upload it first via POST /scenes/upload.",
            )

    # Keep the existing database column for compatibility while storing the
    # explicit model id selected by new clients.
    selected_model = payload.sr_model.value

    # Create job record
    job = Job(
        scene_ids=payload.scene_ids,
        inference_mode=selected_model,
        generate_confidence_map=payload.generate_confidence_map,
        run_downstream_comparison=payload.run_downstream_comparison,
        status="queued",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Dispatch Celery tasks — one per scene in the batch
    try:
        from workers.tasks import process_scene
        task_ids = []
        for scene_id in payload.scene_ids:
            result = process_scene.delay(
                scene_id=scene_id,
                job_id=job.id,
                model_name=selected_model,
                generate_confidence_map=payload.generate_confidence_map,
            )
            task_ids.append(result.id)

        # Store first task ID for cancellation support
        job.celery_task_id = task_ids[0] if task_ids else None
        db.commit()
    except Exception as exc:
        # If Celery isn't available (no Redis), the job stays queued —
        # don't crash the API. Log and continue.
        logger.warning("Failed to dispatch Celery task: %s", exc)

    logger.info("Job %s created with %d scene(s)", job.id, len(payload.scene_ids))
    return _job_to_response(job)


# ──────────────────────────────────────────────────────────────────────
# GET /jobs/{job_id} — check job status
# ──────────────────────────────────────────────────────────────────────
@router.get("/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str, db: DbDep):
    """Fetch current job status with tile-level progress."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return _job_to_response(job)


# ──────────────────────────────────────────────────────────────────────
# GET /jobs/ — list all jobs
# ──────────────────────────────────────────────────────────────────────
@router.get("/", response_model=JobListResponse)
def list_jobs(
    db: DbDep,
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all jobs, optionally filtered by status, newest first."""
    query = db.query(Job)
    if status:
        query = query.filter(Job.status == status)
    total = query.count()
    jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()
    return JobListResponse(
        jobs=[_job_to_response(j) for j in jobs],
        total=total,
    )


# ──────────────────────────────────────────────────────────────────────
# DELETE /jobs/{job_id} — cancel a job
# ──────────────────────────────────────────────────────────────────────
@router.delete("/{job_id}", response_model=JobStatusResponse)
def cancel_job(job_id: str, db: DbDep):
    """
    Cancel a queued or running job. Already-completed tiles are kept, not deleted.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if job.status in ("complete", "cancelled"):
        raise HTTPException(
            status_code=400,
            detail=f"Job is already {job.status} — cannot cancel.",
        )

    # Attempt to revoke the Celery task
    if job.celery_task_id:
        try:
            from workers.celery_app import celery_app
            celery_app.control.revoke(job.celery_task_id, terminate=True)
        except Exception as exc:
            logger.warning("Failed to revoke Celery task: %s", exc)

    job.status = "cancelled"
    db.commit()
    db.refresh(job)

    logger.info("Job %s cancelled", job.id)
    return _job_to_response(job)


# ──────────────────────────────────────────────────────────────────────
# GET /jobs/{job_id}/products — list products from a job
# ──────────────────────────────────────────────────────────────────────
@router.get("/{job_id}/products")
def get_job_products(job_id: str, db: DbDep):
    """Get all products generated by this job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    products = db.query(Product).filter(Product.job_id == job_id).all()
    return {
        "job_id": job_id,
        "status": job.status,
        "products": [
            {
                "id": p.id,
                "scene_id": p.scene_id,
                "sr_output_uri": p.sr_output_uri,
                "confidence_map_uri": p.confidence_map_uri,
                "model_version": p.model_version,
                "psnr": p.psnr,
                "ssim": p.ssim,
                "lpips": p.lpips,
                "processing_time_seconds": p.processing_time_seconds,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in products
        ],
    }


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _job_to_response(job: Job) -> JobStatusResponse:
    """Convert a DB Job model to an API response."""
    total = job.tiles_total or 0
    complete = job.tiles_complete or 0
    pct = round((complete / total) * 100, 1) if total > 0 else 0.0

    return JobStatusResponse(
        job_id=job.id,
        status=job.status,
        inference_mode=job.inference_mode,
        sr_model=job.inference_mode,
        tiles_total=total,
        tiles_complete=complete,
        progress_pct=pct,
        error_message=job.error_message,
        scene_ids=job.scene_ids or [],
        created_at=job.created_at,
        updated_at=job.updated_at,
    )
