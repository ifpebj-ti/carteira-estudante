import io

import openpyxl
import polars as pl
import pytest
from fastapi import status
from pydantic import ValidationError

from app.api.dependencies.security import get_current_user
from app.api.routers.auth import create_access_token
from app.models.enums import PerfilOperador, TipoVinculo
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
from app.schemas.pessoa import PessoaBase, PessoaResponse, PessoaUpdate
from app.services import upload_service
from tests.conftest import TestingSessionLocal


def _override_admin():
    return UsuarioSistema(
        id=1,
        nome="Admin Test",
        login="admin@test.com",
        senha_hash="hashed_test_secret",  # noqa: S106
        perfil=PerfilOperador.ADMIN,
        status=True,
    )


def _override_doorman():
    return UsuarioSistema(
        id=2,
        nome="Doorman Test",
        login="doorman@test.com",
        senha_hash="hashed_test_secret",  # noqa: S106
        perfil=PerfilOperador.PORTEIRO,
        status=True,
    )


def _get_or_create_person(
    db_session,
    *,
    matricula: str,
    name: str,
    cpf: str,
    email: str | None = None,
) -> Pessoa:
    person = db_session.query(Pessoa).filter(Pessoa.matricula == matricula).first()
    if not person:
        person = Pessoa(
            matricula=matricula,
            nome=name,
            cpf=cpf,
            email=email,
            tipo_vinculo="ALUNO",
        )
        db_session.add(person)
        db_session.commit()
        db_session.refresh(person)
    return person


def test_get_person_by_matricula_returns_404_when_matricula_not_found(client):
    response = client.get("/api/v1/pessoas/20241INBJ9999")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Pessoa não encontrado"


def test_get_person_by_matricula_returns_200_and_details_when_found(client, db_session):
    _get_or_create_person(
        db_session,
        matricula="20241EWBJ0001",
        name="Test Student",
        cpf="12345670088",
    )

    response = client.get("/api/v1/pessoas/20241EWBJ0001")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["matricula"] == "20241EWBJ0001"
    assert data["nome"] == "Test Student"
    assert data["cpf"] == "12345670088"


