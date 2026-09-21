from fastapi import status
from fastapi.testclient import TestClient

def test_security_headers_present(client: TestClient):
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    
    assert "X-Content-Type-Options" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    
    assert "Cross-Origin-Resource-Policy" in response.headers
    assert response.headers["Cross-Origin-Resource-Policy"] == "same-origin"
    
    assert "Cache-Control" in response.headers
    assert response.headers["Cache-Control"] == "no-store, no-cache, must-revalidate"
