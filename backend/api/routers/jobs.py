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
    poll GET /jobs/{id} or connect via WebSocket for live progress.
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

        job.celery_task_id = task_ids[0] if task_ids else None
        db.commit()
    except Exception as exc:
        logger.warning("Failed to dispatch Celery task: %s", exc)

    logger.info("Job %s created with %d scene(s)", job.id, len(payload.scene_ids))
    return _job_to_response(job)


# ──────────────────────────────────────────────────────────────────────
# GET /jobs/stats — aggregate stats for the dashboard header
# ──────────────────────────────────────────────────────────────────────
@router.get("/stats")
def get_aggregate_stats(db: DbDep):
    """
    Returns aggregate job stats for the frontend dashboard header.
    Must be defined BEFORE /{job_id} to avoid route conflict.
    """
    from sqlalchemy import func

    total_jobs = db.query(func.count(Job.id)).scalar() or 0
    active_jobs = db.query(func.count(Job.id)).filter(
        Job.status.in_(["queued", "tiling", "inferring", "blending"])
    ).scalar() or 0
    total_tiles = db.query(func.coalesce(func.sum(Job.tiles_complete), 0)).scalar() or 0

    # Rough throughput estimate: tiles processed in last 5 minutes
    from datetime import datetime, timezone, timedelta
    five_min_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
    recent_tiles = db.query(
        func.coalesce(func.sum(Job.tiles_complete), 0)
    ).filter(Job.updated_at >= five_min_ago).scalar() or 0
    throughput = round(recent_tiles / 5, 1) if recent_tiles > 0 else 0

    return {
        "active_workers": active_jobs,
        "total_tiles_processed": int(total_tiles),
        "throughput_tiles_per_minute": throughput,
    }


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
# GET /jobs/ — list all jobs (returns flat array for frontend)
# ──────────────────────────────────────────────────────────────────────
@router.get("/")
def list_jobs(
    db: DbDep,
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all jobs. Returns a flat array matching frontend JobListItem[]."""
    query = db.query(Job)
    if status:
        query = query.filter(Job.status == status)
    jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()

    # Frontend expects a flat array of JobListItem objects
    return [
        {
            "job_id": j.id,
            "status": j.status,
            "inference_mode": j.inference_mode,
            "tiles_total": j.tiles_total or 0,
            "tiles_complete": j.tiles_complete or 0,
            "scene_count": len(j.scene_ids) if j.scene_ids else 0,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "updated_at": j.updated_at.isoformat() if j.updated_at else None,
        }
        for j in jobs
    ]


# ──────────────────────────────────────────────────────────────────────
# DELETE /jobs/{job_id} — cancel a job
# ──────────────────────────────────────────────────────────────────────
@router.delete("/{job_id}", response_model=JobStatusResponse)
def cancel_job(job_id: str, db: DbDep):
    """Cancel a queued or running job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if job.status in ("complete", "cancelled"):
        raise HTTPException(
            status_code=400,
            detail=f"Job is already {job.status} — cannot cancel.",
        )

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
