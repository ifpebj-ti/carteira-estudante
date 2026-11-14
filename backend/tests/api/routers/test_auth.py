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


def test_login_pessoa_by_matricula_and_email_on_both_routes(
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
def test_login_pessoa_all_vinculos(
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


def test_login_pessoa_failure_cases(client: TestClient, db_session):
    _create_pessoa(
        db_session,
        cpf_seed=10,
        nome="Aluno Senha Errada",
        matricula="20241EWBJ9010",
        email="errada@discente.ifpe.edu.br",
        senha_hash=get_password_hash("SenhaCorreta@123"),
    )
    _create_pessoa(
        db_session,
        cpf_seed=11,
        nome="Aluno Sem Hash",
        matricula="20241EWBJ9011",
        email="semhash@discente.ifpe.edu.br",
        senha_hash=None,
    )
    _create_pessoa(
        db_session,
        cpf_seed=12,
        nome="Aluno Inativo",
        matricula="20241EWBJ9012",
        email="inativo@discente.ifpe.edu.br",
        senha_hash=get_password_hash("Mudar@123"),
        ativo=False,
    )
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

    # Senha errada
    r1 = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "20241EWBJ9010", "senha": "Errada"},
    )
    assert r1.status_code == status.HTTP_401_UNAUTHORIZED

    # Sem senha cadastrada (importação CSV futura)
    r2 = client.post(
        "/api/v1/auth/login",
        json={"login": "20241EWBJ9011", "senha": "Mudar@123"},
    )
    assert r2.status_code == status.HTTP_401_UNAUTHORIZED

    # Login em branco
    r_blank = client.post(
        "/api/v1/auth/login",
        json={"login": "   ", "senha": "Mudar@123"},
    )
    assert r_blank.status_code == status.HTTP_401_UNAUTHORIZED

    # Pessoa inativa: senha errada -> 401, senha certa -> 403
    r_inativo_errado = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "20241EWBJ9012", "senha": "Errada"},
    )
    assert r_inativo_errado.status_code == status.HTTP_401_UNAUTHORIZED

    r_inativo_ok = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "20241EWBJ9012", "senha": "Mudar@123"},
    )
    assert r_inativo_ok.status_code == status.HTTP_403_FORBIDDEN

    # Pessoa com soft delete
    r_del = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": "20241EWBJ9013", "senha": "Mudar@123"},
    )
    assert r_del.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_operator_precedence_does_not_fallback_to_pessoa(
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


def test_pessoa_me_and_token_isolation(client: TestClient, db_session):
    assert (
        client.get("/api/v1/auth/pessoa/me").status_code == status.HTTP_401_UNAUTHORIZED
    )

    operador = _create_operator(
        db_session,
        nome="Admin Isolamento",
        login="admin_isolamento",
        senha_hash=get_password_hash("Mudar@123"),
        perfil=PerfilOperador.ADMIN,
    )
    pessoa = _create_pessoa(
        db_session,
        cpf_seed=30,
        nome="Aluno Isolamento",
        matricula="20241EWBJ9030",
        email="isolamento@discente.ifpe.edu.br",
        senha_hash=get_password_hash("Mudar@123"),
        tipo_vinculo=TipoVinculo.ALUNO,
    )

    op_token = client.post(
        "/api/v1/auth/login",
        json={"login": operador.login, "senha": "Mudar@123"},
    ).json()["access_token"]

    pessoa_login_resp = client.post(
        "/api/v1/auth/pessoa/login",
        json={"login": pessoa.matricula, "senha": "Mudar@123"},
    )
    pessoa_token = pessoa_login_resp.json()["access_token"]

    # Cookie HttpOnly definido no login autentica /pessoa/me sem header Bearer
    cookie_me_resp = client.get("/api/v1/auth/pessoa/me")
    assert cookie_me_resp.status_code == status.HTTP_200_OK
    assert cookie_me_resp.json()["matricula"] == pessoa.matricula

    # Limpa cookies da sessão para testar isolamento estrito via Bearer token
    client.cookies.clear()

    # Titular acessa seus próprios dados + QR dinâmico sem expor senha_hash
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

    # QR dinâmico retornado no /pessoa/me é aceito pela portaria na leitura
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

    # Histórico do titular atualizado é retornado em /pessoa/me
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

    # Sessão de titular NÃO funciona como QR code nem em rotas de operador
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

    # Token de operador NÃO acessa /pessoa/me
    assert (
        client.get(
            "/api/v1/auth/pessoa/me",
            headers={"Authorization": f"Bearer {op_token}"},
        ).status_code
        == status.HTTP_403_FORBIDDEN
    )

    # Token de QR Code NÃO autentica em /auth/me nem em /auth/pessoa/me
    qr_only_token = generate_qr_token(pessoa.id)
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

    # Desativar titular após login bloqueia /pessoa/me com 403
    pessoa.status = False
    db_session.commit()
    assert (
        client.get(
            "/api/v1/auth/pessoa/me",
            headers={"Authorization": f"Bearer {pessoa_token}"},
        ).status_code
        == status.HTTP_403_FORBIDDEN
    )

    # Soft-delete do titular após login invalida a sessão com 401
    pessoa.status = True
    pessoa.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    db_session.commit()
    assert (
        client.get(
            "/api/v1/auth/pessoa/me",
            headers={"Authorization": f"Bearer {pessoa_token}"},
        ).status_code
        == status.HTTP_401_UNAUTHORIZED
    )
