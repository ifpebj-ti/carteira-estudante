import datetime
import io
import logging
import math
from pathlib import Path
from typing import Any

import polars as pl

from app.core.database import SessionLocal
from app.repositories.pessoa_repository import bulk_upsert
from app.schemas.pessoa import PessoaBase

# Ensure logs appear under Uvicorn without duplicating pytest capture handlers.
if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)

ALLOWED_UPLOAD_EXTENSIONS = frozenset({".csv", ".xlsx", ".parquet"})
_REQUIRED_COLUMNS = frozenset({"matricula", "nome", "cpf", "tipo_vinculo"})
_ALLOWED_COLUMNS = frozenset(
    {
        "matricula",
        "nome",
        "cpf",
        "tipo_vinculo",
        "modalidade",
        "curso",
        "data_nascimento",
        "status_matricula",
        "is_interno",
        "email",
        "foto_url",
        "status",
    }
)
_BOOL_TRUE_VALUES = frozenset({"true", "1", "sim", "s", "yes", "y", "ativo"})
_BOOL_FALSE_VALUES = frozenset({"false", "0", "nao", "não", "n", "no", "inativo"})


def _detect_csv_separator(file_bytes: bytes) -> str:
    lines = file_bytes.splitlines()
    if not lines:
        return ","
    first_line = lines[0].decode("utf-8-sig", errors="ignore")
    if ";" in first_line and "," not in first_line:
        return ";"
    return ","


def _convert_file_to_dataframe(file_bytes: bytes, filename: str) -> pl.DataFrame:
    if not file_bytes:
        raise ValueError("The uploaded file is empty.")

    file_extension = Path(filename).suffix.lower()
    file_buffer = io.BytesIO(file_bytes)

    if file_extension == ".csv":
        # Disable schema inference so leading zeros in CPF and matricula are preserved.
        return pl.read_csv(
            file_buffer,
            separator=_detect_csv_separator(file_bytes),
            infer_schema=False,
        )
    if file_extension == ".xlsx":
        # Use openpyxl because Polars' default calamine engine is not installed.
        return pl.read_excel(file_buffer, engine="openpyxl")
    if file_extension == ".parquet":
        return pl.read_parquet(file_buffer)

    raise ValueError(f"Unsupported file format: '{file_extension or 'no extension'}'.")


def _normalize_and_validate_dataframe(raw_dataframe: pl.DataFrame) -> pl.DataFrame:
    if raw_dataframe.is_empty():
        raise ValueError("The uploaded file contains no records.")

    normalized_headers = {
        column: column.lstrip("\ufeff").strip().lower()
        for column in raw_dataframe.columns
    }
    people_dataframe = raw_dataframe.rename(normalized_headers)
    people_dataframe = people_dataframe.filter(~pl.all_horizontal(pl.all().is_null()))

    if people_dataframe.is_empty():
        raise ValueError("The uploaded file contains no valid records.")

    missing_columns = sorted(_REQUIRED_COLUMNS - set(people_dataframe.columns))
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}.")

    allowed_columns = [
        column for column in people_dataframe.columns if column in _ALLOWED_COLUMNS
    ]
    return people_dataframe.select(allowed_columns)


def _clean_text(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, float):
        if math.isnan(value):
            return None
        # Excel and Parquet can serialize numeric codes as floats ending in .0.
        if value.is_integer():
            return str(int(value))
    text = str(value).strip()
    return text or None


def _convert_to_boolean(value: object, *, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, float):
        if math.isnan(value):
            return default
        return bool(value)
    if isinstance(value, int):
        return bool(value)

    normalized_value = str(value).strip().lower()
    if not normalized_value:
        return default
    if normalized_value in _BOOL_TRUE_VALUES:
        return True
    if normalized_value in _BOOL_FALSE_VALUES:
        return False
    raise ValueError(f"Invalid boolean value: '{value}'.")


def _convert_date(value: object) -> datetime.date | str | None:
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    return _clean_text(value)


def _build_pessoa_candidate(
    raw_row: dict[str, Any],
    present_columns: set[str],
    row_number: int,
) -> dict[str, Any]:
    matricula = _clean_text(raw_row.get("matricula"))
    nome = _clean_text(raw_row.get("nome"))
    cpf = _clean_text(raw_row.get("cpf"))
    tipo_vinculo = _clean_text(raw_row.get("tipo_vinculo"))

    if not matricula or not nome or not cpf or not tipo_vinculo:
        raise ValueError(f"Row {row_number}: required fields cannot be empty.")

    candidate: dict[str, Any] = {
        "matricula": matricula,
        "nome": nome,
        "cpf": cpf,
        "tipo_vinculo": tipo_vinculo.upper(),
    }

    if "modalidade" in present_columns:
        modalidade = _clean_text(raw_row.get("modalidade"))
        candidate["modalidade"] = modalidade.upper() if modalidade else None

    for text_column in ("curso", "email", "foto_url"):
        if text_column in present_columns:
            candidate[text_column] = _clean_text(raw_row.get(text_column))

    if "status_matricula" in present_columns:
        candidate["status_matricula"] = (
            _clean_text(raw_row.get("status_matricula")) or "Ativo"
        )

    if "data_nascimento" in present_columns:
        candidate["data_nascimento"] = _convert_date(raw_row.get("data_nascimento"))

    if "is_interno" in present_columns:
        candidate["is_interno"] = _convert_to_boolean(
            raw_row.get("is_interno"), default=False
        )

    if "status" in present_columns:
        candidate["status"] = _convert_to_boolean(raw_row.get("status"), default=True)

    return candidate


def _filter_valid_records(people_dataframe: pl.DataFrame) -> list[dict[str, Any]]:
    present_columns = set(people_dataframe.columns)
    raw_rows = people_dataframe.to_dicts()
    records_by_matricula: dict[str, dict[str, Any]] = {}

    for row_number, raw_row in enumerate(raw_rows, start=1):
        candidate = _build_pessoa_candidate(
            raw_row,
            present_columns,
            row_number,
        )
        validated_pessoa = PessoaBase(**candidate)
        # Keep only uploaded columns so omitted optional fields stay intact on conflict.
        records_by_matricula[validated_pessoa.matricula] = validated_pessoa.model_dump(
            include=present_columns
        )

    return list(records_by_matricula.values())


def process_upload_in_background(file_bytes: bytes, filename: str) -> None:
    """Process an uploaded file in background with an isolated database session."""
    logger.info("Starting background upload processing for '%s'.", filename)
    try:
        raw_dataframe = _convert_file_to_dataframe(file_bytes, filename)
        people_dataframe = _normalize_and_validate_dataframe(raw_dataframe)
        records_to_insert = _filter_valid_records(people_dataframe)

        # Dedicated session because the HTTP request session closes after HTTP 202.
        with SessionLocal() as db_session:
            synced_count = bulk_upsert(db_session, records_to_insert)

        logger.info(
            "Upload '%s' processed successfully: %d record(s) synced.",
            filename,
            synced_count,
        )
    except Exception as exc:
        logger.error(
            "Failed to process background upload for '%s': %s",
            filename,
            exc,
        )
