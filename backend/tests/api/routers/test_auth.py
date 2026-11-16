import datetime
from unittest.mock import AsyncMock

import jwt
import pytest
from fastapi import HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.api.dependencies.security import RoleChecker, get_current_user
from app.api.routers import auth as auth_router
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.enums import PerfilOperador, TipoVinculo
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
from app.services.qr_crypto_service import decode_qr_token, generate_qr_token


def _create_operator(
    db_session,
    *,
    nome: str,
    login: str,
    senha_hash: str,
    perfil: PerfilOperador,
    ativo: bool = True,
) -> UsuarioSistema:
    # Outros testes inserem id=1 manualmente sem avançar a sequence no Postgres
    db_session.execute(
        text(
            "SELECT setval("
            "pg_get_serial_sequence('usuarios_sistema', 'id'), "
            "COALESCE((SELECT MAX(id) FROM usuarios_sistema), 1), "
            "(SELECT EXISTS(SELECT 1 FROM usuarios_sistema))"
            ")"
        )
    )
    operador = UsuarioSistema(
        nome=nome,
        login=login,
        senha_hash=senha_hash,
        perfil=perfil,
        status=ativo,
    )
    db_session.add(operador)
    db_session.commit()
    db_session.refresh(operador)
    return operador


def _make_valid_cpf(seed_num: int) -> str:
    base_val = 200000000 + seed_num * 97
    digits = [int(c) for c in f"{base_val:09d}"]
    if len(set(digits)) == 1:
        digits[0] = (digits[0] + 1) % 10
    r1 = sum(digits[i] * (10 - i) for i in range(9)) % 11
    digits.append(0 if r1 < 2 else 11 - r1)
    r2 = sum(digits[i] * (11 - i) for i in range(10)) % 11
    digits.append(0 if r2 < 2 else 11 - r2)
    return "".join(str(d) for d in digits)


def _create_pessoa(
    db_session,
    *,
    cpf_seed: int,
    nome: str,
    matricula: str,
    email: str | None,
    senha_hash: str | None,
    tipo_vinculo: TipoVinculo = TipoVinculo.ALUNO,
    ativo: bool = True,
) -> Pessoa:
    # Outros testes inserem id=1 manualmente em pessoas sem avançar a sequence
    db_session.execute(
        text(
            "SELECT setval("
            "pg_get_serial_sequence('pessoas', 'id'), "
            "COALESCE((SELECT MAX(id) FROM pessoas), 1), "
            "(SELECT EXISTS(SELECT 1 FROM pessoas))"
            ")"
        )
    )
    pessoa = Pessoa(
        nome=nome,
        cpf=_make_valid_cpf(cpf_seed),
        matricula=matricula,
        email=email,
        senha_hash=senha_hash,
        tipo_vinculo=tipo_vinculo,
        curso="Engenharia de Software",
        status=ativo,
    )
    db_session.add(pessoa)
    db_session.commit()
    db_session.refresh(pessoa)
    return pessoa


def test_verify_password_matches_secret_and_rejects_mismatch():
    hashed = get_password_hash("SenhaForte@123")
    assert hashed != "SenhaForte@123"
    assert verify_password("SenhaForte@123", hashed) is True
    assert verify_password("SenhaErrada", hashed) is False


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


def test_role_checker_raises_403_when_user_role_is_insufficient():
    porteiro = UsuarioSistema(
        id=2,
        nome="Porteiro User",
        login="porteiro@ifpe.edu.br",
        senha_hash="hashed_test_secret",  # noqa: S106
        perfil=PerfilOperador.PORTEIRO,
        status=True,
    )
    checker = RoleChecker([PerfilOperador.ADMIN])
    with pytest.raises(HTTPException) as exc_info:
        checker(current_user=porteiro)

    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc_info.value.detail == "Acesso negado: privilégios insuficientes"


def test_list_usuarios_returns_401_when_unauthenticated(client: TestClient):
    response = client.get("/api/v1/auth/usuarios")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert (
        response.json()["detail"]
        == "Não autenticado. Faça login para acessar este recurso."
    )


