import datetime
import logging
from unittest.mock import patch

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.enums import TipoVinculo
from app.models.pessoa import Pessoa
from app.services import photo_upload_service
from tests.conftest import TestingSessionLocal


def _build_valid_cpf(seed_number: int) -> str:
    base_value = 700000000 + seed_number * 97
    digits = [int(digit) for digit in f"{base_value:09d}"]
    if len(set(digits)) == 1:
        digits[0] = (digits[0] + 1) % 10
    first_check = sum(digits[index] * (10 - index) for index in range(9)) % 11
    digits.append(0 if first_check < 2 else 11 - first_check)
    second_check = sum(digits[index] * (11 - index) for index in range(10)) % 11
    digits.append(0 if second_check < 2 else 11 - second_check)
    return "".join(str(digit) for digit in digits)


def _create_person(
    db_session: Session,
    *,
    seed: int,
    deleted: bool = False,
) -> Pessoa:
    db_session.execute(
        text(
            "SELECT setval("
            "pg_get_serial_sequence('pessoas', 'id'), "
            "COALESCE((SELECT MAX(id) FROM pessoas), 1), "
            "(SELECT EXISTS(SELECT 1 FROM pessoas))"
            ")"
        )
    )
    person = Pessoa(
        nome=f"Photo Upload Person {seed}",
        cpf=_build_valid_cpf(seed),
        matricula=f"2026PHOTO{seed:04d}",
        email=f"photo.service.{seed}@discente.ifpe.edu.br",
        tipo_vinculo=TipoVinculo.ALUNO,
        curso="Engenharia de Software",
        status=True,
        deleted_at=(datetime.datetime.now(datetime.timezone.utc) if deleted else None),
    )
    db_session.add(person)
    db_session.commit()
    db_session.refresh(person)
    return person


def test_process_photo_upload_in_background_updates_person_foto_url_on_success(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    person = _create_person(db_session, seed=1)
    monkeypatch.setattr(photo_upload_service, "SessionLocal", TestingSessionLocal)
    expected_url = "https://cdn.example.edu.br/photos/avatar123.jpg"

    with (
        patch(
            "app.services.photo_upload_service.upload_photo_to_storage",
            return_value=expected_url,
        ) as mock_upload,
        caplog.at_level(logging.INFO),
    ):
        photo_upload_service.process_photo_upload_in_background(
            person.id,
            b"fake-jpeg-bytes",
            "avatar.jpg",
            "image/jpeg",
        )

    mock_upload.assert_called_once()
    db_session.refresh(person)
    assert person.foto_url == expected_url
    assert any(record.levelno == logging.INFO for record in caplog.records)


def test_process_photo_upload_in_background_logs_error_when_person_not_found(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    deleted_person = _create_person(db_session, seed=2, deleted=True)
    monkeypatch.setattr(photo_upload_service, "SessionLocal", TestingSessionLocal)

    with (
        patch(
            "app.services.photo_upload_service.upload_photo_to_storage"
        ) as mock_upload,
        caplog.at_level(logging.ERROR),
    ):
        photo_upload_service.process_photo_upload_in_background(
            999999,
            b"fake-jpeg-bytes",
            "missing.jpg",
            "image/jpeg",
        )
        assert any(record.levelno == logging.ERROR for record in caplog.records)

        caplog.clear()
        photo_upload_service.process_photo_upload_in_background(
            deleted_person.id,
            b"fake-jpeg-bytes",
            "deleted.jpg",
            "image/jpeg",
        )
        assert any(record.levelno == logging.ERROR for record in caplog.records)

    mock_upload.assert_not_called()


def test_process_photo_upload_in_background_rolls_back_on_storage_error(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    person = _create_person(db_session, seed=3)
    monkeypatch.setattr(photo_upload_service, "SessionLocal", TestingSessionLocal)

    with (
        patch(
            "app.services.photo_upload_service.upload_photo_to_storage",
            side_effect=RuntimeError("S3 upload failed"),
        ),
        caplog.at_level(logging.ERROR),
    ):
        photo_upload_service.process_photo_upload_in_background(
            person.id,
            b"fake-png-bytes",
            "avatar.png",
            "image/png",
        )

    db_session.refresh(person)
    assert person.foto_url is None
    assert any(record.levelno == logging.ERROR for record in caplog.records)
