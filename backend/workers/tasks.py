"""
Core processing pipeline, run per job: tile -> infer -> blend -> store -> score.
Each stage below should update job status in Postgres so the frontend dashboard
(docs/AppFlow.md, "Job dashboard" screen) can show live progress.
"""
from workers.celery_app import celery_app


@celery_app.task(bind=True)
def process_scene(self, scene_id: str, job_id: str, inference_mode: str, generate_confidence_map: bool):
    """
    1. Load the scene's COG from object storage.
    2. Tile it into overlapping patches (overlap margin avoids seam artifacts).
    3. Run the SR model (see backend/models/sr_model.py) on each tile, plus the
       uncertainty head if generate_confidence_map is True.
    4. Feather-blend tiles back into one seamless output mosaic.
    5. Write SR output + confidence map to object storage as COG.
    6. Compute metrics (models/../ml/eval/metrics.py) — reference-based if HR
       ground truth exists, no-reference otherwise.
    7. Update job status to "complete" (or "failed" with a reason).
    """
    # TODO: implement pipeline stages
    raise NotImplementedError
