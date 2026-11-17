from typing import Any

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models.pessoa import Pessoa

# Local password hashes must never be overwritten or injected by batch imports.
_PROTECTED_COLUMNS = frozenset({"id", "senha_hash", "created_at", "deleted_at"})
_UPDATABLE_COLUMNS = (
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
)
_INSERT_DEFAULTS: dict[str, Any] = {
    "status": True,
    "is_interno": False,
    "status_matricula": "Ativo",
}


def _extract_provided_columns(
    records: list[dict[str, Any]],
) -> tuple[list[str], set[str]]:
    ordered_columns: list[str] = []
    unique_columns: set[str] = set()
    for record in records:
        for column in record:
            if column not in _PROTECTED_COLUMNS and column not in unique_columns:
                unique_columns.add(column)
                ordered_columns.append(column)
    return ordered_columns, unique_columns


def _prepare_records_for_insert(
    records: list[dict[str, Any]],
    provided_columns: list[str],
    unique_columns: set[str],
) -> list[dict[str, Any]]:
    insert_columns = list(provided_columns)
    for default_column in _INSERT_DEFAULTS:
        if default_column not in unique_columns:
            insert_columns.append(default_column)

    # PostgreSQL raises CardinalityViolation if ON CONFLICT touches the same key twice.
    records_by_matricula: dict[str, dict[str, Any]] = {}
    for record in records:
        sanitized_record = {
            column: record[column] if column in record else _INSERT_DEFAULTS.get(column)
            for column in insert_columns
        }
        matricula = sanitized_record.get("matricula")
        if not matricula:
            raise ValueError("All records must provide 'matricula'.")
        records_by_matricula[str(matricula)] = sanitized_record

    return list(records_by_matricula.values())


def bulk_upsert(db: Session, records: list[dict[str, Any]]) -> int:
    """Perform PostgreSQL bulk upsert by matricula while preserving senha_hash."""
    if not records:
        return 0

    provided_columns, unique_columns = _extract_provided_columns(records)
    records_to_insert = _prepare_records_for_insert(
        records,
        provided_columns,
        unique_columns,
    )

    stmt = insert(Pessoa).values(records_to_insert)
    update_fields = {
        column: getattr(stmt.excluded, column)
        for column in _UPDATABLE_COLUMNS
        if column in unique_columns
    }
    update_fields["updated_at"] = func.now()

    upsert_stmt = stmt.on_conflict_do_update(
        index_elements=["matricula"],
        set_=update_fields,
    )

    try:
        db.execute(upsert_stmt)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return len(records_to_insert)
