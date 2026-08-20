"""
Mock implementation — serves cached/sample responses shaped exactly like the real
Bhoonidhi API. Use this for development and for the demo if live API access hasn't
come through yet. Always label mock results as such in the UI — never present a
mock as if it were live.

Enhanced with realistic sample data: multiple lunar + Earth-observation products
with plausible metadata, and a fetch() that actually creates a Scene record and
stores a sample file in MinIO.
"""
import logging
from datetime import datetime, timezone

from adapters.bhoonidhi.base import BhoonidhiAdapter

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
# Realistic sample catalog (what a Bhoonidhi search would return)
# ──────────────────────────────────────────────────────────────────────
SAMPLE_CATALOG = [
    {
        "product_id": "CH2_TMC2_NQM_20190912T045623",
        "sensor": "TMC-2",
        "mission": "Chandrayaan-2",
        "footprint_bbox": "76.5,-12.3,77.2,-11.8",
        "acquisition_date": "2019-09-12",
        "resolution_m": 5.0,
        "description": "TMC-2 panchromatic strip — Mare Tranquillitatis region",
        "thumbnail_url": None,
    },
    {
        "product_id": "CH2_OHRC_NQM_20190912T045625",
        "sensor": "OHRC",
        "mission": "Chandrayaan-2",
        "footprint_bbox": "76.8,-12.1,77.0,-11.9",
        "acquisition_date": "2019-09-12",
        "resolution_m": 0.3,
        "description": "OHRC high-resolution strip — overlapping TMC-2 footprint",
        "thumbnail_url": None,
    },
    {
        "product_id": "CH2_TMC2_NQM_20200415T132100",
        "sensor": "TMC-2",
        "mission": "Chandrayaan-2",
        "footprint_bbox": "23.4,0.5,24.1,1.0",
        "acquisition_date": "2020-04-15",
        "resolution_m": 5.0,
        "description": "TMC-2 panchromatic — Sinus Medii near lunar equator",
        "thumbnail_url": None,
    },
    {
        "product_id": "RS2_LISS4_MX_20230801T054500",
        "sensor": "LISS-4",
        "mission": "Resourcesat-2",
        "footprint_bbox": "77.5,12.9,78.0,13.1",
        "acquisition_date": "2023-08-01",
        "resolution_m": 5.8,
        "description": "LISS-4 multispectral — Bangalore urban-rural fringe (SDG-9/13)",
        "thumbnail_url": None,
    },
    {
        "product_id": "RS2_AWIFS_20230801T053000",
        "sensor": "AWiFS",
        "mission": "Resourcesat-2",
        "footprint_bbox": "76.0,11.0,80.0,15.0",
        "acquisition_date": "2023-08-01",
        "resolution_m": 56.0,
        "description": "AWiFS wide-swath — Karnataka state (LR counterpart to LISS-4)",
        "thumbnail_url": None,
    },
]


