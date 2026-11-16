import pytest
from fastapi import status
from pydantic import ValidationError

from app.api.dependencies.security import get_current_user
from app.models.enums import PerfilOperador, TipoVinculo
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
from app.schemas.pessoa import PessoaBase, PessoaResponse
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


def test_get_person_by_matricula_returns_404_when_matricula_not_found(client):
    response = client.get("/api/v1/pessoas/20241INBJ9999")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Pessoa não encontrado"


def test_get_person_by_matricula_returns_200_and_details_when_found(client, db_session):
    person = Pessoa(
        matricula="20241EWBJ0001",
        nome="Test Student",
        cpf="12345670088",
        tipo_vinculo="ALUNO",
    )
    db_session.add(person)
    db_session.commit()

    response = client.get("/api/v1/pessoas/20241EWBJ0001")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["matricula"] == "20241EWBJ0001"
    assert data["nome"] == "Test Student"
    assert data["cpf"] == "12345670088"


def test_list_people_returns_200_and_list_for_valid_admin(client, db_session):
    person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20241EWBJ0099").first()
    )
    if not person:
        person = Pessoa(
            matricula="20241EWBJ0099",
            nome="Admin Listed Student",
            cpf="11144477735",
            tipo_vinculo="ALUNO",
        )
        db_session.add(person)
        db_session.commit()

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
    person = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20241EWBJ0099").first()
    )
    if not person:
        person = Pessoa(
            matricula="20241EWBJ0099",
            nome="Admin Listed Student",
            cpf="11144477735",
            tipo_vinculo="ALUNO",
        )
        db_session.add(person)
        db_session.commit()

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
        cpf="10000000019",
        tipo_vinculo=TipoVinculo.ALUNO,
        curso="Old",
        email="before_api@discente.ifpe.edu.br",
        senha_hash=preserved_hash,
    )
    db_session.add(existing_person)
    db_session.commit()

    csv_payload = (
        "matricula,nome,cpf,tipo_vinculo,curso,email\n"
        "20261API0001,After Router,10000000019,PROFESSOR,"
        "Computing,after_api@ifpe.edu.br\n"
        "20261API0002,New Person API,20000000027,ALUNO,"
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
    assert created_person.cpf == "20000000027"
    assert created_person.status is True
