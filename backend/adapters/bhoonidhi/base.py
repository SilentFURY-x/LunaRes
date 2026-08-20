"""
Interface every Bhoonidhi adapter implementation must satisfy. Keeping this as an
abstract base means the mock and live implementations are interchangeable — the
rest of the system (routers, workers) only ever depends on this contract, never
on which implementation is active. That's what lets the demo work whether or not
live Bhoonidhi API access has been granted in time (see docs/DataSources.md).
"""
from abc import ABC, abstractmethod


class BhoonidhiAdapter(ABC):
    @abstractmethod
    def search(self, bbox: str, sensor: str, start_date: str, end_date: str) -> list[dict]:
        """Return a list of matching product summaries (id, sensor, footprint, date, thumbnail_url)."""
        ...

    @abstractmethod
    def fetch(self, product_id: str) -> dict:
        """
        Download/retrieve the raw product, normalize to COG (see ml/data/pds_to_cog.py),
        register it as a Scene, and return {"scene_id": ...}.
        """
        ...

    @abstractmethod
    def push(self, product_id: str) -> dict:
        """
        Push an enhanced product back out in the format ISRO's own systems expect
        (GeoTIFF/COG + metadata sidecar). Returns confirmation/receipt info.
        """
        ...
