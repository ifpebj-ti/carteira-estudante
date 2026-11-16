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
        nome="Test Operator",
        login="op@test.com",
        senha_hash="hashed_test_secret",  # noqa: S106
        perfil=PerfilOperador.PORTEIRO,
        status=True,
    )


def test_scan_qr_code_returns_200_and_records_movement_for_active_person(
    client: TestClient, db_session
):
    person = db_session.query(Pessoa).filter(Pessoa.id == 1).first()
    if not person:
        person = Pessoa(
            id=1,
            matricula="20241EWBJ0002",
            nome="Test Student",
            cpf="12345670088",
            tipo_vinculo="ALUNO",
            qr_code_hash="qr",
        )
        db_session.add(person)

    operator = db_session.query(UsuarioSistema).filter(UsuarioSistema.id == 1).first()
    if not operator:
        operator = UsuarioSistema(
            id=1,
            nome="Test Operator",
            login="op@test.com",
            senha_hash="hashed_test_secret",  # noqa: S106
            perfil=PerfilOperador.PORTEIRO,
        )
        db_session.add(operator)

    db_session.commit()

    token = generate_qr_token(person_id=1)

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
    assert data["movement_type"] in [
        SentidoMovimentacao.ENTRADA.value,
        SentidoMovimentacao.SAIDA.value,
    ]


def test_scan_qr_code_returns_401_when_token_is_invalid(client: TestClient):
    client.app.dependency_overrides[get_current_user] = override_get_current_user
    response = client.post(
        "/api/v1/movimentacao/scan",
        json={"qr_code_hash": "invalid-token", "local_acesso": "PORTARIA"},
    )
    client.app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json()["detail"] == "Forged or invalid QR Code."


def test_scan_qr_code_returns_404_when_person_is_not_found(client: TestClient):
    token = generate_qr_token(person_id=9999)

    client.app.dependency_overrides[get_current_user] = override_get_current_user
    response = client.post(
        "/api/v1/movimentacao/scan",
        json={"qr_code_hash": token, "local_acesso": "PORTARIA"},
    )
    client.app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json()["detail"] == "Pessoa não encontrado."


def test_scan_qr_code_returns_200_with_status_false_when_person_is_inactive(
    client: TestClient, db_session
):
    person = Pessoa(
        matricula="20241EWBJ0098",
        nome="Inactive Student",
        cpf="12345670098",
        tipo_vinculo="ALUNO",
        qr_code_hash="qr-inactive",
        status=False,
    )
    db_session.add(person)
    db_session.commit()
    db_session.refresh(person)

    token = generate_qr_token(person_id=person.id)
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


def test_list_movement_history_returns_401_unauthenticated_and_200_for_operator(
    client: TestClient, db_session
):
    client.cookies.clear()
    unauth_resp = client.get("/api/v1/movimentacao/historico")
    assert unauth_resp.status_code == 401

    person = Pessoa(
        matricula="20241EWBJ0097",
        nome="History Student",
        cpf="12345670097",
        tipo_vinculo="ALUNO",
        qr_code_hash="qr-hist",
        status=True,
    )
    operator = db_session.query(UsuarioSistema).filter(UsuarioSistema.id == 1).first()
    if not operator:
        operator = UsuarioSistema(
            id=1,
            nome="Test Operator",
            login="op@test.com",
            senha_hash="hashed_test_secret",  # noqa: S106
            perfil=PerfilOperador.PORTEIRO,
            status=True,
        )
        db_session.add(operator)
    db_session.add(person)
    db_session.commit()
    db_session.refresh(person)

    token = generate_qr_token(person_id=person.id)
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
    assert latest["pessoa_id"] == person.id
    assert latest["pessoa_nome"] == "History Student"
    assert latest["pessoa_tipo_vinculo"] == "ALUNO"
    assert latest["tipo"] == SentidoMovimentacao.ENTRADA.value
    assert latest["local_acesso"] == "PORTARIA"
    assert "pessoa_matricula" not in latest
    assert "operador_nome" not in latest
    assert "operador_id" not in latest


def test_list_movement_history_returns_403_when_called_with_person_token(
    client: TestClient,
):
    person_token = create_access_token(
        {
            "sub": "1",
            "matricula": "20241EWBJ0002",
            "role": "ALUNO",
            "account_type": "pessoa",
        }
    )
    resp = client.get(
        "/api/v1/movimentacao/historico",
        headers={"Authorization": f"Bearer {person_token}"},
    )
    assert resp.status_code == 403


def test_scan_qr_code_returns_404_when_person_is_soft_deleted(
    client: TestClient, db_session
):
    person = Pessoa(
        matricula="20241EWBJ0096",
        nome="Deleted Student",
        cpf="12345670096",
        tipo_vinculo="ALUNO",
        qr_code_hash="qr-deleted",
        status=True,
        deleted_at=datetime.now(timezone.utc),
    )
    db_session.add(person)
    db_session.commit()
    db_session.refresh(person)

    token = generate_qr_token(person_id=person.id)
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
