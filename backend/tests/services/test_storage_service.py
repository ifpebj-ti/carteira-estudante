from unittest.mock import MagicMock, patch

import pytest

from app.core.config import settings
from app.services.storage_service import upload_photo_to_storage


@pytest.mark.parametrize(
    "missing_setting",
    [
        "S3_ENDPOINT_URL",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
        "S3_BUCKET_NAME",
    ],
)
def test_upload_photo_to_storage_raises_runtime_error_when_credentials_missing(
    monkeypatch: pytest.MonkeyPatch,
    missing_setting: str,
) -> None:
    monkeypatch.setattr(
        settings,
        "S3_ENDPOINT_URL",
        "https://objectstorage.sa-saopaulo-1.oraclecloud.com",
    )
    monkeypatch.setattr(settings, "S3_ACCESS_KEY_ID", "access-key-value")
    monkeypatch.setattr(settings, "S3_SECRET_ACCESS_KEY", "secret-key-value")
    monkeypatch.setattr(settings, "S3_BUCKET_NAME", "student-photos")
    monkeypatch.setattr(settings, missing_setting, "")

    with pytest.raises(
        RuntimeError, match="Object storage credentials are not configured."
    ):
        upload_photo_to_storage(b"image-bytes", "photo.jpg", "image/jpeg")


def test_upload_photo_to_storage_returns_endpoint_url_without_public_base(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "S3_ENDPOINT_URL",
        "https://objectstorage.sa-saopaulo-1.oraclecloud.com/",
    )
    monkeypatch.setattr(settings, "S3_ACCESS_KEY_ID", "access-key-value")
    monkeypatch.setattr(settings, "S3_SECRET_ACCESS_KEY", "secret-key-value")
    monkeypatch.setattr(settings, "S3_BUCKET_NAME", "student-photos")
    monkeypatch.setattr(settings, "S3_REGION", "sa-saopaulo-1")
    monkeypatch.setattr(settings, "S3_PUBLIC_BASE_URL", "")

    mock_s3_client = MagicMock()

    with patch("boto3.client", return_value=mock_s3_client) as mock_client_factory:
        photo_url = upload_photo_to_storage(b"jpeg-bytes", "avatar.jpg", "image/jpeg")

    mock_client_factory.assert_called_once()
    client_args, client_kwargs = mock_client_factory.call_args
    assert client_args == ("s3",)
    assert (
        client_kwargs["endpoint_url"]
        == "https://objectstorage.sa-saopaulo-1.oraclecloud.com/"
    )
    assert client_kwargs["aws_access_key_id"] == "access-key-value"
    assert client_kwargs["aws_secret_access_key"] == "secret-key-value"  # noqa: S105
    assert client_kwargs["region_name"] == "sa-saopaulo-1"
    assert client_kwargs["config"].signature_version == "s3v4"

    mock_s3_client.put_object.assert_called_once()
    put_kwargs = mock_s3_client.put_object.call_args.kwargs
    object_key = put_kwargs["Key"]
    assert put_kwargs["Bucket"] == "student-photos"
    assert object_key.startswith("photos/")
    assert object_key.endswith(".jpg")
    assert put_kwargs["Body"] == b"jpeg-bytes"
    assert put_kwargs["ContentType"] == "image/jpeg"
    assert (
        photo_url
        == f"https://objectstorage.sa-saopaulo-1.oraclecloud.com/student-photos/{object_key}"
    )


def test_upload_photo_to_storage_uses_public_base_url_when_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "S3_ENDPOINT_URL",
        "https://objectstorage.sa-saopaulo-1.oraclecloud.com",
    )
    monkeypatch.setattr(settings, "S3_ACCESS_KEY_ID", "access-key-value")
    monkeypatch.setattr(settings, "S3_SECRET_ACCESS_KEY", "secret-key-value")
    monkeypatch.setattr(settings, "S3_BUCKET_NAME", "student-photos")
    monkeypatch.setattr(settings, "S3_REGION", "sa-saopaulo-1")
    monkeypatch.setattr(
        settings, "S3_PUBLIC_BASE_URL", "https://cdn.example.edu.br/photos-bucket/"
    )

    mock_s3_client = MagicMock()

    with patch("boto3.client", return_value=mock_s3_client):
        photo_url = upload_photo_to_storage(b"png-bytes", "profile.png", "image/png")

    put_kwargs = mock_s3_client.put_object.call_args.kwargs
    object_key = put_kwargs["Key"]
    assert object_key.startswith("photos/")
    assert object_key.endswith(".png")
    assert put_kwargs["ContentType"] == "image/png"
    assert photo_url == f"https://cdn.example.edu.br/photos-bucket/{object_key}"
