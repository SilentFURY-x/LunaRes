"""
FastAPI entrypoint.  Routing only — business logic lives in workers/, adapters/, models/.

Auto-generated interactive docs available at /docs once running; this doubles as the
documented contract you show judges for the "ISRO pipeline integration" requirement.
"""
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings

logger = logging.getLogger(__name__)

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)


# ======================================================================
# Lifespan — startup / shutdown hooks
# ======================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    On startup: initialize Postgres tables (with PostGIS extension) and
    create the MinIO bucket if it doesn't exist.
    """
    logger.info("🚀 LunaRes API starting up...")

    # 1. Initialize database (PostGIS + create tables)
    try:
        from db.init_db import init_db
        init_db()
        logger.info("✅ Database initialized (PostGIS enabled, tables created)")
    except Exception as exc:
        logger.error("❌ Database initialization failed: %s", exc)

    # 2. Ensure MinIO bucket exists
    try:
        from services.storage import storage
        storage.ensure_bucket()
        logger.info("✅ Storage bucket '%s' ready", settings.s3_bucket)
    except Exception as exc:
        logger.error("❌ Storage bucket creation failed: %s", exc)

    logger.info("🟢 LunaRes API ready — docs at http://localhost:8000/docs")
    yield
    logger.info("🔴 LunaRes API shutting down...")


# ======================================================================
# App instance
# ======================================================================

app = FastAPI(
    title="LunaRes API",
    description=(
        "AI framework for satellite & planetary image enhancement (AIML-03).\n\n"
        "## Key Endpoints\n"
        "- **Scenes** — Upload, register, and search satellite/planetary images\n"
        "- **Jobs** — Submit SR processing jobs and track progress\n"
        "- **Products** — Download enhanced outputs, confidence maps, and reports\n"
        "- **Pipeline** — ISRO Bhoonidhi-compatible search/fetch/push integration\n"
        "- **WebSocket** — Real-time job progress at `ws://host/ws/jobs/{job_id}`\n\n"
        "Built with real Chandrayaan-2 TMC-2/OHRC paired data, per-pixel confidence "
        "mapping, and a tile-based architecture for horizontal scalability."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — wide open for local hackathon dev; tighten before any real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ======================================================================
# Register routers
# ======================================================================

from api.routers import scenes, jobs, pipeline, products, ws, feedback

app.include_router(scenes.router, prefix="/scenes", tags=["scenes"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(pipeline.router, prefix="/pipeline", tags=["isro-pipeline-adapter"])
app.include_router(feedback.router, prefix="/feedback", tags=["feedback"])
app.include_router(ws.router, tags=["websocket"])


# ======================================================================
# Root route & Health check
# ======================================================================

@app.get("/", tags=["meta"])
def root():
    """Root endpoint — returns API information and documentation link."""
    return {
        "service": "LunaRes API",
        "version": "0.1.0",
        "status": "healthy",
        "docs_url": "/docs",
        "frontend_url": "http://localhost:3000",
        "description": "AI framework for satellite & planetary image enhancement",
    }

@app.get("/health", tags=["meta"])
def health():
    """
    Health check — returns shape matching frontend HealthResponse type.
    """
    pg_ok, pg_lat = _check_postgres()
    redis_ok, redis_lat = _check_redis()
    minio_ok, minio_lat = _check_s3()

    all_ok = pg_ok and redis_ok and minio_ok
    avg_latency = round(sum(filter(None, [pg_lat, redis_lat, minio_lat])) / 3, 1)

    return {
        "status": "ok" if all_ok else "degraded",
        "services": {
            "postgres": pg_ok,
            "redis": redis_ok,
            "minio": minio_ok,
        },
        "latency_ms": avg_latency,
    }


def _check_postgres() -> tuple[bool, float]:
    try:
        start = time.time()
        from sqlalchemy import text
        from db.database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, round((time.time() - start) * 1000, 1)
    except Exception:
        return False, 0.0


def _check_redis() -> tuple[bool, float]:
    try:
        import redis as redis_lib
        start = time.time()
        r = redis_lib.from_url(settings.redis_url)
        r.ping()
        return True, round((time.time() - start) * 1000, 1)
    except Exception:
        return False, 0.0


def _check_s3() -> tuple[bool, float]:
    try:
        start = time.time()
        from services.storage import storage
        storage._client.head_bucket(Bucket=settings.s3_bucket)
        return True, round((time.time() - start) * 1000, 1)
    except Exception:
        return False, 0.0
