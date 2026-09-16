import time

import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.services.qr_crypto_service import decode_qr_token, generate_qr_token


def test_generate_and_decode_qr_token():
    aluno_id = 123
    token = generate_qr_token(aluno_id)
    assert token is not None

    decoded_id = decode_qr_token(token)
    assert decoded_id == aluno_id


def test_decode_invalid_qr_token():
    with pytest.raises(HTTPException) as excinfo:
        decode_qr_token("invalid.token.string")

    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "Forged or invalid QR Code."


def test_decode_expired_qr_token(monkeypatch):
    # Temporarily set the expiration time to -1 seconds to guarantee expiration
    monkeypatch.setattr(settings, "QR_CODE_EXPIRE_SECONDS", -1)

    aluno_id = 456
    token = generate_qr_token(aluno_id)

    # Even a small delay is enough since it expires instantly
    time.sleep(0.1)

    with pytest.raises(HTTPException) as excinfo:
        decode_qr_token(token)

    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "QR Code expired. Please generate a new one."