def test_list_usuarios_returns_403_when_user_is_porteiro(client: TestClient):
    def override_porteiro():
        return UsuarioSistema(
            id=2,
            nome="Porteiro Test",
            login="porteiro@test.com",
            senha_hash="hashed_test_secret",  # noqa: S106
            perfil=PerfilOperador.PORTEIRO,
            status=True,
        )

    client.app.dependency_overrides[get_current_user] = override_porteiro
    try:
        response = client.get("/api/v1/auth/usuarios")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["detail"] == "Acesso negado: privilégios insuficientes"
    finally:
        client.app.dependency_overrides.clear()


def test_list_usuarios_returns_200_and_operator_list_for_valid_admin(
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


def test_login_returns_200_and_jwt_token_for_valid_admin(
    client: TestClient, db_session
):
    operador = _create_operator(
        db_session,
        nome="Operador Login Teste",
        login="admin_login_ok",
        senha_hash=get_password_hash("Mudar@123"),
        perfil=PerfilOperador.ADMIN,
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
    assert payload["sub"] == str(operador.id)
    assert payload["role"] == PerfilOperador.ADMIN.value
    assert payload["account_type"] == "operador"

    protected_resp = client.get(
        "/api/v1/auth/usuarios",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert protected_resp.status_code == status.HTTP_200_OK


def test_login_raises_401_when_password_is_incorrect(client: TestClient, db_session):
    _create_operator(
        db_session,
        nome="Operador Senha Errada",
        login="porteiro_login_errado",
        senha_hash=get_password_hash("SenhaCorreta@123"),
        perfil=PerfilOperador.PORTEIRO,
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"login": "porteiro_login_errado", "senha": "SenhaIncorreta"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Credenciais inválidas"


def test_login_returns_401_when_operator_login_does_not_exist(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"login": "usuario_inexistente", "senha": "Mudar@123"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Credenciais inválidas"


def test_login_returns_401_when_operator_password_hash_is_empty(
    client: TestClient, db_session
):
    _create_operator(
        db_session,
        nome="Operador Sem Senha Local",
        login="sso_sem_senha",
        senha_hash="",
        perfil=PerfilOperador.PORTEIRO,
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"login": "sso_sem_senha", "senha": "Mudar@123"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Credenciais inválidas"


def test_login_returns_401_when_stored_password_hash_is_malformed(
    client: TestClient, db_session
):
    _create_operator(
        db_session,
        nome="Operador Hash Corrompido",
        login="operador_hash_invalido",
        senha_hash="not-a-valid-bcrypt-hash",
        perfil=PerfilOperador.PORTEIRO,
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"login": "operador_hash_invalido", "senha": "Mudar@123"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Credenciais inválidas"


def test_login_returns_200_for_porteiro_and_blocks_admin_endpoints_with_403(
    client: TestClient, db_session
):
    operador = _create_operator(
        db_session,
        nome="Porteiro Login Teste",
        login="porteiro_login_ok",
        senha_hash=get_password_hash("Mudar@123"),
        perfil=PerfilOperador.PORTEIRO,
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"login": "porteiro_login_ok", "senha": "Mudar@123"},
    )
    assert response.status_code == status.HTTP_200_OK
    token = response.json()["access_token"]

    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == str(operador.id)
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


def test_login_returns_401_when_inactive_operator_uses_wrong_password(
    client: TestClient, db_session
):
    _create_operator(
        db_session,
        nome="Operador Inativo Senha Errada",
        login="operador_inativo_errado",
        senha_hash=get_password_hash("Mudar@123"),
        perfil=PerfilOperador.PORTEIRO,
        ativo=False,
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"login": "operador_inativo_errado", "senha": "SenhaErrada"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_returns_403_when_operator_is_inactive(client: TestClient, db_session):
    _create_operator(
        db_session,
        nome="Operador Inativo",
        login="operador_inativo",
        senha_hash=get_password_hash("Mudar@123"),
        perfil=PerfilOperador.PORTEIRO,
        ativo=False,
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"login": "operador_inativo", "senha": "Mudar@123"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_login_returns_401_when_operator_is_soft_deleted(
    client: TestClient, db_session
):
    operador = _create_operator(
        db_session,
        nome="Operador Removido",
        login="operador_removido",
        senha_hash=get_password_hash("Mudar@123"),
        perfil=PerfilOperador.ADMIN,
    )
    operador.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"login": "operador_removido", "senha": "Mudar@123"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Credenciais inválidas"


def test_login_pessoa_returns_200_for_matricula_and_email_on_both_routes(
    client: TestClient, db_session
):
    pessoa = _create_pessoa(
        db_session,
        cpf_seed=1,
        nome="Aluno Autenticacao Teste",
        matricula="20241EWBJ9001",
        email="Aluno.Auth@discente.ifpe.edu.br",
        senha_hash=get_password_hash("Mudar@123"),
        tipo_vinculo=TipoVinculo.ALUNO,
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
            assert claims["sub"] == str(pessoa.id)
            assert claims["matricula"] == pessoa.matricula
            assert claims["role"] == TipoVinculo.ALUNO.value
            assert claims["account_type"] == "pessoa"


@pytest.mark.parametrize(
    ("cpf_seed", "vinculo", "matricula", "email"),
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
def test_login_pessoa_returns_200_for_all_supported_tipo_vinculo_roles(
    client: TestClient,
    db_session,
    cpf_seed: int,
    vinculo: TipoVinculo,
    matricula: str,
    email: str,
):
    _create_pessoa(
        db_session,
        cpf_seed=cpf_seed,
        nome=f"Titular {vinculo.value}",
        matricula=matricula,
        email=email,
        senha_hash=get_password_hash("Mudar@123"),
        tipo_vinculo=vinculo,
    )

    resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": matricula, "senha": "Mudar@123"},
    )
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["account_type"] == "pessoa"
    assert data["role"] == vinculo.value


def test_login_pessoa_returns_401_when_password_is_incorrect(
    client: TestClient, db_session
):
    _create_pessoa(
        db_session,
        cpf_seed=10,
        nome="Aluno Senha Errada",
        matricula="20241EWBJ9010",
        email="errada@discente.ifpe.edu.br",
        senha_hash=get_password_hash("SenhaCorreta@123"),
    )

    resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "20241EWBJ9010", "senha": "Errada"},
    )
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_returns_401_when_pessoa_has_no_password_hash(
    client: TestClient, db_session
):
    _create_pessoa(
        db_session,
        cpf_seed=11,
        nome="Aluno Sem Hash",
        matricula="20241EWBJ9011",
        email="semhash@discente.ifpe.edu.br",
        senha_hash=None,
    )

    resp = client.post(
        "/api/v1/auth/login",
        json={"login": "20241EWBJ9011", "senha": "Mudar@123"},
    )
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_returns_401_when_unified_login_identifier_is_blank(
    client: TestClient,
):
    resp = client.post(
        "/api/v1/auth/login",
        json={"login": "   ", "senha": "Mudar@123"},
    )
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_pessoa_returns_401_when_login_identifier_is_blank(
    client: TestClient,
):
    resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "   ", "senha": "Mudar@123"},
    )
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_pessoa_returns_401_when_inactive_pessoa_uses_wrong_password(
    client: TestClient, db_session
):
    _create_pessoa(
        db_session,
        cpf_seed=12,
        nome="Aluno Inativo Senha Errada",
        matricula="20241EWBJ9012",
        email="inativo@discente.ifpe.edu.br",
        senha_hash=get_password_hash("Mudar@123"),
        ativo=False,
    )

    resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "20241EWBJ9012", "senha": "Errada"},
    )
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_pessoa_returns_403_when_pessoa_is_inactive(
    client: TestClient, db_session
):
    _create_pessoa(
        db_session,
        cpf_seed=14,
        nome="Aluno Inativo",
        matricula="20241EWBJ9014",
        email="inativo_ok@discente.ifpe.edu.br",
        senha_hash=get_password_hash("Mudar@123"),
        ativo=False,
    )

    resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "20241EWBJ9014", "senha": "Mudar@123"},
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_login_pessoa_returns_401_when_pessoa_is_soft_deleted(
    client: TestClient, db_session
):
    deletado = _create_pessoa(
        db_session,
        cpf_seed=13,
        nome="Aluno Deletado",
        matricula="20241EWBJ9013",
        email="deletado@discente.ifpe.edu.br",
        senha_hash=get_password_hash("Mudar@123"),
    )
    deletado.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    db_session.commit()

    resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "20241EWBJ9013", "senha": "Mudar@123"},
    )
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_returns_401_for_operator_wrong_password_without_pessoa_fallback(
    client: TestClient, db_session
):
    shared_email = "compartilhado@ifpe.edu.br"
    _create_operator(
        db_session,
        nome="Operador Compartilhado",
        login=shared_email,
        senha_hash=get_password_hash("Admin@123"),
        perfil=PerfilOperador.ADMIN,
    )
    _create_pessoa(
        db_session,
        cpf_seed=20,
        nome="Pessoa Compartilhada",
        matricula="20241EWBJ9020",
        email=shared_email,
        senha_hash=get_password_hash("Aluno@123"),
        tipo_vinculo=TipoVinculo.ALUNO,
    )

    # No /login unificado, se o login existe em usuarios_sistema,
    # senha errada do operador NUNCA cai no fallback de Pessoa.
    wrong_on_unified = client.post(
        "/api/v1/auth/login",
        json={"login": shared_email, "senha": "Aluno@123"},
    )
    assert wrong_on_unified.status_code == status.HTTP_401_UNAUTHORIZED

    # Credencial de operador autentica normalmente como operador no /login
    op_resp = client.post(
        "/api/v1/auth/login",
        json={"login": shared_email, "senha": "Admin@123"},
    )
    assert op_resp.status_code == status.HTTP_200_OK
    assert op_resp.json()["account_type"] == "operador"

    # E a rota dedicada /pessoa/login autentica explicitamente o perfil Pessoa
    pessoa_resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": shared_email, "senha": "Aluno@123"},
    )
    assert pessoa_resp.status_code == status.HTTP_200_OK
    assert pessoa_resp.json()["account_type"] == "pessoa"


