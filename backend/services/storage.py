"""
Centralized S3/MinIO storage service.  Every file interaction goes through here
so the rest of the codebase never touches boto3 directly — makes it trivial to
swap from MinIO (hackathon) to AWS S3 (demo/prod) with zero code changes.
"""
import io
import hashlib
import logging
from pathlib import PurePosixPath
from typing import BinaryIO

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from api.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Thin wrapper around S3-compatible object storage."""

    def __init__(self) -> None:
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=BotoConfig(signature_version="s3v4"),
        )
        self._bucket = settings.s3_bucket

    # ------------------------------------------------------------------
    # Bucket lifecycle
    # ------------------------------------------------------------------
    def ensure_bucket(self) -> None:
        """Create the bucket if it doesn't exist (idempotent)."""
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError:
            self._client.create_bucket(Bucket=self._bucket)
            logger.info("Created bucket: %s", self._bucket)

    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------
    def upload_fileobj(
        self,
        file_obj: BinaryIO,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload a file-like object and return its storage key."""
        self._client.upload_fileobj(
            file_obj,
            self._bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        logger.info("Uploaded %s (%s)", key, content_type)
        return key

    def upload_bytes(
        self,
        data: bytes,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload raw bytes and return the storage key."""
        return self.upload_fileobj(io.BytesIO(data), key, content_type)

    def download_fileobj(self, key: str) -> io.BytesIO:
        """Download an object into an in-memory buffer."""
        buf = io.BytesIO()
        self._client.download_fileobj(self._bucket, key, buf)
        buf.seek(0)
        return buf

    def download_to_path(self, key: str, local_path: str) -> str:
        """Download an object to a local file path."""
        self._client.download_file(self._bucket, key, local_path)
        return local_path

    def generate_presigned_url(
        self,
        key: str,
        expiry: int | None = None,
    ) -> str:
        """Generate a time-limited download URL (default: 1 hour)."""
        if expiry is None:
            expiry = settings.presigned_url_expiry_seconds
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=expiry,
        )

    def exists(self, key: str) -> bool:
        """Check whether an object exists in the bucket."""
        try:
            self._client.head_object(Bucket=self._bucket, Key=key)
            return True
        except ClientError:
            return False

    def delete(self, key: str) -> None:
        """Delete an object from the bucket."""
        self._client.delete_object(Bucket=self._bucket, Key=key)
        logger.info("Deleted %s", key)

    def list_keys(self, prefix: str = "") -> list[str]:
        """List all object keys under a prefix."""
        resp = self._client.list_objects_v2(Bucket=self._bucket, Prefix=prefix)
        return [obj["Key"] for obj in resp.get("Contents", [])]

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------
    @staticmethod
    def compute_sha256(file_obj: BinaryIO) -> str:
        """Compute SHA-256 hash of a file-like object (resets seek to 0)."""
        sha = hashlib.sha256()
        for chunk in iter(lambda: file_obj.read(8192), b""):
            sha.update(chunk)
        file_obj.seek(0)
        return sha.hexdigest()

    @staticmethod
    def build_scene_key(scene_id: str, filename: str) -> str:
        """Construct the canonical storage path for a scene's raw input."""
        ext = PurePosixPath(filename).suffix or ".tif"
        return f"scenes/{scene_id}/input{ext}"

    @staticmethod
    def build_product_key(scene_id: str, job_id: str, suffix: str) -> str:
        """
        Construct the storage path for an SR output, confidence map, or report.
        suffix examples: "sr.tif", "confidence.tif", "report.json"
        """
        return f"scenes/{scene_id}/products/{job_id}/{suffix}"


# Module-level singleton — import this throughout the backend.
storage = StorageService()
