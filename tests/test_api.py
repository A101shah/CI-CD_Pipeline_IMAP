import pytest

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "fraudgate"}

def test_ui_served(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "FraudGate" in response.text

def test_openapi_available(client):
    assert client.get("/openapi.json").status_code == 200

def test_rules_catalog(client):
    response = client.get("/api/v1/rules")
    assert response.status_code == 200
    assert len(response.json()) == 6

def test_evaluate_success(client, normal_transaction):
    response = client.post("/api/v1/evaluate", json=normal_transaction)
    assert response.status_code == 200
    assert response.json()["transaction_id"] == normal_transaction["transaction_id"]
    assert response.json()["decision"] == "APPROVE"

@pytest.mark.parametrize("field,value", [
    ("amount_inr", 0), ("amount_inr", -100), ("amount_inr", 10.123),
    ("country", "IND"), ("transactions_last_hour", -1),
    ("distance_from_home_km", -5), ("merchant_category", "illegal"),
    ("transaction_id", "  "),
])
def test_invalid_payloads_rejected(client, normal_transaction, field, value):
    normal_transaction[field] = value
    assert client.post("/api/v1/evaluate", json=normal_transaction).status_code == 422

def test_extra_fields_rejected(client, normal_transaction):
    normal_transaction["credit_card_number"] = "4111111111111111"
    assert client.post("/api/v1/evaluate", json=normal_transaction).status_code == 422

def test_missing_required_field(client, normal_transaction):
    del normal_transaction["amount_inr"]
    assert client.post("/api/v1/evaluate", json=normal_transaction).status_code == 422

def test_malformed_json_rejected(client):
    response = client.post("/api/v1/evaluate", content="not json", headers={"Content-Type": "application/json"})
    assert response.status_code == 422
