"""
Mock implementation — serves cached/sample responses shaped exactly like the real
Bhoonidhi API. Use this for development and for the demo if live API access hasn't
come through yet. Always label mock results as such in the UI — never present a
mock as if it were live.
"""
from adapters.bhoonidhi.base import BhoonidhiAdapter


class MockBhoonidhiAdapter(BhoonidhiAdapter):
    def search(self, bbox: str, sensor: str, start_date: str, end_date: str) -> list[dict]:
        # TODO: replace with real cached sample data captured from the PRADAN/Bhoonidhi
        # portal during development (see docs/DataSources.md).
        return [
            {
                "product_id": "SAMPLE-TMC2-0001",
                "sensor": sensor or "TMC-2",
                "footprint_bbox": bbox or "0,0,1,1",
                "acquisition_date": start_date or "2019-09-01",
                "thumbnail_url": None,
                "mock": True,
            }
        ]

    def fetch(self, product_id: str) -> dict:
        return {"scene_id": f"mock-scene-{product_id}", "mock": True}

    def push(self, product_id: str) -> dict:
        return {"status": "accepted", "product_id": product_id, "mock": True}
