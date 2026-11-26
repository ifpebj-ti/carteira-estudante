from fastapi import HTTPException, UploadFile, status

DEFAULT_UPLOAD_CHUNK_SIZE = 64 * 1024


async def read_upload_file_with_limit(
    file: UploadFile,
    max_bytes: int,
    *,
    chunk_size: int = DEFAULT_UPLOAD_CHUNK_SIZE,
    empty_detail: str = "Uploaded file is empty.",
    too_large_detail: str | None = None,
) -> bytes:
    """Read an UploadFile stream in chunks and reject empty or oversized payloads."""
    chunks: list[bytes] = []
    total_bytes = 0

    try:
        while True:
            read_size = min(chunk_size, max_bytes - total_bytes + 1)
            chunk = await file.read(read_size)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                detail = (
                    too_large_detail
                    or f"Uploaded file exceeds the {max_bytes} byte size limit."
                )
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=detail,
                )
            chunks.append(chunk)
    finally:
        await file.close()

    if total_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=empty_detail,
        )

    return b"".join(chunks)
