import datetime
import io
import logging
from unittest.mock import MagicMock, patch

import openpyxl
import polars as pl
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.enums import ModalidadeEnsino, TipoVinculo
from app.models.pessoa import Pessoa
from app.services import upload_service
from tests.conftest import TestingSessionLocal


def _make_valid_cpf(seed_num: int) -> str:
    base_val = 500000000 + seed_num * 97
    digits = [int(c) for c in f"{base_val:09d}"]
    if len(set(digits)) == 1:
        digits[0] = (digits[0] + 1) % 10
    first_r = sum(digits[i] * (10 - i) for i in range(9)) % 11
    digits.append(0 if first_r < 2 else 11 - first_r)
    second_r = sum(digits[i] * (11 - i) for i in range(10)) % 11
    digits.append(0 if second_r < 2 else 11 - second_r)
    return "".join(str(d) for d in digits)


def test_process_upload_in_background_syncs_semicolon_csv_and_preserves_password_hash(
    db_session: Session, monkeypatch, caplog
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)
    preserved_hash = "$2b$12$existing_upload_csv_hash"  # noqa: S105
    existing_cpf = _make_valid_cpf(1)
    new_cpf = _make_valid_cpf(2)

    existing_person = Pessoa(
        matricula="20261UPL0001",
        nome="Before CSV",
        cpf=existing_cpf,
        tipo_vinculo=TipoVinculo.ALUNO,
        curso="Old",
        email="before_csv@discente.ifpe.edu.br",
        senha_hash=preserved_hash,
    )
    db_session.add(existing_person)
    db_session.commit()

    csv_content = (
        "\ufeffMatricula;Nome;CPF;Tipo_Vinculo;Curso;Email;is_interno\n"
        f"20261UPL0001;Updated CSV;{existing_cpf};ALUNO;ADS;"
        "updated_csv@discente.ifpe.edu.br;sim\n"
        f"20261UPL0002;New CSV;{new_cpf};servidor;Admin;;não\n"
    ).encode("utf-8")

    with caplog.at_level(logging.INFO):
        upload_service.process_upload_in_background(csv_content, "students.csv")

    db_session.expire_all()
    updated_person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20261UPL0001").one()
    )
    assert updated_person.nome == "Updated CSV"
    assert updated_person.curso == "ADS"
    assert updated_person.email == "updated_csv@discente.ifpe.edu.br"
    assert updated_person.is_interno is True
    assert updated_person.senha_hash == preserved_hash

    created_person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20261UPL0002").one()
    )
    assert created_person.nome == "New CSV"
    assert created_person.tipo_vinculo == TipoVinculo.SERVIDOR
    assert created_person.email is None
    assert created_person.is_interno is False
    assert "processed successfully: 2 record(s) synced" in caplog.text


def test_process_upload_in_background_syncs_xlsx_file(
    db_session: Session, monkeypatch, caplog
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)
    xlsx_cpf = _make_valid_cpf(3)

    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.append(["matricula", "nome", "cpf", "tipo_vinculo", "curso", "email"])
    sheet.append(
        [
            "20261UPL0003",
            "Excel Student",
            xlsx_cpf,
            "ALUNO",
            "Software Engineering",
            "excel@discente.ifpe.edu.br",
        ]
    )
    xlsx_buffer = io.BytesIO()
    workbook.save(xlsx_buffer)

    with caplog.at_level(logging.INFO):
        upload_service.process_upload_in_background(
            xlsx_buffer.getvalue(), "sheet.xlsx"
        )

    db_session.expire_all()
    saved_person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20261UPL0003").one()
    )
    assert saved_person.nome == "Excel Student"
    assert saved_person.cpf == xlsx_cpf
    assert saved_person.curso == "Software Engineering"
    assert "sheet.xlsx" in caplog.text


