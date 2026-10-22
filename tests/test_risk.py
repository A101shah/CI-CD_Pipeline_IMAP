from decimal import Decimal
import pytest
from app.models import Transaction
from app.risk import evaluate

def risk(data):
    return evaluate(Transaction.model_validate(data))

def test_low_risk_approved(normal_transaction):
    result = risk(normal_transaction)
    assert (result.score, result.decision, result.triggered_rules) == (0, "APPROVE", [])

def test_review_threshold(normal_transaction):
    normal_transaction.update(amount_inr=50000, merchant_category="gift_cards")
    result = risk(normal_transaction)
    assert (result.score, result.decision) == (40, "REVIEW")

def test_block_threshold(normal_transaction):
    normal_transaction.update(amount_inr=50000, transactions_last_hour=5, device_is_new=True)
    result = risk(normal_transaction)
    assert (result.score, result.decision) == (70, "BLOCK")

def test_score_capped_at_100(normal_transaction):
    normal_transaction.update(amount_inr=50000, transactions_last_hour=6, device_is_new=True,
                              country="GB", distance_from_home_km=1200, merchant_category="gift_cards")
    result = risk(normal_transaction)
    assert result.score == 100
    assert sum(hit.points for hit in result.triggered_rules) == 110

@pytest.mark.parametrize("field,value,expected_rule,expected_points", [
    ("amount_inr", Decimal("50000"), "HIGH_AMOUNT", 30),
    ("transactions_last_hour", 5, "HIGH_VELOCITY", 25),
    ("device_is_new", True, "NEW_DEVICE", 15),
    ("country", "US", "CROSS_BORDER", 15),
    ("distance_from_home_km", 1000, "FAR_FROM_HOME", 15),
    ("merchant_category", "gift_cards", "GIFT_CARD", 10),
])
def test_individual_rules(normal_transaction, field, value, expected_rule, expected_points):
    normal_transaction[field] = value
    result = risk(normal_transaction)
    assert result.score == expected_points
    assert len(result.triggered_rules) == 1
    assert result.triggered_rules[0].code == expected_rule

def test_amount_just_below_threshold(normal_transaction):
    normal_transaction["amount_inr"] = Decimal("49999.99")
    assert risk(normal_transaction).score == 0

def test_velocity_just_below_threshold(normal_transaction):
    normal_transaction["transactions_last_hour"] = 4
    assert risk(normal_transaction).score == 0

def test_distance_just_below_threshold(normal_transaction):
    normal_transaction["distance_from_home_km"] = 999.9
    assert risk(normal_transaction).score == 0

def test_explanation_included(normal_transaction):
    result = risk(normal_transaction)
    assert result.explanation and "risk" in result.explanation.lower()
