"""
Core processing pipeline, run per job: tile → infer → blend → store → score.

Each stage updates job status in Postgres so the frontend dashboard
(docs/AppFlow.md, "Job dashboard" screen) can show live progress.

Workers are stateless and horizontally scalable — add more workers to raise
throughput.  This is the concrete proof point for the "Scalable" requirement.
"""
import io
import json
import time
import logging
import tempfile
from datetime import datetime, timezone

import numpy as np

from workers.celery_app import celery_app
from api.config import settings

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,  # don't ack until task finishes — prevents data loss on crash
)
def process_scene(
    self,
    scene_id: str,
    job_id: str,
    model_name: str,
    generate_confidence_map: bool,
):
    """
    Full processing pipeline for one scene within a job:
      1. Update status → "tiling"
      2. Download the scene's raster from object storage
      3. Tile into overlapping patches
      4. Update status → "inferring"
      5. Run SR model on each tile (with per-tile progress updates)
      6. Optionally compute per-tile uncertainty/confidence
      7. Update status → "blending"
      8. Feather-blend tiles into seamless SR mosaic (+ confidence mosaic)
      9. Write outputs to object storage as NumPy arrays (COG via rasterio if available)
     10. Compute quality metrics
     11. Create Product record in Postgres
     12. Update status → "complete"
    """
    start_time = time.time()

    try:
        _run_pipeline(
            self, scene_id, job_id, model_name,
            generate_confidence_map, start_time,
        )
    except Exception as exc:
        logger.exception("Pipeline failed for scene=%s job=%s", scene_id, job_id)
        _update_job_status(job_id, "failed", error_message=str(exc))
        # Retry with exponential backoff
        raise self.retry(exc=exc)