def test_get_pessoa_me_returns_401_when_unauthenticated(client: TestClient):
    client.cookies.clear()
    response = client.get("/api/v1/auth/pessoa/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_pessoa_me_returns_200_with_cookie_bearer_and_scan_history(
    client: TestClient, db_session
):
    pessoa = _create_pessoa(
        db_session,
        cpf_seed=30,
        nome="Aluno Isolamento",
        matricula="20241EWBJ9030",
        email="isolamento@discente.ifpe.edu.br",
        senha_hash=get_password_hash("Mudar@123"),
        tipo_vinculo=TipoVinculo.ALUNO,
    )

    pessoa_login_resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": pessoa.matricula, "senha": "Mudar@123"},
    )
    pessoa_token = pessoa_login_resp.json()["access_token"]

    # Cookie HttpOnly definido no login autentica /pessoa/me sem header Bearer
    cookie_me_resp = client.get("/api/v1/auth/pessoa/me")
    assert cookie_me_resp.status_code == status.HTTP_200_OK
    assert cookie_me_resp.json()["matricula"] == pessoa.matricula

    client.cookies.clear()

    me_resp = client.get(
        "/api/v1/auth/pessoa/me",
        headers={"Authorization": f"Bearer {pessoa_token}"},
    )
    assert me_resp.status_code == status.HTTP_200_OK
    me_data = me_resp.json()
    assert me_data["id"] == pessoa.id
    assert me_data["matricula"] == pessoa.matricula
    assert me_data["tipo_vinculo"] == TipoVinculo.ALUNO.value
    assert "senha_hash" not in me_data
    assert me_data["qr_expires_in"] == settings.QR_CODE_EXPIRE_SECONDS
    assert decode_qr_token(me_data["qr_token"]) == pessoa.id

    porteiro = _create_operator(
        db_session,
        nome="Porteiro Scan Teste",
        login="porteiro_scan_teste",
        senha_hash=get_password_hash("Mudar@123"),
        perfil=PerfilOperador.PORTEIRO,
    )
    porteiro_token = client.post(
        "/api/v1/auth/login",
        json={"login": porteiro.login, "senha": "Mudar@123"},
    ).json()["access_token"]
    client.cookies.clear()

    scan_resp = client.post(
        "/api/v1/movimentacao/scan",
        json={"qr_code_hash": me_data["qr_token"], "local_acesso": "PORTARIA"},
        headers={"Authorization": f"Bearer {porteiro_token}"},
    )
    assert scan_resp.status_code == status.HTTP_200_OK
    assert scan_resp.json()["status"] is True

    me_after_scan = client.get(
        "/api/v1/auth/pessoa/me",
        headers={"Authorization": f"Bearer {pessoa_token}"},
    )
    assert me_after_scan.status_code == status.HTTP_200_OK
    movs = me_after_scan.json()["movimentacoes"]
    assert len(movs) == 1
    assert movs[0]["tipo"] == "ENTRADA"
    assert movs[0]["local_acesso"] == "PORTARIA"
    assert "operador_nome" not in movs[0]
    assert "operador_id" not in movs[0]


