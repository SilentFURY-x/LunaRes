# Backend

FastAPI application + Celery workers + ISRO pipeline adapter.

## Run locally without Docker

```bash
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn api.main:app --reload
```

## Run the worker

```bash
celery -A workers.celery_app worker --loglevel=info
```

## API Documentation

Once running, visit `http://localhost:8000/docs` for the full interactive API docs.

### Key Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/scenes/upload` | POST | Upload a GeoTIFF/PNG/JPEG/PDS image (multipart) |
| `/scenes/` | POST | Register a scene from existing storage URI |
| `/scenes/` | GET | Spatial search with bbox, sensor, date filters |
| `/scenes/{id}` | GET | Scene metadata + presigned download URL |
| `/jobs/` | POST | Submit an SR processing job (single or batch) |
| `/jobs/{id}` | GET | Job status with tile progress |
| `/jobs/` | GET | List all jobs (filterable by status) |
| `/jobs/{id}` | DELETE | Cancel a queued/running job |
| `/products/{id}` | GET | Product metadata + quality metrics |
| `/products/{id}/download` | GET | Presigned download URLs (SR output, confidence map, report) |
| `/products/{id}/report` | GET | Structured metrics report with provenance |
| `/pipeline/search` | GET | ISRO Bhoonidhi-compatible catalog search |
| `/pipeline/fetch/{id}` | POST | Fetch and ingest a product from the catalog |
| `/pipeline/push/{id}` | POST | Push enhanced product back in ISRO format |
| `/pipeline/status` | GET | Adapter mode (mock/live) and config info |
| `/ws/jobs/{id}` | WS | Real-time job progress via WebSocket |
| `/health` | GET | Dependency status (Postgres, Redis, MinIO) |

## Layout

- `api/` — HTTP layer only. No business logic here beyond request/response handling —
  delegate to `services/`, `workers/`, `adapters/`, and `models/`.
  - `routers/` — scenes, jobs, products, pipeline, WebSocket endpoints.
  - `dependencies.py` — FastAPI dependency injection (DB session, storage, adapter).
  - `schemas.py` — Pydantic request/response models for all endpoints.
  - `config.py` — Centralized settings from `.env`.
- `services/storage.py` — centralized S3/MinIO service (upload, download, presigned
  URLs, SHA-256 hashing). All file interactions go through here.
- `adapters/bhoonidhi/` — the ISRO-pipeline-compatible ingestion/egress layer.
  `base.py` defines the interface; `mock_adapter.py` and `live_adapter.py` both
  implement it, so the rest of the system never needs to know which one is active.
- `workers/` — Celery tasks: tile a scene (with cosine-ramp feather blending), run
  SR inference, blend results into a seamless mosaic, compute quality metrics
  (PSNR/SSIM/NIQE), generate reports, and write to storage. This is where
  scalability actually lives — add more workers to add throughput.
  - `tiling.py` — tile grid computation and feather-blend mosaic assembly.
  - `metrics.py` — PSNR, SSIM, and no-reference spatial quality scoring.
- `models/` — SR model and uncertainty-head inference wrappers. Includes a bicubic
  upscale fallback so the full pipeline works end-to-end before trained weights exist.
  Training code lives in `../ml/train`.
- `db/` — SQLAlchemy models (Scene, Job, Product, Feedback) and PostGIS-aware schema.
  `init_db.py` creates PostGIS extension and all tables on startup.
