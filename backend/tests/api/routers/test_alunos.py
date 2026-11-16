import pytest
from fastapi import status
from pydantic import ValidationError

from app.api.dependencies.security import get_current_user
from app.models.enums import PerfilOperador
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
from app.schemas.pessoa import PessoaBase, PessoaResponse, PessoaUpdate


def _override_admin():
    return UsuarioSistema(
        id=1,
        nome="Admin Test",
        login="admin@test.com",
        senha_hash="hashed_test_secret",  # noqa: S106
        perfil=PerfilOperador.ADMIN,
        status=True,
    )


def _get_or_create_pessoa(
    db_session,
    *,
    matricula: str,
    nome: str,
    cpf: str,
    email: str | None = None,
) -> Pessoa:
    pessoa = db_session.query(Pessoa).filter(Pessoa.matricula == matricula).first()
    if not pessoa:
        pessoa = Pessoa(
            matricula=matricula,
            nome=nome,
            cpf=cpf,
            email=email,
            tipo_vinculo="ALUNO",
        )
        db_session.add(pessoa)
        db_session.commit()
        db_session.refresh(pessoa)
    return pessoa


def test_get_pessoa_by_matricula_returns_404_when_matricula_does_not_exist(client):
    response = client.get("/api/v1/pessoas/20241INBJ9999")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Pessoa não encontrado"


def test_get_pessoa_by_matricula_returns_200_and_details_when_found(client, db_session):
    _get_or_create_pessoa(
        db_session,
        matricula="20241EWBJ0001",
        nome="Aluno Teste",
        cpf="12345670088",
    )

    response = client.get("/api/v1/pessoas/20241EWBJ0001")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["matricula"] == "20241EWBJ0001"
    assert data["nome"] == "Aluno Teste"
    assert data["cpf"] == "12345670088"


def test_list_pessoas_returns_200_and_list_for_valid_admin(client, db_session):
    _get_or_create_pessoa(
        db_session,
        matricula="20241EWBJ0099",
        nome="Admin Listed Student",
        cpf="11144477735",
    )

    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        response = client.get("/api/v1/pessoas")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert any(p["matricula"] == "20241EWBJ0099" for p in data)
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_update_pessoa_returns_200_and_updates_fields_for_valid_admin(
    client, db_session
):
    _get_or_create_pessoa(
        db_session,
        matricula="20241EWBJ0099",
        nome="Admin Listed Student",
        cpf="11144477735",
    )

    client.app.dependency_overrides[get_current_user] = _override_admin
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


def test_update_pessoa_returns_404_when_matricula_does_not_exist(client):
    client.app.dependency_overrides[get_current_user] = _override_admin
    try:
        response = client.patch(
            "/api/v1/pessoas/20241INBJ9998",
            json={"nome": "Inexistente"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_update_pessoa_returns_200_and_ignores_null_non_nullable_fields(
    client, db_session
):
    _get_or_create_pessoa(
        db_session,
        matricula="20241EWBJ0101",
        nome="Aluno Nao Nulo",
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
                "curso": "Agroecologia",
            },
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["nome"] == "Aluno Nao Nulo"
        assert data["cpf"] == "10000000019"
        assert data["tipo_vinculo"] == "ALUNO"
        assert data["curso"] == "Agroecologia"
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)


def test_update_pessoa_returns_200_when_updating_to_unique_cpf(client, db_session):
    _get_or_create_pessoa(
        db_session,
        matricula="20241EWBJ0102",
        nome="Aluno Troca CPF",
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


def test_update_pessoa_returns_400_when_cpf_belongs_to_another_pessoa(
    client, db_session
):
    _get_or_create_pessoa(
        db_session,
        matricula="20241EWBJ0103",
        nome="Aluno Dono CPF",
        cpf="39053344705",
        email="dono_cpf@discente.ifpe.edu.br",
    )
    _get_or_create_pessoa(
        db_session,
        matricula="20241EWBJ0104",
        nome="Aluno Alvo CPF",
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


def test_update_pessoa_returns_400_when_email_belongs_to_another_pessoa(
    client, db_session
):
    _get_or_create_pessoa(
        db_session,
        matricula="20241EWBJ0103",
        nome="Aluno Dono CPF",
        cpf="39053344705",
        email="dono_cpf@discente.ifpe.edu.br",
    )
    _get_or_create_pessoa(
        db_session,
        matricula="20241EWBJ0104",
        nome="Aluno Alvo CPF",
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
    pessoa = PessoaBase(
        matricula="20241INBJ0001",
        nome="Teste",
        cpf="123.456.700-88",
    )
    assert pessoa.cpf == "12345670088"


def test_pessoa_base_cpf_raises_validation_error_when_length_is_not_11():
    with pytest.raises(ValidationError, match="11 dígitos"):
        PessoaBase(matricula="20241INBJ0001", nome="Teste", cpf="12345678")


def test_pessoa_base_cpf_raises_validation_error_when_all_digits_match():
    with pytest.raises(ValidationError, match="todos os dígitos são iguais"):
        PessoaBase(matricula="20241INBJ0001", nome="Teste", cpf="111.111.111-11")


def test_pessoa_base_cpf_raises_validation_error_when_first_digit_invalid():
    with pytest.raises(ValidationError, match="primeiro dígito verificador"):
        PessoaBase(matricula="20241INBJ0001", nome="Teste", cpf="123.456.700-98")


def test_pessoa_base_cpf_raises_validation_error_when_second_digit_invalid():
    with pytest.raises(ValidationError, match="segundo dígito verificador"):
        PessoaBase(matricula="20241INBJ0001", nome="Teste", cpf="123.456.700-89")


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


def test_pessoa_response_excludes_senha_hash_from_model_and_api_response(
    client, db_session
):
    assert "senha_hash" not in PessoaResponse.model_fields

    pessoa = Pessoa(
        matricula="20241EWBJ0888",
        nome="Aluno Privacidade",
        cpf="52998224725",
        tipo_vinculo="ALUNO",
        senha_hash="segredo_hash_super_confidencial",  # noqa: S106
    )
    db_session.add(pessoa)
    db_session.commit()
    db_session.refresh(pessoa)

    assert "senha_hash" not in PessoaResponse.model_validate(pessoa).model_dump()

    response = client.get("/api/v1/pessoas/20241EWBJ0888")
    assert response.status_code == status.HTTP_200_OK
    assert "senha_hash" not in response.json()
