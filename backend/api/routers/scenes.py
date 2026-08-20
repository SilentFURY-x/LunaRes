"""
Scene ingestion + lookup. A "scene" is a normalized, georeferenced input raster
(already converted to COG — see ml/data/pds_to_cog.py for the normalization step).
"""
from fastapi import APIRouter, HTTPException
from api.schemas import SceneCreate

router = APIRouter()


@router.post("/")
def create_scene(scene: SceneCreate):
    """
    Register a new scene (after it has been uploaded to object storage or fetched
    via the pipeline adapter). Persists metadata to Postgres/PostGIS.
    TODO: implement — see backend/db/models.py Scene table.
    """
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{scene_id}")
def get_scene(scene_id: str):
    """Fetch scene metadata by ID."""
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/")
def search_scenes(bbox: str | None = None, sensor: str | None = None):
    """
    Spatial search over ingested scenes (PostGIS ST_Intersects on bbox).
    Powers both the catalog-browse UI and the pipeline adapter's "search" semantics.
    """
    raise HTTPException(status_code=501, detail="Not implemented yet")
