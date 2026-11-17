from unittest.mock import MagicMock

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.enums import TipoVinculo
from app.models.pessoa import Pessoa
from app.repositories.pessoa_repository import bulk_upsert


def _make_valid_cpf(seed_num: int) -> str:
    base_val = 400000000 + seed_num * 97
    digits = [int(c) for c in f"{base_val:09d}"]
    if len(set(digits)) == 1:
        digits[0] = (digits[0] + 1) % 10
    first_r = sum(digits[i] * (10 - i) for i in range(9)) % 11
    digits.append(0 if first_r < 2 else 11 - first_r)
    second_r = sum(digits[i] * (11 - i) for i in range(10)) % 11
    digits.append(0 if second_r < 2 else 11 - second_r)
    return "".join(str(d) for d in digits)


def test_bulk_upsert_returns_zero_when_records_list_is_empty(db_session: Session):
    assert bulk_upsert(db_session, []) == 0


def test_bulk_upsert_inserts_new_records_and_updates_on_matricula_conflict(
    db_session: Session,
):
    preserved_hash = "$2b$12$existing_local_password_hash_preserved"  # noqa: S105
    existing_cpf = _make_valid_cpf(1)
    new_cpf = _make_valid_cpf(2)

    existing_person = Pessoa(
        matricula="20261REPO0001",
        nome="Old Name",
        cpf=existing_cpf,
        tipo_vinculo=TipoVinculo.ALUNO,
        curso="Old Course",
        email="old_repo@discente.ifpe.edu.br",
        senha_hash=preserved_hash,
        status=False,
    )
    db_session.add(existing_person)
    db_session.commit()

    records = [
        {
            "matricula": "20261REPO0001",
            "nome": "Updated Name",
            "cpf": existing_cpf,
            "tipo_vinculo": TipoVinculo.PROFESSOR,
            "curso": "Software Engineering",
            "email": "updated_repo@belojardim.ifpe.edu.br",
            "senha_hash": "malicious_overwrite_attempt",
        },
        {
            "matricula": "20261REPO0002",
            "nome": "New Person",
            "cpf": new_cpf,
            "tipo_vinculo": TipoVinculo.ALUNO,
            "curso": "Agroindustry",
            "email": "new_repo@discente.ifpe.edu.br",
            "senha_hash": "malicious_insert_attempt",
        },
    ]

    affected = bulk_upsert(db_session, records)
    assert affected == 2

    db_session.expire_all()
    updated_person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20261REPO0001").one()
    )
    assert updated_person.nome == "Updated Name"
    assert updated_person.tipo_vinculo == TipoVinculo.PROFESSOR
    assert updated_person.curso == "Software Engineering"
    assert updated_person.email == "updated_repo@belojardim.ifpe.edu.br"
    assert updated_person.senha_hash == preserved_hash
    assert updated_person.status is False

    inserted_person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20261REPO0002").one()
    )
    assert inserted_person.nome == "New Person"
    assert inserted_person.status is True
    assert inserted_person.is_interno is False
    assert inserted_person.status_matricula == "Ativo"
    assert inserted_person.senha_hash is None


def test_bulk_upsert_deduplicates_matricula_within_same_batch(db_session: Session):
    duplicate_cpf = _make_valid_cpf(3)
    records = [
        {
            "matricula": "20261REPO0003",
            "nome": "First Row",
            "cpf": duplicate_cpf,
            "tipo_vinculo": TipoVinculo.ALUNO,
            "curso": "Course 1",
            "email": "dup_repo@discente.ifpe.edu.br",
        },
        {
            "matricula": "20261REPO0003",
            "nome": "Second Row Wins",
            "cpf": duplicate_cpf,
            "tipo_vinculo": TipoVinculo.SERVIDOR,
            "curso": "Course 2",
            "email": "dup_repo@belojardim.ifpe.edu.br",
        },
    ]

    assert bulk_upsert(db_session, records) == 1

    db_session.expire_all()
    saved_person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20261REPO0003").one()
    )
    assert saved_person.nome == "Second Row Wins"
    assert saved_person.tipo_vinculo == TipoVinculo.SERVIDOR
    assert saved_person.curso == "Course 2"


def test_bulk_upsert_raises_value_error_when_matricula_is_missing(db_session: Session):
    with pytest.raises(ValueError, match="matricula"):
        bulk_upsert(
            db_session,
            [
                {
                    "nome": "Missing Matricula",
                    "cpf": _make_valid_cpf(4),
                    "tipo_vinculo": "ALUNO",
                }
            ],
        )


def test_bulk_upsert_rolls_back_when_database_execute_raises_error():
    mock_db = MagicMock()
    mock_db.execute.side_effect = SQLAlchemyError("Simulated constraint failure")

    with pytest.raises(SQLAlchemyError):
        bulk_upsert(
            mock_db,
            [
                {
                    "matricula": "20261REPO9999",
                    "nome": "DB Error",
                    "cpf": _make_valid_cpf(5),
                    "tipo_vinculo": "ALUNO",
                }
            ],
        )

    mock_db.rollback.assert_called_once()
