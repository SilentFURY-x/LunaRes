"""
Pydantic request/response models shared across routers.
Keep these aligned with docs/PRD.md's functional requirements (FR1-FR9).
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class SensorProfile(str, Enum):
    lunar = "lunar"
    earth_optical = "earth_optical"
    sar = "sar"


class InferenceMode(str, Enum):
    fast = "fast"            # Real-ESRGAN / SwinIR-style regression model
    high_fidelity = "high_fidelity"  # diffusion-based refinement (stretch)


class JobStatus(str, Enum):
    queued = "queued"
    tiling = "tiling"
    inferring = "inferring"
    blending = "blending"
    complete = "complete"
    failed = "failed"


class SceneCreate(BaseModel):
    source_uri: str                       # object storage key or upload reference
    sensor_profile: SensorProfile
    acquisition_time: Optional[datetime] = None


class JobCreate(BaseModel):
    scene_ids: list[str]
    inference_mode: InferenceMode = InferenceMode.fast
    generate_confidence_map: bool = True
    run_downstream_task_comparison: bool = False


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    tiles_total: int
    tiles_complete: int
    created_at: datetime
    updated_at: datetime


class ProductMetrics(BaseModel):
    psnr: Optional[float] = None
    ssim: Optional[float] = None
    lpips: Optional[float] = None
    no_reference_quality: Optional[float] = None  # e.g. NIQE, used when no HR ground truth exists


class ProductResponse(BaseModel):
    scene_id: str
    job_id: str
    sr_output_uri: str
    confidence_map_uri: Optional[str] = None
    metrics: ProductMetrics
    model_version: str
