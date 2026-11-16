import datetime

import jwt
import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.api.dependencies.security import RoleChecker, get_current_user
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.enums import PerfilOperador, TipoVinculo
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
from app.services.qr_crypto_service import decode_qr_token, generate_qr_token


def test_verify_password_matches_valid_secret_and_rejects_mismatch():
    hashed = get_password_hash("StrongPass@123")
    assert hashed != "StrongPass@123"
    assert verify_password("StrongPass@123", hashed) is True
    assert verify_password("WrongPass", hashed) is False


def test_role_checker_returns_user_when_role_is_allowed():
    admin = UsuarioSistema(
        id=1,
        nome="Admin User",
        login="admin@ifpe.edu.br",
        senha_hash="hashed_test_secret",  # noqa: S106
        perfil=PerfilOperador.ADMIN,
        status=True,
    )
    checker = RoleChecker([PerfilOperador.ADMIN])
    result = checker(current_user=admin)
    assert result == admin


def test_role_checker_raises_403_when_role_is_insufficient():
    doorman = UsuarioSistema(
        id=2,
        nome="Doorman User",
        login="doorman@ifpe.edu.br",
        senha_hash="hashed_test_secret",  # noqa: S106
        perfil=PerfilOperador.PORTEIRO,
        status=True,
    )
    checker = RoleChecker([PerfilOperador.ADMIN])
    with pytest.raises(HTTPException) as exc_info:
        checker(current_user=doorman)

    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc_info.value.detail == "Acesso negado: privilégios insuficientes"


def test_list_operators_returns_401_when_unauthenticated(client: TestClient):
    response = client.get("/api/v1/auth/usuarios")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert (
        response.json()["detail"]
        == "Não autenticado. Faça login para acessar este recurso."
    )


def test_list_operators_returns_403_when_user_is_doorman(client: TestClient):
    def override_doorman():
        return UsuarioSistema(
            id=2,
            nome="Doorman Test",
            login="doorman@test.com",
            senha_hash="hashed_test_secret",  # noqa: S106
            perfil=PerfilOperador.PORTEIRO,
            status=True,
        )

    client.app.dependency_overrides[get_current_user] = override_doorman
    try:
        response = client.get("/api/v1/auth/usuarios")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["detail"] == "Acesso negado: privilégios insuficientes"
    finally:
        client.app.dependency_overrides.clear()


def test_list_operators_returns_200_and_list_for_valid_admin(
    client: TestClient, db_session
):
    admin = db_session.query(UsuarioSistema).filter(UsuarioSistema.id == 1).first()
    if not admin:
        admin = UsuarioSistema(
            id=1,
            nome="Admin Test",
            login="admin@test.com",
            senha_hash="hashed_test_secret",  # noqa: S106
            perfil=PerfilOperador.ADMIN,
            status=True,
        )
        db_session.add(admin)
        db_session.commit()

    client.app.dependency_overrides[get_current_user] = lambda: admin
    try:
        response = client.get("/api/v1/auth/usuarios")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert any(u["login"] == admin.login for u in data)
    finally:
        client.app.dependency_overrides.clear()


def _create_operator(
    db_session,
    *,
    name: str,
    login: str,
    password_hash: str,
    role: PerfilOperador,
    is_active: bool = True,
) -> UsuarioSistema:
    # Keep PostgreSQL sequence aligned after tests that insert explicit id=1.
    db_session.execute(
        text(
            "SELECT setval("
            "pg_get_serial_sequence('usuarios_sistema', 'id'), "
            "COALESCE((SELECT MAX(id) FROM usuarios_sistema), 1), "
            "(SELECT EXISTS(SELECT 1 FROM usuarios_sistema))"
            ")"
        )
    )
    operator = UsuarioSistema(
        nome=name,
        login=login,
        senha_hash=password_hash,
        perfil=role,
        status=is_active,
    )
    db_session.add(operator)
    db_session.commit()
    db_session.refresh(operator)
    return operator


