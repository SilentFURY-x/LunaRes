"""
Live implementation — calls the real Bhoonidhi API.
Requires BHOONIDHI_API_KEY (request access via bhoonidhi@nrsc.gov.in — see
docs/DataSources.md) and BHOONIDHI_API_BASE_URL configured in .env.

Fill in the real endpoint paths/response parsing once API docs are received;
this file is intentionally a stub until then, so the mock adapter fully covers
development and demo needs in the meantime.
"""
import httpx
from adapters.bhoonidhi.base import BhoonidhiAdapter
from api.config import settings


class LiveBhoonidhiAdapter(BhoonidhiAdapter):
    def __init__(self):
        self.client = httpx.Client(
            base_url=settings.bhoonidhi_api_base_url,
            headers={"Authorization": f"Bearer {settings.bhoonidhi_api_key}"},
        )

    def search(self, bbox: str, sensor: str, start_date: str, end_date: str) -> list[dict]:
        # TODO: map to the real Bhoonidhi search endpoint/params once documented
        raise NotImplementedError("Live Bhoonidhi API integration pending access approval")

    def fetch(self, product_id: str) -> dict:
        raise NotImplementedError("Live Bhoonidhi API integration pending access approval")

    def push(self, product_id: str) -> dict:
        raise NotImplementedError("Live Bhoonidhi API integration pending access approval")
