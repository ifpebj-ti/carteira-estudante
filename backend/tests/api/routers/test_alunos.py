import pytest
from fastapi import status
from pydantic import ValidationError

from app.api.dependencies.security import get_current_user
from app.models.enums import PerfilOperador
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
from app.schemas.pessoa import PessoaBase, PessoaResponse


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
            senha_hash="hashed_test_secret",  # noqa: S106
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
            senha_hash="hashed_test_secret",  # noqa: S106
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
            senha_hash="hashed_test_secret",  # noqa: S106
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


def test_pessoa_response_never_exposes_senha_hash(client, db_session):
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


def _create_photo_test_person(db_session, *, seed: int) -> Pessoa:
    from sqlalchemy import text

    from app.models.enums import TipoVinculo

    base_value = 800000000 + seed * 97
    digits = [int(digit) for digit in f"{base_value:09d}"]
    if len(set(digits)) == 1:
        digits[0] = (digits[0] + 1) % 10
    first_check = sum(digits[index] * (10 - index) for index in range(9)) % 11
    digits.append(0 if first_check < 2 else 11 - first_check)
    second_check = sum(digits[index] * (11 - index) for index in range(10)) % 11
    digits.append(0 if second_check < 2 else 11 - second_check)
    valid_cpf = "".join(str(digit) for digit in digits)

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
        nome=f"Photo Target Student {seed}",
        cpf=valid_cpf,
        matricula=f"2026ROUTE{seed:04d}",
        email=f"photo.route.{seed}@discente.ifpe.edu.br",
        tipo_vinculo=TipoVinculo.ALUNO,
        curso="Engenharia de Software",
        status=True,
    )
    db_session.add(person)
    db_session.commit()
    db_session.refresh(person)
    return person


def _override_photo_operator(client, *, profile_name: str) -> None:
    from app.api.dependencies.security import get_current_user
    from app.models.enums import PerfilOperador
    from app.models.usuario import UsuarioSistema

    profile = PerfilOperador(profile_name)
    operator = UsuarioSistema(
        id=900,
        nome=f"Operator {profile.value}",
        login=f"photo_{profile.value.lower()}@ifpe.edu.br",
        senha_hash="hashed_test_secret",  # noqa: S106
        perfil=profile,
        status=True,
    )
    client.app.dependency_overrides[get_current_user] = lambda: operator


def test_upload_photo_returns_401_when_unauthenticated(client) -> None:
    client.app.dependency_overrides.clear()
    client.cookies.clear()

    response = client.post(
        "/api/v1/pessoas/1/photo",
        files={"file": ("avatar.jpg", b"jpeg-bytes", "image/jpeg")},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_upload_photo_returns_403_when_operator_is_doorman(client) -> None:
    _override_photo_operator(client, profile_name="PORTEIRO")
    try:
        response = client.post(
            "/api/v1/pessoas/1/photo",
            files={"file": ("avatar.jpg", b"jpeg-bytes", "image/jpeg")},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
    finally:
        client.app.dependency_overrides.clear()


def test_upload_photo_returns_403_when_authenticated_as_person(
    client, db_session
) -> None:
    from app.core.security import get_password_hash

    person = _create_photo_test_person(db_session, seed=1)
    person.senha_hash = get_password_hash("Mudar@123")
    db_session.commit()

    login_response = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": person.matricula, "senha": "Mudar@123"},
    )
    assert login_response.status_code == status.HTTP_200_OK
    person_token = login_response.json()["access_token"]
    client.cookies.clear()
    client.app.dependency_overrides.clear()

    response = client.post(
        f"/api/v1/pessoas/{person.id}/photo",
        headers={"Authorization": f"Bearer {person_token}"},
        files={"file": ("avatar.jpg", b"jpeg-bytes", "image/jpeg")},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_upload_photo_returns_404_when_person_not_found(client) -> None:
    _override_photo_operator(client, profile_name="ADMIN")
    try:
        response = client.post(
            "/api/v1/pessoas/999999/photo",
            files={"file": ("avatar.jpg", b"jpeg-bytes", "image/jpeg")},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "Person not found."
    finally:
        client.app.dependency_overrides.clear()


def test_upload_photo_returns_400_when_extension_is_invalid(client, db_session) -> None:
    person = _create_photo_test_person(db_session, seed=2)
    _override_photo_operator(client, profile_name="ADMIN")
    try:
        response = client.post(
            f"/api/v1/pessoas/{person.id}/photo",
            files={"file": ("document.pdf", b"pdf-bytes", "image/jpeg")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid image extension" in response.json()["detail"]
    finally:
        client.app.dependency_overrides.clear()


def test_upload_photo_returns_400_when_content_type_is_invalid(
    client, db_session
) -> None:
    person = _create_photo_test_person(db_session, seed=3)
    _override_photo_operator(client, profile_name="ADMIN")
    try:
        response = client.post(
            f"/api/v1/pessoas/{person.id}/photo",
            files={"file": ("avatar.jpg", b"text-bytes", "text/plain")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["detail"] == "Invalid image content type."
    finally:
        client.app.dependency_overrides.clear()


def test_upload_photo_returns_400_when_file_is_empty(client, db_session) -> None:
    person = _create_photo_test_person(db_session, seed=4)
    _override_photo_operator(client, profile_name="ADMIN")
    try:
        response = client.post(
            f"/api/v1/pessoas/{person.id}/photo",
            files={"file": ("empty.png", b"", "image/png")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["detail"] == "Uploaded image file is empty."
    finally:
        client.app.dependency_overrides.clear()


def test_upload_photo_returns_400_when_file_exceeds_size_limit(
    client, db_session
) -> None:
    person = _create_photo_test_person(db_session, seed=5)
    oversized_bytes = b"a" * (5 * 1024 * 1024 + 1)
    _override_photo_operator(client, profile_name="ADMIN")
    try:
        response = client.post(
            f"/api/v1/pessoas/{person.id}/photo",
            files={"file": ("huge.webp", oversized_bytes, "image/webp")},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert (
            response.json()["detail"] == "Uploaded image exceeds the 5 MB size limit."
        )
    finally:
        client.app.dependency_overrides.clear()


def test_upload_photo_returns_202_and_persists_url_in_background_for_valid_image(
    client, db_session, monkeypatch
) -> None:
    from unittest.mock import patch

    from app.services import photo_upload_service
    from tests.conftest import TestingSessionLocal

    person = _create_photo_test_person(db_session, seed=6)
    monkeypatch.setattr(photo_upload_service, "SessionLocal", TestingSessionLocal)
    expected_url = "https://cdn.example.edu.br/photos/student6.png"

    _override_photo_operator(client, profile_name="ADMIN")
    try:
        with patch(
            "app.services.photo_upload_service.upload_photo_to_storage",
            return_value=expected_url,
        ) as mock_upload:
            response = client.post(
                f"/api/v1/pessoas/{person.id}/photo",
                files={"file": ("avatar.png", b"valid-png-bytes", "image/png")},
            )
    finally:
        client.app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_202_ACCEPTED
    assert response.json() == {
        "message": "Photo upload received and processing started in background"
    }
    mock_upload.assert_called_once()
    db_session.refresh(person)
    assert person.foto_url == expected_url