def test_decode_qr_token_raises_401_when_given_pessoa_session_token(
    client: TestClient, db_session
):
    pessoa = _create_pessoa(
        db_session,
        cpf_seed=31,
        nome="Aluno Token Isolation",
        matricula="20241EWBJ9031",
        email="isolation31@discente.ifpe.edu.br",
        senha_hash=get_password_hash("Mudar@123"),
    )
    pessoa_token = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": pessoa.matricula, "senha": "Mudar@123"},
    ).json()["access_token"]
    client.cookies.clear()

    with pytest.raises(HTTPException) as qr_exc:
        decode_qr_token(pessoa_token)
    assert qr_exc.value.status_code == status.HTTP_401_UNAUTHORIZED

    assert (
        client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {pessoa_token}"},
        ).status_code
        == status.HTTP_403_FORBIDDEN
    )
    assert (
        client.get(
            "/api/v1/auth/usuarios",
            headers={"Authorization": f"Bearer {pessoa_token}"},
        ).status_code
        == status.HTTP_403_FORBIDDEN
    )


def test_get_pessoa_me_returns_403_when_called_with_operator_token(
    client: TestClient, db_session
):
    operador = _create_operator(
        db_session,
        nome="Admin Isolamento",
        login="admin_isolamento_32",
        senha_hash=get_password_hash("Mudar@123"),
        perfil=PerfilOperador.ADMIN,
    )
    op_token = client.post(
        "/api/v1/auth/login",
        json={"login": operador.login, "senha": "Mudar@123"},
    ).json()["access_token"]
    client.cookies.clear()

    assert (
        client.get(
            "/api/v1/auth/pessoa/me",
            headers={"Authorization": f"Bearer {op_token}"},
        ).status_code
        == status.HTTP_403_FORBIDDEN
    )


