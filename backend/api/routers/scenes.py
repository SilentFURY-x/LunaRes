"""
Scene ingestion + lookup. A "scene" is a normalized, georeferenced input raster
(already converted to COG — see ml/data/pds_to_cog.py for the normalization step).

Supports:
  - File upload (GeoTIFF/PNG/JPEG/PDS .IMG) via multipart POST
  - Registration from existing storage URI
  - Spatial search (PostGIS ST_Intersects on bbox)
  - Individual scene lookup with presigned download URL
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import func

from api.dependencies import DbDep, StoreDep
from api.schemas import (
    SensorProfile,
    SceneCreate,
    SceneResponse,
    SceneUploadResponse,
    SceneListResponse,
)
from db.models import Scene, Product
from services.storage import StorageService

logger = logging.getLogger(__name__)

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────
# POST /scenes/upload — multipart file upload
# ──────────────────────────────────────────────────────────────────────
@router.post("/upload", response_model=SceneUploadResponse)
async def upload_scene(
    db: DbDep,
    store: StoreDep,
    file: UploadFile = File(..., description="GeoTIFF, PNG, JPEG, or PDS .IMG file"),
    sensor_profile: SensorProfile = Form(SensorProfile.lunar),
    acquisition_time: Optional[str] = Form(None),
    product_id: Optional[str] = Form(None),
):
    """
    Upload a satellite/planetary image file.  The backend will:
    1. Compute a SHA-256 content hash (for deduplication).
    2. Store the raw file in MinIO/S3.
    3. Attempt to extract raster metadata (dimensions, CRS, bands, dtype).
    4. Register the scene in Postgres with a PostGIS footprint.
    """
    # Read the file into memory (files up to MAX_UPLOAD_SIZE_MB)
    contents = await file.read()
    file_size = len(contents)

    import io
    file_obj = io.BytesIO(contents)

    # SHA-256 for deduplication
    content_hash = StorageService.compute_sha256(file_obj)

    # Check for duplicate
    existing = db.query(Scene).filter(Scene.content_hash == content_hash).first()
    if existing:
        return SceneUploadResponse(
            scene_id=existing.id,
            filename=file.filename or "unknown",
            file_size_bytes=file_size,
            content_hash=content_hash,
            sensor_profile=existing.sensor_profile,
            message="Duplicate detected — returning existing scene.",
        )

    # Create scene record
    scene = Scene(
        sensor_profile=sensor_profile.value,
        original_filename=file.filename,
        content_hash=content_hash,
        file_size_bytes=file_size,
        product_id=product_id,
    )

    # Detect file format from filename
    fname = (file.filename or "").lower()
    if fname.endswith((".tif", ".tiff", ".geotiff")):
        scene.file_format = "geotiff"
    elif fname.endswith(".png"):
        scene.file_format = "png"
    elif fname.endswith((".jpg", ".jpeg")):
        scene.file_format = "jpeg"
    elif fname.endswith(".img"):
        scene.file_format = "pds"
    else:
        scene.file_format = "unknown"

    # Parse acquisition time if provided
    if acquisition_time:
        from datetime import datetime
        try:
            scene.acquisition_time = datetime.fromisoformat(acquisition_time)
        except ValueError:
            pass  # silently skip bad dates — not worth failing the upload

    # Build storage key and upload
    storage_key = StorageService.build_scene_key(scene.id, file.filename or "scene.tif")
    scene.source_uri = storage_key

    # Try extracting raster metadata via rasterio (best-effort)
    _extract_raster_metadata(scene, file_obj)

    # Upload to MinIO/S3
    file_obj.seek(0)
    content_type = file.content_type or "application/octet-stream"
    store.upload_fileobj(file_obj, storage_key, content_type)

    # Persist to DB
    db.add(scene)
    db.commit()
    db.refresh(scene)

    logger.info("Scene %s uploaded: %s (%d bytes)", scene.id, file.filename, file_size)

    return SceneUploadResponse(
        scene_id=scene.id,
        filename=file.filename or "unknown",
        file_size_bytes=file_size,
        content_hash=content_hash,
        sensor_profile=scene.sensor_profile,
    )


# ──────────────────────────────────────────────────────────────────────
# POST /scenes/ — register from existing storage URI
# ──────────────────────────────────────────────────────────────────────
@router.post("/", response_model=SceneResponse)
def create_scene(payload: SceneCreate, db: DbDep):
    """
    Register a scene that is already in object storage (e.g., fetched via the
    pipeline adapter).  Persists metadata to Postgres/PostGIS.
    """
    scene = Scene(
        source_uri=payload.source_uri,
        sensor_profile=payload.sensor_profile.value,
        acquisition_time=payload.acquisition_time,
        product_id=payload.product_id,
    )
    db.add(scene)
    db.commit()
    db.refresh(scene)
    return _scene_to_response(scene)


# ──────────────────────────────────────────────────────────────────────
# GET /scenes/{scene_id}
# ──────────────────────────────────────────────────────────────────────
@router.get("/{scene_id}", response_model=SceneResponse)
def get_scene(scene_id: str, db: DbDep, store: StoreDep):
    """Fetch scene metadata by ID, including a presigned download URL."""
    scene = db.query(Scene).filter(Scene.id == scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail=f"Scene {scene_id} not found")

    download_url = None
    if scene.source_uri:
        try:
            download_url = store.generate_presigned_url(scene.source_uri)
        except Exception:
            pass  # storage might not be available; don't fail the metadata call

    resp = _scene_to_response(scene)
    resp.download_url = download_url
    return resp


# ──────────────────────────────────────────────────────────────────────
# GET /scenes/ — list / spatial search
# ──────────────────────────────────────────────────────────────────────
@router.get("/", response_model=SceneListResponse)
def search_scenes(
    db: DbDep,
    store: StoreDep,
    bbox: Optional[str] = Query(None, description="west,south,east,north"),
    sensor: Optional[str] = Query(None, description="Filter by sensor profile"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    Spatial search over ingested scenes (PostGIS ST_Intersects on bbox).
    Powers both the catalog-browse UI and the pipeline adapter's "search" semantics.
    """
    query = db.query(Scene)

    # Filter by sensor profile
    if sensor:
        query = query.filter(Scene.sensor_profile == sensor)

    # Spatial filter via PostGIS
    if bbox:
        try:
            west, south, east, north = [float(x.strip()) for x in bbox.split(",")]
            bbox_wkt = (
                f"POLYGON(({west} {south}, {east} {south}, "
                f"{east} {north}, {west} {north}, {west} {south}))"
            )
            from geoalchemy2 import functions as gfunc
            query = query.filter(
                gfunc.ST_Intersects(
                    Scene.footprint,
                    func.ST_GeomFromText(bbox_wkt, 4326),
                )
            )
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="Invalid bbox format. Expected: west,south,east,north")

    total = query.count()
    scenes = query.order_by(Scene.created_at.desc()).offset(offset).limit(limit).all()

    return SceneListResponse(
        scenes=[_scene_to_response(s) for s in scenes],
        total=total,
    )


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _scene_to_response(scene: Scene) -> SceneResponse:
    """Convert a DB Scene model to an API response."""
    return SceneResponse(
        id=scene.id,
        source_uri=scene.source_uri,
        original_filename=scene.original_filename,
        sensor_profile=scene.sensor_profile,
        file_format=scene.file_format,
        crs=scene.crs,
        gsd_meters=scene.gsd_meters,
        width_px=scene.width_px,
        height_px=scene.height_px,
        band_count=scene.band_count,
        dtype=scene.dtype,
        acquisition_time=scene.acquisition_time,
        product_id=scene.product_id,
        file_size_bytes=scene.file_size_bytes,
        download_url=None,
        created_at=scene.created_at,
    )


def _extract_raster_metadata(scene: Scene, file_obj) -> None:
    """
    Best-effort raster metadata extraction using rasterio.
    Populates width, height, bands, CRS, dtype, and footprint on the scene.
    Silently skips if rasterio can't read the file (e.g., plain PNG/JPEG).
    """
    try:
        import rasterio
        from rasterio.io import MemoryFile
        from shapely.geometry import box

        file_obj.seek(0)
        with MemoryFile(file_obj.read()) as memfile:
            with memfile.open() as dataset:
                scene.width_px = dataset.width
                scene.height_px = dataset.height
                scene.band_count = dataset.count
                scene.dtype = str(dataset.dtypes[0]) if dataset.dtypes else None

                if dataset.crs:
                    scene.crs = str(dataset.crs)

                if dataset.bounds:
                    b = dataset.bounds
                    scene.footprint = f"SRID=4326;POLYGON(({b.left} {b.bottom}, {b.right} {b.bottom}, {b.right} {b.top}, {b.left} {b.top}, {b.left} {b.bottom}))"

                if dataset.res:
                    scene.gsd_meters = dataset.res[0]

    except Exception as exc:
        logger.debug("Raster metadata extraction skipped: %s", exc)

    file_obj.seek(0)
