import asyncio
from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile, status
from PIL import Image

from app.api.routers.pessoas import validate_photo_image_bytes
from app.core.upload import read_upload_file_with_limit


class _TrackedAsyncUploadFile:
    """Minimal UploadFile-compatible double tracking chunk reads and close calls."""

    def __init__(self, chunks: list[bytes]) -> None:
        self._chunks = list(chunks)
        self.read_calls = 0
        self.closed = False

    async def read(self, _size: int = -1) -> bytes:
        self.read_calls += 1
        if not self._chunks:
            return b""
        return self._chunks.pop(0)

    async def close(self) -> None:
        self.closed = True


def test_read_upload_file_with_limit_returns_bytes_when_within_limit() -> None:
    upload_file = UploadFile(filename="sample.bin", file=BytesIO(b"abcdefghij"))

    result = asyncio.run(
        read_upload_file_with_limit(upload_file, max_bytes=10, chunk_size=4)
    )

    assert result == b"abcdefghij"


def test_read_upload_file_with_limit_raises_413_and_stops_reading_early() -> None:
    chunk = b"x" * 64
    tracked_stream = _TrackedAsyncUploadFile([chunk] * 10)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            read_upload_file_with_limit(
                tracked_stream,  # type: ignore[arg-type]
                max_bytes=100,
                chunk_size=64,
            )
        )

    assert exc_info.value.status_code == status.HTTP_413_CONTENT_TOO_LARGE
    assert "100 byte size limit" in exc_info.value.detail
    assert tracked_stream.read_calls == 2
    assert tracked_stream.closed is True


def test_read_upload_file_with_limit_raises_400_when_file_is_empty() -> None:
    tracked_stream = _TrackedAsyncUploadFile([])

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            read_upload_file_with_limit(
                tracked_stream,  # type: ignore[arg-type]
                max_bytes=1024,
            )
        )

    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert exc_info.value.detail == "Uploaded file is empty."
    assert tracked_stream.closed is True


def test_validate_photo_image_bytes_raises_400_when_jpeg_scanline_is_truncated() -> (
    None
):
    buffer = BytesIO()
    Image.new("RGB", (64, 64), color=(80, 120, 200)).save(buffer, format="JPEG")
    valid_jpeg = buffer.getvalue()
    scanline_truncated_jpeg = valid_jpeg[:-20]

    with pytest.raises(HTTPException) as exc_info:
        validate_photo_image_bytes(scanline_truncated_jpeg)

    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert exc_info.value.detail == "Invalid or corrupted image file."


def test_validate_photo_image_bytes_raises_400_when_dimensions_exceed_pixel_cap(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.api.routers import pessoas

    monkeypatch.setattr(pessoas, "MAX_PHOTO_PIXELS", 100)
    buffer = BytesIO()
    Image.new("RGB", (20, 20), color=(10, 20, 30)).save(buffer, format="PNG")

    with pytest.raises(HTTPException) as exc_info:
        validate_photo_image_bytes(buffer.getvalue())

    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert (
        exc_info.value.detail
        == "Image dimensions exceed the maximum allowed resolution."
    )
