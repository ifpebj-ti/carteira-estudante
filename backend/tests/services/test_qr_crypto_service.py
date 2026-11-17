import time

import jwt
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.services.qr_crypto_service import decode_qr_token, generate_qr_token


def test_decode_qr_token_returns_person_id_for_valid_generated_token():
    person_id = 123
    token = generate_qr_token(person_id)
    assert token is not None

    decoded_id = decode_qr_token(token)
    assert decoded_id == person_id


def test_decode_qr_token_raises_401_when_token_signature_is_invalid():
    with pytest.raises(HTTPException) as excinfo:
        decode_qr_token("invalid.token.string")

    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "Forged or invalid QR Code."


def test_decode_qr_token_raises_401_when_token_is_expired(monkeypatch):
    # Temporarily set the expiration time to -1 seconds to guarantee expiration
    monkeypatch.setattr(settings, "QR_CODE_EXPIRE_SECONDS", -1)

    person_id = 456
    token = generate_qr_token(person_id)

    time.sleep(0.1)

    with pytest.raises(HTTPException) as excinfo:
        decode_qr_token(token)

    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "QR Code expired. Please generate a new one."


def test_decode_qr_token_raises_400_when_sub_claim_is_missing():
    token_without_sub = jwt.encode(
        {"exp": int(time.time()) + 60},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    with pytest.raises(HTTPException) as excinfo:
        decode_qr_token(token_without_sub)

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Invalid QR Code payload."
