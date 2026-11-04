import pytest
from fastapi import status
from pydantic import ValidationError

from app.api.dependencies.security import get_current_user
from app.models.enums import PerfilOperador
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
from app.schemas.pessoa import PessoaBase


def test_get_pessoa_by_matricula_not_found(client):
    response = client.get("/api/v1/pessoas/20241INBJ9999")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Pessoa não encontrado"


def test_get_pessoa_by_matricula_success(client, db_session):
    pessoa = Pessoa(
        matricula="20241EWBJ0001",
        nome="Aluno Teste",
        cpf="12345670088",
        tipo_vinculo="ALUNO",
    )
    db_session.add(pessoa)
    db_session.commit()

    response = client.get("/api/v1/pessoas/20241EWBJ0001")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["matricula"] == "20241EWBJ0001"
    assert data["nome"] == "Aluno Teste"
    assert data["cpf"] == "12345670088"


def test_list_pessoas_allowed_for_admin(client, db_session):
    pessoa = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20241EWBJ0099").first()
    )
    if not pessoa:
        pessoa = Pessoa(
            matricula="20241EWBJ0099",
            nome="Admin Listed Student",
            cpf="11144477735",
            tipo_vinculo="ALUNO",
        )
        db_session.add(pessoa)
        db_session.commit()

    def override_admin():
        return UsuarioSistema(
            id=1,
            nome="Admin Test",
            login="admin@test.com",
            perfil=PerfilOperador.ADMIN,
            status=True,
        )

    client.app.dependency_overrides[get_current_user] = override_admin
    try:
        response = client.get("/api/v1/pessoas")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert any(p["matricula"] == "20241EWBJ0099" for p in data)
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_update_pessoa_patch_success(client, db_session):
    pessoa = (
        db_session.query(Pessoa).filter(Pessoa.matricula == "20241EWBJ0099").first()
    )
    if not pessoa:
        pessoa = Pessoa(
            matricula="20241EWBJ0099",
            nome="Admin Listed Student",
            cpf="11144477735",
            tipo_vinculo="ALUNO",
        )
        db_session.add(pessoa)
        db_session.commit()

    def override_admin():
        return UsuarioSistema(
            id=1,
            nome="Admin Test",
            login="admin@test.com",
            perfil=PerfilOperador.ADMIN,
            status=True,
        )

    client.app.dependency_overrides[get_current_user] = override_admin
    try:
        response = client.patch(
            "/api/v1/pessoas/20241EWBJ0099",
            json={
                "nome": "Aluno Atualizado",
                "curso": "Engenharia de Software",
                "email": "atualizado@discente.ifpe.edu.br",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["nome"] == "Aluno Atualizado"
        assert data["curso"] == "Engenharia de Software"
        assert data["email"] == "atualizado@discente.ifpe.edu.br"
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_update_pessoa_not_found(client):
    def override_admin():
        return UsuarioSistema(
            id=1,
            nome="Admin Test",
            login="admin@test.com",
            perfil=PerfilOperador.ADMIN,
            status=True,
        )

    client.app.dependency_overrides[get_current_user] = override_admin
    try:
        response = client.patch(
            "/api/v1/pessoas/20241INBJ9998",
            json={"nome": "Inexistente"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_cpf_validator_clean_formatted():
    pessoa = PessoaBase(
        matricula="20241INBJ0001",
        nome="Teste",
        cpf="123.456.700-88",
    )
    assert pessoa.cpf == "12345670088"


def test_cpf_validator_invalid_length():
    with pytest.raises(ValidationError, match="11 dígitos"):
        PessoaBase(matricula="20241INBJ0001", nome="Teste", cpf="12345678")


def test_cpf_validator_all_same_digits():
    with pytest.raises(ValidationError, match="todos os dígitos são iguais"):
        PessoaBase(matricula="20241INBJ0001", nome="Teste", cpf="111.111.111-11")


def test_cpf_validator_invalid_first_check_digit():
    with pytest.raises(ValidationError, match="primeiro dígito verificador"):
        PessoaBase(matricula="20241INBJ0001", nome="Teste", cpf="123.456.700-98")


def test_cpf_validator_invalid_second_check_digit():
    with pytest.raises(ValidationError, match="segundo dígito verificador"):
        PessoaBase(matricula="20241INBJ0001", nome="Teste", cpf="123.456.700-89")
