# Backend

FastAPI application + Celery workers + ISRO pipeline adapter.

## Run locally without Docker

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload
```

## Run the worker

```bash
celery -A workers.celery_app worker --loglevel=info
```

## Layout

- `api/` — HTTP layer only. No business logic here beyond request/response handling —
  delegate to `workers/`, `adapters/`, and `models/`.
- `adapters/bhoonidhi/` — the ISRO-pipeline-compatible ingestion/egress layer.
  `base.py` defines the interface; `mock_adapter.py` and `live_adapter.py` both
  implement it, so the rest of the system never needs to know which one is active.
- `workers/` — Celery tasks: tile a scene, run inference, blend results, write to
  storage. This is where scalability actually lives — add more workers to add
  throughput.
- `models/` — SR model and uncertainty-head definitions (inference-time wrappers;
  training code lives in `../ml/train`).
- `db/` — SQLAlchemy models and PostGIS-aware schema.
