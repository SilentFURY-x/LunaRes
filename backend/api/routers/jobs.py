"""
Job submission + status. A job enqueues one or more scenes for tiling + SR
inference + mosaic blending, executed asynchronously by Celery workers
(see backend/workers/tasks.py). This is what makes throughput scalable —
the API layer never blocks on inference.
"""
from fastapi import APIRouter, HTTPException
from api.schemas import JobCreate, JobStatusResponse

router = APIRouter()


@router.post("/", response_model=JobStatusResponse)
def submit_job(job: JobCreate):
    """
    Enqueue a job (single scene or batch). Returns immediately with a job_id;
    poll GET /jobs/{job_id} or subscribe via websocket for status.
    TODO: enqueue workers.tasks.process_scene for each scene_id.
    """
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str):
    raise HTTPException(status_code=501, detail="Not implemented yet")
