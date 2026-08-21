"""
Feedback endpoint — allows scientists to flag bad reconstruction regions
for future model retraining (human-in-the-loop quality improvement).
"""
import logging
from fastapi import APIRouter, HTTPException

from api.dependencies import DbDep
from db.models import Feedback, Product

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/")
def submit_feedback(payload: dict, db: DbDep):
    """
    Flag a region of a product as incorrectly enhanced.
    Accepts { product_id, region: GeoJSON polygon, note: string }.
    """
    product_id = payload.get("product_id")
    if not product_id:
        raise HTTPException(status_code=400, detail="product_id is required")

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    region = payload.get("region")
    note = payload.get("note", "")

    # Convert GeoJSON polygon to WKT if provided
    footprint_wkt = None
    if region and region.get("type") == "Polygon":
        coords = region["coordinates"][0]
        ring = ", ".join(f"{c[0]} {c[1]}" for c in coords)
        footprint_wkt = f"SRID=4326;POLYGON(({ring}))"

    fb = Feedback(
        product_id=product_id,
        region=footprint_wkt,
        note=note,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    logger.info("Feedback %s created for product %s", fb.id, product_id)
    return {"id": fb.id}
