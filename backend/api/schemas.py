"""
Pydantic request/response models shared across routers.
Keep these aligned with docs/PRD.md's functional requirements (FR1–FR9).
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ======================================================================
# Enums
# ======================================================================

class SensorProfile(str, Enum):
    lunar = "lunar"
    earth_optical = "earth_optical"
    sar = "sar"


class InferenceMode(str, Enum):
    fast = "fast"                    # Real-ESRGAN / SwinIR-style regression
    high_fidelity = "high_fidelity"  # diffusion-based refinement (stretch)


class JobStatus(str, Enum):
    queued = "queued"
    tiling = "tiling"
    inferring = "inferring"
    blending = "blending"
    complete = "complete"
    failed = "failed"
    cancelled = "cancelled"


# ======================================================================
# Scene
# ======================================================================

class SceneCreate(BaseModel):
    """Register a scene that's already in object storage."""
    source_uri: str
    sensor_profile: SensorProfile
    acquisition_time: Optional[datetime] = None
    product_id: Optional[str] = None


class SceneResponse(BaseModel):
    """Full scene metadata returned by GET endpoints."""
    id: str
    source_uri: str
    original_filename: Optional[str] = None
    sensor_profile: str
    file_format: Optional[str] = None
    crs: Optional[str] = None
    gsd_meters: Optional[float] = None
    width_px: Optional[int] = None
    height_px: Optional[int] = None
    band_count: Optional[int] = None
    dtype: Optional[str] = None
    acquisition_time: Optional[datetime] = None
    product_id: Optional[str] = None
    file_size_bytes: Optional[int] = None
    download_url: Optional[str] = None  # presigned URL, generated on the fly
    created_at: datetime

    model_config = {"from_attributes": True}


class SceneUploadResponse(BaseModel):
    """Returned after a successful file upload."""
    scene_id: str
    filename: str
    file_size_bytes: int
    content_hash: str
    sensor_profile: str
    message: str = "Scene uploaded and registered successfully."


class SceneListResponse(BaseModel):
    """Paginated list of scenes."""
    scenes: list[SceneResponse]
    total: int


# ======================================================================
# Job
# ======================================================================

class JobCreate(BaseModel):
    """Submit a new processing job (single scene or batch)."""
    scene_ids: list[str] = Field(..., min_length=1)
    inference_mode: InferenceMode = InferenceMode.fast
    generate_confidence_map: bool = True
    run_downstream_comparison: bool = False


class JobStatusResponse(BaseModel):
    """Job status + progress info."""
    job_id: str
    status: JobStatus
    inference_mode: str
    tiles_total: int
    tiles_complete: int
    progress_pct: float = 0.0
    error_message: Optional[str] = None
    scene_ids: list[str] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    """Paginated list of jobs."""
    jobs: list[JobStatusResponse]
    total: int


# ======================================================================
# Product
# ======================================================================

class ProductMetrics(BaseModel):
    """Quality metrics computed after inference."""
    psnr: Optional[float] = None
    ssim: Optional[float] = None
    lpips: Optional[float] = None
    no_reference_quality: Optional[float] = None


class ProductResponse(BaseModel):
    """Full product metadata."""
    id: str
    scene_id: str
    job_id: str
    sr_output_uri: str
    confidence_map_uri: Optional[str] = None
    report_uri: Optional[str] = None
    metrics: ProductMetrics
    model_version: str
    processing_time_seconds: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductDownloadLinks(BaseModel):
    """Pre-signed download URLs for all product artifacts."""
    product_id: str
    sr_output_url: str
    confidence_map_url: Optional[str] = None
    report_url: Optional[str] = None
    expires_in_seconds: int


# ======================================================================
# Pipeline (ISRO adapter)
# ======================================================================

class PipelineSearchRequest(BaseModel):
    bbox: str = Field(..., description="Bounding box: west,south,east,north")
    sensor: str = Field(..., description="Sensor name, e.g. TMC-2, OHRC, LISS-4")
    start_date: str = Field(..., description="ISO date string YYYY-MM-DD")
    end_date: str = Field(..., description="ISO date string YYYY-MM-DD")


class PipelineSearchResult(BaseModel):
    product_id: str
    sensor: str
    footprint_bbox: str
    acquisition_date: str
    thumbnail_url: Optional[str] = None
    mock: bool = False


class PipelineFetchResult(BaseModel):
    scene_id: str
    product_id: str
    mock: bool = False
    message: str = "Product fetched and registered as scene."


class PipelinePushResult(BaseModel):
    status: str
    product_id: str
    output_format: str = "GeoTIFF/COG + metadata sidecar"
    mock: bool = False


# ======================================================================
# Health
# ======================================================================

class DependencyStatus(BaseModel):
    name: str
    healthy: bool
    latency_ms: Optional[float] = None
    detail: Optional[str] = None


class HealthResponse(BaseModel):
    status: str  # "healthy" / "degraded" / "unhealthy"
    version: str
    dependencies: list[DependencyStatus]


# ======================================================================
# Report
# ======================================================================

class ReportResponse(BaseModel):
    """Structured metrics report for a product — can drive a PDF or JSON export."""
    product_id: str
    scene_id: str
    job_id: str
    model_version: str
    inference_mode: str
    sensor_profile: str
    metrics: ProductMetrics
    processing_time_seconds: Optional[float] = None
    input_dimensions: Optional[str] = None    # e.g. "512x512"
    output_dimensions: Optional[str] = None   # e.g. "2048x2048"
    confidence_summary: Optional[dict] = None  # mean, min, max confidence
    data_provenance: Optional[str] = None
    generated_at: datetime
