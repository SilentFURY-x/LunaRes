"""
Product endpoints — retrieve enhanced outputs, download links, and metrics reports.
A "product" is the result of running SR inference on a scene within a job:
it includes the enhanced image, confidence map, quality metrics, and a report.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

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
# GET /products/{product_id} — product metadata + metrics
# ──────────────────────────────────────────────────────────────────────
@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: str, db: DbDep):
    """Fetch full product metadata including quality metrics."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return _product_to_response(product)


# ──────────────────────────────────────────────────────────────────────
# GET /products/{product_id}/download — presigned download URLs
# ──────────────────────────────────────────────────────────────────────
@router.get("/{product_id}/download", response_model=ProductDownloadLinks)
def get_download_links(product_id: str, db: DbDep, store: StoreDep):
    """
    Generate time-limited presigned URLs for all product artifacts
    (SR output, confidence map, report).  Signed URLs prevent public
    bucket access — see Architecture.md section 6.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    expiry = settings.presigned_url_expiry_seconds

    sr_url = store.generate_presigned_url(product.sr_output_uri, expiry)

    conf_url = None
    if product.confidence_map_uri:
        conf_url = store.generate_presigned_url(product.confidence_map_uri, expiry)

    report_url = None
    if product.report_uri:
        report_url = store.generate_presigned_url(product.report_uri, expiry)

    return ProductDownloadLinks(
        product_id=product.id,
        sr_output_url=sr_url,
        confidence_map_url=conf_url,
        report_url=report_url,
        expires_in_seconds=expiry,
    )


# ──────────────────────────────────────────────────────────────────────
# GET /products/{product_id}/report — structured metrics report
# ──────────────────────────────────────────────────────────────────────
@router.get("/{product_id}/report", response_model=ReportResponse)
def get_report(product_id: str, db: DbDep):
    """
    Structured metrics report for a product — suitable for JSON export or
    driving a PDF report (PRD feature S6).  Includes model provenance,
    quality metrics, and processing details.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    scene = db.query(Scene).filter(Scene.id == product.scene_id).first()
    job = db.query(Job).filter(Job.id == product.job_id).first()

    # Build input/output dimension strings
    input_dims = None
    output_dims = None
    if scene and scene.width_px and scene.height_px:
        input_dims = f"{scene.width_px}x{scene.height_px}"
        scale = settings.sr_scale_factor
        output_dims = f"{scene.width_px * scale}x{scene.height_px * scale}"

    # Data provenance
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
        confidence_summary=None,  # populated by the worker if confidence map exists
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
        "products": [_product_to_response(p) for p in products],
        "total": total,
    }


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _product_to_response(product: Product) -> ProductResponse:
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
