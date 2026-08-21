"""
SQLAlchemy engine/session setup. PostGIS extension must be enabled on the
database (docker-compose.yml uses the postgis/postgis image, which ships with it).
"""
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
from api.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,       # recycles stale connections automatically
    pool_size=10,
    max_overflow=20,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and cleans up when done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
