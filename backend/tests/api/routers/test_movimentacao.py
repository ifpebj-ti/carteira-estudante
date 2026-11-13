from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.api.routers.auth import create_access_token
from app.models.enums import PerfilOperador, SentidoMovimentacao
from app.models.pessoa import Pessoa
from app.models.usuario import UsuarioSistema
from app.services.qr_crypto_service import generate_qr_token


def override_get_current_user():
    return UsuarioSistema(
        id=1,
        nome="Operador Test",
        login="op@test.com",
        senha_hash="hashed_test_secret",  # noqa: S106
        perfil=PerfilOperador.PORTEIRO,
        status=True,
    )


def test_scan_qr_code_success(client: TestClient, db_session):
    # Setup test data
    pessoa = db_session.query(Pessoa).filter(Pessoa.id == 1).first()
    if not pessoa:
        pessoa = Pessoa(
            id=1,
            matricula="20241EWBJ0002",
            nome="Test Student",
            cpf="12345670088",
            tipo_vinculo="ALUNO",
            qr_code_hash="qr",
        )
        db_session.add(pessoa)

    operador = db_session.query(UsuarioSistema).filter(UsuarioSistema.id == 1).first()
    if not operador:
        operador = UsuarioSistema(
            id=1,
            nome="Operador Test",
            login="op@test.com",
            senha_hash="hashed_test_secret",  # noqa: S106
            perfil=PerfilOperador.PORTEIRO,
        )
        db_session.add(operador)

    db_session.commit()

    # We generate a valid JWT for Pessoa 1
    token = generate_qr_token(pessoa_id=1)

    client.app.dependency_overrides[get_current_user] = override_get_current_user

    response = client.post(
        "/api/v1/movimentacao/scan",
        json={"qr_code_hash": token, "local_acesso": "PORTARIA"},
    )

    client.app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert "student_name" in data
    assert data["student_tipo_vinculo"] == "ALUNO"
    # By default, after seed, they have 2 movements (ENTRADA, SAIDA).
    # The next should be ENTRADA.
    assert data["movement_type"] in [
        SentidoMovimentacao.ENTRADA.value,
        SentidoMovimentacao.SAIDA.value,
    ]


def test_scan_qr_code_invalid_token(client: TestClient):
    client.app.dependency_overrides[get_current_user] = override_get_current_user
    response = client.post(
        "/api/v1/movimentacao/scan",
        json={"qr_code_hash": "invalid-token", "local_acesso": "PORTARIA"},
    )
    client.app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json()["detail"] == "Forged or invalid QR Code."


def test_scan_qr_code_student_not_found(client: TestClient):
    # Generates a valid token for a non-existent student ID (9999)
    token = generate_qr_token(pessoa_id=9999)

    client.app.dependency_overrides[get_current_user] = override_get_current_user
    response = client.post(
        "/api/v1/movimentacao/scan",
        json={"qr_code_hash": token, "local_acesso": "PORTARIA"},
    )
    client.app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json()["detail"] == "Pessoa não encontrado."


def test_scan_qr_code_inactive_student(client: TestClient, db_session):
    pessoa = Pessoa(
        matricula="20241EWBJ0098",
        nome="Inactive Student",
        cpf="12345670098",
        tipo_vinculo="ALUNO",
        qr_code_hash="qr-inactive",
        status=False,
    )
    db_session.add(pessoa)
    db_session.commit()
    db_session.refresh(pessoa)

    token = generate_qr_token(pessoa_id=pessoa.id)
    client.app.dependency_overrides[get_current_user] = override_get_current_user
    try:
        response = client.post(
            "/api/v1/movimentacao/scan",
            json={"qr_code_hash": token, "local_acesso": "PORTARIA"},
        )
    finally:
        client.app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["status"] is False
    assert data["student_name"] == "Inactive Student"
    assert data["student_tipo_vinculo"] == "ALUNO"
    assert data["movement_type"] == SentidoMovimentacao.ENTRADA.value


def test_list_movimentacoes_historico_success_and_unauthenticated(
    client: TestClient, db_session
):
    client.cookies.clear()
    unauth_resp = client.get("/api/v1/movimentacao/historico")
    assert unauth_resp.status_code == 401

    pessoa = Pessoa(
        matricula="20241EWBJ0097",
        nome="History Student",
        cpf="12345670097",
        tipo_vinculo="ALUNO",
        qr_code_hash="qr-hist",
        status=True,
    )
    operador = db_session.query(UsuarioSistema).filter(UsuarioSistema.id == 1).first()
    if not operador:
        operador = UsuarioSistema(
            id=1,
            nome="Operador Test",
            login="op@test.com",
            senha_hash="hashed_test_secret",  # noqa: S106
            perfil=PerfilOperador.PORTEIRO,
            status=True,
        )
        db_session.add(operador)
    db_session.add(pessoa)
    db_session.commit()
    db_session.refresh(pessoa)

    token = generate_qr_token(pessoa_id=pessoa.id)
    client.app.dependency_overrides[get_current_user] = override_get_current_user
    try:
        scan_resp = client.post(
            "/api/v1/movimentacao/scan",
            json={"qr_code_hash": token, "local_acesso": "PORTARIA"},
        )
        assert scan_resp.status_code == 200

        hist_resp = client.get("/api/v1/movimentacao/historico?limit=10")
    finally:
        client.app.dependency_overrides.clear()

    assert hist_resp.status_code == 200
    items = hist_resp.json()
    assert len(items) >= 1
    latest = items[0]
    assert latest["pessoa_id"] == pessoa.id
    assert latest["pessoa_nome"] == "History Student"
    assert latest["pessoa_tipo_vinculo"] == "ALUNO"
    assert latest["tipo"] == SentidoMovimentacao.ENTRADA.value
    assert latest["local_acesso"] == "PORTARIA"
    assert "pessoa_matricula" not in latest
    assert "operador_nome" not in latest
    assert "operador_id" not in latest


def test_list_movimentacoes_historico_forbidden_for_pessoa(client: TestClient):
    pessoa_token = create_access_token(
        {
            "sub": "1",
            "matricula": "20241EWBJ0002",
            "role": "ALUNO",
            "account_type": "pessoa",
        }
    )
    resp = client.get(
        "/api/v1/movimentacao/historico",
        headers={"Authorization": f"Bearer {pessoa_token}"},
    )
    assert resp.status_code == 403


def test_scan_qr_code_soft_deleted_student_returns_404(client: TestClient, db_session):
    pessoa = Pessoa(
        matricula="20241EWBJ0096",
        nome="Deleted Student",
        cpf="12345670096",
        tipo_vinculo="ALUNO",
        qr_code_hash="qr-deleted",
        status=True,
        deleted_at=datetime.now(timezone.utc),
    )
    db_session.add(pessoa)
    db_session.commit()
    db_session.refresh(pessoa)

    token = generate_qr_token(pessoa_id=pessoa.id)
    client.app.dependency_overrides[get_current_user] = override_get_current_user
    try:
        response = client.post(
            "/api/v1/movimentacao/scan",
            json={"qr_code_hash": token, "local_acesso": "PORTARIA"},
        )
    finally:
        client.app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json()["detail"] == "Pessoa não encontrado."
