"""
Centralized settings, loaded from environment variables (.env in local dev).
Nothing in this file should hold a real secret — see .env.example at the repo root.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ---------- Database ----------
    database_url: str = "postgresql://lunares:changeme@localhost:5432/lunares"

    # ---------- Redis / job queue ----------
    redis_url: str = "redis://localhost:6379/0"

    # ---------- Object storage ----------
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "lunares-scenes"
    s3_region: str = "us-east-1"

    # ---------- ISRO pipeline adapter ----------
    bhoonidhi_adapter_mode: str = "mock"  # "mock" or "live"
    bhoonidhi_api_base_url: str = "https://bhoonidhi.nrsc.gov.in/api"
    bhoonidhi_api_key: str = ""

    # ---------- Auth ----------
    jwt_secret: str = "changeme-generate-a-real-secret"
    api_key_salt: str = "changeme"

    # ---------- Model ----------
    sr_model_weights_path: str = "/models/lunaformer-lunar.pt"
    hat_weights_path: str = "/models/net_g_5000_hat.pth"
    swinir_weights_path: str = "/models/net_g_20000_swinir.pth"
    realesrgan_weights_path: str = "/models/net_g_15000_realesrgan.pth"
    sr_device: str = "auto"  # auto / cpu / cuda
    uncertainty_model_weights_path: str = "/models/uncertainty_v1.pt"
    model_version: str = "lunares-sr-v0.1.0"

    # ---------- Tile server ----------
    titiler_url: str = "http://localhost:8001"

    # ---------- Processing ----------
    tile_size: int = 512          # pixels per tile edge
    tile_overlap: int = 64        # overlap margin to avoid seam artifacts
    sr_scale_factor: int = 4      # upscale factor
    max_upload_size_mb: int = 500  # max single-file upload

    # ---------- CORS ----------
    cors_origins: list[str] = ["*"]

    # ---------- Presigned URL ----------
    presigned_url_expiry_seconds: int = 3600  # 1 hour

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
