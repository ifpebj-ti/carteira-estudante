from fastapi.testclient import TestClient

from app.models.enums import MovementType
from app.services.qr_crypto_service import generate_qr_token


def test_scan_qr_code_success(client: TestClient, db_session):
    # Assume Aluno 1 exists and is ACTIVE (mocked or from seed)
    # The seed db creates Aluno ID 1 and Usuario ID 1
    # We generate a valid JWT for Aluno 1
    token = generate_qr_token(aluno_id=1)

    response = client.post(
        "/api/v1/movimentacao/scan", json={"qr_code_hash": token, "operator_id": 1}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] is True
    assert "student_name" in data
    # By default, after seed, they have 2 movements (ENTRADA, SAIDA).
    # The next should be ENTRADA.
    assert data["movement_type"] in [
        MovementType.ENTRADA.value,
        MovementType.SAIDA.value,
    ]


def test_scan_qr_code_invalid_token(client: TestClient):
    response = client.post(
        "/api/v1/movimentacao/scan",
        json={"qr_code_hash": "invalid-token", "operator_id": 1},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "QR Code expired or invalid."


def test_scan_qr_code_student_not_found(client: TestClient):
    # Generates a valid token for a non-existent student ID (9999)
    token = generate_qr_token(aluno_id=9999)

    response = client.post(
        "/api/v1/movimentacao/scan", json={"qr_code_hash": token, "operator_id": 1}
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Aluno não encontrado."
