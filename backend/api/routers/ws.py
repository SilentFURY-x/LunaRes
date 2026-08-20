"""
WebSocket endpoint for real-time job progress streaming.

The frontend connects here instead of polling GET /jobs/{id} — gives a live,
responsive feel during the demo as tiles complete.  Falls back gracefully
if the client disconnects.
"""
import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from db.database import SessionLocal
from db.models import Job

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/jobs/{job_id}")
async def job_progress_ws(websocket: WebSocket, job_id: str):
    """
    Stream real-time job progress over WebSocket.

    Sends JSON messages with job status and tile progress every second
    until the job reaches a terminal state (complete / failed / cancelled).
    """
    await websocket.accept()
    logger.info("WebSocket connected for job %s", job_id)

    try:
        while True:
            # Query current job state
            db = SessionLocal()
            try:
                job = db.query(Job).filter(Job.id == job_id).first()

                if not job:
                    await websocket.send_json({
                        "error": f"Job {job_id} not found",
                        "type": "error",
                    })
                    break

                total = job.tiles_total or 0
                complete = job.tiles_complete or 0
                pct = round((complete / total) * 100, 1) if total > 0 else 0.0

                message = {
                    "type": "progress",
                    "job_id": job.id,
                    "status": job.status,
                    "tiles_total": total,
                    "tiles_complete": complete,
                    "progress_pct": pct,
                    "error_message": job.error_message,
                    "updated_at": job.updated_at.isoformat() if job.updated_at else None,
                }

                await websocket.send_json(message)

                # Stop streaming if job reached a terminal state
                if job.status in ("complete", "failed", "cancelled"):
                    await websocket.send_json({
                        "type": "done",
                        "job_id": job.id,
                        "status": job.status,
                        "final": True,
                    })
                    break

            finally:
                db.close()

            # Poll interval — 1 second gives a responsive demo feel
            await asyncio.sleep(1)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for job %s", job_id)
    except Exception as exc:
        logger.error("WebSocket error for job %s: %s", job_id, exc)
        try:
            await websocket.send_json({"type": "error", "error": str(exc)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
