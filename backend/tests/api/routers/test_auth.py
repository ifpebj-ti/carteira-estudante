import datetime

import jwt
import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.api.dependencies.security import RoleChecker, get_current_user
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.enums import PerfilOperador
from app.models.usuario import UsuarioSistema


def test_password_hashing_and_verification():
    hashed = get_password_hash("SenhaForte@123")
    assert hashed != "SenhaForte@123"
    assert verify_password("SenhaForte@123", hashed) is True
    assert verify_password("SenhaErrada", hashed) is False


def test_role_checker_unit_success():
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


def test_role_checker_unit_forbidden():
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


def test_list_usuarios_unauthenticated(client: TestClient):
    response = client.get("/api/v1/auth/usuarios")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert (
        response.json()["detail"]
        == "Não autenticado. Faça login para acessar este recurso."
    )


def test_list_usuarios_forbidden_for_porteiro(client: TestClient):
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


def test_list_usuarios_allowed_for_admin(client: TestClient, db_session):
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

    def override_admin():
        return admin

    client.app.dependency_overrides[get_current_user] = override_admin
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


def test_login_manual_success(client: TestClient, db_session):
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

    payload = jwt.decode(
        data["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
    )
    assert payload["sub"] == str(operador.id)
    assert payload["role"] == PerfilOperador.ADMIN.value

    protected_resp = client.get(
        "/api/v1/auth/usuarios",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert protected_resp.status_code == status.HTTP_200_OK


def test_login_manual_wrong_password(client: TestClient, db_session):
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


def test_login_manual_user_not_found(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"login": "usuario_inexistente", "senha": "Mudar@123"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Credenciais inválidas"


def test_login_manual_empty_hash_returns_401(client: TestClient, db_session):
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


def test_login_manual_porteiro_respects_role_checker(client: TestClient, db_session):
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


def test_login_manual_inactive_user_returns_403(client: TestClient, db_session):
    _create_operator(
        db_session,
        nome="Operador Inativo",
        login="operador_inativo",
        senha_hash=get_password_hash("Mudar@123"),
        perfil=PerfilOperador.PORTEIRO,
        ativo=False,
    )

    wrong_resp = client.post(
        "/api/v1/auth/login",
        json={"login": "operador_inativo", "senha": "SenhaErrada"},
    )
    assert wrong_resp.status_code == status.HTTP_401_UNAUTHORIZED

    valid_resp = client.post(
        "/api/v1/auth/login",
        json={"login": "operador_inativo", "senha": "Mudar@123"},
    )
    assert valid_resp.status_code == status.HTTP_403_FORBIDDEN


def test_login_manual_deleted_user_returns_401(client: TestClient, db_session):
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