def test_login_manual_returns_200_and_jwt_token_for_valid_admin(
    client: TestClient, db_session
):
    operator = _create_operator(
        db_session,
        name="Operator Login Test",
        login="admin_login_ok",
        password_hash=get_password_hash("Mudar@123"),
        role=PerfilOperador.ADMIN,
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"login": "admin_login_ok", "senha": "Mudar@123"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["token_type"] == "bearer"  # noqa: S105
    assert "access_token" in data and data["access_token"]
    assert data["account_type"] == "operador"
    assert data["role"] == PerfilOperador.ADMIN.value

    payload = jwt.decode(
        data["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
    )
    assert payload["sub"] == str(operator.id)
    assert payload["role"] == PerfilOperador.ADMIN.value
    assert payload["account_type"] == "operador"

    protected_resp = client.get(
        "/api/v1/auth/usuarios",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert protected_resp.status_code == status.HTTP_200_OK


def test_login_manual_raises_401_when_password_is_incorrect(
    client: TestClient, db_session
):
    _create_operator(
        db_session,
        name="Wrong Password Operator",
        login="porteiro_login_errado",
        password_hash=get_password_hash("CorrectPass@123"),
        role=PerfilOperador.PORTEIRO,
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"login": "porteiro_login_errado", "senha": "WrongPassword"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Credenciais inválidas"


def test_login_manual_returns_401_when_operator_login_not_found(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"login": "nonexistent_user", "senha": "Mudar@123"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Credenciais inválidas"


def test_login_manual_returns_401_when_operator_has_empty_password_hash(
    client: TestClient, db_session
):
    _create_operator(
        db_session,
        name="SSO Operator Without Password",
        login="sso_sem_senha",
        password_hash="",
        role=PerfilOperador.PORTEIRO,
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"login": "sso_sem_senha", "senha": "Mudar@123"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Credenciais inválidas"


def test_login_manual_returns_200_for_doorman_and_enforces_403_on_admin_route(
    client: TestClient, db_session
):
    operator = _create_operator(
        db_session,
        name="Doorman Login Test",
        login="porteiro_login_ok",
        password_hash=get_password_hash("Mudar@123"),
        role=PerfilOperador.PORTEIRO,
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"login": "porteiro_login_ok", "senha": "Mudar@123"},
    )
    assert response.status_code == status.HTTP_200_OK
    token = response.json()["access_token"]

    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == str(operator.id)
    assert payload["role"] == PerfilOperador.PORTEIRO.value

    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == status.HTTP_200_OK
    assert me_resp.json()["email"] == "porteiro_login_ok"

    admin_only_resp = client.get(
        "/api/v1/auth/usuarios",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert admin_only_resp.status_code == status.HTTP_403_FORBIDDEN


def test_login_manual_returns_403_when_operator_is_inactive(
    client: TestClient, db_session
):
    _create_operator(
        db_session,
        name="Inactive Operator",
        login="operador_inativo",
        password_hash=get_password_hash("Mudar@123"),
        role=PerfilOperador.PORTEIRO,
        is_active=False,
    )

    wrong_resp = client.post(
        "/api/v1/auth/login",
        json={"login": "operador_inativo", "senha": "WrongPassword"},
    )
    assert wrong_resp.status_code == status.HTTP_401_UNAUTHORIZED

    valid_resp = client.post(
        "/api/v1/auth/login",
        json={"login": "operador_inativo", "senha": "Mudar@123"},
    )
    assert valid_resp.status_code == status.HTTP_403_FORBIDDEN


def test_login_manual_returns_401_when_operator_is_soft_deleted(
    client: TestClient, db_session
):
    operator = _create_operator(
        db_session,
        name="Deleted Operator",
        login="operador_removido",
        password_hash=get_password_hash("Mudar@123"),
        role=PerfilOperador.ADMIN,
    )
    operator.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"login": "operador_removido", "senha": "Mudar@123"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Credenciais inválidas"


def _make_valid_cpf(seed_num: int) -> str:
    base_val = 200000000 + seed_num * 97
    digits = [int(c) for c in f"{base_val:09d}"]
    if len(set(digits)) == 1:
        digits[0] = (digits[0] + 1) % 10
    first_r = sum(digits[i] * (10 - i) for i in range(9)) % 11
    digits.append(0 if first_r < 2 else 11 - first_r)
    second_r = sum(digits[i] * (11 - i) for i in range(10)) % 11
    digits.append(0 if second_r < 2 else 11 - second_r)
    return "".join(str(d) for d in digits)


def _create_person(
    db_session,
    *,
    cpf_seed: int,
    name: str,
    matricula: str,
    email: str | None,
    password_hash: str | None,
    affiliation: TipoVinculo = TipoVinculo.ALUNO,
    is_active: bool = True,
) -> Pessoa:
    # Keep PostgreSQL sequence aligned after tests that insert explicit id=1.
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
        nome=name,
        cpf=_make_valid_cpf(cpf_seed),
        matricula=matricula,
        email=email,
        senha_hash=password_hash,
        tipo_vinculo=affiliation,
        curso="Software Engineering",
        status=is_active,
    )
    db_session.add(person)
    db_session.commit()
    db_session.refresh(person)
    return person


def test_login_person_returns_200_for_matricula_and_email_on_both_routes(
    client: TestClient, db_session
):
    person = _create_person(
        db_session,
        cpf_seed=1,
        name="Student Auth Test",
        matricula="20241EWBJ9001",
        email="Aluno.Auth@discente.ifpe.edu.br",
        password_hash=get_password_hash("Mudar@123"),
        affiliation=TipoVinculo.ALUNO,
    )

    for endpoint in ("/api/v1/auth/login", "/api/v1/auth/pessoa/login"):
        for identifier in ("20241EWBJ9001", "aluno.auth@discente.ifpe.edu.br"):
            resp = client.post(
                endpoint,
                json={"login": identifier, "senha": "Mudar@123"},
            )
            assert resp.status_code == status.HTTP_200_OK
            data = resp.json()
            assert data["token_type"] == "bearer"  # noqa: S105
            assert data["account_type"] == "pessoa"
            assert data["role"] == TipoVinculo.ALUNO.value

            claims = jwt.decode(
                data["access_token"],
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
            assert claims["sub"] == str(person.id)
            assert claims["matricula"] == person.matricula
            assert claims["role"] == TipoVinculo.ALUNO.value
            assert claims["account_type"] == "pessoa"


@pytest.mark.parametrize(
    ("cpf_seed", "affiliation", "matricula", "email"),
    [
        (2, TipoVinculo.ALUNO, "20241EWBJ9002", "aluno_v@discente.ifpe.edu.br"),
        (
            3,
            TipoVinculo.PROFESSOR,
            "SIAPE-PROF-9003",
            "prof_v@belojardim.ifpe.edu.br",
        ),
        (4, TipoVinculo.SERVIDOR, "SIAPE-SERV-9004", "serv_v@belojardim.ifpe.edu.br"),
        (
            5,
            TipoVinculo.COORDENACAO,
            "SIAPE-COORD-9005",
            "coord_v@belojardim.ifpe.edu.br",
        ),
    ],
)
def test_login_person_returns_200_for_all_affiliations(
    client: TestClient,
    db_session,
    cpf_seed: int,
    affiliation: TipoVinculo,
    matricula: str,
    email: str,
):
    _create_person(
        db_session,
        cpf_seed=cpf_seed,
        name=f"Holder {affiliation.value}",
        matricula=matricula,
        email=email,
        password_hash=get_password_hash("Mudar@123"),
        affiliation=affiliation,
    )

    resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": matricula, "senha": "Mudar@123"},
    )
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["account_type"] == "pessoa"
    assert data["role"] == affiliation.value


def test_login_person_returns_401_and_403_for_invalid_credentials_and_status(
    client: TestClient, db_session
):
    _create_person(
        db_session,
        cpf_seed=10,
        name="Wrong Password Student",
        matricula="20241EWBJ9010",
        email="errada@discente.ifpe.edu.br",
        password_hash=get_password_hash("CorrectPass@123"),
    )
    _create_person(
        db_session,
        cpf_seed=11,
        name="No Hash Student",
        matricula="20241EWBJ9011",
        email="semhash@discente.ifpe.edu.br",
        password_hash=None,
    )
    _create_person(
        db_session,
        cpf_seed=12,
        name="Inactive Student",
        matricula="20241EWBJ9012",
        email="inativo@discente.ifpe.edu.br",
        password_hash=get_password_hash("Mudar@123"),
        is_active=False,
    )
    deleted_person = _create_person(
        db_session,
        cpf_seed=13,
        name="Deleted Student",
        matricula="20241EWBJ9013",
        email="deletado@discente.ifpe.edu.br",
        password_hash=get_password_hash("Mudar@123"),
    )
    deleted_person.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    db_session.commit()

    wrong_pwd_resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "20241EWBJ9010", "senha": "Wrong"},
    )
    assert wrong_pwd_resp.status_code == status.HTTP_401_UNAUTHORIZED

    no_hash_resp = client.post(
        "/api/v1/auth/login",
        json={"login": "20241EWBJ9011", "senha": "Mudar@123"},
    )
    assert no_hash_resp.status_code == status.HTTP_401_UNAUTHORIZED

    blank_login_resp = client.post(
        "/api/v1/auth/login",
        json={"login": "   ", "senha": "Mudar@123"},
    )
    assert blank_login_resp.status_code == status.HTTP_401_UNAUTHORIZED

    inactive_wrong_pwd_resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "20241EWBJ9012", "senha": "Wrong"},
    )
    assert inactive_wrong_pwd_resp.status_code == status.HTTP_401_UNAUTHORIZED

    inactive_valid_pwd_resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "20241EWBJ9012", "senha": "Mudar@123"},
    )
    assert inactive_valid_pwd_resp.status_code == status.HTTP_403_FORBIDDEN

    deleted_resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "20241EWBJ9013", "senha": "Mudar@123"},
    )
    assert deleted_resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_manual_operator_precedence_does_not_fallback_to_person(
    client: TestClient, db_session
):
    shared_email = "compartilhado@ifpe.edu.br"
    _create_operator(
        db_session,
        name="Shared Operator",
        login=shared_email,
        password_hash=get_password_hash("Admin@123"),
        role=PerfilOperador.ADMIN,
    )
    _create_person(
        db_session,
        cpf_seed=20,
        name="Shared Person",
        matricula="20241EWBJ9020",
        email=shared_email,
        password_hash=get_password_hash("Aluno@123"),
        affiliation=TipoVinculo.ALUNO,
    )

    wrong_on_unified = client.post(
        "/api/v1/auth/login",
        json={"login": shared_email, "senha": "Aluno@123"},
    )
    assert wrong_on_unified.status_code == status.HTTP_401_UNAUTHORIZED

    op_resp = client.post(
        "/api/v1/auth/login",
        json={"login": shared_email, "senha": "Admin@123"},
    )
    assert op_resp.status_code == status.HTTP_200_OK
    assert op_resp.json()["account_type"] == "operador"

    person_resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": shared_email, "senha": "Aluno@123"},
    )
    assert person_resp.status_code == status.HTTP_200_OK
    assert person_resp.json()["account_type"] == "pessoa"


