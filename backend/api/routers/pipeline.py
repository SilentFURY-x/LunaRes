"""
ISRO pipeline integration surface — mirrors Bhoonidhi's search/fetch/push contract.
"""
import logging

from fastapi import APIRouter, HTTPException, Query

from api.dependencies import AdapterDep
from api.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/search")
def pipeline_search(
    adapter: AdapterDep,
    bbox: str = Query(..., description="Bounding box: west,south,east,north"),
    sensor: str = Query(..., description="Sensor name, e.g. TMC-2, OHRC, LISS-4"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
):
    """
    Search available products — mirrors Bhoonidhi's AOI/date/sensor search.
    Returns shape matching frontend PipelineSearchResult: { adapter_mode, results[] }
    """
    try:
        raw_results = adapter.search(
            bbox=bbox, sensor=sensor,
            start_date=start_date, end_date=end_date,
        )

        # Transform to match frontend PipelineCatalogEntry shape
        results = []
        for r in raw_results:
            results.append({
                "product_id": r.get("product_id", ""),
                "sensor": r.get("sensor", ""),
                "acquisition_date": r.get("acquisition_date", ""),
                "resolution_m": r.get("resolution_m", 0),
                "thumbnail_url": r.get("thumbnail_url"),
                "footprint": None,  # GeoJSON polygon if available
            })

        return {
            "adapter_mode": settings.bhoonidhi_adapter_mode,
            "results": results,
        }

    except NotImplementedError:
        raise HTTPException(
            status_code=503,
            detail="Live Bhoonidhi API integration is pending access approval.",
        )
    except Exception as exc:
        logger.error("Pipeline search failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/fetch/{product_id}")
def pipeline_fetch(product_id: str, adapter: AdapterDep):
    """
    Fetch a product, ingest as a Scene, return scene_id.
    Returns shape matching frontend PipelineFetchResult.
    """
    try:
        result = adapter.fetch(product_id=product_id)
        return {
            "scene_id": result.get("scene_id", ""),
            "product_id": product_id,
            "message": result.get("message", "Product fetched successfully."),
        }
    except NotImplementedError:
        raise HTTPException(
            status_code=503,
            detail="Live Bhoonidhi API integration is pending access approval.",
        )
    except Exception as exc:
        logger.error("Pipeline fetch failed for %s: %s", product_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/push/{product_id}")
def pipeline_push(product_id: str, adapter: AdapterDep):
    """
    Push enhanced product back in ISRO-pipeline-compatible form.
    Returns shape matching frontend PipelinePushResult.
    """
    try:
        result = adapter.push(product_id=product_id)
        return {
            "product_id": product_id,
            "status": result.get("status", "pushed"),
            "message": result.get("message", "Product pushed successfully."),
        }
    except NotImplementedError:
        raise HTTPException(
            status_code=503,
            detail="Live Bhoonidhi API integration is pending access approval.",
        )
    except Exception as exc:
        logger.error("Pipeline push failed for %s: %s", product_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/status")
def pipeline_status():
    """Show which adapter mode is active."""
    return {
        "adapter_mode": settings.bhoonidhi_adapter_mode,
        "api_base_url": settings.bhoonidhi_api_base_url,
        "api_key_configured": bool(settings.bhoonidhi_api_key),
    }
