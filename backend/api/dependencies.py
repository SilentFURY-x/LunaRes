"""
FastAPI dependency injection — centralized here so routers stay thin.
Usage in a route:  def my_endpoint(db: DbDep, store: StoreDep): ...
"""
from typing import Annotated, Generator

from fastapi import Depends
from sqlalchemy.orm import Session

from db.database import SessionLocal
from services.storage import StorageService, storage
from adapters.bhoonidhi.base import BhoonidhiAdapter
from api.config import settings


# ---------- Database session ----------

def _get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbDep = Annotated[Session, Depends(_get_db)]


# ---------- Object storage ----------

def _get_storage() -> StorageService:
    return storage


StoreDep = Annotated[StorageService, Depends(_get_storage)]


# ---------- Bhoonidhi adapter ----------

def _get_adapter() -> BhoonidhiAdapter:
    if settings.bhoonidhi_adapter_mode == "live":
        from adapters.bhoonidhi.live_adapter import LiveBhoonidhiAdapter
        return LiveBhoonidhiAdapter()
    from adapters.bhoonidhi.mock_adapter import MockBhoonidhiAdapter
    return MockBhoonidhiAdapter()


AdapterDep = Annotated[BhoonidhiAdapter, Depends(_get_adapter)]