def test_process_upload_in_background_syncs_parquet_file(
    db_session: Session, monkeypatch
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)
    parquet_cpf = _make_valid_cpf(4)

    parquet_dataframe = pl.DataFrame(
        {
            "matricula": ["20261UPL0004"],
            "nome": ["Parquet Student"],
            "cpf": [parquet_cpf],
            "tipo_vinculo": ["COORDENACAO"],
            "curso": [None],
            "email": ["parquet@belojardim.ifpe.edu.br"],
        }
    )
    parquet_buffer = io.BytesIO()
    parquet_dataframe.write_parquet(parquet_buffer)

    upload_service.process_upload_in_background(
        parquet_buffer.getvalue(), "records.parquet"
    )

    db_session.expire_all()
    saved_person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20261UPL0004").one()
    )
    assert saved_person.nome == "Parquet Student"
    assert saved_person.tipo_vinculo == TipoVinculo.COORDENACAO
    assert saved_person.email == "parquet@belojardim.ifpe.edu.br"


def test_process_upload_in_background_parses_optional_typed_fields_from_parquet(
    db_session: Session, monkeypatch
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)
    typed_cpf = _make_valid_cpf(5)

    full_dataframe = pl.DataFrame(
        {
            "matricula": ["20261UPL0005"],
            "nome": ["Full Student"],
            "cpf": [float(int(typed_cpf))],
            "tipo_vinculo": ["ALUNO"],
            "modalidade": ["superior"],
            "data_nascimento": [datetime.date(2003, 8, 15)],
            "status_matricula": ["Ativo"],
            "foto_url": ["https://example.com/photo.jpg"],
            "is_interno": [1],
            "status": [False],
        }
    )
    parquet_buffer = io.BytesIO()
    full_dataframe.write_parquet(parquet_buffer)

    upload_service.process_upload_in_background(
        parquet_buffer.getvalue(), "full.parquet"
    )

    db_session.expire_all()
    saved_person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20261UPL0005").one()
    )
    assert saved_person.cpf == typed_cpf
    assert saved_person.modalidade == ModalidadeEnsino.SUPERIOR
    assert saved_person.data_nascimento == datetime.date(2003, 8, 15)
    assert saved_person.status_matricula == "Ativo"
    assert saved_person.foto_url == "https://example.com/photo.jpg"
    assert saved_person.is_interno is True
    assert saved_person.status is False


def test_process_upload_in_background_logs_error_when_extension_is_unsupported(
    monkeypatch, caplog
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)

    with caplog.at_level(logging.ERROR):
        upload_service.process_upload_in_background(b"content", "invalid.txt")

    assert any(
        log_record.levelno == logging.ERROR
        and "Unsupported file format" in log_record.message
        for log_record in caplog.records
    )


def test_process_upload_in_background_logs_error_when_required_columns_are_missing(
    monkeypatch, caplog
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)

    with caplog.at_level(logging.ERROR):
        upload_service.process_upload_in_background(
            b"matricula,nome\n20261UPL9999,No CPF\n", "incomplete.csv"
        )

    assert any(
        log_record.levelno == logging.ERROR
        and "Missing required columns" in log_record.message
        for log_record in caplog.records
    )


def test_process_upload_in_background_logs_error_when_cpf_is_invalid(
    monkeypatch, caplog
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)

    invalid_cpf_csv = (
        b"matricula,nome,cpf,tipo_vinculo\n20261UPL8888,Bad CPF,11111111111,ALUNO\n"
    )
    with caplog.at_level(logging.ERROR):
        upload_service.process_upload_in_background(invalid_cpf_csv, "bad_cpf.csv")

    assert any(
        log_record.levelno == logging.ERROR
        and "todos os dígitos são iguais" in log_record.message
        for log_record in caplog.records
    )


def test_process_upload_in_background_logs_error_when_file_is_empty(
    monkeypatch, caplog
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)

    with caplog.at_level(logging.ERROR):
        upload_service.process_upload_in_background(b"", "empty.csv")

    assert any(
        log_record.levelno == logging.ERROR
        and "uploaded file is empty" in log_record.message
        for log_record in caplog.records
    )


def test_process_upload_in_background_logs_error_when_csv_has_no_rows(
    monkeypatch, caplog
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)

    with caplog.at_level(logging.ERROR):
        upload_service.process_upload_in_background(
            b"matricula,nome,cpf,tipo_vinculo\n", "no_rows.csv"
        )

    assert any(
        log_record.levelno == logging.ERROR
        and "contains no records" in log_record.message
        for log_record in caplog.records
    )


