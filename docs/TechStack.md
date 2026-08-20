# Tech Stack.md
## LunaRes — Technology Choices & Rationale

Guiding rule: every choice below is picked to be buildable by a small hackathon team in a constrained window, while still being defensible as a "real" architecture to judges — no toy shortcuts that you'd have to lie about in Q&A.

---

## 1. Frontend

| Layer | Choice | Why |
|---|---|---|
| Framework | React + TypeScript | Fast iteration, huge ecosystem, team familiarity likely already there |
| Styling/UI kit | Tailwind CSS + shadcn/ui | Fast to build a clean, professional-looking demo UI without custom design time |
| Map/AOI selection | MapLibre GL JS or Leaflet | Both handle XYZ tile layers natively — pairs directly with the COG tile server |
| Large raster viewing | `geotiff.js` + tile-server-backed layers (not client-side full-image decode) | This is the single most important frontend decision — avoids the "browser chokes on a 2GB image" failure mode entirely |
| Before/after comparison | `react-compare-slider` (or equivalent swipe component) driven by two tile layers | Off-the-shelf, reliable, looks polished on demo day |
| State/data fetching | React Query (TanStack Query) | Clean handling of async job polling/status |
| Charts (metrics dashboard) | Recharts | Simple, matches the rest of the stack |

## 2. Backend

| Layer | Choice | Why |
|---|---|---|
| API framework | **FastAPI** (Python) | Same language as the ML stack (no serialization friction between API and model code), auto-generated OpenAPI docs — useful for presenting the "ISRO pipeline contract" cleanly to judges |
| Real-time updates | **WebSocket** (via FastAPI native support) | Streams tile-by-tile job progress to the frontend dashboard — gives a live, responsive demo feel vs. polling |
| Job queue | **Celery + Redis** | Standard, well-understood async task pattern; directly demonstrates the scalability story. Tasks are idempotent with content-hash dedup and retry with exponential backoff |
| Metadata database | **PostgreSQL + PostGIS** | PostGIS gives you spatial queries (AOI overlap search) for free — needed by both the catalog browse screen and the pipeline adapter's "search" semantics. Auto-initialized on startup |
| Object storage | **MinIO** (self-hosted, S3-compatible) for local/hackathon dev; swap to **AWS S3** for a hosted demo | Same API either way — centralized through a `StorageService` class so the swap is zero code changes |
| Tile serving | **titiler** (dynamic COG tiling service) | Don't hand-roll a tile server; this is a solved problem and titiler plugs directly into the FastAPI ecosystem |
| Geospatial format handling | **GDAL / rasterio** | Industry-standard; has native PDS3/PDS4 drivers, which is exactly what you need to ingest ISRO/NASA planetary data |
| Scientific computing | **NumPy + SciPy + Pillow** | NumPy for raster manipulation, SciPy for SSIM computation (uniform_filter), Pillow for bicubic upscale fallback and image format handling |
| Health monitoring | **Custom `/health` endpoint** | Checks Postgres, Redis, and MinIO connectivity with latency measurements — judges can verify all services are live at a glance |

## 3. Machine Learning

| Layer | Choice | Why |
|---|---|---|
| Framework | **PyTorch** | Standard for SR research, most reference implementations (Real-ESRGAN, SwinIR) are PyTorch-native |
| Fast/default SR model | **Real-ESRGAN-style architecture** (RRDB backbone + GAN training), or a SwinIR-style transformer backbone | Strong, well-documented baseline, trains in reasonable time on limited hackathon GPU budget, good PSNR/SSIM |
| High-fidelity stretch model | Diffusion-based refinement — e.g., a **residual-shifting / one-step-diffusion**-style efficient SR model | Recent literature explicitly targets fast, lightweight diffusion SR — feasible even under a hackathon compute budget, unlike full multi-step diffusion samplers |
| Uncertainty quantification | Either MC-dropout ensembling at inference, or a **self-supervised predicted-variance head** trained alongside the SR model | The self-supervised variant is worth the extra design effort: it estimates confidence without needing ground-truth HR data at inference time, which is the realistic production condition |
| Degradation modeling (for synthetic-pair augmentation on Earth-observation data) | Real-ESRGAN's practical degradation pipeline (blur + noise + resize + compression, randomized) | Well-validated approach for closing the synthetic-to-real domain gap when true paired data isn't available for a given sensor |
| Evaluation metrics | PSNR, SSIM, LPIPS (reference-based); NIQE or similar (no-reference) | Cover both the "we have real HR ground truth" case (TMC-2/OHRC pairs) and the "we don't" case (real deployment) |
| Data loading/augmentation | `rasterio`, `numpy`, `albumentations` (geometric/radiometric augmentation, careful not to break physical realism) | Standard, fast |
| Training environment | **Kaggle Notebooks / Google Colab / a rented GPU (RunPod, Lightning AI) for anything beyond free-tier limits** | Hackathon-realistic — most teams don't own an A100; plan the model size and training schedule around free-or-cheap GPU hours from day one, not as an afterthought |

