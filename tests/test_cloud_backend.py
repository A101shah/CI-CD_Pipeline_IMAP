"""Cross-origin browser requests from GitHub Pages to the real FastAPI backend."""

from fastapi.testclient import TestClient
from app.main import app


def test_pages_cors_preflight_for_dog_api():
    response = TestClient(app).options(
        "/api/v1/dog/breeds",
        headers={
            "Origin": "https://a101shah.github.io",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://a101shah.github.io"
    assert "GET" in response.headers["access-control-allow-methods"]
    assert response.headers.get("access-control-allow-credentials") is None


def test_pages_cors_preflight_for_transaction_evaluation():
    response = TestClient(app).options(
        "/api/v1/evaluate",
        headers={
            "Origin": "https://a101shah.github.io",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://a101shah.github.io"
    assert "POST" in response.headers["access-control-allow-methods"]


def test_unknown_origin_cannot_use_cors():
    response = TestClient(app).options(
        "/api/v1/dog/facts",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_health_remains_available_for_render():
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
