"""FastAPI backend for FraudGate 2.0 demo analytics and CI monitoring."""
from pathlib import Path
from typing import Literal
import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from app.demo import list_cases, list_transactions, record_evaluation, set_case_status
from app.dog_api import DogAPIUnavailable, get_breeds, get_facts
from app.models import Evaluation, Transaction
from app.pipeline import get_pipeline
from app.risk import RULES, evaluate

app = FastAPI(
    title="FraudGate 2.0",
    description="Educational, deterministic transaction risk-screening and CI/CD observability.",
    version="2.0.0",
)


# GitHub Pages is hosted on a different origin from the Docker-backed API.
# Explicit origins only: no wildcard, cookies, or credential forwarding.
DEFAULT_CORS_ORIGINS = (
    "https://a101shah.github.io",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)
extra_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRAUDGATE_CORS_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys([*DEFAULT_CORS_ORIGINS, *extra_origins])),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Accept", "Content-Type"],
)


class CaseUpdate(BaseModel):
    status: Literal["OPEN", "INVESTIGATING", "RESOLVED"]


@app.get("/health", tags=["Operations"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "fraudgate"}


@app.get("/api/v1/rules", tags=["Risk"])
def rules() -> list[dict]:
    return RULES


@app.post("/api/v1/evaluate", response_model=Evaluation, tags=["Risk"])
def evaluate_transaction(transaction: Transaction) -> Evaluation:
    result = evaluate(transaction)
    record_evaluation(transaction)
    return result


@app.get("/api/v1/transactions", tags=["Analytics"])
def transactions(limit: int = Query(default=600, ge=1, le=700)) -> list[dict]:
    return list_transactions(limit)


@app.get("/api/v1/cases", tags=["Investigations"])
def cases() -> list[dict]:
    return list_cases()


@app.patch("/api/v1/cases/{transaction_id}", tags=["Investigations"])
def update_case(transaction_id: str, update: CaseUpdate) -> dict:
    row = set_case_status(transaction_id, update.status)
    if not row:
        raise HTTPException(status_code=404, detail="Investigation case not found")
    return row


@app.get("/api/v1/pipeline", tags=["Operations"])
def pipeline() -> dict:
    return get_pipeline()



@app.get("/api/v1/dog/breeds", tags=["External API - Dog API"])
def dog_breeds() -> dict:
    """Live Dog API v2 breed catalog (cached for five minutes)."""
    try:
        return get_breeds()
    except DogAPIUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/v1/dog/facts", tags=["External API - Dog API"])
def dog_facts(limit: int = Query(default=3, ge=1, le=5)) -> dict:
    """Fresh Dog API v2 facts (not cached)."""
    try:
        return get_facts(limit=limit)
    except DogAPIUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


_DIST = Path(__file__).parent / "static"
if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets", check_dir=False), name="assets")


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(_DIST / "index.html")


@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str) -> FileResponse:
    # Never turn missing API requests into HTML successes.
    if full_path.startswith(("api/", "assets/", "health")):
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(_DIST / "index.html")
