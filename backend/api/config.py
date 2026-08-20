"""
Centralized settings, loaded from environment variables (.env in local dev).
Nothing in this file should hold a real secret — see .env.example at the repo root.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://lunares:changeme@localhost:5432/lunares"

    # Redis / job queue
    redis_url: str = "redis://localhost:6379/0"

    # Object storage
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "lunares-scenes"
    s3_region: str = "us-east-1"

    # ISRO pipeline adapter
    bhoonidhi_adapter_mode: str = "mock"  # "mock" or "live"
    bhoonidhi_api_base_url: str = "https://bhoonidhi.nrsc.gov.in/api"
    bhoonidhi_api_key: str = ""

    # Auth
    jwt_secret: str = "changeme-generate-a-real-secret"

    # Model
    sr_model_weights_path: str = "/models/sr_fast_v1.pt"
    uncertainty_model_weights_path: str = "/models/uncertainty_v1.pt"

    class Config:
        env_file = ".env"


settings = Settings()
