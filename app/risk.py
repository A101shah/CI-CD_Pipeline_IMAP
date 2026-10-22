"""Deterministic demo rules; not a trained fraud model or payment authorization."""
from decimal import Decimal
from app.models import Evaluation, RuleHit, Transaction

RULES = [
    {"code": "HIGH_AMOUNT", "description": "Transaction is at least ₹50,000", "points": 30},
    {"code": "HIGH_VELOCITY", "description": "At least five transactions in the past hour", "points": 25},
    {"code": "NEW_DEVICE", "description": "Transaction originates from an unfamiliar device", "points": 15},
    {"code": "CROSS_BORDER", "description": "Transaction country differs from home country", "points": 15},
    {"code": "FAR_FROM_HOME", "description": "Distance from home is at least 1,000 km", "points": 15},
    {"code": "GIFT_CARD", "description": "Purchase is in the gift-card category", "points": 10},
]

def evaluate(transaction: Transaction) -> Evaluation:
    """Return a capped 0-100 risk score, reason codes, and a decision."""
    checks = (
        transaction.amount_inr >= Decimal("50000"),
        transaction.transactions_last_hour >= 5,
        transaction.device_is_new,
        transaction.country != transaction.home_country,
        transaction.distance_from_home_km >= 1000,
        transaction.merchant_category == "gift_cards",
    )
    hits = [
        RuleHit(code=rule["code"], reason=rule["description"], points=rule["points"])
        for rule, triggered in zip(RULES, checks, strict=True)
        if triggered
    ]
    score = min(sum(hit.points for hit in hits), 100)
    decision = "BLOCK" if score >= 70 else "REVIEW" if score >= 40 else "APPROVE"
    explanation = {
        "APPROVE": "Low rule-based risk: no manual review required by this demo.",
        "REVIEW": "Moderate rule-based risk: refer to an analyst for review.",
        "BLOCK": "High rule-based risk: hold this simulated transaction for investigation.",
    }[decision]
    return Evaluation(
        transaction_id=transaction.transaction_id,
        score=score,
        decision=decision,
        triggered_rules=hits,
        explanation=explanation,
    )
