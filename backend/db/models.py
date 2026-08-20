"""
Core schema. Geometry columns use PostGIS (via GeoAlchemy2) so scene footprints
are spatially queryable — this powers both the catalog-browse map UI and the
pipeline adapter's "search by AOI" semantics.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, JSON
from geoalchemy2 import Geometry
from db.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Scene(Base):
    __tablename__ = "scenes"

    id = Column(String, primary_key=True, default=gen_uuid)
    source_uri = Column(String, nullable=False)          # object storage key
    sensor_profile = Column(String, nullable=False)       # lunar / earth_optical / sar
    footprint = Column(Geometry("POLYGON", srid=4326))
    gsd_meters = Column(Float, nullable=True)              # ground sampling distance
    acquisition_time = Column(DateTime, nullable=True)
    product_id = Column(String, nullable=True)              # original ISRO/NASA product ID
    created_at = Column(DateTime, default=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=gen_uuid)
    scene_ids = Column(JSON, nullable=False)   # list of Scene.id — supports batch jobs
    status = Column(String, default="queued")
    inference_mode = Column(String, default="fast")
    tiles_total = Column(Float, default=0)
    tiles_complete = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=gen_uuid)
    scene_id = Column(String, ForeignKey("scenes.id"), nullable=False)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    sr_output_uri = Column(String, nullable=False)
    confidence_map_uri = Column(String, nullable=True)
    model_version = Column(String, nullable=False)
    psnr = Column(Float, nullable=True)
    ssim = Column(Float, nullable=True)
    lpips = Column(Float, nullable=True)
    no_reference_quality = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Feedback(Base):
    """Human-in-the-loop flagging (docs/AppFlow.md stretch flow S4)."""
    __tablename__ = "feedback"

    id = Column(String, primary_key=True, default=gen_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    region = Column(Geometry("POLYGON", srid=4326))
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
