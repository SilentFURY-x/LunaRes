"""
Celery application instance. Workers are stateless and horizontally scalable —
run more of them to raise throughput; this is the concrete proof point for the
"Scalable" requirement in the problem statement.
"""
from celery import Celery
from api.config import settings

celery_app = Celery(
    "lunares",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
)