## 4. Infrastructure & DevOps

| Layer | Choice | Why |
|---|---|---|
| Containerization | Docker + Docker Compose | One command spins up API, worker, Postgres, Redis, MinIO, tile server locally — critical for a multi-person hackathon team not fighting environment drift |
| Hosting (demo) | Frontend on **Vercel/Netlify**; backend+worker+DB on **Render/Railway**, or all-in-one via a rented small GPU VM if the model needs to run live during judging | Pick based on whether your demo needs live GPU inference or can pre-compute a curated set of examples plus a couple of live ones as backup |
| CI | GitHub Actions (lint + basic tests) | Cheap credibility signal, not a major time investment |
| Secrets/config | `.env` + a secrets manager if hosted (Render/Railway both support this natively) | Don't hardcode ISSDC/Bhoonidhi credentials into the repo |

## 5. Formats (cross-reference: DataSources.md has full detail)

- **Canonical internal format:** Cloud-Optimized GeoTIFF (COG), 16-bit or float32.
- **Ingest-supported formats:** GeoTIFF, PNG/JPEG (quicklook-only, not for training), PDS3/PDS4 (`.IMG` + `.LBL`/`.XML`).
- **Export formats:** GeoTIFF (georeferenced, science-grade), PNG (quicklook), PDF (report).

## 6. Is a Web App Feasible? (restated with the stack in mind)

Yes, and the stack above is exactly how real geospatial products (including ISRO's own Bhoonidhi portal, per its "HDF to GeoTIFF conversion + COG" tooling) are built. The two things that make a web app *not* feasible would be (a) trying to load/process raw multi-gigabyte rasters directly in the browser, and (b) trying to run model inference client-side. Both are solved here by keeping the browser tile-based and pushing all heavy compute to the backend job/worker layer — this is standard practice, not a workaround. No need for a desktop or native app; a Progressive Web App shell is a reasonable *stretch* if you want an installable/offline-friendly feel, but it isn't required for feasibility.

## 7. Suggested Repository Structure

```
lunares/
├── frontend/                 # React + TS app
├── backend/
│   ├── api/                  # FastAPI app: routes, auth, schemas
│   │   ├── main.py           # Entrypoint with lifespan events, router registration
│   │   ├── config.py         # Centralized settings from .env
│   │   ├── schemas.py        # Pydantic request/response models
│   │   ├── dependencies.py   # FastAPI DI: DB session, storage, adapter
│   │   └── routers/
│   │       ├── scenes.py     # Upload, register, spatial search
│   │       ├── jobs.py       # Submit, status, list, cancel
│   │       ├── products.py   # Download, metrics, reports
│   │       ├── pipeline.py   # ISRO Bhoonidhi contract endpoints
│   │       └── ws.py         # WebSocket real-time job progress
│   ├── services/
│   │   └── storage.py        # Centralized S3/MinIO service (upload, download, presigned URLs)
│   ├── adapters/
│   │   └── bhoonidhi/        # ISRO pipeline adapter (live + mock impl behind one interface)
│   ├── workers/
│   │   ├── celery_app.py     # Celery instance config
│   │   ├── tasks.py          # Full processing pipeline: tile → infer → blend → store → score
│   │   ├── tiling.py         # Tile grid computation + cosine-ramp feather blending
│   │   └── metrics.py        # PSNR, SSIM, no-reference quality scoring
│   ├── models/
│   │   ├── sr_model.py       # SR inference wrapper (PyTorch + bicubic fallback)
│   │   └── uncertainty.py    # Confidence estimation (MC-dropout / gradient heuristic)
│   └── db/
│       ├── database.py       # SQLAlchemy engine + session
│       ├── models.py         # Scene, Job, Product, Feedback tables (PostGIS)
│       └── init_db.py        # Auto-creates PostGIS extension + tables on startup
├── ml/
│   ├── data/                   # dataset prep: PDS→COG, pairing/registration scripts
│   ├── train/                  # training scripts, configs
│   └── eval/                   # metrics, benchmark scripts
├── infra/
│   └── docker-compose.yml      # Full stack: Postgres, Redis, MinIO, titiler, API, worker, frontend
└── docs/                        # this document set
```
