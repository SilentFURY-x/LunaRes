"""
The ISRO pipeline integration surface. Endpoints here mirror the shape of
Bhoonidhi's own search / fetch / order pattern, backed by the adapter in
backend/adapters/bhoonidhi/ (mock or live implementation, selected via
BHOONIDHI_ADAPTER_MODE in settings — the router code never changes either way).
"""
from fastapi import APIRouter, HTTPException
from api.config import settings
from adapters.bhoonidhi.mock_adapter import MockBhoonidhiAdapter
from adapters.bhoonidhi.live_adapter import LiveBhoonidhiAdapter

router = APIRouter()


def get_adapter():
    if settings.bhoonidhi_adapter_mode == "live":
        return LiveBhoonidhiAdapter()
    return MockBhoonidhiAdapter()


@router.get("/search")
def pipeline_search(bbox: str, sensor: str, start_date: str, end_date: str):
    """Search available products — mirrors Bhoonidhi's AOI/date/sensor search."""
    adapter = get_adapter()
    return adapter.search(bbox=bbox, sensor=sensor, start_date=start_date, end_date=end_date)


@router.post("/fetch/{product_id}")
def pipeline_fetch(product_id: str):
    """Fetch a specific product by ID, ingest it as a Scene, and return the scene_id."""
    adapter = get_adapter()
    return adapter.fetch(product_id=product_id)


@router.post("/push/{product_id}")
def pipeline_push(product_id: str):
    """
    Egress: push an enhanced product back out in ISRO-pipeline-compatible form
    (GeoTIFF + metadata sidecar), matching the product_id's expected shape.
    """
    adapter = get_adapter()
    return adapter.push(product_id=product_id)
