# Architecture.md
## LunaRes — System Architecture

---

## 1. Architectural Principles

1. **Thin client, heavy server.** The browser never touches a raw multi-gigabyte raster. It requests tiles.
2. **One canonical format internally.** Everything entering the system — regardless of source format — is normalized to georeferenced Cloud-Optimized GeoTIFF (COG) before it touches the model or the viewer.
3. **Async by default.** Inference is a job, not a request/response call. This is what makes "Scalable" true rather than asserted.
4. **The ISRO pipeline is a first-class interface, not an afterthought.** The ingestion/egress layer is built to the shape of Bhoonidhi's actual API contract from day one.
5. **Never ship a number without a confidence value next to it.** Uncertainty is threaded through storage, API, and UI as a parallel channel to the enhanced image itself.

---

## 2. High-Level Component Diagram (textual)

```
┌─────────────────────────────────────────────────────────────────────┐
│                            WEB CLIENT (React)                        │
│  Upload/AOI Map  │  Job Dashboard  │  Tile Viewer (before/after +    │
│                   │                │  confidence overlay)  │ Reports │
└───────────────┬───────────────────────────────────────────┬─────────┘
                │  REST/GraphQL                              │ Tile requests
                ▼                                             ▼
┌─────────────────────────────┐                 ┌──────────────────────────┐
│         API GATEWAY          │                 │      TILE SERVER          │
│  (FastAPI) — auth, routing,  │                 │  (titiler / dynamic COG   │
│  job submission, status      │                 │   tiling) — serves LR,    │
└───────┬───────────────┬─────┘                 │   SR, and confidence      │
        │               │                        │   layers as XYZ tiles    │
        ▼               ▼                        └────────────▲─────────────┘
┌───────────────┐ ┌─────────────────┐                          │
│  METADATA DB   │ │   JOB QUEUE      │                         │
│  (PostgreSQL   │ │  (Redis + Celery │                         │
│   + PostGIS)   │ │   / RQ)          │                         │
│  scenes, jobs, │ └────────┬─────────┘                         │
│  provenance    │          │                                    │
└───────────────┘          ▼                                    │
                  ┌───────────────────┐                          │
                  │  INFERENCE WORKERS │──── writes ──────────────┘
                  │  (GPU, autoscaled) │
                  │  ┌───────────────┐│
                  │  │ Tiling engine ││  splits large scene into
                  │  │ SR model(s)   ││  overlapping patches, runs
                  │  │ Uncertainty   ││  model, feather-blends back
                  │  │  head/module  ││  into a seamless mosaic
                  │  └───────────────┘│
                  └─────────┬──────────┘
                             ▼
                  ┌───────────────────┐
                  │  OBJECT STORAGE     │  raw ingests, COG originals,
                  │  (S3 / MinIO)       │  SR outputs, confidence maps,
                  └─────────┬──────────┘  generated PDF reports
                             │
                             ▼
                  ┌───────────────────────────┐
                  │  ISRO PIPELINE ADAPTER      │  translates Bhoonidhi-style
                  │  (Bhoonidhi-contract layer) │  search/fetch/order calls
                  │  in: PRADAN/Bhoonidhi/PDS   │  <-> internal job + storage
                  │  out: enhanced GeoTIFF/COG  │  model. Mockable for demo.
                  └───────────────────────────┘
```

---

## 3. Component Detail

### 3.1 Web Client (React + TypeScript)
- Map-based AOI picker (Leaflet/MapLibre) for catalog-driven selection, plus direct file upload for local images.
- Tiled viewer using `geotiff.js`/COG-tile endpoints — never loads a full raster into browser memory.
- Before/after synchronized swipe-slider component; independent toggle for the confidence heatmap layer (rendered as a separate tile layer with opacity control, not baked into the image).
- Job dashboard: submit batch, poll/subscribe (WebSocket or polling) to status, download results.
- Report view: renders the auto-generated per-scene metrics/report.

