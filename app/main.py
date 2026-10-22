"""FastAPI service and locally served demonstration interface."""
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from app.models import Evaluation, Transaction
from app.risk import RULES, evaluate

app = FastAPI(
    title="FraudGate API",
    description="Explainable rule-based scoring of synthetic transactions (educational demo).",
    version="1.0.0",
)

@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(Path(__file__).parent / "static" / "index.html")

@app.get("/health", tags=["Operations"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "fraudgate"}

@app.get("/api/v1/rules", tags=["Risk"])
def rules() -> list[dict]:
    return RULES

@app.post("/api/v1/evaluate", response_model=Evaluation, tags=["Risk"])
def evaluate_transaction(transaction: Transaction) -> Evaluation:
    return evaluate(transaction)
