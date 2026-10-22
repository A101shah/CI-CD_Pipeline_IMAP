import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def normal_transaction():
    return {
        "transaction_id": "TXN-1001", "amount_inr": 1200,
        "country": "IN", "home_country": "IN",
        "transactions_last_hour": 1, "device_is_new": False,
        "distance_from_home_km": 12, "merchant_category": "groceries",
    }
