import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.api.dependencies.security import RoleChecker, get_current_user
from app.models.enums import PerfilOperador
from app.models.usuario import UsuarioSistema


def test_role_checker_unit_success():
    admin = UsuarioSistema(
        id=1,
        nome="Admin User",
        login="admin@ifpe.edu.br",
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
