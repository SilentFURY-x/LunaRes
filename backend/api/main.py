"""
FastAPI entrypoint. Routing only — business logic lives in workers/, adapters/, models/.
Auto-generated interactive docs available at /docs once running; this doubles as the
documented contract you show judges for the "ISRO pipeline integration" requirement.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import jobs, scenes, pipeline

app = FastAPI(
    title="LunaRes API",
    description="AI framework for satellite & planetary image enhancement (AIML-03)",
    version="0.1.0",
)

# Tighten this before any real deployment — wide open for local hackathon dev only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scenes.router, prefix="/scenes", tags=["scenes"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(pipeline.router, prefix="/pipeline", tags=["isro-pipeline-adapter"])


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
