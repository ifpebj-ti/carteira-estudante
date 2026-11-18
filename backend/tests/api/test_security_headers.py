from fastapi import status
from fastapi.testclient import TestClient


def test_root_returns_security_headers_on_http_response(client: TestClient):
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK

    assert "X-Content-Type-Options" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"

    assert "Cross-Origin-Resource-Policy" in response.headers
    assert response.headers["Cross-Origin-Resource-Policy"] == "same-origin"

    assert "Cache-Control" in response.headers
    assert response.headers["Cache-Control"] == "no-store, no-cache, must-revalidate"


def test_static_photo_returns_cross_origin_resource_policy_header(
    client: TestClient, monkeypatch, tmp_path
):
    photos_dir = tmp_path / "photos"
    photos_dir.mkdir(parents=True, exist_ok=True)
    sample_file = photos_dir / "security_header_probe.jpg"
    sample_file.write_bytes(b"fake-image-bytes")

    static_mount = next(
        route.app
        for route in client.app.routes
        if getattr(route, "path", None) == "/static"
    )
    monkeypatch.setattr(static_mount, "all_directories", [str(tmp_path)])

    response = client.get("/static/photos/security_header_probe.jpg")

    assert response.status_code == status.HTTP_200_OK
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Cross-Origin-Resource-Policy"] == "cross-origin"
    assert "public" in response.headers["Cache-Control"]
