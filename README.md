# FraudGate — FinTech Fraud-Risk Screening with GitHub Actions CI/CD

An explainable, rule-based transaction screening demo. Its main objective is to **demonstrate automated Continuous Integration**: tests run on every push, a Docker image is built only when tests pass, and the container receives a health smoke test.

> Educational prototype; synthetic transactions only. This application does not make real payment decisions or use a trained fraud model.

## Project problem statement

Undetected changes in transaction validation or risk-scoring logic can introduce defects into financial services. Build a small FastAPI app with reproducible risk rules, documented REST endpoints and an interactive test interface. Automate quality assurance using GitHub Actions, Pytest, coverage reporting and Docker so errors are caught before creating a release artifact.

## Features and architecture

- Dark-themed web dashboard with three preset scenarios (Approve, Review, Block).
- `POST /api/v1/evaluate` scores synthetic transactions and returns triggered rules.
- `GET /api/v1/rules` lists transparent risk rules.
- `GET /health` is used by automated container checks.
- `GET /docs` exposes Swagger OpenAPI documentation.
- Strict request validation; missing or invalid fields return HTTP 422.

```text
Browser / API client
    → FastAPI + Pydantic validation
    → Six-rule risk engine
    → Score 0–100, decision and explanations

GitHub push / PR
    → test job (pytest, 90% minimum coverage)
    → docker-build job (only if tests pass)
    → run Docker image and smoke-test /health
```

## Risk rules (illustrative)

| Rule | Points |
| --- | ---: |
| Amount >= INR 50,000 | 30 |
| >= 5 transactions in the last hour | 25 |
| New device | 15 |
| Country differs from home country | 15 |
| Distance from home >= 1,000 km | 15 |
| Gift-card merchant | 10 |

Capped score **0–39 = APPROVE**, **40–69 = REVIEW**, **70–100 = BLOCK**.

## Local run (Windows PowerShell)

```powershell
git clone https://github.com/A101shah/CI-CD_Pipeline_IMAP.git
cd CI-CD_Pipeline_IMAP
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python -m pytest -v --cov=app --cov-report=term-missing --cov-fail-under=90
python -m uvicorn app.main:app --reload
```

Open http://localhost:8000/ for the web console and http://localhost:8000/docs for the API documentation.

## Docker

```bash
docker build -t fraudgate:local .
docker run --rm -p 8000:8000 fraudgate:local
curl http://localhost:8000/health
```

## API example

```bash
curl -X POST http://localhost:8000/api/v1/evaluate \
 -H 'Content-Type: application/json' \
 -d '{"transaction_id":"TXN-003","amount_inr":75000,"country":"IN","home_country":"IN","transactions_last_hour":5,"device_is_new":true,"distance_from_home_km":12,"merchant_category":"electronics"}'
```

Expected core response: **score 70, decision BLOCK**, with `HIGH_AMOUNT`, `HIGH_VELOCITY`, `NEW_DEVICE` reason codes.

## How the GitHub Actions workflow works

See `.github/workflows/ci.yml`. It runs on **every push**, on pull requests and manually. Job `test` runs Pytest and enforces 90% coverage. Job `docker-build` has `needs: test`, uses Docker Buildx to create a local image (`push: false`), starts the container and checks `GET /health`. If the tests fail, the Docker job is skipped. The workflow **does not publish or deploy** the image.

## Presentation demo

1. Use the three dashboard presets and show explanatory scores.
2. Open GitHub Actions to show successful tests and Docker smoke check.
3. On a temporary demo branch, change a rule threshold without updating the test. Push and demonstrate a red failed test job and skipped Docker build.
4. Correct the rule, push and show green checks.
5. Explain CI vs CD, workflow/job/step/runner and the use of encrypted GitHub Secrets. See `docs/CI_CD_AND_SECRETS.md`.

## Project contents

```text
.github/workflows/ci.yml   # CI automation
app/main.py               # FastAPI endpoints
app/models.py             # Pydantic schema
app/risk.py               # Risk rules and decisions
app/static/index.html     # Interactive dashboard
tests/                    # Automated unit and API tests
Dockerfile                # Container instructions
docs/CI_CD_AND_SECRETS.md # Research answers
requirements*.txt         # Locked direct dependencies
```

## Limitations

Scoring thresholds are educational assumptions, not validated fraud probabilities. No payments, customer data, database or secrets are needed. The Dog API from the example assignment is not applicable to this FinTech project; it demonstrates an equivalent REST API instead. If use of the Dog API is mandatory, obtain your instructor's approval for the substituted topic.

## Documentation

- https://docs.github.com/en/actions
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://docs.docker.com/build/
- https://fastapi.tiangolo.com/tutorial/testing/