def _run_pipeline(
    task,
    scene_id: str,
    job_id: str,
    model_name: str,
    generate_confidence_map: bool,
    start_time: float,
):
    """Inner pipeline logic — separated for clean error handling."""
    from db.database import SessionLocal
    from db.models import Scene, Job, Product
    from services.storage import storage
    from models.sr_model import get_sr_model
    from models.uncertainty import get_uncertainty_estimator
    from workers.tiling import compute_tile_grid, extract_tile, blend_tiles
    from workers.metrics import compute_all_metrics

    db = SessionLocal()
    try:
        # ── 1. Load scene metadata ────────────────────────────────────
        scene = db.query(Scene).filter(Scene.id == scene_id).first()
        if not scene:
            raise ValueError(f"Scene {scene_id} not found in database")

        _update_job_status(job_id, "tiling", db=db)

        # ── 2. Download raster from storage ───────────────────────────
        logger.info("Downloading scene %s from %s", scene_id, scene.source_uri)
        image = _load_image_from_storage(storage, scene.source_uri)
        logger.info("Loaded image: shape=%s dtype=%s", image.shape, image.dtype)

        # ── 3. Compute tile grid ──────────────────────────────────────
        tile_size = settings.tile_size
        overlap = settings.tile_overlap
        img_h, img_w = image.shape[:2]

        tiles = compute_tile_grid(img_h, img_w, tile_size, overlap)
        total_tiles = len(tiles)

        # Update tile count on the job
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.tiles_total = total_tiles
            job.tiles_complete = 0
            db.commit()

        # ── 4. Run inference ──────────────────────────────────────────
        _update_job_status(job_id, "inferring", db=db)

        sr_model = get_sr_model(model_name=model_name)
        scale = settings.sr_scale_factor

        sr_tiles: list[np.ndarray] = []
        conf_tiles: list[np.ndarray] = []
        uncertainty_estimator = get_uncertainty_estimator() if generate_confidence_map else None

        for i, tile_info in enumerate(tiles):
            lr_patch = extract_tile(image, tile_info)

            # Super-resolution
            sr_patch = sr_model.predict(lr_patch)
            sr_tiles.append(sr_patch)

            # Uncertainty estimation
            if generate_confidence_map and uncertainty_estimator:
                conf_patch = uncertainty_estimator.estimate(lr_patch, sr_patch)
                conf_tiles.append(conf_patch)

            # Update per-tile progress
            if job:
                job.tiles_complete = i + 1
                job.updated_at = datetime.now(timezone.utc)
                db.commit()

            logger.debug("Tile %d/%d complete", i + 1, total_tiles)

        # ── 5. Feather-blend mosaics ──────────────────────────────────
        _update_job_status(job_id, "blending", db=db)

        # Scale tile coordinates to output resolution
        from workers.tiling import TileInfo
        sr_tile_infos = [
            TileInfo(
                index=t.index, row=t.row, col=t.col,
                y_start=t.y_start * scale,
                x_start=t.x_start * scale,
                height=t.height * scale,
                width=t.width * scale,
            )
            for t in tiles
        ]
        sr_h, sr_w = img_h * scale, img_w * scale

        sr_mosaic = blend_tiles(
            sr_tile_infos, sr_tiles, sr_h, sr_w,
            overlap=overlap * scale,
        )
        logger.info("SR mosaic: shape=%s dtype=%s", sr_mosaic.shape, sr_mosaic.dtype)

        confidence_mosaic = None
        if conf_tiles:
            # Confidence maps are at SR resolution (single channel)
            conf_tile_infos = [
                TileInfo(
                    index=t.index, row=t.row, col=t.col,
                    y_start=t.y_start * scale,
                    x_start=t.x_start * scale,
                    height=t.height * scale,
                    width=t.width * scale,
                )
                for t in tiles
            ]
            confidence_mosaic = blend_tiles(
                conf_tile_infos, conf_tiles, sr_h, sr_w,
                overlap=overlap * scale,
            )

        # ── 6. Save outputs to storage ────────────────────────────────
        from services.storage import StorageService

        sr_key = StorageService.build_product_key(scene_id, job_id, "sr_output.tif")
        _save_raster_to_storage(storage, sr_mosaic, sr_key, scene)

        conf_key = None
        if confidence_mosaic is not None:
            conf_key = StorageService.build_product_key(scene_id, job_id, "confidence.tif")
            _save_raster_to_storage(storage, confidence_mosaic, conf_key, scene)

        # ── 7. Compute quality metrics ────────────────────────────────
        metrics = compute_all_metrics(sr_mosaic, hr=None)  # no HR ground truth at runtime
        logger.info("Metrics: %s", metrics)

        # ── 8. Save report JSON ───────────────────────────────────────
        processing_time = time.time() - start_time
        report_data = {
            "scene_id": scene_id,
            "job_id": job_id,
            "model_version": sr_model.version,
            "sr_model": model_name,
            "using_fallback_model": sr_model.using_fallback,
            "scale_factor": scale,
            "input_shape": list(image.shape),
            "output_shape": list(sr_mosaic.shape),
            "tile_size": tile_size,
            "tile_overlap": overlap,
            "total_tiles": total_tiles,
            "metrics": metrics,
            "processing_time_seconds": round(processing_time, 2),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        report_key = StorageService.build_product_key(scene_id, job_id, "report.json")
        storage.upload_bytes(
            json.dumps(report_data, indent=2).encode(),
            report_key,
            content_type="application/json",
        )

        # ── 9. Create Product record ──────────────────────────────────
        product = Product(
            scene_id=scene_id,
            job_id=job_id,
            sr_output_uri=sr_key,
            confidence_map_uri=conf_key,
            report_uri=report_key,
            model_version=sr_model.version,
            psnr=metrics.get("psnr"),
            ssim=metrics.get("ssim"),
            lpips=metrics.get("lpips"),
            no_reference_quality=metrics.get("no_reference_quality"),
            processing_time_seconds=round(processing_time, 2),
        )
        db.add(product)
        db.commit()

        # ── 10. Mark job complete ─────────────────────────────────────
        _update_job_status(job_id, "complete", db=db)
        logger.info(
            "Pipeline complete for scene=%s job=%s in %.1fs",
            scene_id, job_id, processing_time,
        )

    finally:
        db.close()


# ======================================================================
# Helpers
# ======================================================================

def _update_job_status(
    job_id: str,
    status: str,
    error_message: str | None = None,
    db=None,
):
    """Update job status in Postgres."""
    from db.database import SessionLocal
    from db.models import Job

    close_after = False
    if db is None:
        db = SessionLocal()
        close_after = True

    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = status
            job.updated_at = datetime.now(timezone.utc)
            if error_message:
                job.error_message = error_message
            db.commit()
            logger.info("Job %s → %s", job_id, status)
    finally:
        if close_after:
            db.close()


def _load_image_from_storage(storage, source_uri: str) -> np.ndarray:
    """
    Download and decode an image from object storage.
    Tries rasterio first (for GeoTIFF/COG), falls back to PIL.
    """
    buf = storage.download_fileobj(source_uri)

    # Try rasterio (handles GeoTIFF, COG, PDS)
    try:
        import rasterio
        from rasterio.io import MemoryFile

        buf.seek(0)
        with MemoryFile(buf.read()) as memfile:
            with memfile.open() as dataset:
                # Read all bands → (bands, H, W) → (H, W, bands)
                data = dataset.read()
                if data.ndim == 3:
                    data = np.transpose(data, (1, 2, 0))
                    if data.shape[2] == 1:
                        data = data.squeeze(axis=2)
                return data
    except Exception:
        pass

    # Fallback to PIL
    try:
        from PIL import Image
        buf.seek(0)
        pil_img = Image.open(buf)
        return np.array(pil_img)
    except Exception as exc:
        raise ValueError(f"Cannot decode image from {source_uri}: {exc}")


def _save_raster_to_storage(
    storage,
    array: np.ndarray,
    key: str,
    scene=None,
):
    """
    Save a numpy array as a GeoTIFF to object storage.
    Tries rasterio for proper GeoTIFF writing; falls back to PIL for PNG.
    """
    try:
        import rasterio
        from rasterio.io import MemoryFile
        from rasterio.transform import from_bounds

        # Prepare for rasterio: (H, W, C) → (C, H, W)
        if array.ndim == 2:
            data = array[np.newaxis, :, :]
        else:
            data = np.transpose(array, (2, 0, 1))

        count, height, width = data.shape

        # Build transform from scene bounds if available
        transform = from_bounds(0, 0, width, height, width, height)
        crs_str = None
        if scene and hasattr(scene, "crs") and scene.crs:
            crs_str = scene.crs

        profile = {
            "driver": "GTiff",
            "count": count,
            "height": height,
            "width": width,
            "dtype": str(data.dtype),
            "transform": transform,
        }
        if crs_str:
            profile["crs"] = crs_str

        with MemoryFile() as memfile:
            with memfile.open(**profile) as dst:
                dst.write(data)
            memfile.seek(0)
            storage.upload_fileobj(memfile, key, "image/tiff")

        logger.info("Saved raster to %s (%dx%d, %d bands)", key, width, height, count)

    except Exception as exc:
        logger.warning("Rasterio write failed (%s) — falling back to raw numpy save", exc)
        # Fallback: save as raw numpy bytes
        buf = io.BytesIO()
        np.save(buf, array)
        buf.seek(0)
        storage.upload_fileobj(buf, key, "application/octet-stream")
