from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from app.main import app
from app.core.database import get_db

client = TestClient(app)


def test_root_endpoint():

    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "API - Carteira Estudantil IFPE" in data["message"]
    assert data["health"] == "/health"
    assert data["docs"] == "/docs"


def test_health_check_success():

    mock_db = MagicMock()
    mock_db.execute.return_value = None

    app.dependency_overrides[get_db] = lambda: mock_db

    response = client.get("/health")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert "operando normalmente" in data["message"]


def test_health_check_database_failure():

    mock_db = MagicMock()
    mock_db.execute.side_effect = Exception("Conexão recusada pelo PostgreSQL")

    app.dependency_overrides[get_db] = lambda: mock_db

    response = client.get("/health")
    app.dependency_overrides.clear()

    assert response.status_code == 500
    data = response.json()
    assert data["detail"]["status"] == "error"
    assert data["detail"]["database"] == "disconnected"
    assert "Falha na conexão com o banco de dados" in data["detail"]["message"]
