"""
Product endpoints — retrieve enhanced outputs, download links, and metrics reports.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from api.dependencies import DbDep, StoreDep
from api.schemas import (
    ProductResponse,
    ProductMetrics,
    ProductDownloadLinks,
    ReportResponse,
)
from api.config import settings
from db.models import Product, Scene, Job

logger = logging.getLogger(__name__)

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────
# GET /products/by-job/{job_id}/scene/{scene_id}
# Must be BEFORE /{product_id} to avoid route conflict
# ──────────────────────────────────────────────────────────────────────
@router.get("/by-job/{job_id}/scene/{scene_id}")
def get_product_by_job_scene(job_id: str, scene_id: str, db: DbDep, store: StoreDep):
    """
    Find the product for a given job + scene combination.
    This is how the frontend result viewer resolves a product from the URL params.
    """
    product = db.query(Product).filter(
        Product.job_id == job_id,
        Product.scene_id == scene_id,
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail=f"No product found for job={job_id}, scene={scene_id}",
        )

    return _product_to_frontend_response(product, db, store)


# ──────────────────────────────────────────────────────────────────────
# GET /products/{product_id} — product metadata + metrics
# ──────────────────────────────────────────────────────────────────────
@router.get("/{product_id}")
def get_product(product_id: str, db: DbDep, store: StoreDep):
    """Fetch full product metadata including quality metrics."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return _product_to_frontend_response(product, db, store)


# ──────────────────────────────────────────────────────────────────────
# GET /products/{product_id}/download — presigned download URLs
# ──────────────────────────────────────────────────────────────────────
@router.get("/{product_id}/download")
def get_download_links(
    product_id: str,
    db: DbDep,
    store: StoreDep,
    format: str = Query("geotiff", description="Export format: geotiff, png, pdf"),
):
    """
    Generate time-limited presigned URL for downloading the product.
    Frontend expects { url: string }.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    expiry = settings.presigned_url_expiry_seconds

    # Select the right artifact based on format
    if format == "pdf" and product.report_uri:
        key = product.report_uri
    elif product.sr_output_uri:
        key = product.sr_output_uri
    else:
        raise HTTPException(status_code=404, detail="No downloadable artifact found")

    try:
        url = store.generate_presigned_url(key, expiry)
    except Exception as exc:
        logger.error("Failed to generate presigned URL: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to generate download URL")

    return {"url": url}


# ──────────────────────────────────────────────────────────────────────
# GET /products/{product_id}/report — structured metrics report
# ──────────────────────────────────────────────────────────────────────
@router.get("/{product_id}/report", response_model=ReportResponse)
def get_report(product_id: str, db: DbDep):
    """Structured metrics report for a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    scene = db.query(Scene).filter(Scene.id == product.scene_id).first()
    job = db.query(Job).filter(Job.id == product.job_id).first()

    input_dims = None
    output_dims = None
    if scene and scene.width_px and scene.height_px:
        input_dims = f"{scene.width_px}x{scene.height_px}"
        scale = settings.sr_scale_factor
        output_dims = f"{scene.width_px * scale}x{scene.height_px * scale}"

    provenance_parts = []
    if scene:
        if scene.product_id:
            provenance_parts.append(f"Product ID: {scene.product_id}")
        provenance_parts.append(f"Sensor: {scene.sensor_profile}")
        if scene.acquisition_time:
            provenance_parts.append(f"Acquired: {scene.acquisition_time.isoformat()}")
    provenance = " | ".join(provenance_parts) if provenance_parts else None

    return ReportResponse(
        product_id=product.id,
        scene_id=product.scene_id,
        job_id=product.job_id,
        model_version=product.model_version,
        inference_mode=job.inference_mode if job else "unknown",
        sensor_profile=scene.sensor_profile if scene else "unknown",
        metrics=ProductMetrics(
            psnr=product.psnr,
            ssim=product.ssim,
            lpips=product.lpips,
            no_reference_quality=product.no_reference_quality,
        ),
        processing_time_seconds=product.processing_time_seconds,
        input_dimensions=input_dims,
        output_dimensions=output_dims,
        confidence_summary=None,
        data_provenance=provenance,
        generated_at=datetime.now(timezone.utc),
    )


# ──────────────────────────────────────────────────────────────────────
# GET /products/ — list all products
# ──────────────────────────────────────────────────────────────────────
@router.get("/")
def list_products(
    db: DbDep,
    scene_id: str | None = None,
    job_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    """List products, optionally filtered by scene or job."""
    query = db.query(Product)
    if scene_id:
        query = query.filter(Product.scene_id == scene_id)
    if job_id:
        query = query.filter(Product.job_id == job_id)

    total = query.count()
    products = query.order_by(Product.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "products": [_product_to_internal_response(p) for p in products],
        "total": total,
    }


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _product_to_frontend_response(product: Product, db, store) -> dict:
    """
    Build the product response shape the frontend types.ts expects:
    ProductResponse with product_id, source_sensor, acquisition_date, etc.
    """
    scene = db.query(Scene).filter(Scene.id == product.scene_id).first()

    # Generate presigned URLs for SR output and confidence map
    sr_url = None
    conf_url = None
    try:
        if product.sr_output_uri:
            sr_url = store.generate_presigned_url(product.sr_output_uri)
        if product.confidence_map_uri:
            conf_url = store.generate_presigned_url(product.confidence_map_uri)
    except Exception:
        pass

    return {
        "product_id": product.id,
        "scene_id": product.scene_id,
        "job_id": product.job_id,
        "sr_output_uri": sr_url or product.sr_output_uri,
        "confidence_map_uri": conf_url or product.confidence_map_uri,
        "metrics": {
            "psnr": product.psnr,
            "ssim": product.ssim,
            "lpips": product.lpips,
            "no_reference_quality": product.no_reference_quality,
        },
        "model_version": product.model_version,
        "source_sensor": scene.sensor_profile if scene else "unknown",
        "acquisition_date": scene.acquisition_time.isoformat() if scene and scene.acquisition_time else None,
        "product_source_id": scene.product_id if scene else None,
        "downstream_delta": None,
    }


def _product_to_internal_response(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        scene_id=product.scene_id,
        job_id=product.job_id,
        sr_output_uri=product.sr_output_uri,
        confidence_map_uri=product.confidence_map_uri,
        report_uri=product.report_uri,
        metrics=ProductMetrics(
            psnr=product.psnr,
            ssim=product.ssim,
            lpips=product.lpips,
            no_reference_quality=product.no_reference_quality,
        ),
        model_version=product.model_version,
        processing_time_seconds=product.processing_time_seconds,
        created_at=product.created_at,
    )
