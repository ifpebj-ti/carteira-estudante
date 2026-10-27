import pytest
from fastapi import status
from pydantic import ValidationError

from app.models.pessoa import Pessoa
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
