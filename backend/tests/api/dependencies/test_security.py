import datetime

import jwt
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.api.dependencies.security import get_current_active_admin, get_current_user
from app.api.routers.auth import create_access_token
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.enums import PerfilOperador
from app.models.usuario import UsuarioSistema


def _create_operator(
    db_session,
    *,
    nome: str,
    login: str,
    perfil: PerfilOperador = PerfilOperador.PORTEIRO,
    ativo: bool = True,
) -> UsuarioSistema:
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
        senha_hash=get_password_hash("Mudar@123"),
        perfil=perfil,
        status=ativo,
    )
    db_session.add(operador)
    db_session.commit()
    db_session.refresh(operador)
    return operador


def test_get_current_user_raises_401_when_token_misses_sub_claim(client: TestClient):
    token = create_access_token({"role": "ADMIN", "account_type": "operador"})

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Credenciais inválidas."


def test_get_current_user_raises_401_when_token_is_expired(client: TestClient):
    expired_payload = {
        "sub": "1",
        "role": "ADMIN",
        "account_type": "operador",
        "exp": datetime.datetime.now(datetime.timezone.utc)
        - datetime.timedelta(minutes=5),
    }
    expired_token = jwt.encode(
        expired_payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Token expirado."


def test_get_current_user_raises_401_when_token_signature_is_invalid(
    client: TestClient,
):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer malformed.jwt.token"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Token inválido."


def test_get_current_user_raises_401_when_token_sub_is_non_numeric(
    client: TestClient,
):
    token = create_access_token(
        {"sub": "not-an-integer", "role": "ADMIN", "account_type": "operador"}
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Token inválido."


def test_get_current_user_raises_401_when_account_type_is_unrecognized(
    client: TestClient,
):
    token = create_access_token(
        {"sub": "1", "role": "ADMIN", "account_type": "unknown_scope"}
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Token inválido."


def test_get_current_user_raises_401_when_operator_does_not_exist(client: TestClient):
    token = create_access_token(
        {"sub": "999999", "role": "ADMIN", "account_type": "operador"}
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Usuário não encontrado."


def test_get_current_user_raises_403_when_operator_is_inactive(
    client: TestClient, db_session
):
    inactive_operator = _create_operator(
        db_session,
        nome="Operador Inativo Security",
        login="inactive_security_operator",
        perfil=PerfilOperador.ADMIN,
        ativo=False,
    )
    token = create_access_token(
        {
            "sub": str(inactive_operator.id),
            "login": inactive_operator.login,
            "role": PerfilOperador.ADMIN.value,
            "account_type": "operador",
        }
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["detail"] == "Usuário inativo."


def test_get_current_active_admin_returns_user_when_role_is_admin():
    admin = UsuarioSistema(
        id=99,
        nome="Admin Unit Test",
        login="admin_unit@ifpe.edu.br",
        senha_hash="hashed_test_secret",  # noqa: S106
        perfil=PerfilOperador.ADMIN,
        status=True,
    )

    result = get_current_active_admin(current_user=admin)
    assert result is admin


def test_get_current_actor_rejects_unscoped_or_unknown_tokens_and_loads_operator(
    client: TestClient, db_session
):
    admin = _create_operator(
        db_session,
        nome="Actor Admin Security",
        login="actor_admin_security",
        perfil=PerfilOperador.ADMIN,
        ativo=True,
    )
    unscoped_token = create_access_token({"sub": "1"})
    unknown_scope_token = create_access_token(
        {"sub": "1", "account_type": "unknown_scope"}
    )
    valid_admin_token = create_access_token(
        {
            "sub": str(admin.id),
            "role": PerfilOperador.ADMIN.value,
            "account_type": "operador",
        }
    )

    client.app.dependency_overrides.pop(get_current_user, None)
    for bad_token in (unscoped_token, unknown_scope_token):
        response = client.post(
            "/api/v1/pessoas/1/photo",
            headers={"Authorization": f"Bearer {bad_token}"},
            files={"file": ("avatar.jpg", b"jpeg-bytes", "image/jpeg")},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    ok_actor_response = client.post(
        "/api/v1/pessoas/999999/photo",
        headers={"Authorization": f"Bearer {valid_admin_token}"},
        files={"file": ("avatar.jpg", b"jpeg-bytes", "image/jpeg")},
    )
    assert ok_actor_response.status_code == status.HTTP_404_NOT_FOUND


def test_verify_photo_upload_access_allows_admin_and_self_person():
    from app.api.dependencies.security import verify_photo_upload_access
    from app.models.pessoa import Pessoa

    admin = UsuarioSistema(
        id=1,
        nome="Admin",
        login="admin_photo@ifpe.edu.br",
        senha_hash="hashed_test_secret",  # noqa: S106
        perfil=PerfilOperador.ADMIN,
        status=True,
    )
    person = Pessoa(
        id=42,
        nome="Self Student",
        cpf="91001018501",
        matricula="2026SEC0042",
        tipo_vinculo="ALUNO",
        status=True,
    )

    assert verify_photo_upload_access(pessoa_id=999, actor=admin) is admin
    assert verify_photo_upload_access(pessoa_id=42, actor=person) is person
