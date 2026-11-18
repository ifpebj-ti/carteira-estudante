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
    client.app.dependency_overrides.pop(get_current_user, None)
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
        client.app.dependency_overrides.pop(get_current_user, None)


def test_upload_photo_returns_202_when_authenticated_as_self_person(
    client, db_session, monkeypatch
) -> None:
    from unittest.mock import patch

    from app.core.security import get_password_hash
    from app.services import photo_upload_service

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
    client.app.dependency_overrides.pop(get_current_user, None)

    monkeypatch.setattr(photo_upload_service, "SessionLocal", TestingSessionLocal)
    expected_url = "/static/photos/self_avatar.jpg"

    with patch(
        "app.services.photo_upload_service.upload_photo_to_storage",
        return_value=expected_url,
    ):
        response = client.post(
            f"/api/v1/pessoas/{person.id}/photo",
            headers={"Authorization": f"Bearer {person_token}"},
            files={"file": ("avatar.jpg", b"jpeg-bytes", "image/jpeg")},
        )

    assert response.status_code == status.HTTP_202_ACCEPTED
    db_session.refresh(person)
    assert person.foto_url == expected_url


def test_upload_photo_returns_403_when_person_uploads_for_another_person(
    client, db_session
) -> None:
    from app.core.security import get_password_hash

    person_a = _create_photo_test_person(db_session, seed=10)
    person_b = _create_photo_test_person(db_session, seed=11)
    person_a.senha_hash = get_password_hash("Mudar@123")
    db_session.commit()

    login_response = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": person_a.matricula, "senha": "Mudar@123"},
    )
    assert login_response.status_code == status.HTTP_200_OK
    person_a_token = login_response.json()["access_token"]
    client.cookies.clear()
    client.app.dependency_overrides.pop(get_current_user, None)

    response = client.post(
        f"/api/v1/pessoas/{person_b.id}/photo",
        headers={"Authorization": f"Bearer {person_a_token}"},
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
        client.app.dependency_overrides.pop(get_current_user, None)


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
        client.app.dependency_overrides.pop(get_current_user, None)


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
        client.app.dependency_overrides.pop(get_current_user, None)


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
        client.app.dependency_overrides.pop(get_current_user, None)


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
        client.app.dependency_overrides.pop(get_current_user, None)


def test_upload_photo_returns_202_and_persists_url_in_background_for_valid_image(
    client, db_session, monkeypatch
) -> None:
    from unittest.mock import patch

    from app.services import photo_upload_service

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
        client.app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == status.HTTP_202_ACCEPTED
    assert response.json() == {
        "message": "Photo upload received and processing started in background"
    }
    mock_upload.assert_called_once()
    db_session.refresh(person)
    assert person.foto_url == expected_url


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
