from unittest.mock import patch

from app import pipeline as pipeline_module
from app.demo import list_cases, list_transactions


def test_demo_dataset_deterministic_shape():
    rows = list_transactions()
    assert len(rows) >= 480
    assert all(row["source"] == "synthetic" for row in rows[-100:])
    assert all(0 <= row["risk_score"] <= 100 for row in rows)
    assert rows == sorted(rows, key=lambda row: row["timestamp"], reverse=True)


def test_transactions_api(client):
    response = client.get("/api/v1/transactions?limit=5")
    assert response.status_code == 200
    assert len(response.json()) == 5
    assert all("reasons" in row for row in response.json())


def test_transactions_limit_validation(client):
    assert client.get("/api/v1/transactions?limit=701").status_code == 422


def test_investigations(client):
    response = client.get("/api/v1/cases")
    assert response.status_code == 200
    assert response.json()
    assert all(row["decision"] != "APPROVE" for row in response.json())


def test_case_status_roundtrip(client):
    target = list_cases()[0]["id"]
    response = client.patch(f"/api/v1/cases/{target}", json={"status": "INVESTIGATING"})
    assert response.status_code == 200
    assert response.json()["case_status"] == "INVESTIGATING"
    assert client.patch(f"/api/v1/cases/{target}", json={"status": "RESOLVED"}).status_code == 200
    assert client.patch(f"/api/v1/cases/{target}", json={"status": "OPEN"}).status_code == 200


def test_case_validation_and_not_found(client):
    assert client.patch("/api/v1/cases/missing", json={"status": "OPEN"}).status_code == 404
    assert client.patch("/api/v1/cases/missing", json={"status": "CLOSED"}).status_code == 422


def test_evaluation_visible_in_feed(client, normal_transaction):
    before = len(list_transactions())
    response = client.post("/api/v1/evaluate", json=normal_transaction)
    assert response.status_code == 200
    assert len(list_transactions()) == before + 1
    assert list_transactions()[0]["source"] == "simulated-session"


def test_missing_api_does_not_return_spa(client):
    assert client.get("/api/v1/does-not-exist").status_code == 404


def test_spa_path(client):
    assert client.get("/dashboard").status_code == 200


def test_pipeline_degraded_mode(client):
    pipeline_module._CACHE = None
    with patch.object(pipeline_module, "urlopen", side_effect=OSError("offline")):
        response = client.get("/api/v1/pipeline")
    assert response.status_code == 200
    assert response.json()["source"] == "unavailable"
    assert response.json()["runs"] == []
    pipeline_module._CACHE = None


def test_pipeline_cached_read(client):
    pipeline_module._CACHE = (float("inf"), {"source": "github", "repository": "test", "runs": [], "message": None})
    assert client.get("/api/v1/pipeline").json()["source"] == "github"
    pipeline_module._CACHE = None