def test_list_people_returns_200_and_list_for_valid_admin(client, db_session):
    _get_or_create_person(
        db_session,
        matricula="20241EWBJ0099",
        name="Admin Listed Student",
        cpf="11144477735",
    )

    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        response = client.get("/api/v1/pessoas")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert any(item["matricula"] == "20241EWBJ0099" for item in data)
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_update_person_returns_200_and_updates_fields_for_valid_admin(
    client, db_session
):
    _get_or_create_person(
        db_session,
        matricula="20241EWBJ0099",
        name="Admin Listed Student",
        cpf="11144477735",
    )

    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        response = client.patch(
            "/api/v1/pessoas/20241EWBJ0099",
            json={
                "nome": "Updated Student",
                "curso": "Software Engineering",
                "email": "updated@discente.ifpe.edu.br",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["nome"] == "Updated Student"
        assert data["curso"] == "Software Engineering"
        assert data["email"] == "updated@discente.ifpe.edu.br"
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_update_person_returns_404_when_matricula_not_found(client):
    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        response = client.patch(
            "/api/v1/pessoas/20241INBJ9998",
            json={"nome": "Nonexistent"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_update_person_returns_200_and_ignores_null_non_nullable_fields(
    client, db_session
):
    _get_or_create_person(
        db_session,
        matricula="20241EWBJ0101",
        name="Non Null Student",
        cpf="10000000019",
    )

    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        response = client.patch(
            "/api/v1/pessoas/20241EWBJ0101",
            json={
                "nome": None,
                "cpf": None,
                "tipo_vinculo": None,
                "curso": "Agroecology",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["nome"] == "Non Null Student"
        assert data["cpf"] == "10000000019"
        assert data["tipo_vinculo"] == "ALUNO"
        assert data["curso"] == "Agroecology"
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_update_person_returns_200_when_updating_to_unique_cpf(client, db_session):
    _get_or_create_person(
        db_session,
        matricula="20241EWBJ0102",
        name="CPF Swap Student",
        cpf="20000000027",
    )

    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        response = client.patch(
            "/api/v1/pessoas/20241EWBJ0102",
            json={"cpf": "300.000.000-35"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["cpf"] == "30000000035"
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_update_person_returns_400_when_cpf_belongs_to_another_person(
    client, db_session
):
    _get_or_create_person(
        db_session,
        matricula="20241EWBJ0103",
        name="CPF Owner Student",
        cpf="39053344705",
        email="dono_cpf@discente.ifpe.edu.br",
    )
    _get_or_create_person(
        db_session,
        matricula="20241EWBJ0104",
        name="CPF Target Student",
        cpf="98765432100",
        email="alvo_cpf@discente.ifpe.edu.br",
    )

    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        response = client.patch(
            "/api/v1/pessoas/20241EWBJ0104",
            json={"cpf": "390.533.447-05"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert (
            response.json()["detail"] == "Já existe uma pessoa cadastrada com este CPF."
        )
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_update_person_returns_400_when_email_belongs_to_another_person(
    client, db_session
):
    _get_or_create_person(
        db_session,
        matricula="20241EWBJ0103",
        name="CPF Owner Student",
        cpf="39053344705",
        email="dono_cpf@discente.ifpe.edu.br",
    )
    _get_or_create_person(
        db_session,
        matricula="20241EWBJ0104",
        name="CPF Target Student",
        cpf="98765432100",
        email="alvo_cpf@discente.ifpe.edu.br",
    )

    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        response = client.patch(
            "/api/v1/pessoas/20241EWBJ0104",
            json={"email": "dono_cpf@discente.ifpe.edu.br"},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert (
            response.json()["detail"]
            == "Já existe uma pessoa cadastrada com este e-mail."
        )
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_pessoa_base_cpf_strips_punctuation_for_valid_cpf():
    person = PessoaBase(
        matricula="20241INBJ0001",
        nome="Test",
        cpf="123.456.700-88",
    )
    assert person.cpf == "12345670088"


def test_pessoa_base_cpf_raises_validation_error_when_length_is_not_11():
    with pytest.raises(ValidationError, match="11 dígitos"):
        PessoaBase(matricula="20241INBJ0001", nome="Test", cpf="12345678")


def test_pessoa_base_cpf_raises_validation_error_when_all_digits_match():
    with pytest.raises(ValidationError, match="todos os dígitos são iguais"):
        PessoaBase(matricula="20241INBJ0001", nome="Test", cpf="111.111.111-11")


def test_pessoa_base_cpf_raises_validation_error_when_first_digit_invalid():
    with pytest.raises(ValidationError, match="primeiro dígito verificador"):
        PessoaBase(matricula="20241INBJ0001", nome="Test", cpf="123.456.700-98")


def test_pessoa_base_cpf_raises_validation_error_when_second_digit_invalid():
    with pytest.raises(ValidationError, match="segundo dígito verificador"):
        PessoaBase(matricula="20241INBJ0001", nome="Test", cpf="123.456.700-89")


def test_pessoa_update_cpf_validator_accepts_none_and_cleans_formatted_cpf():
    payload_none = PessoaUpdate(cpf=None)
    assert payload_none.cpf is None

    payload_valid = PessoaUpdate(cpf="123.456.700-88")
    assert payload_valid.cpf == "12345670088"


def test_pessoa_update_cpf_raises_validation_error_when_cpf_is_invalid():
    with pytest.raises(ValidationError, match="11 dígitos"):
        PessoaUpdate(cpf="12345")


def test_pessoa_update_empty_str_validator_coerces_blank_strings_to_none():
    payload = PessoaUpdate(
        email="   ",
        curso="",
        foto_url=" ",
        status_matricula="",
        modalidade="",
        data_nascimento="",
    )
    assert payload.email is None
    assert payload.curso is None
    assert payload.foto_url is None
    assert payload.status_matricula is None
    assert payload.modalidade is None
    assert payload.data_nascimento is None


def test_pessoa_response_excludes_senha_hash_from_serialization_and_api(
    client, db_session
):
    assert "senha_hash" not in PessoaResponse.model_fields

    person = Pessoa(
        matricula="20241EWBJ0888",
        nome="Privacy Student",
        cpf="52998224725",
        tipo_vinculo="ALUNO",
        senha_hash="super_confidential_secret_hash",  # noqa: S106
    )
    db_session.add(person)
    db_session.commit()
    db_session.refresh(person)

    assert "senha_hash" not in PessoaResponse.model_validate(person).model_dump()

    response = client.get("/api/v1/pessoas/20241EWBJ0888")
    assert response.status_code == status.HTTP_200_OK
    assert "senha_hash" not in response.json()


def test_upload_people_returns_401_when_unauthenticated(client):
    csv_header = b"matricula,nome,cpf,tipo_vinculo\n"
    response = client.post(
        "/api/v1/pessoas/upload",
        files={"file": ("people.csv", csv_header, "text/csv")},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_upload_people_returns_403_when_operator_is_doorman(client):
    csv_header = b"matricula,nome,cpf,tipo_vinculo\n"
    client.app.dependency_overrides[get_current_user] = _override_doorman
    try:
        response = client.post(
            "/api/v1/pessoas/upload",
            files={"file": ("people.csv", csv_header, "text/csv")},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_upload_people_returns_400_when_extension_is_unsupported(client):
    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        response = client.post(
            "/api/v1/pessoas/upload",
            files={"file": ("people.txt", b"data", "text/plain")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_upload_people_returns_400_when_file_is_empty(client):
    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        response = client.post(
            "/api/v1/pessoas/upload",
            files={"file": ("people.csv", b"", "text/csv")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_upload_people_returns_202_and_processes_csv_in_background(
    client, db_session, monkeypatch
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)
    preserved_hash = "$2b$12$existing_router_upload_hash"  # noqa: S105

    existing_person = Pessoa(
        matricula="20261API0001",
        nome="Before Router",
        cpf="91000979776",
        tipo_vinculo=TipoVinculo.ALUNO,
        curso="Old",
        email="before_api@discente.ifpe.edu.br",
        senha_hash=preserved_hash,
    )
    db_session.add(existing_person)
    db_session.commit()

    csv_payload = (
        "matricula,nome,cpf,tipo_vinculo,curso,email\n"
        "20261API0001,After Router,91000979776,PROFESSOR,"
        "Computing,after_api@ifpe.edu.br\n"
        "20261API0002,New Person API,91000989496,ALUNO,"
        "Farming,new_api@discente.ifpe.edu.br\n"
    ).encode("utf-8")

    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        response = client.post(
            "/api/v1/pessoas/upload",
            files={"file": ("people.csv", csv_payload, "text/csv")},
        )
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == status.HTTP_202_ACCEPTED
    assert response.json() == {
        "message": "Upload recebido e processamento iniciado em background"
    }

    db_session.expire_all()
    updated_person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20261API0001").one()
    )
    assert updated_person.nome == "After Router"
    assert updated_person.tipo_vinculo == TipoVinculo.PROFESSOR
    assert updated_person.curso == "Computing"
    assert updated_person.email == "after_api@ifpe.edu.br"
    assert updated_person.senha_hash == preserved_hash

    created_person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20261API0002").one()
    )
    assert created_person.nome == "New Person API"
    assert created_person.cpf == "91000989496"
    assert created_person.status is True


def test_upload_people_returns_403_when_called_with_person_token(client):
    person_token = create_access_token(
        {
            "sub": "1",
            "matricula": "20241EWBJ0001",
            "role": "ALUNO",
            "account_type": "pessoa",
        }
    )
    csv_header = b"matricula,nome,cpf,tipo_vinculo\n"
    response = client.post(
        "/api/v1/pessoas/upload",
        files={"file": ("people.csv", csv_header, "text/csv")},
        headers={"Authorization": f"Bearer {person_token}"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_upload_people_returns_202_and_processes_xlsx_and_parquet_in_background(
    client, db_session, monkeypatch
):
    monkeypatch.setattr(upload_service, "SessionLocal", TestingSessionLocal)

    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.append(["matricula", "nome", "cpf", "tipo_vinculo", "curso", "email"])
    sheet.append(
        [
            "20261API0003",
            "XLSX Router Person",
            "91000999106",
            "ALUNO",
            "ADS",
            "xlsx_api@discente.ifpe.edu.br",
        ]
    )
    xlsx_buffer = io.BytesIO()
    workbook.save(xlsx_buffer)

    parquet_df = pl.DataFrame(
        {
            "matricula": ["20261API0004"],
            "nome": ["Parquet Router Person"],
            "cpf": ["91001008898"],
            "tipo_vinculo": ["SERVIDOR"],
            "curso": [None],
            "email": ["parquet_api@belojardim.ifpe.edu.br"],
        }
    )
    parquet_buffer = io.BytesIO()
    parquet_df.write_parquet(parquet_buffer)

    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        xlsx_resp = client.post(
            "/api/v1/pessoas/upload",
            files={
                "file": (
                    "people.xlsx",
                    xlsx_buffer.getvalue(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        parquet_resp = client.post(
            "/api/v1/pessoas/upload",
            files={
                "file": (
                    "people.parquet",
                    parquet_buffer.getvalue(),
                    "application/octet-stream",
                )
            },
        )
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)

    assert xlsx_resp.status_code == status.HTTP_202_ACCEPTED
    assert parquet_resp.status_code == status.HTTP_202_ACCEPTED

    db_session.expire_all()
    xlsx_person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20261API0003").one()
    )
    assert xlsx_person.nome == "XLSX Router Person"
    assert xlsx_person.cpf == "91000999106"

    parquet_person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20261API0004").one()
    )
    assert parquet_person.nome == "Parquet Router Person"
    assert parquet_person.tipo_vinculo == TipoVinculo.SERVIDOR
