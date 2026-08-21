"""
Database initialization — creates PostGIS extension and all tables.
Called once on application startup via the FastAPI lifespan event.
"""
from sqlalchemy import text
from db.database import engine, Base

# Import all models so Base.metadata knows about them.
import db.models  # noqa: F401


def init_db() -> None:
    """
    Enable PostGIS extension (idempotent) and create all tables that don't
    exist yet.  Safe to call on every startup — CREATE TABLE IF NOT EXISTS
    under the hood via SQLAlchemy's checkfirst default.
    """
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        conn.commit()

    Base.metadata.create_all(bind=engine)