### 3.2 API Gateway (FastAPI, Python)
- Stateless; all state lives in Postgres/Redis/object storage so it can scale horizontally behind a load balancer.
- **Scenes endpoints:** `POST /scenes/upload` (multipart file upload with SHA-256 content-hash deduplication and rasterio metadata extraction), `POST /scenes/` (register from storage URI), `GET /scenes/{id}` (metadata + presigned download URL), `GET /scenes/` (spatial search via PostGIS `ST_Intersects` on bbox, with sensor/date filters and pagination).
- **Jobs endpoints:** `POST /jobs/` (submit with scene validation + Celery dispatch), `GET /jobs/{id}` (status + tile progress), `GET /jobs/` (list with status filter + pagination), `DELETE /jobs/{id}` (cancel with Celery revoke), `GET /jobs/{id}/products` (list job outputs).
- **Products endpoints:** `GET /products/{id}` (metadata + metrics), `GET /products/{id}/download` (time-limited presigned URLs for SR output, confidence map, and report), `GET /products/{id}/report` (structured metrics report with provenance).
- **Pipeline endpoints:** `GET /pipeline/search`, `POST /pipeline/fetch/{id}`, `POST /pipeline/push/{id}`, `GET /pipeline/status` — mirrors Bhoonidhi's contract.
- **WebSocket:** `WS /ws/jobs/{job_id}` — streams real-time tile completion progress every second until the job reaches a terminal state.
- **Health:** `GET /health` — reports dependency status (Postgres, Redis, MinIO) with latency measurements.
- **Services layer:** all S3/MinIO interactions go through a centralized `StorageService` class (upload, download, presigned URLs, SHA-256 hashing, key generation) — makes the MinIO→S3 swap zero-code-change.
- AuthN/Z via API keys (for pipeline/service callers) and session auth (for the web UI).

### 3.3 Job Queue & Workers (Redis + Celery, or RQ for simplicity)
- Decouples "a scene was submitted" from "a scene was processed" — the mechanism that actually makes the system scalable rather than a single blocking script.
- Each worker pulls a job, tiles the input scene (with overlap margins to avoid seam artifacts), runs the model per tile, feather-blends tiles back into one seamless output raster, writes results to object storage, and updates job status in Postgres.
- Workers are stateless and horizontally scalable — add more GPU workers to increase throughput; this is your live proof point for the "Scalable" requirement (show the queue depth dropping faster with 2 workers vs 1 in the demo, even on modest hardware).