class MockBhoonidhiAdapter(BhoonidhiAdapter):
    """
    Mock adapter for development and demo — clearly labeled as mock in every
    response.  Provides realistic catalog data and creates actual Scene records
    when fetch() is called.
    """

    def search(
        self,
        bbox: str,
        sensor: str,
        start_date: str,
        end_date: str,
    ) -> list[dict]:
        """
        Search the mock catalog, filtering by sensor and date range.
        Returns products matching the criteria.
        """
        results = []
        for product in SAMPLE_CATALOG:
            # Filter by sensor if specified
            if sensor and sensor.lower() not in product["sensor"].lower():
                continue

            # Filter by date range
            try:
                acq = datetime.strptime(product["acquisition_date"], "%Y-%m-%d").date()
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
                if not (start <= acq <= end):
                    continue
            except (ValueError, TypeError):
                pass  # If dates are unparseable, include the product

            results.append({**product, "mock": True})

        if not results:
            # Always return at least one result for demo purposes
            results = [{**SAMPLE_CATALOG[0], "mock": True}]

        logger.info(
            "Mock search: bbox=%s sensor=%s → %d results",
            bbox, sensor, len(results),
        )
        return results

    def fetch(self, product_id: str) -> dict:
        """
        Simulate fetching a product: create a Scene record in Postgres and
        store a synthetic sample image in MinIO so downstream processing works.
        """
        # Find the product in our catalog
        product_meta = None
        for p in SAMPLE_CATALOG:
            if p["product_id"] == product_id:
                product_meta = p
                break

        if not product_meta:
            product_meta = SAMPLE_CATALOG[0]

        try:
            from db.database import SessionLocal
            from db.models import Scene
            from services.storage import storage

            db = SessionLocal()
            try:
                # Create a synthetic sample image (gradient pattern)
                import numpy as np
                from PIL import Image
                import io

                # Generate a 512x512 grayscale gradient (simulates lunar terrain)
                h, w = 512, 512
                y_grad = np.linspace(50, 200, h, dtype=np.uint8)
                x_grad = np.linspace(80, 180, w, dtype=np.uint8)
                sample_image = (y_grad[:, np.newaxis] * 0.5 + x_grad[np.newaxis, :] * 0.5).astype(np.uint8)

                # Add some noise to simulate real imagery
                noise = np.random.RandomState(42).randint(0, 20, (h, w), dtype=np.uint8)
                sample_image = np.clip(sample_image.astype(np.int16) + noise, 0, 255).astype(np.uint8)

                # Create scene record
                scene = Scene(
                    sensor_profile="lunar" if "TMC" in product_meta["sensor"] or "OHRC" in product_meta["sensor"] else "earth_optical",
                    original_filename=f"{product_id}.tif",
                    product_id=product_id,
                    width_px=w,
                    height_px=h,
                    band_count=1,
                    dtype="uint8",
                    gsd_meters=product_meta.get("resolution_m"),
                    acquisition_time=datetime.strptime(
                        product_meta["acquisition_date"], "%Y-%m-%d"
                    ).replace(tzinfo=timezone.utc),
                )

                # Upload to storage
                from services.storage import StorageService
                storage_key = StorageService.build_scene_key(scene.id, f"{product_id}.png")
                scene.source_uri = storage_key

                img = Image.fromarray(sample_image)
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                buf.seek(0)
                storage.upload_fileobj(buf, storage_key, "image/png")

                # Save to DB
                db.add(scene)
                db.commit()
                db.refresh(scene)

                logger.info("Mock fetch: product=%s → scene=%s", product_id, scene.id)

                return {
                    "scene_id": scene.id,
                    "product_id": product_id,
                    "sensor": product_meta["sensor"],
                    "resolution_m": product_meta.get("resolution_m"),
                    "mock": True,
                    "message": f"Product {product_id} fetched and registered as scene {scene.id}.",
                }

            finally:
                db.close()

        except Exception as exc:
            logger.warning("Mock fetch DB/storage integration failed: %s", exc)
            # Graceful fallback — return a mock response without DB/storage
            return {
                "scene_id": f"mock-scene-{product_id}",
                "product_id": product_id,
                "mock": True,
                "message": "Mock fetch (no DB/storage integration).",
            }

    def push(self, product_id: str) -> dict:
        """
        Simulate pushing an enhanced product back in ISRO-pipeline-compatible
        format: GeoTIFF + JSON metadata sidecar.
        """
        # Build a realistic metadata sidecar matching ISRO's expected format
        sidecar = {
            "product_id": product_id,
            "processing_level": "L2-SR-Enhanced",
            "processor": "LunaRes v0.1.0",
            "output_format": "GeoTIFF/COG",
            "enhancement_method": "Deep-learning super-resolution (4×)",
            "confidence_map_included": True,
            "data_source_acknowledgement": (
                "Based on data from ISRO's Chandrayaan-2 mission, "
                "archived at ISSDC (Indian Space Science Data Centre)."
            ),
            "pushed_at": datetime.now(timezone.utc).isoformat(),
        }

        logger.info("Mock push: product=%s → accepted", product_id)

        return {
            "status": "accepted",
            "product_id": product_id,
            "output_format": "GeoTIFF/COG + metadata sidecar (JSON)",
            "metadata_sidecar": sidecar,
            "mock": True,
            "message": "Enhanced product accepted for pipeline egress (mock).",
        }
