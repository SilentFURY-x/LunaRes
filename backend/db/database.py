"""
SQLAlchemy engine/session setup. PostGIS extension must be enabled on the
database (docker-compose.yml uses the postgis/postgis image, which ships with it).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from api.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
