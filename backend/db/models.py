"""
Core schema. Geometry columns use PostGIS (via GeoAlchemy2) so scene footprints
are spatially queryable — this powers both the catalog-browse map UI and the
pipeline adapter's "search by AOI" semantics.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, DateTime, Float, Integer, Boolean,
    ForeignKey, JSON, Text, event,
)
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from db.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Scene — a normalized, georeferenced input raster (COG)
# ---------------------------------------------------------------------------
class Scene(Base):
    __tablename__ = "scenes"

    id = Column(String, primary_key=True, default=gen_uuid)
    source_uri = Column(String, nullable=False)          # object storage key
    original_filename = Column(String, nullable=True)     # user-uploaded filename
    content_hash = Column(String(64), nullable=True, index=True)  # SHA-256 for dedup
    sensor_profile = Column(String, nullable=False)       # lunar / earth_optical / sar
    file_format = Column(String, nullable=True)           # geotiff / png / jpeg / pds
    footprint = Column(Geometry("POLYGON", srid=4326))
    crs = Column(String, nullable=True)                   # coordinate reference system
    gsd_meters = Column(Float, nullable=True)             # ground sampling distance
    width_px = Column(Integer, nullable=True)
    height_px = Column(Integer, nullable=True)
    band_count = Column(Integer, nullable=True)
    dtype = Column(String, nullable=True)                 # uint8 / uint16 / float32
    acquisition_time = Column(DateTime(timezone=True), nullable=True)
    product_id = Column(String, nullable=True)            # original ISRO/NASA product ID
    file_size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    products = relationship("Product", back_populates="scene")


# ---------------------------------------------------------------------------
# Job — async processing request (single or batch)
# ---------------------------------------------------------------------------
class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=gen_uuid)
    scene_ids = Column(JSON, nullable=False)        # list of Scene.id — supports batch
    status = Column(String, default="queued", index=True)
    # Retained column name for database compatibility; stores the SR model id.
    inference_mode = Column(String, default="lunaformer_lunar")
    generate_confidence_map = Column(Boolean, default=True)
    run_downstream_comparison = Column(Boolean, default=False)
    tiles_total = Column(Integer, default=0)
    tiles_complete = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)      # meaningful failure display
    celery_task_id = Column(String, nullable=True)   # for cancellation support
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    products = relationship("Product", back_populates="job")


# ---------------------------------------------------------------------------
# Product — SR output + confidence map + metrics for one scene+job pair
# ---------------------------------------------------------------------------
class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=gen_uuid)
    scene_id = Column(String, ForeignKey("scenes.id"), nullable=False)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    sr_output_uri = Column(String, nullable=False)       # enhanced image in storage
    confidence_map_uri = Column(String, nullable=True)   # uncertainty map in storage
    report_uri = Column(String, nullable=True)           # generated report in storage
    model_version = Column(String, nullable=False)
    psnr = Column(Float, nullable=True)
    ssim = Column(Float, nullable=True)
    lpips = Column(Float, nullable=True)
    no_reference_quality = Column(Float, nullable=True)  # NIQE when no HR ground truth
    processing_time_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    scene = relationship("Scene", back_populates="products")
    job = relationship("Job", back_populates="products")


# ---------------------------------------------------------------------------
# Feedback — human-in-the-loop flagging (docs/AppFlow.md stretch flow S4)
# ---------------------------------------------------------------------------
class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String, primary_key=True, default=gen_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    region = Column(Geometry("POLYGON", srid=4326))
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    product = relationship("Product")
