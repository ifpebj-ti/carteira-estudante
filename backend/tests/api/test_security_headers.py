from fastapi import status
from fastapi.testclient import TestClient


def test_security_headers_present_on_root(client: TestClient):
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK

    assert "X-Content-Type-Options" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"

    assert "Cross-Origin-Resource-Policy" in response.headers
    assert response.headers["Cross-Origin-Resource-Policy"] == "same-origin"

    # Cache-Control should NOT be present on non-API routes
    assert "Cache-Control" not in response.headers


def test_security_headers_present_on_api_route(client: TestClient):
    # Hit an API route (even if it returns 404, the middleware still applies)
    response = client.get("/api/v1/alunos/999")

    assert "X-Content-Type-Options" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"

    assert "Cross-Origin-Resource-Policy" in response.headers
    assert response.headers["Cross-Origin-Resource-Policy"] == "same-origin"

    # Cache-Control MUST be present on /api/ routes
    assert "Cache-Control" in response.headers
    assert response.headers["Cache-Control"] == "no-store, no-cache, must-revalidate"
