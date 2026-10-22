"""Synthetic, deterministic transaction feed with session-only mutable state.

Never use real card or customer information. No database is configured.
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from random import Random
from threading import RLock
from uuid import uuid4

from app.models import Transaction
from app.risk import evaluate

_LOCK = RLock()
_ROWS: list[dict] = []
_CASE_STATES: dict[str, str] = {}
_CATEGORIES = ("groceries", "electronics", "travel", "gift_cards", "utilities", "other")
_MERCHANTS = {
    "groceries": ("FreshCart Market", "Urban Basket", "Daily Harvest"),
    "electronics": ("TechSquare", "Gadget Central", "Circuit Store"),
    "travel": ("Skyline Travel", "Voyage Desk", "Metro Tickets"),
    "gift_cards": ("Digital Gift Vault", "Gift Exchange"),
    "utilities": ("City Power", "Metro Utilities"),
    "other": ("Northstar Retail", "Local Services"),
}


def _record(payload: Transaction, when: datetime, merchant: str) -> dict:
    result = evaluate(payload)
    return {
        "id": payload.transaction_id,
        "timestamp": when.isoformat(),
        "merchant": merchant,
        "amount": float(payload.amount_inr),
        "currency": "INR",
        "category": payload.merchant_category,
        "country": payload.country,
        "home_country": payload.home_country,
        "device_is_new": payload.device_is_new,
        "transactions_last_hour": payload.transactions_last_hour,
        "distance_from_home_km": payload.distance_from_home_km,
        "risk_score": result.score,
        "decision": result.decision,
        "reasons": [x.model_dump() for x in result.triggered_rules],
        "case_status": "OPEN" if result.decision != "APPROVE" else "NONE",
        "source": "synthetic",
    }


def _seed() -> None:
    random = Random(20261022)
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    for i in range(480):
        when = now - timedelta(
            days=random.random() * 29.5,
            hours=random.random() * 10,
            minutes=random.randrange(60),
        )
        category = random.choices(_CATEGORIES, weights=(34, 16, 14, 9, 13, 14), k=1)[0]
        risky = random.random()
        high_amount = risky > 0.73
        amount = round(random.uniform(50000, 220000) if high_amount else random.uniform(120, 37000), 2)
        payload = Transaction(
            transaction_id=f"FG-{100001 + i}",
            amount_inr=Decimal(str(amount)),
            country=random.choice(["US", "GB", "AE"]) if risky > 0.84 else "IN",
            home_country="IN",
            transactions_last_hour=random.randrange(5, 12) if risky > 0.63 else random.randrange(0, 5),
            device_is_new=risky > 0.67,
            distance_from_home_km=random.randrange(1100, 6000) if risky > 0.81 else random.randrange(0, 950),
            merchant_category=category,
        )
        row = _record(payload, when, random.choice(_MERCHANTS[category]))
        _ROWS.append(row)
    _ROWS.sort(key=lambda item: item["timestamp"], reverse=True)


_seed()


def list_transactions(limit: int = 600) -> list[dict]:
    with _LOCK:
        return [{**item, "reasons": [r.copy() for r in item["reasons"]]} for item in _ROWS[:limit]]


def list_cases() -> list[dict]:
    with _LOCK:
        return [
            {**row, "reasons": [r.copy() for r in row["reasons"]]}
            for row in _ROWS if row["decision"] in ("REVIEW", "BLOCK")
        ]


def set_case_status(transaction_id: str, status: str) -> dict | None:
    with _LOCK:
        for row in _ROWS:
            if row["id"] == transaction_id and row["decision"] in ("REVIEW", "BLOCK"):
                row["case_status"] = status
                return {**row, "reasons": [r.copy() for r in row["reasons"]]}
    return None


def record_evaluation(transaction: Transaction) -> dict:
    # User input is still synthetic; entries live only in this process.
    when = datetime.now(timezone.utc)
    with _LOCK:
        # A unique suffix avoids accidental replacement of seeded records.
        transaction = transaction.model_copy(
            update={"transaction_id": f"SIM-{uuid4().hex[:8].upper()}"}
        )
        row = _record(transaction, when, "Live simulator")
        row["source"] = "simulated-session"
        _ROWS.insert(0, row)
        del _ROWS[700:]
        return row.copy()
