"""Strict request and response schemas for the demo API."""
from decimal import Decimal
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

TransactionID = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
CountryCode = Annotated[str, StringConstraints(pattern=r"^[A-Z]{2}$")]
MerchantCategory = Literal["groceries", "electronics", "travel", "gift_cards", "utilities", "other"]
Decision = Literal["APPROVE", "REVIEW", "BLOCK"]

class Transaction(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    transaction_id: TransactionID
    amount_inr: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    country: CountryCode
    home_country: CountryCode
    transactions_last_hour: int = Field(ge=0, le=100000)
    device_is_new: bool
    distance_from_home_km: float = Field(ge=0, le=40075)
    merchant_category: MerchantCategory

class RuleHit(BaseModel):
    code: str
    reason: str
    points: int

class Evaluation(BaseModel):
    transaction_id: str
    score: int = Field(ge=0, le=100)
    decision: Decision
    triggered_rules: list[RuleHit]
    explanation: str