def test_get_person_me_enforces_token_isolation_and_qr_history(
    client: TestClient, db_session
):
    assert (
        client.get("/api/v1/auth/pessoa/me").status_code == status.HTTP_401_UNAUTHORIZED
    )

    operator = _create_operator(
        db_session,
        name="Isolation Admin",
        login="admin_isolamento",
        password_hash=get_password_hash("Mudar@123"),
        role=PerfilOperador.ADMIN,
    )
    person = _create_person(
        db_session,
        cpf_seed=30,
        name="Isolation Student",
        matricula="20241EWBJ9030",
        email="isolamento@discente.ifpe.edu.br",
        password_hash=get_password_hash("Mudar@123"),
        affiliation=TipoVinculo.ALUNO,
    )

    op_token = client.post(
        "/api/v1/auth/login",
        json={"login": operator.login, "senha": "Mudar@123"},
    ).json()["access_token"]

    person_login_resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": person.matricula, "senha": "Mudar@123"},
    )
    person_token = person_login_resp.json()["access_token"]

    cookie_me_resp = client.get("/api/v1/auth/pessoa/me")
    assert cookie_me_resp.status_code == status.HTTP_200_OK
    assert cookie_me_resp.json()["matricula"] == person.matricula

    client.cookies.clear()

    me_resp = client.get(
        "/api/v1/auth/pessoa/me",
        headers={"Authorization": f"Bearer {person_token}"},
    )
    assert me_resp.status_code == status.HTTP_200_OK
    me_data = me_resp.json()
    assert me_data["id"] == person.id
    assert me_data["matricula"] == person.matricula
    assert me_data["tipo_vinculo"] == TipoVinculo.ALUNO.value
    assert "senha_hash" not in me_data
    assert me_data["qr_expires_in"] == settings.QR_CODE_EXPIRE_SECONDS
    assert decode_qr_token(me_data["qr_token"]) == person.id

    doorman = _create_operator(
        db_session,
        name="Scan Doorman Test",
        login="porteiro_scan_teste",
        password_hash=get_password_hash("Mudar@123"),
        role=PerfilOperador.PORTEIRO,
    )
    doorman_token = client.post(
        "/api/v1/auth/login",
        json={"login": doorman.login, "senha": "Mudar@123"},
    ).json()["access_token"]
    client.cookies.clear()
    scan_resp = client.post(
        "/api/v1/movimentacao/scan",
        json={"qr_code_hash": me_data["qr_token"], "local_acesso": "PORTARIA"},
        headers={"Authorization": f"Bearer {doorman_token}"},
    )
    assert scan_resp.status_code == status.HTTP_200_OK
    assert scan_resp.json()["status"] is True

    me_after_scan = client.get(
        "/api/v1/auth/pessoa/me",
        headers={"Authorization": f"Bearer {person_token}"},
    )
    assert me_after_scan.status_code == status.HTTP_200_OK
    movements = me_after_scan.json()["movimentacoes"]
    assert len(movements) == 1
    assert movements[0]["tipo"] == "ENTRADA"
    assert movements[0]["local_acesso"] == "PORTARIA"
    assert "operador_nome" not in movements[0]
    assert "operador_id" not in movements[0]

    with pytest.raises(HTTPException) as qr_exc:
        decode_qr_token(person_token)
    assert qr_exc.value.status_code == status.HTTP_401_UNAUTHORIZED

    assert (
        client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {person_token}"},
        ).status_code
        == status.HTTP_403_FORBIDDEN
    )
    assert (
        client.get(
            "/api/v1/auth/usuarios",
            headers={"Authorization": f"Bearer {person_token}"},
        ).status_code
        == status.HTTP_403_FORBIDDEN
    )

    assert (
        client.get(
            "/api/v1/auth/pessoa/me",
            headers={"Authorization": f"Bearer {op_token}"},
        ).status_code
        == status.HTTP_403_FORBIDDEN
    )

    qr_only_token = generate_qr_token(person.id)
    assert (
        client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {qr_only_token}"},
        ).status_code
        == status.HTTP_401_UNAUTHORIZED
    )
    assert (
        client.get(
            "/api/v1/auth/pessoa/me",
            headers={"Authorization": f"Bearer {qr_only_token}"},
        ).status_code
        == status.HTTP_401_UNAUTHORIZED
    )

    person.status = False
    db_session.commit()
    assert (
        client.get(
            "/api/v1/auth/pessoa/me",
            headers={"Authorization": f"Bearer {person_token}"},
        ).status_code
        == status.HTTP_403_FORBIDDEN
    )

    person.status = True
    person.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    db_session.commit()
    assert (
        client.get(
            "/api/v1/auth/pessoa/me",
            headers={"Authorization": f"Bearer {person_token}"},
        ).status_code
        == status.HTTP_401_UNAUTHORIZED
    )