def test_process_upload_in_background_logs_error_when_boolean_value_is_invalid(
    monkeypatch, caplog
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)

    with caplog.at_level(logging.ERROR):
        upload_service.process_upload_in_background(
            b"matricula,nome,cpf,tipo_vinculo,status\n"
            b"20261UPL7777,Bad Bool,12345670088,ALUNO,maybe\n",
            "bad_bool.csv",
        )

    assert any(
        log_record.levelno == logging.ERROR
        and "Invalid boolean value" in log_record.message
        for log_record in caplog.records
    )


def test_process_upload_in_background_logs_error_when_required_field_is_blank(
    monkeypatch, caplog
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)

    with caplog.at_level(logging.ERROR):
        upload_service.process_upload_in_background(
            b"matricula,nome,cpf,tipo_vinculo\n20261UPL7778,,12345670088,ALUNO\n",
            "blank_name.csv",
        )

    assert any(
        log_record.levelno == logging.ERROR
        and "required fields cannot be empty" in log_record.message
        for log_record in caplog.records
    )


def test_detect_csv_separator_returns_comma_when_bytes_are_empty():
    assert upload_service._detect_csv_separator(b"") == ","


def test_normalize_and_validate_dataframe_raises_value_error_when_all_rows_are_null():
    null_dataframe = pl.DataFrame(
        {
            "matricula": [None],
            "nome": [None],
            "cpf": [None],
            "tipo_vinculo": [None],
        }
    )

    with pytest.raises(ValueError, match="contains no valid records"):
        upload_service._normalize_and_validate_dataframe(null_dataframe)


def test_clean_text_returns_none_when_value_is_nan():
    assert upload_service._clean_text(float("nan")) is None


def test_convert_to_boolean_returns_default_for_none_nan_and_blank_string():
    assert upload_service._convert_to_boolean(None, default=True) is True
    assert upload_service._convert_to_boolean(float("nan"), default=False) is False
    assert upload_service._convert_to_boolean("   ", default=True) is True


def test_convert_to_boolean_converts_float_numbers_to_boolean():
    assert upload_service._convert_to_boolean(1.0, default=False) is True
    assert upload_service._convert_to_boolean(0.0, default=True) is False


def test_convert_date_extracts_date_from_datetime_and_cleans_strings():
    timestamp = datetime.datetime(2002, 5, 10, 14, 30)
    assert upload_service._convert_date(timestamp) == datetime.date(2002, 5, 10)
    assert upload_service._convert_date(" 2002-05-10 ") == "2002-05-10"
    assert upload_service._convert_date(None) is None


def test_process_upload_in_background_logs_error_when_polars_read_fails(caplog):
    with (
        patch.object(
            upload_service.pl,
            "read_csv",
            side_effect=OSError("Corrupted CSV stream"),
        ),
        caplog.at_level(logging.ERROR),
    ):
        upload_service.process_upload_in_background(b"a,b\n1,2\n", "corrupted.csv")

    assert any(
        log_record.levelno == logging.ERROR
        and "Corrupted CSV stream" in log_record.message
        for log_record in caplog.records
    )


def test_process_upload_in_background_logs_error_when_upsert_raises_integrity_error(
    caplog,
):
    mock_session = MagicMock()
    session_ctx = MagicMock()
    session_ctx.__enter__.return_value = mock_session
    session_ctx.__exit__.return_value = False
    valid_csv = (
        "matricula,nome,cpf,tipo_vinculo\n"
        f"20261UPL6666,Student,{_make_valid_cpf(6)},ALUNO\n"
    ).encode("utf-8")

    with (
        patch.object(upload_service, "SessionLocal", return_value=session_ctx),
        patch.object(
            upload_service,
            "bulk_upsert",
            side_effect=IntegrityError("stmt", {}, Exception("duplicate cpf")),
        ),
        caplog.at_level(logging.ERROR),
    ):
        upload_service.process_upload_in_background(valid_csv, "cpf_conflict.csv")

    assert any(
        log_record.levelno == logging.ERROR and "duplicate cpf" in log_record.message
        for log_record in caplog.records
    )
