import uuid
from pathlib import Path

import boto3
from botocore.client import Config

from app.core.config import settings


def _validate_storage_settings() -> None:
    if not all(
        (
            settings.S3_ENDPOINT_URL,
            settings.S3_ACCESS_KEY_ID,
            settings.S3_SECRET_ACCESS_KEY,
            settings.S3_BUCKET_NAME,
        )
    ):
        raise RuntimeError("Object storage credentials are not configured.")


def _build_photo_url(object_key: str) -> str:
    # OCI Object Storage public/PAR URLs can differ from the S3 compatibility endpoint.
    if settings.S3_PUBLIC_BASE_URL:
        return f"{settings.S3_PUBLIC_BASE_URL.rstrip('/')}/{object_key}"
    endpoint = settings.S3_ENDPOINT_URL.rstrip("/")
    return f"{endpoint}/{settings.S3_BUCKET_NAME}/{object_key}"


def upload_photo_to_storage(
    file_bytes: bytes,
    filename: str,
    content_type: str = "image/jpeg",
) -> str:
    """Upload profile photo bytes to S3-compatible storage and return the final URL."""
    _validate_storage_settings()

    file_extension = Path(filename).suffix.lower() or ".jpg"
    object_key = f"photos/{uuid.uuid4().hex}{file_extension}"

    s3_client = boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )
    s3_client.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=object_key,
        Body=file_bytes,
        ContentType=content_type,
    )

    return _build_photo_url(object_key)
