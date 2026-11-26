import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.enums import (
    LocalAcesso,
    ModalidadeEnsino,
    PerfilOperador,
    TipoVinculo,
)
from app.models.movimentacao import Movimentacao
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
from app.services.qr_crypto_service import generate_qr_token

TEST_PASSWORD = "RbacTestPassword123!" # noqa: S105

def _login_and_get_headers(
    client: TestClient, login: str, senha: str = TEST_PASSWORD
) -> dict[str, str]:
    client.cookies.clear()
    response = client.post(
        "/api/v1/auth/login",
        json={"login": login, "senha": senha},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    client.cookies.clear()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def rbac_actors(db_session: Session):
    password_hash = get_password_hash(TEST_PASSWORD)

    admin = UsuarioSistema(
        nome="Admin RBAC Teste",
        login="rbac_admin_teste",
        senha_hash=password_hash,
        perfil=PerfilOperador.ADMIN,
        status=True,
    )
    portaria = UsuarioSistema(
        nome="Porteiro RBAC Teste",
        login="rbac_porteiro_teste",
        senha_hash=password_hash,
        perfil=PerfilOperador.PORTEIRO,
        status=True,
    )
    estudante_1 = Pessoa(
        nome="Estudante Um RBAC",
        matricula="20261EWBJ9001",
        cpf="12352247322",
        tipo_vinculo=TipoVinculo.ALUNO,
        modalidade=ModalidadeEnsino.SUPERIOR,
        curso="Engenharia de Software",
        data_nascimento=datetime.date(2003, 1, 15),
        status_matricula="Ativo",
        is_interno=False,
        email="rbac_aluno1@discente.ifpe.edu.br",
        senha_hash=password_hash,
        qr_code_hash="20261EWBJ9001-estudante-ativo",
        status=True,
    )
    estudante_2 = Pessoa(
        nome="Estudante Dois RBAC",
        matricula="20261EWBJ9002",
        cpf="12352254612",
        tipo_vinculo=TipoVinculo.ALUNO,
        modalidade=ModalidadeEnsino.SUPERIOR,
        curso="Engenharia de Software",
        data_nascimento=datetime.date(2003, 5, 20),
        status_matricula="Ativo",
        is_interno=False,
        email="rbac_aluno2@discente.ifpe.edu.br",
        senha_hash=password_hash,
        qr_code_hash="20261EWBJ9002-estudante-ativo",
        status=True,
    )

    db_session.add_all([admin, portaria, estudante_1, estudante_2])
    db_session.commit()
    for obj in (admin, portaria, estudante_1, estudante_2):
        db_session.refresh(obj)

    try:
        yield {
            "admin": admin,
            "portaria": portaria,
            "estudante_1": estudante_1,
            "estudante_2": estudante_2,
        }
    finally:
        db_session.rollback()
        db_session.query(Movimentacao).filter(
            Movimentacao.pessoa_id.in_([estudante_1.id, estudante_2.id])
        ).delete(synchronize_session=False)
        db_session.query(Pessoa).filter(
            Pessoa.id.in_([estudante_1.id, estudante_2.id])
        ).delete(synchronize_session=False)
        db_session.query(UsuarioSistema).filter(
            UsuarioSistema.id.in_([admin.id, portaria.id])
        ).delete(synchronize_session=False)
        db_session.commit()


def test_anonymous_access_is_blocked(client: TestClient, rbac_actors):
    client.cookies.clear()
    matricula = rbac_actors["estudante_1"].matricula

    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/auth/pessoa/me").status_code == 401
    assert client.get("/api/v1/auth/usuarios").status_code == 401
    assert client.get("/api/v1/pessoas").status_code == 401
    assert client.get(f"/api/v1/pessoas/{matricula}").status_code == 401
    assert client.get("/api/v1/movimentacao/historico").status_code == 401


def test_student_profile_authorization_flow(client: TestClient, rbac_actors):
    estudante_1 = rbac_actors["estudante_1"]
    estudante_2 = rbac_actors["estudante_2"]
    headers = _login_and_get_headers(client, estudante_1.matricula)

    # Pode acessar o próprio perfil e a própria matrícula
    me_resp = client.get("/api/v1/auth/pessoa/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["matricula"] == estudante_1.matricula
    assert "qr_token" in me_resp.json()

    own_resp = client.get(
        f"/api/v1/pessoas/{estudante_1.matricula}", headers=headers
    )
    assert own_resp.status_code == 200

    # Não pode acessar dados de outro estudante nem rotas de operador/admin
    assert (
        client.get(
            f"/api/v1/pessoas/{estudante_2.matricula}", headers=headers
        ).status_code
        == 403
    )
    assert client.get("/api/v1/pessoas", headers=headers).status_code in (
        401,
        403,
    )
    assert client.patch(
        f"/api/v1/pessoas/{estudante_1.matricula}",
        json={"nome": "Tentativa Indevida"},
        headers=headers,
    ).status_code in (401, 403)
    assert client.get(
        "/api/v1/auth/usuarios", headers=headers
    ).status_code in (401, 403)
    assert client.get(
        "/api/v1/movimentacao/historico", headers=headers
    ).status_code in (401, 403)


def test_gatekeeper_profile_authorization_flow(client: TestClient, rbac_actors):
    portaria = rbac_actors["portaria"]
    estudante_1 = rbac_actors["estudante_1"]
    headers = _login_and_get_headers(client, portaria.login)

    # Pode consultar próprio perfil, histórico e escanear QR
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["perfil"] == PerfilOperador.PORTEIRO.value

    assert (
        client.get("/api/v1/movimentacao/historico", headers=headers).status_code
        == 200
    )

    qr_token = generate_qr_token(estudante_1.id)
    scan_resp = client.post(
        "/api/v1/movimentacao/scan",
        json={
            "qr_code_hash": qr_token,
            "local_acesso": LocalAcesso.PORTARIA.value,
        },
        headers=headers,
    )
    assert scan_resp.status_code == 200
    assert scan_resp.json()["status"] is True

    # Não pode acessar rotas exclusivas de ADMIN nem ficha completa de pessoa
    assert client.get("/api/v1/pessoas", headers=headers).status_code == 403
    assert (
        client.get(
            f"/api/v1/pessoas/{estudante_1.matricula}", headers=headers
        ).status_code
        == 403
    )
    assert (
        client.patch(
            f"/api/v1/pessoas/{estudante_1.matricula}",
            json={"nome": "Tentativa Porteiro"},
            headers=headers,
        ).status_code
        == 403
    )
    assert (
        client.get("/api/v1/auth/usuarios", headers=headers).status_code == 403
    )


def test_admin_profile_authorization_flow(client: TestClient, rbac_actors):
    admin = rbac_actors["admin"]
    estudante_1 = rbac_actors["estudante_1"]
    headers = _login_and_get_headers(client, admin.login)

    # Tem acesso completo às rotas administrativas e operacionais
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["perfil"] == PerfilOperador.ADMIN.value

    assert (
        client.get("/api/v1/auth/usuarios", headers=headers).status_code == 200
    )
    assert client.get("/api/v1/pessoas", headers=headers).status_code == 200
    assert (
        client.get(
            f"/api/v1/pessoas/{estudante_1.matricula}", headers=headers
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/pessoas/{estudante_1.matricula}",
            json={"nome": "Estudante Um Atualizado"},
            headers=headers,
        ).status_code
        == 200
    )
    assert (
        client.get("/api/v1/movimentacao/historico", headers=headers).status_code
        == 200
    )