### 3.4 Inference Engine (PyTorch)
- **Fast path (MVP default):** Real-ESRGAN-style / SwinIR-style regression model — good PSNR/SSIM, low latency, deterministic.
- **High-fidelity path (stretch):** diffusion-based refinement (e.g., a ResShift/one-step-diffusion-style model) — sharper perceptual detail, higher compute cost, used selectively.
- **Uncertainty module:** implemented either as (a) an ensemble/MC-dropout variance estimate, or (b) a self-supervised predicted-variance head trained alongside the SR model (see recent self-supervised uncertainty-estimation research for satellite SR — this avoids needing ground truth at inference time, which matters because in production you often *don't have* the HR ground truth). Output: a per-pixel or per-tile confidence raster, same georeference as the SR output.
- Sensor-domain profiles: separate fine-tuned weights (or conditioning input) per sensor family (lunar panchromatic / Earth optical / SAR), selected automatically from input metadata or manually by the user.

### 3.5 Metadata DB (PostgreSQL + PostGIS)
- Tables: `scenes` (source URI, original filename, content hash for dedup, sensor profile, file format, CRS, GSD, width/height/bands/dtype, footprint geometry, acquisition time, product ID), `jobs` (status, inference mode, confidence/downstream flags, tile counts, error message, Celery task ID for cancellation), `products` (SR output URI, confidence map URI, report URI, all quality metrics, processing time — each linked to scene+job via foreign keys with bidirectional relationships), `feedback` (human-in-the-loop corrections, stretch feature).
- PostGIS enables spatial queries (e.g., "give me all enhanced scenes overlapping this AOI") — directly useful for the map-based UI and for the pipeline adapter's "search" semantics.
- DB init runs automatically on API startup (PostGIS extension + `CREATE TABLE IF NOT EXISTS`) — no manual migration needed during the hackathon.

### 3.6 Object Storage (S3-compatible — AWS S3 or self-hosted MinIO for the hackathon)
- Stores: raw ingested rasters, normalized COGs, SR outputs, confidence maps, generated PDF reports.
- Signed URLs issued for client/tile-server access — nothing public by default.

### 3.7 Tile Server
- Use an existing dynamic-COG-tiling service (e.g., `titiler`) rather than building one — serves any of the LR/SR/confidence layers as standard XYZ tiles the frontend map library already knows how to consume. This single decision removes most of the "large image in a browser" risk from the project.

### 3.8 ISRO Pipeline Adapter
- A dedicated module that speaks Bhoonidhi's request/response shape: search by AOI/date/sensor, fetch by product ID, and (for egress) push an enhanced product back in the same product-metadata shape ISRO's own systems expect (GeoTIFF/COG + XML/JSON metadata sidecar).
- Two implementations behind the same interface: a **live adapter** (calls the real Bhoonidhi API, if access is granted in time) and a **mock adapter** (serves cached/sample responses) — the rest of the system is identical either way, so the demo works regardless of whether API approval comes through in time. This interface-with-two-implementations pattern is itself worth explaining to judges — it shows you designed for a real integration, not just a demo hack.

---

## 4. Data Flow (end to end)

1. Ingest: file upload or pipeline-adapter fetch → raw file (GeoTIFF/PNG/PDS `.IMG`) lands in object storage.
2. Normalize: converted to georeferenced COG via GDAL/rasterio; metadata extracted into Postgres.
3. Job submitted → queued.
4. Worker: tile → batch inference (SR model + uncertainty module) → feather-blend mosaic → write SR COG + confidence COG to storage → compute metrics (reference-based if HR ground truth exists, no-reference otherwise) → generate report.
5. Job marked complete; client notified/polls.
6. Client requests tiles from tile server for LR, SR, and confidence layers; renders swipe comparison.
7. Optional egress: adapter pushes the SR product back out in ISRO-pipeline-compatible form.

---

## 5. Scalability Approach

- **Horizontal, not vertical:** add inference workers, not a bigger single machine, to raise throughput — stateless workers behind the queue make this trivial.
- **Tile-parallel inference:** each scene decomposes into many independent tiles, which parallelize naturally across workers/GPUs.
- **Caching:** identical AOI+sensor+model-version requests can be served from the product cache in object storage instead of re-running inference.
- **Batch API:** the pipeline adapter and job API both accept N-scene batches as one call, so ISRO-style bulk processing is a first-class use case, not something bolted on.
- **Model tiering:** the lightweight/distilled model variant (stretch S5) exists specifically to demonstrate a scalability/cost lever — cheaper inference for bulk/low-priority jobs, full model for flagged high-value AOIs.

## 6. Security & Reliability Notes

- Signed, time-limited URLs for all object storage access — no direct public bucket access.
- API-key auth for the pipeline adapter endpoints; session auth for the human web UI.
- Idempotent job submission (dedupe by content hash) so retries/pipeline callbacks don't double-process.
- Tile-level retry with exponential backoff; a scene job only fails outright if a tile exhausts retries, and partial results remain available rather than being discarded.

## 7. Why not a desktop app instead of a web app?

Briefly, since you asked about feasibility: a desktop app would only make sense if you needed direct, low-level access to local GIS software (e.g., scripting inside QGIS) or offline field use without any backend. Neither applies here — your compute has to live on a GPU server regardless of client type, and a browser-based tile viewer is the industry-standard way to interact with large georeferenced rasters (this is literally how Bhoonidhi's own web portal, Google Earth Engine, and every modern GIS SaaS product work). Stick with the web app; just don't let the browser load raw rasters directly — that's the only real trap.