def test_auth_me_routes_return_401_when_called_with_qr_only_token(
    client: TestClient,
):
    qr_only_token = generate_qr_token(999)
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


def test_get_pessoa_me_returns_403_when_pessoa_is_deactivated_after_login(
    client: TestClient, db_session
):
    pessoa = _create_pessoa(
        db_session,
        cpf_seed=33,
        nome="Aluno Desativado Pos Login",
        matricula="20241EWBJ9033",
        email="desativado33@discente.ifpe.edu.br",
        senha_hash=get_password_hash("Mudar@123"),
    )
    pessoa_token = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": pessoa.matricula, "senha": "Mudar@123"},
    ).json()["access_token"]
    client.cookies.clear()

    pessoa.status = False
    db_session.commit()

    response = client.get(
        "/api/v1/auth/pessoa/me",
        headers={"Authorization": f"Bearer {pessoa_token}"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_get_pessoa_me_returns_401_when_pessoa_is_soft_deleted_after_login(
    client: TestClient, db_session
):
    pessoa = _create_pessoa(
        db_session,
        cpf_seed=34,
        nome="Aluno Deletado Pos Login",
        matricula="20241EWBJ9034",
        email="deletado34@discente.ifpe.edu.br",
        senha_hash=get_password_hash("Mudar@123"),
    )
    pessoa_token = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": pessoa.matricula, "senha": "Mudar@123"},
    ).json()["access_token"]
    client.cookies.clear()

    pessoa.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    db_session.commit()

    response = client.get(
        "/api/v1/auth/pessoa/me",
        headers={"Authorization": f"Bearer {pessoa_token}"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_google_redirects_with_http_callback_in_development(
    client: TestClient, monkeypatch
):
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    mock_authorize = AsyncMock(
        return_value=RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth")
    )
    monkeypatch.setattr(auth_router.oauth.google, "authorize_redirect", mock_authorize)

    response = client.get("/api/v1/auth/login/google", follow_redirects=False)

    assert response.status_code == status.HTTP_307_TEMPORARY_REDIRECT
    mock_authorize.assert_awaited_once()
    redirect_uri = mock_authorize.await_args.args[1]
    assert redirect_uri.startswith("http://")
    assert redirect_uri.endswith("/api/v1/auth/callback")


def test_login_google_forces_https_callback_uri_in_production(
    client: TestClient, monkeypatch
):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    mock_authorize = AsyncMock(
        return_value=RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth")
    )
    monkeypatch.setattr(auth_router.oauth.google, "authorize_redirect", mock_authorize)

    response = client.get("/api/v1/auth/login/google", follow_redirects=False)

    assert response.status_code == status.HTTP_307_TEMPORARY_REDIRECT
    mock_authorize.assert_awaited_once()
    redirect_uri = mock_authorize.await_args.args[1]
    assert redirect_uri.startswith("https://")
    assert redirect_uri.endswith("/api/v1/auth/callback")


def test_auth_callback_returns_400_when_google_token_exchange_fails(
    client: TestClient, monkeypatch
):
    monkeypatch.setattr(
        auth_router.oauth.google,
        "authorize_access_token",
        AsyncMock(side_effect=RuntimeError("OAuth failure")),
    )

    response = client.get("/api/v1/auth/callback")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Erro ao obter dados do Google: OAuth failure" in response.json()["detail"]


def test_auth_callback_returns_400_when_google_userinfo_lacks_email(
    client: TestClient, monkeypatch
):
    monkeypatch.setattr(
        auth_router.oauth.google,
        "authorize_access_token",
        AsyncMock(return_value={"userinfo": {}}),
    )

    response = client.get("/api/v1/auth/callback")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Não foi possível recuperar o email do Google."


def test_auth_callback_returns_403_when_google_email_is_not_registered(
    client: TestClient, monkeypatch
):
    monkeypatch.setattr(
        auth_router.oauth.google,
        "authorize_access_token",
        AsyncMock(return_value={"userinfo": {"email": "nao_existe@ifpe.edu.br"}}),
    )

    response = client.get("/api/v1/auth/callback")

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert (
        response.json()["detail"]
        == "Acesso Negado. Este email não está cadastrado como Operador ou Admin."
    )


def test_auth_callback_returns_403_when_google_operator_is_inactive(
    client: TestClient, db_session, monkeypatch
):
    _create_operator(
        db_session,
        nome="SSO Inativo",
        login="sso_inativo@ifpe.edu.br",
        senha_hash="",
        perfil=PerfilOperador.ADMIN,
        ativo=False,
    )
    monkeypatch.setattr(
        auth_router.oauth.google,
        "authorize_access_token",
        AsyncMock(return_value={"userinfo": {"email": "sso_inativo@ifpe.edu.br"}}),
    )

    response = client.get("/api/v1/auth/callback")

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["detail"] == "Acesso Negado. Usuário inativo."


def test_auth_callback_returns_307_and_sets_cookie_for_valid_operator(
    client: TestClient, db_session, monkeypatch
):
    operador = _create_operator(
        db_session,
        nome="SSO Valido",
        login="sso_valido@ifpe.edu.br",
        senha_hash="",
        perfil=PerfilOperador.ADMIN,
        ativo=True,
    )
    monkeypatch.setattr(
        auth_router.oauth.google,
        "authorize_access_token",
        AsyncMock(return_value={"userinfo": {"email": operador.login}}),
    )

    response = client.get("/api/v1/auth/callback", follow_redirects=False)

    assert response.status_code == status.HTTP_307_TEMPORARY_REDIRECT
    assert response.headers["location"] == f"{settings.FRONTEND_URL.rstrip('/')}/admin"
    cookie_token = response.cookies.get("access_token")
    assert cookie_token is not None

    claims = jwt.decode(
        cookie_token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
    assert claims["sub"] == str(operador.id)
    assert claims["email"] == operador.login
    assert claims["account_type"] == "operador"


def test_logout_returns_307_redirect_and_clears_access_token_cookie(
    client: TestClient,
):
    client.cookies.set("access_token", "dummy-session-cookie")

    response = client.get("/api/v1/auth/logout", follow_redirects=False)

    assert response.status_code == status.HTTP_307_TEMPORARY_REDIRECT
    assert response.headers["location"] == f"{settings.FRONTEND_URL.rstrip('/')}/"
    set_cookie_header = response.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie_header
    assert "Max-Age=0" in set_cookie_header
